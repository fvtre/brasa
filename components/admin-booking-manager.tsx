'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, CircleX, Loader2, PackageCheck } from 'lucide-react'

import { bookingStatusClasses, bookingStatusLabel } from '@/lib/booking-status'
import { formatCLP } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { calculateBrasaCommission, calculateProviderPayout } from '@/lib/commission'

type BookingItem = {
  id: string
  provider_name: string
  service_name: string
  provider_status: string
  line_total: number
}

type Payment = { status: string; amount: number; authorized_at: string | null }

export type AdminBooking = {
  id: string
  code: string
  event_name: string
  event_date: string
  event_time: string
  status: string
  total: number
  client: { full_name: string | null; email: string | null } | null
  items: BookingItem[]
  payments: Payment[]
}

export function AdminBookingManager({ bookings }: { bookings: AdminBooking[] }) {
  const router = useRouter()
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function act(booking: AdminBooking, action: 'confirm' | 'cancel' | 'complete') {
    const messages = {
      confirm: `¿Confirmar administrativamente ${booking.code}? Si no está pagada, comenzará su plazo de pago.`,
      cancel: `¿Cancelar ${booking.code}? Se liberará la disponibilidad, pero se conservará el historial.`,
      complete: `¿Marcar ${booking.code} como completada?`,
    }
    if (!window.confirm(messages[action])) return

    setError('')
    setWorkingId(booking.id)
    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'No se pudo actualizar la reserva.')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la reserva.')
    } finally {
      setWorkingId(null)
    }
  }

  return (
    <div className="mt-8 space-y-4">
      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {bookings.map(booking => {
        const paid = booking.payments.some(payment => ['pagado', 'autorizado'].includes(payment.status))
        const servicesTotal = booking.items.reduce((sum, item) => sum + Number(item.line_total || 0), 0)
        const providerTotal = booking.items.reduce((sum, item) => sum + calculateProviderPayout(Number(item.line_total || 0)), 0)
        const brasaTotal = booking.items.reduce((sum, item) => sum + calculateBrasaCommission(Number(item.line_total || 0)), 0)
        return (
          <Card key={booking.id} id={`reserva-${booking.id}`}>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold">{booking.event_name}</h2>
                    <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', bookingStatusClasses(booking.status))}>{bookingStatusLabel(booking.status)}</span>
                    {paid && <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700">Pagada</span>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{booking.code} · {booking.event_date} {booking.event_time?.slice(0, 5)} · {booking.client?.full_name || 'Cliente'} · {booking.client?.email || 'Sin correo'}</p>
                </div>
                <div className="text-right"><b className="text-xl">{formatCLP(booking.total)}</b><p className="text-xs text-muted-foreground">Total pagado por cliente</p></div>
              </div>

              <div className="mt-4 grid gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-3">
                <div><p className="text-xs text-muted-foreground">Servicios</p><b>{formatCLP(servicesTotal)}</b></div>
                <div><p className="text-xs text-muted-foreground">Comisión Brasa (10%)</p><b className="text-primary">{formatCLP(brasaTotal)}</b></div>
                <div><p className="text-xs text-muted-foreground">Por pagar a prestadores</p><b className="text-emerald-700">{formatCLP(providerTotal)}</b><p className="mt-0.5 text-[11px] text-muted-foreground">{!paid ? 'Pendiente del pago del cliente' : booking.status === 'completada' ? 'Listo para liquidar' : 'Se libera después del evento'}</p></div>
              </div>

              <div className="mt-4 grid gap-2">
                {booking.items.map(item => (
                  <div key={item.id} className="flex flex-wrap justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                    <span><b>{item.provider_name}</b> · {item.service_name}</span>
                    <span className="flex items-center gap-3"><span className={cn('rounded-full px-2 py-0.5 text-xs', bookingStatusClasses(item.provider_status))}>{bookingStatusLabel(item.provider_status)}</span><span className="text-right"><b className="block">{formatCLP(calculateProviderPayout(item.line_total))}</b><small className="text-muted-foreground">recibe prestador</small></span></span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button disabled={workingId === booking.id || ['confirmada', 'completada', 'cancelada'].includes(booking.status)} onClick={() => act(booking, 'confirm')}><CheckCircle2 /> Confirmar</Button>
                <Button variant="outline" disabled={workingId === booking.id || booking.status !== 'confirmada'} onClick={() => act(booking, 'complete')}><PackageCheck /> Completar</Button>
                <Button variant="destructive" disabled={workingId === booking.id || ['cancelada', 'completada'].includes(booking.status)} onClick={() => act(booking, 'cancel')}><CircleX /> Cancelar</Button>
                {workingId === booking.id && <Loader2 className="size-5 animate-spin self-center text-muted-foreground" />}
              </div>
            </CardContent>
          </Card>
        )
      })}
      {bookings.length === 0 && <p className="rounded-xl border p-10 text-center text-muted-foreground">No hay reservas registradas.</p>}
    </div>
  )
}
