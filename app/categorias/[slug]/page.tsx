import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { CATEGORIES, getCategory } from "@/lib/catalog"
import { getProvidersByCategory } from "@/lib/providers"
import { getDbProviders } from "@/lib/provider-db"
import { CategoryIcon } from "@/components/category-icon"
import { ProviderCard } from "@/components/provider-card"

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const category = getCategory(slug)
  if (!category) return { title: "Categoría no encontrada — Brasa" }
  return {
    title: `${category.name} — Brasa`,
    description: category.description,
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const category = getCategory(slug)
  if (!category) notFound()

  const dbProviders = (await getDbProviders(category.slug)).filter((provider) =>
    provider.categories.includes(category.slug)
  )
  const providers = [...new Map([...getProvidersByCategory(category.slug), ...dbProviders].map((p) => [p.id, p])).values()]

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0">
          <Image src={category.image || "/placeholder.svg"} alt="" fill sizes="100vw" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/50" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-16">
          <nav className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/categorias" className="hover:text-foreground">Categorías</Link>
            <ChevronRight size={14} />
            <span className="text-foreground">{category.name}</span>
          </nav>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <CategoryIcon name={category.icon} size={24} />
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{category.name}</h1>
          </div>
          <p className="mt-3 max-w-xl text-muted-foreground text-pretty">{category.description}</p>
        </div>
      </section>

      {/* Providers */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <p className="mb-6 text-sm text-muted-foreground">
          {providers.length} {providers.length === 1 ? "prestador disponible" : "prestadores disponibles"}
        </p>
        {providers.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                categorySlug={category.slug}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            Pronto tendremos prestadores en esta categoría.
          </div>
        )}
      </section>
    </div>
  )
}
