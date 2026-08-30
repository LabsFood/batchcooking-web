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

/** Profil prestataire (`chef_profiles`). */
export interface ChefProfile {
  id: string
  userId: string
  displayName: string
  bio?: string | null
  city?: string | null
  serviceRadiusKm: number
  /** Toujours `false` à l'auto-inscription — seul un admin peut l'activer. */
  isActive: boolean
  isVerified: boolean
}

/**
 * Réponse de `GET /me/profile` — user + le profil correspondant à `users.role`.
 * `profileType` indique lequel des deux profils est renvoyé.
 */
export interface MeProfile {
  user: Me
  profileType: 'client' | 'chef' | 'none'
  profile: ClientProfile | ChefProfile | null
}

/**
 * Corps de `PATCH /me/chef-profile` (onboarding chef, formulaire 2).
 *
 * ⚠️ Cet appel **promeut `users.role` de `client` à `chef`** et remet toujours
 * `isActive` / `isVerified` à `false` : seul un admin peut activer un chef via
 * `PATCH /admin/chefs/:id/verification`.
 */
export interface ChefProfilePatch {
  /** Requis par l'API. */
  displayName: string
  bio?: string
  city?: string
  /** Entre 1 et 200 km. */
  serviceRadiusKm?: number
  firstName?: string
  lastName?: string
  phone?: string
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
