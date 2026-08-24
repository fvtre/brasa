"use client"

import * as React from "react"
import {
  Search,
  SlidersHorizontal,
  BadgeCheck,
  CalendarCheck2,
} from "lucide-react"

import type {
  Provider,
  CategorySlug,
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

export function ProviderExplorer({
  providers,
  initialCategory,
}: {
  providers: Provider[]
  initialCategory?: CategorySlug
}) {
  const [query, setQuery] =
    React.useState("")

  const [category, setCategory] =
    React.useState<
      CategorySlug | "all"
    >(initialCategory ?? "all")

  const [comuna, setComuna] =
    React.useState("all")

  const [
    verifiedOnly,
    setVerifiedOnly,
  ] = React.useState(false)

  const [
    availableOnly,
    setAvailableOnly,
  ] = React.useState(false)

  const [sort, setSort] =
    React.useState<SortKey>("rating")

  const filtered =
    React.useMemo(() => {
      const normalizedQuery =
        query
          .trim()
          .toLowerCase()

      const list =
        providers.filter(
          (provider) => {
            const hasServices =
              provider.services.length > 0

            const hasAvailability =
              provider.availableDays.length > 0

            const matchesQuery =
              !normalizedQuery ||
              [
                provider.name,
                provider.tagline,
                provider.comuna,
                provider.region,
                ...provider.coverage,
                ...provider.services.map(
                  (service) =>
                    service.name
                ),
              ]
                .join(" ")
                .toLowerCase()
                .includes(
                  normalizedQuery
                )

            const matchesCategory =
              category === "all" ||
              provider.category ===
                category

            const matchesComuna =
              comuna === "all" ||
              provider.coverage.includes(
                comuna
              ) ||
              provider.comuna ===
                comuna

            const matchesVerified =
              !verifiedOnly ||
              provider.verified

            const matchesAvailability =
              !availableOnly ||
              hasAvailability

            return (
              hasServices &&
              matchesQuery &&
              matchesCategory &&
              matchesComuna &&
              matchesVerified &&
              matchesAvailability
            )
          }
        )

      return [...list].sort(
        (a, b) => {
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
    ])

  const activeFilters =
    [
      category !== "all",
      comuna !== "all",
      verifiedOnly,
      availableOnly,
      query.trim().length > 0,
    ].filter(Boolean).length

  function resetFilters() {
    setQuery("")
    setCategory(
      initialCategory ?? "all"
    )
    setComuna("all")
    setVerifiedOnly(false)
    setAvailableOnly(false)
    setSort("rating")
  }

  return (
    <div>
      <div className="mb-6 space-y-4 rounded-2xl border bg-card p-4">
        {/* BUSCADOR */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />

          <Input
            value={query}
            onChange={(e) =>
              setQuery(
                e.target.value
              )
            }
            placeholder="Buscar prestador, comuna o servicio…"
            className="pl-11"
          />
        </div>

        {/* CATEGORÍAS */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setCategory("all")
            }
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition",
              category === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            Todas
          </button>

          {CATEGORIES.map(
            (item) => (
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

        {/* FILTROS */}
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
          <select
            value={comuna}
            onChange={(e) =>
              setComuna(
                e.target.value
              )
            }
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="all">
              Todas las comunas
            </option>

            {COMUNAS.map(
              (item) => (
                <option
                  key={item}
                  value={item}
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
                (value) =>
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

          <button
            type="button"
            onClick={() =>
              setAvailableOnly(
                (value) =>
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

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <SlidersHorizontal
              size={15}
            />

            <select
              value={sort}
              onChange={(e) =>
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

        {/* FILTROS ACTIVOS */}
        {activeFilters > 0 && (
          <div className="flex items-center justify-between border-t pt-3">
            <p className="text-xs text-muted-foreground">
              {activeFilters}{" "}
              {activeFilters === 1
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

      {/* RESULTADOS */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {filtered.length}{" "}
          {filtered.length === 1
            ? "prestador"
            : "prestadores"}
        </p>
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(
            (provider) => (
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
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Search className="mx-auto size-8 text-muted-foreground/40" />

          <p className="mt-3 font-medium">
            No encontramos
            prestadores
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Prueba cambiando los
            filtros o la comuna.
          </p>

          <button
            type="button"
            onClick={
              resetFilters
            }
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  )
}