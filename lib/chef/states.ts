/* ─────────────────────────────────────────────────────────────────────────────
   Machines à états du module batch cooker.

   Convention du repo : clés en anglais, libellés en français.

   Règle structurante (cf. docs/PLAN-dashboards-v2.md § 5 bis) :
   l'état du DOSSIER n'est jamais saisi — il est **dérivé** de l'état des
   documents. Cela permet au batch cooker de déposer ses pièces dans l'ordre
   qu'il veut, sur plusieurs jours, sans wizard bloquant.
   ───────────────────────────────────────────────────────────────────────────── */

// ── Documents ───────────────────────────────────────────────────────────────

export type DocStatus =
  | 'missing'    // pas encore déposé
  | 'submitted'  // déposé, pas encore pris en charge
  | 'reviewing'  // en cours de vérification côté admin
  | 'valid'      // validé
  | 'rejected'   // refusé (motif obligatoire)
  | 'expiring'   // valide mais échéance proche (J-60)
  | 'expired'    // échéance dépassée

export const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  missing: 'À fournir',
  submitted: 'Déposé',
  reviewing: 'En vérification',
  valid: 'Validé',
  rejected: 'Refusé',
  expiring: 'Expire bientôt',
  expired: 'Expiré',
}

/** Famille : conditionne le blocage de l'activation. */
export type DocFamily = 'blocking' | 'recommended' | 'conditional'

/*
 * Libellés tournés vers le batch cooker : « bloquant » et « conditionnel »
 * décrivent notre instruction interne, pas ce qu'on attend de lui.
 */
export const DOC_FAMILY_LABEL: Record<DocFamily, string> = {
  blocking: 'Obligatoire',
  recommended: 'Facultatif',
  conditional: 'Selon votre situation',
}

/** Situation déclarée à la candidature — commande la pièce d'autorisation de travail. */
export type WorkStatus = 'eu-citizen' | 'residence-permit' | 'renewal-pending' | 'other'

export const WORK_STATUS_LABEL: Record<WorkStatus, string> = {
  'eu-citizen': 'Ressortissant français ou de l’Union européenne',
  'residence-permit': 'Titre de séjour autorisant à travailler',
  'renewal-pending': 'Titre de séjour en cours de renouvellement',
  other: 'Autre situation',
}

/**
 * Voie « services à la personne ». Type A : sa propre déclaration (NOVA), la seule
 * proposée. Type B (coopérative) : ancienne voie, lue seulement pour les dossiers
 * déjà enregistrés, qui doivent renseigner leur NOVA.
 */
export type SapPath = 'type-a' | 'type-b'

export const SAP_PATH_LABEL: Record<SapPath, string> = {
  'type-a': 'Déclaration SAP à son nom',
  'type-b': 'Déclaration SAP à renseigner',
}

/**
 * Conditions d'affichage d'une pièce conditionnelle. Le référentiel est piloté
 * par la donnée : ajouter la voie Type A plus tard ne demandera aucune refonte.
 */
export interface DocCondition {
  sapPath?: SapPath
  acceptsCesu?: boolean
  vulnerablePublics?: boolean
  /** Pièce appelée par la situation déclarée (titre de séjour, récépissé…). */
  workStatus?: WorkStatus
}

export interface DocDefinition {
  id: string
  label: string
  family: DocFamily
  /** Aide affichée sous le nom du document. */
  hint?: string
  /** Le document a une date de validité → alertes J-60 / J-30 / J-7. */
  expires?: boolean
  /** Si absent, la pièce est toujours demandée. */
  condition?: DocCondition
  /** Badge vitrine obtenu quand la pièce est validée (familles recommandées). */
  badge?: string
}

// ── Dossier (état dérivé) ───────────────────────────────────────────────────

export type DossierStatus =
  | 'draft'
  | 'awaiting-registration'
  | 'incomplete'
  | 'reviewing'
  | 'validated'
  | 'suspended'
  | 'disabled'

export const DOSSIER_STATUS_LABEL: Record<DossierStatus, string> = {
  draft: 'Brouillon',
  'awaiting-registration': "En attente d'immatriculation",
  incomplete: 'Pièces à compléter',
  reviewing: 'En vérification',
  validated: 'Validé',
  suspended: 'Suspendu',
  disabled: 'Désactivé',
}

/** Seul l'état `validated` autorise à recevoir et accepter des prestations. */
export function canAcceptMissions(status: DossierStatus): boolean {
  return status === 'validated'
}

export interface DocState {
  definitionId: string
  status: DocStatus
  /** ISO — présent si le document a une échéance. */
  expiresAt?: string
  /** Obligatoire quand `status === 'rejected'`. */
  rejectionReason?: string
  submittedAt?: string
}

/**
 * Dérive l'état du dossier depuis l'état des documents.
 *
 * Ordre de priorité : suspension > immatriculation manquante > pièces à
 * compléter > vérification en cours > validé.
 */
export function deriveDossierStatus(
  docs: DocState[],
  definitions: DocDefinition[],
  opts: { registered: boolean; disabled?: boolean } = { registered: true },
): DossierStatus {
  if (opts.disabled) return 'disabled'

  const byId = new Map(definitions.map((d) => [d.id, d]))
  const blocking = docs.filter((d) => byId.get(d.definitionId)?.family === 'blocking')

  // Un bloquant expiré suspend le compte, quel que soit le reste.
  if (blocking.some((d) => d.status === 'expired')) return 'suspended'

  if (blocking.length === 0) return 'draft'

  const pending = blocking.filter(
    (d) => d.status === 'missing' || d.status === 'rejected',
  )
  if (pending.length > 0) return 'incomplete'

  // Cas particulier : tout est fourni sauf l'immatriculation (branche
  // parallèle — ce n'est pas une étape séquentielle du parcours).
  if (!opts.registered) return 'awaiting-registration'

  if (blocking.some((d) => d.status === 'submitted' || d.status === 'reviewing')) {
    return 'reviewing'
  }

  return blocking.every((d) => d.status === 'valid' || d.status === 'expiring')
    ? 'validated'
    : 'incomplete'
}

/** Score de complétude (0–100) sur les seules pièces bloquantes. */
export function completionScore(
  docs: DocState[],
  definitions: DocDefinition[],
): number {
  const byId = new Map(definitions.map((d) => [d.id, d]))
  const blocking = docs.filter((d) => byId.get(d.definitionId)?.family === 'blocking')
  if (blocking.length === 0) return 0
  const ok = blocking.filter(
    (d) => d.status === 'valid' || d.status === 'expiring',
  ).length
  return Math.round((ok / blocking.length) * 100)
}

/** Filtre le référentiel selon la configuration du batch cooker. */
export function applicableDocuments(
  definitions: DocDefinition[],
  ctx: {
    sapPath: SapPath
    acceptsCesu: boolean
    vulnerablePublics: boolean
    workStatus?: WorkStatus
  },
): DocDefinition[] {
  return definitions.filter((d) => {
    const c = d.condition
    if (!c) return true
    if (c.sapPath && c.sapPath !== ctx.sapPath) return false
    if (c.acceptsCesu && !ctx.acceptsCesu) return false
    if (c.vulnerablePublics && !ctx.vulnerablePublics) return false
    if (c.workStatus && c.workStatus !== ctx.workStatus) return false
    return true
  })
}

// ── Offres sur-mesure ───────────────────────────────────────────────────────

export type OfferStatus = 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'withdrawn'

export const OFFER_STATUS_LABEL: Record<OfferStatus, string> = {
  sent: 'Envoyée',
  viewed: 'Vue',
  accepted: 'Acceptée',
  declined: 'Refusée',
  expired: 'Expirée',
  withdrawn: 'Retirée',
}

// ── Prestations ─────────────────────────────────────────────────────────────

export type MissionStatus =
  | 'pending'
  | 'confirmed'
  | 'upcoming'
  | 'in-progress'
  | 'done'
  | 'cancelled'
  | 'disputed'

export const MISSION_STATUS_LABEL: Record<MissionStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  upcoming: 'À venir',
  'in-progress': 'En cours',
  done: 'Réalisée',
  cancelled: 'Annulée',
  disputed: 'En litige',
}

// ── Moyens de paiement (3 moyens, 2 circuits) ───────────────────────────────

export type PaymentMethod = 'card' | 'urssaf' | 'cesu'

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  card: 'Carte bancaire',
  urssaf: 'Avance immédiate',
  cesu: 'CESU préfinancé',
}

// ── Mode de rémunération ────────────────────────────────────────────────────

export type PayoutMode = 'commission' | 'subscription'

export type PayoutModeStatus =
  | 'active'
  | 'switching'
  | 'awaiting-payment'
  | 'suspended'
  | 'terminated'

/** Plafond du régime micro-entreprise ; alerte à 80 %. */
export const MICRO_CEILING_EUR = 77_700
export const MICRO_ALERT_RATIO = 0.8
