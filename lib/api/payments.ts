'use client'

/* ─────────────────────────────────────────────────────────────────────────────
   Règlement d'une prestation — couche API (FLOW-03).

   Une prestation se règle **après** avoir eu lieu. L'écran pose une seule
   question à l'API, `GET /me/bookings/{id}/payment-options` : où en est le
   règlement, combien, et quels moyens ce client peut utiliser avec ce batch
   cooker. Tous les montants viennent de là, en centimes — rien n'est recalculé
   dans le navigateur.

   - Carte : l'API renvoie l'adresse d'une page Stripe, on y envoie le
     navigateur. Le retour sur le site ne prouve rien : c'est `status` qui fait
     foi, relu jusqu'à `paid`.
   - CESU : le client déclare ses titres, le batch cooker confirme les avoir
     reçus. Le solde éventuel part par carte.
   - Avance immédiate : rien n'est encaissé ici. La demande part à l'URSSAF et
     la prestation reste « en cours » jusqu'à sa réponse.
   ───────────────────────────────────────────────────────────────────────────── */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApiFetch } from './client'
import { useMeKey } from './keys'

export type PaymentMethodId = 'urssaf' | 'card' | 'cesu'
export type PaymentState = 'not-due' | 'due' | 'processing' | 'paid' | 'failed'

export interface MethodOption {
  id: PaymentMethodId
  available: boolean
  reasonCode?: 'URSSAF_LINK_NONE' | 'URSSAF_LINK_PENDING' | 'URSSAF_LINK_REFUSED'
  /** À afficher tel quel. */
  reason?: string
  /** Ce que le client règle sur le site, maintenant, avec ce moyen. */
  dueNowCents: number
  /** Avance immédiate : ce que l'URSSAF prélèvera ensuite sur son compte. */
  debitedLaterCents?: number
  maxCesuCents?: number
  /** Le numéro avec lequel le client paie son batch cooker chez son émetteur. */
  crcesuNan?: string | null
}

export interface PaymentOptions {
  bookingId: string
  reference: string | null
  chef: { chefProfileId: string; displayName: string }
  startsAt: string
  status: PaymentState
  dueAt: string
  amounts: {
    totalCents: number
    paidCents: number
    remainingCents: number
    taxCreditCents: number
    currency: string
  }
  /** Seulement les moyens que le batch cooker accepte. */
  methods: MethodOption[]
  savedCards: never[]
}

export type CesuMedium = 'cesu_paper' | 'ecesu'
export type CesuIssuer = 'pluxee' | 'edenred' | 'up' | 'bimpli' | 'domiserve' | 'other'

export function usePaymentOptions(bookingId: string, opts: { watch?: boolean } = {}) {
  const apiFetch = useApiFetch()
  const me = useMeKey()
  return useQuery({
    queryKey: [...me, 'payment-options', bookingId],
    queryFn: () => apiFetch<PaymentOptions>(`/me/bookings/${bookingId}/payment-options`),
    retry: false,
    // Tant qu'une réponse est attendue de quelqu'un d'autre (Stripe, le batch
    // cooker, l'URSSAF), on relit : c'est l'API qui dit quand c'est réglé.
    refetchInterval: (query) =>
      opts.watch || query.state.data?.status === 'processing' ? 4000 : false,
  })
}

function useRefresh(bookingId: string) {
  const queryClient = useQueryClient()
  const me = useMeKey()
  return () =>
    void queryClient.invalidateQueries({ queryKey: [...me, 'payment-options', bookingId] })
}

/** Carte : ouvre la page Stripe. Le montant est contrôlé par l'API, pas décidé ici. */
export function useCardCheckout(bookingId: string) {
  const apiFetch = useApiFetch()
  return useMutation({
    mutationFn: (amountCents: number) => {
      const here = `${window.location.origin}/espace-client/commandes/${bookingId}/paiement`
      return apiFetch<{ sessionId: string; url: string }>('/payments/checkout-session', {
        method: 'POST',
        body: {
          orderId: bookingId,
          method: 'card',
          amountCents,
          currency: 'eur',
          successUrl: `${here}?paiement=succes`,
          cancelUrl: `${here}?paiement=annule`,
        },
      })
    },
  })
}

export function useDeclareCesu(bookingId: string) {
  const apiFetch = useApiFetch()
  const refresh = useRefresh(bookingId)
  return useMutation({
    mutationFn: (input: { amountCents: number; medium: CesuMedium; issuer?: CesuIssuer }) =>
      apiFetch('/payments/cesu', {
        method: 'POST',
        body: {
          bookingId,
          amountTtc: input.amountCents,
          medium: input.medium,
          ...(input.medium === 'ecesu' && input.issuer ? { issuer: input.issuer } : {}),
        },
      }),
    onSettled: refresh,
  })
}

/** Avance immédiate : confirme la prestation. Rien n'est encaissé ici. */
export function useSettleWithUrssaf(bookingId: string) {
  const apiFetch = useApiFetch()
  const refresh = useRefresh(bookingId)
  return useMutation({
    mutationFn: () =>
      apiFetch<{ status: 'processing'; debitedCents: number; transmittedAt: string }>(
        `/bookings/${bookingId}/settle`,
        { method: 'POST', body: { method: 'urssaf' } },
      ),
    onSettled: refresh,
  })
}

/** Demande le rattachement URSSAF avec ce batch cooker — à faire une fois. */
export function useRequestUrssafLink(bookingId: string) {
  const apiFetch = useApiFetch()
  const refresh = useRefresh(bookingId)
  return useMutation({
    mutationFn: (chefProfileId: string) =>
      apiFetch('/me/urssaf-links', { method: 'POST', body: { chefProfileId } }),
    onSettled: refresh,
  })
}

export const CESU_ISSUERS: { id: CesuIssuer; label: string }[] = [
  { id: 'pluxee', label: 'Pluxee (Sodexo)' },
  { id: 'edenred', label: 'Edenred' },
  { id: 'up', label: 'Up' },
  { id: 'bimpli', label: 'Bimpli' },
  { id: 'domiserve', label: 'Domiserve' },
  { id: 'other', label: 'Autre' },
]
