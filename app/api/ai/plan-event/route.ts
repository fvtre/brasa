import { NextResponse } from "next/server"

import { CATEGORIES, COMUNAS } from "@/lib/catalog"
import { generatePlan } from "@/lib/planner"
import { getDbProviders } from "@/lib/provider-db"
import type { CategorySlug, Provider, ProviderService } from "@/lib/types"

const CATEGORY_SLUGS = new Set(CATEGORIES.map((category) => category.slug))
const requestsByIp = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"
  const now = Date.now()
  const current = requestsByIp.get(ip)
  if (!current || current.resetAt <= now) {
    requestsByIp.set(ip, { count: 1, resetAt: now + 60_000 })
    return false
  }
  current.count += 1
  return current.count > 10
}

type ParsedEvent = {
  guests: number
  budget: number
  comuna?: string
  categories: CategorySlug[]
}

function comparableTotal(service: ProviderService, guests: number) {
  const price = Number(service.price)
  if (!Number.isFinite(price) || price <= 0) return null

  const unit = service.unit.trim().toLowerCase()
  if (unit.includes("persona")) return price * guests
  if (unit.includes("hora")) return price * Math.max(1, Number(service.duration_hours || 1))
  return price
}

function chooseService(provider: Provider, category: CategorySlug, guests: number) {
  return provider.services
    .filter((service) => {
      if (service.category_slug !== category || service.price <= 0) return false
      if (service.min_guests != null && guests < service.min_guests) return false
      if (service.max_guests != null && guests > service.max_guests) return false
      return true
    })
    .map((service) => ({ service, total: comparableTotal(service, guests) }))
    .filter((item): item is { service: ProviderService; total: number } => item.total != null)
    .sort((a, b) => Number(b.service.popular) - Number(a.service.popular) || a.total - b.total)[0]
}

function rankProviders(providers: Provider[], event: ParsedEvent, category: CategorySlug) {
  return providers
    .filter((provider) => provider.categories.includes(category))
    .filter((provider) => !event.comuna || provider.coverage.includes(event.comuna))
    .map((provider) => {
      const selected = chooseService(provider, category, event.guests)
      if (!selected) return null
      const score =
        Math.min(50, provider.rating * 10) +
        (provider.verified ? 20 : 0) +
        (provider.featured ? 10 : 0) +
        (event.budget > 0 && selected.total <= event.budget ? 20 : 0)
      return { provider, ...selected, score }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.score - a.score || a.total - b.total)
}

async function parseWithGroq(prompt: string, fallback: ParsedEvent): Promise<{ event: ParsedEvent; engine: "groq" | "fallback" }> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return { event: fallback, engine: "fallback" }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Extrae datos de un evento en Chile. No inventes información. Responde exclusivamente JSON válido.",
          },
          {
            role: "user",
            content: `Solicitud: ${JSON.stringify(prompt)}\nCategorías permitidas: ${CATEGORIES.map((c) => c.slug).join(", ")}\nComunas permitidas: ${COMUNAS.join(", ")}\nDevuelve: {"guests": número|null, "budget": número|null, "comuna": string|null, "categories": string[]}.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(12_000),
    })

    if (!response.ok) return { event: fallback, engine: "fallback" }
    const payload = await response.json()
    const content = payload?.choices?.[0]?.message?.content
    if (!content) return { event: fallback, engine: "fallback" }
    const parsed = JSON.parse(content)

    const categories = Array.isArray(parsed.categories)
      ? parsed.categories.filter((slug: unknown): slug is CategorySlug =>
          typeof slug === "string" && CATEGORY_SLUGS.has(slug as CategorySlug),
        )
      : []
    const comuna =
      typeof parsed.comuna === "string"
        ? COMUNAS.find((item) => item.toLocaleLowerCase("es-CL") === parsed.comuna.toLocaleLowerCase("es-CL"))
        : undefined

    return {
      engine: "groq",
      event: {
        guests: Number.isFinite(Number(parsed.guests)) && Number(parsed.guests) > 0 ? Math.round(Number(parsed.guests)) : fallback.guests,
        budget: Number.isFinite(Number(parsed.budget)) && Number(parsed.budget) > 0 ? Math.round(Number(parsed.budget)) : fallback.budget,
        comuna: comuna || fallback.comuna,
        categories: categories.length > 0 ? categories : fallback.categories,
      },
    }
  } catch (error) {
    console.error("plan-event parse fallback:", error)
    return { event: fallback, engine: "fallback" }
  }
}

export async function POST(request: Request) {
  try {
    if (isRateLimited(request)) {
      return NextResponse.json({ error: "Demasiadas solicitudes. Intenta nuevamente en un minuto." }, { status: 429 })
    }
    const body = (await request.json()) as { prompt?: string }
    const prompt = body.prompt?.trim()
    if (!prompt || prompt.length < 5 || prompt.length > 1_500) {
      return NextResponse.json({ error: "Describe tu evento en entre 5 y 1.500 caracteres." }, { status: 400 })
    }

    const local = generatePlan(prompt)
    const interpretation = await parseWithGroq(prompt, {
      guests: local.guests,
      budget: local.budget,
      comuna: local.comuna,
      categories: local.categories,
    })
    const event = interpretation.event
    const providers = await getDbProviders()

    const recommendations = event.categories.map((category) => {
      const ranked = rankProviders(providers, event, category)
      const best = ranked[0]
      return {
        category,
        provider: best
          ? {
              id: best.provider.id,
              name: best.provider.name,
              image: best.provider.image,
              rating: best.provider.rating,
              reviews: best.provider.reviews,
              comuna: best.provider.comuna,
              verified: best.provider.verified,
            }
          : null,
        service: best
          ? {
              id: best.service.id,
              name: best.service.name,
              price: best.service.price,
              unit: best.service.unit,
              estimatedTotal: best.total,
            }
          : null,
        alternatives: ranked.length,
      }
    })

    const estimated = recommendations.reduce(
      (sum, item) => sum + Number(item.service?.estimatedTotal || 0),
      0,
    )
    const available = event.budget - estimated
    const found = recommendations.filter((item) => item.provider).length

    return NextResponse.json({
      event,
      recommendations,
      estimated,
      available,
      overBudget: available < 0,
      summary:
        found === 0
          ? "Entendimos tu evento, pero todavía no hay servicios publicados que coincidan con las categorías y cobertura solicitadas."
          : `Encontramos prestadores reales para ${found} de ${recommendations.length} categorías. Los montos se calcularon con precios publicados en Brasa.`,
      source: "supabase",
      interpretation: interpretation.engine,
    })
  } catch (error) {
    console.error("plan-event:", error)
    return NextResponse.json({ error: "No pudimos generar el plan en este momento." }, { status: 500 })
  }
}
