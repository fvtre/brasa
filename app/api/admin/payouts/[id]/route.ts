import { NextResponse } from 'next/server'

import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole(['administrador'])
  const { id } = await params
  const body = await request.json().catch(() => null)
  const reference = String(body?.reference || '').trim()
  if (body?.action !== 'mark_paid' || !reference) return NextResponse.json({ error: 'Debes indicar la referencia de transferencia.' }, { status: 400 })

  const supabase = await createClient()
  const { data: payout, error: payoutError } = await supabase.from('provider_payouts').select('id,provider_id,status,available_at').eq('id', id).maybeSingle()
  if (payoutError) return NextResponse.json({ error: payoutError.message }, { status: 500 })
  if (!payout) return NextResponse.json({ error: 'Liquidación no encontrada.' }, { status: 404 })
  if (payout.status !== 'lista_para_pagar' || new Date(payout.available_at) > new Date()) return NextResponse.json({ error: 'La liquidación todavía no está disponible.' }, { status: 409 })

  const { data: account } = await supabase.from('provider_payout_accounts').select('verified').eq('provider_id', payout.provider_id).maybeSingle()
  if (!account?.verified) return NextResponse.json({ error: 'La cuenta bancaria del prestador no está verificada.' }, { status: 409 })

  const { data, error } = await supabase.from('provider_payouts').update({ status: 'pagada', paid_at: new Date().toISOString(), transfer_reference: reference }).eq('id', id).eq('status', 'lista_para_pagar').select('id').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 409 })
  if (!data) return NextResponse.json({ error: 'La liquidación cambió de estado. Actualiza la página.' }, { status: 409 })
  return NextResponse.json({ ok: true })
}
