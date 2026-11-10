'use client'

import type { ReactNode } from 'react'
import { Popover } from '@base-ui/react/popover'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────────
   L'explication d'une règle, d'un montant ou d'un statut (module Recettes :
   chaque subtilité a la sienne).

   Popover de Base UI, sans style imposé : il s'ouvre au clic, au toucher et au
   clavier (Entrée ou Espace sur le bouton), se ferme avec Échap ou un clic
   ailleurs, et se place contre son bouton en restant dans l'écran. Jamais au
   survol seul (`openOnHover` reste désactivé) : le survol n'existe pas sur
   téléphone.
   ───────────────────────────────────────────────────────────────────────────── */

export function InfoPopover({
  label,
  children,
  className,
}: {
  /** Ce que lit un lecteur d'écran sur le bouton, ex. « Pourquoi ce palier ? ». */
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={label}
        className={cn(
          'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full align-middle text-ink-soft transition-colors hover:text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber',
          className,
        )}
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        {/* Au-dessus des panneaux en z-50 (fiche recette, tiroirs). */}
        <Popover.Positioner sideOffset={6} collisionPadding={8} className="z-[70]">
          <Popover.Popup className="max-w-[18rem] rounded-xl border border-[rgba(31,42,55,0.08)] bg-paper px-3.5 py-2.5 text-left text-[12px] font-normal normal-case leading-relaxed tracking-normal text-ink-mid shadow-[0_12px_40px_-12px_rgba(31,42,55,0.35)] outline-none origin-[var(--transform-origin)] transition-[opacity,transform] duration-150 ease-out data-[ending-style]:[transition-duration:120ms] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
