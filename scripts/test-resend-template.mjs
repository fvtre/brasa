const apiKey = process.env.RESEND_API_KEY
const templateId = process.env.RESEND_TEMPLATE_ID
const from = process.env.RESEND_FROM_EMAIL || 'notificaciones@brasa.reparotufuga.cl'
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://brasa-eventos.vercel.app').replace(/\/$/, '')
const recipient = process.argv[2]

if (!apiKey) throw new Error('Falta RESEND_API_KEY')
if (!templateId) throw new Error('Falta RESEND_TEMPLATE_ID')
if (!recipient) throw new Error('Uso: npm run email:test -- correo@ejemplo.com')

const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': `brasa-template-test-${Date.now()}`,
  },
  body: JSON.stringify({
    from,
    to: [recipient],
    subject: 'Prueba de plantilla · Brasa',
    template: {
      id: templateId,
      variables: {
        SUBJECT: 'Prueba de plantilla · Brasa',
        PREVIEW: 'La nueva plantilla de correo de Brasa está funcionando.',
        LOGO_URL: `${siteUrl}/icon.svg`,
        BADGE: 'Prueba local',
        TITLE: 'La plantilla está funcionando',
        USER_NAME: 'Adriano',
        MESSAGE: 'Este correo fue enviado desde el proyecto local usando la plantilla publicada en Resend.',
        EVENT_NAME: 'Mi evento de prueba',
        BOOKING_CODE: 'BR-PRUEBA',
        EVENT_DATE: '29 de septiembre de 2026',
        EVENT_TIME: '18:00',
        COMUNA: 'Puente Alto',
        AMOUNT: '$120.000',
        VOUCHER_DISPLAY: 'table-row',
        ITEMS_HTML: 'Parrilla Premium — 10 × $12.000 = $120.000',
        PAYMENT_REFERENCE: 'TEST-123456',
        PAYMENT_DATE: '30 de septiembre de 2026, 14:30',
        PROVIDER_NET: '$108.000',
        DETAIL: 'Esta es una prueba; no se creó ninguna reserva ni pago.',
        ACTION_URL: siteUrl,
        ACTION_TEXT: 'Abrir Brasa',
      },
    },
  }),
})

const body = await response.text()
if (!response.ok) throw new Error(`Resend ${response.status}: ${body}`)
console.log(body)
