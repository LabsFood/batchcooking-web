'use client'

import { useId, useRef, type ReactNode, type ToggleEvent } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────────
   L'explication d'une règle, d'un montant ou d'un statut (module Recettes :
   chaque subtilité a la sienne).

   Popover natif du navigateur : il s'ouvre au clic, au toucher et au clavier
   (Entrée ou Espace sur le bouton), se ferme avec Échap ou un clic ailleurs.
   Jamais au survol seul : le survol n'existe pas sur téléphone.
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
  const id = useId()
  const bouton = useRef<HTMLButtonElement>(null)

  // Le popover natif s'ouvre centré : on le pose sous son bouton, sans sortir
  // de l'écran.
  // ponytail: placé une fois à l'ouverture ; passer au positionnement d'ancre
  // CSS quand tous les navigateurs visés l'auront.
  function placer(e: ToggleEvent<HTMLDivElement>) {
    if (e.newState !== 'open' || !bouton.current) return
    const r = bouton.current.getBoundingClientRect()
    const bulle = e.currentTarget
    const largeur = bulle.offsetWidth
    const gauche = Math.min(
      Math.max(8, r.left + r.width / 2 - largeur / 2),
      window.innerWidth - largeur - 8,
    )
    bulle.style.top = `${r.bottom + 6}px`
    bulle.style.left = `${gauche}px`
  }

  return (
    <>
      <button
        ref={bouton}
        type="button"
        popoverTarget={id}
        aria-label={label}
        className={cn(
          'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full align-middle text-ink-soft transition-colors hover:text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber',
          className,
        )}
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      <div
        id={id}
        popover="auto"
        onToggle={placer}
        className="fixed inset-auto m-0 max-w-[18rem] rounded-xl border border-[rgba(31,42,55,0.08)] bg-paper px-3.5 py-2.5 text-left text-[12px] font-normal normal-case leading-relaxed tracking-normal text-ink-mid shadow-[0_12px_40px_-12px_rgba(31,42,55,0.35)]"
      >
        {children}
      </div>
    </>
  )
}
