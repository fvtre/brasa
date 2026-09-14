'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock3, CreditCard, LoaderCircle } from 'lucide-react'

function formatRemaining(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

export function WebpayPaymentButton({
  bookingId,
  paymentDueAt,
}: {
  bookingId: string
  paymentDueAt: string | null
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [remaining, setRemaining] = useState<number | null>(null)
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
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/payments/webpay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
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
        onClick={startPayment}
        disabled={loading || expired}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-60"
      >
        {loading ? <LoaderCircle className="size-5 animate-spin" /> : <CreditCard className="size-5" />}
        {loading
          ? 'Conectando con Webpay…'
          : expired
            ? 'Tiempo de pago agotado'
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
    </div>
  )
}
