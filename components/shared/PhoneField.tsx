'use client'

import { useId, useState } from 'react'
import {
  DIAL_COUNTRIES_ALPHA,
  dialOf,
  estInternational,
  formatE164,
  parseE164,
  phoneProblem,
  toE164,
} from '@/lib/phone'

/* ─────────────────────────────────────────────────────────────────────────────
   Un numéro de téléphone, de n'importe quel pays.

   L'indicatif se choisit, le numéro se tape à côté. Ce qui partira à l'API —
   le E.164 — s'affiche sous le champ : personne n'a à deviner ce que devient
   « 06 12 34 56 78 », ni pourquoi le 0 disparaît en route.

   Le composant parle E.164 à l'extérieur : il reçoit « +33612345678 » et rend
   la même chose. Le découpage pays / numéro reste à l'intérieur, sinon taper
   un « 0 » le ferait disparaître à l'aller-retour.
   ───────────────────────────────────────────────────────────────────────────── */

export default function PhoneField({
  label = 'Téléphone',
  value,
  onChange,
  hint,
  error,
  optional,
  required,
}: {
  label?: string
  /** Le numéro au format E.164, ou une chaîne vide. */
  value: string
  onChange: (e164: string) => void
  hint?: string
  error?: string
  optional?: boolean
  required?: boolean
}) {
  const id = useId()
  const [etat, setEtat] = useState(() => ({ ...parseE164(value), source: value }))

  // La valeur peut arriver après le premier rendu (profil chargé) ou être
  // remplacée de l'extérieur. On ne resème que dans ce cas : pendant la
  // frappe, c'est l'état interne qui fait foi.
  if (value !== etat.source && value !== toE164(etat.country, etat.national)) {
    setEtat({ ...parseE164(value), source: value })
  }

  const pays = dialOf(etat.country)
  const e164 = toE164(etat.country, etat.national)
  const souci = error ?? phoneProblem(etat.country, etat.national) ?? undefined

  const change = (country: string, national: string) => {
    // Numéro collé avec son indicatif : on le reconnaît et le sélecteur suit,
    // plutôt que d'empiler deux indicatifs.
    if (estInternational(national)) {
      const e = toE164(country, national)
      const lu = parseE164(e)
      setEtat({ ...lu, source: e })
      onChange(e)
      return
    }
    const suivant = toE164(country, national)
    setEtat({ country, national, source: suivant })
    onChange(suivant)
  }

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-semibold text-navy"
      >
        <span>
          {label}
          {required && <span className="text-amber-ink"> *</span>}
        </span>
        {optional && <span className="text-xs font-normal text-ink-soft">Facultatif</span>}
      </label>

      <div className="flex gap-2">
        <select
          value={etat.country}
          aria-label="Indicatif du pays"
          onChange={(e) => change(e.target.value, etat.national)}
          className="input-base w-auto max-w-[11rem] shrink-0"
        >
          {DIAL_COUNTRIES_ALPHA.map((c) => (
            <option key={`${c.code}-${c.dial}`} value={c.code}>
              {c.label} +{c.dial}
            </option>
          ))}
        </select>

        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={etat.national}
          aria-invalid={souci ? true : undefined}
          aria-describedby={`${id}-aide`}
          placeholder={pays.code === 'FR' ? '06 12 34 56 78' : 'Numéro'}
          onChange={(e) => change(etat.country, e.target.value)}
          className={`input-base min-w-0 flex-1 ${souci ? '!border-red-600' : ''}`}
        />
      </div>

      <p id={`${id}-aide`} className="mt-1.5 text-[13px] leading-snug">
        {souci ? (
          <span role="alert" className="text-red-700">
            {souci}
          </span>
        ) : e164 ? (
          <span className="text-ink-soft">
            Sera enregistré&nbsp;:{' '}
            <span className="font-mono text-ink-mid">{formatE164(e164)}</span>
          </span>
        ) : (
          <span className="text-ink-soft">
            {hint ?? 'Choisissez le pays, puis tapez le numéro.'}
          </span>
        )}
      </p>
    </div>
  )
}
