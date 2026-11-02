'use client'

import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { InfoPopover } from '@/components/shared/InfoPopover'
import type { AllergyCheck, AllergyReason } from '@/lib/api/types'
import { REASON_TEXT } from '@/lib/reason-codes'

/**
 * Recettes lot 1 : où en est la vérification des allergies d'une prestation.
 * Jamais « OK » : « vérifiées » seulement quand l'API le dit, sinon pourquoi pas.
 */
export function AllergyBadge({
  check,
  reasons = [],
}: {
  check?: AllergyCheck
  reasons?: AllergyReason[]
}) {
  if (!check) return null
  if (check === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-[11px] font-semibold text-mint-ink">
        <ShieldCheck className="h-3 w-3" aria-hidden /> Allergies vérifiées
      </span>
    )
  }
  const conflict = reasons.includes('ALLERGEN_CONFLICT')
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          conflict ? 'bg-red-100 text-red-800' : 'bg-amber/20 text-navy'
        }`}
      >
        <ShieldAlert className="h-3 w-3" aria-hidden />
        {conflict ? 'Plat à remplacer' : 'Allergies non vérifiées'}
      </span>
      <InfoPopover label="Pourquoi ce statut ?">
        {reasons.map((r) => REASON_TEXT[r]).join(' ')}
      </InfoPopover>
    </span>
  )
}
