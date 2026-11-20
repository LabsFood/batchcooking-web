import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

/**
 * Les espaces connectés répondent déjà 302 vers Clerk pour un visiteur anonyme
 * (voir `middleware.ts`) : ce `disallow` évite surtout que les crawlers brûlent
 * leur budget sur des redirections, et que les URL d'auth remontent en SERP.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/espace-client/',
        '/espace-chef/',
        '/auth/',
        '/apres-connexion',
        '/retour-stripe',
        '/brand',
        '/api/',
      ],
    },
    sitemap: new URL('/sitemap.xml', SITE_URL).toString(),
    host: SITE_URL,
  }
}
