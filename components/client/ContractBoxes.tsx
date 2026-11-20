'use client'

import Link from 'next/link'

import { InfoPopover } from '@/components/shared/InfoPopover'
import type { ContractConsents, ContractGap, ContractTerms } from '@/lib/api/contract'

/* ─────────────────────────────────────────────────────────────────────────────
   Les cases de commande des CGV V1 (art. 5.1) : séparées, jamais cochées
   d'avance, textes tels que l'API les sert (`contractTerms`). Utilisées par la
   réservation, l'acceptation d'un devis et l'écran de paiement.
   ───────────────────────────────────────────────────────────────────────────── */

export type Ticks = Partial<Record<ContractGap, boolean>>

/** Toutes les cases demandées sont cochées. */
export const allTicked = (gaps: ContractGap[], ticks: Ticks) => gaps.every((g) => ticks[g])

/** Le corps `consents` à envoyer. */
export function consentsOf(terms: ContractTerms, ticks: Ticks): ContractConsents {
  return {
    version: terms.version,
    cgv: !!ticks.CGV,
    deboursMandate: !!ticks.DEBOURS_MANDATE,
    earlyExecution: !!ticks.EARLY_EXECUTION,
  }
}

export function ContractBoxes({
  terms,
  gaps,
  ticks,
  onChange,
  missing = [],
}: {
  terms: ContractTerms
  gaps: ContractGap[]
  ticks: Ticks
  onChange: (ticks: Ticks) => void
  /** Les cases qu'un refus de l'API a nommées : mises en évidence. */
  missing?: ContractGap[]
}) {
  const box = (gap: ContractGap, text: React.ReactNode, extra?: React.ReactNode) => (
    <label
      key={gap}
      className={`flex cursor-pointer gap-3 rounded-xl border-[1.5px] p-3 text-[13px] leading-relaxed text-ink-mid ${
        missing.includes(gap) && !ticks[gap]
          ? 'border-red-600'
          : ticks[gap]
            ? 'border-navy bg-cream-soft'
            : 'border-[rgba(31,42,55,0.1)]'
      }`}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-navy"
        checked={!!ticks[gap]}
        onChange={(e) => onChange({ ...ticks, [gap]: e.target.checked })}
      />
      <span>
        {text} {extra}
      </span>
    </label>
  )

  return (
    <div className="space-y-2">
      {gaps.includes('CGV') &&
        box(
          'CGV',
          <>
            {terms.cgvText}{' '}
            <Link
              href="/cgv"
              target="_blank"
              className="font-semibold text-navy underline underline-offset-2"
            >
              Lire les CGV
            </Link>
          </>,
        )}
      {gaps.includes('DEBOURS_MANDATE') &&
        box(
          'DEBOURS_MANDATE',
          terms.deboursMandateText,
          <InfoPopover label="Pourquoi un mandat ?">
            Votre batch cooker achète vos courses en votre nom. Elles vous sont
            refacturées au centime près, sur présentation des tickets, sans marge ni
            frais. Vous pouvez révoquer ce mandat gratuitement jusqu’au Verrouillage,
            48 heures avant la séance.
          </InfoPopover>,
        )}
      {gaps.includes('EARLY_EXECUTION') &&
        box(
          'EARLY_EXECUTION',
          terms.earlyExecutionText,
          <InfoPopover label="Que se passe-t-il si je me rétracte ?">
            Votre séance commence pendant votre délai de rétractation de 14 jours.
            Si vous vous rétractez une fois les courses faites, 20 % du prix restent
            dus, et les produits achetés vous sont remis. Une fois la prestation
            entièrement réalisée, la rétractation n’est plus possible.
          </InfoPopover>,
        )}
    </div>
  )
}
