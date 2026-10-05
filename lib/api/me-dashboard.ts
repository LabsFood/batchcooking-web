'use client'

import { useQuery } from '@tanstack/react-query'
import { useApiFetch } from './client'

/* ─────────────────────────────────────────────────────────────────────────────
   Les chiffres de l'espace client.

   Trois routes que j'avais ratées en écrivant le suivi : elles existent depuis
   le début. Aucune n'a de schéma dans la documentation (c'est BUG-02), donc on
   lit chaque champ avec précaution et on n'affiche que ce qui arrive.
   ───────────────────────────────────────────────────────────────────────────── */

/** `GET /me/dashboard` — ce que l'accueil du client montre. */
export interface MyDashboard {
  bookingsCount?: number
  quotesCount?: number
  /** La dernière réservation passée, `null` quand il n'y en a aucune. */
  latestBooking?: {
    id?: string
    status?: string
    scheduledAt?: string
    date?: string
    chefName?: string
    formule?: string
  } | null
}

/** `GET /me/stats` — tout ce qui a été réservé, additionné. */
export interface MyStats {
  totals?: {
    bookings?: number
    /** En centimes. */
    amountTtc?: number
    amountAfterTax?: number
  }
  /** Nombre de devis par statut. */
  quotesByStatus?: Record<string, number>
}

/** `GET /me/culinary-map` — les pays goûtés, pour la carte du monde. */
export interface CulinaryMap {
  countries?: { iso3166Numeric?: string; code?: string; name?: string; dishes?: number }[]
  total?: number
}

export function useMyDashboard() {
  const apiFetch = useApiFetch()
  return useQuery({
    queryKey: ['me', 'dashboard'],
    queryFn: () => apiFetch<MyDashboard>('/me/dashboard'),
    retry: false,
  })
}

export function useMyStats() {
  const apiFetch = useApiFetch()
  return useQuery({
    queryKey: ['me', 'stats'],
    queryFn: () => apiFetch<MyStats>('/me/stats'),
    retry: false,
  })
}

export function useCulinaryMap() {
  const apiFetch = useApiFetch()
  return useQuery({
    queryKey: ['me', 'culinary-map'],
    queryFn: async () => {
      const r = await apiFetch<CulinaryMap | CulinaryMap['countries']>('/me/culinary-map')
      // Tolérant : un tableau nu ou l'enveloppe `{ countries, total }`.
      if (Array.isArray(r)) return { countries: r, total: r.length }
      return r
    },
    retry: false,
  })
}

/** Les euros d'un montant en centimes. `null` reste `null`. */
export function euros(centimes?: number | null): string | null {
  if (centimes == null || !Number.isFinite(centimes)) return null
  return (centimes / 100).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })
}
