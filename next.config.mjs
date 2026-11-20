import { withSentryConfig } from '@sentry/nextjs/config'

// L'API est appelée en direct : une URL relative (l'ancien « /lf-api ») ne mène
// plus nulle part, et chaque écran connecté tomberait en erreur. On arrête le
// build plutôt que de livrer un site muet.
if (process.env.NEXT_PUBLIC_API_URL?.startsWith('/')) {
  throw new Error(
    `NEXT_PUBLIC_API_URL vaut « ${process.env.NEXT_PUBLIC_API_URL} » : le relais /lf-api a été retiré, ` +
      "mettez l'URL complète de l'API (ex. https://lf-api-develop.up.railway.app).",
  )
}

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
      // Tout passe par eu.i.posthog.com : eu-assets est derrière Cloudflare (erreur 1000 depuis un site Cloudflare).
      { source: '/ingest/:path*', destination: 'https://eu.i.posthog.com/:path*' },
    ]
    // Plus de relais /lf-api : le navigateur appelle l'API en direct
    // (NEXT_PUBLIC_API_URL). Le CORS du backend annonce GET, HEAD, POST, PUT,
    // PATCH et DELETE depuis le 03/10, et le relais bloquait en prod.
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
