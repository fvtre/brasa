'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Clock3, CreditCard, LoaderCircle, ShieldCheck, X } from 'lucide-react'

import { BOOKING_TERMS_VERSION } from '@/lib/booking-terms'
import { formatCLP } from '@/lib/format'

function formatRemaining(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

export function WebpayPaymentButton({
  bookingId,
  paymentDueAt,
  amountDueNow,
  balanceAmount,
  balanceDueAt,
  installmentPlan,
  paymentStage,
  total,
}: {
  bookingId: string
  paymentDueAt: string | null
  amountDueNow: number
  balanceAmount: number
  balanceDueAt: string | null
  installmentPlan: boolean
  paymentStage: 'deposit' | 'balance' | 'full'
  total: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [remaining, setRemaining] = useState<number | null>(null)
  const [showTerms, setShowTerms] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const refreshedAfterExpiry = useRef(false)

  useEffect(() => {
    if (!paymentDueAt) return

    function tick() {
      const milliseconds = Math.max(
        0,
        new Date(paymentDueAt!).getTime() - Date.now()
      )
      setRemaining(milliseconds)

      if (milliseconds === 0 && !refreshedAfterExpiry.current) {
        refreshedAfterExpiry.current = true
        router.refresh()
      }
    }

    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [paymentDueAt, router])

  const expired = remaining === 0

  async function startPayment() {
    if (!accepted) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/payments/webpay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          termsAccepted: true,
          termsVersion: BOOKING_TERMS_VERSION,
        }),
      })
      const responseText = await response.text()
      const result = responseText
        ? JSON.parse(responseText) as { error?: string; url?: string; token?: string }
        : null

      if (!result) {
        throw new Error('Webpay no entregó una respuesta. Intenta nuevamente.')
      }
      if (!response.ok) throw new Error(result.error || 'No se pudo iniciar el pago.')

      if (!result.url || !result.token) {
        throw new Error('Webpay entregó una respuesta incompleta.')
      }

      const form = document.createElement('form')
      form.method = 'POST'
      form.action = result.url
      const token = document.createElement('input')
      token.type = 'hidden'
      token.name = 'token_ws'
      token.value = result.token
      form.appendChild(token)
      document.body.appendChild(form)
      form.submit()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar el pago.')
      setLoading(false)
    }
  }

  const urgent = remaining !== null && remaining <= 2 * 60 * 1000

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setShowTerms(true)}
        disabled={loading || expired}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-60"
      >
        {loading ? <LoaderCircle className="size-5 animate-spin" /> : <CreditCard className="size-5" />}
        {loading
          ? 'Conectando con Webpay…'
          : expired
            ? 'Tiempo de pago agotado'
            : paymentStage === 'deposit'
              ? 'Pagar anticipo con Webpay'
              : paymentStage === 'balance'
                ? 'Pagar saldo con Webpay'
                : 'Pagar con Webpay'}
      </button>
      <p
        className={`mt-2 flex items-center justify-center gap-1.5 text-sm font-semibold ${
          urgent ? 'text-destructive' : 'text-amber-700 dark:text-amber-400'
        }`}
      >
        <Clock3 className="size-4" />
        Tiempo restante para pagar:{' '}
        <span className="tabular-nums">
          {remaining === null ? '10:00' : formatRemaining(remaining)}
        </span>
      </p>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      {showTerms && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={event => {
            if (event.currentTarget === event.target && !loading) setShowTerms(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-terms-title"
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-background p-5 shadow-2xl sm:max-w-xl sm:rounded-3xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary">Reserva y devolución</p>
                <h2 id="booking-terms-title" className="mt-1 text-2xl font-extrabold">
                  Revisa antes de pagar
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowTerms(false)}
                disabled={loading}
                className="rounded-full border p-2"
                aria-label="Cerrar"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-muted/50 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">
                  {paymentStage === 'deposit'
                    ? 'Anticipo para reservar (30%)'
                    : paymentStage === 'balance'
                      ? 'Saldo para confirmar (70%)'
                      : 'Pago de esta reserva'}
                </span>
                <strong className="text-xl">{formatCLP(amountDueNow)}</strong>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {paymentStage === 'deposit'
                  ? `El anticipo bloquea el horario. El saldo de ${formatCLP(balanceAmount)} debe pagarse a más tardar cinco días antes del evento${balanceDueAt ? ` (${new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeZone: 'America/Santiago' }).format(new Date(balanceDueAt))})` : ''}.`
                  : paymentStage === 'balance'
                    ? 'Este pago completa el saldo y confirma definitivamente la reserva.'
                    : 'Como el evento es dentro de cinco días, corresponde pagar el total para confirmar la reserva.'}
              </p>
            </div>

            <div className="mt-5">
              <h3 className="font-bold">Condiciones de devolución</h3>
              {installmentPlan ? (
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  <li>Durante el retracto legal aplicable: devolución completa.</li>
                  <li>Después del retracto, el anticipo garantiza la agenda y no se devuelve si el cliente cancela.</li>
                  <li>Si el saldo no se paga cinco días antes, la reserva se cancela y se libera el horario.</li>
                  <li>Del anticipo retenido, 90% compensa al prestador y 10% corresponde a Brasa.</li>
                  <li>Si cancela el prestador o Brasa, se devuelve el 100% de lo pagado.</li>
                </ul>
              ) : (
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  <li>Más de 7 días antes: devolución del 100%.</li>
                  <li>Entre 72 horas y 7 días: devolución del 80%.</li>
                  <li>Entre 24 y 72 horas: devolución del 50%.</li>
                  <li>Menos de 24 horas: sin devolución.</li>
                </ul>
              )}
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm leading-relaxed">
              <input
                type="checkbox"
                checked={accepted}
                onChange={event => setAccepted(event.target.checked)}
                className="mt-1 size-5 shrink-0 accent-primary"
              />
              <span>
                He leído y acepto las condiciones de reserva, cancelación y devolución, además de la{' '}
                <Link href="/privacidad" target="_blank" className="font-semibold text-primary underline">
                  política de privacidad
                </Link>{' '}
                y la{' '}
                <Link href="/cancelaciones" target="_blank" className="font-semibold text-primary underline">
                  política de cancelaciones
                </Link>.
              </span>
            </label>

            <button
              type="button"
              onClick={startPayment}
              disabled={!accepted || loading}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <LoaderCircle className="size-5 animate-spin" /> : <ShieldCheck className="size-5" />}
              {loading
                ? 'Conectando con Webpay…'
                : paymentStage === 'deposit'
                  ? 'Aceptar y pagar anticipo'
                  : paymentStage === 'balance'
                    ? 'Aceptar y pagar saldo'
                    : 'Aceptar condiciones y pagar'}
            </button>
          </section>
        </div>
      )}
    </div>
  )
}
