"use client"

import { useState } from "react"
import {
  Check,
  Minus,
  Plus,
  Star,
  CalendarCheck2,
  MapPin,
} from "lucide-react"

import type { Provider } from "@/lib/types"
import { formatCLP } from "@/lib/format"
import { useEvent } from "@/components/event-provider"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function ServiceSelector({
  provider,
}: {
  provider: Provider
}) {
  const {
    addSelection,
    removeSelection,
    has,
    comuna,
  } = useEvent()

  /*
   * Cantidades elegidas para servicios
   * que cobran "por unidad".
   *
   * Se guarda por service.id para poder tener
   * varios servicios distintos en pantalla.
   */
  const [quantities, setQuantities] =
    useState<Record<string, number>>({})

  const hasAvailability =
    provider.availableDays.length > 0

  const effectiveCoverage =
    provider.coverage.length > 0
      ? provider.coverage
      : [provider.comuna].filter(Boolean)

  const normalizedEventComuna =
    comuna?.trim().toLocaleLowerCase("es-CL")

  const coversEventComuna =
    !normalizedEventComuna ||
    effectiveCoverage.some(
      coveredComuna =>
        coveredComuna
          .trim()
          .toLocaleLowerCase("es-CL") ===
        normalizedEventComuna
    ) ||
    provider.comuna
      .trim()
      .toLocaleLowerCase("es-CL") ===
      normalizedEventComuna

  const getQuantity = (
    serviceId: string
  ) => {
    return Math.max(
      1,
      quantities[serviceId] ?? 1
    )
  }

  const setServiceQuantity = (
    serviceId: string,
    quantity: number
  ) => {
    setQuantities((current) => ({
      ...current,
      [serviceId]: Math.max(
        1,
        Math.floor(quantity)
      ),
    }))
  }

  if (provider.services.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center">
        <p className="font-medium">
          Sin servicios disponibles
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          Este prestador todavía no ha publicado servicios.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "rounded-lg border px-3 py-3 text-sm",
          coversEventComuna
            ? "border-border bg-muted/40"
            : "border-destructive/40 bg-destructive/5 text-destructive"
        )}
      >
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              Cobertura del servicio
            </p>
            <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Proviene de {provider.comuna}
            </p>
            {!coversEventComuna && comuna && (
              <p className="mt-2 text-xs font-medium text-destructive">
                Este prestador no tiene cobertura en {comuna}.
              </p>
            )}
            <details className="mt-2 text-xs text-muted-foreground">
              <summary className="w-fit cursor-pointer font-medium text-foreground hover:text-primary">
                Servicio disponible en {effectiveCoverage.length}{" "}
                {effectiveCoverage.length === 1
                  ? "comuna"
                  : "comunas"}
              </summary>
              <div className="mt-2 grid max-h-32 grid-cols-2 gap-x-3 gap-y-1 overflow-y-auto rounded-md border border-border/70 bg-background/60 p-2">
                {effectiveCoverage.map(coveredComuna => (
                  <span key={coveredComuna}>
                    {coveredComuna}
                  </span>
                ))}
              </div>
            </details>
          </div>
        </div>
      </div>

      {hasAvailability && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
          <CalendarCheck2 className="size-4" />

          Este prestador tiene fechas disponibles.
        </div>
      )}

      {provider.services.map((service) => {
        const selected = has(
          service.id,
          provider.id
        )

        const normalizedUnit =
          String(service.unit || "")
            .trim()
            .toLowerCase()

        const isPerUnit =
          normalizedUnit === "por unidad"

        const isGrillService =
          service.category_slug ===
          "parrilleros"

        const quantity =
          getQuantity(service.id)

        const estimatedSubtotal =
          Math.round(
            Number(service.price || 0) *
              quantity
          )

        return (
          <div
            key={service.id}
            className={cn(
              "rounded-xl border p-4 transition-all",
              selected
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card hover:border-primary/30"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                {/* NOMBRE */}

                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold">
                    {service.name}
                  </h4>

                  {service.popular && (
                    <Badge
                      variant="secondary"
                      className="gap-1"
                    >
                      <Star
                        size={11}
                        className="fill-primary text-primary"
                      />

                      Popular
                    </Badge>
                  )}

                  {selected && (
                    <Badge className="gap-1">
                      <Check size={11} />

                      En tu evento
                    </Badge>
                  )}
                </div>

                {/* DESCRIPCIÓN */}

                {service.description && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {service.description}
                  </p>
                )}

                {/* PRECIO */}

                <div className="mt-3">
                  <span className="text-lg font-bold text-foreground">
                    {formatCLP(
                      service.price
                    )}
                  </span>

                  <span className="ml-1 text-sm text-muted-foreground">
                    {service.unit}
                  </span>
                </div>

                {/* CANTIDAD POR UNIDAD */}

                {isPerUnit && (
                  <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          Cantidad
                        </p>

                        <p className="text-xs text-muted-foreground">
                          Indica cuántas unidades necesitas.
                        </p>
                      </div>

                      <div className="flex items-center rounded-lg border border-border bg-background">
                        <button
                          type="button"
                          onClick={() =>
                            setServiceQuantity(
                              service.id,
                              quantity - 1
                            )
                          }
                          disabled={
                            quantity <= 1 ||
                            selected
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-l-lg transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Disminuir cantidad"
                        >
                          <Minus size={15} />
                        </button>

                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={quantity}
                          disabled={selected}
                          onChange={(event) =>
                            setServiceQuantity(
                              service.id,
                              Number(
                                event.target.value
                              ) || 1
                            )
                          }
                          className="h-9 w-16 border-x border-border bg-transparent text-center text-sm font-semibold outline-none disabled:opacity-60"
                          aria-label="Cantidad"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setServiceQuantity(
                              service.id,
                              quantity + 1
                            )
                          }
                          disabled={selected}
                          className="flex h-9 w-9 items-center justify-center rounded-r-lg transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Aumentar cantidad"
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                      <span className="text-xs text-muted-foreground">
                        {formatCLP(
                          service.price
                        )}{" "}
                        × {quantity}{" "}
                        {quantity === 1
                          ? "unidad"
                          : "unidades"}
                      </span>

                      <span className="text-sm font-semibold">
                        {formatCLP(
                          estimatedSubtotal
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* CAPACIDAD */}

                {(service.min_guests ||
                  service.max_guests) && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {service.min_guests
                      ? `Mínimo ${service.min_guests} personas`
                      : ""}

                    {service.min_guests &&
                    service.max_guests
                      ? " · "
                      : ""}

                    {service.max_guests
                      ? `Máximo ${service.max_guests} personas`
                      : ""}
                  </p>
                )}

                {/* EXTRAS */}

                <div className="mt-3 flex flex-wrap gap-2">
                  {isGrillService && service.grill_available && (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                      Parrilla disponible
                    </span>
                  )}

                  {service.transport_available && (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                      Traslado
                    </span>
                  )}

                  {isGrillService && service.shopping_available && (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                      Gestión de compras
                    </span>
                  )}

                  {isGrillService && service.full_package_enabled && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                      Full Brasa
                    </span>
                  )}
                </div>
              </div>

              {/* BOTÓN */}

              <button
                type="button"
                disabled={!selected && !coversEventComuna}
                onClick={() => {
                  if (selected) {
                    removeSelection(
                      service.id,
                      provider.id
                    )

                    return
                  }

                  addSelection({
                    // PRESTADOR
                    providerId:
                      provider.id,

                    providerName:
                      provider.name,

                    category:
                      service.category_slug,

                    // SERVICIO
                    serviceId:
                      service.id,

                    serviceName:
                      service.name,

                    price:
                      Number(
                        service.price || 0
                      ),

                    unit:
                      service.unit,

                    /*
                     * Solo es relevante para
                     * servicios "por unidad".
                     */
                    quantity:
                      isPerUnit
                        ? quantity
                        : undefined,

                    // PRECIO ORIGINAL
                    baseUnitPrice:
                      Number(
                        service.price || 0
                      ),

                    originalUnit:
                      service.unit,

                    // PARRILLA
                    grillAvailable:
                      isGrillService &&
                      !!service.grill_available,

                    grillPrice:
                      Number(
                        service.grill_price || 0
                      ),

                    wantsGrill:
                      false,

                    // TRASLADO
                    transportAvailable:
                      !!service.transport_available,

                    transportPrice:
                      Number(
                        service.transport_price ||
                          0
                      ),

                    wantsTransport:
                      false,

                    // COMPRAS
                    shoppingAvailable:
                      isGrillService &&
                      !!service.shopping_available,

                    shoppingFeeType:
                      service.shopping_fee_type ||
                      "fixed",

                    shoppingFee:
                      Number(
                        service.shopping_fee || 0
                      ),

                    wantsShopping:
                      false,

                    // FULL BRASA
                    fullPackageEnabled:
                      isGrillService &&
                      !!service.full_package_enabled,

                    fullPackageDiscountType:
                      service.full_package_discount_type ||
                      "percentage",

                    fullPackageDiscount:
                      Number(
                        service.full_package_discount ||
                          0
                      ),

                    fullPackage:
                      false,
                  })
                }}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-all",
                  selected
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : coversEventComuna
                      ? "border border-border bg-background text-foreground hover:border-primary hover:bg-primary/5"
                      : "cursor-not-allowed border border-border bg-muted text-muted-foreground opacity-60"
                )}
                aria-pressed={selected}
              >
                {selected ? (
                  <Check size={16} />
                ) : (
                  <Plus size={16} />
                )}

                {selected
                  ? "Agregado"
                  : coversEventComuna
                    ? "Agregar"
                    : "Sin cobertura"}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
