import type { Metadata } from "next"
import { CATEGORIES } from "@/lib/catalog"
import { CategoryCard } from "@/components/category-card"

export const metadata: Metadata = {
  title: "Categorías — Brasa",
  description: "Explora todas las categorías de servicios para tu evento en Chile.",
}

export default function CategoriasPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Categorías</h1>
        <p className="mt-2 max-w-xl text-muted-foreground text-pretty">
          Desde el clásico asado chileno hasta la fotografía de tu evento. Elige una categoría para ver a los proveedores.
        </p>
      </header>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {CATEGORIES.map((category) => (
          <CategoryCard key={category.slug} category={category} />
        ))}
      </div>
    </div>
  )
}
