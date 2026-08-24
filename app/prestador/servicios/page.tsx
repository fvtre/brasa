'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import {
  ArrowRight,
  BadgePercent,
  BriefcaseBusiness,
  Car,
  Clock3,
  Flame,
  LoaderCircle,
  Package,
  Plus,
  Power,
  ShoppingCart,
  Trash2,
  Users,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { formatCLP } from '@/lib/format'

type ProviderService = {
  id: string
  name: string
  description: string | null

  price: number
  unit: string

  min_guests: number | null
  max_guests: number | null

  duration_hours: number | null
  extra_hour_price: number | null

  grill_available: boolean
  grill_price: number

  transport_available: boolean
  transport_price: number

  shopping_available: boolean
  shopping_fee_type:
  | 'fixed'
  | 'percentage'

  shopping_fee: number

  full_package_enabled: boolean

  full_package_discount_type:
  | 'percentage'
  | 'fixed'

  full_package_discount: number

  includes?: string[]
  excludes?: string[]

  active: boolean
}

type ProviderInfo = {
  id: string
  category_slug: string
}

const INITIAL_FORM = {
  name: '',
  description: '',

  price: 12000,
  unit: 'por persona',

  minGuests: 10,
  maxGuests: 60,

  durationHours: 5,
  extraHourPrice: 25000,

  grillAvailable: true,
  grillPrice: 35000,

  transportAvailable: true,
  transportPrice: 15000,

  shoppingAvailable: true,
  shoppingFeeType:
    'fixed' as
    | 'fixed'
    | 'percentage',

  shoppingFee: 25000,

  fullPackageEnabled: true,

  fullPackageDiscountType:
    'percentage' as
    | 'percentage'
    | 'fixed',

  fullPackageDiscount: 10,

  includesText:
    'Preparación del asado\nUtensilios de trabajo\nServicio de parrillero',

  excludesText:
    'Carnes\nBebestibles\nHielo',
}

export default function ProviderServicesPage() {
  const router = useRouter()

  const supabase = React.useMemo(
    () => createClient(),
    []
  )

  const [
    provider,
    setProvider,
  ] =
    React.useState<ProviderInfo | null>(
      null
    )

  const [
    services,
    setServices,
  ] =
    React.useState<
      ProviderService[]
    >([])

  const [
    loading,
    setLoading,
  ] =
    React.useState(true)

  const [
    busy,
    setBusy,
  ] =
    React.useState(false)

  const [
    error,
    setError,
  ] =
    React.useState('')

  const [
    f,
    setF,
  ] =
    React.useState(
      INITIAL_FORM
    )

  const isGrillProvider =
    provider?.category_slug ===
    'parrilleros'

  // ======================================================
  // CARGAR PRESTADOR Y SERVICIOS
  // ======================================================

  const load =
    React.useCallback(
      async () => {
        setLoading(true)
        setError('')

        try {
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
            window.location.assign(
              '/login?next=/prestador/servicios'
            )

            return
          }

          const {
            data:
            providerData,
            error:
            providerError,
          } =
            await supabase
              .from(
                'service_providers'
              )
              .select(
                'id,category_slug'
              )
              .eq(
                'owner_id',
                user.id
              )
              .maybeSingle()

          if (
            providerError
          ) {
            throw providerError
          }

          if (
            !providerData
          ) {
            router.replace(
              '/prestador/onboarding'
            )

            return
          }

          setProvider(
            providerData
          )

          const {
            data:
            servicesData,
            error:
            servicesError,
          } =
            await supabase
              .from(
                'provider_services'
              )
              .select('*')
              .eq(
                'provider_id',
                providerData.id
              )
              .order(
                'created_at',
                {
                  ascending:
                    false,
                }
              )

          if (
            servicesError
          ) {
            throw servicesError
          }

          setServices(
            (servicesData ||
              []) as ProviderService[]
          )
        } catch (
        err: any
        ) {
          console.error(
            'Error cargando servicios:',
            err
          )

          setError(
            err?.message ||
            'No se pudieron cargar tus servicios.'
          )
        } finally {
          setLoading(
            false
          )
        }
      },
      [
        router,
        supabase,
      ]
    )

  React.useEffect(
    () => {
      load()
    },
    [load]
  )

  // ======================================================
  // CREAR SERVICIO
  // ======================================================

  async function add(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (
      !provider ||
      busy
    ) {
      return
    }

    setBusy(true)
    setError('')

    try {
      if (
        !f.name.trim()
      ) {
        throw new Error(
          'Ingresa el nombre del servicio.'
        )
      }

      if (
        !Number.isFinite(
          Number(
            f.price
          )
        ) ||
        Number(
          f.price
        ) < 0
      ) {
        throw new Error(
          'Ingresa un precio válido.'
        )
      }

      if (
        f.minGuests <
        1
      ) {
        throw new Error(
          'El mínimo debe ser al menos 1 persona.'
        )
      }

      if (
        f.maxGuests &&
        f.maxGuests <
        f.minGuests
      ) {
        throw new Error(
          'El máximo de personas no puede ser menor que el mínimo.'
        )
      }

      if (
        !Number.isFinite(
          Number(f.durationHours)
        ) ||
        Number(f.durationHours) <= 0
      ) {
        throw new Error(
          'Debes indicar cuánto dura el servicio.'
        )
      }

      if (
        f.fullPackageDiscountType ===
        'percentage' &&
        f.fullPackageDiscount >
        100
      ) {
        throw new Error(
          'El descuento porcentual no puede superar 100%.'
        )
      }

      const includes =
        linesToArray(
          f.includesText
        )

      const excludes =
        linesToArray(
          f.excludesText
        )

      const {
        error:
        insertError,
      } =
        await supabase
          .from(
            'provider_services'
          )
          .insert({
            provider_id:
              provider.id,

            external_key:
              `custom-${Date.now()}`,

            name:
              f.name.trim(),

            description:
              f.description.trim(),

            price:
              Number(
                f.price
              ),

            unit:
              f.unit,

            min_guests:
              Number(
                f.minGuests
              ),

            max_guests:
              f.maxGuests
                ? Number(
                  f.maxGuests
                )
                : null,

            duration_hours:
              Number(f.durationHours),

            extra_hour_price:
              Number(
                f.extraHourPrice ||
                0
              ),

            grill_available:
              isGrillProvider
                ? f.grillAvailable
                : false,

            grill_price:
              isGrillProvider &&
                f.grillAvailable
                ? Number(
                  f.grillPrice ||
                  0
                )
                : 0,

            transport_available:
              f.transportAvailable,

            transport_price:
              f.transportAvailable
                ? Number(
                  f.transportPrice ||
                  0
                )
                : 0,

            shopping_available:
              isGrillProvider
                ? f.shoppingAvailable
                : false,

            shopping_fee_type:
              f.shoppingFeeType,

            shopping_fee:
              isGrillProvider &&
                f.shoppingAvailable
                ? Number(
                  f.shoppingFee ||
                  0
                )
                : 0,

            full_package_enabled:
              isGrillProvider
                ? f.fullPackageEnabled
                : false,

            full_package_discount_type:
              f.fullPackageDiscountType,

            full_package_discount:
              isGrillProvider &&
                f.fullPackageEnabled
                ? Number(
                  f.fullPackageDiscount ||
                  0
                )
                : 0,

            includes,
            excludes,

            active:
              true,
          })

      if (
        insertError
      ) {
        throw insertError
      }

      setF({
        ...INITIAL_FORM,
      })

      await load()
    } catch (
    err: any
    ) {
      console.error(
        'Error creando servicio:',
        err
      )

      setError(
        err?.message ||
        'No se pudo crear el servicio.'
      )
    } finally {
      setBusy(false)
    }
  }

  // ======================================================
  // ACTIVAR / PAUSAR
  // ======================================================

  async function toggle(
    service:
      ProviderService
  ) {
    try {
      const {
        error:
        updateError,
      } =
        await supabase
          .from(
            'provider_services'
          )
          .update({
            active:
              !service.active,
          })
          .eq(
            'id',
            service.id
          )

      if (
        updateError
      ) {
        throw updateError
      }

      await load()
    } catch (
    err: any
    ) {
      setError(
        err?.message ||
        'No se pudo actualizar el servicio.'
      )
    }
  }

  // ======================================================
  // ELIMINAR
  // ======================================================

  async function remove(
    id: string
  ) {
    const confirmed =
      window.confirm(
        '¿Eliminar este servicio? Esta acción no se puede deshacer.'
      )

    if (!confirmed) {
      return
    }

    try {
      const {
        error:
        deleteError,
      } =
        await supabase
          .from(
            'provider_services'
          )
          .delete()
          .eq(
            'id',
            id
          )

      if (
        deleteError
      ) {
        throw deleteError
      }

      await load()
    } catch (
    err: any
    ) {
      setError(
        err?.message ||
        'No se pudo eliminar el servicio.'
      )
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin" />

          Cargando servicios...
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* HEADER */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">
            Prestador
          </p>

          <h1 className="mt-1 text-3xl font-extrabold">
            Mis servicios
          </h1>

          <p className="mt-2 max-w-2xl text-muted-foreground">
            Configura precios,
            capacidad, duración y
            extras. Brasa calculará
            automáticamente el costo
            según el evento del
            cliente.
          </p>
        </div>

        {services.length >
          0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                router.push(
                  '/prestador/disponibilidad'
                )
              }
            >
              Configurar disponibilidad

              <ArrowRight />
            </Button>
          )}
      </div>

      {isGrillProvider && (
        <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex gap-3">
            <Flame className="mt-0.5 size-5 shrink-0 text-primary" />

            <div>
              <p className="font-semibold">
                Configuración especial
                para Parrilleros
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Puedes cobrar por
                persona y ofrecer
                parrilla, traslado,
                gestión de compras y
                un paquete completo
                con descuento.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-5 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-8 xl:grid-cols-[500px_1fr]">
        {/* ==================================================
            NUEVO SERVICIO
        ================================================== */}

        <Card className="self-start">
          <CardHeader>
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Plus />
            </div>

            <CardTitle className="mt-2">
              Nuevo servicio
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={add}
              className="space-y-7"
            >
              {/* INFORMACIÓN BÁSICA */}
              <FormSection
                icon={
                  BriefcaseBusiness
                }
                title="Servicio"
                description="Información principal que verá el cliente."
              >
                <label className="grid gap-1.5 text-sm">
                  Nombre

                  <Input
                    required
                    disabled={
                      busy
                    }
                    value={
                      f.name
                    }
                    placeholder={
                      isGrillProvider
                        ? 'Ej: Parrillero Premium'
                        : 'Ej: Servicio Premium'
                    }
                    onChange={(
                      e
                    ) =>
                      setF({
                        ...f,
                        name:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                </label>

                <label className="grid gap-1.5 text-sm">
                  Descripción

                  <Textarea
                    rows={4}
                    disabled={
                      busy
                    }
                    value={
                      f.description
                    }
                    placeholder="Describe la experiencia y el servicio que entregas."
                    onChange={(
                      e
                    ) =>
                      setF({
                        ...f,
                        description:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                </label>
              </FormSection>

              {/* PRECIO */}
              <FormSection
                icon={
                  DollarIcon
                }
                title="Precio"
                description="El cliente verá el cálculo automáticamente."
              >
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1.5 text-sm">
                    Precio

                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      required
                      disabled={
                        busy
                      }
                      value={
                        f.price
                      }
                      onChange={(
                        e
                      ) =>
                        setF({
                          ...f,
                          price:
                            Number(
                              e
                                .target
                                .value
                            ),
                        })
                      }
                    />
                  </label>

                  <label className="grid gap-1.5 text-sm">
                    Cobro

                    <select
                      className="h-10 rounded-lg border bg-background px-3"
                      value={
                        f.unit
                      }
                      disabled={
                        busy
                      }
                      onChange={(
                        e
                      ) =>
                        setF({
                          ...f,
                          unit:
                            e
                              .target
                              .value,
                        })
                      }
                    >
                      <option value="por persona">
                        Por persona
                      </option>

                      <option value="por evento">
                        Por evento
                      </option>

                      <option value="por hora">
                        Por hora
                      </option>
                    </select>
                  </label>
                </div>

                {f.unit ===
                  'por persona' && (
                    <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                      Ejemplo: para 30
                      invitados, Brasa
                      calculará{' '}
                      <b className="text-foreground">
                        {formatCLP(
                          Number(
                            f.price ||
                            0
                          ) *
                          30
                        )}
                      </b>
                      .
                    </div>
                  )}
              </FormSection>

              {/* CAPACIDAD */}
              <FormSection
                icon={Users}
                title="Capacidad"
                description="Define el rango de invitados que puedes atender."
              >
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1.5 text-sm">
                    Mínimo personas

                    <Input
                      type="number"
                      min={1}
                      value={
                        f.minGuests
                      }
                      onChange={(
                        e
                      ) =>
                        setF({
                          ...f,
                          minGuests:
                            Number(
                              e
                                .target
                                .value
                            ),
                        })
                      }
                    />
                  </label>

                  <label className="grid gap-1.5 text-sm">
                    Máximo personas

                    <Input
                      type="number"
                      min={
                        f.minGuests
                      }
                      value={
                        f.maxGuests
                      }
                      onChange={(
                        e
                      ) =>
                        setF({
                          ...f,
                          maxGuests:
                            Number(
                              e
                                .target
                                .value
                            ),
                        })
                      }
                    />
                  </label>
                </div>
              </FormSection>

              {/* DURACIÓN */}
              <FormSection
                icon={Clock3}
                title="Duración"
                description="Duración incluida y valor de tiempo adicional."
              >
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1.5 text-sm">
                    Horas incluidas

                    <Input
                      type="number"
                      min={0.5}
                      step={0.5}
                      required
                      value={
                        f.durationHours
                      }
                      onChange={(
                        e
                      ) =>
                        setF({
                          ...f,
                          durationHours:
                            Number(
                              e
                                .target
                                .value
                            ),
                        })
                      }
                    />
                  </label>

                  <label className="grid gap-1.5 text-sm">
                    Hora adicional

                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      value={
                        f.extraHourPrice
                      }
                      onChange={(
                        e
                      ) =>
                        setF({
                          ...f,
                          extraHourPrice:
                            Number(
                              e
                                .target
                                .value
                            ),
                        })
                      }
                    />
                  </label>
                </div>
              </FormSection>

              {/* TRASLADO */}
              <FormSection
                icon={Car}
                title="Traslado"
                description="Costo adicional por movilizarte al evento."
              >
                <ToggleRow
                  checked={
                    f.transportAvailable
                  }
                  onChange={(
                    checked
                  ) =>
                    setF({
                      ...f,
                      transportAvailable:
                        checked,
                    })
                  }
                  label="Ofrezco traslado"
                />

                {f.transportAvailable && (
                  <label className="grid gap-1.5 text-sm">
                    Valor traslado

                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      value={
                        f.transportPrice
                      }
                      onChange={(
                        e
                      ) =>
                        setF({
                          ...f,
                          transportPrice:
                            Number(
                              e
                                .target
                                .value
                            ),
                        })
                      }
                    />
                  </label>
                )}
              </FormSection>

              {/* PARRILLERO */}
              {isGrillProvider && (
                <>
                  <FormSection
                    icon={Flame}
                    title="Parrilla"
                    description="Permite al cliente contratar tu equipamiento."
                  >
                    <ToggleRow
                      checked={
                        f.grillAvailable
                      }
                      onChange={(
                        checked
                      ) =>
                        setF({
                          ...f,
                          grillAvailable:
                            checked,
                        })
                      }
                      label="Puedo llevar la parrilla"
                    />

                    {f.grillAvailable && (
                      <label className="grid gap-1.5 text-sm">
                        Valor por llevar parrilla

                        <Input
                          type="number"
                          min={0}
                          step={1000}
                          value={
                            f.grillPrice
                          }
                          onChange={(
                            e
                          ) =>
                            setF({
                              ...f,
                              grillPrice:
                                Number(
                                  e
                                    .target
                                    .value
                                ),
                            })
                          }
                        />
                      </label>
                    )}
                  </FormSection>

                  <FormSection
                    icon={
                      ShoppingCart
                    }
                    title="Gestión de compras"
                    description="Puedes comprar carnes, carbón y otros productos por el cliente."
                  >
                    <ToggleRow
                      checked={
                        f.shoppingAvailable
                      }
                      onChange={(
                        checked
                      ) =>
                        setF({
                          ...f,
                          shoppingAvailable:
                            checked,
                        })
                      }
                      label="Ofrezco hacer las compras"
                    />

                    {f.shoppingAvailable && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="grid gap-1.5 text-sm">
                            Cobro por compras

                            <select
                              className="h-10 rounded-lg border bg-background px-3"
                              value={
                                f.shoppingFeeType
                              }
                              onChange={(
                                e
                              ) =>
                                setF({
                                  ...f,
                                  shoppingFeeType:
                                    e
                                      .target
                                      .value as
                                    | 'fixed'
                                    | 'percentage',
                                })
                              }
                            >
                              <option value="fixed">
                                Monto fijo
                              </option>

                              <option value="percentage">
                                % de compra
                              </option>
                            </select>
                          </label>

                          <label className="grid gap-1.5 text-sm">
                            {f.shoppingFeeType ===
                              'percentage'
                              ? 'Porcentaje'
                              : 'Valor'}

                            <Input
                              type="number"
                              min={0}
                              max={
                                f.shoppingFeeType ===
                                  'percentage'
                                  ? 100
                                  : undefined
                              }
                              value={
                                f.shoppingFee
                              }
                              onChange={(
                                e
                              ) =>
                                setF({
                                  ...f,
                                  shoppingFee:
                                    Number(
                                      e
                                        .target
                                        .value
                                    ),
                                })
                              }
                            />
                          </label>
                        </div>

                        <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
                          El costo de
                          carnes,
                          bebestibles,
                          carbón, hielo,
                          etc. se
                          mostrará
                          separado del
                          valor de tu
                          servicio.
                        </div>
                      </>
                    )}
                  </FormSection>

                  <FormSection
                    icon={
                      BadgePercent
                    }
                    title="Paquete Full Brasa"
                    description="Premia al cliente que contrata todo contigo."
                  >
                    <ToggleRow
                      checked={
                        f.fullPackageEnabled
                      }
                      onChange={(
                        checked
                      ) =>
                        setF({
                          ...f,
                          fullPackageEnabled:
                            checked,
                        })
                      }
                      label="Ofrecer paquete completo"
                    />

                    {f.fullPackageEnabled && (
                      <div className="grid grid-cols-2 gap-3">
                        <label className="grid gap-1.5 text-sm">
                          Tipo descuento

                          <select
                            className="h-10 rounded-lg border bg-background px-3"
                            value={
                              f.fullPackageDiscountType
                            }
                            onChange={(
                              e
                            ) =>
                              setF({
                                ...f,
                                fullPackageDiscountType:
                                  e
                                    .target
                                    .value as
                                  | 'percentage'
                                  | 'fixed',
                              })
                            }
                          >
                            <option value="percentage">
                              Porcentaje
                            </option>

                            <option value="fixed">
                              Monto fijo
                            </option>
                          </select>
                        </label>

                        <label className="grid gap-1.5 text-sm">
                          {f.fullPackageDiscountType ===
                            'percentage'
                            ? 'Descuento %'
                            : 'Descuento $'}

                          <Input
                            type="number"
                            min={0}
                            max={
                              f.fullPackageDiscountType ===
                                'percentage'
                                ? 100
                                : undefined
                            }
                            value={
                              f.fullPackageDiscount
                            }
                            onChange={(
                              e
                            ) =>
                              setF({
                                ...f,
                                fullPackageDiscount:
                                  Number(
                                    e
                                      .target
                                      .value
                                  ),
                              })
                            }
                          />
                        </label>
                      </div>
                    )}
                  </FormSection>
                </>
              )}

              {/* INCLUYE / NO INCLUYE */}
              <FormSection
                icon={Package}
                title="Incluye / No incluye"
                description="Escribe un elemento por línea."
              >
                <label className="grid gap-1.5 text-sm">
                  Incluye

                  <Textarea
                    rows={4}
                    value={
                      f.includesText
                    }
                    onChange={(
                      e
                    ) =>
                      setF({
                        ...f,
                        includesText:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                </label>

                <label className="grid gap-1.5 text-sm">
                  No incluye

                  <Textarea
                    rows={4}
                    value={
                      f.excludesText
                    }
                    onChange={(
                      e
                    ) =>
                      setF({
                        ...f,
                        excludesText:
                          e
                            .target
                            .value,
                      })
                    }
                  />
                </label>
              </FormSection>

              <Button
                type="submit"
                className="h-11 w-full"
                disabled={busy}
              >
                {busy ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Plus />
                )}

                {busy
                  ? 'Guardando...'
                  : 'Publicar servicio'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ==================================================
            SERVICIOS PUBLICADOS
        ================================================== */}

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>
                Servicios publicados
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {services.map(
                (
                  service
                ) => (
                  <ServiceCard
                    key={
                      service.id
                    }
                    service={
                      service
                    }
                    onToggle={() =>
                      toggle(
                        service
                      )
                    }
                    onRemove={() =>
                      remove(
                        service.id
                      )
                    }
                  />
                )
              )}

              {services.length ===
                0 && (
                  <div className="py-12 text-center">
                    <BriefcaseBusiness className="mx-auto size-9 text-muted-foreground/50" />

                    <p className="mt-3 font-medium">
                      Aún no tienes
                      servicios
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Crea tu primer
                      servicio para
                      comenzar a recibir
                      solicitudes.
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ==========================================================
// SERVICE CARD
// ==========================================================

function ServiceCard({
  service,
  onToggle,
  onRemove,
}: {
  service: ProviderService
  onToggle: () => void
  onRemove: () => void
}) {
  const min =
    service.min_guests ||
    1

  const examplePeople =
    Math.max(
      30,
      min
    )

  const baseExample =
    service.unit
      ?.toLowerCase()
      .includes(
        'persona'
      )
      ? service.price *
      examplePeople
      : service.price

  return (
    <div className="rounded-2xl border p-5 transition hover:bg-muted/20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">
              {
                service.name
              }
            </h3>

            <span
              className={`rounded-full px-2 py-0.5 text-[10px] ${service.active
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
                }`}
            >
              {service.active
                ? 'Activo'
                : 'Pausado'}
            </span>
          </div>

          {service.description && (
            <p className="mt-2 text-sm text-muted-foreground">
              {
                service.description
              }
            </p>
          )}

          <div className="mt-4">
            <span className="text-2xl font-extrabold">
              {formatCLP(
                service.price
              )}
            </span>

            <span className="ml-1 text-sm text-muted-foreground">
              {
                service.unit
              }
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {service.min_guests && (
              <SmallBadge>
                Min.{' '}
                {
                  service.min_guests
                }{' '}
                personas
              </SmallBadge>
            )}

            {service.max_guests && (
              <SmallBadge>
                Máx.{' '}
                {
                  service.max_guests
                }{' '}
                personas
              </SmallBadge>
            )}

            {service.duration_hours && (
              <SmallBadge>
                {
                  service.duration_hours
                }{' '}
                horas
              </SmallBadge>
            )}

            {service.grill_available && (
              <SmallBadge>
                Parrilla{' '}
                {formatCLP(
                  service.grill_price ||
                  0
                )}
              </SmallBadge>
            )}

            {service.transport_available && (
              <SmallBadge>
                Traslado{' '}
                {formatCLP(
                  service.transport_price ||
                  0
                )}
              </SmallBadge>
            )}

            {service.shopping_available && (
              <SmallBadge>
                Gestión compras
              </SmallBadge>
            )}
          </div>

          {service.unit
            ?.toLowerCase()
            .includes(
              'persona'
            ) && (
              <div className="mt-4 rounded-xl bg-muted/50 p-3 text-sm">
                Ejemplo para{' '}
                {
                  examplePeople
                }{' '}
                personas:{' '}

                <b>
                  {formatCLP(
                    baseExample
                  )}
                </b>
              </div>
            )}

          {service.full_package_enabled && (
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <BadgePercent className="size-4" />

                Paquete Full Brasa
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                Descuento:{' '}
                {service.full_package_discount_type ===
                  'percentage'
                  ? `${service.full_package_discount}%`
                  : formatCLP(
                    service.full_package_discount ||
                    0
                  )}
              </p>
            </div>
          )}

          {(service.includes?.length ||
            service.excludes?.length) && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {!!service.includes
                  ?.length && (
                    <div>
                      <p className="text-xs font-semibold">
                        Incluye
                      </p>

                      <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                        {service.includes.map(
                          (
                            item
                          ) => (
                            <li
                              key={
                                item
                              }
                            >
                              ✓{' '}
                              {
                                item
                              }
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                {!!service.excludes
                  ?.length && (
                    <div>
                      <p className="text-xs font-semibold">
                        No incluye
                      </p>

                      <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                        {service.excludes.map(
                          (
                            item
                          ) => (
                            <li
                              key={
                                item
                              }
                            >
                              •{' '}
                              {
                                item
                              }
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
              </div>
            )}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            title={
              service.active
                ? 'Pausar'
                : 'Activar'
            }
            onClick={
              onToggle
            }
          >
            <Power />
          </Button>

          <Button
            type="button"
            size="icon"
            variant="destructive"
            title="Eliminar"
            onClick={
              onRemove
            }
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ==========================================================
// UI HELPERS
// ==========================================================

function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: any
  title: string
  description?: string
  children:
  React.ReactNode
}) {
  return (
    <section className="space-y-4 border-b pb-6 last:border-b-0 last:pb-0">
      <div className="flex gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4" />
        </div>

        <div>
          <h3 className="font-semibold">
            {title}
          </h3>

          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {
                description
              }
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {children}
      </div>
    </section>
  )
}

function ToggleRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (
    checked: boolean
  ) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-3">
      <span className="text-sm font-medium">
        {label}
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) =>
          onChange(
            e.target.checked
          )
        }
        className="size-4 accent-primary"
      />
    </label>
  )
}

function SmallBadge({
  children,
}: {
  children:
  React.ReactNode
}) {
  return (
    <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
      {children}
    </span>
  )
}

function DollarIcon({
  className,
}: {
  className?: string
}) {
  return (
    <span
      className={
        className
      }
    >
      $
    </span>
  )
}

function linesToArray(
  value: string
) {
  return value
    .split('\n')
    .map(
      (line) =>
        line.trim()
    )
    .filter(Boolean)
}