import 'server-only'

import { calculateProviderPayout } from '@/lib/commission'
import { getPublicAppUrl, sendTransactionalEmail } from '@/lib/email'
import { claimPushEvent, deliverPushToUser, releasePushEvent } from '@/lib/push-delivery'
import { createAdminClient } from '@/lib/supabase/admin'

type Recipient = { body: string; email: string | null; href: string; kind: 'client' | 'provider'; title: string; userId: string }
type BookingItem = { line_total: number; quantity: number; service_name: string; service_providers: unknown; unit_price: number }

function escapeHtml(value: string) {
  const replacements: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }
  return value.replace(/[&<>'"]/g, character => replacements[character])
}

function formatClp(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value)
}

function formatPaymentDate(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Santiago' }).format(new Date(value))
}

export async function notifyPaymentConfirmed(paymentId: string, bookingId: string) {
  const admin = createAdminClient()
  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .select('id,code,client_id,event_name,event_date,event_time,comuna,subtotal,total,contact_email')
    .eq('id', bookingId).single()
  if (bookingError) throw bookingError

  const { data: itemsData, error: itemsError } = await admin
    .from('booking_items')
    .select('service_name,quantity,unit_price,line_total,service_providers!inner(owner_id)')
    .eq('booking_id', bookingId)
  if (itemsError) throw itemsError
  const items = (itemsData || []) as BookingItem[]

  const { data: payment, error: paymentError } = await admin
    .from('payments')
    .select('id,buy_order,external_id,amount,authorized_at,created_at')
    .eq('id', paymentId).single()
  if (paymentError) throw paymentError

  const providerItems = new Map<string, BookingItem[]>()
  for (const item of items) {
    const provider = item.service_providers as { owner_id?: string }
    if (!provider.owner_id) continue
    providerItems.set(provider.owner_id, [...(providerItems.get(provider.owner_id) || []), item])
  }

  const recipientIds = [booking.client_id, ...providerItems.keys()]
  const { data: profiles, error: profilesError } = await admin.from('profiles').select('id,email').in('id', recipientIds)
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
    ...Array.from(providerItems, ([userId, providerBookingItems]) => ({
      userId,
      title: 'Pago confirmado',
      body: `${eventName}: el cliente pagó ${providerBookingItems.map(item => item.service_name).join(', ')}.`,
      href: '/prestador/dashboard#solicitudes',
      email: emails.get(userId) || null,
      kind: 'provider' as const,
    })),
  ]

  for (const recipient of recipients) {
    const dedupeKey = `payment:${paymentId}:${recipient.userId}`
    let { data: notification, error: notificationError } = await admin.from('notifications').insert({
      user_id: recipient.userId, type: 'payment_confirmed', title: recipient.title,
      body: recipient.body, href: recipient.href, dedupe_key: dedupeKey,
    }).select('id,email_sent_at').single()

    if (notificationError?.code === '23505') {
      const existing = await admin.from('notifications').select('id,email_sent_at').eq('dedupe_key', dedupeKey).single()
      notification = existing.data
      notificationError = existing.error
    }
    if (notificationError) throw notificationError
    if (!notification) continue

    const pushEventKey = `payment-confirmed:${paymentId}:${recipient.userId}`
    if (await claimPushEvent(pushEventKey, recipient.userId)) {
      let sent = 0
      try {
        sent = await deliverPushToUser(recipient.userId, { title: recipient.title, body: recipient.body, url: recipient.href, tag: pushEventKey })
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
      const selectedItems = recipient.kind === 'client' ? items : (providerItems.get(recipient.userId) || [])
      const grossAmount = selectedItems.reduce((sum, item) => sum + Number(item.line_total || 0), 0)
      const displayedAmount = recipient.kind === 'client' ? Number(booking.total) : grossAmount
      const itemsHtml = selectedItems.map(item => {
        const quantity = Number(item.quantity || 1)
        return `${escapeHtml(item.service_name)} — ${quantity} × ${escapeHtml(formatClp(Number(item.unit_price || 0)))} = <strong>${escapeHtml(formatClp(Number(item.line_total || 0)))}</strong>`
      }).join('<br>') || 'Sin servicios informados'

      try {
        const logoUrl = `${getPublicAppUrl()}/icon.svg`
        const providerNetRow = recipient.kind === 'provider'
          ? `<tr><td style="padding:8px 0;color:#786b66">Monto neto prestador</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#087a5b">${escapeHtml(formatClp(calculateProviderPayout(grossAmount)))}</td></tr>`
          : ''
        const result = await sendTransactionalEmail({
          to: recipient.email,
          subject: `Comprobante de pago · ${eventName}`,
          idempotencyKey: `payment-confirmed/${paymentId}/${recipient.userId}`,
          useTemplate: false,
          text: `${roleText}\nReserva: ${booking.code}\nEvento: ${eventName}\nFecha: ${summary}\nTotal: ${formatClp(displayedAmount)}\nReferencia: ${payment.buy_order || payment.external_id || payment.id}\n${detailUrl}`,
          templateVariables: {
            PREVIEW: roleText,
            BADGE: recipient.kind === 'client' ? 'Pago confirmado' : 'Reserva pagada',
            TITLE: recipient.kind === 'client' ? 'Comprobante de tu reserva' : 'Comprobante del servicio pagado',
            MESSAGE: roleText,
            EVENT_NAME: eventName,
            BOOKING_CODE: booking.code,
            EVENT_DATE: booking.event_date,
            EVENT_TIME: String(booking.event_time).slice(0, 5),
            COMUNA: booking.comuna,
            AMOUNT: formatClp(displayedAmount),
            VOUCHER_DISPLAY: 'table-row',
            ITEMS_HTML: itemsHtml,
            PAYMENT_REFERENCE: payment.buy_order || payment.external_id || payment.id,
            PAYMENT_DATE: formatPaymentDate(payment.authorized_at || payment.created_at),
            PROVIDER_NET: recipient.kind === 'provider' ? formatClp(calculateProviderPayout(grossAmount)) : 'No aplica',
            DETAIL: recipient.kind === 'client'
              ? 'Este comprobante confirma el pago de la reserva. Ya puedes comunicarte con el prestador desde Brasa.'
              : 'El monto neto considera la comisión Brasa del 10%. Revisa la sección Pagos para seguir la liquidación.',
            ACTION_URL: detailUrl,
            ACTION_TEXT: recipient.kind === 'client' ? 'Ver reserva y chatear' : 'Ver reserva',
          },
          html: `<!doctype html><html lang="es"><body style="margin:0;background:#f7f2ef"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #eaded8;border-radius:22px;overflow:hidden"><tr><td style="padding:22px 28px;background:#1c1715"><img src="${escapeHtml(logoUrl)}" width="42" height="42" alt="Brasa" style="vertical-align:middle;border-radius:13px"><strong style="margin-left:12px;color:#fff;font:800 24px Arial">Brasa</strong></td></tr><tr><td style="padding:30px;font-family:Arial,sans-serif;color:#211714"><span style="padding:7px 12px;border-radius:999px;background:#dcf8ef;color:#087a5b;font-size:13px;font-weight:700">Pago confirmado</span><h1 style="font-size:27px;margin:18px 0 10px">Comprobante de reserva</h1><p style="font-size:16px;line-height:1.6;color:#514743">${escapeHtml(roleText)}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;padding:18px;border:1px solid #eaded8;border-radius:14px;background:#fcfaf9"><tr><td style="padding:7px 0;color:#786b66">Evento</td><td style="text-align:right;font-weight:700">${escapeHtml(eventName)}</td></tr><tr><td style="padding:7px 0;color:#786b66">Reserva</td><td style="text-align:right">${escapeHtml(booking.code)}</td></tr><tr><td style="padding:7px 0;color:#786b66">Fecha y lugar</td><td style="text-align:right">${escapeHtml(summary)}</td></tr><tr><td colspan="2" style="padding:14px 0 6px;border-top:1px solid #eaded8;font-weight:700">Servicios</td></tr><tr><td colspan="2" style="padding-bottom:12px;line-height:1.65">${itemsHtml}</td></tr><tr><td style="padding:12px 0 0;border-top:1px solid #eaded8;color:#786b66">Total</td><td style="padding:12px 0 0;border-top:1px solid #eaded8;text-align:right;font-size:20px;font-weight:800">${escapeHtml(formatClp(displayedAmount))}</td></tr><tr><td style="padding:8px 0;color:#786b66">Referencia</td><td style="padding:8px 0;text-align:right">${escapeHtml(payment.buy_order || payment.external_id || payment.id)}</td></tr><tr><td style="padding:8px 0;color:#786b66">Fecha de pago</td><td style="padding:8px 0;text-align:right">${escapeHtml(formatPaymentDate(payment.authorized_at || payment.created_at))}</td></tr>${providerNetRow}</table><a href="${escapeHtml(detailUrl)}" style="display:inline-block;padding:13px 20px;border-radius:11px;background:#f05a22;color:#fff;text-decoration:none;font-weight:700">${recipient.kind === 'client' ? 'Ver reserva y chatear' : 'Ver reserva'}</a><p style="margin-top:26px;color:#8b7f79;font-size:12px">Comprobante informativo emitido por Brasa. Conserva la referencia para cualquier consulta.</p></td></tr></table></td></tr></table></body></html>`,
        })

        if (result.sent) {
          await admin.from('notifications').update({ email_sent_at: new Date().toISOString(), email_last_error: null }).eq('id', notification.id)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido'
        await admin.rpc('record_notification_email_failure', { p_notification_id: notification.id, p_error: message.slice(0, 1000) })
        console.error('Payment confirmation email:', message)
      }
    }
  }
}
