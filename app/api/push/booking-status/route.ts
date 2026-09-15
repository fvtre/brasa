import { NextResponse } from 'next/server'

import { claimPushEvent, deliverPushToUser } from '@/lib/push-delivery'
import { createClient } from '@/lib/supabase/server'

type Action = 'accept' | 'reject'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

  const { itemId, action } = (await request.json()) as { itemId?: string; action?: Action }
  if (!itemId || !['accept', 'reject'].includes(action || '')) {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  const { data: item, error } = await supabase
    .from('booking_items')
    .select('id,provider_status,provider_name,service_name,booking:bookings!inner(id,client_id,code,event_name),provider:service_providers!inner(owner_id)')
    .eq('id', itemId)
    .maybeSingle()

  const booking = Array.isArray(item?.booking) ? item.booking[0] : item?.booking
  const provider = Array.isArray(item?.provider) ? item.provider[0] : item?.provider
  const expectedStatus = action === 'accept' ? 'confirmada' : 'rechazada'

  if (error || !item || !booking || !provider || provider.owner_id !== user.id) {
    return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  }
  if (item.provider_status !== expectedStatus) {
    return NextResponse.json({ error: 'El estado de la solicitud no coincide' }, { status: 409 })
  }

  const eventKey = `booking-item:${item.id}:${expectedStatus}`
  if (!(await claimPushEvent(eventKey, booking.client_id))) {
    return NextResponse.json({ ok: true, sent: 0, duplicate: true })
  }

  const accepted = action === 'accept'
  const sent = await deliverPushToUser(booking.client_id, {
    title: accepted ? 'Solicitud aceptada' : 'Solicitud rechazada',
    body: `${item.provider_name} ${accepted ? 'aceptó' : 'rechazó'} ${item.service_name} para ${booking.event_name}.`,
    url: `/mis-reservas/${booking.code}`,
    tag: eventKey,
  })

  return NextResponse.json({ ok: true, sent })
}
