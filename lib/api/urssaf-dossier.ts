'use client'

import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApiFetch } from './client'
import { useMeKey } from './keys'

/* ─────────────────────────────────────────────────────────────────────────────
   Le dossier URSSAF du client (avance immédiate).

   Ce que l'URSSAF demande avant de pouvoir avancer le crédit d'impôt : état
   civil, lieu de naissance, coordonnées et compte bancaire. L'API le chiffre
   avant de le ranger ; Lab's Food le saisit pour le client sur l'espace de la
   coopérative. L'IBAN ne revient jamais : seulement ses 4 derniers
   chiffres (`ibanLast4`), et il se redonne à chaque modification.
   ───────────────────────────────────────────────────────────────────────────── */

export interface UrssafDossierAddress {
  line1: string
  line2?: string | null
  postalCode: string
  city: string
  /** Code INSEE du pays, `99100` pour la France. */
  countryCode: string
}

export interface UrssafDossierInput {
  civility: 'M' | 'F'
  birthName: string
  usageName?: string | null
  firstNames: string
  /** `AAAA-MM-JJ`. */
  birthDate: string
  birthCountryCode: string
  birthDepartmentCode?: string | null
  birthCommuneCode?: string | null
  birthCommuneName?: string | null
  mobilePhone: string
  email: string
  address: UrssafDossierAddress
  iban: string
  bic: string
  accountHolder: string
}

export interface MyUrssafDossier {
  filled: boolean
  filledAt: string | null
  updatedAt: string | null
  ibanLast4: string | null
  /** Tout sauf l'IBAN. */
  dossier: Omit<UrssafDossierInput, 'iban'> | null
}

const useKey = () => [...useMeKey(), 'profile', 'urssaf-dossier'] as const

export function useMyUrssafDossier() {
  const apiFetch = useApiFetch()
  const { isLoaded, isSignedIn } = useAuth()
  return useQuery({
    queryKey: useKey(),
    queryFn: () => apiFetch<MyUrssafDossier>('/me/urssaf-dossier'),
    enabled: isLoaded && !!isSignedIn,
  })
}

/** Rafraîchit le dossier, la liste « Bien démarrer » et les options de paiement. */
function useRefreshAfter() {
  const qc = useQueryClient()
  const meKey = useMeKey()
  return () => {
    qc.invalidateQueries({ queryKey: [...meKey, 'profile'] })
    qc.invalidateQueries({ queryKey: [...meKey, 'payment-options'] })
  }
}

export function useSaveUrssafDossier() {
  const apiFetch = useApiFetch()
  const refresh = useRefreshAfter()
  return useMutation({
    mutationFn: (input: UrssafDossierInput) =>
      apiFetch<MyUrssafDossier>('/me/urssaf-dossier', { method: 'PUT', body: input }),
    onSuccess: refresh,
  })
}

export function useDeleteUrssafDossier() {
  const apiFetch = useApiFetch()
  const refresh = useRefreshAfter()
  return useMutation({
    mutationFn: () => apiFetch<void>('/me/urssaf-dossier', { method: 'DELETE' }),
    onSuccess: refresh,
  })
}

/** Une commune de naissance, avec ce que l'URSSAF attend. */
export interface BirthCommune {
  nom: string
  /** Code INSEE de la commune (`75056`, `2A004`). */
  code: string
  /** Département sur trois caractères (`075`, `02A`, `971`). */
  departement: string
}

/** `75` → `075`, `2A` → `02A`, `971` reste `971`. */
const departementUrssaf = (code: string) => (code.length === 2 ? `0${code}` : code)

/**
 * Communes par nom, dans la base officielle (geo.api.gouv.fr), les plus
 * peuplées d'abord. Seulement les communes actuelles.
 */
export function useBirthCommunes(nom: string) {
  const q = nom.trim()
  return useQuery({
    queryKey: ['communes-par-nom', q.toLowerCase()],
    enabled: q.length >= 2,
    staleTime: Infinity,
    retry: 1,
    queryFn: async ({ signal }) => {
      const res = await fetch(
        `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&fields=nom,code,codeDepartement&boost=population&limit=8`,
        { signal },
      )
      if (!res.ok) throw new Error(`geo.api.gouv.fr ${res.status}`)
      return ((await res.json()) as { nom: string; code: string; codeDepartement: string }[]).map(
        (c): BirthCommune => ({ nom: c.nom, code: c.code, departement: departementUrssaf(c.codeDepartement) }),
      )
    },
  })
}
