"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, ArrowRight, Check, LoaderCircle, MapPin, Plus, Sparkles, Users, Wallet } from "lucide-react"

import { CategoryIcon } from "@/components/category-icon"
import { useEvent } from "@/components/event-provider"
import { StarRating } from "@/components/star-rating"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { getCategory } from "@/lib/catalog"
import { formatCLP, formatNumber } from "@/lib/format"
import { PLANNER_EXAMPLE } from "@/lib/planner"
import type { CategorySlug } from "@/lib/types"
import { cn } from "@/lib/utils"

type Recommendation = {
  category: CategorySlug
  alternatives: number
  provider: { id: string; name: string; image: string; rating: number; reviews: number; comuna: string; verified: boolean } | null
  service: { id: string; name: string; price: number; unit: string; estimatedTotal: number } | null
}

type AiEventPlan = {
  event: { guests: number; budget: number; comuna?: string; categories: CategorySlug[] }
  recommendations: Recommendation[]
  estimated: number
  available: number
  overBudget: boolean
  summary: string
  source: "supabase"
  interpretation: "groq" | "fallback"
}

export function PlanView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const q = searchParams.get("q") ?? ""
  const [draft, setDraft] = React.useState(q)
  const [plan, setPlan] = React.useState<AiEventPlan | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  React.useEffect(() => setDraft(q), [q])
  React.useEffect(() => {
    if (!q.trim()) { setPlan(null); return }
    const controller = new AbortController()
    async function loadPlan() {
      setLoading(true); setError("")
      try {
        const response = await fetch("/api/ai/plan-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: q }),
          signal: controller.signal,
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || "No pudimos generar el plan.")
        setPlan(payload as AiEventPlan)
      } catch (requestError) {
        if (controller.signal.aborted) return
        setPlan(null)
        setError(requestError instanceof Error ? requestError.message : "No pudimos generar el plan.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void loadPlan()
    return () => controller.abort()
  }, [q])

  function submit(text: string) {
    const value = text.trim()
    if (value) router.push(`/planificar?q=${encodeURIComponent(value)}`)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-primary"><Sparkles size={16} /><span className="font-semibold">Planificador Brasa IA</span></div>
      <h1 className="mt-2 text-balance text-3xl font-extrabold tracking-tight md:text-4xl">Tu evento, armado con servicios reales</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">Describe lo que necesitas. Brasa interpreta tu solicitud y calcula el plan usando precios publicados por prestadores.</p>

      <div className="mt-5 rounded-2xl border border-border bg-card p-2 shadow-sm">
        <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(draft) }
        }} placeholder={PLANNER_EXAMPLE} className="min-h-[80px] border-0 bg-transparent shadow-none focus-visible:ring-0" aria-label="Describe tu evento" />
        <div className="flex justify-end px-2 pb-1">
          <button type="button" onClick={() => submit(draft)} disabled={!draft.trim() || loading} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {loading ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}{loading ? "Armando plan…" : "Armar mi evento"}
          </button>
        </div>
      </div>

      {error && <div className="mt-6 flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><AlertCircle className="size-5 shrink-0" />{error}</div>}
      {!q.trim() && <p className="mt-10 text-center text-muted-foreground">Cuéntanos de tu evento para buscar servicios compatibles.</p>}
      {loading && !plan && <div className="mt-10 flex items-center justify-center gap-3 text-muted-foreground"><LoaderCircle className="animate-spin" />Consultando categorías, servicios y precios…</div>}
      {plan && <PlanResult plan={plan} />}
    </div>
  )
}

function PlanResult({ plan }: { plan: AiEventPlan }) {
  const usedPct = plan.event.budget > 0 ? Math.min(100, Math.round((plan.estimated / plan.event.budget) * 100)) : 0
  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4"><p className="leading-relaxed text-muted-foreground">{plan.summary}</p><p className="mt-2 text-xs font-medium text-primary">{plan.interpretation === "groq" ? "Solicitud interpretada por Groq" : "Interpretación local de respaldo"} · Precios obtenidos desde Supabase · La IA no inventa valores</p></div>
        {plan.recommendations.map((item) => <RecommendationCard key={item.category} recommendation={item} />)}
      </div>
      <aside className="lg:sticky lg:top-20 lg:self-start"><div className="rounded-2xl border border-border bg-muted/30 p-5">
        <h2 className="text-lg font-bold">Resumen</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between"><dt className="flex items-center gap-2 text-muted-foreground"><Users size={15} /> Invitados</dt><dd className="font-semibold">{formatNumber(plan.event.guests)}</dd></div>
          {plan.event.comuna && <div className="flex justify-between"><dt className="flex items-center gap-2 text-muted-foreground"><MapPin size={15} /> Comuna</dt><dd className="font-semibold">{plan.event.comuna}</dd></div>}
          <div className="flex justify-between"><dt className="flex items-center gap-2 text-muted-foreground"><Wallet size={15} /> Presupuesto</dt><dd className="font-semibold">{formatCLP(plan.event.budget)}</dd></div>
        </dl>
        <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-border"><div className={cn("h-full rounded-full", plan.overBudget ? "bg-destructive" : "bg-primary")} style={{ width: `${usedPct}%` }} /></div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>Estimado: {formatCLP(plan.estimated)}</span><span>{usedPct}%</span></div>
        <div className={cn("mt-4 rounded-xl border p-3 text-sm", plan.overBudget ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-primary/30 bg-primary/10")}>{plan.overBudget ? `El plan supera el presupuesto por ${formatCLP(Math.abs(plan.available))}.` : `Quedan ${formatCLP(plan.available)} disponibles.`}</div>
        <Link href="/mi-evento" className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Ver mi evento <ArrowRight size={16} /></Link>
      </div></aside>
    </div>
  )
}

function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const { addSelection, removeSelection, has } = useEvent()
  const category = getCategory(recommendation.category)
  const { provider, service } = recommendation
  const selected = provider && service ? has(service.id, provider.id) : false
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><CategoryIcon name={category?.icon || "Sparkles"} size={20} /></span><div><h2 className="font-bold">{category?.name || recommendation.category}</h2><p className="text-xs text-muted-foreground">{recommendation.alternatives} alternativas compatibles</p></div></div>
      {!provider || !service ? <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Aún no hay un servicio con precio publicado y cobertura compatible en esta categoría.</div> : (
        <div className="mt-4 flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg"><Image src={provider.image || "/placeholder.svg"} alt={provider.name} fill sizes="64px" className="object-cover" /></div>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Link href={`/proveedores/${provider.id}?categoria=${recommendation.category}`} className="font-semibold hover:text-primary">{provider.name}</Link>{provider.verified && <Badge variant="success">Verificado</Badge>}</div><p className="mt-1 text-sm text-muted-foreground">{service.name} · {formatCLP(service.price)} {service.unit}</p><div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><StarRating rating={provider.rating} reviews={provider.reviews} size={12} /><span className="flex items-center gap-1"><MapPin size={11} />{provider.comuna}</span></div><p className="mt-2 text-sm font-semibold">Estimado para el evento: {formatCLP(service.estimatedTotal)}</p></div>
          <button type="button" onClick={() => selected ? removeSelection(service.id, provider.id) : addSelection({ providerId: provider.id, providerName: provider.name, category: recommendation.category, serviceId: service.id, serviceName: service.name, price: service.price, unit: service.unit })} className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold", selected ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted")}>{selected ? <Check size={16} /> : <Plus size={16} />}{selected ? "Agregado" : "Agregar"}</button>
        </div>
      )}
    </section>
  )
}
