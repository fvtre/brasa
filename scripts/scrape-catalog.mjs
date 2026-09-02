import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

const args = new Set(process.argv.slice(2))
const configArg = process.argv.slice(2).find((arg) => arg.endsWith(".json")) || "data/catalog-sources.json"
const commit = args.has("--commit")
const config = JSON.parse(await readFile(resolve(configArg), "utf8"))

function safeUrl(raw) {
  const url = new URL(raw)
  if (url.protocol !== "https:") throw new Error(`Solo se permite HTTPS: ${raw}`)
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url.hostname)) {
    throw new Error(`Host privado no permitido: ${url.hostname}`)
  }
  return url
}

function parsePrice(html, source) {
  if (/product:availability[^>]+content=["']?out of stock/i.test(html)) {
    throw new Error(`El producto está sin stock en ${source.url}`)
  }

  const validate = (price) => {
    if (source.minPrice && price < source.minPrice) throw new Error(`Precio ${price} bajo el mínimo esperado en ${source.url}`)
    if (source.maxPrice && price > source.maxPrice) throw new Error(`Precio ${price} sobre el máximo esperado en ${source.url}`)
    return price
  }

  if (source.pricePatterns) {
    for (const pattern of source.pricePatterns) {
      const match = html.match(new RegExp(pattern, "i"))
      if (match) {
        const price = Number(match[1].replace(/\./g, ""))
        if (Number.isFinite(price) && price > 0) return validate(price)
      }
    }
  }

  const jsonLd = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  for (const match of jsonLd) {
    try {
      const value = JSON.parse(match[1])
      const nodes = Array.isArray(value) ? value : [value]
      for (const node of nodes) {
        const offers = node?.offers
        const price = Number(Array.isArray(offers) ? offers[0]?.price : offers?.price)
        if (Number.isFinite(price) && price > 0) return validate(Math.round(price))
      }
    } catch {}
  }

  const patterns = [
    "El precio actual es CLP\\$?([\\d.]+)",
    "\\$([\\d.]+)\\s*x\\s*kg",
    "\"price\"\\s*:\\s*\"?([\\d.]+)",
  ]
  for (const pattern of patterns) {
    const match = html.match(new RegExp(pattern, "i"))
    if (match) {
      const price = Number(match[1].replace(/\./g, ""))
      if (Number.isFinite(price) && price > 0) return validate(price)
    }
  }
  throw new Error(`No fue posible detectar el precio en ${source.url}`)
}

async function rest(path, options = {}) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY")
  const response = await fetch(`${base}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation", ...options.headers },
  })
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

async function findOrCreateProvider(source) {
  const found = await rest(`catalog_providers?name=eq.${encodeURIComponent(source.provider)}&select=id&limit=1`)
  if (found[0]) {
    await rest(`catalog_providers?id=eq.${found[0].id}`, { method: "PATCH", body: JSON.stringify({ website: new URL(source.url).origin, delivery_cost: source.deliveryCost || 0, last_sync_at: new Date().toISOString() }) })
    return found[0].id
  }
  const rows = await rest("catalog_providers", { method: "POST", body: JSON.stringify({ name: source.provider, type: "scraping", website: new URL(source.url).origin, delivery_cost: source.deliveryCost || 0, last_sync_at: new Date().toISOString() }) })
  return rows[0].id
}

async function findOrCreateProduct(source) {
  const found = await rest(`products?name=eq.${encodeURIComponent(source.product)}&category=eq.${encodeURIComponent(source.category)}&select=id&limit=1`)
  if (found[0]) return found[0].id
  const rows = await rest("products", { method: "POST", body: JSON.stringify({ name: source.product, category: source.category, unit: source.unit }) })
  return rows[0].id
}

const captures = []
for (const source of config.sources) {
  const url = safeUrl(source.url)
  const response = await fetch(url, { headers: { "User-Agent": "BrasaPriceMonitor/1.0 (+contacto del proyecto)", Accept: "text/html" }, signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`${response.status} al consultar ${url}`)
  const price = parsePrice(await response.text(), source)
  captures.push({ ...source, price, capturedAt: new Date().toISOString() })
}

if (!commit) {
  console.log(JSON.stringify({ mode: "dry-run", captures }, null, 2))
  console.log("Usa --commit cuando hayas verificado las capturas.")
  process.exit(0)
}

for (const capture of captures) {
  const catalogProviderId = await findOrCreateProvider(capture)
  const productId = await findOrCreateProduct(capture)
  await rest("product_prices", { method: "POST", body: JSON.stringify({ product_id: productId, catalog_provider_id: catalogProviderId, price: capture.price, price_per_kg: capture.pricePerKg ? capture.price : null, stock: true, product_url: capture.url, captured_at: capture.capturedAt }) })
}
console.log(`Capturas guardadas: ${captures.length}`)
