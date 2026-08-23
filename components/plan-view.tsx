"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, Check, MapPin, Plus, Sparkles, Users, Wallet } from "lucide-react"
import { generatePlan, PLANNER_EXAMPLE, type EventPlan } from "@/lib/planner"
import { getProvidersByCategory } from "@/lib/providers"
import { getCategory } from "@/lib/catalog"
import { formatCLP, formatNumber } from "@/lib/format"
import { useEvent } from "@/components/event-provider"
import { CategoryIcon } from "@/components/category-icon"
import { StarRating } from "@/components/star-rating"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import type { Provider } from "@/lib/types"
import { cn } from "@/lib/utils"

export function PlanView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const q = searchParams.get("q") ?? ""
  const [draft, setDraft] = React.useState(q)

  React.useEffect(() => {
    setDraft(q)
  }, [q])

  const plan = React.useMemo<EventPlan | null>(() => (q.trim() ? generatePlan(q) : null), [q])

  function submit(text: string) {
    const value = text.trim()
    if (!value) return
    router.push(`/planificar?q=${encodeURIComponent(value)}`)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault()
      submit(draft)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-primary">
        <Sparkles size={16} />
        <span className="font-semibold">Planificador Brasa</span>
      </div>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl text-balance">
        Tu evento, armado a tu medida
      </h1>

      {/* Prompt box */}
      <div className="mt-5 rounded-2xl border border-border bg-card p-2 shadow-sm">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={PLANNER_EXAMPLE}
          className="min-h-[80px] border-0 bg-transparent shadow-none focus-visible:ring-0"
          aria-label="Describe tu evento"
        />
        <div className="flex justify-end px-2 pb-1">
          <button
            type="button"
            onClick={() => submit(draft)}
            disabled={!draft.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
          >
            Recalcular
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {!plan ? (
        <p className="mt-10 text-center text-muted-foreground">
          Cuéntanos de tu evento arriba para generar un plan con proveedores y presupuesto.
        </p>
      ) : (
        <PlanResult plan={plan} />
      )}
    </div>
  )
}

function PlanResult({ plan }: { plan: EventPlan }) {
  const usedPct = Math.min(100, Math.round((plan.estimated / plan.budget) * 100))

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
      {/* Recommendations */}
      <div className="space-y-5">
        <p className="text-muted-foreground text-pretty leading-relaxed">{plan.summary}</p>
        {plan.categories.map((slug) => {
          const category = getCategory(slug)
          const item = plan.items.filter((i) => i.category === slug)
          const subtotal = item.reduce((s, i) => s + i.amount, 0)
          const best = pickBest(getProvidersByCategory(slug), plan.comuna)
          if (!category) return null
          return (
            <div key={slug} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CategoryIcon name={category.icon} size={20} />
                  </span>
                  <div>
                    <h3 className="font-bold">{category.name}</h3>
                    <p className="text-xs text-muted-foreground">{category.tagline}</p>
                  </div>
                </div>
                <span className="shrink-0 font-bold">{formatCLP(subtotal)}</span>
              </div>

              <ul className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
                {item.map((i, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">
                      {i.label}
                      {i.note && <span className="text-xs"> · {i.note}</span>}
                    </span>
                    <span>{formatCLP(i.amount)}</span>
                  </li>
                ))}
              </ul>

              {best && <RecommendedProvider provider={best} />}
            </div>
          )
        })}
      </div>

      {/* Budget summary */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-2xl border border-border bg-muted/30 p-5">
          <h2 className="text-lg font-bold">Resumen</h2>

          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <Users size={15} /> Invitados
              </dt>
              <dd className="font-semibold">{formatNumber(plan.guests)}</dd>
            </div>
            {plan.comuna && (
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <MapPin size={15} /> Comuna
                </dt>
                <dd className="font-semibold">{plan.comuna}</dd>
              </div>
            )}
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <Wallet size={15} /> Presupuesto
              </dt>
              <dd className="font-semibold">{formatCLP(plan.budget)}</dd>
            </div>
          </dl>

          {/* Budget bar */}
          <div className="mt-5">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className={cn("h-full rounded-full", plan.overBudget ? "bg-destructive" : "bg-primary")}
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Estimado: {formatCLP(plan.estimated)}</span>
              <span>{usedPct}%</span>
            </div>
          </div>

          <div
            className={cn(
              "mt-4 rounded-xl border p-3 text-sm",
              plan.overBudget
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-primary/30 bg-primary/10 text-foreground",
            )}
          >
            {plan.overBudget ? (
              <span>Te excedes por {formatCLP(Math.abs(plan.available))}. Ajusta servicios o sube el presupuesto.</span>
            ) : (
              <span>Te quedan {formatCLP(plan.available)} disponibles dentro de tu presupuesto.</span>
            )}
          </div>

          <Link
            href="/mi-evento"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
          >
            Ver mi evento
            <ArrowRight size={16} />
          </Link>
        </div>
      </aside>
    </div>
  )
}

function RecommendedProvider({ provider }: { provider: Provider }) {
  const { addSelection, removeSelection, has } = useEvent()
  const popular = provider.services.find((s) => s.popular) ?? provider.services[0]
  const selected = has(popular.id, provider.id)

  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-background p-3">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
        <Image src={provider.image || "/placeholder.svg"} alt={provider.name} fill sizes="56px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link href={`/proveedores/${provider.id}`} className="truncate font-semibold hover:text-primary">
            {provider.name}
          </Link>
          {provider.verified && (
            <Badge variant="success" className="hidden sm:inline-flex">
              Verificado
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <StarRating rating={provider.rating} reviews={provider.reviews} size={12} />
          <span className="flex items-center gap-0.5">
            <MapPin size={11} /> {provider.comuna}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() =>
          selected
            ? removeSelection(popular.id, provider.id)
            : addSelection({
                providerId: provider.id,
                providerName: provider.name,
                category: provider.category,
                serviceId: popular.id,
                serviceName: popular.name,
                price: popular.price,
                unit: popular.unit,
              })
        }
        aria-pressed={selected}
        className={cn(
          "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors",
          selected
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-background text-foreground hover:bg-muted",
        )}
      >
        {selected ? <Check size={16} /> : <Plus size={16} />}
        <span className="hidden sm:inline">{selected ? "Agregado" : "Agregar"}</span>
      </button>
    </div>
  )
}

function pickBest(providers: Provider[], comuna?: string): Provider | undefined {
  if (providers.length === 0) return undefined
  const sorted = [...providers].sort((a, b) => {
    const aLocal = comuna && a.coverage.includes(comuna) ? 1 : 0
    const bLocal = comuna && b.coverage.includes(comuna) ? 1 : 0
    if (aLocal !== bLocal) return bLocal - aLocal
    return b.rating - a.rating
  })
  return sorted[0]
}
