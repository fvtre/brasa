import 'server-only'

type TransactionalEmail = {
  html: string
  idempotencyKey: string
  subject: string
  text: string
  to: string
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
          html: message.html,
          text: message.text,
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
