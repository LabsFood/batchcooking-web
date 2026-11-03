'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApiFetch } from './client'

/* ─────────────────────────────────────────────────────────────────────────────
   Dossier du batch cooker — pièces justificatives.

   Le dépôt tient en trois temps, et le fichier ne passe jamais par l'API :

     1. `POST /me/chef-documents/{type}/upload-url` → une URL privée et un uploadId
     2. `PUT` du fichier vers cette URL, avec les en-têtes qu'elle indique
     3. `POST /me/chef-documents/{type}/confirm` avec l'uploadId

   Rien n'est enregistré avant la troisième étape : un dépôt abandonné ne laisse
   aucune trace. C'est aussi pour ça qu'on ne « pré-crée » rien côté front.
   ───────────────────────────────────────────────────────────────────────────── */

export type ChefDocumentType =
  | 'identity'
  | 'registration'
  | 'residence-permit'
  | 'renewal-receipt'
  | 'status-proof'
  | 'sap-declaration'
  | 'sap-cooperative'
  | 'rc-pro'
  | 'haccp'
  | 'ddpp'
  | 'vigilance'
  | 'sepa-mandate'

export type DocumentFamily = 'blocking' | 'conditional' | 'recommended'

export type DocumentStatus =
  | 'missing'
  | 'submitted'
  | 'reviewing'
  | 'valid'
  | 'rejected'
  | 'expiring'
  | 'expired'

/**
 * `draft` rien de déposé · `incomplete` une pièce bloquante manque ou est
 * refusée · `reviewing` tout est là, reste à vérifier · `awaiting-registration`
 * tout est bon mais pas encore d'entreprise · `validated` · `suspended` une
 * pièce bloquante a expiré · `disabled` mis hors ligne par un admin.
 */
export type DossierStatus =
  | 'draft'
  | 'incomplete'
  | 'reviewing'
  | 'awaiting-registration'
  | 'validated'
  | 'suspended'
  | 'disabled'

export interface ChefDocument {
  type: ChefDocumentType
  /** Libellé fourni par l'API : il fait foi sur toute table locale. */
  label: string
  family: DocumentFamily
  required: boolean
  status: DocumentStatus
  /** 0 tant qu'aucun fichier n'a été déposé. */
  version: number
  fileName: string | null
  sizeBytes: number | null
  submittedAt: string | null
  expiresOn: string | null
  /** Motif de refus, écrit par l'admin et lu tel quel. */
  reason: string | null
  reasonCode: string | null
  /**
   * Renvoyé par `confirm` : remplacer une pièce bloquante expirée remet le
   * batch cooker en ligne tout de suite, avant même qu'un admin la regarde.
   */
  reactivated?: boolean
}

export interface ChefDossier {
  dossierStatus: DossierStatus
  canApprove: boolean
  documents: ChefDocument[]
}

export interface ChefApplication {
  id: string
  reference: string
  status: 'submitted' | 'changes-requested' | 'approved' | 'rejected'
  submittedAt: string
  decidedAt: string | null
  dossierStatus: DossierStatus
  canApprove: boolean
  documents: ChefDocument[]
  refusal: { reason?: string; reasonCode?: string; allowReapplyAfter?: string | null } | null

  /**
   * Ce que la candidature a déclaré. L'API dit de préremplir le formulaire
   * depuis `answers` ; les versions précédentes posaient les sections à la
   * racine. `applicationAnswers()` lit les deux, pour ne dépendre ni de l'une
   * ni de l'autre.
   */
  answers?: ApplicationAnswers

  identity?: { firstName?: string; lastName?: string; email?: string; phone?: string }
  address?: {
    street?: string
    line2?: string | null
    postcode?: string
    city?: string
    country?: string
  }
  interventionZones?: {
    regionCode?: string
    regionLabel?: string
    scope?: 'region' | 'cities'
    cities?: { name?: string; dept?: string; insee?: string }[]
  }[]
  workAuthorization?: { status?: string; details?: string | null }
  company?: {
    legalForm?: string
    siret?: string | null
    sap?: { path?: string; declarationNumber?: string | null }
  }
}

/** Les cinq sections modifiables, telles que l'API les rend et les attend. */
export interface ApplicationAnswers {
  identity?: ChefApplication['identity']
  address?: ChefApplication['address']
  interventionZones?: ChefApplication['interventionZones']
  workAuthorization?: ChefApplication['workAuthorization']
  company?: ChefApplication['company']
}

/** Les réponses déclarées, qu'elles arrivent sous `answers` ou à la racine. */
export function applicationAnswers(app?: ChefApplication | null): ApplicationAnswers {
  if (!app) return {}
  const a = app.answers ?? {}
  return {
    identity: a.identity ?? app.identity,
    address: a.address ?? app.address,
    interventionZones: a.interventionZones ?? app.interventionZones,
    workAuthorization: a.workAuthorization ?? app.workAuthorization,
    company: a.company ?? app.company,
  }
}

interface UploadTicket {
  uploadId: string
  method: string
  url: string
  headers: Record<string, string>
  expiresAt: string
}

export const DOCUMENTS_KEY = ['me', 'chef-documents'] as const
export const APPLICATION_KEY = ['me', 'chef-application'] as const

/** `GET /me/chef-documents` — l'état du dossier et chaque pièce. */
export function useChefDocuments() {
  const apiFetch = useApiFetch()
  return useQuery({
    queryKey: DOCUMENTS_KEY,
    queryFn: () => apiFetch<ChefDossier>('/me/chef-documents'),
  })
}

/** `GET /me/chef-application` — où en est la candidature. */
export function useChefApplication() {
  const apiFetch = useApiFetch()
  return useQuery({
    queryKey: APPLICATION_KEY,
    queryFn: () => apiFetch<ChefApplication>('/me/chef-application'),
    // 404 = ce compte n'a pas candidaté : ce n'est pas une erreur à réessayer.
    retry: false,
  })
}

export interface UploadInput {
  type: ChefDocumentType
  file: File
  /** Obligatoire pour les pièces qui expirent (AAAA-MM-JJ). */
  expiresOn?: string
}

export class UploadError extends Error {
  step: 'ticket' | 'transfer' | 'confirm'
  constructor(step: UploadError['step'], message: string) {
    super(message)
    this.name = 'UploadError'
    this.step = step
  }
}

/**
 * Dépose une pièce. L'erreur dit à quelle étape ça a cassé : un transfert qui
 * échoue ne se répare pas comme un refus de l'API.
 */
export function useUploadDocument() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ type, file, expiresOn }: UploadInput): Promise<ChefDocument> => {
      let ticket: UploadTicket
      try {
        ticket = await apiFetch<UploadTicket>(`/me/chef-documents/${type}/upload-url`, {
          method: 'POST',
          body: { fileName: file.name, mimeType: file.type, sizeBytes: file.size },
        })
      } catch (e) {
        throw new UploadError('ticket', e instanceof Error ? e.message : 'Dépôt refusé.')
      }

      // Le fichier part directement vers le stockage, sans transiter par l'API.
      try {
        const res = await fetch(ticket.url, {
          method: ticket.method || 'PUT',
          headers: ticket.headers ?? { 'Content-Type': file.type },
          body: file,
        })
        if (!res.ok) {
          throw new Error(`Le transfert a échoué (${res.status}).`)
        }
      } catch (e) {
        throw new UploadError('transfer', e instanceof Error ? e.message : 'Transfert interrompu.')
      }

      try {
        return await apiFetch<ChefDocument>(`/me/chef-documents/${type}/confirm`, {
          method: 'POST',
          body: {
            uploadId: ticket.uploadId,
            fileName: file.name,
            ...(expiresOn ? { expiresOn } : {}),
          },
        })
      } catch (e) {
        throw new UploadError('confirm', e instanceof Error ? e.message : 'Enregistrement refusé.')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DOCUMENTS_KEY })
      qc.invalidateQueries({ queryKey: APPLICATION_KEY })
    },
  })
}

/** `GET /me/chef-documents/{type}/versions` — l'historique d'une pièce. */
export function useDocumentVersions(type: ChefDocumentType | null) {
  const apiFetch = useApiFetch()
  return useQuery({
    queryKey: ['me', 'chef-documents', type, 'versions'],
    queryFn: () => apiFetch<{ versions: ChefDocument[] }>(`/me/chef-documents/${type}/versions`),
    enabled: !!type,
  })
}

// ── Référentiels d'affichage ────────────────────────────────────────────────

export const DOSSIER_LABEL: Record<DossierStatus, string> = {
  draft: 'À compléter',
  incomplete: 'Incomplet',
  reviewing: 'En vérification',
  'awaiting-registration': 'En attente d’immatriculation',
  validated: 'Validé',
  suspended: 'Suspendu',
  disabled: 'Désactivé',
}

export const DOC_STATUS_LABEL: Record<DocumentStatus, string> = {
  missing: 'À déposer',
  submitted: 'En vérification',
  reviewing: 'En vérification',
  valid: 'Validée',
  rejected: 'Refusée',
  expiring: 'Expire bientôt',
  expired: 'Expirée',
}

export const FAMILY_LABEL: Record<DocumentFamily, string> = {
  blocking: 'Obligatoires',
  conditional: 'Selon votre situation',
  recommended: 'Facultatives',
}

export const FAMILY_HINT: Record<DocumentFamily, string> = {
  blocking: 'Sans elles, votre compte ne peut pas être activé.',
  conditional: 'Demandées d’après ce que vous avez déclaré à la candidature.',
  recommended: 'Elles renforcent votre vitrine et rassurent les clients.',
}

/**
 * Pièces que l'API écrit elle-même et qu'on ne dépose pas : le mandat SEPA est
 * la preuve d'une signature recueillie par Stripe. L'API refuse un dépôt (403).
 */
export const SYSTEM_TYPES = new Set<ChefDocumentType>(['sepa-mandate'])

/** Pièces dont l'API exige une date d'expiration au dépôt. */
export const EXPIRING_TYPES = new Set<ChefDocumentType>([
  'identity',
  'residence-permit',
  'renewal-receipt',
  'sap-declaration',
  'rc-pro',
  'haccp',
  'vigilance',
])

export const ACCEPTED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
export const MAX_FILE_MB = 10

/** Vérifie un fichier avant d'ouvrir un ticket pour rien. */
export function checkFile(file: File): string | null {
  if (!ACCEPTED_MIME.includes(file.type)) {
    return 'Format non accepté. Déposez un PDF, un JPG, un PNG ou un WebP.'
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return `Fichier trop lourd. La limite est de ${MAX_FILE_MB} Mo.`
  }
  if (file.size === 0) return 'Ce fichier est vide.'
  return null
}

/* ── Aperçu d'une pièce déposée ────────────────────────────────── */

/**
 * `GET /me/chef-documents/{type}/preview-url` — lien signé, cinq minutes.
 *
 * Servi « inline » : le navigateur affiche le PDF ou l'image au lieu de la
 * télécharger, et `mimeType` dit lequel. Chaque lien remis est journalisé,
 * comme pour un admin : on ne le demande donc qu'au moment du clic.
 *
 * `404` signifie « rien n'a été déposé pour ce type », pas une panne. Les
 * déploiements plus anciens n'ont que `download-url` : on y retombe, pour que
 * l'écran marche sur les deux.
 */
export class PreviewUnavailable extends Error {
  constructor(message = 'Aucune pièce déposée pour ce type.') {
    super(message)
    this.name = 'PreviewUnavailable'
  }
}

export interface DocumentPreview {
  url: string
  fileName?: string
  mimeType?: string
  expiresAt?: string
}

export function useDocumentPreview() {
  const apiFetch = useApiFetch()
  return useMutation({
    mutationFn: async (type: ChefDocumentType) => {
      const statut = (e: unknown) => (e as { status?: number })?.status
      try {
        return await apiFetch<DocumentPreview>(`/me/chef-documents/${type}/preview-url`)
      } catch (e) {
        if (statut(e) === 404) {
          // Soit la pièce n'existe pas, soit l'API est antérieure à
          // `preview-url` : la seconde hypothèse se vérifie en un appel.
          try {
            return await apiFetch<DocumentPreview>(
              `/me/chef-documents/${type}/download-url`,
            )
          } catch (e2) {
            if (statut(e2) === 404) throw new PreviewUnavailable()
            throw e2
          }
        }
        throw e
      }
    },
  })
}

/* ── Corriger ce qu'on a déclaré ───────────────────────────────────────────── */

/**
 * `PATCH /me/chef-application`
 *
 * Ouvert pendant que la candidature est `submitted` ou `changes-requested`.
 * Chaque section part **entière** : elle remplace celle qui est stockée, et
 * repasse les règles d'une soumission. `email` et le consentement ne se
 * changent pas, l'API les refuse.
 *
 * La réponse est la même vue que `GET` : une réponse modifiée peut changer la
 * liste des pièces demandées, d'où l'invalidation des deux clés.
 */
export type ApplicationPatch = Pick<
  ApplicationAnswers,
  'identity' | 'address' | 'interventionZones' | 'workAuthorization' | 'company'
>

export function useUpdateApplication() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: ApplicationPatch) =>
      apiFetch<ChefApplication>('/me/chef-application', {
        method: 'PATCH',
        body: patch,
      }),
    onSuccess: (app) => {
      qc.setQueryData(APPLICATION_KEY, app)
      qc.invalidateQueries({ queryKey: APPLICATION_KEY })
      qc.invalidateQueries({ queryKey: DOCUMENTS_KEY })
    },
  })
}

/** Le refus de l'API, dit à la personne qui vient de cliquer. */
export function applicationPatchMessage(error: unknown): string {
  const e = error as { status?: number; message?: string; body?: unknown } | null
  const corps = (e?.body ?? {}) as { code?: string; message?: string }
  const code = corps.code ?? ''

  if (e?.status === 409) {
    if (code === 'APPLICATION_DECIDED' || /DECIDED/.test(e?.message ?? '')) {
      return 'La candidature a déjà été tranchée : elle ne se modifie plus.'
    }
    if (code === 'ANSWER_LOCKED' || /LOCKED/.test(e?.message ?? '')) {
      return 'Cette réponse est verrouillée : une pièce validée s’appuie dessus. Demandez à Lab’s Food de la rouvrir.'
    }
    return e?.message || 'Cette modification n’est plus possible.'
  }
  if (e?.status === 422) {
    // Vérifiés contre la base officielle des communes (geo.api.gouv.fr).
    if (code === 'ADDRESS_CITY_MISMATCH') {
      return 'Cette ville ne correspond pas au code postal. Choisissez la commune dans la liste proposée.'
    }
    if (code === 'ZONE_CITY_UNKNOWN') {
      return 'Une ville de vos zones n’est pas reconnue dans sa région. Retirez-la, puis retrouvez-la avec la recherche.'
    }
    return corps.message || e?.message || 'Une réponse est refusée : vérifiez les champs.'
  }
  if (code === 'GEO_UNAVAILABLE') {
    return 'La vérification de l’adresse est momentanément indisponible. Réessayez dans quelques minutes.'
  }
  if (e?.status === 404) {
    return 'Ce compte n’a pas de candidature.'
  }
  return e?.message || 'La modification n’a pas été enregistrée.'
}

/* ── Redéposer après un refus ──────────────────────────────────────────────── */

/**
 * `POST /me/chef-application/reapply` — même corps que la candidature
 * publique, mais signé par le compte.
 *
 * La même candidature repart en `submitted` avec les nouvelles réponses, et
 * les pièces déjà déposées restent avec leur statut : on ne refait pas
 * téléverser une carte d'identité parce qu'un SIRET était faux.
 *
 * Deux refus à traduire : `REAPPLY_TOO_EARLY` avant la date portée par
 * `refusal.allowReapplyAfter`, et `APPLICATION_NOT_REJECTED` si la
 * candidature n'a pas été refusée.
 */
export function useReapply() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: unknown) =>
      apiFetch<ChefApplication>('/me/chef-application/reapply', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: APPLICATION_KEY }),
  })
}

/** Le refus dit quand on peut revenir. `true` tant que ce jour n'est pas venu. */
export function reapplyTooEarly(app?: ChefApplication | null): boolean {
  const quand = app?.refusal?.allowReapplyAfter
  if (!quand) return false
  return new Date(quand).getTime() > Date.now()
}
