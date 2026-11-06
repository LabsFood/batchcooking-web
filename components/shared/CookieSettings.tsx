'use client'

import { useState, useSyncExternalStore } from 'react'

import { readConsent, saveConsent, type ConsentChoice } from '@/lib/analytics'

// Un choix fait dans un autre onglet s'affiche ici aussi.
const abonner = (changed: () => void) => {
  window.addEventListener('storage', changed)
  return () => window.removeEventListener('storage', changed)
}

/** Le « Personnaliser » du bandeau mène ici : le choix se change à tout moment. */
export default function CookieSettings() {
  // `undefined` côté serveur : rien d'affiché tant que le navigateur n'a pas répondu.
  const stored = useSyncExternalStore(abonner, readConsent, () => undefined)
  const [picked, setPicked] = useState<ConsentChoice>()
  const choice = picked ?? stored

  const choose = (c: ConsentChoice) => {
    saveConsent(c)
    setPicked(c)
  }

  if (choice === undefined) return null

  return (
    <div className="not-prose my-4 rounded-2xl border border-border bg-cream-soft p-4">
      <p className="text-sm text-ink" role="status">
        Mesure d&apos;audience :{' '}
        <strong>
          {choice === 'accepted' ? 'acceptée' : choice === 'declined' ? 'refusée' : 'pas encore choisie'}
        </strong>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => choose('accepted')}
          disabled={choice === 'accepted'}
          className="px-4 py-2 rounded-full bg-amber hover:bg-amber-deep disabled:opacity-50 text-navy text-xs font-semibold transition-colors"
        >
          Accepter
        </button>
        <button
          type="button"
          onClick={() => choose('declined')}
          disabled={choice === 'declined'}
          className="px-4 py-2 rounded-full border border-navy/20 disabled:opacity-50 text-navy text-xs font-semibold"
        >
          Refuser
        </button>
      </div>
    </div>
  )
}
