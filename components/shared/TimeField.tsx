'use client'

import { useMemo } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { durationLabel, toHHMM, toMinutes } from '@/lib/time'

/* ─────────────────────────────────────────────────────────────────────────────
   Choisir une heure, et une plage d'heures.

   `<input type="time">` laisse taper n'importe quoi : 07h03, 23h59, et sur
   certains navigateurs un champ qu'on remplit au clavier chiffre par chiffre.
   Or le métier n'a jamais besoin de 07h03 : une prestation se pose au quart
   d'heure. Une liste de quarts d'heure se parcourt plus vite qu'elle ne se
   tape, elle est juste par construction, et elle peut se restreindre aux
   créneaux que l'API dit libres (`allowed`).

   `TimeRange` ajoute ce qu'un couple de champs ne dit jamais : **la durée**.
   C'est elle que le batch cooker surveille, pas les deux bornes.
   ───────────────────────────────────────────────────────────────────────────── */

/** Les quarts d'heure entre deux bornes, bornes incluses. */
function ticks(min: string, max: string, step: number): string[] {
  const out: string[] = []
  for (let m = toMinutes(min); m <= toMinutes(max); m += step) out.push(toHHMM(m))
  return out
}

export default function TimeField({
  id,
  label,
  value,
  onChange,
  min = '06:00',
  max = '23:00',
  step = 15,
  allowed,
  disabled,
  className,
}: {
  id: string
  label: string
  value: string
  onChange: (hhmm: string) => void
  min?: string
  max?: string
  /** Minutes entre deux propositions. 15 par défaut. */
  step?: number
  /** Restreint la liste — les créneaux libres rendus par l'API, typiquement. */
  allowed?: string[]
  disabled?: boolean
  className?: string
}) {
  const options = useMemo(() => {
    const base = allowed ?? ticks(min, max, step)
    /* La valeur courante peut venir d'ailleurs (une prestation déjà posée à
       14h05) : on la garde dans la liste, sinon le champ s'afficherait vide. */
    return base.includes(value) ? base : [...base, value].sort()
  }, [allowed, min, max, step, value])

  return (
    <label className={cn('block', className)} htmlFor={id}>
      <span className="mb-1 block text-[11px] text-ink-soft">{label}</span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="input-base py-2 tabular-nums"
      >
        {options.map((t) => (
          <option key={t} value={t}>
            {t.replace(':', 'h')}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Un raccourci de plage : le métier en a trois ou quatre, pas trente. */
export interface TimePreset {
  label: string
  from: string
  to: string
}

export const DEFAULT_PRESETS: TimePreset[] = [
  { label: 'Matin', from: '09:00', to: '13:00' },
  { label: 'Après-midi', from: '14:00', to: '18:00' },
  { label: 'Journée', from: '09:00', to: '18:00' },
]

export function TimeRange({
  idPrefix,
  from,
  to,
  onChange,
  min = '06:00',
  max = '23:00',
  step = 15,
  presets = DEFAULT_PRESETS,
  allowedFrom,
  disabled,
  minDuration = 0,
  className,
}: {
  idPrefix: string
  from: string
  to: string
  onChange: (next: { from: string; to: string }) => void
  min?: string
  max?: string
  step?: number
  /** `[]` retire les raccourcis. */
  presets?: TimePreset[]
  /** Les débuts possibles, quand l'API les connaît. */
  allowedFrom?: string[]
  disabled?: boolean
  /** En minutes — en dessous, la plage est refusée et on dit pourquoi. */
  minDuration?: number
  className?: string
}) {
  const duree = toMinutes(to) - toMinutes(from)
  const invalide = duree <= 0 || duree < minDuration

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-end gap-2">
        <TimeField
          id={`${idPrefix}-de`}
          label="De"
          value={from}
          min={min}
          max={max}
          step={step}
          allowed={allowedFrom}
          disabled={disabled}
          onChange={(v) => {
            /* Déplacer le début déplace la fin : on garde la durée choisie
               plutôt que de laisser une plage à l'envers. */
            const delta = toMinutes(v) - toMinutes(from)
            const fin = duree > 0 ? toHHMM(toMinutes(to) + delta) : to
            onChange({ from: v, to: toMinutes(fin) > toMinutes(max) ? max : fin })
          }}
          className="w-28"
        />
        <TimeField
          id={`${idPrefix}-a`}
          label="À"
          value={to}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(v) => onChange({ from, to: v })}
          className="w-28"
        />
        <span
          className={cn(
            'mb-0.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold',
            invalide ? 'bg-amber-soft text-amber-deep' : 'bg-cream-soft text-ink-mid',
          )}
        >
          <Clock className="h-3 w-3" aria-hidden />
          {invalide ? 'Plage à revoir' : durationLabel(duree)}
        </span>
      </div>

      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => {
            const actif = p.from === from && p.to === to
            return (
              <button
                key={p.label}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ from: p.from, to: p.to })}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                  actif
                    ? 'border-navy bg-navy text-white'
                    : 'border-[rgba(31,42,55,0.12)] text-ink-mid hover:border-navy hover:text-navy',
                )}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      )}

      {invalide && (
        <p className="text-[12px] text-amber-deep">
          {duree <= 0
            ? 'La fin doit venir après le début.'
            : `Comptez au moins ${durationLabel(minDuration)} sur place.`}
        </p>
      )}
    </div>
  )
}

/**
 * Les créneaux libres rendus par l'API, en pastilles cliquables.
 *
 * Deux choses à savoir : la liste est **vide quand tout est pris**, ce qui
 * n'est pas la même chose que `scheduled: false` (aucun horaire posé), et elle
 * ne vaut que pour la durée demandée. L'appelant dit laquelle.
 */
export function SlotPicker({
  slots,
  value,
  onSelect,
  empty = 'Aucun créneau libre : la journée est prise, ou fermée.',
  className,
}: {
  /** Instants ISO rendus par l'API. */
  slots: string[]
  value?: string | null
  /** Absent : les créneaux sont montrés, pas choisis. */
  onSelect?: (iso: string) => void
  empty?: string
  className?: string
}) {
  if (slots.length === 0) {
    return <p className={cn('text-[12px] text-ink-soft', className)}>{empty}</p>
  }

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {slots.map((iso) => {
        const heure = new Date(iso).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        })
        if (!onSelect) {
          return (
            <span
              key={iso}
              className="rounded-full bg-cream-soft px-3 py-1.5 text-[12px] font-semibold tabular-nums text-ink-mid"
            >
              {heure}
            </span>
          )
        }
        const actif = value === iso
        return (
          <button
            key={iso}
            type="button"
            onClick={() => onSelect(iso)}
            aria-pressed={actif}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[12px] font-semibold tabular-nums transition-colors',
              actif
                ? 'border-navy bg-navy text-white'
                : 'border-[rgba(31,42,55,0.12)] text-ink-mid hover:border-navy hover:text-navy',
            )}
          >
            {heure}
          </button>
        )
      })}
    </div>
  )
}
