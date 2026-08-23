import type { Metadata } from "next"
import { EventTracker } from "@/components/event-tracker"

export const metadata: Metadata = {
  title: "Mi evento — Brasa",
  description: "Controla tu presupuesto y los servicios que agregaste para tu evento.",
}

export default function MiEventoPage() {
  return <EventTracker />
}
