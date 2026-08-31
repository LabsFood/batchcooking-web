// import { NextConfig } from 'next'

const nextConfig = {
  // 'standalone' sert a construire l'image Docker (Coolify).
  // Sur Vercel il casse le file tracing : onBuildComplete cherche
  // .next/next-server.js.nft.json, absent en mode standalone.
  // VERCEL=1 est injecte automatiquement par la plateforme.
  output: process.env.VERCEL ? undefined : 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'randomuser.me' },
    ],
  },
}

export default nextConfig
