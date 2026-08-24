import type { Metadata } from "next"

import { EventTracker } from "@/components/event-tracker"
import { requireRole } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Mi evento — Brasa",
  description:
    "Controla tu presupuesto y los servicios que agregaste para tu evento.",
}

export default async function MiEventoPage() {
  await requireRole([
    "cliente",
    "administrador",
  ])

  return <EventTracker />
}