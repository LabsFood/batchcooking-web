'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiFetch } from './client'
import { useMeKey } from './keys'
import type { ChefProfile, ChefProfilePatch } from './types'

/**
 * `PATCH /me/chef-profile` — ce que les clients voient de ce batch cooker.
 *
 * Réservé à un compte **approuvé** : `403 CHEF_NOT_VERIFIED` pendant
 * l'instruction, `404` si le compte n'est pas batch cooker du tout. On ne
 * devient pas batch cooker par cet appel — ça passe par
 * `POST /chef-applications`.
 *
 * On invalide toute la racine du compte (`['me', userId]`) : le nom et le
 * téléphone vivent sur `users`, donc `/me` et `/me/profile` changent ensemble.
 */
export function useUpdateChefProfile() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()

  return useMutation({
    mutationFn: (patch: ChefProfilePatch) =>
      apiFetch<ChefProfile>('/me/chef-profile', { method: 'PATCH', body: patch }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: meKey })
    },
  })
}

/** Une zone telle que `PATCH /me/chef-profile/zones` l'attend, comme à la candidature. */
export interface ChefZoneInput {
  regionCode: string
  regionLabel: string
  scope: 'region' | 'cities'
  cities: { name: string; dept: string; insee: string }[]
}

/**
 * `PATCH /me/chef-profile/zones` — le batch cooker approuvé remplace ses zones.
 * Mêmes règles que la candidature ; `403 CHEF_NOT_VERIFIED` avant l'approbation
 * (les zones sont alors celles de la candidature). Journalisé côté API.
 */
export function useUpdateChefZones() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()

  return useMutation({
    mutationFn: (interventionZones: ChefZoneInput[]) =>
      apiFetch<{ interventionZones: ChefZoneInput[] }>('/me/chef-profile/zones', {
        method: 'PATCH',
        body: { interventionZones },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: meKey })
    },
  })
}

/** Le refus de l'API, dit à la personne qui vient de cliquer. */
export function chefProfileMessage(error: unknown): string {
  const e = error as { status?: number; message?: string } | null
  if (e?.status === 403) {
    return 'Votre page publique s’ouvre à l’approbation de votre candidature. En attendant, votre espace est en lecture seule.'
  }
  if (e?.status === 404) {
    return 'Ce compte n’est pas un compte batch cooker.'
  }
  if (e?.status === 422) {
    return e.message || 'Une valeur est refusée : vérifiez les champs.'
  }
  return e?.message || 'La modification n’a pas été enregistrée.'
}
