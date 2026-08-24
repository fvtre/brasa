"use client"

import {
  Check,
  Plus,
  Star,
  CalendarCheck2,
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
  } = useEvent()

  const hasAvailability =
    provider.availableDays.length > 0

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
      {hasAvailability && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
          <CalendarCheck2 className="size-4" />

          Este prestador tiene fechas disponibles.
        </div>
      )}

      {provider.services.map(
        (service) => {
          const selected = has(
            service.id,
            provider.id
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

                  {/* INDICADORES DE EXTRAS */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {service.grill_available && (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                        Parrilla disponible
                      </span>
                    )}

                    {service.transport_available && (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                        Traslado
                      </span>
                    )}

                    {service.shopping_available && (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                        Gestión de compras
                      </span>
                    )}

                    {service.full_package_enabled && (
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                        Full Brasa
                      </span>
                    )}
                  </div>
                </div>

                {/* BOTÓN */}
                <button
                  type="button"
                  onClick={() => {
                    if (selected) {
                      removeSelection(
                        service.id,
                        provider.id
                      )

                      return
                    }

                    addSelection({
                      // =================================
                      // PRESTADOR
                      // =================================
                      providerId:
                        provider.id,

                      providerName:
                        provider.name,

                      category:
                        provider.category,

                      // =================================
                      // SERVICIO
                      // =================================
                      serviceId:
                        service.id,

                      serviceName:
                        service.name,

                      price:
                        Number(
                          service.price ||
                            0
                        ),

                      unit:
                        service.unit,

                      // =================================
                      // PRECIO ORIGINAL
                      // =================================
                      baseUnitPrice:
                        Number(
                          service.price ||
                            0
                        ),

                      originalUnit:
                        service.unit,

                      // =================================
                      // PARRILLA
                      // =================================
                      grillAvailable:
                        !!service.grill_available,

                      grillPrice:
                        Number(
                          service.grill_price ||
                            0
                        ),

                      wantsGrill:
                        false,

                      // =================================
                      // TRASLADO
                      // =================================
                      transportAvailable:
                        !!service.transport_available,

                      transportPrice:
                        Number(
                          service.transport_price ||
                            0
                        ),

                      wantsTransport:
                        false,

                      // =================================
                      // COMPRAS
                      // =================================
                      shoppingAvailable:
                        !!service.shopping_available,

                      shoppingFeeType:
                        service.shopping_fee_type ||
                        "fixed",

                      shoppingFee:
                        Number(
                          service.shopping_fee ||
                            0
                        ),

                      wantsShopping:
                        false,

                      // =================================
                      // FULL BRASA
                      // =================================
                      fullPackageEnabled:
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
                      : "border border-border bg-background text-foreground hover:border-primary hover:bg-primary/5"
                  )}
                  aria-pressed={
                    selected
                  }
                >
                  {selected ? (
                    <Check size={16} />
                  ) : (
                    <Plus size={16} />
                  )}

                  {selected
                    ? "Agregado"
                    : "Agregar"}
                </button>
              </div>
            </div>
          )
        }
      )}
    </div>
  )
}