'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

import './globals.css'

/**
 * Dernier filet : un rendu qui casse remplace toute la page, layout racine
 * compris (d'où <html> et <body>). L'erreur part à Sentry, le visiteur garde
 * un moyen de repartir.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="fr">
      <body className="bg-cream text-ink font-body antialiased">
        <main className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center">
          <h1 className="font-display font-bold text-2xl text-navy">
            Oups, quelque chose s&apos;est mal passé.
          </h1>
          <p className="max-w-md text-sm text-ink-mid">
            L&apos;équipe est prévenue. Réessaie, ou reviens à l&apos;accueil.
          </p>
          <div className="flex gap-3">
            <button
              onClick={retry}
              className="px-5 py-2.5 rounded-full bg-amber hover:bg-amber-deep text-navy text-sm font-semibold transition-colors"
            >
              Réessayer
            </button>
            {/* Rechargement complet voulu : l'état de l'app vient de casser. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="px-5 py-2.5 rounded-full border border-navy/20 text-navy text-sm font-semibold"
            >
              Accueil
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
