'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import {
  Check,
  LoaderCircle,
  X,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { BookingExpiryCountdown } from '@/components/booking-expiry-countdown'

export function ProviderBookingActions({
  itemId,
  status,
}: {
  itemId: string
  status: string
}) {
  const router =
    useRouter()

  const supabase =
    React.useMemo(
      () => createClient(),
      []
    )

  const [
    busy,
    setBusy,
  ] =
    React.useState<
      'accept' |
      'reject' |
      ''
    >('')

  const [
    error,
    setError,
  ] =
    React.useState('')

  async function update(
    action:
      | 'accept'
      | 'reject'
  ) {
    if (busy) {
      return
    }

    setBusy(action)
    setError('')

    try {
      const {
        data,
        error:
          rpcError,
      } =
        await supabase.rpc(
          'provider_update_booking_item_status',
          {
            p_item_id:
              itemId,

            p_action:
              action,
          }
        )

      if (rpcError) {
        throw rpcError
      }

      if (!data?.ok) {
        throw new Error(
          'No se pudo actualizar la solicitud.'
        )
      }

      router.refresh()

    } catch (
      err: any
    ) {
      console.error(
        'Error actualizando solicitud:',
        err
      )

      setError(
        err?.message ||
        'No se pudo actualizar la solicitud.'
      )

    } finally {
      setBusy('')
    }
  }

  if (
    ![
      'pendiente',
      'esperando_confirmacion',
    ].includes(
      status
    )
  ) {
    return null
  }

  return (
    <div className="mt-3 space-y-3">

      <BookingExpiryCountdown
        type="provider"
        itemId={itemId}
        status={status}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!!busy}
          onClick={() =>
            update(
              'accept'
            )
          }
        >
          {busy ===
          'accept' ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Check />
          )}

          {busy ===
          'accept'
            ? 'Aceptando...'
            : 'Aceptar'}
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={!!busy}
          onClick={() => {
            const confirmed =
              window.confirm(
                '¿Seguro que quieres rechazar esta solicitud? El horario volverá a quedar disponible.'
              )

            if (
              !confirmed
            ) {
              return
            }

            update(
              'reject'
            )
          }}
        >
          {busy ===
          'reject' ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <X />
          )}

          {busy ===
          'reject'
            ? 'Rechazando...'
            : 'Rechazar'}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}