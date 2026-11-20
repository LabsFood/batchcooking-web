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
  total?: number
  explored?: {
    code?: string
    /** La clé de `world-atlas` : « 250 » pour la France. */
    iso3166Numeric?: string
    name?: string
    firstTastedAt?: string
    dishes?: string[]
  }[]
}

/** Un pays goûté, prêt pour la carte. */
export interface ExploredCountry {
  code: string
  name: string
  flag: string
  iso: string
  dishes: string[]
  firstAt: string
}

/** `FR` → 🇫🇷 : deux indicateurs régionaux, pas besoin que l'API envoie le drapeau. */
function flagOf(code: string) {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)))
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
      const r = await apiFetch<CulinaryMap>('/me/culinary-map')
      const explored: ExploredCountry[] = (r.explored ?? []).flatMap((c) =>
        c.code && c.iso3166Numeric
          ? [
              {
                code: c.code,
                name: c.name ?? c.code,
                flag: flagOf(c.code),
                iso: c.iso3166Numeric,
                dishes: c.dishes ?? [],
                firstAt: c.firstTastedAt ?? '',
              },
            ]
          : [],
      )
      return { total: r.total ?? 195, explored }
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
