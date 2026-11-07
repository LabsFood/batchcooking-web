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
  
  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 0.1,

  // Replay seulement quand une erreur survient, et tout masqué (textes, saisies,
  // images) : la console affiche des fiches clients et des pièces d'identité.
  integrations: [Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true })],

  // Define how likely Replay events are sampled. This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.5,
  replaysOnErrorSampleRate: 1,

  // Turns off collection of data that could identify users. Adjust per category:
  // https://docs.sentry.io/platforms/javascript/configuration/options/#dataCollection
  dataCollection: {
    userInfo: false,
    graphQL: { document: false, variables: false },
    databaseQueryData: false,
    queues: false,
    httpBodies: [],
    // httpHeaders: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
    // cookies: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
    // urlQueryParams: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
  },
  beforeSend(event, hint) {
    // Un 4xx est une réponse métier (créneau pris, validation), pas un bug.
    const error = hint.originalException as { name?: string; status?: number } | undefined
    return error?.name === 'ApiError' && (error.status ?? 0) < 500 ? null : event
  },
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

// Seulement si le visiteur a déjà accepté ; sinon, au clic sur « Tout accepter ».
startAnalytics()
