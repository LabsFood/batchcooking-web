'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Plus, ShieldAlert, ShieldCheck, X } from 'lucide-react'
import { Hint } from '@/components/shared/Hint'
import { InfoPopover } from '@/components/shared/InfoPopover'
import { useToast } from '@/components/shared/Toaster'
import { ApiError } from '@/lib/api/client'
import { useDeclareAllergies, useWithdrawHealthConsent } from '@/lib/api/me-profile'
import { useAllergens, type RefItem } from '@/lib/api/referentials'
import type { ClientProfile } from '@/lib/api/types'
import { REASON_TEXT, reasonText } from '@/lib/reason-codes'

/** Les 14 allergènes réglementaires, au cas où la liste de l'API tarde. */
const ALLERGENS: RefItem[] = [
  { code: 'gluten', label: 'Céréales contenant du gluten' },
  { code: 'crustaceans', label: 'Crustacés' },
  { code: 'eggs', label: 'Œufs' },
  { code: 'fish', label: 'Poissons' },
  { code: 'peanuts', label: 'Arachides' },
  { code: 'soy', label: 'Soja' },
  { code: 'milk', label: 'Lait' },
  { code: 'nuts', label: 'Fruits à coque' },
  { code: 'celery', label: 'Céleri' },
  { code: 'mustard', label: 'Moutarde' },
  { code: 'sesame', label: 'Graines de sésame' },
  { code: 'sulphites', label: 'Anhydride sulfureux et sulfites' },
  { code: 'lupin', label: 'Lupin' },
  { code: 'molluscs', label: 'Mollusques' },
]

const fold = (w: string) =>
  w.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase().replace(/œ/g, 'oe')

/**
 * Ce qu'un client avait écrit avant le lot 1 est passé en « Autre ». Un mot qui
 * nomme l'un des 14 redevient une case cochée : il n'a plus qu'à confirmer.
 */
function initial(profile: ClientProfile | null, allergens: RefItem[]) {
  const byWord = new Map(allergens.flatMap((a) => [[fold(a.code), a.code], [fold(a.label), a.code]]))
  const codes = new Set(profile?.allergies ?? [])
  const custom: string[] = []
  for (const word of profile?.customAllergies ?? []) {
    const code = byWord.get(fold(word))
    if (code) codes.add(code)
    else custom.push(word)
  }
  return { codes, custom }
}

/**
 * Recettes lot 1 : la déclaration d'allergies du client, avec consentement.
 * Tant qu'il n'a pas répondu (une liste ou « aucune »), aucun menu ne se valide.
 * L'écran ne dit jamais « OK » : « vérifié » seulement quand l'API le dit.
 */
export function AllergyDeclaration({
  profile,
  consent,
}: {
  profile: ClientProfile | null
  consent?: { version: string; text: string }
}) {
  const router = useRouter()
  const toast = useToast()
  const declare = useDeclareAllergies()
  const withdraw = useWithdrawHealthConsent()
  const allergens = useAllergens(ALLERGENS)
  const [start] = useState(() => initial(profile, ALLERGENS))
  const [none, setNone] = useState(profile?.allergiesNone ?? false)
  const [codes, setCodes] = useState<Set<string>>(start.codes)
  const [custom, setCustom] = useState<string[]>(start.custom)
  const [draft, setDraft] = useState('')
  const [accepted, setAccepted] = useState(
    !!consent && profile?.healthConsentVersion === consent.version,
  )

  const declared = !!profile?.allergiesDeclaredAt
  const verified = profile?.allergyCheck === 'verified'
  const reasons = profile?.allergyCheckReasons ?? ['ALLERGIES_NOT_DECLARED']
  const hasList = codes.size > 0 || custom.length > 0

  const toggle = (code: string) =>
    setCodes((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })

  const addCustom = () => {
    const word = draft.trim()
    if (!word) return
    setCustom((prev) => (prev.includes(word) || prev.length >= 10 ? prev : [...prev, word]))
    setDraft('')
  }

  const save = () =>
    declare.mutate(
      none
        ? { none: true }
        : {
            allergies: [...codes],
            customAllergies: custom,
            consent: accepted,
            consentVersion: consent?.version,
          },
      {
        onSuccess: () => {
          toast.success('Allergies enregistrées', 'Vos menus sont vérifiés avec cette réponse.')
          // Venu d'une réservation bloquée : on y retourne.
          const back = new URLSearchParams(window.location.search).get('retour')
          if (back?.startsWith('/')) router.push(back)
        },
        onError: (e) =>
          toast.error(
            'Allergies non enregistrées',
            reasonText(e instanceof ApiError ? e.body : null) ?? 'Réessayez dans un instant.',
          ),
      },
    )

  const retirer = () => {
    if (!window.confirm('Retirer votre consentement efface vos allergies. Vous ne pourrez plus valider de menu avant de les déclarer à nouveau. Continuer ?')) return
    withdraw.mutate(undefined, {
      onSuccess: () => toast.info('Consentement retiré', 'Vos allergies sont effacées.'),
      onError: () => toast.error('Le consentement n’a pas été retiré', 'Réessayez dans un instant.'),
    })
  }

  return (
    <div className="space-y-4">
      <p className="flex flex-wrap items-center gap-1.5 text-[13px]">
        {verified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2.5 py-1 font-semibold text-mint-ink">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Vérifié
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber/20 px-2.5 py-1 font-semibold text-navy">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden /> Non vérifié
          </span>
        )}
        <InfoPopover label="Que veut dire ce statut ?">
          {verified
            ? 'Vous avez répondu, et tout ce que vous avez indiqué se vérifie automatiquement sur les plats.'
            : reasons.map((r) => REASON_TEXT[r]).join(' ')}
        </InfoPopover>
        {declared && profile?.allergiesDeclaredAt && (
          <span className="text-ink-soft">
            · réponse du {new Date(profile.allergiesDeclaredAt).toLocaleDateString('fr-FR')}
          </span>
        )}
      </p>

      {!declared && (
        <Hint id="allergies-a-declarer">
          Tant que vous n’avez pas répondu, vous ne pouvez valider aucun menu. Cochez vos
          allergies, ou « Aucune allergie », puis enregistrez.
        </Hint>
      )}

      <label className="flex items-center gap-2 text-sm font-semibold text-navy">
        <input
          type="checkbox"
          checked={none}
          onChange={(e) => setNone(e.target.checked)}
          className="h-4 w-4 accent-navy"
        />
        Aucune allergie
      </label>

      <fieldset disabled={none} className="space-y-3 disabled:opacity-40">
        <legend className="sr-only">Les 14 allergènes réglementaires</legend>
        <div className="flex flex-wrap gap-2">
          {allergens.map((a) => {
            const on = codes.has(a.code)
            return (
              <button
                key={a.code}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(a.code)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  on ? 'bg-red-600 text-white' : 'bg-cream-soft text-ink-mid hover:bg-cream-deep'
                }`}
              >
                {on && <Check className="h-3.5 w-3.5" aria-hidden />}
                {a.label}
              </button>
            )
          })}
        </div>

        <div>
          <p className="mb-1.5 flex items-center gap-1 text-[12px] font-semibold text-navy">
            Autre allergie
            <InfoPopover label="Comment est traitée une autre allergie ?">
              {REASON_TEXT.CUSTOM_ALLERGIES}
            </InfoPopover>
          </p>
          <div className="flex gap-2">
            <input
              value={draft}
              maxLength={60}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustom()
                }
              }}
              placeholder="Ex. kiwi"
              className="input-base flex-1"
            />
            <button type="button" onClick={addCustom} className="btn btn-outline px-3" aria-label="Ajouter">
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </div>
          {custom.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {custom.map((w) => (
                <span key={w} className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-[13px] text-red-800">
                  {w}
                  <button
                    type="button"
                    onClick={() => setCustom((prev) => prev.filter((x) => x !== w))}
                    aria-label={`Retirer ${w}`}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {hasList && consent && (
          <label className="flex items-start gap-2 rounded-2xl bg-cream-soft p-3 text-[13px] leading-relaxed text-ink-mid">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-navy"
            />
            <span>
              {consent.text}{' '}
              <InfoPopover label="Pourquoi ce consentement ?">
                Une allergie est une donnée de santé : la loi demande votre accord exprès pour
                l’enregistrer. Sans lui, vous pouvez répondre « Aucune allergie », ou ne rien
                enregistrer, mais aucun menu ne pourra être validé.
              </InfoPopover>
            </span>
          </label>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={declare.isPending || (!none && !hasList) || (!none && !accepted)}
          className="btn btn-primary disabled:opacity-50"
        >
          {declare.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Enregistrer mes allergies
        </button>
        {profile?.healthConsentAt && (
          <button
            type="button"
            onClick={retirer}
            disabled={withdraw.isPending}
            className="text-[12px] font-semibold text-ink-soft underline underline-offset-2"
          >
            Retirer mon consentement
          </button>
        )}
      </div>
    </div>
  )
}
