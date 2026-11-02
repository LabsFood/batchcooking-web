'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react'
import { InfoPopover } from '@/components/shared/InfoPopover'
import { useToast } from '@/components/shared/Toaster'
import { ApiError } from '@/lib/api/client'
import { useReplaceConflictingMeal, type Booking } from '@/lib/api/bookings'
import { useAllergens } from '@/lib/api/referentials'
import type { AllergyCheck, AllergyReason } from '@/lib/api/types'
import { REASON_TEXT, reasonText } from '@/lib/reason-codes'

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

interface Candidate {
  id: string
  name: string
  allergens: string[]
}

/**
 * Les plats qu'une allergie déclarée après la validation du menu met en
 * conflit, et leur remplacement. Possible même quand le menu est figé, pour ces
 * plats-là seulement ; l'API revérifie le plat choisi.
 */
export function AllergyConflicts({
  booking,
  side,
  candidates,
}: {
  booking: Booking
  side: 'client' | 'chef'
  candidates: Candidate[]
}) {
  const conflicts = booking.allergyConflicts ?? []
  const allergens = useAllergens()
  const label = (code: string) => allergens.find((a) => a.code === code)?.label ?? code
  if (!conflicts.length) return null
  return (
    <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-900">
      <p className="flex flex-wrap items-center gap-1 font-semibold">
        <AlertTriangle className="h-4 w-4" aria-hidden />
        {conflicts.length > 1 ? 'Des plats sont' : 'Un plat est'} à remplacer
        <InfoPopover label="Pourquoi remplacer ce plat ?">
          {side === 'client' ? 'Vous avez' : 'Le client a'} déclaré une allergie après la
          validation du menu, et ce plat contient l’allergène. Il doit être remplacé ; c’est
          possible même quand le menu est figé, pour ce plat seulement.
        </InfoPopover>
      </p>
      {conflicts.map((c) => (
        <ConflictRow
          key={c.mealId}
          bookingId={booking.id}
          side={side}
          name={booking.meals?.find((m) => m.mealId === c.mealId)?.name ?? 'Un plat'}
          mealId={c.mealId}
          allergens={c.allergens.map(label)}
          options={candidates.filter(
            (d) =>
              !booking.meals?.some((m) => m.mealId === d.id) &&
              !d.allergens.some((a) => c.allergens.includes(a)),
          )}
        />
      ))}
    </div>
  )
}

function ConflictRow({
  bookingId,
  side,
  name,
  mealId,
  allergens,
  options,
}: {
  bookingId: string
  side: 'client' | 'chef'
  name: string
  mealId: string
  allergens: string[]
  options: Candidate[]
}) {
  const toast = useToast()
  const replace = useReplaceConflictingMeal(side)
  const [to, setTo] = useState('')
  return (
    <div className="space-y-2 rounded-xl bg-paper/70 p-3">
      <p>
        <span className="font-semibold">{name}</span> contient : {allergens.join(', ')}
      </p>
      {options.length ? (
        <div className="flex flex-wrap gap-2">
          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label={`Remplacer ${name} par`}
            className="input-base min-w-0 flex-1 text-[13px]"
          >
            <option value="">Choisir un plat de remplacement…</option>
            {options.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!to || replace.isPending}
            onClick={() =>
              replace.mutate(
                { id: bookingId, from: mealId, to },
                {
                  onSuccess: () => toast.success('Plat remplacé', `${name} n’est plus au menu.`),
                  onError: (e) =>
                    toast.error(
                      'Le plat n’a pas été remplacé',
                      reasonText(e instanceof ApiError ? e.body : null) ??
                        'Réessayez dans un instant.',
                    ),
                },
              )
            }
            className="btn btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
          >
            {replace.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            Remplacer
          </button>
        </div>
      ) : (
        <p className="text-[12px]">
          Aucun autre plat publié ne convient : écrivez{' '}
          {side === 'client' ? 'au batch cooker' : 'au client'} depuis la messagerie.
        </p>
      )}
    </div>
  )
}
