import { NextResponse } from 'next/server'

import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireRole(['administrador'])
  const { id } = await params
  const body = await request.json().catch(() => null)
  if (typeof body?.verified !== 'boolean') return NextResponse.json({ error: 'Estado de verificación inválido.' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase.from('provider_payout_accounts').update({
    verified: body.verified,
    verified_at: body.verified ? new Date().toISOString() : null,
    verified_by: body.verified ? user.id : null,
  }).eq('id', id).select('id').maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 409 })
  if (!data) return NextResponse.json({ error: 'Cuenta bancaria no encontrada.' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
