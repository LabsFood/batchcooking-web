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

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-cream-deep text-ink-mid',
  info: 'bg-mint text-mint-ink',
  success: 'bg-mint-deep text-mint-ink',
  warning: 'bg-amber-soft text-amber-deep',
  danger: 'bg-red-100 text-red-700',
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
  dot = false,
  className,
}: {
  tone?: Tone
  children: React.ReactNode
  dot?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap',
        TONE_CLASS[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  )
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
