import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"

import {
  ArrowRight,
  MessageSquareText,
  ListChecks,
  PartyPopper,
} from "lucide-react"

import { CATEGORIES } from "@/lib/catalog"
import { getCurrentProfile } from "@/lib/auth"
import { getDbProviders } from "@/lib/provider-db"

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
    text: "Elige prestadores y agrégalos a tu evento en un solo lugar.",
  },
]

export default async function HomePage() {
  /* ======================================================
     SESIÓN / ROL
  ====================================================== */

  const session =
    await getCurrentProfile()

  /*
   * Cliente / visitante:
   * marketplace.
   *
   * Prestador:
   * dashboard prestador.
   *
   * Administrador:
   * dashboard admin.
   */

  if (
    session?.profile.role ===
    "prestador"
  ) {
    redirect(
      "/prestador/dashboard"
    )
  }

  if (
    session?.profile.role ===
    "administrador"
  ) {
    redirect(
      "/admin/dashboard"
    )
  }

  /* ======================================================
     PRESTADORES DESDE SUPABASE
  ====================================================== */

  let providers:
    Awaited<
      ReturnType<
        typeof getDbProviders
      >
    > = []

  try {
    providers =
      await getDbProviders()
  } catch (error) {
    console.error(
      "Error cargando prestadores del Home:",
      error
    )

    /*
     * Si Supabase falla, el Home
     * puede seguir funcionando.
     */
    providers = []
  }

  /*
   * Destacados:
   *
   * 1. featured
   * 2. verificados
   * 3. mejor rating
   *
   * Máximo 4 en el Home.
   *
   * Si todavía no tenemos suficientes
   * prestadores featured, completamos
   * con los mejores disponibles.
   */

  const featured =
    [...providers]
      .sort(
        (
          a,
          b
        ) => {
          /*
           * Featured primero
           */
          if (
            Boolean(
              b.featured
            ) !==
            Boolean(
              a.featured
            )
          ) {
            return Number(
              Boolean(
                b.featured
              )
            ) -
              Number(
                Boolean(
                  a.featured
                )
              )
          }

          /*
           * Verificados después
           */
          if (
            Boolean(
              b.verified
            ) !==
            Boolean(
              a.verified
            )
          ) {
            return Number(
              Boolean(
                b.verified
              )
            ) -
              Number(
                Boolean(
                  a.verified
                )
              )
          }

          /*
           * Mejor rating
           */
          return (
            Number(
              b.rating || 0
            ) -
            Number(
              a.rating || 0
            )
          )
        }
      )
      .slice(
        0,
        4
      )

  return (
    <>
      {/* ==================================================
          HERO
      ================================================== */}

      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0">
          <Image
            src="/images/hero-event-v2.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/20" />
        </div>

        <div className="relative mx-auto flex max-w-6xl flex-col gap-5 px-4 pb-20 pt-9 md:pb-28 md:pt-8">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            El marketplace de eventos hecho en Chile
          </span>

          <h1 className="max-w-3xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Arma tu evento completo, del asado a la última foto.
          </h1>

          <p className="max-w-xl text-pretty text-lg text-muted-foreground">
            Parrilleros, bartenders, garzones, catering, DJ y más.
            Cuéntanos tu presupuesto y armamos tu evento perfecto.
          </p>

          <HeroPlanner />
        </div>
      </section>

      {/* ==================================================
          CATEGORÍAS
      ================================================== */}

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Explora por categoría
            </h2>

            <p className="mt-1 text-muted-foreground">
              Todo lo que tu evento necesita, en un solo lugar.
            </p>
          </div>

          <Link
            href="/categorias"
            className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex"
          >
            Ver todas
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {CATEGORIES.map(
            category => (
              <CategoryCard
                key={
                  category.slug
                }
                category={
                  category
                }
              />
            )
          )}
        </div>
      </section>

      {/* ==================================================
          CÓMO FUNCIONA
      ================================================== */}

      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Cómo funciona
          </h2>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map(
              (
                step,
                index
              ) => (
                <div
                  key={
                    step.title
                  }
                  className="rounded-xl border border-border bg-card p-6"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <step.icon
                      size={
                        20
                      }
                    />
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">
                      0
                      {index +
                        1}
                    </span>

                    <h3 className="font-semibold">
                      {
                        step.title
                      }
                    </h3>
                  </div>

                  <p className="mt-2 text-pretty text-sm text-muted-foreground">
                    {
                      step.text
                    }
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* ==================================================
          PRESTADORES DESTACADOS
      ================================================== */}

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Prestadores destacados
            </h2>

            <p className="mt-1 text-muted-foreground">
              Conoce algunas de las alternativas disponibles en Brasa.
            </p>
          </div>

          <Link
            href="/proveedores"
            className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex"
          >
            Ver todos
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* =================================================
            CON PRESTADORES
        ================================================= */}

        {featured.length >
          0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map(
              provider => (
                <ProviderCard
                  key={
                    provider.id
                  }
                  provider={
                    provider
                  }
                />
              )
            )}
          </div>
        ) : (
          /* ===============================================
             SIN PRESTADORES
          =============================================== */

          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
            <h3 className="font-semibold">
              Estamos sumando prestadores
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Muy pronto encontrarás nuevas alternativas para organizar tu evento.
            </p>

            <Link
              href="/proveedores"
              className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Explorar prestadores
              <ArrowRight
                size={
                  15
                }
              />
            </Link>
          </div>
        )}
      </section>

      {/* ==================================================
          CTA
      ================================================== */}

      <section className="mx-auto max-w-6xl px-4 pb-8">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-primary px-6 py-14 text-center text-primary-foreground md:px-12">
          <h2 className="mx-auto max-w-2xl text-balance text-2xl font-bold tracking-tight md:text-4xl">
            ¿Listo para armar tu próximo evento?
          </h2>

          <p className="mx-auto mt-3 max-w-lg text-pretty text-primary-foreground/85">
            Dinos qué celebras y tu presupuesto. Nosotros nos encargamos del resto.
          </p>

          <Link
            href="/planificar"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-background px-6 py-3 text-sm font-semibold text-foreground transition-transform hover:scale-[1.02]"
          >
            Planificar mi evento

            <ArrowRight
              size={
                16
              }
            />
          </Link>
        </div>
      </section>
    </>
  )
}
