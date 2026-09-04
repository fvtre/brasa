'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, LoaderCircle, X } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { BookingExpiryCountdown } from '@/components/booking-expiry-countdown'

type BookingAction = 'accept' | 'reject'

export function ProviderBookingActions({ itemId, status }: { itemId: string; status: string }) {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const [busy, setBusy] = React.useState<BookingAction | ''>('')
  const [error, setError] = React.useState('')
  const [pendingAction, setPendingAction] = React.useState<BookingAction | null>(null)

  React.useEffect(() => {
    if (!pendingAction) return

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) setPendingAction(null)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [busy, pendingAction])

  async function update(action: BookingAction) {
    if (busy) return
    setBusy(action)
    setError('')

    try {
      const { data, error: rpcError } = await supabase.rpc(
        'provider_update_booking_item_status',
        { p_item_id: itemId, p_action: action },
      )

      if (rpcError) throw rpcError
      if (!data?.ok) throw new Error('No se pudo actualizar la solicitud.')
      router.refresh()
    } catch (err: any) {
      console.error('Error actualizando solicitud:', err)
      setError(err?.message || 'No se pudo actualizar la solicitud.')
    } finally {
      setBusy('')
    }
  }

  if (!['pendiente', 'esperando_confirmacion'].includes(status)) return null

  return (
    <div className="mt-3 space-y-3">
      <BookingExpiryCountdown type="provider" itemId={itemId} status={status} />

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!!busy}
          aria-haspopup="dialog"
          onClick={() => setPendingAction('accept')}
        >
          {busy === 'accept' ? <LoaderCircle className="animate-spin" /> : <Check />}
          {busy === 'accept' ? 'Aceptando...' : 'Aceptar'}
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={!!busy}
          aria-haspopup="dialog"
          onClick={() => setPendingAction('reject')}
        >
          {busy === 'reject' ? <LoaderCircle className="animate-spin" /> : <X />}
          {busy === 'reject' ? 'Rechazando...' : 'Rechazar'}
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {pendingAction && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setPendingAction(null)
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="booking-confirmation-title"
            aria-describedby="booking-confirmation-description"
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl"
          >
            <div
              className={`flex size-11 items-center justify-center rounded-full ${
                pendingAction === 'accept'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {pendingAction === 'accept' ? (
                <Check className="size-5" />
              ) : (
                <X className="size-5" />
              )}
            </div>

            <h2 id="booking-confirmation-title" className="mt-4 text-xl font-bold">
              {pendingAction === 'accept'
                ? '¿Aceptar esta solicitud?'
                : '¿Rechazar esta solicitud?'}
            </h2>

            <p
              id="booking-confirmation-description"
              className="mt-2 text-sm leading-relaxed text-muted-foreground"
            >
              {pendingAction === 'accept'
                ? 'Confirmarás tu participación y este horario quedará reservado en tu agenda.'
                : 'El cliente será informado y el horario volverá a quedar disponible.'}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={!!busy}
                onClick={() => setPendingAction(null)}
              >
                Volver
              </Button>

              <Button
                type="button"
                variant={pendingAction === 'accept' ? 'default' : 'destructive'}
                size="lg"
                autoFocus
                disabled={!!busy}
                onClick={() => {
                  const action = pendingAction
                  setPendingAction(null)
                  void update(action)
                }}
              >
                {pendingAction === 'accept' ? 'Sí, aceptar' : 'Sí, rechazar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
