import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { BadgeCheck, MapPin, ChevronRight, Briefcase, CalendarCheck, Sparkles } from "lucide-react"
import { PROVIDERS, getProvider } from "@/lib/providers"
import { getDbProvider } from "@/lib/provider-db"
import { getCategory } from "@/lib/catalog"
import { formatNumber } from "@/lib/format"
import { StarRating } from "@/components/star-rating"
import { CategoryIcon } from "@/components/category-icon"
import { Badge } from "@/components/ui/badge"
import { ServiceSelector } from "@/components/service-selector"
import type { CategorySlug } from "@/lib/types"

export function generateStaticParams() {
  return PROVIDERS.map((p) => ({ id: p.id }))
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ categoria?: string }>
}): Promise<Metadata> {
  const { id } = await params
  const { categoria } = await searchParams
  const provider =
    (await getDbProvider(id, categoria as CategorySlug | undefined)) ||
    getProvider(id)
  if (!provider) return { title: "Prestador no encontrado — Brasa" }
  return { title: `${provider.name} — Brasa`, description: provider.tagline }
}

export default async function ProviderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ categoria?: string }>
}) {
  const { id } = await params
  const { categoria } = await searchParams
  const provider =
    (await getDbProvider(id, categoria as CategorySlug | undefined)) ||
    getProvider(id)
  if (!provider) notFound()

  const category = getCategory(provider.category)

  const stats = [
    { icon: Briefcase, label: "Experiencia", value: `${provider.experienceYears} años` },
    { icon: CalendarCheck, label: "Eventos", value: formatNumber(provider.eventsDone) },
    { icon: Sparkles, label: "Evaluación", value: `${provider.rating.toFixed(1)} / 5` },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/proveedores" className="hover:text-foreground">Proveedores</Link>
        <ChevronRight size={14} />
        {category && (
          <>
            <Link href={`/categorias/${category.slug}`} className="hover:text-foreground">
              {category.name}
            </Link>
            <ChevronRight size={14} />
          </>
        )}
        <span className="text-foreground">{provider.name}</span>
      </nav>

      {/* Gallery */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="relative col-span-2 aspect-[16/10] overflow-hidden rounded-xl">
          <Image
            src={provider.gallery[0] || provider.image}
            alt={`Trabajo de ${provider.name}`}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 66vw"
            className="object-cover"
          />
        </div>
        <div className="grid grid-rows-2 gap-3">
          {provider.gallery.slice(1, 3).map((src, i) => (
            <div key={i} className="relative aspect-[16/9] overflow-hidden rounded-xl md:aspect-auto">
              <Image
                src={src || "/placeholder.svg"}
                alt={`Galería de ${provider.name} ${i + 2}`}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        {/* Main */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {category && (
              <Badge variant="secondary">
                <CategoryIcon name={category.icon} size={12} />
                {category.name}
              </Badge>
            )}
            {provider.verified && (
              <Badge variant="success">
                <BadgeCheck size={12} />
                Verificado
              </Badge>
            )}
          </div>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl text-balance">
            {provider.name}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground text-pretty">{provider.tagline}</p>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <StarRating rating={provider.rating} reviews={provider.reviews} size={16} />
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin size={15} />
              {provider.comuna}, {provider.region}
            </span>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-4">
                <s.icon size={18} className="text-primary" />
                <p className="mt-2 text-lg font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Bio */}
          <section className="mt-8">
            <h2 className="text-xl font-bold">Sobre {provider.name}</h2>
            <p className="mt-2 text-muted-foreground text-pretty leading-relaxed">{provider.bio}</p>
          </section>

          {/* Reviews */}
          <section className="mt-8">
            <h2 className="text-xl font-bold">Evaluaciones</h2>
            <div className="mt-4 space-y-4">
              {provider.reviewList.map((review, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{review.author}</span>
                    <StarRating rating={review.rating} size={13} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{review.date}</p>
                  <p className="mt-2 text-sm text-muted-foreground text-pretty">{review.comment}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar: services */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-border bg-muted/30 p-5">
            <h2 className="text-lg font-bold">Servicios</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Agrega los servicios que necesitas a tu evento.
            </p>
            <ServiceSelector provider={provider} />
            <Link
              href="/mi-evento"
              className="mt-4 flex w-full items-center justify-center rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
            >
              Ver mi evento
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
