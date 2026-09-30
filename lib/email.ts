import 'server-only'

type TransactionalEmail = {
  html: string
  idempotencyKey: string
  subject: string
  templateVariables?: Record<string, string | number>
  text: string
  to: string
  useTemplate?: boolean
}

function wait(milliseconds: number) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

export function getPublicAppUrl() {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3000'
  const value = configured.startsWith('http') ? configured : `https://${configured}`
  return value.replace(/\/$/, '')
}

export async function sendTransactionalEmail(message: TransactionalEmail) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  const templateId = process.env.RESEND_TEMPLATE_ID

  if (!apiKey || !from) {
    console.warn('Correo omitido: configura RESEND_API_KEY y RESEND_FROM_EMAIL.')
    return { configured: false, sent: false }
  }

  let lastError: Error | null = null
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': message.idempotencyKey.slice(0, 256),
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          ...(templateId && message.useTemplate !== false
            ? {
                template: {
                  id: templateId,
                  variables: {
                    SUBJECT: message.subject,
                    PREVIEW: message.text.split('\n').find(Boolean) || message.subject,
                    LOGO_URL: `${getPublicAppUrl()}/icon.svg`,
                    BADGE: 'Actualización',
                    TITLE: message.subject.replace(/ · Brasa$/, ''),
                    USER_NAME: 'usuario',
                    MESSAGE: message.text.split('\n').filter(Boolean)[1] || message.text,
                    EVENT_NAME: 'Mi evento',
                    BOOKING_CODE: '—',
                    EVENT_DATE: '—',
                    EVENT_TIME: '—',
                    COMUNA: '—',
                    AMOUNT: '—',
                    VOUCHER_DISPLAY: 'none',
                    ITEMS_HTML: 'Consulta el detalle completo en Brasa.',
                    PAYMENT_REFERENCE: '—',
                    PAYMENT_DATE: '—',
                    PROVIDER_NET: '—',
                    DETAIL: 'Ingresa a Brasa para revisar todos los detalles.',
                    ACTION_URL: getPublicAppUrl(),
                    ACTION_TEXT: 'Ver en Brasa',
                    ...message.templateVariables,
                  },
                },
              }
            : { html: message.html, text: message.text }),
        }),
      })

      if (response.ok) return { configured: true, sent: true }
      const detail = await response.text()
      lastError = new Error(`Resend ${response.status}: ${detail}`)
      if (response.status < 500 && response.status !== 429) break
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Error de red al enviar correo')
    }
    if (attempt < 3) await wait(attempt * 500)
  }

  throw lastError || new Error('No se pudo enviar el correo')
}
