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
  | 'rc-pro'
  | 'haccp'
  | 'ddpp'
  | 'vigilance'

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

  /*
   * Ce que la candidature a déclaré. L'API ne documente pas ces champs sur
   * `/me/chef-application` (le détail admin les porte), donc tout est
   * optionnel : l'écran rend ce qui arrive et tait le reste plutôt que
   * d'afficher des cases vides.
   */
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

// ── Aperçu d'une pièce déposée ──────────────────────────────────────────────

/**
 * `GET /me/chef-documents/{type}/download-url` — URL signée de courte durée.
 *
 * L'endpoint n'existe pas encore côté batch cooker (il existe côté admin) : on
 * l'appelle quand même, et un 404 est traité comme « pas encore disponible »
 * plutôt que comme une panne. Le jour où le backend l'expose, l'aperçu marche
 * sans rien changer ici.
 */
export class PreviewUnavailable extends Error {
  constructor() {
    super('L’aperçu des pièces déposées n’est pas encore disponible.')
    this.name = 'PreviewUnavailable'
  }
}

export function useDocumentPreview() {
  const apiFetch = useApiFetch()
  return useMutation({
    mutationFn: async (type: ChefDocumentType) => {
      try {
        return await apiFetch<{ url: string; expiresAt?: string }>(
          `/me/chef-documents/${type}/download-url`,
        )
      } catch (e) {
        const status = (e as { status?: number })?.status
        if (status === 404) throw new PreviewUnavailable()
        throw e
      }
    },
  })
}
