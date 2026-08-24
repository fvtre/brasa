'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import {
  Clock3,
  LoaderCircle,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

type Props =
  | {
      type: 'provider'
      itemId: string
      bookingId?: never
      status: string
    }
  | {
      type: 'client'
      bookingId: string
      itemId?: never
      status: string
    }

function formatRemaining(
  milliseconds: number
) {
  const seconds =
    Math.max(
      0,
      Math.floor(
        milliseconds / 1000
      )
    )

  const minutes =
    Math.floor(
      seconds / 60
    )

  const remainingSeconds =
    seconds % 60

  return `${String(minutes).padStart(
    2,
    '0'
  )}:${String(
    remainingSeconds
  ).padStart(2, '0')}`
}

export function BookingExpiryCountdown(
  props: Props
) {
  const router =
    useRouter()

  const supabase =
    React.useMemo(
      () => createClient(),
      []
    )

  const [
    expiresAt,
    setExpiresAt,
  ] =
    React.useState<
      string | null
    >(null)

  const [
    remaining,
    setRemaining,
  ] =
    React.useState<
      number | null
    >(null)

  const [
    expiring,
    setExpiring,
  ] =
    React.useState(false)

  const [
    expired,
    setExpired,
  ] =
    React.useState(false)

  const expirationTriggered =
    React.useRef(false)

  const pending =
    [
      'pendiente',
      'esperando_confirmacion',
    ].includes(
      props.status
    )

  /* ======================================================
     CARGAR FECHA DE VENCIMIENTO
  ====================================================== */

  React.useEffect(() => {
    if (!pending) {
      return
    }

    let cancelled = false

    async function load() {
      try {
        if (
          props.type ===
          'provider'
        ) {
          const {
            data,
            error,
          } =
            await supabase.rpc(
              'get_provider_item_expiration',
              {
                p_item_id:
                  props.itemId,
              }
            )

          if (error) {
            throw error
          }

          if (
            !cancelled &&
            data
          ) {
            setExpiresAt(
              String(data)
            )
          }

          return
        }

        const {
          data,
          error,
        } =
          await supabase.rpc(
            'get_client_booking_expiration',
            {
              p_booking_id:
                props.bookingId,
            }
          )

        if (error) {
          throw error
        }

        if (
          !cancelled &&
          data
        ) {
          setExpiresAt(
            String(data)
          )
        }
      } catch (err) {
        console.error(
          'Error cargando expiración:',
          err
        )
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [
    pending,
    props,
    supabase,
  ])

  /* ======================================================
     EXPIRAR REALMENTE
  ====================================================== */

  const expireNow =
    React.useCallback(
      async () => {
        if (
          expirationTriggered.current ||
          expiring
        ) {
          return
        }

        expirationTriggered.current =
          true

        setExpiring(true)

        try {
          /* ==================================================
             PRESTADOR
          ================================================== */

          if (
            props.type ===
            'provider'
          ) {
            const {
              data,
              error,
            } =
              await supabase.rpc(
                'expire_booking_item_if_needed',
                {
                  p_item_id:
                    props.itemId,
                }
              )

            if (error) {
              console.error(
                'RPC EXPIRACIÓN ERROR:',
                {
                  rpc:
                    'expire_booking_item_if_needed',

                  message:
                    error.message,

                  details:
                    error.details,

                  hint:
                    error.hint,

                  code:
                    error.code,
                }
              )

              throw new Error(
                `${
                  error.code ||
                  'RPC'
                }: ${
                  error.message
                }${
                  error.details
                    ? ` — ${error.details}`
                    : ''
                }`
              )
            }

            console.log(
              'Resultado expiración prestador:',
              data
            )

            if (
              data?.expired
            ) {
              setExpired(
                true
              )
            }

          /* ==================================================
             CLIENTE
          ================================================== */

          } else {
            const {
              data,
              error,
            } =
              await supabase.rpc(
                'expire_my_booking_items',
                {
                  p_booking_id:
                    props.bookingId,
                }
              )

            if (error) {
              console.error(
                'RPC EXPIRACIÓN ERROR:',
                {
                  rpc:
                    'expire_my_booking_items',

                  message:
                    error.message,

                  details:
                    error.details,

                  hint:
                    error.hint,

                  code:
                    error.code,
                }
              )

              throw new Error(
                `${
                  error.code ||
                  'RPC'
                }: ${
                  error.message
                }${
                  error.details
                    ? ` — ${error.details}`
                    : ''
                }`
              )
            }

            console.log(
              'Resultado expiración cliente:',
              data
            )

            if (
              Number(
                data?.expiredCount ||
                  0
              ) > 0
            ) {
              setExpired(
                true
              )
            }
          }

          /*
           * Refresca Server Components:
           * - dashboard cliente
           * - dashboard prestador
           */
          router.refresh()

        } catch (err: any) {
          console.error(
            'Error expirando solicitud:',
            err?.message ||
              err
          )

          /*
           * Permitimos reintentar
           * si realmente falló
           * la RPC.
           */
          expirationTriggered.current =
            false

        } finally {
          setExpiring(
            false
          )
        }
      },
      [
        expiring,
        props,
        router,
        supabase,
      ]
    )

  /* ======================================================
     RELOJ
  ====================================================== */

  React.useEffect(() => {
    if (
      !expiresAt ||
      !pending
    ) {
      return
    }

    function tick() {
      const difference =
        new Date(
          expiresAt!
        ).getTime() -
        Date.now()

      const safeDifference =
        Math.max(
          0,
          difference
        )

      setRemaining(
        safeDifference
      )

      if (
        safeDifference <= 0
      ) {
        expireNow()
      }
    }

    tick()

    const timer =
      window.setInterval(
        tick,
        1000
      )

    return () =>
      window.clearInterval(
        timer
      )
  }, [
    expiresAt,
    pending,
    expireNow,
  ])

  /* ======================================================
     NO APLICA
  ====================================================== */

  if (!pending) {
    return null
  }

  /* ======================================================
     CARGANDO EXPIRACIÓN
  ====================================================== */

  if (
    remaining === null
  ) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <LoaderCircle className="size-3.5 animate-spin" />

        Calculando tiempo...
      </div>
    )
  }

  /* ======================================================
     EXPIRANDO
  ====================================================== */

  if (expiring) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
        <LoaderCircle className="size-3.5 animate-spin" />

        Liberando solicitud...
      </div>
    )
  }

  /* ======================================================
     EXPIRADA
  ====================================================== */

  if (
    expired ||
    remaining <= 0
  ) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
        <Clock3 className="size-3.5" />

        Solicitud expirada
      </div>
    )
  }

  /* ======================================================
     ACTIVA
  ====================================================== */

  const urgent =
    remaining <=
    5 * 60 * 1000

  return (
    <div
      className={
        urgent
          ? 'flex items-center gap-1.5 text-xs font-semibold text-destructive'
          : 'flex items-center gap-1.5 text-xs font-medium text-amber-700'
      }
    >
      <Clock3 className="size-3.5" />

      {props.type ===
      'provider'
        ? 'Tiempo para responder:'
        : 'Esperando respuesta:'}

      <span className="tabular-nums">
        {formatRemaining(
          remaining
        )}
      </span>
    </div>
  )
}