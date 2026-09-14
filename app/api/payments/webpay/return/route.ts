import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getApplicationUrl, getWebpayTransaction } from '@/lib/transbank'

async function readReturn(request: Request) {
  const values = request.method === 'POST'
    ? await request.formData()
    : new URL(request.url).searchParams
  return {
    token: String(values.get('token_ws') || ''),
    abortedToken: String(values.get('TBK_TOKEN') || ''),
  }
}

async function handleReturn(request: Request) {
  const appUrl = getApplicationUrl(request)
  const { token, abortedToken } = await readReturn(request)
  const admin = createAdminClient()

  const returnForPayment = async (paymentToken: string, result: string) => {
    const { data: payment } = await admin
      .from('payments')
      .select('booking_id,bookings!inner(code)')
      .eq('token', paymentToken)
      .maybeSingle()
    const relation = Array.isArray(payment?.bookings) ? payment.bookings[0] : payment?.bookings
    const code = (relation as { code?: string } | null)?.code
    return NextResponse.redirect(
      code
        ? `${appUrl}/mis-reservas/${encodeURIComponent(code)}?payment=${result}`
        : `${appUrl}/mis-reservas?payment=${result}`,
      303
    )
  }

  if (!token) {
    if (abortedToken) {
      const { data: payment } = await admin
        .from('payments')
        .select('id,booking_id')
        .eq('token', abortedToken)
        .maybeSingle()
      if (payment) {
        await admin.rpc('fail_webpay_payment', { p_token: abortedToken })
      }
      return returnForPayment(abortedToken, 'aborted')
    }
    return NextResponse.redirect(`${appUrl}/mis-reservas?payment=aborted`, 303)
  }

  const { data: payment } = await admin
    .from('payments')
    .select('id,booking_id,status')
    .eq('token', token)
    .maybeSingle()
  if (!payment) return NextResponse.redirect(`${appUrl}/mis-reservas?payment=invalid`, 303)
  if (['pagado', 'autorizado'].includes(payment.status)) return returnForPayment(token, 'success')

  try {
    const response = await getWebpayTransaction().commit(token)
    const approved = response.status === 'AUTHORIZED' && response.response_code === 0
    if (!approved) {
      await admin.from('payments').update({ status: 'fallido', metadata: { commit: response } }).eq('id', payment.id)
      await admin.rpc('fail_webpay_payment', { p_token: token })
      return returnForPayment(token, 'failed')
    }

    const { error } = await admin.rpc('finalize_webpay_payment', {
      p_token: token,
      p_buy_order: response.buy_order,
      p_amount: Math.round(response.amount),
      p_response: response,
    })
    if (error) throw error
    return returnForPayment(token, 'success')
  } catch (error) {
    console.error('Webpay commit:', error)
    return returnForPayment(token, 'error')
  }
}

export const GET = handleReturn
export const POST = handleReturn
