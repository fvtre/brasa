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
  name: string
  description: string
  price: number
  /** e.g. "por evento", "por persona", "por hora" */
  unit: string
  popular?: boolean
}

export interface Review {
  author: string
  rating: number
  date: string
  comment: string
}

export interface Provider {
  id: string
  name: string
  category: CategorySlug
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
