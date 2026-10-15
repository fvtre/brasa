'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CircleX, Loader2, X } from 'lucide-react'

import type { CancellationQuote } from '@/lib/cancellation-policy'
import { formatCLP } from '@/lib/format'
import { Button } from '@/components/ui/button'

export function CancelBookingButton({
  bookingId,
  quote,
}: {
  bookingId: string
  quote: CancellationQuote
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [acceptedPolicy, setAcceptedPolicy] = useState(false)

  async function cancelBooking() {
    setWorking(true)
    setError('')
    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, acceptedPolicy }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'No se pudo cancelar la reserva.')
      setOpen(false)
      router.refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo cancelar la reserva.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <Button type="button" variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <CircleX />
        Cancelar reserva
      </Button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          <section className="max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-background p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary">Cancelación y devolución</p>
                <h2 className="mt-1 text-2xl font-extrabold">Revisa antes de confirmar</h2>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)} disabled={working} aria-label="Cerrar">
                <X />
              </Button>
            </div>

            <p className="mt-4 rounded-xl bg-muted/60 p-4 text-sm font-medium">{quote.policyLabel}</p>

            <div className="mt-4 rounded-xl border p-4 text-xs leading-relaxed text-muted-foreground">
              <p className="font-semibold text-foreground">Condiciones de devolución</p>
              <ul className="mt-2 space-y-1">
                <li>Más de 7 días: devolución del 100%.</li>
                <li>Entre 72 horas y 7 días: devolución del 80%.</li>
                <li>Entre 24 y 72 horas: devolución del 50%.</li>
                <li>Menos de 24 horas: sin devolución.</li>
              </ul>
            </div>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Pago original</dt><dd>{formatCLP(quote.originalAmount)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Devolución a tu medio de pago</dt><dd className="font-bold text-emerald-700">{formatCLP(quote.refundAmount)}</dd></div>
              {quote.providerCompensation > 0 && <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Compensación al prestador</dt><dd>{formatCLP(quote.providerCompensation)}</dd></div>}
              {quote.platformFee > 0 && <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Comisión Brasa</dt><dd>{formatCLP(quote.platformFee)}</dd></div>}
            </dl>

            <label className="mt-5 block text-sm font-semibold" htmlFor="cancellation-reason">Motivo de cancelación (opcional)</label>
            <textarea
              id="cancellation-reason"
              value={reason}
              onChange={event => setReason(event.target.value.slice(0, 500))}
              className="mt-2 min-h-24 w-full rounded-xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder="Cuéntanos brevemente qué ocurrió"
              disabled={working}
            />

            {error && <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">{error}</p>}
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Al confirmar, la agenda se liberará y la devolución indicada se solicitará inmediatamente a Webpay. El abono puede tardar según tu banco.
            </p>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm">
              <input
                type="checkbox"
                checked={acceptedPolicy}
                onChange={event => setAcceptedPolicy(event.target.checked)}
                disabled={working}
                required
                aria-describedby="cancellation-policy-consent"
                className="sr-only"
              />
              <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border ${acceptedPolicy ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}`}>
                {acceptedPolicy && <Check className="size-3.5" />}
              </span>
              <span id="cancellation-policy-consent">
                He leído y acepto la{' '}
                <a
                  href="/cancelaciones"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-primary underline underline-offset-2"
                  onClick={event => event.stopPropagation()}
                >
                  política de cancelación y devolución
                </a>
                , incluido el monto informado que recibiré.
              </span>
            </label>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={working}>Volver</Button>
              <Button type="button" variant="destructive" onClick={cancelBooking} disabled={working || !acceptedPolicy}>
                {working ? <Loader2 className="animate-spin" /> : <CircleX />}
                Aceptar y cancelar reserva
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
