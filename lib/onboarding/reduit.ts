'use client'

import { useSyncExternalStore } from 'react'
import { useAuth } from '@clerk/nextjs'

/* ─────────────────────────────────────────────────────────────────────────────
   « Masquer » d'une liste de premiers pas : la carte se réduit en une ligne,
   elle ne disparaît jamais tant que tout n'est pas fait (choix du 24/11 : un
   onboarding caché pour de bon est un onboarding oublié).

   Le choix est retenu d'une session à l'autre, par navigateur et par compte
   (la clé porte l'id Clerk : deux comptes sur le même ordinateur ne se
   partagent pas le réglage). Même mécanique que `Hint`.
   ───────────────────────────────────────────────────────────────────────────── */

const EVENEMENT = 'labsfood:onboarding-reduit'

/** Repli quand le stockage est refusé (navigation privée) : vaut pour cette visite. */
const memoire = new Map<string, boolean>()

function lire(cle: string): boolean {
  if (memoire.has(cle)) return memoire.get(cle)!
  try {
    return localStorage.getItem(cle) === '1'
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

/** `[réduite, réduire(oui)]` pour la liste `id` du compte connecté. */
export function useReduit(id: string): [boolean, (oui: boolean) => void] {
  const { userId } = useAuth()
  const cle = `onboarding-reduit:${id}:${userId ?? 'anonyme'}`
  // Côté serveur : dépliée, le navigateur corrige au montage.
  const reduit = useSyncExternalStore(abonner, () => lire(cle), () => false)

  function changer(oui: boolean) {
    memoire.set(cle, oui)
    try {
      if (oui) localStorage.setItem(cle, '1')
      else localStorage.removeItem(cle)
    } catch {
      // Stockage refusé : la mémoire suffit pour cette visite.
    }
    window.dispatchEvent(new Event(EVENEMENT))
  }

  return [reduit, changer]
}
