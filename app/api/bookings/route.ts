import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type PricingUnit =
  | 'por evento'
  | 'por persona'
  | 'por hora'
  | 'por unidad'
  | 'por pack'

type Selection = {
  providerId: string
  providerName: string
  category: string
  serviceId: string
  serviceName: string

  /*
   * Estos valores pueden venir desde la UI,
   * pero para prestadores reales NO confiamos
   * en ellos para calcular el cobro.
   */
  price: number
  unit: string

  /*
   * Solo aplica a "por unidad".
   *
   * Ej:
   * 50 sillas
   * 10 mesas
   * 2 parlantes
   */
  quantity?: number
}

type ServiceRow = {
  id: string
  category_slug: string
  name: string
  price: number
  unit: string
  active: boolean
  pricing_mode: string | null
  duration_hours: number | null
}

function normalizeUnit(
  value: string
): PricingUnit {
  const unit =
    value
      .trim()
      .toLowerCase()

  if (
    unit === 'por persona' ||
    unit === 'por hora' ||
    unit === 'por unidad' ||
    unit === 'por pack'
  ) {
    return unit
  }

  return 'por evento'
}

function calculateQuantity({
  unit,
  guests,
  durationHours,
  selectedQuantity,
}: {
  unit: PricingUnit
  guests: number
  durationHours: number
  selectedQuantity?: number
}) {
  switch (unit) {
    case 'por persona':
      return guests

    case 'por hora':
      /*
       * La duración ya viene calculada
       * desde Supabase considerando
       * cantidad de invitados.
       */
      return durationHours

    case 'por unidad': {
      const quantity =
        Number(
          selectedQuantity
        )

      /*
       * Para un servicio por unidad
       * NO podemos asumir que cantidad
       * = invitados.
       *
       * 50 invitados podrían necesitar:
       * - 50 sillas
       * - 5 mesas
       * - 2 parlantes
       *
       * Por ahora exigimos que la UI
       * indique la cantidad.
       */
      if (
        !Number.isFinite(
          quantity
        ) ||
        quantity <= 0
      ) {
        throw new Error(
          'Debes indicar la cantidad para los servicios cobrados por unidad.'
        )
      }

      return quantity
    }

    case 'por pack':
    case 'por evento':
    default:
      return 1
  }
}

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createClient()

    const {
      data: {
        user,
      },
    } =
      await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          error:
            'Debes iniciar sesión',
        },
        {
          status: 401,
        }
      )
    }

    await supabase.rpc(
      'ensure_my_profile'
    )

    const {
      data: profile,
      error:
        profileError,
    } =
      await supabase
        .from('profiles')
        .select(
          'role,active'
        )
        .eq(
          'id',
          user.id
        )
        .maybeSingle()

    if (profileError) {
      throw profileError
    }

    if (!profile?.active) {
      return NextResponse.json(
        {
          error:
            'Tu cuenta está desactivada',
        },
        {
          status: 403,
        }
      )
    }

    if (
      ![
        'cliente',
        'administrador',
      ].includes(
        profile?.role || ''
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Debes usar una cuenta cliente para reservar servicios',
        },
        {
          status: 403,
        }
      )
    }

    const body =
      await request.json()

    const selections =
      (
        body.selections ||
        []
      ) as Selection[]

    if (
      !body.date ||
      !body.time ||
      !body.address ||
      !selections.length
    ) {
      return NextResponse.json(
        {
          error:
            'Faltan datos del evento',
        },
        {
          status: 400,
        }
      )
    }

    const guests =
      Math.max(
        1,
        Number(
          body.guests
        ) || 1
      )

    const normalized:
      any[] = []

    let subtotal = 0

    /* =====================================================
       NORMALIZAR CADA SERVICIO
    ===================================================== */

    for (
      const selection
      of selections
    ) {
      /* ===================================================
         PRESTADOR REAL DESDE SUPABASE
      =================================================== */

      const {
        data:
          provider,
        error:
          providerError,
      } =
        await supabase
          .from(
            'service_providers'
          )
          .select(
            'id,business_name,active'
          )
          .eq(
            'slug',
            selection.providerId
          )
          .maybeSingle()

      if (providerError) {
        throw providerError
      }

      /*
       * Mientras existan cards locales/demo,
       * mantenemos fallback.
       */
      let service:
        ServiceRow | null =
        null

      let durationHours = 1

      if (
        provider?.id
      ) {
        if (
          !provider.active
        ) {
          return NextResponse.json(
            {
              error:
                `${provider.business_name} ya no está disponible.`,
            },
            {
              status: 409,
            }
          )
        }

        const {
          data:
            serviceData,
          error:
            serviceError,
        } =
          await supabase
            .from(
              'provider_services'
            )
            .select(
              `
                id,
                category_slug,
                name,
                price,
                unit,
                active,
                pricing_mode,
                duration_hours
              `
            )
            .eq(
              'provider_id',
              provider.id
            )
            .eq(
              'external_key',
              selection.serviceId
            )
            .maybeSingle()

        if (serviceError) {
          throw serviceError
        }

        if (
          !serviceData ||
          !serviceData.active
        ) {
          return NextResponse.json(
            {
              error:
                `El servicio ${selection.serviceName} ya no está disponible.`,
            },
            {
              status: 409,
            }
          )
        }

        service =
          serviceData as ServiceRow

        /* ===============================================
           NO RESERVAMOS PRECIOS SIN DEFINIR
        =============================================== */

        if (
          service.pricing_mode ===
          'quote'
        ) {
          return NextResponse.json(
            {
              error:
                `El servicio ${service.name} aún requiere cotización y no puede reservarse directamente.`,
            },
            {
              status: 409,
            }
          )
        }

        if (
          !Number.isFinite(
            Number(
              service.price
            )
          ) ||
          Number(
            service.price
          ) <= 0
        ) {
          return NextResponse.json(
            {
              error:
                `El servicio ${service.name} no tiene un precio válido publicado.`,
            },
            {
              status: 409,
            }
          )
        }

        /* ===============================================
           DURACIÓN REAL SEGÚN INVITADOS
        =============================================== */

        const {
          data:
            durationData,
          error:
            durationError,
        } =
          await supabase.rpc(
            'get_service_duration_hours',
            {
              p_service_id:
                service.id,

              p_guests:
                guests,
            }
          )

        if (durationError) {
          throw durationError
        }

        durationHours =
          Math.max(
            0.5,
            Number(
              durationData ||
              service.duration_hours ||
              1
            )
          )

        /* ===============================================
           VERIFICAR DISPONIBILIDAD JUSTO ANTES
           DE CREAR LA RESERVA
        =============================================== */

        const {
          data:
            available,
          error:
            availabilityError,
        } =
          await supabase.rpc(
            'is_provider_service_available',
            {
              p_provider_id:
                provider.id,

              p_service_id:
                service.id,

              p_date:
                body.date,

              p_start_time:
                body.time,

              p_guests:
                guests,
            }
          )

        if (
          availabilityError
        ) {
          throw availabilityError
        }

        if (!available) {
          return NextResponse.json(
            {
              error:
                `${provider.business_name} ya no está disponible para ese horario y cantidad de invitados.`,
            },
            {
              status: 409,
            }
          )
        }
      }

      /* ===================================================
         PRECIO Y UNIDAD
      =================================================== */

      const price =
        Number(
          service?.price ??
          selection.price ??
          0
        )

      if (
        !Number.isFinite(
          price
        ) ||
        price <= 0
      ) {
        return NextResponse.json(
          {
            error:
              `El servicio ${selection.serviceName} no tiene un precio válido.`,
          },
          {
            status: 409,
          }
        )
      }

      const unit =
        normalizeUnit(
          String(
            service?.unit ??
            selection.unit ??
            'por evento'
          )
        )

      /* ===================================================
         CANTIDAD SEGÚN FORMA DE COBRO

         persona → invitados
         hora    → duración real
         unidad  → cantidad seleccionada
         evento  → 1
         pack    → 1
      =================================================== */

      const quantity =
        calculateQuantity({
          unit,

          guests,

          durationHours,

          selectedQuantity:
            selection.quantity,
        })

      const lineTotal =
        Math.round(
          price *
          quantity
        )

      subtotal +=
        lineTotal

      normalized.push({
        provider_id:
          provider?.id ??
          null,

        service_id:
          service?.id ??
          null,

        provider_slug:
          selection.providerId,

        provider_name:
          provider
            ?.business_name ??
          selection.providerName,

        category_slug:
          service?.category_slug ??
          selection.category,

        service_external_key:
          selection.serviceId,

        service_name:
          service?.name ??
          selection.serviceName,

        unit,

        unit_price:
          price,

        quantity,

        line_total:
          lineTotal,
      })
    }

    /* =====================================================
       TOTAL BOOKING
    ===================================================== */

    const platformFee =
      Math.round(
        subtotal *
        0.08
      )

    const total =
      subtotal +
      platformFee

    /* =====================================================
       CREAR BOOKING
    ===================================================== */

    const {
      data:
        booking,
      error:
        bookingError,
    } =
      await supabase
        .from(
          'bookings'
        )
        .insert({
          client_id:
            user.id,

          event_name:
            body.eventName ||
            'Mi evento',

          event_date:
            body.date,

          event_time:
            body.time,

          comuna:
            body.comuna ||
            null,

          address:
            body.address,

          guests,

          budget:
            Math.max(
              0,
              Number(
                body.budget
              ) || 0
            ),

          subtotal,

          platform_fee:
            platformFee,

          total,

          status:
            'pendiente',

          contact_name:
            body.contactName,

          contact_email:
            body.contactEmail,

          contact_phone:
            body.contactPhone ||
            null,

          notes:
            body.notes ||
            null,
        })
        .select(
          'id,code,total,status'
        )
        .single()

    if (bookingError) {
      throw bookingError
    }

    /* =====================================================
       CREAR ITEMS
    ===================================================== */

    const {
      error:
        itemError,
    } =
      await supabase
        .from(
          'booking_items'
        )
        .insert(
          normalized.map(
            item => ({
              ...item,

              booking_id:
                booking.id,
            })
          )
        )

    if (itemError) {
      /*
       * Rollback simple mientras
       * no tengamos RPC transaccional.
       */
      await supabase
        .from(
          'bookings'
        )
        .delete()
        .eq(
          'id',
          booking.id
        )

      throw itemError
    }

    return NextResponse.json({
      booking,
    })
  } catch (
    error: any
  ) {
    console.error(
      'POST /api/bookings',
      error
    )

    return NextResponse.json(
      {
        error:
          error?.message ||
          'No se pudo crear la reserva',
      },
      {
        status: 500,
      }
    )
  }
}
