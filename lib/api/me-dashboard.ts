'use client'

import { useQuery } from '@tanstack/react-query'
import { useApiFetch } from './client'

/* ─────────────────────────────────────────────────────────────────────────────
   Les chiffres de l'espace client.

   Trois routes que j'avais ratées en écrivant le suivi : elles existent depuis
   le début. `/me/dashboard` et `/me/stats` ont été remises en forme le 26/10
   (avant : les lignes brutes de la base, que l'écran ne savait pas lire) ; on
   lit quand même chaque champ avec précaution et on n'affiche que ce qui arrive.
   ───────────────────────────────────────────────────────────────────────────── */

/** `GET /me/dashboard` — ce que l'accueil du client montre. */
export interface MyDashboard {
  bookingsCount?: number
  quotesCount?: number
  /**
   * La session à venir — en attente, confirmée ou en cours, pas encore finie.
   * `null` quand il n'y en a aucune.
   */
  nextBooking?: {
    id?: string
    reference?: string | null
    status?: string
    startsAt?: string
    endsAt?: string
    chefName?: string
  } | null
}

/** `GET /me/stats` — tout ce qui a été réservé, additionné, hors annulations. */
export interface MyStats {
  totals?: {
    bookings?: number
    /** En centimes. */
    amountTtc?: number
    amountAfterTax?: number
  }
  /** Nombre de devis par statut, seulement ceux qui existent : `{ quoted: 1 }`. */
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
