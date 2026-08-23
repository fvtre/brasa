import Link from "next/link"
import Image from "next/image"
import { BadgeCheck, MapPin } from "lucide-react"
import type { Provider } from "@/lib/types"
import { getCategory } from "@/lib/catalog"
import { formatCLP } from "@/lib/format"
import { StarRating } from "@/components/star-rating"
import { CategoryIcon } from "@/components/category-icon"
import { Badge } from "@/components/ui/badge"

export function ProviderCard({ provider }: { provider: Provider }) {
  const category = getCategory(provider.category)

  return (
    <Link
      href={`/proveedores/${provider.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={provider.image || "/placeholder.svg"}
          alt={`Trabajo de ${provider.name}`}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          {category && (
            <Badge variant="secondary" className="bg-background/90 text-foreground backdrop-blur">
              <CategoryIcon name={category.icon} size={12} />
              {category.name}
            </Badge>
          )}
        </div>
        {provider.verified && (
          <Badge variant="success" className="absolute right-3 top-3 backdrop-blur">
            <BadgeCheck size={12} />
            Verificado
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight text-balance">{provider.name}</h3>
          <StarRating rating={provider.rating} reviews={provider.reviews} className="shrink-0" />
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 text-pretty">{provider.tagline}</p>
        <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin size={14} />
          {provider.comuna}
        </div>
        <div className="mt-auto pt-2 text-sm">
          <span className="text-muted-foreground">Desde </span>
          <span className="font-semibold text-foreground">{formatCLP(provider.priceFrom)}</span>
        </div>
      </div>
    </Link>
  )
}
