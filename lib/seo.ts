import type { Metadata } from 'next'

export const SITE_URL = 'https://www.labsfood.fr'
export const SITE_NAME = "Lab's Food"
export const SITE_TITLE = "Lab's Food — Batch Cooking à domicile"
export const SITE_DESCRIPTION =
  "Une semaine de repas faits maison, cuisinés chez vous par un cuisinier, partout en France. À partir de 50 € par session après crédit d'impôt (avance immédiate Urssaf). Réservez votre batch cooker avec Lab's Food."

/**
 * Visuel social par défaut. C'est un PNG versionné plutôt qu'un `ImageResponse`
 * généré à la volée : les scrapers de Facebook, LinkedIn et WhatsApp rappellent
 * l'URL à chaque partage, et l'image ne change pas d'un déploiement à l'autre.
 * Regénérable via `node scripts/generate-og.mjs`.
 */
export const OG_IMAGE = {
  url: '/og.png',
  width: 1200,
  height: 630,
  alt: "Lab's Food, une semaine de repas faits maison cuisinés chez vous",
}

type PageSeo = {
  /** Sans le suffixe « | Lab's Food », ajouté par le template du layout. */
  title: string
  description: string
  /** Chemin absolu depuis la racine, par exemple `/menu`. */
  path: string
  /** Visuel social spécifique à la page. Par défaut, celui du site. */
  image?: { url: string; width: number; height: number; alt: string }
  /** Pour les pages utiles aux visiteurs mais sans intérêt dans l'index. */
  noIndex?: boolean
}

/**
 * Construit les metadata d'une page publique : canonical, Open Graph et carte X
 * restent alignés sur le titre et la description, au lieu d'être recopiés page
 * par page et de diverger au premier changement de wording.
 */
export function pageMetadata({ title, description, path, image = OG_IMAGE, noIndex }: PageSeo): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: path,
      type: 'website',
      locale: 'fr_FR',
      siteName: SITE_NAME,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [image.url],
    },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  }
}
