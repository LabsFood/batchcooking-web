'use client'

import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApiFetch } from './client'
import { useMeKey } from './keys'
import type { ClientProfile, ClientProfilePatch, MeProfile } from './types'

/** `GET /me/profile` — user + profil de goûts (null tant qu'il n'est pas créé). */
export function useMeProfile() {
  const apiFetch = useApiFetch()
  const { isLoaded, isSignedIn } = useAuth()
  const meKey = useMeKey()

  return useQuery({
    queryKey: [...meKey, 'profile'],
    queryFn: () => apiFetch<MeProfile>('/me/profile'),
    enabled: isLoaded && !!isSignedIn,
  })
}

/** Une étape du « Bien démarrer » du client (LF-0221), dans l'ordre de l'API. */
export interface OnboardingStep {
  code: 'contact_details' | 'address' | 'allergies' | 'tastes' | 'first_booking'
  done: boolean
  /** `menu_validation` : un menu ne peut pas être validé avant cette étape. */
  requiredFor?: 'menu_validation'
}

export interface Onboarding {
  steps: OnboardingStep[]
  completed: number
  total: number
  allDone: boolean
}

/**
 * `GET /me/onboarding` — ce que le client est invité à faire après la création de
 * son compte. Rien n'y bloque. Rangé sous la clé du profil : chaque mise à jour du
 * profil le relit.
 */
export function useMyOnboarding() {
  const apiFetch = useApiFetch()
  const { isLoaded, isSignedIn } = useAuth()
  const meKey = useMeKey()

  return useQuery({
    queryKey: [...meKey, 'profile', 'onboarding'],
    queryFn: () => apiFetch<Onboarding>('/me/onboarding'),
    enabled: isLoaded && !!isSignedIn,
  })
}

/** Corps de `PUT /me/profile/allergies` : une liste avec consentement, ou « aucune ». */
export interface AllergyDeclaration {
  none?: boolean
  allergies?: string[]
  customAllergies?: string[]
  consent?: boolean
  consentVersion?: string
}

/**
 * `PUT /me/profile/allergies` — remplace la réponse précédente. Une liste exige le
 * consentement au texte en vigueur (`HEALTH_CONSENT_REQUIRED` sinon). Rend le
 * profil comme `GET /me/profile`.
 */
export function useDeclareAllergies() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()

  return useMutation({
    mutationFn: (body: AllergyDeclaration) =>
      apiFetch<MeProfile>('/me/profile/allergies', { method: 'PUT', body }),
    onSuccess: (profile) => {
      qc.setQueryData([...meKey, 'profile'], profile)
      qc.invalidateQueries({ queryKey: [...meKey, 'profile', 'onboarding'] })
      // Le statut des réservations change avec : on les relit.
      qc.invalidateQueries({ queryKey: [...meKey, 'bookings'] })
      qc.invalidateQueries({ queryKey: [...meKey, 'booking'] })
    },
  })
}

/** `DELETE /me/profile/health-consent` — efface les allergies : la question revient. */
export function useWithdrawHealthConsent() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()

  return useMutation({
    mutationFn: () => apiFetch<MeProfile>('/me/profile/health-consent', { method: 'DELETE' }),
    onSuccess: (profile) => {
      qc.setQueryData([...meKey, 'profile'], profile)
      qc.invalidateQueries({ queryKey: [...meKey, 'bookings'] })
      qc.invalidateQueries({ queryKey: [...meKey, 'booking'] })
    },
  })
}

/** `PATCH /me/profile` — enregistre les préférences (upsert partiel). */
export function useUpdateMeProfile() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()

  return useMutation({
    mutationFn: (patch: ClientProfilePatch) =>
      apiFetch<ClientProfile>('/me/profile', { method: 'PATCH', body: patch }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...meKey, 'profile'] })
    },
  })
}
