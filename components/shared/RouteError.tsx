'use client'

import * as Sentry from '@sentry/nextjs'
import posthog from 'posthog-js'
import Link from 'next/link'
import { useEffect } from 'react'
import { RotateCw } from 'lucide-react'

/**
 * L'écran d'un rendu cassé dans un espace connecté (le `error.tsx` de la route).
 * La barre latérale reste : on ne perd que la page, et on offre une issue.
 *
 * L'erreur part à Sentry, et à PostHog seulement si le visiteur a accepté la
 * mesure d'audience (sans quoi PostHog n'est pas démarré, cf. lib/analytics.ts).
 */
export default function RouteError({
  error,
  retry,
  homeHref,
  homeLabel,
}: {
  error: Error & { digest?: string }
  retry: () => void
  homeHref: string
  homeLabel: string
}) {
  useEffect(() => {
    Sentry.captureException(error)
    if (posthog.__loaded) posthog.captureException(error)
  }, [error])

  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-navy text-amber">
        <RotateCw className="h-7 w-7" aria-hidden />
      </span>
      <h1 className="mb-2 font-display text-2xl font-bold text-navy">
        Cette page n’a pas pu s’afficher
      </h1>
      <p className="mb-8 text-sm leading-relaxed text-ink-mid">
        L’équipe est prévenue. Réessayez ; si cela persiste, revenez à l’accueil.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => retry()} className="btn btn-primary text-xs">
          Réessayer
        </button>
        <Link href={homeHref} className="btn btn-outline text-xs">
          {homeLabel}
        </Link>
      </div>
    </div>
  )
}
