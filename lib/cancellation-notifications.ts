import 'server-only'

import { deliverEventNotification } from '@/lib/event-notifications'
import { formatCLP } from '@/lib/format'
import { createAdminClient } from '@/lib/supabase/admin'

type CancellationNotice = {
  bookingId: string
  cancellationId: string
  refundAmount: number
  providerCompensation: number
}

export async function notifyBookingCancelled(input: CancellationNotice) {
  const admin = createAdminClient()
  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .select('id,code,client_id,event_name,contact_email')
    .eq('id', input.bookingId)
    .single()
  if (bookingError) throw bookingError

  const { data: items, error: itemsError } = await admin
    .from('booking_items')
    .select('provider_id,service_providers!inner(owner_id)')
    .eq('booking_id', input.bookingId)
  if (itemsError) throw itemsError

  const providerIds = Array.from(new Set((items || []).flatMap(item => {
    const provider = item.service_providers as unknown as { owner_id?: string }
    return provider.owner_id ? [provider.owner_id] : []
  })))
  const { data: profiles, error: profilesError } = providerIds.length
    ? await admin.from('profiles').select('id,email').in('id', providerIds)
    : { data: [], error: null }
  if (profilesError) throw profilesError
  const emails = new Map((profiles || []).map(profile => [profile.id, profile.email]))
  const eventName = booking.event_name || `Reserva ${booking.code}`

  const deliveries = [
    deliverEventNotification({
      recipientId: booking.client_id,
      email: booking.contact_email,
      type: 'booking_cancelled',
      title: 'Reserva cancelada',
      body: `${eventName}: cancelación confirmada. Devolución: ${formatCLP(input.refundAmount)}.`,
      href: `/mis-reservas/${booking.code}`,
      eventKey: `booking-cancelled:${input.cancellationId}:${booking.client_id}`,
    }),
    ...providerIds.map(providerId => deliverEventNotification({
      recipientId: providerId,
      email: emails.get(providerId) || null,
      type: 'booking_cancelled',
      title: 'El cliente canceló la reserva',
      body: `${eventName}: la reserva fue cancelada. Compensación: ${formatCLP(input.providerCompensation)}.`,
      href: '/prestador/dashboard#solicitudes',
      eventKey: `booking-cancelled:${input.cancellationId}:${providerId}`,
    })),
  ]

  const results = await Promise.allSettled(deliveries)
  for (const result of results) {
    if (result.status === 'rejected') console.error('Cancellation notification:', result.reason)
  }
}
