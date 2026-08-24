import type { Metadata } from "next"
import { Suspense } from "react"

import { PlanView } from "@/components/plan-view"
import { requireRole } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Planificar evento — Brasa",
  description:
    "Describe tu evento y arma un plan con proveedores según tu presupuesto.",
}

export default async function PlanificarPage() {
  await requireRole([
    "cliente",
    "administrador",
  ])

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-16 text-muted-foreground">
          Cargando planificador…
        </div>
      }
    >
      <PlanView />
    </Suspense>
  )
}