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
    try {
      const result = await sendTransactionalEmail({
        to: email,
        subject: `${event.title} · Brasa`,
        idempotencyKey: event.eventKey,
        text: `${event.title}\n\n${event.body}\n\n${detailUrl}`,
        templateVariables: {
          PREVIEW: event.body,
          BADGE: event.type === 'booking_created'
            ? 'Nueva solicitud'
            : event.type === 'message_created'
              ? 'Nuevo mensaje'
              : 'Reserva actualizada',
          TITLE: event.title,
          MESSAGE: event.body,
          EVENT_NAME: event.body.split(':')[0] || 'Mi evento',
          DETAIL: event.type === 'booking_created'
            ? 'Revisa la solicitud y responde antes de que venza el plazo.'
            : 'Ingresa a Brasa para revisar la información completa.',
          ACTION_URL: detailUrl,
          ACTION_TEXT: event.type === 'message_created' ? 'Abrir conversación' : 'Ver en Brasa',
        },
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#211714">
          <div style="font-size:24px;font-weight:700;color:#ea580c">Brasa</div>
          <h1 style="font-size:25px">${escapeHtml(event.title)}</h1>
          <p style="font-size:16px;line-height:1.55">${escapeHtml(event.body)}</p>
          <a href="${escapeHtml(detailUrl)}" style="display:inline-block;margin-top:12px;background:#ea580c;color:white;text-decoration:none;border-radius:10px;padding:12px 18px">Ver en Brasa</a>
          <p style="margin-top:24px;color:#786b66;font-size:13px">Este correo fue enviado automáticamente por Brasa.</p>
        </div>`,
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
