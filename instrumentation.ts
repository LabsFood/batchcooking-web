import * as Sentry from '@sentry/nextjs'

/**
 * Exécuté une fois au démarrage du serveur Next. Les racines eMudhra (emSign) ne sont
 * plus de confiance (compromission de l'AC eMudhra, 31/10/2026) : toutes les
 * connexions TLS du serveur (relais /lf-api, Clerk, optimiseur d'images, Sentry) les
 * refusent. Aucun hôte appelé par l'app n'en dépendait à cette date.
 *
 * Sentry démarre ensuite, côté Node et côté Edge (middleware.ts). Sans
 * NEXT_PUBLIC_SENTRY_DSN, il reste éteint.
 */
export async function register() {
  // Bloc `if` (pas de retour anticipé) : le bundle Edge l'élimine sans charger node:tls.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { rootCertificates, setDefaultCACertificates } = await import('node:tls')
    const { X509Certificate } = await import('node:crypto')
    setDefaultCACertificates(
      rootCertificates.filter((pem) => !/eMudhra|emSign/i.test(new X509Certificate(pem).subject)),
    )
  }
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
    tracesSampleRate: 0.1,
    // Rien qui identifie le visiteur : ni utilisateur déduit, ni corps de requête,
    // ni IP (en-têtes, cookies et paramètres d'URL qui en portent une).
    dataCollection: {
      userInfo: false,
      httpBodies: [],
      httpHeaders: { deny: IP_KEYS },
      cookies: { deny: IP_KEYS },
      urlQueryParams: { deny: IP_KEYS },
    },
  })
}

const IP_KEYS = ['forwarded', '-ip', 'remote-', 'via', '-user']

/** Erreurs des Server Components, des route handlers et du middleware. */
export const onRequestError = Sentry.captureRequestError
