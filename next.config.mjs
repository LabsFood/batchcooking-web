// import { NextConfig } from 'next'

// Cible du proxy API (côté serveur). Le navigateur appelle same-origin via
// /lf-api/* → Next relaie vers l'API officielle, ce qui évite les erreurs CORS.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? 'https://lf-api.labsfood.fr'

const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'randomuser.me' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/lf-api/:path*',
        destination: `${API_PROXY_TARGET}/:path*`,
      },
    ]
  },
}

export default nextConfig
