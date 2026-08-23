"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Sparkles, ArrowRight } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

const SUGGESTIONS = [
  "Asado para 40 personas en La Florida con $600.000",
  "Matrimonio pequeño con bartender, DJ y fotos",
  "Cumpleaños de 25 con torta, catering y decoración",
]

export function HeroPlanner() {
  const router = useRouter()
  const [value, setValue] = React.useState("")

  function submit(text: string) {
    const q = text.trim()
    if (!q) return
    router.push(`/planificar?q=${encodeURIComponent(q)}`)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault()
      submit(value)
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="rounded-2xl border border-border bg-card/80 p-2 shadow-lg backdrop-blur">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Cuéntanos de tu evento: cuántas personas, en qué comuna, qué necesitas y tu presupuesto…"
          className="min-h-[96px] border-0 bg-transparent shadow-none focus-visible:ring-0"
          aria-label="Describe tu evento"
        />
        <div className="flex items-center justify-between gap-2 px-2 pb-1">
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <Sparkles size={13} className="text-primary" />
            Armamos tu evento según tu presupuesto
          </span>
          <button
            type="button"
            onClick={() => submit(value)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
            disabled={!value.trim()}
          >
            Armar mi evento
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => submit(s)}
            className="rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur transition-colors hover:border-primary hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
