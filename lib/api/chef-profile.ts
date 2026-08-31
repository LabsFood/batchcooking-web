'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiFetch } from './client'
import { useMeKey } from './keys'
import type { ChefProfile, ChefProfilePatch } from './types'

/**
 * `PATCH /me/chef-profile` — crée ou met à jour le profil prestataire.
 *
 * Effets de bord côté serveur, à connaître :
 *  - promeut `users.role` de `client` à `chef` (un `admin`/`chef` garde le sien) ;
 *  - remet `isActive` et `isVerified` à `false` : le chef n'est réservable
 *    qu'après vérification par un admin (`PATCH /admin/chefs/:id/verification`).
 *
 * On invalide toute la racine du compte (`['me', userId]`) car le rôle et le
 * profil changent : ça couvre `/me` et `/me/profile` d'un seul coup.
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
