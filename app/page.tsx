import Image from "next/image"
import Link from "next/link"
import { ArrowRight, MessageSquareText, ListChecks, PartyPopper } from "lucide-react"
import { CATEGORIES } from "@/lib/catalog"
import { PROVIDERS } from "@/lib/providers"
import { CategoryCard } from "@/components/category-card"
import { ProviderCard } from "@/components/provider-card"
import { HeroPlanner } from "@/components/hero-planner"

const STEPS = [
  {
    icon: MessageSquareText,
    title: "Cuéntanos tu evento",
    text: "Describe cuántos son, dónde y tu presupuesto en tus propias palabras.",
  },
  {
    icon: ListChecks,
    title: "Armamos tu plan",
    text: "Te proponemos los servicios ideales y cómo distribuir tu presupuesto.",
  },
  {
    icon: PartyPopper,
    title: "Contrata y disfruta",
    text: "Elige proveedores verificados y agrégalos a tu evento en un solo lugar.",
  },
]

export default function HomePage() {
  const featured = PROVIDERS.filter((p) => p.featured)

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0">
          <Image
            src="/images/hero-event.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/60" />
        </div>

        <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 py-20 md:py-28">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            El marketplace de eventos hecho en Chile
          </span>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight text-balance md:text-6xl">
            Arma tu evento completo, del asado a la última foto.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground text-pretty">
            Parrilleros, bartenders, garzones, catering, DJ y más. Cuéntanos tu presupuesto y armamos tu evento perfecto.
          </p>
          <HeroPlanner />
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Explora por categoría</h2>
            <p className="mt-1 text-muted-foreground">Todo lo que tu evento necesita, en un solo lugar.</p>
          </div>
          <Link
            href="/categorias"
            className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex"
          >
            Ver todas <ArrowRight size={15} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {CATEGORIES.map((category) => (
            <CategoryCard key={category.slug} category={category} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Cómo funciona</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="rounded-xl border border-border bg-card p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <step.icon size={20} />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">0{i + 1}</span>
                  <h3 className="font-semibold">{step.title}</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground text-pretty">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured providers */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Proveedores destacados</h2>
            <p className="mt-1 text-muted-foreground">Los mejor evaluados por la comunidad.</p>
          </div>
          <Link
            href="/proveedores"
            className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex"
          >
            Ver todos <ArrowRight size={15} />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-8">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-primary px-6 py-14 text-center text-primary-foreground md:px-12">
          <h2 className="mx-auto max-w-2xl text-2xl font-bold tracking-tight text-balance md:text-4xl">
            ¿Listo para armar tu próximo evento?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-primary-foreground/85 text-pretty">
            Dinos qué celebras y tu presupuesto. Nosotros nos encargamos del resto.
          </p>
          <Link
            href="/planificar"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-background px-6 py-3 text-sm font-semibold text-foreground transition-transform hover:scale-[1.02]"
          >
            Planificar mi evento <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  )
}
