import { NextResponse } from 'next/server'

import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

const ACTION_STATUS = {
  confirm: 'confirmada',
  cancel: 'cancelada',
  complete: 'completada',
} as const

const ACTION_SOURCES = {
  confirm: ['pendiente', 'esperando_confirmacion', 'rechazada', 'expirada', 'pago_expirado'],
  cancel: ['pendiente', 'esperando_confirmacion', 'confirmada', 'esperando_pago', 'en_preparacion', 'en_curso'],
  complete: ['confirmada', 'en_preparacion', 'en_curso'],
} as const

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole(['administrador'])
  const { id } = await params
  const body = await request.json().catch(() => null)
  const action = body?.action as keyof typeof ACTION_STATUS | undefined

  if (!action || !(action in ACTION_STATUS)) {
    return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: booking, error: bookingError } = await supabase.from('bookings').select('id').eq('id', id).maybeSingle()
  if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 500 })
  if (!booking) return NextResponse.json({ error: 'Reserva no encontrada.' }, { status: 404 })

  const { error } = await supabase
    .from('booking_items')
    .update({ provider_status: ACTION_STATUS[action] })
    .eq('booking_id', id)
    .in('provider_status', [...ACTION_SOURCES[action]])
  if (error) return NextResponse.json({ error: error.message }, { status: 409 })

  return NextResponse.json({ ok: true })
}
