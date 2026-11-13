'use client'

/* ─────────────────────────────────────────────────────────────────────────────
   Demandes sur-mesure et offres — couche API des espaces client et chef.

   Le client décrit ce qu'il veut, le batch cooker propose son prix (en net),
   le client accepte : c'est l'acceptation qui crée la prestation. Une seule
   offre est en attente à la fois ; les précédentes restent dans `offers`.

   Les montants sont en centimes. Le client ne reçoit jamais `netCents` ni
   `commissionBps` : ces champs n'existent que côté batch cooker.
   ───────────────────────────────────────────────────────────────────────────── */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApiFetch } from './client'
import { useMeKey } from './keys'

// ── Types (miroir de `LF-BackEnd/apps/src/modules/quotes/quote.views.ts`) ──

export type QuoteStatus =
  | 'submitted'
  | 'in_review'
  | 'quoted'
  | 'accepted'
  | 'declined'
  | 'chef_declined'
  | 'cancelled'
  /**
   * Classée sans suite par Lab's Food — arrivé le 17/10.
   *
   * Ce n'est ni un refus du client (`declined`), ni son retrait
   * (`cancelled`) : c'est la maison qui ne donne pas suite. L'offre qui
   * attendait est retirée, et rien ne se rouvre.
   */
  | 'closed'

export type OfferStatus = 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'withdrawn'

export type TimeSlot = 'morning' | 'afternoon' | 'evening'

export interface QuoteOffer {
  id: string
  status: OfferStatus
  clientPriceCents: number
  afterTaxCreditCents: number
  /** Côté batch cooker uniquement. */
  netCents?: number
  commissionBps?: number
  proposedDate: string | null
  proposedTimeSlot: TimeSlot | null
  conditions: string | null
  validUntil: string
  viewedAt: string | null
  decidedAt: string | null
  declineReason: string | null
  createdAt: string
}

export interface Quote {
  id: string
  reference: string
  status: QuoteStatus
  title: string
  persons: number
  mealsCount: number
  cuisine: string
  diet: string[]
  allergies: string[]
  brief: string
  desiredDate: string | null
  timeSlot: TimeSlot | null
  /** Côté batch cooker, `line` reste `null` tant que l'offre n'est pas acceptée. */
  address: { line: string | null; city: string | null; postalCode: string | null }
  budgetCents: number | null
  /** Absent côté client. Nom abrégé et coordonnées masquées avant acceptation. */
  client?: { id: string; name: string; email: string | null; phone: string | null }
  chef: {
    userId: string
    chefProfileId: string
    displayName: string
    city: string | null
    avatarUrl: string | null
  } | null
  chefDeclinedAt: string | null
  offers: QuoteOffer[]
  activeOffer: QuoteOffer | null
  booking: { id: string; reference: string | null; startsAt: string; endsAt: string } | null
  createdAt: string
  updatedAt: string
}

export interface CreateQuoteInput {
  title: string
  chefProfileId?: string
  desiredDate: string
  timeSlot: TimeSlot
  persons: number
  mealsCount: number
  cuisine: string
  diet?: string[]
  allergies?: string[]
  brief: string
  addressLine: string
  addressCity: string
  addressPostalCode: string
  budgetCents?: number
}

export interface CreateOfferInput {
  netCents: number
  validityDays?: number
  conditions?: string
  proposedDate?: string
  proposedTimeSlot?: TimeSlot
}

export interface PricingRules {
  commissionBps: number
  taxCreditBps: number
}

// ── Règles de prix ──

/** Le taux en vigueur, réglé par l'équipe. Sert à afficher le calcul en direct. */
export function usePricingRules() {
  const apiFetch = useApiFetch()
  const me = useMeKey()
  return useQuery({
    queryKey: [...me, 'pricing-rules'],
    queryFn: () => apiFetch<PricingRules>('/pricing-rules'),
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Du net du batch cooker au prix client — le même calcul que l'API
 * (`priceOffer`) : la commission est prise sur le prix client. Sert d'aperçu ;
 * le montant qui fait foi est celui que l'API renvoie avec l'offre.
 */
export function previewOffer(netCents: number, rules: PricingRules) {
  const clientPriceCents = Math.round((netCents * 10_000) / (10_000 - rules.commissionBps))
  return {
    clientPriceCents,
    commissionCents: clientPriceCents - netCents,
    afterTaxCreditCents: Math.round((clientPriceCents * (10_000 - rules.taxCreditBps)) / 10_000),
  }
}

// ── Côté client ──

export function useMyQuotes() {
  const apiFetch = useApiFetch()
  const me = useMeKey()
  return useQuery({
    queryKey: [...me, 'quotes'],
    queryFn: () => apiFetch<Quote[]>('/me/quotes'),
  })
}

/** Remet à jour les deux listes après une action : demandes, et agenda si une prestation est née. */
function useRefreshQuotes(scope: 'quotes' | 'chef-quotes') {
  const queryClient = useQueryClient()
  const me = useMeKey()
  return () => {
    void queryClient.invalidateQueries({ queryKey: [...me, scope] })
    void queryClient.invalidateQueries({ queryKey: [...me, 'dashboard'] })
  }
}

export function useCreateQuote() {
  const apiFetch = useApiFetch()
  const refresh = useRefreshQuotes('quotes')
  return useMutation({
    mutationFn: (input: CreateQuoteInput) =>
      apiFetch<Quote>('/quotes', { method: 'POST', body: input }),
    onSuccess: refresh,
  })
}

/** Ouvrir une demande, c'est lire son offre : l'API la passe de `sent` à `viewed`. */
export function useMarkQuoteSeen() {
  const apiFetch = useApiFetch()
  return useMutation({
    mutationFn: (quoteId: string) => apiFetch<Quote>(`/me/quotes/${quoteId}`),
  })
}

export function useAcceptOffer() {
  const apiFetch = useApiFetch()
  const refresh = useRefreshQuotes('quotes')
  return useMutation({
    mutationFn: ({
      quoteId,
      offerId,
      consents,
    }: {
      quoteId: string
      offerId: string
      consents?: import('./contract').ContractConsents
    }) =>
      apiFetch<Quote>(`/me/quotes/${quoteId}/offers/${offerId}/accept`, {
        method: 'POST',
        body: consents ? { consents } : {},
      }),
    // Une offre échue ou déjà traitée : la liste affichée n'est plus la bonne.
    onSettled: refresh,
  })
}

export function useDeclineOffer() {
  const apiFetch = useApiFetch()
  const refresh = useRefreshQuotes('quotes')
  return useMutation({
    mutationFn: ({ quoteId, offerId, reason }: { quoteId: string; offerId: string; reason?: string }) =>
      apiFetch<Quote>(`/me/quotes/${quoteId}/offers/${offerId}/decline`, {
        method: 'POST',
        body: reason ? { reason } : {},
      }),
    onSettled: refresh,
  })
}

/** Retirer sa demande. Refusé une fois l'offre acceptée (`409`). */
export function useCancelQuote() {
  const apiFetch = useApiFetch()
  const refresh = useRefreshQuotes('quotes')
  return useMutation({
    mutationFn: (quoteId: string) => apiFetch<Quote>(`/me/quotes/${quoteId}`, { method: 'DELETE' }),
    onSettled: refresh,
  })
}

// ── Côté batch cooker ──

export function useChefQuotes() {
  const apiFetch = useApiFetch()
  const me = useMeKey()
  return useQuery({
    queryKey: [...me, 'chef-quotes'],
    queryFn: () => apiFetch<Quote[]>('/me/chef/quotes'),
  })
}

export function useSendOffer() {
  const apiFetch = useApiFetch()
  const refresh = useRefreshQuotes('chef-quotes')
  return useMutation({
    mutationFn: ({ quoteId, ...input }: CreateOfferInput & { quoteId: string }) =>
      apiFetch<Quote>(`/me/chef/quotes/${quoteId}/offers`, { method: 'POST', body: input }),
    onSettled: refresh,
  })
}

export function useWithdrawOffer() {
  const apiFetch = useApiFetch()
  const refresh = useRefreshQuotes('chef-quotes')
  return useMutation({
    mutationFn: ({ quoteId, offerId }: { quoteId: string; offerId: string }) =>
      apiFetch<Quote>(`/me/chef/quotes/${quoteId}/offers/${offerId}/withdraw`, { method: 'POST' }),
    onSettled: refresh,
  })
}

/** Décliner la demande : elle quitte la liste et l'équipe la confie à quelqu'un d'autre. */
export function useDeclineQuote() {
  const apiFetch = useApiFetch()
  const refresh = useRefreshQuotes('chef-quotes')
  return useMutation({
    mutationFn: ({ quoteId, reason }: { quoteId: string; reason?: string }) =>
      apiFetch<Quote>(`/me/chef/quotes/${quoteId}/decline`, {
        method: 'POST',
        body: reason ? { reason } : {},
      }),
    onSettled: refresh,
  })
}

// ── Mise en forme ──

export const SLOT_LABEL: Record<TimeSlot, string> = {
  morning: 'Matin (9 h – 13 h)',
  afternoon: 'Après-midi (14 h – 18 h)',
  evening: 'Soir (18 h – 22 h)',
}

export const centsToEuros = (cents: number) =>
  (cents / 100).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  })

/** `2026-11-10` → « 10 novembre ». Une date de calendrier, sans fuseau. */
export const dayLabel = (isoDay: string) =>
  new Date(`${isoDay.slice(0, 10)}T12:00:00Z`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
