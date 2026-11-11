import type { FAQSource } from './types'

/**
 * Textes de loi et pages officielles cités par le FAQ « Avantage fiscal ».
 *
 * Vérifiés le 2026-11-11. Le lien Légifrance désigne la version de l'article
 * 199 sexdecies en vigueur depuis le 14/06/2026 (loi n° 2026-492 du 12/06/2026) :
 * le rouvrir quand l'article change. La page Urssaf n'a pas pu être rouverte
 * ce jour-là (le serveur coupait la connexion), son contenu est à relire.
 */
export const SOURCES = {
  cgi199sexdecies: {
    label: 'Code général des impôts, art. 199 sexdecies (Légifrance)',
    href: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053543952',
  },
  codeTravailD7231: {
    label: 'Code du travail, art. D. 7231-1 : liste des services à la personne',
    href: 'https://code.travail.gouv.fr/code-du-travail/d7231-1',
  },
  codeTravailL7232: {
    label: 'Code du travail, art. L. 7232-1-1 : déclaration de l’activité',
    href: 'https://code.travail.gouv.fr/code-du-travail/l7232-1-1',
  },
  bofipRepas: {
    label: 'BOFiP BOI-IR-RICI-150-10, § 142 : préparation de repas à domicile',
    href: 'https://bofip.impots.gouv.fr/bofip/3971-PGP.html',
  },
  bofipDeclaration: {
    label: 'BOFiP BOI-IR-RICI-150-10, § 190 à 210 : prestataire déclaré',
    href: 'https://bofip.impots.gouv.fr/bofip/3971-PGP.html',
  },
  impotsEmploiDomicile: {
    label: 'impots.gouv.fr, Emploi à domicile : plafonds, cases 7DB et 7DR',
    href: 'https://impots.gouv.fr/particulier/emploi-domicile',
  },
  servicePublic: {
    label: 'service-public.gouv.fr, fiche F12 (avance immédiate : loi n° 2021-1754 du 23/12/2021, art. 13)',
    href: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F12',
  },
  urssafAvanceImmediate: {
    label: 'Urssaf, service Avance immédiate',
    href: 'https://www.urssaf.fr/accueil/services/services-particuliers/service-avance-immediate.html',
  },
} satisfies Record<string, FAQSource>
