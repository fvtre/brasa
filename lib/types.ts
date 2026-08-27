export type CategorySlug =
  | "parrilleros"
  | "bartenders"
  | "garzones"
  | "catering"
  | "pasteleria"
  | "dj"
  | "decoracion"
  | "fotografia"
  | "mobiliario"
  | "parrilleros-veganos"

export interface Category {
  slug: CategorySlug
  name: string
  /** lucide-react icon name */
  icon: string
  tagline: string
  description: string
  /** representative image path */
  image: string
  /** typical starting price in CLP */
  priceFrom: number
}

export interface ProviderService {
  id: string
  category_slug: CategorySlug
  name: string
  description: string
  price: number

  /** por evento | por persona | por hora */
  unit: string

  popular?: boolean

  // Capacidad
  min_guests?: number | null
  max_guests?: number | null

  // Duración
  duration_hours?: number | null
  extra_hour_price?: number | null
  schedule_mode?: "continuous" | "delivery_pickup"
  inventory_capacity?: number | null
  buffer_before_minutes?: number
  buffer_after_minutes?: number

  // Parrilla
  grill_available?: boolean
  grill_price?: number

  // Traslado
  transport_available?: boolean
  transport_price?: number

  // Gestión de compras
  shopping_available?: boolean
  shopping_fee_type?: "fixed" | "percentage"
  shopping_fee?: number

  // Paquete Full Brasa
  full_package_enabled?: boolean
  full_package_discount_type?: "percentage" | "fixed"
  full_package_discount?: number

  // Detalle
  includes?: string[]
  excludes?: string[]
}

export interface Review {
  author: string
  rating: number
  date: string
  comment: string
}

export interface ProviderCategoryProfile {
  category_slug: CategorySlug
  description: string
  coverImage: string
  gallery: string[]
  availableDays: number[]
}

export interface Provider {
  id: string
  name: string
  category: CategorySlug
  categories: CategorySlug[]
  categoryProfiles: ProviderCategoryProfile[]
  comuna: string
  region: string
  rating: number
  reviews: number
  priceFrom: number
  verified: boolean
  featured?: boolean
  image: string
  gallery: string[]
  tagline: string
  bio: string
  experienceYears: number
  eventsDone: number
  coverage: string[]
  /** ISO weekday availability, 0 = Sunday */
  availableDays: number[]
  services: ProviderService[]
  reviewList: Review[]
}
