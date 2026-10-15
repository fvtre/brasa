import { NextResponse } from 'next/server'

import { calculateCancellationQuote, eventDateInSantiago } from '@/lib/cancellation-policy'
import { notifyBookingCancelled } from '@/lib/cancellation-notifications'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getWebpayTransaction } from '@/lib/transbank'

const CANCELLABLE_STATUSES = ['confirmada', 'esperando_pago', 'en_preparacion']

async function notifyCancellationSafely(input: Parameters<typeof notifyBookingCancelled>[0]) {
  try {
    await notifyBookingCancelled(input)
  } catch (error) {
    console.error('Cancellation notifications:', error)
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  if (body.acceptedPolicy !== true) {
    return NextResponse.json({ error: 'Debes aceptar las condiciones de cancelación y devolución.' }, { status: 400 })
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : ''
  const admin = createAdminClient()

  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .select('id,code,client_id,event_date,event_time,status,total')
    .eq('id', id)
    .maybeSingle()

  if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 500 })
  if (!booking || booking.client_id !== user.id) {
    return NextResponse.json({ error: 'Reserva no encontrada.' }, { status: 404 })
  }
  if (!CANCELLABLE_STATUSES.includes(booking.status)) {
    return NextResponse.json({ error: 'Esta reserva ya no puede cancelarse desde el portal.' }, { status: 409 })
  }

  const eventStartsAt = eventDateInSantiago(booking.event_date, booking.event_time)
  const quote = calculateCancellationQuote(booking.total, eventStartsAt)
  if (!quote.eligible) {
    return NextResponse.json({ error: 'El evento ya comenzó. Contacta a soporte para revisar el caso.' }, { status: 409 })
  }

  const { data: payment, error: paymentError } = await admin
    .from('payments')
    .select('id,token,amount,status')
    .eq('booking_id', booking.id)
    .eq('provider', 'webpay')
    .in('status', ['pagado', 'autorizado'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 500 })
  if (!payment) {
    return NextResponse.json({ error: 'No encontramos un pago confirmado para devolver.' }, { status: 409 })
  }

  const { data: paidPayout } = await admin
    .from('provider_payouts')
    .select('id')
    .eq('booking_id', booking.id)
    .eq('status', 'pagada')
    .limit(1)
    .maybeSingle()
  if (paidPayout) {
    return NextResponse.json({ error: 'Esta reserva requiere revisión administrativa porque ya fue liquidada.' }, { status: 409 })
  }

  const paymentQuote = calculateCancellationQuote(payment.amount, eventStartsAt)
  let { data: cancellation, error: cancellationReadError } = await admin
    .from('booking_cancellations')
    .select('*')
    .eq('booking_id', booking.id)
    .maybeSingle()

  if (cancellationReadError) {
    return NextResponse.json({ error: cancellationReadError.message }, { status: 500 })
  }

  if (cancellation?.status === 'completada') {
    await notifyCancellationSafely({
      bookingId: booking.id,
      cancellationId: cancellation.id,
      refundAmount: cancellation.refund_amount,
      providerCompensation: cancellation.provider_compensation,
    })
    return NextResponse.json({ ok: true, alreadyCompleted: true, cancellation })
  }
  if (cancellation?.status === 'procesando') {
    return NextResponse.json(
      { error: 'La cancelación ya se está procesando. Actualiza la página en unos segundos.' },
      { status: 409 },
    )
  }
  if (cancellation?.status === 'enviando_reembolso') {
    return NextResponse.json(
      { error: 'Webpay recibió esta devolución y estamos verificando el resultado. No la reintentes; soporte puede finalizarla sin duplicarla.' },
      { status: 409 },
    )
  }

  if (!cancellation) {
    const created = await admin
      .from('booking_cancellations')
      .insert({
        booking_id: booking.id,
        payment_id: payment.id,
        requested_by: user.id,
        policy_code: paymentQuote.policyCode,
        hours_before_event: Number(paymentQuote.hoursBeforeEvent.toFixed(2)),
        original_amount: paymentQuote.originalAmount,
        refund_amount: paymentQuote.refundAmount,
        retained_amount: paymentQuote.retainedAmount,
        provider_compensation: paymentQuote.providerCompensation,
        platform_fee: paymentQuote.platformFee,
        reason: reason || null,
      })
      .select('*')
      .single()

    if (created.error) {
      return NextResponse.json({ error: created.error.message }, { status: 409 })
    }
    cancellation = created.data
  } else if (cancellation.status === 'fallida') {
    const retried = await admin
      .from('booking_cancellations')
      .update({ status: 'procesando', failure_reason: null, reason: reason || cancellation.reason })
      .eq('id', cancellation.id)
      .eq('status', 'fallida')
      .select('*')
      .single()
    if (retried.error) return NextResponse.json({ error: retried.error.message }, { status: 409 })
    cancellation = retried.data
  }

  let refundResponse = cancellation.gateway_response || {}

  if (cancellation.status !== 'reembolso_confirmado') {
    let refundWasAccepted = false
    let gatewayCallStarted = false
    let gatewayOutcomeUnknown = false
    try {
      if (cancellation.refund_amount > 0) {
        if (!payment.token) throw new Error('El pago no tiene token de Webpay para efectuar la devolución.')

        const sending = await admin
          .from('booking_cancellations')
          .update({ status: 'enviando_reembolso' })
          .eq('id', cancellation.id)
          .eq('status', 'procesando')
          .select('id')
          .single()
        if (sending.error) throw sending.error

        gatewayCallStarted = true
        gatewayOutcomeUnknown = true
        refundResponse = await getWebpayTransaction().refund(payment.token, cancellation.refund_amount)
        gatewayOutcomeUnknown = false
        const successful = refundResponse?.type === 'REVERSED' || refundResponse?.response_code === 0
        if (!successful) {
          await admin.from('booking_cancellations').update({
            status: 'fallida',
            gateway_response: refundResponse,
            failure_reason: 'Webpay rechazó la solicitud de devolución.',
          }).eq('id', cancellation.id).eq('status', 'enviando_reembolso')
          throw new Error('Webpay rechazó la solicitud de devolución.')
        }
        refundWasAccepted = true
      } else {
        refundResponse = { type: 'NO_REFUND', reason: 'Política de cancelación menor a 24 horas' }
      }

      const confirmed = await admin
        .from('booking_cancellations')
        .update({
          status: 'reembolso_confirmado',
          gateway_response: refundResponse,
          refund_confirmed_at: new Date().toISOString(),
          failure_reason: null,
        })
        .eq('id', cancellation.id)
        .select('*')
        .single()
      if (confirmed.error) throw confirmed.error
      cancellation = confirmed.data
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo realizar la devolución.'
      if (!gatewayCallStarted) {
        await admin.from('booking_cancellations').update({
          status: 'fallida',
          failure_reason: message.slice(0, 1000),
        }).eq('id', cancellation.id).eq('status', 'procesando')
      }
      console.error('Webpay refund:', message)
      return NextResponse.json(
        {
          error: refundWasAccepted || gatewayOutcomeUnknown
            ? 'La solicitud llegó a Webpay, pero falta verificar el resultado interno. No vuelvas a cancelar; soporte puede revisarla sin duplicar el reembolso.'
            : message,
        },
        { status: 502 },
      )
    }
  }

  const { data: result, error: finalizeError } = await admin.rpc(
    'finalize_client_booking_cancellation',
    { p_cancellation_id: cancellation.id, p_gateway_response: refundResponse },
  )
  if (finalizeError) {
    console.error('Finalize cancellation:', finalizeError)
    return NextResponse.json(
      { error: 'La devolución fue confirmada, pero falta finalizar la cancelación. Puedes reintentar sin un segundo cobro.' },
      { status: 500 },
    )
  }

  await notifyCancellationSafely({
    bookingId: booking.id,
    cancellationId: cancellation.id,
    refundAmount: paymentQuote.refundAmount,
    providerCompensation: paymentQuote.providerCompensation,
  })

  return NextResponse.json({ ok: true, result, quote: paymentQuote })
}
