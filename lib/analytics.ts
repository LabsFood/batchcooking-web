import posthog from 'posthog-js'

/**
 * Mesure d'audience (PostHog, hébergé dans l'UE), seulement avec consentement.
 *
 * PostHog n'est démarré qu'après « accepted » : avant, aucune requête ne part,
 * pas même sa configuration ou ses feature flags, et rien n'est stocké. Le bandeau
 * (CookieBanner), la page /confidentialite#cookies (CookieSettings) et l'init
 * (instrumentation-client.ts) passent tous par ce fichier.
 *
 * Sans NEXT_PUBLIC_POSTHOG_KEY (dev, preview), tout est sans effet.
 */
export const CONSENT_KEY = 'labsfood.cookies.v1'
/** Six mois (≈ 182 jours). */
const CONSENT_MAX_AGE_MS = 182 * 24 * 3600 * 1000
/** Le lien « Gérer mes cookies » rouvre le bandeau par cet événement. */
export const OPEN_COOKIES_EVENT = 'labsfood:cookies-open'
/** Rouvre le choix des cookies, depuis n'importe quelle page. */
export function openCookieSettings(): void {
  window.dispatchEvent(new Event(OPEN_COOKIES_EVENT))
}

export type ConsentChoice = 'accepted' | 'declined'

export function readConsent(): ConsentChoice | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem(CONSENT_KEY) ?? 'null')
    // Politique de confidentialité §15 : un choix vaut 6 mois, puis on redemande.
    const at = Date.parse(saved?.at ?? '')
    if (!Number.isFinite(at) || Date.now() - at > CONSENT_MAX_AGE_MS) return null
    return saved?.choice === 'accepted' || saved?.choice === 'declined' ? saved.choice : null
  } catch {
    return null
  }
}

/** Le compte Clerk connecté, gardé pour un PostHog démarré après la connexion. */
let currentUser: string | null = null

/* ── Google Tag Manager ─────────────────────────────────────────────────────

   Même règle que PostHog : rien n'est chargé avant « Tout accepter ». Le
   script fourni par Google se met d'ordinaire dans le <head> ; il partirait
   alors avant le choix des cookies, ce que la politique de confidentialité
   (§15) interdit. Il est donc injecté ici, au consentement.

   Le consentement donné porte sur la mesure d'audience, pas sur la publicité :
   le Consent Mode de Google l'annonce ainsi (analytics accordé, publicité
   refusée). Un retrait repasse tout à « refusé » ; le script déjà chargé ne
   peut pas être déchargé, mais il cesse de déposer et de lire ses cookies.

   Rien ne part depuis localhost : les tests ne gonflent pas les chiffres. */

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-MB6Z57X5'

type DataLayerWindow = Window & { dataLayer?: unknown[] }

function gtag(...args: unknown[]): void {
  const w = window as DataLayerWindow
  w.dataLayer = w.dataLayer || []
  // GTM attend l'objet `arguments` lui-même, pas un tableau.
  w.dataLayer.push(arguments)
}

let gtmLoaded = false

function startTagManager(): void {
  if (gtmLoaded || typeof window === 'undefined') return
  if (['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) return
  gtmLoaded = true
  gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
  gtag('js', new Date())
  ;(window as DataLayerWindow).dataLayer!.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`
  document.head.appendChild(script)
}

function denyTagManager(): void {
  if (!gtmLoaded) return
  gtag('consent', 'update', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
}

/** Démarre la mesure (GTM, puis PostHog si la clé existe), si le visiteur a accepté. */
export function startAnalytics(): void {
  if (readConsent() !== 'accepted') return
  startTagManager()
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key || posthog.__loaded) return
  posthog.init(key, {
    // Relais same-origin (next.config.mjs) : passe les bloqueurs, reste dans l'UE.
    api_host: '/ingest',
    ui_host: 'https://eu.posthog.com',
    defaults: '2026-08-30',
    // Remonte les exceptions et rejets non gérés vers Error Tracking.
    capture_exceptions: true,
    person_profiles: 'identified_only',
    // Les espaces client et chef affichent adresses, allergies et pièces d'identité.
    disable_session_recording: true,
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
    if (gtmLoaded) gtag('consent', 'update', { analytics_storage: 'granted' })
    if (posthog.__loaded) posthog.opt_in_capturing()
    else startAnalytics()
    startTagManager()
  } else {
    denyTagManager()
  }
  if (choice !== 'accepted' && posthog.__loaded) {
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
  // Un autre compte sur le même navigateur : on ne mélange pas les deux personnes.
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

/** Erreur de rendu vers Error Tracking, si PostHog tourne (consentement donné). */
export function captureAnalyticsException(error: Error): void {
  if (posthog.__loaded) posthog.captureException(error)
}
