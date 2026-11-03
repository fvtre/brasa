import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { BOOKING_TERMS_SNAPSHOT, BOOKING_TERMS_VERSION } from '@/lib/booking-terms'
import { calculateBookingPaymentPlan } from '@/lib/payment-plan'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getApplicationUrl, getWebpayTransaction } from '@/lib/transbank'

async function createWebpayPayment(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  if (body.termsAccepted !== true || body.termsVersion !== BOOKING_TERMS_VERSION) {
    return NextResponse.json(
      { error: 'Debes leer y aceptar las condiciones vigentes antes de pagar.' },
      { status: 400 },
    )
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id,code,client_id,status,total,payment_due_at,payment_plan,balance_due_at,event_date,event_time')
    .eq('id', String(body.bookingId || ''))
    .eq('client_id', user.id)
    .maybeSingle()

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Reserva no encontrada.' }, { status: 404 })
  }
  if (!['confirmada', 'esperando_pago'].includes(booking.status)) {
    return NextResponse.json(
      { error: 'El pago se habilita cuando todos los prestadores aceptan.' },
      { status: 409 },
    )
  }
  if (!Number.isInteger(booking.total) || booking.total <= 0) {
    return NextResponse.json({ error: 'La reserva no tiene un total válido.' }, { status: 409 })
  }

  const admin = createAdminClient()
  await admin.rpc('expire_stale_webpay_payments')

  if (booking.status === 'esperando_pago'
      && booking.payment_due_at
      && new Date(booking.payment_due_at).getTime() <= Date.now()) {
    return NextResponse.json(
      { error: 'El plazo para pagar el anticipo expiró. El horario fue liberado.' },
      { status: 409 },
    )
  }

  const { data: paidPayments, error: paidPaymentsError } = await admin
    .from('payments')
    .select('id,amount,payment_stage')
    .eq('booking_id', booking.id)
    .eq('provider', 'webpay')
    .in('status', ['pagado', 'autorizado'])
  if (paidPaymentsError) {
    return NextResponse.json({ error: paidPaymentsError.message }, { status: 500 })
  }

  const paidAmount = (paidPayments || []).reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  )
  if (paidAmount >= booking.total) {
    return NextResponse.json({ error: 'Esta reserva ya está pagada.' }, { status: 409 })
  }

  const usesInstallmentPlan = booking.payment_plan === 'deposit_balance' || paidAmount === 0
  const plan = usesInstallmentPlan
    ? calculateBookingPaymentPlan({
        eventDate: booking.event_date,
        eventTime: booking.event_time,
        paidAmount,
        total: booking.total,
      })
    : {
        stage: 'full' as const,
        amountDueNow: booking.total - paidAmount,
        depositAmount: booking.total,
        balanceAmount: 0,
        balanceDueAt: null,
        paidAmount,
        total: booking.total,
      }

  if (plan.stage === 'balance' && plan.balanceDueAt && new Date(plan.balanceDueAt) <= new Date()) {
    return NextResponse.json(
      { error: 'El plazo para confirmar el saldo venció. La reserva requiere revisión.' },
      { status: 409 },
    )
  }

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
      { status: 409 },
    )
  }

  if (usesInstallmentPlan && booking.payment_plan !== 'deposit_balance') {
    const { error: planUpdateError } = await admin
      .from('bookings')
      .update({ payment_plan: 'deposit_balance' })
      .eq('id', booking.id)
    if (planUpdateError) {
      return NextResponse.json({ error: 'No se pudo actualizar el plan de pago.' }, { status: 500 })
    }
  }

  const { error: acceptanceError } = await admin
    .from('booking_terms_acceptances')
    .insert({
      booking_id: booking.id,
      client_id: user.id,
      terms_version: BOOKING_TERMS_VERSION,
      accepted_total: booking.total,
      policy_snapshot: { ...BOOKING_TERMS_SNAPSHOT, paymentPlan: plan },
    })
  if (acceptanceError && acceptanceError.code !== '23505') {
    console.error('Booking terms acceptance:', acceptanceError)
    return NextResponse.json(
      { error: 'No se pudo registrar la aceptación de las condiciones.' },
      { status: 500 },
    )
  }

  const buyOrder = `BR${booking.code.replace(/[^A-Z0-9]/gi, '').slice(-8)}${randomUUID().replaceAll('-', '').slice(0, 8)}`.slice(0, 26)
  const sessionId = randomUUID().replaceAll('-', '').slice(0, 26)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  const paymentMetadata = {
    session_id: sessionId,
    environment: process.env.TRANSBANK_ENVIRONMENT || 'integration',
    payment_stage: plan.stage,
    payment_plan: plan,
  }

  const { data: payment, error: paymentError } = await admin
    .from('payments')
    .insert({
      booking_id: booking.id,
      provider: 'webpay',
      buy_order: buyOrder,
      amount: plan.amountDueNow,
      payment_stage: plan.stage,
      status: 'pendiente',
      expires_at: expiresAt,
      metadata: paymentMetadata,
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
      plan.amountDueNow,
      `${getApplicationUrl(request)}/api/payments/webpay/return`,
    )

    const { error: updateError } = await admin
      .from('payments')
      .update({
        token: response.token,
        metadata: { ...paymentMetadata, webpay_url: response.url },
      })
      .eq('id', payment.id)
    if (updateError) throw updateError

    if (plan.stage !== 'balance' && booking.status === 'confirmada' && !booking.payment_due_at) {
      const { error: bookingUpdateError } = await admin
        .from('bookings')
        .update({ status: 'esperando_pago', payment_due_at: expiresAt })
        .eq('id', booking.id)
      if (bookingUpdateError) throw bookingUpdateError
    }

    return NextResponse.json({
      url: response.url,
      token: response.token,
      expiresAt,
      amount: plan.amountDueNow,
      paymentStage: plan.stage,
    })
  } catch (error) {
    await admin.from('payments').update({ status: 'fallido' }).eq('id', payment.id)
    console.error('Webpay create:', error)
    return NextResponse.json({ error: 'Transbank no pudo iniciar el pago.' }, { status: 502 })
  }
}

export async function POST(request: Request) {
  try {
    return await createWebpayPayment(request)
  } catch (error) {
    console.error('Webpay create no controlado:', error instanceof Error ? error.message : error)
    const missingConfiguration = error instanceof Error && error.message.startsWith('Falta ')
    return NextResponse.json(
      {
        error: missingConfiguration
          ? 'Webpay no está configurado en este entorno.'
          : 'No se pudo iniciar el pago con Webpay.',
      },
      { status: missingConfiguration ? 503 : 500 },
    )
  }
}
