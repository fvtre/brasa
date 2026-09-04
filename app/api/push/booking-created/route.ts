import { NextResponse } from 'next/server'

import { sendWebPush } from '@/lib/push'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
  }

  const { bookingId } = (await request.json()) as { bookingId?: string }
  if (!bookingId) {
    return NextResponse.json({ error: 'Falta la reserva' }, { status: 400 })
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id,code,event_name,event_date,event_time')
    .eq('id', bookingId)
    .eq('client_id', user.id)
    .maybeSingle()

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
  }

  const admin = createAdminClient()
  const { data: items, error: itemsError } = await admin
    .from('booking_items')
    .select('provider_id,service_name,service_providers!inner(owner_id)')
    .eq('booking_id', booking.id)
    .not('provider_id', 'is', null)

  if (itemsError) throw itemsError

  const recipients = new Map<string, string[]>()
  for (const item of items || []) {
    const relation = item.service_providers as unknown as { owner_id: string }
    if (!relation?.owner_id) continue
    recipients.set(relation.owner_id, [
      ...(recipients.get(relation.owner_id) || []),
      item.service_name,
    ])
  }

  let sent = 0

  for (const [ownerId, serviceNames] of recipients) {
    const { error: claimError } = await admin.from('push_delivery_events').insert({
      booking_id: booking.id,
      user_id: ownerId,
    })

    if (claimError?.code === '23505') continue
    if (claimError) throw claimError

    const { data: subscriptions, error: subscriptionsError } = await admin
      .from('push_subscriptions')
      .select('id,endpoint,p256dh,auth')
      .eq('user_id', ownerId)

    if (subscriptionsError) throw subscriptionsError

    for (const subscription of subscriptions || []) {
      try {
        await sendWebPush(subscription, {
          title: 'Nueva solicitud de evento',
          body: `${booking.event_name}: ${serviceNames.join(', ')}`,
          url: '/prestador/dashboard#solicitudes',
          tag: `booking-${booking.id}`,
        })
        sent += 1
      } catch (error: any) {
        const statusCode = Number(error?.statusCode || 0)
        if (statusCode === 404 || statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('id', subscription.id)
          continue
        }
        console.error('Web Push delivery:', error)
      }
    }
  }

  return NextResponse.json({ ok: true, sent })
}
