import { SITE_NAME, SITE_URL } from '@/lib/seo'
import { FAQ_SECTIONS } from '@/lib/faq'

/**
 * Données structurées schema.org.
 *
 * Elles ne sont pas là pour décorer : c'est ce qui permet à Google de relier
 * le site à une entité « Lab's Food » plutôt qu'à une suite de pages, et aux
 * moteurs conversationnels de citer le service avec le bon prix et la bonne
 * zone. Les valeurs doivent donc rester alignées sur les mentions légales.
 */

const ORGANIZATION_ID = `${SITE_URL}/#organization`
const WEBSITE_ID = `${SITE_URL}/#website`

const SOCIAL_PROFILES = [
  'https://www.instagram.com/labs_food',
  'https://www.facebook.com/share/1CD552gDxM/?mibextid=wwXIfr',
  'https://www.tiktok.com/@labs_food',
  'https://www.linkedin.com/company/labs-food',
]

function organization() {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    legalName: 'LAB’S FOOD - BATCHCOOKING',
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/logoOfficiel.png`,
      width: 1604,
      height: 1812,
    },
    image: `${SITE_URL}/og.png`,
    description:
      'Lab’s Food met en relation des particuliers et des batch cookers indépendants qui viennent cuisiner une semaine de repas à domicile.',
    email: 'contact@labsfood.fr',
    telephone: '+33749755684',
    vatID: 'FR20131895203',
    taxID: '13189520300019',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '200 rue de la Croix Nivert',
      postalCode: '75015',
      addressLocality: 'Paris',
      addressCountry: 'FR',
    },
    areaServed: { '@type': 'Country', name: 'France' },
    sameAs: SOCIAL_PROFILES,
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: 'contact@labsfood.fr',
        telephone: '+33749755684',
        availableLanguage: ['fr'],
        areaServed: 'FR',
      },
    ],
  }
}

function website() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: 'fr-FR',
    publisher: { '@id': ORGANIZATION_ID },
  }
}

function service() {
  return {
    '@type': 'Service',
    '@id': `${SITE_URL}/#service`,
    name: 'Batch cooking à domicile',
    serviceType: 'Batch cooking à domicile',
    description:
      'Un batch cooker se déplace chez vous et prépare en une session les repas de votre semaine, avec des produits frais. Prestation de service à la personne éligible au crédit d’impôt de 50 %.',
    provider: { '@id': ORGANIZATION_ID },
    areaServed: { '@type': 'Country', name: 'France' },
    audience: { '@type': 'Audience', audienceType: 'Particuliers' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EUR',
      // Prix plancher d'une session après crédit d'impôt, cohérent avec la
      // promesse affichée sur la home et dans les metadata.
      price: '50',
      priceSpecification: {
        '@type': 'PriceSpecification',
        priceCurrency: 'EUR',
        minPrice: '50',
        valueAddedTaxIncluded: true,
      },
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/menu`,
    },
  }
}

/** Le graphe posé sur la page d'accueil : l'entité, le site et le service. */
export function homeGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [organization(), website(), service()],
  }
}

/**
 * La FAQ, générée depuis `lib/faq` pour qu'elle ne puisse pas diverger du
 * contenu affiché. Google a restreint l'affichage des rich results FAQ aux
 * sites institutionnels, mais le balisage reste lu par Bing et par les moteurs
 * conversationnels, et il aide à comprendre de quoi la page parle.
 */
export function faqGraph() {
  const questions = FAQ_SECTIONS.flatMap((section) => section.questions)
    .map((q) => ({ question: q.question, texte: plainAnswer(q.reponse) }))
    // Filet de sécurité : une réponse qu'on n'aurait pas su aplatir est écartée
    // plutôt que publiée vide, pour ne pas invalider tout le bloc.
    .filter((q) => q.texte.length > 0)

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/faq#faq`,
    isPartOf: { '@id': WEBSITE_ID },
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.texte,
      },
    })),
  }
}

/**
 * Aplatit une réponse riche en un texte lisible par un crawler.
 *
 * Le tableau en fait partie : sans lui, « Quelles sont les conditions
 * d'annulation ? », dont toute la réponse tient dans une grille, ressortait
 * avec un `acceptedAnswer` vide — et un seul `Answer` vide suffit à faire
 * rejeter la page entière par le validateur.
 */
function plainAnswer(reponse: {
  texte?: string
  liste?: string[]
  apres?: string
  note?: string
  tableau?: { entetes: string[]; lignes: string[][] }
}): string {
  const tableau = reponse.tableau
    ? reponse.tableau.lignes
        .map((ligne) =>
          ligne
            .map((cellule, i) => (reponse.tableau!.entetes[i] ? `${reponse.tableau!.entetes[i]} : ${cellule}` : cellule))
            .join(', '),
        )
        .join('. ')
    : undefined

  return [reponse.texte, reponse.liste?.join(' '), tableau, reponse.apres, reponse.note]
    .filter(Boolean)
    .join(' ')
    .trim()
}

export function breadcrumb(trail: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: step.name,
      item: new URL(step.path, SITE_URL).toString(),
    })),
  }
}
