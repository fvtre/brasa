import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getApplicationUrl, getWebpayTransaction } from '@/lib/transbank'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id,code,client_id,status,total,payment_due_at')
    .eq('id', String(body.bookingId || ''))
    .eq('client_id', user.id)
    .maybeSingle()

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Reserva no encontrada.' }, { status: 404 })
  }
  if (!['confirmada', 'esperando_pago'].includes(booking.status)) {
    return NextResponse.json(
      { error: 'El pago se habilita cuando todos los prestadores aceptan.' },
      { status: 409 }
    )
  }
  if (!Number.isInteger(booking.total) || booking.total <= 0) {
    return NextResponse.json({ error: 'La reserva no tiene un total válido.' }, { status: 409 })
  }

  const admin = createAdminClient()
  await admin.rpc('expire_stale_webpay_payments')

  if (booking.payment_due_at && new Date(booking.payment_due_at).getTime() <= Date.now()) {
    return NextResponse.json(
      { error: 'El plazo para pagar expiró. El horario fue liberado.' },
      { status: 409 }
    )
  }

  const { data: paid } = await admin
    .from('payments')
    .select('id')
    .eq('booking_id', booking.id)
    .eq('provider', 'webpay')
    .in('status', ['pagado', 'autorizado'])
    .maybeSingle()
  if (paid) return NextResponse.json({ error: 'Esta reserva ya está pagada.' }, { status: 409 })

  const { data: pending } = await admin
    .from('payments')
    .select('id')
    .eq('booking_id', booking.id)
    .eq('provider', 'webpay')
    .eq('status', 'pendiente')
    .maybeSingle()
  if (pending) {
    return NextResponse.json(
      { error: 'Ya existe un pago en curso. Espera su vencimiento para intentarlo nuevamente.' },
      { status: 409 }
    )
  }

  const buyOrder = `BR${booking.code.replace(/[^A-Z0-9]/gi, '').slice(-8)}${randomUUID().replaceAll('-', '').slice(0, 8)}`.slice(0, 26)
  const sessionId = randomUUID().replaceAll('-', '').slice(0, 26)
  const expiresAt = booking.payment_due_at || new Date(Date.now() + 12 * 60 * 1000).toISOString()

  const { data: payment, error: paymentError } = await admin
    .from('payments')
    .insert({
      booking_id: booking.id,
      provider: 'webpay',
      buy_order: buyOrder,
      amount: booking.total,
      status: 'pendiente',
      expires_at: expiresAt,
      metadata: { session_id: sessionId, environment: process.env.TRANSBANK_ENVIRONMENT || 'integration' },
    })
    .select('id')
    .single()

  if (paymentError || !payment) {
    return NextResponse.json({ error: paymentError?.message || 'No se pudo iniciar el pago.' }, { status: 409 })
  }

  try {
    const response = await getWebpayTransaction().create(
      buyOrder,
      sessionId,
      booking.total,
      `${getApplicationUrl(request)}/api/payments/webpay/return`
    )

    const { error: updateError } = await admin
      .from('payments')
      .update({
        token: response.token,
        metadata: {
          session_id: sessionId,
          environment: process.env.TRANSBANK_ENVIRONMENT || 'integration',
          webpay_url: response.url,
        },
      })
      .eq('id', payment.id)
    if (updateError) throw updateError

    if (booking.status === 'confirmada' && !booking.payment_due_at) {
      const { error: bookingUpdateError } = await admin
        .from('bookings')
        .update({ status: 'esperando_pago', payment_due_at: expiresAt })
        .eq('id', booking.id)
      if (bookingUpdateError) throw bookingUpdateError
    }

    return NextResponse.json({ url: response.url, token: response.token, expiresAt })
  } catch (error) {
    await admin.from('payments').update({ status: 'fallido' }).eq('id', payment.id)
    console.error('Webpay create:', error)
    return NextResponse.json({ error: 'Transbank no pudo iniciar el pago.' }, { status: 502 })
  }
}
