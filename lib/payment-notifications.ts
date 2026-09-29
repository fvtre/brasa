import 'server-only'

import { getPublicAppUrl, sendTransactionalEmail } from '@/lib/email'
import { claimPushEvent, deliverPushToUser, releasePushEvent } from '@/lib/push-delivery'
import { createAdminClient } from '@/lib/supabase/admin'

type Recipient = {
  body: string
  email: string | null
  href: string
  kind: 'client' | 'provider'
  title: string
  userId: string
}

function escapeHtml(value: string) {
  const replacements: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }
  return value.replace(/[&<>'"]/g, character => replacements[character])
}

function formatClp(value: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
  }).format(value)
}

export async function notifyPaymentConfirmed(paymentId: string, bookingId: string) {
  const admin = createAdminClient()
  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .select('id,code,client_id,event_name,event_date,event_time,comuna,total,contact_email')
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

  const recipientIds = [booking.client_id, ...providerServices.keys()]
  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('id,email')
    .in('id', recipientIds)
  if (profilesError) throw profilesError
  const emails = new Map((profiles || []).map(profile => [profile.id, profile.email]))

  const eventName = booking.event_name || `Reserva ${booking.code}`
  const recipients: Recipient[] = [
    {
      userId: booking.client_id,
      title: 'Pago confirmado',
      body: `${eventName}: recibimos tu pago y la reserva quedó confirmada.`,
      href: `/mis-reservas/${booking.code}`,
      email: booking.contact_email || emails.get(booking.client_id) || null,
      kind: 'client',
    },
    ...Array.from(providerServices, ([userId, services]) => ({
      userId,
      title: 'Pago confirmado',
      body: `${eventName}: el cliente pagó ${services.join(', ')}.`,
      href: '/prestador/dashboard#solicitudes',
      email: emails.get(userId) || null,
      kind: 'provider' as const,
    })),
  ]

  for (const recipient of recipients) {
    const dedupeKey = `payment:${paymentId}:${recipient.userId}`
    let { data: notification, error: notificationError } = await admin
      .from('notifications')
      .insert({
        user_id: recipient.userId,
        type: 'payment_confirmed',
        title: recipient.title,
        body: recipient.body,
        href: recipient.href,
        dedupe_key: dedupeKey,
      })
      .select('id,email_sent_at')
      .single()

    if (notificationError?.code === '23505') {
      const existing = await admin
        .from('notifications')
        .select('id,email_sent_at')
        .eq('dedupe_key', dedupeKey)
        .single()
      notification = existing.data
      notificationError = existing.error
    }
    if (notificationError) throw notificationError
    if (!notification) continue

    const pushEventKey = `payment-confirmed:${paymentId}:${recipient.userId}`
    if (await claimPushEvent(pushEventKey, recipient.userId)) {
      let sent = 0
      try {
        sent = await deliverPushToUser(recipient.userId, {
          title: recipient.title,
          body: recipient.body,
          url: recipient.href,
          tag: pushEventKey,
        })
      } finally {
        if (sent === 0) await releasePushEvent(pushEventKey, recipient.userId)
      }
    }

    if (recipient.email && !notification.email_sent_at) {
      const detailUrl = `${getPublicAppUrl()}${recipient.href}`
      const roleText = recipient.kind === 'client'
        ? 'Tu pago fue aprobado y tu reserva quedó confirmada.'
        : 'El cliente completó el pago. La reserva ya está confirmada.'
      const summary = `${booking.event_date} a las ${String(booking.event_time).slice(0, 5)} · ${booking.comuna}`

      try {
        const result = await sendTransactionalEmail({
          to: recipient.email,
          subject: `Pago confirmado · ${eventName}`,
          idempotencyKey: `payment-confirmed/${paymentId}/${recipient.userId}`,
          text: `${roleText}\nReserva: ${booking.code}\nEvento: ${eventName}\nFecha: ${summary}\nTotal: ${formatClp(booking.total)}\n${detailUrl}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#211714">
            <div style="font-size:24px;font-weight:700;color:#ea580c">Brasa</div>
            <h1 style="font-size:26px">Pago confirmado</h1>
            <p>${escapeHtml(roleText)}</p>
            <div style="border:1px solid #eaded8;border-radius:14px;padding:18px;margin:20px 0">
              <strong>${escapeHtml(eventName)}</strong><br>
              Código ${escapeHtml(booking.code)}<br>
              ${escapeHtml(summary)}<br>
              <strong>Total: ${escapeHtml(formatClp(booking.total))}</strong>
            </div>
            <a href="${escapeHtml(detailUrl)}" style="display:inline-block;background:#ea580c;color:white;text-decoration:none;border-radius:10px;padding:12px 18px">Ver reserva</a>
            <p style="margin-top:24px;color:#786b66;font-size:13px">Este correo fue enviado automáticamente por Brasa.</p>
          </div>`,
        })

        if (result.sent) {
          await admin.from('notifications').update({
            email_sent_at: new Date().toISOString(),
            email_last_error: null,
          }).eq('id', notification.id)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido'
        await admin.rpc('record_notification_email_failure', {
          p_notification_id: notification.id,
          p_error: message.slice(0, 1000),
        })
        console.error('Payment confirmation email:', message)
      }
    }
  }
}
