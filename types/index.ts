// ─── Meal / Recipe ────────────────────────────────────────────────────────────

export type DietaryTag = 'vegan' | 'végétarien' | 'halal' | 'sans-gluten' | 'sans-lactose' | 'sans-noix'

export type Continent = 'Europe' | 'Afrique' | 'Asie' | 'Amériques' | 'Moyen-Orient' | 'Océanie'

export interface Meal {
  id: string
  name: string
  description: string
  image: string
  portions: string
  prepTime: number // minutes
  dietaryTags: DietaryTag[]
  allergens: string[]
  calories?: number
  continent?: Continent
  country?: string
  isFeatured?: boolean
  price?: number
}

export interface Recipe extends Meal {
  continent: Continent
  country: string
  ingredients: string[]
  steps: string[]
  difficulty: 'Facile' | 'Moyen' | 'Difficile'
}

// ─── Chef ─────────────────────────────────────────────────────────────────────

export interface Chef {
  id: string
  name: string
  avatar: string
  specialty: string
  region: string
  city: string
  bio: string
  rating: number
  reviewCount: number
  sessionsDone: number
  pricePerSession: number
  available: boolean
  badges: string[]
  specialties: string[]
}

// ─── Booking / Reservation ────────────────────────────────────────────────────

export type PlanId = 'essentiel' | 'confort' | 'premium'

export interface Plan {
  id: PlanId
  name: string
  price: number
  priceAfterTax: number
  duration: string
  meals: number
  persons: string
  description: string
  features: string[]
  popular?: boolean
}

export interface Booking {
  id: string
  planId: PlanId
  chefId: string
  date: Date
  timeSlot: string
  selectedMeals: string[]
  customRequest?: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  totalAmount: number
  paymentStatus: 'pending' | 'paid'
  createdAt: Date
}

// ─── Client ───────────────────────────────────────────────────────────────────

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  address: Address
  dietaryPreferences: DietaryTag[]
  bookings: Booking[]
  createdAt: Date
}

export interface Address {
  street: string
  city: string
  postalCode: string
  region: string
}

// ─── Testimonial ──────────────────────────────────────────────────────────────

export interface Testimonial {
  id: string
  clientName: string
  clientCity: string
  clientAvatar?: string
  rating: number
  text: string
  date: string
  planUsed: PlanId
  verified: boolean
}

// ─── Shopping List ─────────────────────────────────────────────────────────────

export interface ShoppingListItem {
  name: string
  quantity: string
  unit: string
  aisle: string
  estimatedPrice?: number
}

export interface ShoppingList {
  bookingId: string
  items: ShoppingListItem[]
  generatedAt: Date
  partnerLinks: {
    leclerc?: string
    carrefour?: string
    auchan?: string
    biocoop?: string
  }
}
