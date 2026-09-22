import { NextResponse } from 'next/server'

import { claimPushEvent, deliverPushToUser, releasePushEvent } from '@/lib/push-delivery'
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
    const eventKey = `booking-created:${booking.id}:${ownerId}`
    const title = 'Nueva solicitud de evento'
    const body = `${booking.event_name}: ${serviceNames.join(', ')}`
    // El trigger booking_item_created_actions ya guarda el aviso en la bandeja.

    if (!(await claimPushEvent(eventKey, ownerId))) continue

    let recipientSent = 0
    try {
      recipientSent = await deliverPushToUser(ownerId, {
        title,
        body,
        url: '/prestador/dashboard#solicitudes',
        tag: eventKey,
      })
      sent += recipientSent
    } finally {
      if (recipientSent === 0) await releasePushEvent(eventKey, ownerId)
    }
  }

  return NextResponse.json({ ok: true, sent })
}
