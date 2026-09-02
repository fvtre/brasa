import Link from "next/link"
import { BadgeCheck, Clock3, ExternalLink, RefreshCw, Truck } from "lucide-react"

import { formatCLP } from "@/lib/format"
import { getPriceComparison } from "@/lib/price-intelligence"

export const dynamic = "force-dynamic"

export default async function CompararPreciosPage() {
  const groups = await getPriceComparison()
  const lastUpdate = groups.flatMap((group) => group.rows).map((row) => new Date(row.capturedAt).getTime()).filter(Number.isFinite).sort((a, b) => b - a)[0]

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm font-semibold text-primary">Price Intelligence · datos reales</p>
      <h1 className="mt-1 text-3xl font-extrabold">Compara productos e insumos</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">Brasa compara el último precio capturado y el despacho informado para ordenar las alternativas por costo total.</p>
      {lastUpdate && <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Clock3 size={13} />Última captura: {new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(lastUpdate)}</p>}

      {groups.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
          <RefreshCw className="mx-auto size-6 text-primary" />
          <h2 className="mt-3 font-bold">Aún no hay capturas de precios</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">El comparador ya consulta Supabase. Ejecuta el importador de catálogo para cargar la primera captura verificable.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {groups.map((group) => (
            <section key={group.product} className="rounded-2xl border bg-card p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-primary">{group.category}</p>
              <h2 className="mt-1 text-lg font-bold">{group.product}</h2>
              <div className="mt-4 space-y-2">
                {group.rows.map((row, index) => (
                  <div key={row.provider} className={`rounded-xl border p-4 ${index === 0 ? "border-primary/40 bg-primary/5" : ""}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2"><b>{row.provider}</b>{index === 0 && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"><BadgeCheck size={12} />Mejor costo total</span>}</div>
                        <p className="mt-1 text-xs text-muted-foreground"><Truck size={12} className="mr-1 inline" />Despacho {row.delivery ? formatCLP(row.delivery) : "no informado"}</p>
                        {row.productUrl && <Link href={row.productUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">Ver fuente <ExternalLink size={11} /></Link>}
                      </div>
                      <div className="text-right"><p className="font-bold">{formatCLP(row.price)}/{row.unit}</p><p className="text-xs text-muted-foreground">{row.delivery ? `Total: ${formatCLP(row.price + row.delivery)}` : "Precio del producto"}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
