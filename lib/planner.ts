import type { CategorySlug } from "./types"
import { COMUNAS } from "./catalog"

export interface PlanItem {
  category: CategorySlug
  label: string
  note?: string
  amount: number
}

export interface EventPlan {
  guests: number
  budget: number
  comuna?: string
  items: PlanItem[]
  estimated: number
  available: number
  overBudget: boolean
  categories: CategorySlug[]
  summary: string
}

interface NeedRule {
  category: CategorySlug
  keywords: string[]
}

const NEED_RULES: NeedRule[] = [
  { category: "parrilleros", keywords: ["asado", "parrilla", "parrillero", "carne", "churrasco", "anticucho"] },
  { category: "bartenders", keywords: ["trago", "coctel", "cóctel", "bar", "bartender", "barra", "drink"] },
  { category: "garzones", keywords: ["garzon", "garzón", "mozo", "atencion", "atención", "servicio de mesa", "invitados"] },
  { category: "catering", keywords: ["comida", "picoteo", "catering", "banquete", "tabla", "cena", "almuerzo"] },
  { category: "pasteleria", keywords: ["torta", "postre", "dulce", "pastel", "cumpleaños", "cumpleanos"] },
  { category: "dj", keywords: ["dj", "musica", "música", "baile", "fiesta", "ambiente", "sonido"] },
  { category: "decoracion", keywords: ["decoracion", "decoración", "globos", "ambientacion", "ambientación", "adorno"] },
  { category: "fotografia", keywords: ["foto", "fotografia", "fotografía", "video", "recuerdo"] },
  { category: "mobiliario", keywords: ["mesa", "silla", "toldo", "mobiliario", "equipamiento", "vajilla"] },
  { category: "parrilleros-veganos", keywords: ["parrilla vegana", "parrillero vegano", "asado vegano", "vegan", "vegano", "vegana"] },
]

function parseGuests(text: string): number {
  const m = text.match(/(\d+)\s*(?:personas|invitados|invitadas|pax|gente)/i)
  if (m) return Number.parseInt(m[1], 10)
  const any = text.match(/para\s+(\d+)/i)
  if (any) return Number.parseInt(any[1], 10)
  return 30
}

function parseBudget(text: string): number {
  // $700.000 or 700.000 or 700000
  const money = text.match(/\$?\s*([\d.,]{4,})/g)
  if (money) {
    for (const raw of money) {
      const digits = raw.replace(/[^\d]/g, "")
      const value = Number.parseInt(digits, 10)
      if (value >= 50000) return value
    }
  }
  // "700 mil"
  const mil = text.match(/(\d+)\s*mil/i)
  if (mil) return Number.parseInt(mil[1], 10) * 1000
  return 500000
}

function parseComuna(text: string): string | undefined {
  const lower = text.toLowerCase()
  return COMUNAS.find((c) => lower.includes(c.toLowerCase()))
}

function detectCategories(text: string): CategorySlug[] {
  const lower = text.toLowerCase()
  const found = new Set<CategorySlug>()
  for (const rule of NEED_RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) found.add(rule.category)
  }
  if (found.has("parrilleros-veganos")) found.delete("parrilleros")
  // Sensible defaults for a generic celebration
  if (found.size === 0) {
    found.add("catering")
    found.add("bartenders")
    found.add("dj")
  }
  return Array.from(found)
}

function buildItems(categories: CategorySlug[], guests: number): PlanItem[] {
  const items: PlanItem[] = []
  const garzones = Math.max(1, Math.round(guests / 18))

  for (const category of categories) {
    switch (category) {
      case "parrilleros":
        items.push({ category, label: "Parrillero", amount: 70000 })
        items.push({ category, label: "Carnes y acompañamientos", note: `${guests} personas`, amount: guests * 5200 })
        break
      case "bartenders":
        items.push({ category, label: "Bartender + barra", amount: 65000 })
        items.push({ category, label: "Bebestibles", note: `${guests} personas`, amount: guests * 2400 })
        break
      case "garzones":
        items.push({ category, label: `${garzones} ${garzones === 1 ? "garzón" : "garzones"}`, amount: garzones * 40000 })
        break
      case "catering":
        items.push({ category, label: "Picoteo / catering", note: `${guests} personas`, amount: guests * 6500 })
        break
      case "pasteleria":
        items.push({ category, label: "Torta / mesa dulce", amount: 45000 })
        break
      case "dj":
        items.push({ category, label: "DJ + iluminación", amount: 120000 })
        break
      case "decoracion":
        items.push({ category, label: "Decoración y ambientación", amount: 55000 })
        break
      case "fotografia":
        items.push({ category, label: "Cobertura fotográfica", amount: 100000 })
        break
      case "mobiliario":
        items.push({ category, label: "Mobiliario y equipamiento", note: `${Math.ceil(guests / 10)} sets`, amount: Math.ceil(guests / 10) * 45000 })
        break
    }
  }
  return items
}

export function generatePlan(text: string): EventPlan {
  const guests = parseGuests(text)
  const budget = parseBudget(text)
  const comuna = parseComuna(text)
  const categories = detectCategories(text)
  const items = buildItems(categories, guests)
  const estimated = items.reduce((sum, i) => sum + i.amount, 0)
  const available = budget - estimated

  const summary = `Para tu evento de ${guests} personas${comuna ? ` en ${comuna}` : ""} recomendamos ${categories.length} tipos de servicio. El costo estimado usa ${Math.round((estimated / budget) * 100)}% de tu presupuesto.`

  return {
    guests,
    budget,
    comuna,
    items,
    estimated,
    available,
    overBudget: available < 0,
    categories,
    summary,
  }
}

export const PLANNER_EXAMPLE =
  "Cumpleaños para 35 personas en Puente Alto. Quiero asado, tragos y atención para los invitados. Tengo $700.000."
