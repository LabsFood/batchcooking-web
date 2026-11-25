'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DOCUMENTS_KEY } from './chef-documents'
import { useApiFetch } from './client'
import { useMeKey } from './keys'

/* ─────────────────────────────────────────────────────────────────────────────
   L'argent du batch cooker : ce qu'il encaisse, ce qu'il doit, comment il est
   payé.

   Quatre choses distinctes, que les écrans mélangeaient jusqu'ici parce qu'ils
   étaient écrits sur des données inventées :

   - **les paiements CESU** (`/me/chef/cesu-payments`) : un client déclare
     avoir payé en CESU préfinancé ; le batch cooker confirme avoir reçu les
     titres, ou refuse en disant pourquoi. Tant qu'il n'a rien fait, personne
     ne sait si l'argent est arrivé ;
   - **les factures de commission** (`/me/chef/commission-invoices`) : ce que
     Lab's Food lui facture, et les prélèvements qui vont avec ;
   - **la déclaration SAP** (`/me/chef-profile/sap`) : la voie choisie —
     déclaration NOVA en son nom, ou adhésion à une coopérative — dont
     dépendent le crédit d'impôt du client et qui émet les factures ;
   - **les circuits d'encaissement** : le compte Stripe qui reçoit les
     virements, et le mandat SEPA qui laisse prélever la commission.

   Aucun de ces quatre n'est un « solde » ni un « prochain versement » : ces
   notions n'existent pas dans l'API, et les afficher reviendrait à promettre
   une date que personne ne tient.
   ───────────────────────────────────────────────────────────────────────────── */

/* ── Les paiements CESU ────────────────────────────────────────────────────── */

export type CesuPaymentStatus = string

export interface CesuPayment {
  paymentId: string
  bookingId: string
  bookingReference: string | null
  clientName: string | null
  /** Centimes. */
  amountTtc: number
  currency: string
  /** L'émetteur des titres (Edenred, Sodexo…). */
  issuer: string
  /** `paper` ou `dematerialized` : des titres papier n'arrivent pas le même jour. */
  medium: string
  declaredAt: string
  confirmedAt: string | null
  proofUploadedAt: string | null
  rejectionReason: string | null
  /** Où en est la déclaration : `declared`, `confirmed`, `rejected`… */
  paymentStatus: string
  /** Et le règlement lui-même. */
  settlementStatus: string
  /** `true` quand c'est l'équipe qui a tranché à la place du batch cooker. */
  adminOverride: boolean
  clientProofRef: string | null
}

/** `GET /me/chef/cesu-payments` — les déclarations faites sur mes prestations. */
export function useChefCesuPayments(status?: string) {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, 'cesu-payments', status ?? 'all'],
    queryFn: async () => {
      const res = await apiFetch<unknown>(
        `/me/chef/cesu-payments${status ? `?status=${status}` : ''}`,
      )
      return Array.isArray(res) ? (res as CesuPayment[]) : []
    },
  })
}

function useCesuMutation<V>(run: (f: ReturnType<typeof useApiFetch>, v: V) => Promise<unknown>) {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  return useMutation({
    mutationFn: (v: V) => run(apiFetch, v),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...meKey, 'cesu-payments'] }),
  })
}

/**
 * `POST /me/chef/cesu-payments/{id}/confirm` — « j'ai bien reçu les titres ».
 *
 * C'est ce geste qui solde la prestation côté client : sans lui, elle reste
 * en attente de règlement même si la session a eu lieu.
 */
export function useConfirmCesuPayment() {
  return useCesuMutation<string>((f, id) =>
    f(`/me/chef/cesu-payments/${id}/confirm`, { method: 'POST' }),
  )
}

/** `POST /me/chef/cesu-payments/{id}/reject` — le motif part au client. */
export function useRejectCesuPayment() {
  return useCesuMutation<{ id: string; reason: string }>((f, { id, reason }) =>
    f(`/me/chef/cesu-payments/${id}/reject`, { method: 'POST', body: { reason } }),
  )
}

/* ── Les factures de commission ────────────────────────────────────────────── */

export interface CommissionDebit {
  id?: string
  status?: string
  attemptedAt?: string | null
  amountCents?: number
  failureReason?: string | null
}

export interface CommissionInvoice {
  id: string
  invoiceNumber: string
  periodStart: string
  periodEnd: string
  issuedAt: string
  /** Centimes. */
  amountHtCents: number
  amountVatCents: number
  amountTtcCents: number
  vatRateBps: number
  rateBps: number
  commissionsCount: number
  /** `paid`, `pending`, `failed`… */
  status: string
  /** Comment elle est encaissée : prélèvement SEPA, ou retenue. */
  collectionMethod: string
  paymentMethod: string
  debits: CommissionDebit[]
}

/** `GET /me/chef/commission-invoices` — mes factures et leurs prélèvements. */
export function useCommissionInvoices() {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, 'commission-invoices'],
    queryFn: async () => {
      const res = await apiFetch<unknown>('/me/chef/commission-invoices')
      return Array.isArray(res) ? (res as CommissionInvoice[]) : []
    },
  })
}

/* ── La déclaration « service à la personne » ──────────────────────────────── */

/** Les deux voies possibles, telles que l'API les nomme. */
export type SapDeclarationType = 'type_a_nova' | 'type_b_cooperative'

export interface SapProfile {
  id: string
  chefProfileId: string
  declarationType: SapDeclarationType | null
  /** Voie A : le numéro de déclaration NOVA, obtenu auprès de la DDETS. */
  novaCode: string | null
  /** Voie B : la coopérative qui porte la déclaration. */
  cooperativeName: string | null
  cooperativeMembershipProof: string | null
  /** Accepter les titres CESU préfinancés. */
  acceptsCesu: boolean
  /** L'avance immédiate URSSAF, instruite par l'équipe. */
  urssafTiersPrestationStatus: string
}

export interface SapInput {
  declarationType: SapDeclarationType
  novaCode?: string | null
  cooperativeName?: string | null
  cooperativeMembershipProof?: string | null
  acceptsCesu?: boolean
}

export function useSapProfile() {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, 'sap'],
    queryFn: () => apiFetch<SapProfile>('/me/chef-profile/sap'),
    retry: false,
  })
}

/**
 * `GET /me/chef-profile/cesu-fee` : le taux des frais de traitement et
 * d'encaissement des CESU appliqué à ce batch cooker (en points de base,
 * 1000 = 10 %). Il se calcule sur sa part après commission ; le client ne
 * paie jamais plus cher.
 */
export function useCesuFee() {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, 'cesu-fee'],
    queryFn: () => apiFetch<{ feeBps: number }>('/me/chef-profile/cesu-fee'),
    retry: false,
  })
}

/**
 * `PATCH /me/chef-profile/sap`.
 *
 * `declarationType` est obligatoire à chaque envoi : l'API veut savoir, à
 * chaque fois, sous quelle voie on se place.
 */
export function useSaveSapProfile() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  return useMutation({
    mutationFn: (body: SapInput) =>
      apiFetch<SapProfile>('/me/chef-profile/sap', { method: 'PATCH', body }),
    onSuccess: (s) => {
      qc.setQueryData([...meKey, 'sap'], s)
      qc.invalidateQueries({ queryKey: [...meKey, 'chef-profile'] })
    },
  })
}

/* ── Encaisser, et se faire prélever ───────────────────────────────────────── */

export interface StripeStatus {
  stripeAccountId: string | null
  /** Le compte peut recevoir des paiements. */
  chargesEnabled: boolean
  /** Et reverser au batch cooker. */
  payoutsEnabled: boolean
  /** Le dossier Stripe est complet. */
  detailsSubmitted: boolean
}

export function useStripeStatus() {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, 'stripe-connect'],
    queryFn: () => apiFetch<StripeStatus>('/me/chef-profile/stripe-connect/status'),
    retry: false,
  })
}

/**
 * Jeton de compte Stripe v2, fait dans le navigateur avec la clé publique : une
 * plateforme établie en France ne peut pas envoyer l'e-mail du batch cooker en clair
 * à la création du compte (`account_token_required`).
 */
async function createAccountToken(email: string): Promise<string> {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!key) throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY n’est pas configurée')
  const res = await fetch('https://api.stripe.com/v2/core/account_tokens', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      // Même version que les appels Accounts v2 du backend (stripe-accounts-v2.ts).
      'Stripe-Version': '2026-09-30.endive',
    },
    body: JSON.stringify({ contact_email: email }),
  })
  const body = (await res.json().catch(() => null)) as {
    id?: string
    error?: { message?: string }
  } | null
  if (!res.ok || !body?.id) {
    throw new Error(body?.error?.message ?? 'Stripe n’a pas créé le jeton de compte')
  }
  return body.id
}

/**
 * `POST …/stripe-connect/link` — un lien d'inscription à usage unique. `email` à la
 * première fois seulement : le backend crée alors le compte à partir du jeton.
 */
export function useStripeLink() {
  const apiFetch = useApiFetch()
  return useMutation({
    mutationFn: async (email?: string) =>
      apiFetch<{ url?: string | null }>('/me/chef-profile/stripe-connect/link', {
        method: 'POST',
        body: email ? { accountToken: await createAccountToken(email) } : {},
      }),
  })
}

/** `POST …/stripe-connect/dashboard-link` — l'accès à mon tableau de bord Stripe (dossier complet). */
export function useStripeDashboardLink() {
  const apiFetch = useApiFetch()
  return useMutation({
    mutationFn: () =>
      apiFetch<{ url?: string | null }>('/me/chef-profile/stripe-connect/dashboard-link', {
        method: 'POST',
      }),
  })
}

export interface SepaMandate {
  /** `pending` · `active` · `revoked` (banque ou batch cooker) · `failed`. */
  status: string
  ibanLast4: string | null
  signedAt: string | null
}

export function useSepaMandate() {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, 'sepa-mandate'],
    queryFn: () => apiFetch<SepaMandate>('/me/chef-profile/sepa-mandate'),
    retry: false,
  })
}

/**
 * `POST …/sepa-mandate/checkout` — la page Stripe où le batch cooker saisit son
 * IBAN et signe. L'IBAN ne passe jamais par nous. Stripe le renvoie ensuite sur
 * `returnUrl` avec `?mandat=signe&session_id=…`, ou `?mandat=annule`.
 *
 * L'ancien `…/setup-intent` rendait un secret à confirmer avec Stripe Elements,
 * que cet écran n'a jamais intégré : aucun mandat ne pouvait être signé.
 */
export function useSepaMandateCheckout() {
  const apiFetch = useApiFetch()
  return useMutation({
    mutationFn: (returnUrl: string) =>
      apiFetch<{ url?: string | null }>('/me/chef-profile/sepa-mandate/checkout', {
        method: 'POST',
        body: { returnUrl },
      }),
  })
}

/**
 * `POST …/sepa-mandate/confirm` — au retour de Stripe : active le mandat tout de
 * suite, sans attendre le webhook. Le rappeler ne change rien.
 */
export function useConfirmSepaMandate() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiFetch<SepaMandate>('/me/chef-profile/sepa-mandate/confirm', {
        method: 'POST',
        body: { sessionId },
      }),
    onSuccess: (mandat) => {
      qc.setQueryData([...meKey, 'sepa-mandate'], mandat)
      // Le mandat signé rejoint le dossier, et les commissions dues partent.
      qc.invalidateQueries({ queryKey: DOCUMENTS_KEY })
      qc.invalidateQueries({ queryKey: [...meKey, 'commission-invoices'] })
    },
  })
}

/* ── Mise en forme ─────────────────────────────────────────────────────────── */

export const moneyCents = (cents?: number | null) =>
  cents == null || !Number.isFinite(cents)
    ? null
    : (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

export const SAP_LABEL: Record<SapDeclarationType, string> = {
  type_a_nova: 'Déclaration à mon nom (NOVA)',
  type_b_cooperative: 'Par une coopérative',
}

/** Les statuts que l'API rend, dits en français. Un inconnu passe tel quel. */
const STATUT: Record<string, string> = {
  declared: 'Déclaré par le client',
  confirmed: 'Confirmé',
  rejected: 'Refusé',
  pending: 'En attente',
  settled: 'Réglé',
  unsettled: 'Pas encore réglé',
  paid: 'Payée',
  failed: 'Échec',
  active: 'Actif',
  revoked: 'Révoqué',
  none: 'Aucun',
  approved: 'Approuvé',
  refused: 'Refusé',
  /* Les trois valeurs réellement envoyées par l'API pour l'habilitation URSSAF. `not_started` manquait : un batch cooker sans
     démarche lisait « not_started » à l'écran. Les deux clefs suivantes ne
     viennent d'aucune réponse de l'API — elles datent d'un vocabulaire inventé
     côté console — mais rien ne coûte à les garder le temps qu'un relevé
     confirme qu'aucun écran ne les attend. */
  not_started: 'Pas de démarche',
  not_requested: 'Non demandée',
  requested: 'Demandée',
}

export const statutLabel = (s?: string | null) => (s ? (STATUT[s] ?? s) : '—')

/** Un paiement CESU qui attend le geste du batch cooker. */
export const cesuAttendMoi = (p: CesuPayment) =>
  p.settlementStatus === 'declared'