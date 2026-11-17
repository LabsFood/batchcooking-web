'use client'

import { cn } from '@/lib/utils'
import {
  DOC_STATUS_LABEL,
  DOSSIER_STATUS_LABEL,
  MISSION_STATUS_LABEL,
  OFFER_STATUS_LABEL,
  type DocStatus,
  type DossierStatus,
  type MissionStatus,
  type OfferStatus,
} from '@/lib/chef/states'

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

/* Les familles de `.status` (globals.css) : une seule étiquette d'état pour
   les deux espaces. Ce composant gardait sa propre palette, à côté de celle des
   écrans client et d'une troisième, en capitales, sur les prestations. */
const TONE_CLASS: Record<Tone, string> = {
  neutral: '',
  info: 'status-info',
  success: 'status-ok',
  warning: 'status-warn',
  danger: 'status-bad',
}

export const DOC_TONE: Record<DocStatus, Tone> = {
  missing: 'neutral',
  submitted: 'info',
  reviewing: 'info',
  valid: 'success',
  rejected: 'danger',
  expiring: 'warning',
  expired: 'danger',
}

export const DOSSIER_TONE: Record<DossierStatus, Tone> = {
  draft: 'neutral',
  'awaiting-registration': 'warning',
  incomplete: 'warning',
  reviewing: 'info',
  validated: 'success',
  suspended: 'danger',
  disabled: 'neutral',
}

export const OFFER_TONE: Record<OfferStatus, Tone> = {
  sent: 'info',
  viewed: 'warning',
  accepted: 'success',
  declined: 'danger',
  expired: 'neutral',
  withdrawn: 'neutral',
}

export const MISSION_TONE: Record<MissionStatus, Tone> = {
  pending: 'neutral',
  confirmed: 'info',
  upcoming: 'info',
  'in-progress': 'warning',
  done: 'success',
  cancelled: 'neutral',
  disputed: 'danger',
}

export default function StatusBadge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone
  children: React.ReactNode
  /** Gardé pour les appels existants : le point fait partie de l'étiquette. */
  dot?: boolean
  className?: string
}) {
  return <span className={cn('status', TONE_CLASS[tone], className)}>{children}</span>
}

/* Raccourcis typés — évitent de répéter le couple libellé + ton. */

export const DocBadge = ({ status }: { status: DocStatus }) => (
  <StatusBadge tone={DOC_TONE[status]}>{DOC_STATUS_LABEL[status]}</StatusBadge>
)

export const DossierBadge = ({ status }: { status: DossierStatus }) => (
  <StatusBadge tone={DOSSIER_TONE[status]} dot>
    {DOSSIER_STATUS_LABEL[status]}
  </StatusBadge>
)

export const OfferBadge = ({ status }: { status: OfferStatus }) => (
  <StatusBadge tone={OFFER_TONE[status]}>{OFFER_STATUS_LABEL[status]}</StatusBadge>
)

export const MissionBadge = ({ status }: { status: MissionStatus }) => (
  <StatusBadge tone={MISSION_TONE[status]} dot>
    {MISSION_STATUS_LABEL[status]}
  </StatusBadge>
)
