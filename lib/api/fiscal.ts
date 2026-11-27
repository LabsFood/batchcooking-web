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
   est ce que **Lab's Food** atteste, sous la déclaration SAP de la SAS
   (`issuer`), pour toutes les prestations. Seule la part réglée en e-CESU
   reste attestée par l'émetteur du CESU : la différence doit s'expliquer à
   l'écran. La déclaration propre du batch cooker ne sert qu'à vérifier son
   dossier, elle ne s'affiche pas au client.
   ───────────────────────────────────────────────────────────────────────────── */

/** Lab's Food, sous la déclaration SAP de la SAS : qui émet l'attestation. */
export interface AttestationIssuer {
  name: string
  legalName: string
  siren: string | null
  address: string | null
  sapDeclarationNumber: string | null
}

export interface AttestationProvider {
  chefProfileId: string
  chefDisplayName: string
  /** Vérification du dossier du batch cooker seulement : jamais affiché au client. */
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
  /** Absent tant que l'API n'est pas déployée avec l'émetteur. */
  issuer?: AttestationIssuer
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
