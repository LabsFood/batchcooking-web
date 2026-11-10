/**
 * Chargé par Next dans le navigateur avant l'hydratation.
 *
 * - Sentry : erreurs JavaScript et rendus cassés (voir app/global-error.tsx).
 *   Les erreurs 5xx de l'API sont remontées par l'API elle-même.
 * - PostHog : mesure d'audience, démarrée seulement après « Tout accepter » (lib/analytics.ts).
 *
 * Sans NEXT_PUBLIC_SENTRY_DSN ni NEXT_PUBLIC_POSTHOG_KEY (dev, preview), rien ne part.
 */
import * as Sentry from '@sentry/nextjs'
import { startAnalytics } from '@/lib/analytics'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
  tracesSampleRate: 0.1,
  // Pas de Session Replay : les espaces client et chef affichent adresses,
  // allergies (donnée de santé) et pièces d'identité.
  // Ni utilisateur déduit, ni corps de requête.
  dataCollection: { userInfo: false, httpBodies: [] },
  beforeSend(event, hint) {
    // Un 4xx est une réponse métier (créneau pris, validation), pas un bug.
    const error = hint.originalException as { name?: string; status?: number } | undefined
    return error?.name === 'ApiError' && (error.status ?? 0) < 500 ? null : event
  },
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

// Seulement si le visiteur a déjà accepté ; sinon, au clic sur « Tout accepter ».
startAnalytics()
