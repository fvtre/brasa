"use client"

import * as React from "react"
import type { CategorySlug } from "@/lib/types"

export interface EventSelection {
  providerId: string
  providerName: string
  category: CategorySlug
  serviceId: string
  serviceName: string
  /** Base price defined by the provider. Per-person services are multiplied by guests. */
  price: number
  unit: string
}

export interface Booking {
  id: string
  createdAt: string
  status: "solicitud_enviada" | "confirmada" | "en_preparacion" | "completada" | "cancelada"
  eventName: string
  date: string
  time: string
  comuna?: string
  address: string
  guests: number
  budget: number
  total: number
  contactName: string
  contactEmail: string
  contactPhone: string
  notes: string
  selections: EventSelection[]
}

interface EventState {
  budget: number
  guests: number
  comuna?: string
  selections: EventSelection[]
  bookings: Booking[]
  hydrated: boolean
  setBudget: (v: number) => void
  setGuests: (v: number) => void
  setComuna: (v: string | undefined) => void
  addSelection: (s: EventSelection) => void
  removeSelection: (serviceId: string, providerId?: string) => void
  clear: () => void
  total: number
  has: (serviceId: string, providerId?: string) => boolean
  selectionTotal: (s: EventSelection) => number
  createBooking: (data: Omit<Booking, "id" | "createdAt" | "status" | "guests" | "budget" | "total" | "selections" | "comuna">) => Booking
}

const EventContext = React.createContext<EventState | null>(null)
const STORAGE_KEY = "brasa-event-v3"
const BOOKINGS_KEY = "brasa-bookings-v1"

function serviceKey(serviceId: string, providerId?: string) {
  return providerId ? `${providerId}:${serviceId}` : serviceId
}

export function EventProvider({ children }: { children: React.ReactNode }) {
  const [budget, setBudget] = React.useState(500000)
  const [guests, setGuests] = React.useState(30)
  const [comuna, setComuna] = React.useState<string | undefined>(undefined)
  const [selections, setSelections] = React.useState<EventSelection[]>([])
  const [bookings, setBookings] = React.useState<Booking[]>([])
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (Number.isFinite(saved.budget)) setBudget(saved.budget)
        if (Number.isFinite(saved.guests)) setGuests(saved.guests)
        if (typeof saved.comuna === "string") setComuna(saved.comuna)
        if (Array.isArray(saved.selections)) setSelections(saved.selections)
      }
      const savedBookings = window.localStorage.getItem(BOOKINGS_KEY)
      if (savedBookings) setBookings(JSON.parse(savedBookings))
    } catch (error) {
      console.error("No se pudo restaurar el evento local", error)
    } finally {
      setHydrated(true)
    }
  }, [])

  React.useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ budget, guests, comuna, selections }),
    )
  }, [budget, guests, comuna, selections, hydrated])

  React.useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings))
  }, [bookings, hydrated])

  const selectionTotal = React.useCallback(
    (s: EventSelection) => {
      const unit = s.unit.toLowerCase()
      if (unit.includes("persona")) return s.price * Math.max(1, guests)
      return s.price
    },
    [guests],
  )

  const addSelection = React.useCallback((s: EventSelection) => {
    setSelections((prev) => {
      const key = serviceKey(s.serviceId, s.providerId)
      const filtered = prev.filter((p) => serviceKey(p.serviceId, p.providerId) !== key)
      return [...filtered, s]
    })
  }, [])

  const removeSelection = React.useCallback((serviceId: string, providerId?: string) => {
    const key = serviceKey(serviceId, providerId)
    setSelections((prev) =>
      prev.filter((p) => {
        if (providerId) return serviceKey(p.serviceId, p.providerId) !== key
        return p.serviceId !== serviceId
      }),
    )
  }, [])

  const clear = React.useCallback(() => setSelections([]), [])

  const total = React.useMemo(
    () => selections.reduce((sum, s) => sum + selectionTotal(s), 0),
    [selections, selectionTotal],
  )

  const has = React.useCallback(
    (serviceId: string, providerId?: string) => {
      if (providerId) return selections.some((s) => s.serviceId === serviceId && s.providerId === providerId)
      return selections.some((s) => s.serviceId === serviceId)
    },
    [selections],
  )

  const createBooking = React.useCallback(
    (data: Omit<Booking, "id" | "createdAt" | "status" | "guests" | "budget" | "total" | "selections" | "comuna">) => {
      const booking: Booking = {
        ...data,
        id: `BR-${Date.now().toString().slice(-8)}`,
        createdAt: new Date().toISOString(),
        status: "solicitud_enviada",
        guests,
        budget,
        comuna,
        total,
        selections: [...selections],
      }
      setBookings((prev) => [booking, ...prev])
      return booking
    },
    [guests, budget, comuna, total, selections],
  )

  const value: EventState = {
    budget,
    guests,
    comuna,
    selections,
    bookings,
    hydrated,
    setBudget,
    setGuests,
    setComuna,
    addSelection,
    removeSelection,
    clear,
    total,
    has,
    selectionTotal,
    createBooking,
  }

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>
}

export function useEvent() {
  const ctx = React.useContext(EventContext)
  if (!ctx) throw new Error("useEvent must be used within EventProvider")
  return ctx
}
