import 'server-only'

import { getPublicAppUrl, sendTransactionalEmail } from '@/lib/email'
import { claimPushEvent, deliverPushToUser, releasePushEvent } from '@/lib/push-delivery'
import { createAdminClient } from '@/lib/supabase/admin'

type EventNotification = {
  body: string
  email?: string | null
  eventKey: string
  href: string
  recipientId: string
  title: string
  type: string
}

function escapeHtml(value: string) {
  const replacements: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }
  return value.replace(/[&<>'"]/g, character => replacements[character])
}

export async function deliverEventNotification(event: EventNotification) {
  const admin = createAdminClient()
  let email = event.email

  if (!email) {
    const { data: profile } = await admin
      .from('profiles')
      .select('email')
      .eq('id', event.recipientId)
      .maybeSingle()
    email = profile?.email || null
  }

  let { data: notification, error: notificationError } = await admin
    .from('notifications')
    .insert({
      user_id: event.recipientId,
      type: event.type,
      title: event.title,
      body: event.body,
      href: event.href,
      dedupe_key: event.eventKey,
    })
    .select('id,email_sent_at')
    .single()

  if (notificationError?.code === '23505') {
    const existing = await admin
      .from('notifications')
      .select('id,email_sent_at')
      .eq('dedupe_key', event.eventKey)
      .single()
    notification = existing.data
    notificationError = existing.error
  }
  if (notificationError) throw notificationError

  let pushSent = 0
  if (await claimPushEvent(event.eventKey, event.recipientId)) {
    try {
      pushSent = await deliverPushToUser(event.recipientId, {
        title: event.title,
        body: event.body,
        url: event.href,
        tag: event.eventKey,
      })
    } finally {
      if (pushSent === 0) await releasePushEvent(event.eventKey, event.recipientId)
    }
  }

  let emailSent = false
  if (email && notification && !notification.email_sent_at) {
    const detailUrl = `${getPublicAppUrl()}${event.href}`
    const logoUrl = `${getPublicAppUrl()}/icon.svg`
    const badge = event.type === 'booking_created' || event.type === 'booking_request'
      ? 'Nueva solicitud'
      : event.type === 'message_created'
        ? 'Nuevo mensaje'
        : 'Reserva actualizada'
    const actionText = event.type === 'message_created' ? 'Abrir conversación' : 'Ver en Brasa'
    try {
      const result = await sendTransactionalEmail({
        to: email,
        subject: `${event.title} · Brasa`,
        idempotencyKey: event.eventKey,
        useTemplate: false,
        text: `${event.title}\n\n${event.body}\n\n${detailUrl}`,
        templateVariables: {
          PREVIEW: event.body,
          BADGE: badge,
          TITLE: event.title,
          MESSAGE: event.body,
          EVENT_NAME: event.body.split(':')[0] || 'Mi evento',
          DETAIL: event.type === 'booking_created'
            ? 'Revisa la solicitud y responde antes de que venza el plazo.'
            : 'Ingresa a Brasa para revisar la información completa.',
          ACTION_URL: detailUrl,
          ACTION_TEXT: actionText,
        },
        html: `<!doctype html><html lang="es"><body style="margin:0;background:#f7f2ef"><div style="display:none;max-height:0;overflow:hidden;color:transparent">${escapeHtml(event.body)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#f7f2ef"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #eaded8;border-radius:24px;overflow:hidden"><tr><td style="padding:24px 32px;background:#1c1715"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td width="48"><img src="${escapeHtml(logoUrl)}" width="44" height="44" alt="Brasa" style="display:block;border:0;border-radius:14px"></td><td style="padding-left:12px;color:#fff;font-family:Arial,sans-serif;font-size:24px;font-weight:800">Brasa</td></tr></table></td></tr><tr><td style="padding:32px;font-family:Arial,sans-serif;color:#211714"><span style="display:inline-block;padding:7px 12px;border-radius:999px;background:#fff0e8;color:#d94b0b;font-size:13px;font-weight:700">${escapeHtml(badge)}</span><h1 style="margin:18px 0 12px;font-size:28px;line-height:1.2;color:#211714">${escapeHtml(event.title)}</h1><p style="margin:0;font-size:16px;line-height:1.65;color:#514743">${escapeHtml(event.body)}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin:24px 0;border:1px solid #eaded8;border-radius:16px;background:#fcfaf9"><tr><td style="padding:18px 20px"><div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#d94b0b">Detalle</div><div style="margin-top:8px;font-size:15px;line-height:1.6;color:#514743">${escapeHtml(event.body)}</div></td></tr></table><table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="#f05a22" style="border-radius:12px"><a href="${escapeHtml(detailUrl)}" style="display:inline-block;padding:14px 22px;color:#fff;text-decoration:none;font-size:16px;font-weight:700">${escapeHtml(actionText)}</a></td></tr></table><p style="margin:30px 0 0;font-size:13px;line-height:1.5;color:#8b7f79">Este correo fue enviado automáticamente por Brasa. Revisa siempre los detalles dentro de la aplicación.</p></td></tr><tr><td style="padding:20px 32px;border-top:1px solid #eaded8;background:#fcfaf9;font-family:Arial,sans-serif;font-size:12px;color:#8b7f79;text-align:center">Brasa · Tu evento completo en un solo lugar</td></tr></table></td></tr></table></body></html>`,
      })
      emailSent = result.sent
      if (emailSent) {
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
      console.error('Event notification email:', message)
    }
  }

  return { emailSent, pushSent }
}

export async function deliverPendingEventNotifications(limit = 50) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('notifications')
    .select('user_id,type,title,body,href,dedupe_key,email_attempts')
    .not('dedupe_key', 'is', null)
    .is('email_sent_at', null)
    .lt('email_attempts', 3)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true })
    .limit(Math.max(1, Math.min(limit, 100)))

  if (error) throw error

  let processed = 0
  let emailsSent = 0
  let pushesSent = 0
  for (const notification of data || []) {
    if (!notification.dedupe_key) continue
    const result = await deliverEventNotification({
      recipientId: notification.user_id,
      type: notification.type,
      title: notification.title,
      body: notification.body || '',
      href: notification.href || '/',
      eventKey: notification.dedupe_key,
    })
    processed += 1
    emailsSent += Number(result.emailSent)
    pushesSent += result.pushSent
  }

  return { processed, emailsSent, pushesSent }
}
