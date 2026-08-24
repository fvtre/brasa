"use client"

import * as React from "react"

import {
  BadgeCheck,
  CalendarCheck2,
  LoaderCircle,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"

import type {
  CategorySlug,
  Provider,
} from "@/lib/types"

import {
  CATEGORIES,
  COMUNAS,
} from "@/lib/catalog"

import { Input } from "@/components/ui/input"
import { ProviderCard } from "@/components/provider-card"
import { cn } from "@/lib/utils"

type SortKey =
  | "rating"
  | "price-asc"
  | "price-desc"
  | "experience"

type EventContext = {
  date: string
  time: string
  guests: number
  category?: string
}

type AlternativeRow = {
  provider_id: string
  provider_slug: string
  service_id: string
  business_name: string
  category_slug: string
  comuna: string | null
  rating: number | null
  verified: boolean
  featured: boolean
  service_name: string
  price: number
  unit: string | null
  duration_hours: number
  image_url: string | null
}

export function ProviderExplorer({
  providers,
  initialCategory,
  eventContext,
}: {
  providers: Provider[]
  initialCategory?: CategorySlug
  eventContext?: EventContext
}) {
  const supabase =
    React.useMemo(
      () => createClient(),
      []
    )

  const [
    query,
    setQuery,
  ] =
    React.useState("")

  const [
    category,
    setCategory,
  ] =
    React.useState<
      CategorySlug | "all"
    >(
      initialCategory ??
      (
        eventContext?.category as
        | CategorySlug
        | undefined
      ) ??
      "all"
    )

  const [
    comuna,
    setComuna,
  ] =
    React.useState("all")

  const [
    verifiedOnly,
    setVerifiedOnly,
  ] =
    React.useState(false)

  const [
    availableOnly,
    setAvailableOnly,
  ] =
    React.useState(false)

  const [
    sort,
    setSort,
  ] =
    React.useState<SortKey>(
      "rating"
    )

  const [
    availableProviderIds,
    setAvailableProviderIds,
  ] =
    React.useState<
      Set<string> | null
    >(null)

  const [
    alternativeRows,
    setAlternativeRows,
  ] =
    React.useState<
      AlternativeRow[]
    >([])

  const [
    loadingAlternatives,
    setLoadingAlternatives,
  ] =
    React.useState(false)

  const [
    alternativesError,
    setAlternativesError,
  ] =
    React.useState("")

  const [
    aiRecommendation,
    setAiRecommendation,
  ] =
    React.useState<any>(null)

  const [
    loadingAi,
    setLoadingAi,
  ] =
    React.useState(false)

  const [
    aiError,
    setAiError,
  ] =
    React.useState("")

  const alternativeMode =
    Boolean(
      eventContext?.date &&
      eventContext?.time
    )

  /* ======================================================
     SINCRONIZAR CATEGORÍA
  ====================================================== */

  React.useEffect(() => {
    if (
      eventContext?.category
    ) {
      setCategory(
        eventContext.category as CategorySlug
      )
    }
  }, [
    eventContext?.category,
  ])

  /* ======================================================
     BUSCAR ALTERNATIVAS REALES
  ====================================================== */

  React.useEffect(() => {
    if (
      !alternativeMode
    ) {
      setAvailableProviderIds(
        null
      )

      setAlternativeRows([])

      setAlternativesError("")

      return
    }

    const categoryToSearch =
      eventContext?.category ||
      (
        category !== "all"
          ? category
          : undefined
      )

    if (
      !categoryToSearch ||
      !eventContext?.date ||
      !eventContext?.time
    ) {
      setAvailableProviderIds(
        null
      )

      setAlternativeRows([])

      return
    }

    let cancelled =
      false

    async function loadAlternatives() {
      setLoadingAlternatives(
        true
      )

      setAlternativesError("")

      try {
        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_available_provider_alternatives",
            {
              p_category:
                categoryToSearch,

              p_event_date:
                eventContext!.date,

              p_event_time:
                eventContext!.time,

              p_guests:
                eventContext!.guests ||
                0,
            }
          )

        if (error) {
          throw error
        }

        if (cancelled) {
          return
        }

        const rows =
          (
            data ||
            []
          ) as AlternativeRow[]

        const ids =
          new Set<string>(
            rows.map(
              row =>
                String(
                  row.provider_slug
                )
            )
          )

        setAlternativeRows(
          rows
        )

        setAvailableProviderIds(
          ids
        )
      } catch (
      error: any
      ) {
        console.error(
          "Error buscando alternativas:",
          error
        )

        if (
          !cancelled
        ) {
          setAlternativesError(
            error?.message ||
            "No se pudieron buscar prestadores disponibles."
          )

          setAlternativeRows(
            []
          )

          setAvailableProviderIds(
            new Set()
          )
        }
      } finally {
        if (
          !cancelled
        ) {
          setLoadingAlternatives(
            false
          )
        }
      }
    }

    loadAlternatives()

    return () => {
      cancelled = true
    }
  }, [
    alternativeMode,
    eventContext?.date,
    eventContext?.time,
    eventContext?.guests,
    eventContext?.category,
    category,
    supabase,
  ])

  /* ======================================================
     RECOMENDACIÓN IA
  ====================================================== */

  React.useEffect(() => {
    if (
      !alternativeMode ||
      alternativeRows.length ===
      0 ||
      !eventContext?.category
    ) {
      setAiRecommendation(
        null
      )

      setAiError("")

      return
    }

    let cancelled =
      false

    async function loadAiRecommendation() {
      setLoadingAi(
        true
      )

      setAiError("")

      try {
        const providersForAi =
          alternativeRows.map(
            row => ({
              id:
                row.provider_slug,

              name:
                row.business_name,

              rating:
                row.rating,

              price:
                row.price,

              unit:
                row.unit ||
                "por evento",

              verified:
                row.verified,

              featured:
                row.featured,

              comuna:
                row.comuna,

              serviceName:
                row.service_name,

              durationHours:
                row.duration_hours,
            })
          )

        const response =
          await fetch(
            "/api/ai/recommend-providers",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  event: {
                    date:
                      eventContext!.date,

                    time:
                      eventContext!.time,

                    guests:
                      eventContext!.guests,

                    category:
                      eventContext!.category,
                  },

                  providers:
                    providersForAi,
                }),
            }
          )

        const data =
          await response.json()

        if (
          !response.ok
        ) {
          throw new Error(
            data?.error ||
            "No se pudo generar la recomendación."
          )
        }

        if (
          !cancelled
        ) {
          setAiRecommendation(
            data
          )
        }
      } catch (
      error: any
      ) {
        console.error(
          "Error IA:",
          error
        )

        if (
          !cancelled
        ) {
          setAiError(
            error?.message ||
            "No se pudo generar la recomendación."
          )
        }
      } finally {
        if (
          !cancelled
        ) {
          setLoadingAi(
            false
          )
        }
      }
    }

    loadAiRecommendation()

    return () => {
      cancelled = true
    }
  }, [
    alternativeMode,
    alternativeRows,
    eventContext?.date,
    eventContext?.time,
    eventContext?.guests,
    eventContext?.category,
  ])

  /* ======================================================
     FILTRAR RESULTADOS
  ====================================================== */

  const filtered =
    React.useMemo(() => {
      const normalizedQuery =
        query
          .trim()
          .toLowerCase()

      const list =
        providers.filter(
          provider => {
            const hasServices =
              provider.services
                .length > 0

            const hasAvailability =
              provider.availableDays
                .length > 0

            const matchesRealAvailability =
              !alternativeMode ||
              availableProviderIds ===
              null ||
              availableProviderIds.has(
                provider.id
              )

            const matchesQuery =
              !normalizedQuery ||
              [
                provider.name,
                provider.tagline,
                provider.comuna,
                provider.region,
                ...provider.coverage,

                ...provider.services.map(
                  service =>
                    service.name
                ),
              ]
                .join(" ")
                .toLowerCase()
                .includes(
                  normalizedQuery
                )

            const matchesCategory =
              category ===
              "all" ||
              provider.category ===
              category

            const matchesComuna =
              comuna ===
              "all" ||
              provider.coverage.includes(
                comuna
              ) ||
              provider.comuna ===
              comuna

            const matchesVerified =
              !verifiedOnly ||
              provider.verified

            const matchesAvailability =
              alternativeMode
                ? true
                : !availableOnly ||
                hasAvailability

            return (
              hasServices &&
              matchesQuery &&
              matchesCategory &&
              matchesComuna &&
              matchesVerified &&
              matchesAvailability &&
              matchesRealAvailability
            )
          }
        )

      return [
        ...list,
      ].sort(
        (
          a,
          b
        ) => {
          switch (sort) {
            case "price-asc":
              return (
                a.priceFrom -
                b.priceFrom
              )

            case "price-desc":
              return (
                b.priceFrom -
                a.priceFrom
              )

            case "experience":
              return (
                b.experienceYears -
                a.experienceYears
              )

            case "rating":
            default:
              return (
                b.rating -
                a.rating
              )
          }
        }
      )
    }, [
      providers,
      category,
      comuna,
      verifiedOnly,
      availableOnly,
      query,
      sort,
      alternativeMode,
      availableProviderIds,
    ])

  /* ======================================================
     FILTROS
  ====================================================== */

  const activeFilters =
    [
      !alternativeMode &&
      category !==
      "all",

      comuna !== "all",

      verifiedOnly,

      !alternativeMode &&
      availableOnly,

      query.trim()
        .length > 0,
    ].filter(Boolean)
      .length

  function resetFilters() {
    setQuery("")

    setCategory(
      (
        eventContext?.category as
        | CategorySlug
        | undefined
      ) ??
      initialCategory ??
      "all"
    )

    setComuna("all")

    setVerifiedOnly(
      false
    )

    setAvailableOnly(
      false
    )

    setSort("rating")
  }

  /* ======================================================
     DATOS ALTERNATIVA
  ====================================================== */

  const availableServices =
    alternativeRows.length

  const searchCategory =
    eventContext?.category ||
    (
      category !==
        "all"
        ? category
        : undefined
    )

  const categoryName =
    CATEGORIES.find(
      item =>
        item.slug ===
        searchCategory
    )?.name

  const recommendedProvider =
    providers.find(
      provider =>
        provider.id ===
        aiRecommendation
          ?.recommendedProviderId
    )

  const recommendedRanking =
    aiRecommendation
      ?.ranking?.[0]

  /* ======================================================
     UI
  ====================================================== */

  return (
    <div>

      {/* ==================================================
          SIN CATEGORÍA
      ================================================== */}

      {alternativeMode &&
        !searchCategory && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">

            <p className="font-medium text-amber-700">
              Selecciona qué tipo de prestador necesitas reemplazar
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Elige una categoría para buscar alternativas disponibles para la misma fecha y hora.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {CATEGORIES.map(
                item => (
                  <button
                    key={
                      item.slug
                    }
                    type="button"
                    onClick={() =>
                      setCategory(
                        item.slug
                      )
                    }
                    className="rounded-full border border-border px-3 py-1.5 text-sm transition hover:bg-muted"
                  >
                    {item.name}
                  </button>
                )
              )}
            </div>
          </div>
        )}

      {/* ==================================================
          CARGANDO DISPONIBILIDAD
      ================================================== */}

      {alternativeMode &&
        loadingAlternatives && (
          <div className="mb-6 flex items-center justify-center gap-3 rounded-xl border bg-muted/30 p-5">

            <LoaderCircle className="size-5 animate-spin text-primary" />

            <div>
              <p className="text-sm font-medium">
                Buscando prestadores disponibles...
              </p>

              <p className="text-xs text-muted-foreground">
                Verificando agenda y duración de servicios.
              </p>
            </div>
          </div>
        )}

      {/* ==================================================
          ERROR DISPONIBILIDAD
      ================================================== */}

      {alternativesError && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4">

          <p className="text-sm font-medium text-destructive">
            {alternativesError}
          </p>
        </div>
      )}

      {/* ==================================================
          IA CARGANDO
      ================================================== */}

      {alternativeMode &&
        !loadingAlternatives &&
        loadingAi && (
          <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-5">

            <div className="flex items-center gap-3">

              <LoaderCircle className="size-5 animate-spin text-primary" />

              <div>
                <p className="font-semibold">
                  Brasa IA está comparando las alternativas
                </p>

                <p className="text-sm text-muted-foreground">
                  Analizando precio, evaluación y ajuste a tu evento.
                </p>
              </div>
            </div>
          </div>
        )}

      {/* ==================================================
          RECOMENDACIÓN IA
      ================================================== */}

      {alternativeMode &&
        aiRecommendation
          ?.recommendedProviderId && (
          <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-5">

            <div className="flex items-start gap-4">

              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Sparkles className="size-5" />
              </div>

              <div className="min-w-0 flex-1">

                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Recomendación Brasa IA
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-3">

                  <h2 className="text-xl font-bold">
                    {recommendedProvider
                      ?.name ||
                      "Prestador recomendado"}
                  </h2>

                  {recommendedRanking
                    ?.score !==
                    undefined && (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {
                          recommendedRanking
                            .score
                        }
                        /100
                      </span>
                    )}
                </div>

                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  {
                    aiRecommendation
                      .reason
                  }
                </p>

                {Array.isArray(
                  recommendedRanking
                    ?.reasons
                ) &&
                  recommendedRanking
                    .reasons
                    .length >
                  0 && (
                    <div className="mt-4">

                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Por qué te lo recomendamos
                      </p>

                      <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {recommendedRanking
                          .reasons
                          .map(
                            (
                              reason: string,
                              index: number
                            ) => (
                              <li
                                key={
                                  index
                                }
                                className="flex items-start gap-2 text-sm text-muted-foreground"
                              >
                                <span className="mt-0.5 font-semibold text-primary">
                                  ✓
                                </span>

                                <span>
                                  {
                                    reason
                                  }
                                </span>
                              </li>
                            )
                          )}
                      </ul>
                    </div>
                  )}

                {categoryName && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Recomendación para{" "}
                    <strong className="text-foreground">
                      {categoryName}
                    </strong>
                    .
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

      {/* ==================================================
          ERROR IA
      ================================================== */}

      {alternativeMode &&
        aiError && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">

            <p className="text-sm text-muted-foreground">
              La recomendación inteligente no está disponible en este momento. Puedes seguir eligiendo entre las alternativas disponibles.
            </p>
          </div>
        )}

      {/* ==================================================
          RESUMEN RESULTADOS ALTERNATIVA
      ================================================== */}

      {alternativeMode &&
        !loadingAlternatives &&
        searchCategory && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

            <p className="text-sm font-medium">
              {filtered.length}{" "}
              {filtered.length ===
                1
                ? "prestador disponible"
                : "prestadores disponibles"}
            </p>

            {availableServices >
              0 && (
                <span className="text-xs text-muted-foreground">
                  {
                    availableServices
                  }{" "}
                  {availableServices ===
                    1
                    ? "opción de servicio compatible"
                    : "opciones de servicio compatibles"}
                </span>
              )}
          </div>
        )}

      {/* ==================================================
          FILTROS
      ================================================== */}

      <div className="mb-6 space-y-4 rounded-2xl border bg-card p-4">

        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />

          <Input
            value={
              query
            }
            onChange={
              e =>
                setQuery(
                  e.target
                    .value
                )
            }
            placeholder={
              alternativeMode
                ? "Buscar dentro de las alternativas..."
                : "Buscar prestador, comuna o servicio…"
            }
            className="pl-11"
          />
        </div>

        {/* ===============================================
            CATEGORÍAS SOLO MARKETPLACE NORMAL
        =============================================== */}

        {!alternativeMode && (
          <div className="flex flex-wrap gap-2">

            <button
              type="button"
              onClick={() =>
                setCategory(
                  "all"
                )
              }
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition",

                category ===
                  "all"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              Todas
            </button>

            {CATEGORIES.map(
              item => (
                <button
                  key={
                    item.slug
                  }
                  type="button"
                  onClick={() =>
                    setCategory(
                      item.slug
                    )
                  }
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition",

                    category ===
                      item.slug
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {item.name}
                </button>
              )
            )}
          </div>
        )}

        {/* ===============================================
            FILTROS SECUNDARIOS
        =============================================== */}

        <div
          className={
            alternativeMode
              ? "grid gap-3 md:grid-cols-[1fr_auto_auto]"
              : "grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]"
          }
        >

          <select
            value={
              comuna
            }
            onChange={
              e =>
                setComuna(
                  e.target
                    .value
                )
            }
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          >

            <option value="all">
              Todas las comunas
            </option>

            {COMUNAS.map(
              item => (
                <option
                  key={
                    item
                  }
                  value={
                    item
                  }
                >
                  {item}
                </option>
              )
            )}
          </select>

          <button
            type="button"
            onClick={() =>
              setVerifiedOnly(
                value =>
                  !value
              )
            }
            className={cn(
              "inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm transition",

              verifiedOnly
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-muted"
            )}
          >
            <BadgeCheck
              size={15}
            />

            Verificados
          </button>

          {!alternativeMode && (
            <button
              type="button"
              onClick={() =>
                setAvailableOnly(
                  value =>
                    !value
                )
              }
              className={cn(
                "inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm transition",

                availableOnly
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              )}
            >
              <CalendarCheck2
                size={15}
              />

              Con disponibilidad
            </button>
          )}

          <label className="flex items-center gap-2 text-sm text-muted-foreground">

            <SlidersHorizontal
              size={15}
            />

            <select
              value={
                sort
              }
              onChange={
                e =>
                  setSort(
                    e.target
                      .value as SortKey
                  )
              }
              className="h-10 rounded-lg border border-border bg-background px-2"
            >

              <option value="rating">
                Mejor evaluados
              </option>

              <option value="price-asc">
                Menor precio
              </option>

              <option value="price-desc">
                Mayor precio
              </option>

              <option value="experience">
                Más experiencia
              </option>
            </select>
          </label>
        </div>

        {activeFilters >
          0 && (
            <div className="flex items-center justify-between border-t pt-3">

              <p className="text-xs text-muted-foreground">
                {
                  activeFilters
                }{" "}
                {activeFilters ===
                  1
                  ? "filtro activo"
                  : "filtros activos"}
              </p>

              <button
                type="button"
                onClick={
                  resetFilters
                }
                className="text-xs font-medium text-primary hover:underline"
              >
                Limpiar filtros
              </button>
            </div>
          )}
      </div>

      {/* ==================================================
          RESULTADOS
      ================================================== */}

      {!loadingAlternatives && (
        <>

          {!alternativeMode && (
            <div className="mb-4 flex items-center justify-between gap-4">

              <p className="text-sm text-muted-foreground">
                {
                  filtered.length
                }{" "}
                {filtered.length ===
                  1
                  ? "prestador"
                  : "prestadores"}
              </p>
            </div>
          )}

          {filtered.length >
            0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

              {filtered.map(
                provider => (
                  <div
                    key={
                      provider.id
                    }
                    className="relative"
                  >

                    {alternativeMode &&
                      provider.id ===
                      aiRecommendation
                        ?.recommendedProviderId && (
                        <div className="pointer-events-none absolute left-3 top-3 z-20 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground shadow-sm">
                          <Sparkles className="size-3" />
                          Recomendado por IA
                        </div>
                      )}

                    <ProviderCard
                      provider={
                        provider
                      }
                    />
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-12 text-center">

              <Search className="mx-auto size-8 text-muted-foreground/40" />

              <p className="mt-3 font-medium">
                {alternativeMode &&
                  searchCategory
                  ? "No hay alternativas disponibles para este horario"
                  : "No encontramos prestadores"}
              </p>

              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                {alternativeMode &&
                  searchCategory
                  ? "Prueba con otra hora o fecha para encontrar más opciones."
                  : "Prueba cambiando los filtros o la comuna."}
              </p>

              {activeFilters >
                0 && (
                  <button
                    type="button"
                    onClick={
                      resetFilters
                    }
                    className="mt-4 text-sm font-medium text-primary hover:underline"
                  >
                    Limpiar filtros
                  </button>
                )}
            </div>
          )}
        </>
      )}
    </div>
  )
}