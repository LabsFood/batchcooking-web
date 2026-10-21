'use client'

import { useQuery } from '@tanstack/react-query'
import { useApiFetch } from './client'
import { useMeKey } from './keys'

/* ─────────────────────────────────────────────────────────────────────────────
   Le crédit d'impôt du client : l'attestation, et les rattachements URSSAF.

   Deux chemins mènent au même avantage fiscal, et il faut les distinguer :

   - **l'avance immédiate** (URSSAF) : le client ne paie que la moitié, tout de
     suite, et l'URSSAF verse le reste au batch cooker. Elle se met en place
     **batch cooker par batch cooker**, pas une fois pour le compte ;
   - **l'attestation annuelle** : pour tout le reste, le client avance l'argent
     et récupère 50 % l'année suivante, sur présentation de ce document.

   L'attestation distingue deux montants, et c'est la nuance qui compte :
   `eligibleAmountCents` est ce qui ouvre droit, `platformAttestedAmountCents`
   est ce que **Lab's Food** atteste. Quand un batch cooker déclare lui-même son
   activité (voie NOVA), c'est lui qui atteste sa part : la différence n'est
   pas une erreur, elle doit s'expliquer à l'écran.
   ───────────────────────────────────────────────────────────────────────────── */

export interface AttestationProvider {
  chefProfileId: string
  chefDisplayName: string
  /** `false` : ce batch cooker n'a pas déclaré son activité SAP. */
  sapDeclared: boolean
  declarationType: string | null
  novaCode: string | null
  cooperativeName: string | null
  eligibleAmountCents: number
  platformAttestedAmountCents: number
  paymentMethods: string[]
  /** Les réserves que l'API attache à cette ligne. */
  notes: string[]
  paymentsCount: number
  currency: string
}

export interface FiscalAttestation {
  clientId: string
  clientName: string | null
  clientEmail: string
  year: number
  /** Total ouvrant droit au crédit d'impôt. */
  eligibleAmountCents: number
  /** Ce que Lab's Food atteste elle-même. */
  platformAttestedAmountCents: number
  paymentsCount: number
  currency: string
  providers: AttestationProvider[]
}

/** `GET /me/fiscal-attestations/{year}` — `404` quand l'année est vide. */
export function useFiscalAttestation(year: number) {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, 'fiscal-attestation', year],
    queryFn: () => apiFetch<FiscalAttestation>(`/me/fiscal-attestations/${year}`),
    retry: false,
  })
}

export interface UrssafLink {
  id: string
  chefProfileId: string
  chefName: string | null
  /** `pending`, `approved`, `refused`… */
  status: string
  requestedAt: string
  decidedAt: string | null
  refusalReason: string | null
}

/** `GET /me/urssaf-links` — un rattachement par batch cooker. */
export function useMyUrssafLinks() {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, 'urssaf-links'],
    queryFn: async () => {
      const res = await apiFetch<unknown>('/me/urssaf-links')
      return Array.isArray(res) ? (res as UrssafLink[]) : []
    },
  })
}

export const URSSAF_LABEL: Record<string, string> = {
  pending: 'Demande en cours',
  approved: 'Active',
  refused: 'Refusée',
  none: 'Pas de rattachement',
}

export const URSSAF_TON: Record<string, string> = {
  pending: 'bg-amber-soft text-amber-deep',
  approved: 'bg-mint text-mint-ink',
  refused: 'bg-red-100 text-red-700',
}

export const centimes = (cents?: number | null) =>
  cents == null || !Number.isFinite(cents)
    ? '—'
    : (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
