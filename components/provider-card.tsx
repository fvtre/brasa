import Link from "next/link"
import Image from "next/image"

import {
  BadgeCheck,
  MapPin,
  CalendarCheck2,
  BriefcaseBusiness,
} from "lucide-react"

import type { Provider } from "@/lib/types"
import { getCategory } from "@/lib/catalog"
import { formatCLP } from "@/lib/format"
import { StarRating } from "@/components/star-rating"
import { CategoryIcon } from "@/components/category-icon"
import { Badge } from "@/components/ui/badge"

export function ProviderCard({
  provider,
}: {
  provider: Provider
}) {
  const category =
    getCategory(provider.category)

  const hasAvailability =
    provider.availableDays.length > 0

  const servicesCount =
    provider.services.length

  const image =
    provider.image ||
    provider.gallery?.[0] ||
    category?.image ||
    "/placeholder.svg"

  return (
    <Link
      href={`/proveedores/${provider.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      {/* IMAGEN */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={image}
          alt={`Trabajo de ${provider.name}`}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Degradado */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Categoría */}
        <div className="absolute left-3 top-3">
          {category && (
            <Badge
              variant="secondary"
              className="bg-background/90 text-foreground shadow-sm backdrop-blur"
            >
              <CategoryIcon
                name={category.icon}
                size={12}
              />

              {category.name}
            </Badge>
          )}
        </div>

        {/* Verificado */}
        {provider.verified && (
          <Badge
            variant="success"
            className="absolute right-3 top-3 shadow-sm backdrop-blur"
          >
            <BadgeCheck size={12} />
            Verificado
          </Badge>
        )}

        {/* Disponibilidad */}
        {hasAvailability && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur">
            <CalendarCheck2
              size={13}
              className="text-primary"
            />

            Con disponibilidad
          </div>
        )}
      </div>

      {/* INFORMACIÓN */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold leading-tight">
              {provider.name}
            </h3>

            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin size={14} />

              <span className="truncate">
                {provider.comuna}
              </span>
            </div>
          </div>

          <StarRating
            rating={provider.rating}
            reviews={provider.reviews}
            className="shrink-0"
          />
        </div>

        {/* PRESENTACIÓN */}
        <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-relaxed text-muted-foreground">
          {provider.tagline}
        </p>

        {/* INFO EXTRA */}
        <div className="mt-4 flex flex-wrap gap-2">
          {servicesCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              <BriefcaseBusiness size={12} />

              {servicesCount}{" "}
              {servicesCount === 1
                ? "servicio"
                : "servicios"}
            </span>
          )}

          {provider.experienceYears > 0 && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              {provider.experienceYears}{" "}
              {provider.experienceYears === 1
                ? "año"
                : "años"}{" "}
              de experiencia
            </span>
          )}
        </div>

        {/* PRECIO */}
        <div className="mt-auto pt-5">
          <div className="border-t pt-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  Desde
                </p>

                <p className="text-xl font-extrabold text-foreground">
                  {formatCLP(
                    provider.priceFrom
                  )}
                </p>
              </div>

              <span className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition group-hover:bg-primary/90">
                Ver perfil
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}