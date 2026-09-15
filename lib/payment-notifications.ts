import 'server-only'

import { sendWebPush } from '@/lib/push'
import { createAdminClient } from '@/lib/supabase/admin'

type Recipient = {
  body: string
  href: string
  title: string
  userId: string
}

export async function notifyPaymentConfirmed(paymentId: string, bookingId: string) {
  const admin = createAdminClient()
  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .select('id,code,client_id,event_name')
    .eq('id', bookingId)
    .single()

  if (bookingError) throw bookingError

  const { data: items, error: itemsError } = await admin
    .from('booking_items')
    .select('service_name,service_providers!inner(owner_id)')
    .eq('booking_id', bookingId)

  if (itemsError) throw itemsError

  const providerServices = new Map<string, string[]>()
  for (const item of items || []) {
    const provider = item.service_providers as unknown as { owner_id?: string }
    if (!provider.owner_id) continue
    providerServices.set(provider.owner_id, [
      ...(providerServices.get(provider.owner_id) || []),
      item.service_name,
    ])
  }

  const eventName = booking.event_name || `Reserva ${booking.code}`
  const recipients: Recipient[] = [
    {
      userId: booking.client_id,
      title: 'Pago confirmado',
      body: `${eventName}: recibimos tu pago y la reserva quedó confirmada.`,
      href: '/mensajes',
    },
    ...Array.from(providerServices, ([userId, services]) => ({
      userId,
      title: 'Pago confirmado',
      body: `${eventName}: el cliente pagó ${services.join(', ')}.`,
      href: '/mensajes',
    })),
  ]

  for (const recipient of recipients) {
    const { data: notification, error: notificationError } = await admin
      .from('notifications')
      .insert({
        user_id: recipient.userId,
        type: 'payment_confirmed',
        title: recipient.title,
        body: recipient.body,
        href: recipient.href,
        dedupe_key: `payment:${paymentId}:${recipient.userId}`,
      })
      .select('id')
      .single()

    if (notificationError?.code === '23505') continue
    if (notificationError) throw notificationError
    if (!notification) continue

    const { data: subscriptions, error: subscriptionsError } = await admin
      .from('push_subscriptions')
      .select('id,endpoint,p256dh,auth')
      .eq('user_id', recipient.userId)

    if (subscriptionsError) throw subscriptionsError

    for (const subscription of subscriptions || []) {
      try {
        await sendWebPush(subscription, {
          title: recipient.title,
          body: recipient.body,
          url: recipient.href,
          tag: `payment-${paymentId}`,
        })
      } catch (error: any) {
        const statusCode = Number(error?.statusCode || 0)
        if (statusCode === 404 || statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('id', subscription.id)
          continue
        }
        console.error('Web Push payment confirmation:', error)
      }
    }
  }
}
