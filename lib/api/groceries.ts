'use client'

/* ─────────────────────────────────────────────────────────────────────────────
   Courses payées à part — couche API (Recettes, lot 6).

   Le mandat de débours est accepté par la case de la réservation. Le client
   enregistre une carte (page Stripe), son Budget Courses (le plafond réglé par
   Lab's Food, 100 € au plus) y est réservé 48 h avant la séance : l'empreinte.
   Le batch cooker envoie le message avant les courses, le client confirme ou
   annule ; puis les tickets, prélevés 24 h plus tard au centime près. Une ligne
   se conteste pendant 48 h. Tout l'état vient de `GET …/groceries`.
   ───────────────────────────────────────────────────────────────────────────── */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApiFetch } from './client'
import { useMeKey } from './keys'

export type GroceryStatus =
  | 'awaiting_card'
  | 'card_saved'
  | 'hold_placed'
  | 'hold_failed'
  | 'notice_sent'
  | 'awaiting_client'
  | 'confirmed'
  | 'cancelled'
  | 'receipts_submitted'
  | 'captured'
  | 'settled'

export interface GroceryLine {
  id: string
  label: string
  amountCents: number
  receiptId: string | null
  clientApprovedAt: string | null
  contestedAt: string | null
  contestReason: string | null
  decision: 'upheld' | 'rejected' | null
  decidedAt: string | null
  decisionNote: string | null
  refundedCents: number
}

export interface Groceries {
  bookingId: string
  applies: boolean
  status: GroceryStatus | null
  budgetCents: number
  guaranteed: boolean
  /** Le Verrouillage : l'empreinte est posée, les courses ouvrent. */
  opensAt: string
  mandate: { version: string; acceptedAt: string; maxCents: number } | null
  card: { brand: string | null; last4: string; expMonth: number | null; expYear: number | null } | null
  hold: {
    placedAt: string | null
    expiresAt: string | null
    failedAt: string | null
    failureCode: string | null
    fixBefore: string
  } | null
  notice: {
    sentAt: string
    shoppingAt: string | null
    cancelDeadline: string | null
    email?: { deliveredAt: string | null; bouncedAt: string | null; lastEvent: string | null }
    confirmedAt: string | null
    confirmedBy: 'client' | 'silence' | null
  } | null
  minNoticeMinutes: number
  silenceConfirms: boolean
  cancelled: { at: string; by: string | null; reason: string | null } | null
  forfaitWaivedCents: number
  receipts: { id: string; purchasedAt: string; mimeType: string }[]
  lines: GroceryLine[]
  receiptsSubmittedAt: string | null
  receiptsTotalCents: number | null
  contestClosesAt: string | null
  captureDueAt: string | null
  capture: { at: string; cents: number | null; releasedCents: number | null; safety: boolean } | null
  refundedCents: number
  instantPayout?: { chosen: boolean; feeCents: number | null; status: string | null } | null
  instantPayoutFee?: { bps: number; minCents: number }
  settledAt: string | null
  /**
   * L'empreinte attend le compte de paiement (Stripe) du batch cooker, pas la carte du
   * client : elle est posée dès qu'il est prêt.
   */
  waitingChefAccount?: boolean
}

/** Qui regarde : le chemin de l'API change, la réponse a la même forme. */
export type GroceriesAudience = 'client' | 'chef'

const path = (audience: GroceriesAudience, bookingId: string) =>
  audience === 'client'
    ? `/me/bookings/${bookingId}/groceries`
    : `/chef-missions/${bookingId}/groceries`

const key = (meKey: readonly unknown[], bookingId: string) => [...meKey, 'groceries', bookingId]

export function useGroceries(bookingId: string | undefined, audience: GroceriesAudience) {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: key(meKey, bookingId ?? ''),
    queryFn: () => apiFetch<Groceries>(path(audience, bookingId!)),
    enabled: !!bookingId,
  })
}

function useGroceriesMutation<TInput>(
  run: (apiFetch: ReturnType<typeof useApiFetch>, input: TInput) => Promise<Groceries>,
) {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  return useMutation({
    mutationFn: (input: TInput) => run(apiFetch, input),
    onSuccess: (data) => {
      qc.setQueryData(key(meKey, data.bookingId), data)
      // La réservation affiche « Budget garanti » et le relevé de débours.
      qc.invalidateQueries({ queryKey: [...meKey, 'bookings'] })
    },
  })
}

/** La page Stripe qui enregistre la carte ; on y envoie le navigateur. */
export function useStartGroceriesCard() {
  const apiFetch = useApiFetch()
  return useMutation({
    mutationFn: (bookingId: string) => {
      const here = `${window.location.origin}/espace-client/commandes/${bookingId}`
      return apiFetch<{ sessionId: string; url: string }>(`/me/bookings/${bookingId}/groceries/card`, {
        method: 'POST',
        body: {
          successUrl: `${here}?groceries_session={CHECKOUT_SESSION_ID}`,
          cancelUrl: here,
        },
      })
    },
  })
}

export const useConfirmGroceriesCard = () =>
  useGroceriesMutation<{ bookingId: string; sessionId: string }>((f, { bookingId, sessionId }) =>
    f<Groceries>(`/me/bookings/${bookingId}/groceries/card/confirm`, {
      method: 'POST',
      body: { sessionId },
    }),
  )

export const useRetryGroceriesHold = () =>
  useGroceriesMutation<string>((f, bookingId) =>
    f<Groceries>(`/me/bookings/${bookingId}/groceries/hold/retry`, { method: 'POST' }),
  )

export const useConfirmGroceries = () =>
  useGroceriesMutation<string>((f, bookingId) =>
    f<Groceries>(`/me/bookings/${bookingId}/groceries/confirm`, { method: 'POST' }),
  )

export const useCancelGroceries = () =>
  useGroceriesMutation<{ bookingId: string; reason?: string }>((f, { bookingId, reason }) =>
    f<Groceries>(`/me/bookings/${bookingId}/groceries/cancel`, {
      method: 'POST',
      body: reason ? { reason } : {},
    }),
  )

export const useApproveGroceryLine = () =>
  useGroceriesMutation<{ bookingId: string; lineId: string }>((f, { bookingId, lineId }) =>
    f<Groceries>(`/me/bookings/${bookingId}/groceries/lines/${lineId}/approve`, { method: 'POST' }),
  )

export const useContestGroceryLine = () =>
  useGroceriesMutation<{ bookingId: string; lineId: string; reason: string }>(
    (f, { bookingId, lineId, reason }) =>
      f<Groceries>(`/me/bookings/${bookingId}/groceries/lines/${lineId}/contest`, {
        method: 'POST',
        body: { reason },
      }),
  )

/** Une photo de ticket, pour 5 minutes. */
export function useGroceryReceiptUrl(audience: GroceriesAudience) {
  const apiFetch = useApiFetch()
  return useMutation({
    mutationFn: ({ bookingId, receiptId }: { bookingId: string; receiptId: string }) =>
      apiFetch<{ url: string }>(`${path(audience, bookingId)}/receipts/${receiptId}/url`),
  })
}

export const useSendGroceriesNotice = () =>
  useGroceriesMutation<{ bookingId: string; shoppingAt: string; cancelDeadline: string }>(
    (f, { bookingId, ...body }) =>
      f<Groceries>(`/chef-missions/${bookingId}/groceries/notice`, { method: 'POST', body }),
  )

export interface ReceiptLineInput {
  label: string
  amountCents: number
  receipt: number | null
}

/** Dépose les photos (URL signée) puis les tickets et leurs lignes, d'un bloc. */
export function useSubmitGroceryReceipts() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  return useMutation({
    mutationFn: async (input: {
      bookingId: string
      receipts: { file: File; purchasedAt: string }[]
      lines: ReceiptLineInput[]
      instantPayout: boolean
    }) => {
      const uploaded: { uploadId: string; purchasedAt: string }[] = []
      for (const receipt of input.receipts) {
        const upload = await apiFetch<{
          uploadId: string
          url: string
          method?: string
          headers?: Record<string, string>
        }>(`/chef-missions/${input.bookingId}/groceries/receipts/upload-url`, {
          method: 'POST',
          body: { contentType: receipt.file.type, sizeBytes: receipt.file.size },
        })
        const sent = await fetch(upload.url, {
          method: upload.method ?? 'PUT',
          headers: upload.headers ?? { 'Content-Type': receipt.file.type },
          body: receipt.file,
        })
        if (!sent.ok) throw new Error('Le ticket n’a pas pu être envoyé.')
        uploaded.push({ uploadId: upload.uploadId, purchasedAt: receipt.purchasedAt })
      }
      return apiFetch<Groceries>(`/chef-missions/${input.bookingId}/groceries/receipts`, {
        method: 'POST',
        body: { receipts: uploaded, lines: input.lines, instantPayout: input.instantPayout },
      })
    },
    onSuccess: (data) => {
      qc.setQueryData(key(meKey, data.bookingId), data)
      qc.invalidateQueries({ queryKey: [...meKey, 'mission'] })
    },
  })
}

export interface GroceriesStatement {
  month: string
  commissionCents: 0
  rows: {
    bookingId: string
    reference: string | null
    startsAt: string
    capturedAt: string | null
    capturedCents: number
    refundedCents: number
    instantPayoutFeeCents: number
    reimbursedCents: number
  }[]
  totals: {
    capturedCents: number
    refundedCents: number
    instantPayoutFeeCents: number
    reimbursedCents: number
  }
}

export function useGroceriesStatement(month: string) {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, 'groceries-statement', month],
    queryFn: () =>
      apiFetch<GroceriesStatement>(`/me/chef/groceries/statement?month=${encodeURIComponent(month)}`),
  })
}

/** Les textes des codes de refus de la carte, pour le client. */
export const HOLD_FAILURE: Record<string, string> = {
  authentication_required: 'Votre banque demande une authentification : enregistrez la carte à nouveau pour la confirmer.',
  insufficient_funds: 'Le solde de la carte ne couvre pas le Budget Courses.',
  expired_card: 'La carte a expiré.',
  card_declined: 'La carte a été refusée par votre banque.',
  chef_account_not_ready: 'Le compte de paiement de votre batch cooker n’est pas prêt : Lab’s Food vous recontacte.',
}

export const euros = (cents: number) =>
  (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
