"use client"

import * as React from "react"
import Link from "next/link"

import {
  ArrowRight,
  CalendarHeart,
  Check,
  Flame,
  Package,
  PartyPopper,
  ShoppingCart,
  Sparkles,
  Trash2,
  Truck,
  Users,
  Wallet,
} from "lucide-react"

import { useEvent } from "@/components/event-provider"
import { getCategory } from "@/lib/catalog"
import { formatCLP } from "@/lib/format"
import { CategoryIcon } from "@/components/category-icon"
import type { CategorySlug } from "@/lib/types"
import { cn } from "@/lib/utils"

export function EventTracker() {
  const {
    selections,
    total,
    budget,
    setBudget,
    guests,
    setGuests,
    removeSelection,
    updateSelection,
    clear,
    selectionTotal,
  } = useEvent()

  const grouped = React.useMemo(() => {
    const map =
      new Map<
        CategorySlug,
        typeof selections
      >()

    for (const selection of selections) {
      const list =
        map.get(selection.category) ?? []

      list.push(selection)

      map.set(
        selection.category,
        list
      )
    }

    return Array.from(
      map.entries()
    )
  }, [selections])

  const usedPct =
    budget > 0
      ? Math.min(
          100,
          Math.round(
            (total / budget) * 100
          )
        )
      : 0

  const remaining =
    budget - total

  const overBudget =
    remaining < 0

  const perGuest =
    guests > 0
      ? total / guests
      : 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* =====================================
          HEADER
      ====================================== */}

      <div className="flex items-center gap-2 text-sm text-primary">
        <PartyPopper size={16} />

        <span className="font-semibold">
          Mi evento
        </span>
      </div>

      <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
        Arma y controla tu presupuesto
      </h1>

      <p className="mt-2 max-w-2xl text-muted-foreground">
        Define tus invitados y personaliza
        cada servicio con los extras que
        necesitas para tu evento.
      </p>

      {/* =====================================
          LAYOUT
      ====================================== */}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">

        {/* ===================================
            SERVICIOS
        ==================================== */}

        <div>
          {selections.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-6">

              {grouped.map(
                ([slug, items]) => {
                  const category =
                    getCategory(slug)

                  if (!category) {
                    return null
                  }

                  return (
                    <section key={slug}>

                      {/* CATEGORY HEADER */}

                      <div className="mb-3 flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <CategoryIcon
                            name={
                              category.icon
                            }
                            size={16}
                          />
                        </span>

                        <h2 className="font-bold">
                          {category.name}
                        </h2>
                      </div>

                      {/* SERVICES */}

                      <div className="space-y-4">
                        {items.map(
                          (selection) => {
                            const unit =
                              (
                                selection.originalUnit ||
                                selection.unit ||
                                ""
                              ).toLowerCase()

                            const isPerPerson =
                              unit.includes(
                                "persona"
                              )

                            const unitPrice =
                              Number(
                                selection.baseUnitPrice ??
                                  selection.price ??
                                  0
                              )

                            const baseTotal =
                              isPerPerson
                                ? unitPrice *
                                  guests
                                : Number(
                                    selection.basePrice ??
                                      selection.price ??
                                      0
                                  )

                            const hasExtras =
                              selection.grillAvailable ||
                              selection.transportAvailable ||
                              selection.shoppingAvailable ||
                              selection.fullPackageEnabled

                            return (
                              <div
                                key={`${selection.providerId}-${selection.serviceId}`}
                                className="overflow-hidden rounded-2xl border border-border bg-card"
                              >
                                {/* =========================
                                    SERVICE HEADER
                                ========================== */}

                                <div className="flex items-start justify-between gap-4 p-5">
                                  <div className="min-w-0">
                                    <Link
                                      href={`/proveedores/${selection.providerId}`}
                                      className="font-bold hover:text-primary"
                                    >
                                      {
                                        selection.providerName
                                      }
                                    </Link>

                                    <p className="mt-1 font-medium">
                                      {
                                        selection.serviceName
                                      }
                                    </p>

                                    {isPerPerson ? (
                                      <p className="mt-1 text-sm text-muted-foreground">
                                        {formatCLP(
                                          unitPrice
                                        )}{" "}
                                        ×{" "}
                                        {guests}{" "}
                                        personas
                                      </p>
                                    ) : (
                                      <p className="mt-1 text-sm text-muted-foreground">
                                        {
                                          selection.unit
                                        }
                                      </p>
                                    )}

                                    <p className="mt-2 text-sm">
                                      Servicio base:{" "}
                                      <span className="font-semibold">
                                        {formatCLP(
                                          baseTotal
                                        )}
                                      </span>
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeSelection(
                                        selection.serviceId,
                                        selection.providerId
                                      )
                                    }
                                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                    aria-label={`Quitar ${selection.serviceName}`}
                                  >
                                    <Trash2
                                      size={
                                        17
                                      }
                                    />
                                  </button>
                                </div>

                                {/* =========================
                                    EXTRAS
                                ========================== */}

                                {hasExtras && (
                                  <div className="border-t border-border bg-muted/20 p-5">

                                    <div>
                                      <p className="font-semibold">
                                        Personaliza
                                        tu servicio
                                      </p>

                                      <p className="mt-1 text-sm text-muted-foreground">
                                        Agrega solo
                                        lo que
                                        necesitas.
                                      </p>
                                    </div>

                                    <div className="mt-4 space-y-2">

                                      {/* PARRILLA */}

                                      {selection.grillAvailable && (
                                        <OptionRow
                                          icon={
                                            Flame
                                          }
                                          title="Llevar parrilla"
                                          description="El prestador lleva su propia parrilla."
                                          price={
                                            selection.grillPrice ||
                                            0
                                          }
                                          checked={
                                            !!selection.wantsGrill ||
                                            !!selection.fullPackage
                                          }
                                          disabled={
                                            !!selection.fullPackage
                                          }
                                          onClick={() =>
                                            updateSelection(
                                              selection.serviceId,
                                              selection.providerId,
                                              {
                                                wantsGrill:
                                                  !selection.wantsGrill,
                                              }
                                            )
                                          }
                                        />
                                      )}

                                      {/* TRASLADO */}

                                      {selection.transportAvailable && (
                                        <OptionRow
                                          icon={
                                            Truck
                                          }
                                          title="Traslado"
                                          description="Traslado del prestador y equipamiento."
                                          price={
                                            selection.transportPrice ||
                                            0
                                          }
                                          checked={
                                            !!selection.wantsTransport ||
                                            !!selection.fullPackage
                                          }
                                          disabled={
                                            !!selection.fullPackage
                                          }
                                          onClick={() =>
                                            updateSelection(
                                              selection.serviceId,
                                              selection.providerId,
                                              {
                                                wantsTransport:
                                                  !selection.wantsTransport,
                                              }
                                            )
                                          }
                                        />
                                      )}

                                      {/* COMPRAS */}

                                      {selection.shoppingAvailable && (
                                        <OptionRow
                                          icon={
                                            ShoppingCart
                                          }
                                          title="Gestión de compras"
                                          description={
                                            selection.shoppingFeeType ===
                                            "percentage"
                                              ? `El prestador realiza las compras. Comisión: ${selection.shoppingFee || 0}%.`
                                              : "El prestador se encarga de realizar las compras."
                                          }
                                          price={
                                            selection.shoppingFeeType ===
                                            "fixed"
                                              ? selection.shoppingFee ||
                                                0
                                              : undefined
                                          }
                                          checked={
                                            !!selection.wantsShopping ||
                                            !!selection.fullPackage
                                          }
                                          disabled={
                                            !!selection.fullPackage
                                          }
                                          onClick={() =>
                                            updateSelection(
                                              selection.serviceId,
                                              selection.providerId,
                                              {
                                                wantsShopping:
                                                  !selection.wantsShopping,
                                              }
                                            )
                                          }
                                        />
                                      )}
                                    </div>

                                    {/* =====================
                                        FULL BRASA
                                    ====================== */}

                                    {selection.fullPackageEnabled && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const activate =
                                            !selection.fullPackage

                                          updateSelection(
                                            selection.serviceId,
                                            selection.providerId,
                                            {
                                              fullPackage:
                                                activate,

                                              wantsGrill:
                                                activate &&
                                                !!selection.grillAvailable,

                                              wantsTransport:
                                                activate &&
                                                !!selection.transportAvailable,

                                              wantsShopping:
                                                activate &&
                                                !!selection.shoppingAvailable,
                                            }
                                          )
                                        }}
                                        className={cn(
                                          "mt-4 w-full rounded-xl border p-4 text-left transition-all",
                                          selection.fullPackage
                                            ? "border-primary bg-primary/10 shadow-sm"
                                            : "border-primary/30 bg-background hover:border-primary"
                                        )}
                                      >
                                        <div className="flex items-start gap-3">
                                          <span
                                            className={cn(
                                              "flex size-9 shrink-0 items-center justify-center rounded-lg",
                                              selection.fullPackage
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-primary/10 text-primary"
                                            )}
                                          >
                                            <Flame
                                              size={
                                                18
                                              }
                                            />
                                          </span>

                                          <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span className="font-bold">
                                                Full
                                                Brasa
                                              </span>

                                              <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                                                Recomendado
                                              </span>
                                            </div>

                                            <p className="mt-1 text-sm text-muted-foreground">
                                              Activa
                                              todos
                                              los
                                              extras
                                              disponibles
                                              con
                                              descuento.
                                            </p>

                                            <p className="mt-2 text-sm font-semibold text-primary">
                                              {selection.fullPackageDiscountType ===
                                              "fixed"
                                                ? `${formatCLP(
                                                    selection.fullPackageDiscount ||
                                                      0
                                                  )} de descuento`
                                                : `${selection.fullPackageDiscount || 0}% de descuento`}
                                            </p>
                                          </div>

                                          <span
                                            className={cn(
                                              "flex size-6 shrink-0 items-center justify-center rounded-full border",
                                              selection.fullPackage
                                                ? "border-primary bg-primary text-primary-foreground"
                                                : "border-border"
                                            )}
                                          >
                                            {selection.fullPackage && (
                                              <Check
                                                size={
                                                  14
                                                }
                                              />
                                            )}
                                          </span>
                                        </div>
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* =========================
                                    TOTAL SERVICIO
                                ========================== */}

                                <div className="flex items-center justify-between border-t border-border px-5 py-4">
                                  <span className="text-sm text-muted-foreground">
                                    Total
                                    servicio
                                  </span>

                                  <span className="text-xl font-extrabold">
                                    {formatCLP(
                                      selectionTotal(
                                        selection
                                      )
                                    )}
                                  </span>
                                </div>
                              </div>
                            )
                          }
                        )}
                      </div>
                    </section>
                  )
                }
              )}

              <button
                type="button"
                onClick={
                  clear
                }
                className="text-sm text-muted-foreground underline-offset-4 hover:text-destructive hover:underline"
              >
                Vaciar mi evento
              </button>
            </div>
          )}
        </div>

        {/* ===================================
            PANEL PRESUPUESTO
        ==================================== */}

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-border bg-muted/30 p-5">

            <h2 className="text-lg font-bold">
              Presupuesto
            </h2>

            <div className="mt-4 space-y-4">

              {/* INVITADOS */}

              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-sm text-muted-foreground">
                  <Users
                    size={
                      15
                    }
                  />
                  Invitados
                </span>

                <input
                  type="number"
                  min={
                    1
                  }
                  value={
                    guests
                  }
                  onChange={(
                    event
                  ) =>
                    setGuests(
                      Math.max(
                        1,
                        Number(
                          event
                            .target
                            .value
                        ) ||
                          1
                      )
                    )
                  }
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />

                <p className="mt-1 text-xs text-muted-foreground">
                  Los
                  servicios
                  por
                  persona
                  se
                  recalculan
                  automáticamente.
                </p>
              </label>

              {/* PRESUPUESTO */}

              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-sm text-muted-foreground">
                  <Wallet
                    size={
                      15
                    }
                  />
                  Presupuesto
                  (CLP)
                </span>

                <input
                  type="number"
                  min={
                    0
                  }
                  step={
                    10000
                  }
                  value={
                    budget
                  }
                  onChange={(
                    event
                  ) =>
                    setBudget(
                      Math.max(
                        0,
                        Number(
                          event
                            .target
                            .value
                        ) ||
                          0
                      )
                    )
                  }
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            </div>

            {/* BARRA */}

            <div className="mt-5">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    overBudget
                      ? "bg-destructive"
                      : "bg-primary"
                  )}
                  style={{
                    width: `${usedPct}%`,
                  }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Gastado:{" "}
                  {formatCLP(
                    total
                  )}
                </span>

                <span>
                  {
                    usedPct
                  }
                  %
                </span>
              </div>
            </div>

            {/* RESUMEN */}

            <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">

              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">
                  Servicios
                </dt>

                <dd className="font-semibold">
                  {
                    selections.length
                  }
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">
                  Invitados
                </dt>

                <dd className="font-semibold">
                  {
                    guests
                  }
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">
                  Costo por
                  invitado
                </dt>

                <dd className="font-semibold">
                  {formatCLP(
                    perGuest
                  )}
                </dd>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-2">
                <dt className="font-semibold">
                  Total
                </dt>

                <dd className="text-lg font-extrabold">
                  {formatCLP(
                    total
                  )}
                </dd>
              </div>
            </dl>

            {/* DISPONIBLE */}

            <div
              className={cn(
                "mt-4 rounded-xl border p-3 text-sm",
                overBudget
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-primary/30 bg-primary/10 text-foreground"
              )}
            >
              {overBudget ? (
                <span>
                  Te
                  excedes
                  por{" "}
                  {formatCLP(
                    Math.abs(
                      remaining
                    )
                  )}
                  .
                </span>
              ) : (
                <span>
                  Disponible:{" "}
                  {formatCLP(
                    remaining
                  )}{" "}
                  de{" "}
                  {formatCLP(
                    budget
                  )}
                  .
                </span>
              )}
            </div>

            {/* CHECKOUT */}

            {selections.length >
              0 && (
              <Link
                href="/checkout"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
              >
                Reservar
                evento

                <ArrowRight
                  size={
                    16
                  }
                />
              </Link>
            )}

            <Link
              href="/proveedores"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
            >
              Seguir
              agregando

              <ArrowRight
                size={
                  16
                }
              />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}

/* =========================================================
   OPCIÓN EXTRA
========================================================= */

function OptionRow({
  icon: Icon,
  title,
  description,
  price,
  checked,
  disabled,
  onClick,
}: {
  icon: React.ElementType
  title: string
  description: string
  price?: number
  checked: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={
        disabled
      }
      onClick={
        onClick
      }
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
        checked
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-background hover:border-primary/40",
        disabled &&
          "cursor-default opacity-80"
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          checked
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        <Icon
          size={
            17
          }
        />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {
            title
          }
        </p>

        <p className="mt-0.5 text-xs text-muted-foreground">
          {
            description
          }
        </p>
      </div>

      {price !==
        undefined &&
        price >
          0 && (
          <span className="shrink-0 text-sm font-semibold">
            +
            {formatCLP(
              price
            )}
          </span>
        )}

      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded border",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border"
        )}
      >
        {checked && (
          <Check
            size={
              13
            }
          />
        )}
      </span>
    </button>
  )
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">

      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <CalendarHeart
          size={
            26
          }
        />
      </span>

      <h2 className="mt-4 text-lg font-bold">
        Tu evento está
        vacío
      </h2>

      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Explora el
        catálogo y
        agrega
        parrilleros,
        bartenders,
        catering y
        más.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/planificar"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <Sparkles
            size={
              16
            }
          />

          Planificar
          con IA
        </Link>

        <Link
          href="/proveedores"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold"
        >
          <Package
            size={
              16
            }
          />

          Explorar
          proveedores
        </Link>
      </div>
    </div>
  )
}