import { readFile } from "node:fs/promises"

const base = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!base || !key) throw new Error("Configura SUPABASE_SERVICE_ROLE_KEY para sembrar perfiles demo.")

const fixtures = JSON.parse(await readFile(new URL("../data/demo-providers.json", import.meta.url), "utf8"))

async function rest(path, options = {}) {
  const response = await fetch(`${base}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation", ...options.headers },
  })
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

for (const fixture of fixtures) {
  const existing = await rest(`service_providers?slug=eq.${encodeURIComponent(fixture.slug)}&select=id&limit=1`)
  let providerId = existing[0]?.id
  if (!providerId) {
    const created = await rest("service_providers", {
      method: "POST",
      body: JSON.stringify({
        slug: fixture.slug,
        business_name: fixture.name,
        category_slug: fixture.category,
        tagline: "Perfil demostrativo para validar Brasa IA",
        bio: "Prestador ficticio creado exclusivamente para pruebas funcionales del marketplace.",
        comuna: "Santiago Centro",
        region: "Región Metropolitana",
        coverage: ["Santiago Centro", "Providencia", "Ñuñoa", "La Florida", "Puente Alto"],
        image_url: `/images/cat-${fixture.category === "parrilleros-veganos" ? "parrilleros" : fixture.category}.png`,
        active: true,
        verified: false,
      }),
    })
    providerId = created[0].id
  }

  const category = await rest(`provider_categories?provider_id=eq.${providerId}&category_slug=eq.${fixture.category}&select=id&limit=1`)
  if (!category[0]) await rest("provider_categories", { method: "POST", body: JSON.stringify({ provider_id: providerId, category_slug: fixture.category, description: "Configuración demostrativa para pruebas de recomendación." }) })

  const externalKey = `demo-${fixture.category}`
  const service = await rest(`provider_services?provider_id=eq.${providerId}&external_key=eq.${externalKey}&select=id&limit=1`)
  if (!service[0]) await rest("provider_services", { method: "POST", body: JSON.stringify({ provider_id: providerId, external_key: externalKey, category_slug: fixture.category, name: fixture.service, description: "Servicio ficticio con precio publicado para validar el planificador.", price: fixture.price, unit: fixture.unit, duration_hours: 2, popular: true, active: true }) })
}

console.log(`Perfiles demo verificados: ${fixtures.length}`)
