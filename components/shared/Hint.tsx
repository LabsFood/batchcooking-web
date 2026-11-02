'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { Info } from 'lucide-react'

/* ─────────────────────────────────────────────────────────────────────────────
   Un rappel qui reste affiché tant qu'on ne l'a pas cliqué : pour ce qu'il faut
   avoir lu (création de compte, champs que les clients ne voient pas…). Le
   clic dit « lu », et le rappel ne revient plus dans ce navigateur.

   ponytail: retenu par navigateur (localStorage), pas par compte ; passer par
   l'API si la lecture doit suivre la personne d'un appareil à l'autre.
   ───────────────────────────────────────────────────────────────────────────── */

const EVENEMENT = 'labsfood:hint-lu'
const cle = (id: string) => `hint:${id}`

/** Repli quand le stockage est refusé (navigation privée) : lu pour cette visite. */
const lusSansStockage = new Set<string>()

function estLu(id: string): boolean {
  if (lusSansStockage.has(id)) return true
  try {
    return localStorage.getItem(cle(id)) === '1'
  } catch {
    return false
  }
}

function abonner(changement: () => void) {
  window.addEventListener('storage', changement)
  window.addEventListener(EVENEMENT, changement)
  return () => {
    window.removeEventListener('storage', changement)
    window.removeEventListener(EVENEMENT, changement)
  }
}

export function Hint({
  id,
  children,
}: {
  /** Stable et unique : c'est sous ce nom que la lecture est retenue. */
  id: string
  children: ReactNode
}) {
  // Côté serveur, rien : c'est le navigateur qui sait si le rappel a été lu.
  const lu = useSyncExternalStore(abonner, () => estLu(id), () => true)
  if (lu) return null

  function marquerLu() {
    lusSansStockage.add(id)
    try {
      localStorage.setItem(cle(id), '1')
    } catch {
      // Stockage refusé : le repli en mémoire suffit pour cette visite.
    }
    window.dispatchEvent(new Event(EVENEMENT))
  }

  return (
    <button
      type="button"
      onClick={marquerLu}
      className="flex w-full items-start gap-2 rounded-xl bg-amber-soft/60 px-3.5 py-2.5 text-left text-[12px] leading-relaxed text-[#8B6200] transition-colors hover:bg-amber-soft"
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">{children}</span>
      <span className="shrink-0 font-semibold underline underline-offset-2">Compris</span>
    </button>
  )
}
