"use client"

import * as React from "react"
import Link from "next/link"
import { CalendarHeart, PartyPopper, Trash2, Users, Wallet, Sparkles, ArrowRight } from "lucide-react"
import { useEvent } from "@/components/event-provider"
import { getCategory } from "@/lib/catalog"
import { formatCLP, formatNumber } from "@/lib/format"
import { CategoryIcon } from "@/components/category-icon"
import type { CategorySlug } from "@/lib/types"
import { cn } from "@/lib/utils"

export function EventTracker() {
  const { selections, total, budget, setBudget, guests, setGuests, removeSelection, clear, selectionTotal } = useEvent()

  const grouped = React.useMemo(() => {
    const map = new Map<CategorySlug, typeof selections>()
    for (const s of selections) {
      const list = map.get(s.category) ?? []
      list.push(s)
      map.set(s.category, list)
    }
    return Array.from(map.entries())
  }, [selections])

  const usedPct = budget > 0 ? Math.min(100, Math.round((total / budget) * 100)) : 0
  const remaining = budget - total
  const overBudget = remaining < 0
  const perGuest = guests > 0 ? total / guests : 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-primary">
        <PartyPopper size={16} />
        <span className="font-semibold">Mi evento</span>
      </div>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl text-balance">
        Arma y controla tu presupuesto
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground text-pretty">
        Ajusta invitados y presupuesto, agrega servicios desde el catálogo y controla cuánto llevas gastado en tiempo real.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Selections */}
        <div>
          {selections.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-6">
              {grouped.map(([slug, items]) => {
                const category = getCategory(slug)
                if (!category) return null
                return (
                  <section key={slug}>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <CategoryIcon name={category.icon} size={16} />
                      </span>
                      <h2 className="font-bold">{category.name}</h2>
                    </div>
                    <div className="space-y-2">
                      {items.map((s) => (
                        <div
                          key={s.serviceId}
                          className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"
                        >
                          <div className="min-w-0">
                            <Link
                              href={`/proveedores/${s.providerId}`}
                              className="font-semibold hover:text-primary"
                            >
                              {s.providerName}
                            </Link>
                            <p className="text-sm text-muted-foreground">
                              {s.serviceName} · {s.unit}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">{formatCLP(selectionTotal(s))}</span>
                            <button
                              type="button"
                              onClick={() => removeSelection(s.serviceId, s.providerId)}
                              className="text-muted-foreground transition-colors hover:text-destructive"
                              aria-label={`Quitar ${s.serviceName}`}
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )
              })}

              <button
                type="button"
                onClick={clear}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-destructive hover:underline"
              >
                Vaciar mi evento
              </button>
            </div>
          )}
        </div>

        {/* Budget panel */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-border bg-muted/30 p-5">
            <h2 className="text-lg font-bold">Presupuesto</h2>

            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-sm text-muted-foreground">
                  <Users size={15} /> Invitados
                </span>
                <input
                  type="number"
                  min={1}
                  value={guests}
                  onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 0))}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-sm text-muted-foreground">
                  <Wallet size={15} /> Presupuesto (CLP)
                </span>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={budget}
                  onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            </div>

            {/* Budget bar */}
            <div className="mt-5">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className={cn("h-full rounded-full transition-all", overBudget ? "bg-destructive" : "bg-primary")}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Gastado: {formatCLP(total)}</span>
                <span>{usedPct}%</span>
              </div>
            </div>

            <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Servicios</dt>
                <dd className="font-semibold">{selections.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Costo por invitado</dt>
                <dd className="font-semibold">{formatCLP(perGuest)}</dd>
              </div>
            </dl>

            <div
              className={cn(
                "mt-4 rounded-xl border p-3 text-sm",
                overBudget
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-primary/30 bg-primary/10 text-foreground",
              )}
            >
              {overBudget ? (
                <span>Te excedes por {formatCLP(Math.abs(remaining))}.</span>
              ) : (
                <span>Disponible: {formatCLP(remaining)} de {formatCLP(budget)}.</span>
              )}
            </div>

            {selections.length > 0 && (
              <Link
                href="/checkout"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
              >
                Reservar evento
                <ArrowRight size={16} />
              </Link>
            )}

            <Link
              href="/proveedores"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
            >
              Seguir agregando
              <ArrowRight size={16} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <CalendarHeart size={26} />
      </span>
      <h2 className="mt-4 text-lg font-bold">Tu evento está vacío</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground text-pretty">
        Explora el catálogo y agrega parrilleros, bartenders, catering y más. Aquí verás el total y cuánto te queda de presupuesto.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/planificar"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
        >
          <Sparkles size={16} />
          Planificar con IA
        </Link>
        <Link
          href="/proveedores"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
        >
          Explorar proveedores
        </Link>
      </div>
    </div>
  )
}
