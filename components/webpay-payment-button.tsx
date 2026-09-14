'use client'

import { useState } from 'react'
import { CreditCard, LoaderCircle } from 'lucide-react'

export function WebpayPaymentButton({ bookingId }: { bookingId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function startPayment() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/payments/webpay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo iniciar el pago.')

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

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={startPayment}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-60"
      >
        {loading ? <LoaderCircle className="size-5 animate-spin" /> : <CreditCard className="size-5" />}
        {loading ? 'Conectando con Webpay…' : 'Pagar con Webpay'}
      </button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Tendrás 10 minutos para completar el pago.
      </p>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  )
}
