import "server-only"

import { createClient } from "@/lib/supabase/server"

export type PriceRow = {
  product: string
  category: string
  provider: string
  unit: string
  price: number
  delivery: number
  productUrl?: string
  capturedAt: string
}

export type PriceGroup = {
  product: string
  category: string
  rows: PriceRow[]
  best: PriceRow
}

export async function getPriceComparison(): Promise<PriceGroup[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("product_prices")
    .select(`
      price,
      price_per_kg,
      stock,
      product_url,
      captured_at,
      product:products!inner(name,category,unit,active),
      provider:catalog_providers!inner(name,delivery_cost,active)
    `)
    .eq("stock", true)
    .eq("product.active", true)
    .eq("provider.active", true)
    .order("captured_at", { ascending: false })

  if (error) {
    console.error("Error cargando comparación de precios:", error)
    return []
  }

  const latest = new Map<string, PriceRow>()
  for (const raw of data || []) {
    const product = Array.isArray(raw.product) ? raw.product[0] : raw.product
    const provider = Array.isArray(raw.provider) ? raw.provider[0] : raw.provider
    if (!product || !provider) continue
    const key = `${product.name}::${provider.name}`
    if (latest.has(key)) continue
    latest.set(key, {
      product: product.name,
      category: product.category,
      provider: provider.name,
      unit: product.unit,
      price: Number(raw.price_per_kg || raw.price || 0),
      delivery: Number(provider.delivery_cost || 0),
      productUrl: raw.product_url || undefined,
      capturedAt: raw.captured_at,
    })
  }

  const groups = new Map<string, PriceRow[]>()
  for (const row of latest.values()) groups.set(row.product, [...(groups.get(row.product) || []), row])

  return [...groups.entries()].map(([product, rows]) => {
    const sorted = [...rows].sort((a, b) => a.price + a.delivery - (b.price + b.delivery))
    return { product, category: sorted[0].category, rows: sorted, best: sorted[0] }
  })
}
