import type { ReactNode } from "react"

import { requireRole } from "@/lib/auth"

export default async function CheckoutLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireRole([
    "cliente",
    "administrador",
  ])

  return children
}