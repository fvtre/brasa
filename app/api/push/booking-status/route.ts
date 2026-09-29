import { NextResponse } from 'next/server'

import { deliverEventNotification } from '@/lib/event-notifications'
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
    .select('id,provider_status,provider_name,service_name,booking:bookings!inner(id,client_id,code,event_name,contact_email),provider:service_providers!inner(owner_id)')
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

  const accepted = action === 'accept'
  const result = await deliverEventNotification({
    recipientId: booking.client_id,
    email: booking.contact_email,
    type: 'booking_status',
    title: accepted ? 'Solicitud aceptada' : 'Solicitud rechazada',
    body: `${item.provider_name} ${accepted ? 'aceptó' : 'rechazó'} ${item.service_name} para ${booking.event_name}.`,
    href: `/mis-reservas/${booking.code}`,
    eventKey: `booking-status:${item.id}:${expectedStatus}:${booking.client_id}`,
  })

  return NextResponse.json({ ok: true, ...result })
}
