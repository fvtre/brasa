import Link from "next/link"
import Image from "next/image"
import { ArrowUpRight } from "lucide-react"
import type { Category } from "@/lib/types"
import { formatCLP } from "@/lib/format"
import { CategoryIcon } from "@/components/category-icon"

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/categorias/${category.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[5/4] overflow-hidden">
        <Image
          src={category.image || "/placeholder.svg"}
          alt={category.name}
          fill
          sizes="(max-width: 768px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-background/90 text-primary backdrop-blur">
          <CategoryIcon name={category.icon} size={18} />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-balance">{category.name}</h3>
            <ArrowUpRight size={18} className="shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
          <p className="text-sm text-white/80">Desde {formatCLP(category.priceFrom)}</p>
        </div>
      </div>
    </Link>
  )
}
