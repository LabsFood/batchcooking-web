// import { NextConfig } from 'next'

const nextConfig = {
  // 'standalone' sert a construire l'image Docker (Coolify).
  // Sur Vercel il casse le file tracing : onBuildComplete cherche
  // .next/next-server.js.nft.json, absent en mode standalone.
  // VERCEL=1 est injecte automatiquement par la plateforme.
  output: process.env.VERCEL ? undefined : 'standalone',
  /*
   * Relais same-origin vers l'API. Le navigateur appelle /lf-api/*, Next relaie
   * cote serveur : il n'y a donc pas de prevol CORS, et les PATCH et DELETE
   * passent malgre un backend qui n'annonce que GET, HEAD et POST.
   * A retirer le jour ou le CORS est corrige : il suffira de remettre
   * NEXT_PUBLIC_API_URL sur l'URL publique de l'API.
   */
  async rewrites() {
    const target = process.env.API_PROXY_TARGET
    if (!target) return []
    return [{ source: '/lf-api/:path*', destination: `${target}/:path*` }]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'randomuser.me' },
    ],
  },
}

export default nextConfig
