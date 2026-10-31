'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { useApiFetch } from './client'
import { useMeKey } from './keys'
import type { Me } from './types'

/**
 * `GET /me` — crée la ligne Postgres au premier accès et renvoie le rôle
 * applicatif (source de vérité). Ne se déclenche qu'une fois authentifié.
 */
export function useMe() {
  const apiFetch = useApiFetch()
  const { isLoaded, isSignedIn } = useAuth()
  const meKey = useMeKey()

  return useQuery({
    queryKey: meKey,
    queryFn: () => apiFetch<Me>('/me'),
    enabled: isLoaded && !!isSignedIn,
    staleTime: 5 * 60 * 1000,
  })
}
