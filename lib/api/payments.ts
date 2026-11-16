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
  reasonCode?:
    | 'URSSAF_LINK_NONE'
    | 'URSSAF_LINK_PENDING'
    | 'URSSAF_LINK_REFUSED'
    | 'URSSAF_DOSSIER_MISSING'
    | 'CESU_PENDING'
  /** À afficher tel quel. */
  reason?: string
  /** Ce que le client règle sur le site, maintenant, avec ce moyen. */
  dueNowCents: number
  /** Avance immédiate : ce que l'URSSAF prélèvera ensuite sur son compte. */
  debitedLaterCents?: number
  /** Avance immédiate, voie manuelle : la coopérative par laquelle elle passe (« Unipros »). */
  intermediary?: string
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
  /**
   * Recettes lot 6 : les courses, un second montant réglé à part, par carte seulement.
   * `null` quand le batch cooker ne fait pas les courses.
   */
  groceries: {
    status: string
    budgetCents: number
    capturedCents: number | null
    cardSaved: boolean
    methods: readonly ['cb']
  } | null
}

export type CesuMedium = 'ecesu'
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
      // Retour par la page publique : un espace connecté renvoyait à la connexion.
      const here = `${window.location.origin}/retour-stripe?vers=/espace-client/commandes/${bookingId}/paiement`
      return apiFetch<{ sessionId: string; url: string }>('/payments/checkout-session', {
        method: 'POST',
        body: {
          orderId: bookingId,
          method: 'card',
          amountCents,
          currency: 'eur',
          successUrl: `${here}&paiement=succes`,
          cancelUrl: `${here}&paiement=annule`,
        },
      })
    },
  })
}

/**
 * Déclarer un règlement en titres CESU.
 *
 * `proofUploadId` est **obligatoire pour l'e-CESU** : sans la confirmation de
 * l'émetteur, l'API refuse la déclaration. Il s'obtient par
 * `useUploadCesuProof` avant d'arriver ici. Sur des titres papier, il n'y a
 * rien à joindre.
 */
export function useDeclareCesu(bookingId: string) {
  const apiFetch = useApiFetch()
  const refresh = useRefresh(bookingId)
  return useMutation({
    mutationFn: (input: {
      amountCents: number
      medium: CesuMedium
      issuer?: CesuIssuer
      proofUploadId?: string
      /** La référence lue sur le mail de l'émetteur. Facultative. */
      clientProofRef?: string
    }) =>
      apiFetch('/payments/cesu', {
        method: 'POST',
        body: {
          bookingId,
          amountTtc: input.amountCents,
          medium: input.medium,
          ...(input.medium === 'ecesu' && input.issuer ? { issuer: input.issuer } : {}),
          ...(input.proofUploadId ? { proofUploadId: input.proofUploadId } : {}),
          ...(input.clientProofRef?.trim()
            ? { clientProofRef: input.clientProofRef.trim() }
            : {}),
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
      apiFetch<{ status: 'processing'; debitedCents: number; transmittedAt: string | null }>(
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

/* ── La preuve e-CESU ──────────────────────────────────────────────────────── */

/**
 * Un virement e-CESU ne se déclare pas sans la confirmation de l'émetteur :
 * `proofUploadId` est **obligatoire** pour `medium: 'ecesu'`. Le fichier ne
 * passe pas par l'API — on demande un lien, on y dépose le fichier, et c'est
 * l'`uploadId` qu'on joint à la déclaration.
 *
 * PDF, JPEG, PNG ou WebP, 10 Mo au plus : ce n'est pas la même règle que les
 * photos de plats, d'où un vérificateur à part.
 */
export const PREUVE_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]
export const PREUVE_MAX_MO = 10

export function verifiePreuve(file: File): string | null {
  if (!PREUVE_MIME.includes(file.type)) {
    return 'Format non accepté. Déposez un PDF, un JPG, un PNG ou un WebP.'
  }
  if (file.size > PREUVE_MAX_MO * 1024 * 1024) {
    return `Fichier trop lourd. La limite est de ${PREUVE_MAX_MO} Mo.`
  }
  if (file.size === 0) return 'Ce fichier est vide.'
  return null
}

interface Ticket {
  uploadId: string
  method?: string
  url: string
  headers?: Record<string, string>
  expiresAt?: string
}

/** Dépose le fichier et rend l'`uploadId` à joindre à la déclaration. */
export function useUploadCesuProof(bookingId: string) {
  const apiFetch = useApiFetch()
  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const probleme = verifiePreuve(file)
      if (probleme) throw new Error(probleme)

      const ticket = await apiFetch<Ticket>(
        `/me/bookings/${bookingId}/cesu-proof/upload-url`,
        { method: 'POST', body: { contentType: file.type, sizeBytes: file.size } },
      )

      const res = await fetch(ticket.url, {
        method: ticket.method || 'PUT',
        headers: ticket.headers ?? { 'Content-Type': file.type },
        body: file,
      }).catch(() => {
        throw new Error('Le transfert s’est interrompu. Rien n’a été enregistré.')
      })
      if (!res.ok) {
        throw new Error(
          res.status === 403
            ? 'Le stockage a refusé le fichier : sa taille ne correspond pas à celle annoncée.'
            : `Le transfert a échoué (${res.status}).`,
        )
      }
      return ticket.uploadId
    },
  })
}

/** Remplacer une preuve déposée — tant que le batch cooker n'a pas répondu. */
export function useReplaceCesuProof(bookingId: string) {
  const apiFetch = useApiFetch()
  const refresh = useRefresh(bookingId)
  return useMutation({
    mutationFn: ({ paymentId, uploadId }: { paymentId: string; uploadId: string }) =>
      apiFetch(`/me/cesu-payments/${paymentId}/proof`, {
        method: 'PUT',
        body: { uploadId },
      }),
    onSettled: refresh,
  })
}

/** Relire sa propre preuve : un lien signé, valable cinq minutes. */
export function useMyCesuProofUrl() {
  const apiFetch = useApiFetch()
  return useMutation({
    mutationFn: (paymentId: string) =>
      apiFetch<{ url: string; expiresAt: string }>(
        `/me/cesu-payments/${paymentId}/proof-url`,
      ),
  })
}

/* ── Le reste à payer ──────────────────────────────────────────────────────── */

export interface PaymentStatus {
  bookingId: string
  amountTtcCents: number
  /** Somme des paiements **soldés** — un CESU en attente n'y est pas. */
  coveredAmountCents: number
  remainingAmountCents: number
  currency: string
  fullyCovered: boolean
  cesuAvailable: boolean
  crcesuNan?: string | null
}

/**
 * `GET /me/bookings/{id}/payment-status` — ce qui reste dû.
 *
 * Ne compte que les paiements soldés : c'est ce qui permet de régler une
 * prestation moitié en CESU, moitié en carte, et de ne la confirmer que quand
 * les parts s'additionnent. Un CESU déclaré mais pas encore confirmé par le
 * batch cooker ne couvre donc rien — et le dire évite au client de croire
 * qu'il a payé.
 */
export function usePaymentStatus(bookingId: string | undefined) {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, 'booking', bookingId, 'payment-status'],
    queryFn: () =>
      apiFetch<PaymentStatus>(`/me/bookings/${bookingId}/payment-status`),
    enabled: !!bookingId,
  })
}
