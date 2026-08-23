"use client"

import * as React from "react"
import { Search, SlidersHorizontal, BadgeCheck } from "lucide-react"
import type { Provider, CategorySlug } from "@/lib/types"
import { CATEGORIES, COMUNAS } from "@/lib/catalog"
import { Input } from "@/components/ui/input"
import { ProviderCard } from "@/components/provider-card"
import { cn } from "@/lib/utils"

type SortKey = "rating" | "price-asc" | "price-desc" | "experience"

export function ProviderExplorer({ providers, initialCategory }: { providers: Provider[]; initialCategory?: CategorySlug }) {
  const [query, setQuery] = React.useState("")
  const [category, setCategory] = React.useState<CategorySlug | "all">(initialCategory ?? "all")
  const [comuna, setComuna] = React.useState("all")
  const [verifiedOnly, setVerifiedOnly] = React.useState(false)
  const [sort, setSort] = React.useState<SortKey>("rating")

  const filtered = React.useMemo(() => {
    let list = providers.filter((p) => {
      const q = query.trim().toLowerCase()
      return (category === "all" || p.category === category) &&
        (comuna === "all" || p.coverage.includes(comuna) || p.comuna === comuna) &&
        (!verifiedOnly || p.verified) &&
        (!q || [p.name,p.tagline,p.comuna,...p.coverage,...p.services.map(s=>s.name)].join(" ").toLowerCase().includes(q))
    })
    return [...list].sort((a,b)=> sort === "rating" ? b.rating-a.rating : sort === "price-asc" ? a.priceFrom-b.priceFrom : sort === "price-desc" ? b.priceFrom-a.priceFrom : b.experienceYears-a.experienceYears)
  }, [providers,category,comuna,verifiedOnly,query,sort])

  return <div>
    <div className="mb-6 space-y-4 rounded-2xl border bg-card p-4">
      <div className="relative"><Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"/><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar prestador, comuna o servicio…" className="pl-11"/></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>setCategory("all")} className={cn("rounded-full border px-3 py-1.5 text-sm",category==="all"?"border-primary bg-primary text-primary-foreground":"border-border")}>Todas</button>{CATEGORIES.map(c=><button key={c.slug} type="button" onClick={()=>setCategory(c.slug)} className={cn("rounded-full border px-3 py-1.5 text-sm",category===c.slug?"border-primary bg-primary text-primary-foreground":"border-border text-muted-foreground")}>{c.name}</button>)}</div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]"><select value={comuna} onChange={e=>setComuna(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-sm"><option value="all">Todas las comunas</option>{COMUNAS.map(c=><option key={c}>{c}</option>)}</select><button type="button" onClick={()=>setVerifiedOnly(v=>!v)} className={cn("inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm",verifiedOnly?"border-primary bg-primary/10 text-primary":"border-border")}><BadgeCheck size={15}/> Verificados</button><label className="flex items-center gap-2 text-sm text-muted-foreground"><SlidersHorizontal size={15}/><select value={sort} onChange={e=>setSort(e.target.value as SortKey)} className="h-9 rounded-lg border border-border bg-background px-2"><option value="rating">Mejor evaluados</option><option value="price-asc">Menor precio</option><option value="price-desc">Mayor precio</option><option value="experience">Más experiencia</option></select></label></div>
    </div>
    <p className="mb-4 text-sm text-muted-foreground">{filtered.length} {filtered.length===1?"prestador":"prestadores"}</p>
    {filtered.length?<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(p=><ProviderCard key={p.id} provider={p}/>)}</div>:<div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">No encontramos prestadores con esos filtros.</div>}
  </div>
}
