import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

/**
 * Pages publiques indexables. Les espaces connectés, les écrans d'auth et les
 * pages de transit en sont volontairement absents, tout comme les routes qui ne
 * font que rediriger (`/chefs`, `/recettes`, `/avantage-fiscal`,
 * `/reservation`) : une redirection n'a pas d'URL canonique à déclarer.
 *
 * Les cartes des batch cookers vivront ici une fois l'API branchée, avec une
 * `lastModified` tirée du backend plutôt que de la date du build.
 */
const ROUTES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/menu', priority: 0.9, changeFrequency: 'daily' },
  { path: '/a-propos', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/devenir-chef', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'yearly' },
  { path: '/cgu', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/cgv', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/confidentialite', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/mentions-legales', priority: 0.2, changeFrequency: 'yearly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: new URL(path, SITE_URL).toString(),
    lastModified,
    changeFrequency,
    priority,
  }))
}
