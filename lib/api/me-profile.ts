'use client'

import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApiFetch } from './client'
import type { ClientProfile, ClientProfilePatch, MeProfile } from './types'

const KEY = ['me', 'profile'] as const

/** `GET /me/profile` — user + profil de goûts (null tant qu'il n'est pas créé). */
export function useMeProfile() {
  const apiFetch = useApiFetch()
  const { isLoaded, isSignedIn } = useAuth()

  return useQuery({
    queryKey: KEY,
    queryFn: () => apiFetch<MeProfile>('/me/profile'),
    enabled: isLoaded && !!isSignedIn,
  })
}

/** `PATCH /me/profile` — enregistre les préférences (upsert partiel). */
export function useUpdateMeProfile() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (patch: ClientProfilePatch) =>
      apiFetch<ClientProfile>('/me/profile', { method: 'PATCH', body: patch }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
    },
  })
}
