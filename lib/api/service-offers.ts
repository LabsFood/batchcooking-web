'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApiFetch } from './client'
import { useMeKey } from './keys'

/* ─────────────────────────────────────────────────────────────────────────────
   Les offres de service d'un batch cooker — arrivées le 17/10.

   C'est la pièce qui manquait à tout le tunnel public : **la durée d'une offre
   fait le créneau, et son prix fait le montant.** Sans offre, un client ne
   peut rien réserver, et l'écran des tarifs n'avait rien où écrire — il
   simulait.

   Trois choses à savoir :

   - `priceCents` est le **prix client**, pas le net du batch cooker. Le net
     s'en déduit par la commission (`GET /pricing-rules`), et c'est l'API qui
     fait foi à la réservation ;
   - le **frais de courses** ne vit que si `shoppingIncluded` ; le remettre à
     `false` remet le frais à zéro ;
   - une offre déjà réservée ne se supprime pas (`409 OFFER_IN_USE`) : on la
     désactive, et elle disparaît des vitrines sans effacer l'histoire.

   L'offre interne « Prestation sur-mesure », qui porte les devis acceptés,
   n'apparaît jamais dans cette liste et son nom est réservé.
   ───────────────────────────────────────────────────────────────────────────── */

export interface ServiceOffer {
  id: string
  name: string
  description: string | null
  /** 30 à 720 — c'est elle qui découpe l'agenda en créneaux. */
  durationMinutes: number
  /** Prix client, en centimes. */
  priceCents: number
  currency: string
  shoppingIncluded: boolean
  /** Centimes. `0` quand les courses sont offertes. */
  shoppingFeeCents: number
  /** Désactivée : invisible pour les clients, conservée pour l'historique. */
  active: boolean
}

export interface ServiceOfferInput {
  name: string
  description?: string | null
  durationMinutes: number
  priceCents: number
  shoppingIncluded?: boolean
  shoppingFeeCents?: number
  active?: boolean
}

/** Les bornes de l'API, répétées pour le dire avant l'envoi. */
export const OFFER_LIMITS = {
  durationMin: 30,
  durationMax: 720,
  priceMin: 1,
  priceMax: 1_000_000,
  shoppingFeeMax: 100_000,
} as const

/** Le nom que l'API se réserve pour ses propres offres. */
export const RESERVED_OFFER_NAME = 'Prestation sur-mesure'

/**
 * Ce qui ferait échouer l'enregistrement, dit avant de l'envoyer. `null` quand
 * l'offre est acceptable — l'API revérifie, elle reste la dernière à décider.
 */
export function offerError(o: ServiceOfferInput): string | null {
  if (!o.name.trim()) return 'Donnez un nom à cette offre : c’est ce que le client lit.'
  if (o.name.trim().toLowerCase() === RESERVED_OFFER_NAME.toLowerCase()) {
    return `« ${RESERVED_OFFER_NAME} » est réservé aux devis : choisissez un autre nom.`
  }
  if (o.durationMinutes < OFFER_LIMITS.durationMin || o.durationMinutes > OFFER_LIMITS.durationMax) {
    return 'La durée va de 30 minutes à 12 heures.'
  }
  if (o.priceCents < OFFER_LIMITS.priceMin || o.priceCents > OFFER_LIMITS.priceMax) {
    return 'Le prix va de 0,01 € à 10 000 €.'
  }
  if (!o.shoppingIncluded && (o.shoppingFeeCents ?? 0) > 0) {
    return 'Un forfait courses ne se facture que si vous proposez de faire les courses.'
  }
  if ((o.shoppingFeeCents ?? 0) > OFFER_LIMITS.shoppingFeeMax) {
    return 'Le forfait courses ne dépasse pas 1 000 €.'
  }
  return null
}

const KEY = 'service-offers'

/** `GET /me/chef/service-offers` — actives d'abord, puis de la moins chère à la plus chère. */
export function useServiceOffers() {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, KEY],
    queryFn: async () => {
      const res = await apiFetch<unknown>('/me/chef/service-offers')
      return Array.isArray(res) ? (res as ServiceOffer[]) : []
    },
  })
}

function useOfferMutation<V>(
  run: (apiFetch: ReturnType<typeof useApiFetch>, v: V) => Promise<unknown>,
) {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  return useMutation({
    mutationFn: (v: V) => run(apiFetch, v),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...meKey, KEY] }),
  })
}

/** `POST /me/chef/service-offers` — `403 CHEF_NOT_VERIFIED` tant que le dossier n'est pas approuvé. */
export function useCreateServiceOffer() {
  return useOfferMutation<ServiceOfferInput>((apiFetch, body) =>
    apiFetch<ServiceOffer>('/me/chef/service-offers', { method: 'POST', body }),
  )
}

/** `PATCH /me/chef/service-offers/{id}` — tout est optionnel, y compris `active`. */
export function useUpdateServiceOffer() {
  return useOfferMutation<{ id: string; patch: Partial<ServiceOfferInput> }>(
    (apiFetch, { id, patch }) =>
      apiFetch<ServiceOffer>(`/me/chef/service-offers/${id}`, { method: 'PATCH', body: patch }),
  )
}

/**
 * `DELETE /me/chef/service-offers/{id}`.
 *
 * `409 OFFER_IN_USE` quand une réservation s'y rattache : l'écran propose
 * alors de la désactiver, ce qui a le même effet pour les clients.
 */
export function useDeleteServiceOffer() {
  return useOfferMutation<string>((apiFetch, id) =>
    apiFetch<unknown>(`/me/chef/service-offers/${id}`, { method: 'DELETE' }),
  )
}

/** « 3 h 30 » — une durée, pas une heure de la journée. */
export const offerDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${String(m).padStart(2, '0')}`
}

export const offerEuros = (cents: number) =>
  (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

/* ── Le prix exact, avant de réserver ──────────────────────────────────────── */

/**
 * Ce que coûte une réservation de cette offre — `GET /service-offers/{id}/price`.
 *
 * Arrivé le 18/10, et il règle une question qui traînait : les suppléments.
 * Le 17/10 l'API n'en appliquait aucun, et le front avait cessé d'en inventer ;
 * depuis, ils existent **côté serveur** — un montant par personne au-delà de
 * celles qui sont comprises, un autre par plat supplémentaire — et la console
 * les règle (`/admin/settings/booking-supplements`).
 *
 * D'où la règle, désormais sans exception : **le front n'additionne rien**. Il
 * demande, il affiche. `rules` dit au passage pourquoi le total est ce qu'il
 * est, ce qui permet de l'expliquer au client plutôt que de le lui asséner.
 */
export interface OfferPrice {
  serviceOfferId: string
  /** L'offre seule. */
  priceCents: number
  extraMealsCents: number
  extraPersonsCents: number
  /** `0` si le client fait les courses, ou si l'offre ne les comprend pas. */
  shoppingFeeCents: number
  /** Ce que le client paie, tout compris. */
  amountTtc: number
  amountAfterTax: number
  currency: string
  /** Les règles appliquées, pour les dire à l'écran. */
  rules: {
    includedPersons: number
    extraPersonCents: number
    extraMealCents: number
  }
}

export function useOfferPrice(
  offerId: string | undefined,
  opts: { persons?: number; extraMeals?: number; shoppingByClient?: boolean } = {},
) {
  const apiFetch = useApiFetch()
  const { persons, extraMeals, shoppingByClient } = opts

  const p = new URLSearchParams()
  if (persons != null) p.set('persons', String(persons))
  if (extraMeals != null) p.set('extraMeals', String(extraMeals))
  if (shoppingByClient != null) p.set('shoppingByClient', String(shoppingByClient))
  const qs = p.toString()

  return useQuery({
    queryKey: ['service-offers', offerId, 'price', { persons, extraMeals, shoppingByClient }],
    queryFn: () =>
      apiFetch<OfferPrice>(`/service-offers/${offerId}/price${qs ? `?${qs}` : ''}`),
    enabled: !!offerId,
    staleTime: 60_000,
  })
}
