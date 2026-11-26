'use client'

import { useSyncExternalStore } from 'react'
import { useAuth } from '@clerk/nextjs'

/* ─────────────────────────────────────────────────────────────────────────────
   « Mes plats » en cartes ou en liste (retour de recette du 26/11).

   Le choix est retenu d'une visite à l'autre, par navigateur et par compte (la
   clé porte l'id Clerk : deux comptes sur le même ordinateur ne se partagent
   pas le réglage). Même mécanique que `lib/onboarding/reduit.ts`. Seule la
   liste s'écrit : les cartes restent l'affichage par défaut, et une valeur
   inconnue dans le stockage y ramène.
   ───────────────────────────────────────────────────────────────────────────── */

export type VuePlats = 'cartes' | 'liste'

const EVENEMENT = 'labsfood:vue-plats'

/** Repli quand le stockage est refusé (navigation privée) : vaut pour cette visite. */
const memoire = new Map<string, VuePlats>()

function lire(cle: string): VuePlats {
  if (memoire.has(cle)) return memoire.get(cle)!
  try {
    return localStorage.getItem(cle) === 'liste' ? 'liste' : 'cartes'
  } catch {
    return 'cartes'
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

/** `[vue, choisir(vue)]` pour le compte connecté. */
export function useVuePlats(): [VuePlats, (vue: VuePlats) => void] {
  const { userId } = useAuth()
  const cle = `vue-plats:${userId ?? 'anonyme'}`
  // Côté serveur : les cartes, le navigateur corrige au montage.
  const vue = useSyncExternalStore(abonner, () => lire(cle), () => 'cartes' as const)

  function choisir(suivante: VuePlats) {
    memoire.set(cle, suivante)
    try {
      if (suivante === 'liste') localStorage.setItem(cle, 'liste')
      else localStorage.removeItem(cle)
    } catch {
      // Stockage refusé : la mémoire suffit pour cette visite.
    }
    window.dispatchEvent(new Event(EVENEMENT))
  }

  return [vue, choisir]
}
