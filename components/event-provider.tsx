"use client"

import * as React from "react"

import type { CategorySlug } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"

/* =========================================================
   SELECCIÓN DE SERVICIO
========================================================= */

export interface EventSelection {
  providerId: string
  providerName: string
  category: CategorySlug

  serviceId: string
  serviceName: string

  /*
   * Precio base.
   * Supabase recalcula siempre el valor real al reservar.
   */
  price: number
  unit: string

  quantity?: number

  /*
   * Datos originales del servicio.
   */
  baseUnitPrice?: number
  originalUnit?: string
  basePrice?: number

  /*
   * Invitados al momento de configurar.
   */
  guests?: number

  /* =======================================================
     PARRILLA
  ======================================================= */

  grillAvailable?: boolean
  wantsGrill?: boolean
  grillPrice?: number

  /* =======================================================
     TRASLADO
  ======================================================= */

  transportAvailable?: boolean
  wantsTransport?: boolean
  transportPrice?: number

  /* =======================================================
     COMPRAS
  ======================================================= */

  shoppingAvailable?: boolean
  wantsShopping?: boolean

  shoppingFeeType?:
  | "fixed"
  | "percentage"

  shoppingFee?: number

  /* =======================================================
     FULL BRASA
  ======================================================= */

  fullPackageEnabled?: boolean
  fullPackage?: boolean

  fullPackageDiscountType?:
  | "percentage"
  | "fixed"

  fullPackageDiscount?: number

  /*
   * Compatibilidad con configuraciones anteriores.
   */
  discount?: number
  configuredTotal?: number
}

/* =========================================================
   RESERVA
========================================================= */

export interface BookingInput {
  eventName: string
  date: string
  time: string
  address: string

  contactName: string
  contactEmail: string
  contactPhone: string

  notes: string
}

export interface BookingResult {
  id: string
  code: string
  status: string
  total: number
}

/* =========================================================
   CONTEXTO
========================================================= */

interface EventState {
  budget: number
  guests: number
  comuna?: string

  selections: EventSelection[]

  hydrated: boolean
  creatingBooking: boolean

  setBudget: (
    value: number
  ) => void

  setGuests: (
    value: number
  ) => void

  setComuna: (
    value: string | undefined
  ) => void

  addSelection: (
    selection: EventSelection
  ) => void

  removeSelection: (
    serviceId: string,
    providerId?: string
  ) => void

  updateSelection: (
    serviceId: string,
    providerId: string,
    patch: Partial<EventSelection>
  ) => void

  clear: () => void

  total: number

  has: (
    serviceId: string,
    providerId?: string
  ) => boolean

  selectionTotal: (
    selection: EventSelection
  ) => number

  createBooking: (
    data: BookingInput
  ) => Promise<BookingResult>
}

const EventContext =
  React.createContext<EventState | null>(
    null
  )

/*
 * Cambiamos versión porque ahora EventSelection
 * contiene configuraciones avanzadas.
 */
const STORAGE_KEY =
  "brasa-event-v6"

/* =========================================================
   HELPERS
========================================================= */

function serviceKey(
  serviceId: string,
  providerId?: string
) {
  return providerId
    ? `${providerId}:${serviceId}`
    : serviceId
}

/* =========================================================
   EVENT PROVIDER
========================================================= */

export function EventProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase =
    React.useMemo(
      () => createClient(),
      []
    )

  const [
    budget,
    setBudget,
  ] =
    React.useState(
      500000
    )

  const [
    guests,
    setGuestsState,
  ] =
    React.useState(
      30
    )

  const [
    comuna,
    setComuna,
  ] =
    React.useState<
      string | undefined
    >(
      undefined
    )

  const [
    selections,
    setSelections,
  ] =
    React.useState<
      EventSelection[]
    >([])

  const [
    hydrated,
    setHydrated,
  ] =
    React.useState(
      false
    )

  const [
    creatingBooking,
    setCreatingBooking,
  ] =
    React.useState(
      false
    )

  /* =======================================================
     CAMBIAR INVITADOS
  ======================================================= */

  const setGuests =
    React.useCallback(
      (
        value: number
      ) => {
        const safeValue =
          Math.max(
            1,
            Math.floor(
              Number(value) ||
              1
            )
          )

        setGuestsState(
          safeValue
        )

        /*
         * NO borramos el evento.
         *
         * Solo actualizamos invitados y eliminamos
         * cualquier total antiguo congelado.
         */
        setSelections(
          (
            previous
          ) =>
            previous.map(
              (
                selection
              ) => ({
                ...selection,

                guests:
                  safeValue,

                configuredTotal:
                  undefined,

                /*
                 * Si discount era un monto calculado
                 * previamente, no queremos depender
                 * de él al cambiar invitados.
                 */
                discount:
                  undefined,
              })
            )
        )
      },
      []
    )

  /* =======================================================
     RESTAURAR LOCAL STORAGE
  ======================================================= */

  React.useEffect(
    () => {
      try {
        const raw =
          window.localStorage.getItem(
            STORAGE_KEY
          )

        if (raw) {
          const saved =
            JSON.parse(
              raw
            )

          if (
            Number.isFinite(
              saved.budget
            )
          ) {
            setBudget(
              saved.budget
            )
          }

          if (
            Number.isFinite(
              saved.guests
            )
          ) {
            setGuestsState(
              Math.max(
                1,
                saved.guests
              )
            )
          }

          if (
            typeof saved.comuna ===
            "string"
          ) {
            setComuna(
              saved.comuna
            )
          }

          if (
            Array.isArray(
              saved.selections
            )
          ) {
            setSelections(
              saved.selections
            )
          }
        }
      } catch (
      error
      ) {
        console.error(
          "No se pudo restaurar el evento local",
          error
        )
      } finally {
        setHydrated(
          true
        )
      }
    },
    []
  )

  /* =======================================================
     GUARDAR LOCAL STORAGE
  ======================================================= */

  React.useEffect(
    () => {
      if (
        !hydrated
      ) {
        return
      }

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          budget,
          guests,
          comuna,
          selections,
        })
      )
    },
    [
      budget,
      guests,
      comuna,
      selections,
      hydrated,
    ]
  )

  /* =======================================================
     CALCULAR TOTAL DE UN SERVICIO
  ======================================================= */

  const selectionTotal =
    React.useCallback(
      (
        selection:
          EventSelection
      ) => {
        const unit =
          (
            selection.originalUnit ||
            selection.unit ||
            ""
          ).toLowerCase()

        /*
         * Precio unitario real.
         */
        const unitPrice =
          Number(
            selection.baseUnitPrice ??
            selection.price ??
            0
          )

        /*
         * Precio base.
         */
        let baseTotal = 0

        if (
          unit.includes(
            "persona"
          )
        ) {
          baseTotal =
            unitPrice *
            Math.max(
              1,
              guests
            )
        } else {
          baseTotal =
            Number(
              selection.basePrice ??
              selection.price ??
              0
            )
        }

        /*
         * EXTRAS
         */
        let extras = 0

        if (
          selection.wantsGrill
        ) {
          extras +=
            Number(
              selection.grillPrice ||
              0
            )
        }

        if (
          selection.wantsTransport
        ) {
          extras +=
            Number(
              selection.transportPrice ||
              0
            )
        }

        if (
          selection.wantsShopping &&
          selection.shoppingFeeType ===
          "fixed"
        ) {
          extras +=
            Number(
              selection.shoppingFee ||
              0
            )
        }

        /*
         * Full Brasa activa todos los extras
         * disponibles.
         */
        if (
          selection.fullPackage
        ) {
          extras = 0

          if (
            selection.grillAvailable
          ) {
            extras +=
              Number(
                selection.grillPrice ||
                0
              )
          }

          if (
            selection.transportAvailable
          ) {
            extras +=
              Number(
                selection.transportPrice ||
                0
              )
          }

          if (
            selection.shoppingAvailable &&
            selection.shoppingFeeType ===
            "fixed"
          ) {
            extras +=
              Number(
                selection.shoppingFee ||
                0
              )
          }
        }

        let subtotal =
          baseTotal +
          extras

        /*
         * DESCUENTO FULL BRASA
         */
        if (
          selection.fullPackage &&
          selection.fullPackageEnabled
        ) {
          const discountValue =
            Number(
              selection.fullPackageDiscount ||
              0
            )

          if (
            selection.fullPackageDiscountType ===
            "fixed"
          ) {
            subtotal -=
              discountValue
          } else {
            subtotal -=
              subtotal *
              (
                discountValue /
                100
              )
          }
        }

        /*
         * Compatibilidad con selecciones viejas
         * que todavía no tengan los nuevos campos.
         */
        if (
          selection.fullPackage &&
          !selection.fullPackageDiscount &&
          selection.discount
        ) {
          subtotal -=
            Number(
              selection.discount
            )
        }

        return Math.max(
          0,
          Math.round(
            subtotal
          )
        )
      },
      [
        guests,
      ]
    )

  /* =======================================================
     AGREGAR SERVICIO
  ======================================================= */

  const addSelection =
    React.useCallback(
      (
        selection:
          EventSelection
      ) => {
        setSelections(
          (
            previous
          ) => {
            const key =
              serviceKey(
                selection.serviceId,
                selection.providerId
              )

            const filtered =
              previous.filter(
                (
                  item
                ) =>
                  serviceKey(
                    item.serviceId,
                    item.providerId
                  ) !==
                  key
              )

            return [
              ...filtered,

              {
                ...selection,

                guests:
                  selection.guests ??
                  guests,

                /*
                 * Ya no queremos depender de
                 * un total antiguo congelado.
                 */
                configuredTotal:
                  undefined,
              },
            ]
          }
        )
      },
      [
        guests,
      ]
    )

  /* =======================================================
     QUITAR SERVICIO
  ======================================================= */

  const removeSelection =
    React.useCallback(
      (
        serviceId:
          string,

        providerId?:
          string
      ) => {
        const key =
          serviceKey(
            serviceId,
            providerId
          )

        setSelections(
          (
            previous
          ) =>
            previous.filter(
              (
                item
              ) => {
                if (
                  providerId
                ) {
                  return (
                    serviceKey(
                      item.serviceId,
                      item.providerId
                    ) !==
                    key
                  )
                }

                return (
                  item.serviceId !==
                  serviceId
                )
              }
            )
        )
      },
      []
    )

  /* =======================================================
     ACTUALIZAR SERVICIO
  ======================================================= */

  const updateSelection =
    React.useCallback(
      (
        serviceId:
          string,

        providerId:
          string,

        patch:
          Partial<EventSelection>
      ) => {
        setSelections(
          (
            previous
          ) =>
            previous.map(
              (
                selection
              ) => {
                const matches =
                  selection.serviceId ===
                  serviceId &&
                  selection.providerId ===
                  providerId

                if (
                  !matches
                ) {
                  return selection
                }

                return {
                  ...selection,
                  ...patch,

                  configuredTotal:
                    undefined,
                }
              }
            )
        )
      },
      []
    )

  /* =======================================================
     LIMPIAR EVENTO
  ======================================================= */

  const clear =
    React.useCallback(
      () => {
        setSelections(
          []
        )

        setComuna(
          undefined
        )

        window.localStorage.removeItem(
          STORAGE_KEY
        )
      },
      []
    )

  /* =======================================================
     TOTAL GENERAL
  ======================================================= */

  const total =
    React.useMemo(
      () =>
        selections.reduce(
          (
            sum,
            selection
          ) =>
            sum +
            selectionTotal(
              selection
            ),
          0
        ),
      [
        selections,
        selectionTotal,
      ]
    )

  /* =======================================================
     ¿YA ESTÁ AGREGADO?
  ======================================================= */

  const has =
    React.useCallback(
      (
        serviceId:
          string,

        providerId?:
          string
      ) => {
        if (
          providerId
        ) {
          return selections.some(
            (
              selection
            ) =>
              selection.serviceId ===
              serviceId &&
              selection.providerId ===
              providerId
          )
        }

        return selections.some(
          (
            selection
          ) =>
            selection.serviceId ===
            serviceId
        )
      },
      [
        selections,
      ]
    )

  /* =======================================================
     CREAR RESERVA REAL
  ======================================================= */

  const createBooking =
    React.useCallback(
      async (
        data:
          BookingInput
      ): Promise<BookingResult> => {
        if (
          creatingBooking
        ) {
          throw new Error(
            "Ya se está creando la reserva."
          )
        }

        if (
          selections.length ===
          0
        ) {
          throw new Error(
            "Debes agregar al menos un servicio."
          )
        }

        if (
          !data.eventName.trim()
        ) {
          throw new Error(
            "Ingresa el nombre del evento."
          )
        }

        if (
          !data.date
        ) {
          throw new Error(
            "Selecciona la fecha del evento."
          )
        }

        if (
          !data.time
        ) {
          throw new Error(
            "Selecciona la hora del evento."
          )
        }

        if (
          !data.address.trim()
        ) {
          throw new Error(
            "Ingresa la dirección del evento."
          )
        }

        if (
          !data.contactName.trim()
        ) {
          throw new Error(
            "Ingresa el nombre de contacto."
          )
        }

        if (
          !data.contactEmail.trim()
        ) {
          throw new Error(
            "Ingresa el correo de contacto."
          )
        }

        setCreatingBooking(
          true
        )

        try {
          /* ===============================================
             CONFIRMAR SESIÓN
          =============================================== */

          const {
            data: {
              user,
            },

            error:
            authError,
          } =
            await supabase.auth.getUser()

          if (
            authError ||
            !user
          ) {
            throw new Error(
              "Debes iniciar sesión para reservar."
            )
          }

          /* ===============================================
             DECISIONES CLIENTE

             NO enviamos precios confiables.
             PostgreSQL los recalcula desde provider_services.
          =============================================== */

          const items =
            selections.map(
              (
                selection
              ) => ({
                providerSlug:
                  selection.providerId,

                providerName:
                  selection.providerName,

                serviceKey:
                  selection.serviceId,

                serviceName:
                  selection.serviceName,

                /*
                 * Solo tendrá importancia
                 * para cobro por unidad.
                 */
                quantity:
                  Math.max(
                    1,
                    Number(
                      selection.quantity ||
                      1
                    )
                  ),

                wantsGrill:
                  !!selection.wantsGrill,

                wantsTransport:
                  !!selection.wantsTransport,

                wantsShopping:
                  !!selection.wantsShopping,

                fullPackage:
                  !!selection.fullPackage,
              })
            )
          /* ===============================================
             RPC SUPABASE
          =============================================== */

          const {
            data:
            result,

            error:
            bookingError,
          } =
            await supabase.rpc(
              "create_brasa_booking",
              {
                p_event_name:
                  data.eventName.trim(),

                p_event_date:
                  data.date,

                p_event_time:
                  data.time,

                p_comuna:
                  comuna ||
                  "",

                p_address:
                  data.address.trim(),

                p_guests:
                  Math.max(
                    1,
                    guests
                  ),

                p_budget:
                  Math.max(
                    0,
                    budget
                  ),

                p_contact_name:
                  data.contactName.trim(),

                p_contact_email:
                  data.contactEmail.trim(),

                p_contact_phone:
                  data.contactPhone.trim(),

                p_notes:
                  data.notes.trim(),

                p_items:
                  items,
              }
            )

          if (
            bookingError
          ) {
            console.error(
              "Supabase create_brasa_booking:",
              bookingError
            )

            throw new Error(
              bookingError.message ||
              "No se pudo crear la reserva."
            )
          }

          const booking =
            Array.isArray(
              result
            )
              ? result[0]
              : result

          if (
            !booking?.id ||
            !booking?.code
          ) {
            throw new Error(
              "Supabase no devolvió la reserva creada."
            )
          }

          /* ===============================================
             RESERVA OK
          =============================================== */

          setSelections(
            []
          )

          setComuna(
            undefined
          )

          window.localStorage.removeItem(
            STORAGE_KEY
          )

          return {
            id:
              booking.id,

            code:
              booking.code,

            status:
              booking.status,

            total:
              Number(
                booking.total ||
                0
              ),
          }
        } catch (
        error
        ) {
          console.error(
            "Error creando reserva:",
            error
          )

          throw error
        } finally {
          setCreatingBooking(
            false
          )
        }
      },
      [
        budget,
        comuna,
        creatingBooking,
        guests,
        selections,
        supabase,
      ]
    )

  /* =======================================================
     CONTEXT VALUE
  ======================================================= */

  const value:
    EventState = {
    budget,
    guests,
    comuna,
    selections,

    hydrated,
    creatingBooking,

    setBudget,
    setGuests,
    setComuna,

    addSelection,
    removeSelection,
    updateSelection,
    clear,

    total,
    has,
    selectionTotal,

    createBooking,
  }

  return (
    <EventContext.Provider
      value={
        value
      }
    >
      {children}
    </EventContext.Provider>
  )
}

/* =========================================================
   HOOK
========================================================= */

export function useEvent() {
  const ctx =
    React.useContext(
      EventContext
    )

  if (!ctx) {
    throw new Error(
      "useEvent must be used within EventProvider"
    )
  }

  return ctx
}