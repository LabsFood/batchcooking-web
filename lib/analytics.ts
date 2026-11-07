import posthog from 'posthog-js'

/**
 * Mesure d'audience (PostHog, hébergé dans l'UE), seulement avec consentement.
 *
 * PostHog n'est démarré qu'après « accepted » : avant, aucune requête ne part,
 * pas même sa configuration ou ses feature flags, et rien n'est stocké. Le bandeau
 * (CookieBanner), la page /confidentialite#cookies (CookieSettings) et l'init
 * (instrumentation-client.ts) passent tous par ce fichier.
 *
 * Sans configuration PostHog (dev, preview), tout est sans effet.
 */
export const CONSENT_KEY = 'labsfood.cookies.v1'

export type ConsentChoice = 'accepted' | 'declined'

export function readConsent(): ConsentChoice | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem(CONSENT_KEY) ?? 'null')
    return saved?.choice === 'accepted' || saved?.choice === 'declined' ? saved.choice : null
  } catch {
    return null
  }
}

/** Le compte Clerk connecté, gardé pour un PostHog démarré après la connexion. */
let currentUser: string | null = null

/** Démarre PostHog une fois, si la configuration existe et que le visiteur a accepté. */
export function startAnalytics(): void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
  const uiHost = process.env.NEXT_PUBLIC_POSTHOG_UI_HOST
  if (!key || !host || !uiHost) {
    if (process.env.NODE_ENV !== 'production') {
      const variable = !key
        ? 'NEXT_PUBLIC_POSTHOG_KEY'
        : !host
          ? 'NEXT_PUBLIC_POSTHOG_HOST'
          : 'NEXT_PUBLIC_POSTHOG_UI_HOST'
      console.error(
        new Error(
          `${variable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${variable} is configured`,
        ),
      )
    }
    return
  }
  if (posthog.__loaded || readConsent() !== 'accepted') return
  posthog.init(key, {
    // Relais same-origin (next.config.mjs) : passe les bloqueurs, reste dans l'UE.
    api_host: '/ingest',
    ui_host: uiHost,
    defaults: '2026-08-30',
    // Remonte les exceptions et rejets non gérés vers Error Tracking.
    capture_exceptions: true,
    person_profiles: 'identified_only',
    // Un clic garde sa page et son sélecteur, jamais son texte ni ses attributs :
    // une puce d'allergie, une adresse ou un message ne partent pas.
    mask_all_text: true,
    mask_all_element_attributes: true,
    loaded: (ph) => {
      if (currentUser) ph.identify(currentUser)
    },
  })
}

/** Mémorise le choix et l'applique tout de suite, sans recharger la page. */
export function saveConsent(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ choice, at: new Date().toISOString() }),
    )
  } catch {}
  if (choice === 'accepted') {
    if (posthog.__loaded) posthog.opt_in_capturing()
    else startAnalytics()
  } else if (posthog.__loaded) {
    // Retrait : l'identifiant stocké est effacé, puis plus rien ne part.
    // Dans cet ordre, car `reset()` remet aussi le consentement à zéro.
    posthog.reset()
    posthog.opt_out_capturing()
  }
}

/**
 * Rattache les événements au compte Clerk : l'id seulement, jamais l'email.
 * À la déconnexion, PostHog repart sur un visiteur anonyme neuf. Rien à faire
 * pour un visiteur jamais connecté : chaque page vue changerait d'identifiant.
 */
export function setAnalyticsUser(userId: string | null): void {
  const previous = currentUser
  currentUser = userId
  if (!posthog.__loaded || posthog.has_opted_out_capturing()) return
  if (userId && previous && previous !== userId) posthog.reset()
  if (userId) posthog.identify(userId)
  else if (previous) posthog.reset()
}

/**
 * Étape d'un parcours qui ne change pas d'URL (les pages vues sont déjà captées).
 * Propriétés : des ids, des nombres, des étapes. Jamais d'adresse, d'allergie ni
 * de texte libre.
 */
export function track(event: string, properties?: Record<string, string | number | boolean>): void {
  if (posthog.__loaded) posthog.capture(event, properties)
}

export function captureAnalyticsException(error: Error): void {
  if (posthog.__loaded) posthog.captureException(error)
}
