"use client"

import { Check, Plus, Star } from "lucide-react"
import type { Provider } from "@/lib/types"
import { formatCLP } from "@/lib/format"
import { useEvent } from "@/components/event-provider"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function ServiceSelector({ provider }: { provider: Provider }) {
  const { addSelection, removeSelection, has } = useEvent()

  return (
    <div className="space-y-3">
      {provider.services.map((service) => {
        const selected = has(service.id, provider.id)
        return (
          <div
            key={service.id}
            className={cn(
              "flex items-start justify-between gap-4 rounded-xl border p-4 transition-colors",
              selected ? "border-primary bg-primary/5" : "border-border bg-card",
            )}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{service.name}</h4>
                {service.popular && (
                  <Badge variant="secondary" className="gap-1">
                    <Star size={11} className="fill-primary text-primary" />
                    Popular
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">{service.description}</p>
              <p className="mt-2 text-sm">
                <span className="font-semibold text-foreground">{formatCLP(service.price)}</span>{" "}
                <span className="text-muted-foreground">{service.unit}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                selected
                  ? removeSelection(service.id, provider.id)
                  : addSelection({
                      providerId: provider.id,
                      providerName: provider.name,
                      category: provider.category,
                      serviceId: service.id,
                      serviceName: service.name,
                      price: service.price,
                      unit: service.unit,
                    })
              }
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background text-foreground hover:bg-muted",
              )}
              aria-pressed={selected}
            >
              {selected ? <Check size={16} /> : <Plus size={16} />}
              {selected ? "Agregado" : "Agregar"}
            </button>
          </div>
        )
      })}
    </div>
  )
}
