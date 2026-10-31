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
