import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiBlob, useApiFetch } from './client'
import { useMeKey } from './keys'
import type { Booking } from './bookings'

/* ─────────────────────────────────────────────────────────────────────────────
   Le contrat d'une prestation, sous les CGV V1 (en vigueur le 21/11/2026).

   - les trois cases de commande (art. 5.1), textes servis par `GET /me/profile`
     → `contractTerms` ;
   - la rétractation (art. 15) : `POST /me/bookings/{id}/withdrawal` ;
   - les documents du contrat : `GET /me/bookings/{id}/documents/{kind}`.
   ───────────────────────────────────────────────────────────────────────────── */

export interface ContractTerms {
  version: string
  inForceFrom: string
  cgvText: string
  deboursMandateText: string
  earlyExecutionText: string
}

export type ContractGap = 'CGV' | 'DEBOURS_MANDATE' | 'EARLY_EXECUTION'

/** Corps `consents` de la réservation, de l'acceptation d'un devis et de `…/consents`. */
export interface ContractConsents {
  version: string
  cgv?: boolean
  deboursMandate?: boolean
  earlyExecution?: boolean
}

export interface BookingContract {
  version: string | null
  cgvAcceptedAt: string | null
  deboursMandateAcceptedAt: string | null
  earlyExecutionRequestedAt: string | null
  concludedAt: string | null
}

export type WithdrawalRefusal =
  | 'WITHDRAWAL_NOT_CONCLUDED'
  | 'WITHDRAWAL_ALREADY_SENT'
  | 'BOOKING_CANCELLED'
  | 'WITHDRAWAL_PERIOD_OVER'
  | 'WITHDRAWAL_EXECUTED'

export interface BookingWithdrawal {
  open: boolean
  refusal: WithdrawalRefusal | null
  availableUntil: string | null
  submittedAt: string | null
  /** `null` : la part est fixée par l'équipe (prestation en cours). */
  amountDueCents: number | null
  refundCents: number | null
}

export type BookingDocumentKind =
  | 'cgv'
  | 'withdrawal-form'
  | 'debours-mandate'
  | 'groceries-statement'

export const DOCUMENT_LABEL: Record<BookingDocumentKind, string> = {
  cgv: 'Conditions générales de vente',
  'withdrawal-form': 'Formulaire de rétractation',
  'debours-mandate': 'Mandat de débours',
  // Recettes lot 6 (CGV 7.6) : les tickets et le prélèvement, hors facture.
  'groceries-statement': 'Relevé de débours',
}

/** L'identité légale du batch cooker (CGV art. 3.2) : `null` = pas encore renseigné. */
export interface ChefLegalIdentity {
  name: string | null
  legalStatus: string | null
  siren: string | null
  businessAddress: string | null
  vat: string | null
  sapNumber: string | null
  insurance: string | null
  mediator: string | null
  contact: string
}

/** Les lignes affichables, dans l'ordre de l'art. 3.2. */
export function legalIdentityLines(id: ChefLegalIdentity | null | undefined) {
  if (!id) return []
  const lines: [string, string | null][] = [
      ['Dénomination', id.name],
      ['Statut', id.legalStatus],
      ['SIREN', id.siren],
      ['Adresse professionnelle', id.businessAddress],
      ['TVA', id.vat],
      ['Déclaration SAP', id.sapNumber],
      ['Assurance', id.insurance],
      ['Médiateur', id.mediator],
      ['Contact', id.contact],
  ]
  return lines.filter((l): l is [string, string] => !!l[1])
}

/**
 * Quelles cases montrer. Le mandat : le batch cooker fait les courses (règle
 * `chefShops` de l'API). L'exécution anticipée : la séance tombe dans le délai
 * de rétractation compté depuis la conclusion au plus tard — `windowDays` vaut
 * 21 pour une réservation (72 h de paiement + 14 j + report de week-end ou de
 * férié), 18 pour un devis (conclu à l'acceptation). Un 422 `missing` complète.
 */
export function neededGaps(opts: {
  chefShops: boolean
  startsAt: string | null | undefined
  windowDays: number
  now?: Date
}): ContractGap[] {
  const gaps: ContractGap[] = ['CGV']
  if (opts.chefShops) gaps.push('DEBOURS_MANDATE')
  const now = opts.now ?? new Date()
  if (
    opts.startsAt &&
    new Date(opts.startsAt).getTime() < now.getTime() + opts.windowDays * 86_400_000
  ) {
    gaps.push('EARLY_EXECUTION')
  }
  return gaps
}

/** Ce qu'un refus `CONTRACT_CONSENT_REQUIRED` demande, ou `null`. */
export function consentGaps(body: unknown): { missing: ContractGap[]; version: string } | null {
  const b = body as { code?: string; missing?: ContractGap[]; version?: string } | null
  return b?.code === 'CONTRACT_CONSENT_REQUIRED'
    ? { missing: b.missing ?? [], version: b.version ?? '' }
    : null
}

/** `POST /me/bookings/{id}/consents` — une réservation posée par le chef ou un admin. */
export function useBookingConsents() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  return useMutation({
    mutationFn: ({ id, consents }: { id: string; consents: ContractConsents }) =>
      apiFetch<Booking>(`/me/bookings/${id}/consents`, { method: 'POST', body: { consents } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...meKey, 'bookings'] }),
  })
}

/** `POST /me/bookings/{id}/withdrawal` — « Confirmer la rétractation ». */
export function useWithdrawal() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Booking>(`/me/bookings/${id}/withdrawal`, { method: 'POST' }),
    onSettled: () => qc.invalidateQueries({ queryKey: [...meKey, 'bookings'] }),
  })
}

/** `GET /me/bookings/{id}/documents/{kind}` : la route veut le jeton, d'où le blob. */
export function useBookingDocument() {
  const apiBlob = useApiBlob()
  return useMutation({
    mutationFn: async ({
      id,
      kind,
      filename,
    }: {
      id: string
      kind: BookingDocumentKind
      filename: string
    }) => {
      const pdf = await apiBlob(`/me/bookings/${id}/documents/${kind}`)
      const url = URL.createObjectURL(pdf)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    },
  })
}
