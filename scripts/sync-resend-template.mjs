import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const apiKey = process.env.RESEND_API_KEY
const templateId = process.env.RESEND_TEMPLATE_ID
const from = process.env.RESEND_FROM_EMAIL || 'notificaciones@brasa.reparotufuga.cl'

if (!apiKey) throw new Error('Falta RESEND_API_KEY')
if (!templateId) throw new Error('Falta RESEND_TEMPLATE_ID')

const html = await readFile(resolve('emails/brasa-notification.html'), 'utf8')
const variable = (key, fallbackValue) => ({ key, type: 'string', fallback_value: fallbackValue })
const variables = [
  variable('SUBJECT', 'Notificación de Brasa'),
  variable('PREVIEW', 'Tienes una actualización importante en Brasa.'),
  variable('LOGO_URL', 'https://brasa-eventos.vercel.app/icon.svg'),
  variable('BADGE', 'Actualización'),
  variable('TITLE', 'Tu reserva fue actualizada'),
  variable('USER_NAME', 'usuario'),
  variable('MESSAGE', 'Revisa los detalles de tu evento en Brasa.'),
  variable('EVENT_NAME', 'Mi evento'),
  variable('BOOKING_CODE', '—'),
  variable('EVENT_DATE', '—'),
  variable('EVENT_TIME', '—'),
  variable('COMUNA', '—'),
  variable('AMOUNT', '—'),
  variable('VOUCHER_DISPLAY', 'none'),
  variable('ITEMS_HTML', 'Consulta el detalle completo en Brasa.'),
  variable('PAYMENT_REFERENCE', '—'),
  variable('PAYMENT_DATE', '—'),
  variable('PROVIDER_NET', '—'),
  variable('DETAIL', 'Ingresa a Brasa para revisar todos los detalles.'),
  variable('ACTION_URL', 'https://brasa-eventos.vercel.app'),
  variable('ACTION_TEXT', 'Ver en Brasa'),
]

async function request(path, init) {
  const response = await fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  const body = await response.text()
  if (!response.ok) throw new Error(`Resend ${response.status}: ${body}`)
  return body ? JSON.parse(body) : null
}

await request(`/templates/${templateId}`, {
  method: 'PATCH',
  body: JSON.stringify({
    name: 'Brasa - Notificaciones transaccionales',
    alias: 'brasa-notification',
    from,
    subject: '{{{SUBJECT}}}',
    html,
    variables,
  }),
})

await request(`/templates/${templateId}/publish`, { method: 'POST' })
const published = await request(`/templates/${templateId}`, { method: 'GET' })
console.log(JSON.stringify({ id: published.id, alias: published.alias, status: published.status }, null, 2))
