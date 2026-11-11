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
  /** Photo de profil, depuis `POST /me/avatar/*`. `null` quand il n'y en a pas. */
  avatarUrl?: string | null
}

/** Ligne `client_profiles` (profil de goûts). */
export interface ClientProfile {
  id: string
  userId: string
  dietaryPreferences: string[]
  /** Les 14 allergènes réglementaires, par code. Déclarés par `PUT /me/profile/allergies` seulement. */
  allergies: string[]
  /** Ce que les 14 ne couvrent pas, avec les mots du client. */
  customAllergies?: string[]
  /** « Aucune allergie », dit explicitement. */
  allergiesNone?: boolean
  /** `null` : jamais répondu, aucun menu ne se valide (`ALLERGIES_NOT_DECLARED`). */
  allergiesDeclaredAt?: string | null
  healthConsentAt?: string | null
  healthConsentVersion?: string | null
  /** `verified` seulement quand plus rien n'est à vérifier à la main. */
  allergyCheck?: AllergyCheck
  allergyCheckReasons?: AllergyReason[]
  dislikes: string[]
  favorites: string[]
  spiceLevel: number
  kitchenNotes: string | null
  /** Le foyer dimensionne les portions : 1 à 20 adultes, 0 à 20 enfants. */
  householdAdults?: number | null
  householdKids?: number | null
  /** L'adresse des sessions, en trois colonnes comme côté API. */
  addressStreet?: string | null
  addressCity?: string | null
  addressPostalCode?: string | null
}

/** Profil prestataire (`chef_profiles`). */
export interface ChefProfile {
  id: string
  userId: string
  displayName: string
  bio?: string | null
  city?: string | null
  serviceRadiusKm: number
  languages?: string[] | null
  /** Toujours `false` à l'auto-inscription — seul un admin peut l'activer. */
  isActive: boolean
  isVerified: boolean
  /** Fixé par un admin (`tier_1` d'office). Aucune facturation n'en dépend. */
  tier?: 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4'
  /** Le nom du palier, réglé dans la console : sur `GET /me/profile`. */
  tierLabel?: string
}

/** Recettes lot 1 : jamais « OK » tant que rien n'a été vérifié. */
export type AllergyCheck = 'verified' | 'unverified'

/** Pourquoi ce n'est pas vérifié, un code par raison (textes dans `lib/reason-codes.ts`). */
export type AllergyReason =
  | 'ALLERGIES_NOT_DECLARED'
  | 'ALLERGENS_UNVERIFIED'
  | 'ALLERGEN_CONFLICT'
  | 'CUSTOM_ALLERGIES'

/**
 * Réponse de `GET /me/profile` — user + le profil correspondant à `users.role`.
 * `profileType` indique lequel des deux profils est renvoyé.
 */
export interface MeProfile {
  user: Me
  profileType: 'client' | 'chef' | 'none'
  profile: ClientProfile | ChefProfile | null
  /** Le texte à accepter avant de lister des allergies, et sa version à renvoyer. */
  healthConsent?: { version: string; text: string }
  /** CGV V1 : les textes des cases de commande et leur version à renvoyer. */
  contractTerms?: import('./contract').ContractTerms
  /** Fixé par l'API pour tout le monde : les emails sont transactionnels, le SMS n'existe pas encore. */
  notificationPreferences?: { email: boolean; sms: boolean }
}

/**
 * Corps de `PATCH /me/chef-profile` — la page publique du batch cooker.
 *
 * On devient batch cooker par `POST /chef-applications`, pas par cet appel :
 * il répond `404` sur un compte qui n'en est pas un, et `403
 * CHEF_NOT_VERIFIED` tant que la candidature n'est pas approuvée.
 *
 * Les drapeaux de visibilité, la route SAP et les zones sont fixés à
 * l'approbation et ne s'envoient pas ici. Seuls les champs modifiés partent.
 */
export interface ChefProfilePatch {
  /** Nom public affiché aux clients. */
  displayName?: string
  /** Présentation publique. */
  bio?: string
  city?: string
  /** Distance que le chef accepte de parcourir, en kilomètres. */
  serviceRadiusKm?: number
  /** Codes de `GET /referentials/languages`. Remplace toute la liste ; `[]` l'efface. */
  languages?: string[]
  /** Avec `lastName`, compose `users.full_name` et se synchronise vers Clerk. */
  firstName?: string
  lastName?: string
  phone?: string
}

/** Corps de `PATCH /me/profile` (mise à jour partielle). */
export interface ClientProfilePatch {
  dietaryPreferences?: string[]
  /** Le consentement santé coché avec les régimes (politique de confidentialité V1 §5). */
  consent?: boolean
  consentVersion?: string
  dislikes?: string[]
  favorites?: string[]
  spiceLevel?: number
  kitchenNotes?: string
  /** `householdKids` côté API, pas `householdChildren` : l'orthographe compte. */
  householdAdults?: number
  householdKids?: number
  /** Ces trois-là vont sur le compte, pas sur le profil ; le nom part aussi chez Clerk. */
  firstName?: string
  lastName?: string
  phone?: string
  addressStreet?: string
  addressCity?: string
  addressPostalCode?: string
}
