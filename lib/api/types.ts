/* Types reflétant les payloads de l'API Labs Food (Swagger v1.2.0). */

export type Role = 'client' | 'chef' | 'admin'

/** Réponse de `GET /me` — utilisateur applicatif persisté. */
export interface Me {
  id: string
  clerkUserId: string
  email: string
  fullName: string | null
  phone: string | null
  role: Role
}

/** Ligne `client_profiles` (profil de goûts). */
export interface ClientProfile {
  id: string
  userId: string
  dietaryPreferences: string[]
  allergies: string[]
  dislikes: string[]
  favorites: string[]
  spiceLevel: number
  kitchenNotes: string | null
}

/** Réponse de `GET /me/profile` — user + profil optionnel (null si non créé). */
export interface MeProfile {
  user: Me
  profile: ClientProfile | null
}

/** Corps de `PATCH /me/profile` (mise à jour partielle). */
export interface ClientProfilePatch {
  dietaryPreferences?: string[]
  allergies?: string[]
  dislikes?: string[]
  favorites?: string[]
  spiceLevel?: number
  kitchenNotes?: string
}
