import { withSentryConfig } from '@sentry/nextjs/config'

const nextConfig = {
  // 'standalone' sert a construire l'image Docker (Coolify).
  // Sur Vercel il casse le file tracing : onBuildComplete cherche
  // .next/next-server.js.nft.json, absent en mode standalone.
  // VERCEL=1 est injecte automatiquement par la plateforme.
  output: process.env.VERCEL ? undefined : 'standalone',
  // Les chemins de l'API PostHog finissent par « / » : pas de redirection.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    const rules = [
      // PostHog (UE) relaye same-origin : les bloqueurs de pub laissent passer.
      // Les règles statiques avant la règle générale, Next les lit dans l'ordre.
      { source: '/ingest/static/:path*', destination: 'https://eu-assets.i.posthog.com/static/:path*' },
      { source: '/ingest/array/:path*', destination: 'https://eu-assets.i.posthog.com/array/:path*' },
      { source: '/ingest/:path*', destination: 'https://eu.i.posthog.com/:path*' },
    ]
    /*
     * Relais same-origin vers l'API. Le navigateur appelle /lf-api/*, Next relaie
     * cote serveur : il n'y a donc pas de prevol CORS, et les PATCH et DELETE
     * passent malgre un backend qui n'annonce que GET, HEAD et POST.
     * A retirer le jour ou le CORS est corrige : il suffira de remettre
     * NEXT_PUBLIC_API_URL sur l'URL publique de l'API.
     */
    const target = process.env.API_PROXY_TARGET
    if (target) rules.push({ source: '/lf-api/:path*', destination: `${target}/:path*` })
    return rules
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'randomuser.me' },
    ],
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT ?? 'batchcooking-web',
  // Sans jeton, le build passe : seul l'envoi des source maps est sauté.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // `.git` n'est pas dans le contexte Docker : Railway fournit le commit.
  release: { name: process.env.RAILWAY_GIT_COMMIT_SHA },
  // Les événements passent par le site : les bloqueurs ne les coupent pas.
  tunnelRoute: '/monitoring',
  widenClientFileUpload: true,
  silent: !process.env.CI,
})
