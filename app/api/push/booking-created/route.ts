import { NextResponse } from 'next/server'

import { deliverEventNotification } from '@/lib/event-notifications'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

  const { bookingId } = (await request.json()) as { bookingId?: string }
  if (!bookingId) return NextResponse.json({ error: 'Falta la reserva' }, { status: 400 })

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id,code,event_name,event_date,event_time')
    .eq('id', bookingId)
    .eq('client_id', user.id)
    .maybeSingle()
  if (bookingError || !booking) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })

  const admin = createAdminClient()
  const { data: items, error: itemsError } = await admin
    .from('booking_items')
    .select('id,service_name,service_providers!inner(owner_id)')
    .eq('booking_id', booking.id)
  if (itemsError) throw itemsError

  let pushSent = 0
  let emailSent = 0
  for (const item of items || []) {
    const provider = item.service_providers as unknown as { owner_id?: string }
    if (!provider.owner_id) continue
    const result = await deliverEventNotification({
      recipientId: provider.owner_id,
      type: 'booking_request',
      title: 'Nueva solicitud de evento',
      body: `${booking.event_name}: ${item.service_name} · ${booking.event_date} a las ${String(booking.event_time).slice(0, 5)}.`,
      href: '/prestador/dashboard#solicitudes',
      eventKey: `booking-request:${item.id}:${provider.owner_id}`,
    })
    pushSent += result.pushSent
    emailSent += Number(result.emailSent)
  }

  return NextResponse.json({ ok: true, pushSent, emailSent })
}
