import { SOURCES } from './sources'
import type { FAQItem } from './types'

/**
 * Toutes les questions du FAQ, dans l'ordre d'affichage. Les réponses sont du
 * texte brut ; les textes de loi et pages officielles vont dans `sources`
 * (définis une fois dans `sources.ts`).
 */
export const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'f1',
    question: 'Qu’est-ce que le batch cooking à domicile exactement ?',
    answer:
      'Le service consiste en une intervention à votre domicile pour préparer l’ensemble de vos repas de la semaine en une seule session de 2 h à 3 h. L’objectif : vous libérer des contraintes quotidiennes de la cuisine, sans renoncer au fait maison.',
    category: 'service',
  },
  {
    id: 'f2',
    question: 'Proposez-vous les menus ou dois-je choisir moi-même ?',
    answer:
      'Lab’s Food propose chaque semaine des menus de saison variés. Vous gardez la possibilité de soumettre vos propres suggestions de plats. Selon la complexité de la recette demandée (temps de préparation prolongé, techniques spécifiques), un ajustement tarifaire pourra être appliqué par rapport au forfait standard.',
    category: 'recettes',
  },
  {
    id: 'f3',
    question: 'Qui est responsable de l’achat des ingrédients ?',
    answer:
      'À ce jour, la gestion des courses incombe exclusivement au client. Une liste d’ingrédients précise et détaillée vous est transmise. Vous gardez la maîtrise totale de votre budget, le choix des fournisseurs (bio, producteurs locaux…) et la provenance des produits que vous consommez.',
    category: 'service',
  },
  {
    id: 'f4',
    question: 'Quel matériel dois-je fournir ?',
    answer:
      'L’essentiel des équipements requis est listé dans la section "Matériel" du site (page Menu et FAQ). À l’envoi de la liste de courses, un rappel spécifique du matériel nécessaire pour les recettes choisies est systématiquement inclus, pour s’assurer que tout est prêt à l’arrivée de la cheffe.',
    category: 'service',
  },
  {
    id: 'f5',
    question: 'La cheffe peut-elle apporter du matériel complémentaire ?',
    answer:
      'Oui. Si vous ne possédez pas un ustensile spécifique indispensable à une recette, Lab’s Food peut fournir le matériel nécessaire, sous réserve qu’il soit disponible dans le kit mobile de la cheffe. Signalez-nous tout manque d’équipement lors de la validation du menu.',
    category: 'service',
  },
  {
    id: 'f6',
    question: 'La cheffe peut-elle apporter des épices ou des condiments ?',
    answer:
      'Oui, l’intervenante peut apporter une sélection d’épices, dans la limite de ce qui est disponible dans son kit mobile.',
    category: 'service',
  },
  {
    id: 'f7',
    question: 'La cuisine est-elle nettoyée après la prestation ?',
    answer:
      'Oui. Chaque session se termine par le nettoyage des plans de travail et de la vaisselle utilisée pendant la prestation.',
    category: 'service',
  },
  {
    id: 'f8',
    question: 'Dans quelles zones intervenez-vous ?',
    answer:
      'Partout en France. Les cuisinier·es se déplacent directement à votre domicile, quelle que soit votre région.',
    category: 'service',
  },
  {
    id: 'f9',
    question: 'Y a-t-il des frais de déplacement supplémentaires ?',
    answer: 'Non. Aucun frais de déplacement n’est facturé en supplément.',
    category: 'tarifs',
  },
  {
    id: 'f10',
    question: 'Que comprend exactement le tarif ?',
    answer:
      'Le tarif couvre uniquement la prestation de la cheffe à votre domicile (déplacement + préparation des repas). Les ingrédients restent à votre charge.',
    category: 'tarifs',
  },
  {
    id: 'f11',
    question: 'Puis-je annuler une prestation une fois le devis signé ?',
    answer:
      'La signature d’un devis constitue un engagement ferme et valide définitivement la réservation — il n’y a donc pas d’annulation stricte. En cas d’imprévu, un report est systématiquement proposé. La nouvelle intervention devra avoir lieu dans un délai de 30 jours maximum à compter de votre demande de report.',
    category: 'réservation',
  },
  {
    id: 'r1',
    question: 'Dois-je déclarer mes allergies pour réserver ?',
    answer:
      'Oui. Avant de valider un menu, vous indiquez vos allergies parmi les 14 allergènes réglementaires (et d’autres si besoin), ou vous précisez que vous n’en avez aucune. Sans cette déclaration, la réservation ne peut pas être validée. Vous la faites une fois, depuis « Bien démarrer » ou votre profil.',
    category: 'allergies',
  },
  {
    id: 'r2',
    question: 'Pourquoi me demande-t-on mon consentement ?',
    answer:
      'Une allergie est une donnée de santé. Nous l’enregistrons seulement avec votre accord, pour écarter les plats qui la contiennent et la transmettre au batch cooker qui cuisine pour vous. Si vous n’avez aucune allergie, aucun consentement n’est demandé.',
    category: 'allergies',
  },
  {
    id: 'r3',
    question: 'Puis-je retirer mon consentement ?',
    answer:
      'Oui, à tout moment depuis votre profil. Vos allergies sont alors effacées, et vous devrez les déclarer à nouveau avant de valider un prochain menu.',
    category: 'allergies',
  },
  {
    id: 'r4',
    question: 'Que se passe-t-il si un plat contient un allergène que j’ai déclaré ?',
    answer:
      'Le plat est refusé : il ne peut pas entrer dans votre menu. Un plat dont les allergènes n’ont pas encore été vérifiés est refusé de la même façon si vous avez déclaré des allergies.',
    category: 'allergies',
  },
  {
    id: 'r5',
    question: 'Et si je déclare une nouvelle allergie après avoir réservé ?',
    answer:
      'Vos menus déjà validés sont revérifiés aussitôt. Un plat devenu incompatible est signalé « à remplacer », vous recevez une notification, et le plat peut être remplacé par un autre, compatible.',
    category: 'allergies',
  },
  {
    id: 'r6',
    question: 'Le batch cooker connaît-il mes allergies ?',
    answer:
      'Oui, il voit vos allergies sur la prestation, avec leur statut vérifié. Elles ne sont jamais affichées publiquement.',
    category: 'allergies',
  },
  {
    id: 'r7',
    question: 'À quoi sert « Bien démarrer » ?',
    answer:
      'C’est la liste de vos premiers pas : coordonnées, adresse, allergies, goûts et première session. Elle indique où vous en êtes (par exemple « 2 étapes sur 5 ») et ne bloque rien, sauf l’étape allergies, nécessaire pour valider un menu.',
    category: 'service',
  },
  {
    id: 'r8',
    question: 'Comment fonctionne la liste de courses ?',
    answer:
      'Le batch cooker vous envoie la liste des ingrédients de vos plats, rangée par rayon. Vous cochez « J’ai déjà » pour ce que vous avez, ajoutez un commentaire si besoin, puis renvoyez votre liste. Vous recevez une notification à chaque envoi.',
    category: 'réservation',
  },
  {
    id: 'r9',
    question: 'Jusqu’à quand puis-je modifier ma liste de courses ?',
    answer:
      'Jusqu’à midi la veille de la prestation. Si le batch cooker vous envoie une nouvelle version entre-temps, répondez sur cette dernière version : une réponse à une ancienne liste est refusée.',
    category: 'réservation',
  },
  {
    id: 'r10',
    question: 'Les régimes et les saisons affichés sur les plats sont-ils fiables ?',
    answer:
      'Ils sont calculés d’après les ingrédients de la recette, selon les produits habituellement achetés. Une marque différente peut contenir une trace : en cas d’allergie ou de régime strict, déclarez-le et dites-le au batch cooker. Halal et casher sont déclarés par le batch cooker, pas calculés.',
    category: 'recettes',
  },
  {
    id: 'r11',
    question: 'Que voit-on d’une recette sur le site ?',
    answer:
      'Le nom, la description, la photo, les régimes, les saisons et les profils du plat. Les temps de préparation, la recette détaillée et les notes personnelles du batch cooker restent privés.',
    category: 'recettes',
  },
  {
    id: 'r12',
    question: 'Quand une recette est-elle « Prête » ?',
    answer:
      'Quand elle a un type de plat, un temps de cuisson, au moins un ingrédient, des étapes avec leur type, une conservation, un mode de réchauffage et des allergènes confirmés. L’écran liste ce qui manque. Une courte description est demandée en plus pour publier.',
    category: 'cuisiniers',
  },
  {
    id: 'r13',
    question: 'Pourquoi dois-je reconfirmer les allergènes ?',
    answer:
      'Ajouter, retirer ou renommer un ingrédient efface la confirmation : le plat doit être revérifié avant d’être réservé par un client allergique. Changer seulement une quantité ne l’efface pas.',
    category: 'cuisiniers',
  },
  {
    id: 'r14',
    question: 'Qu’est-ce qu’une version de recette ?',
    answer:
      'Une fois la recette Prête, chaque enregistrement crée une nouvelle version. Les prestations déjà validées gardent la version du moment : vos modifications ne changent pas un menu déjà accepté.',
    category: 'cuisiniers',
  },
  {
    id: 'r15',
    question: 'Y a-t-il des limites à une recette ?',
    answer:
      'Oui : 60 ingrédients, 40 étapes et 2 000 caractères par étape au plus.',
    category: 'cuisiniers',
  },
  {
    id: 'r16',
    question: 'Puis-je dupliquer un plat ou un menu ?',
    answer:
      'Oui. La copie s’appelle « (copie) », reste en brouillon et n’est jamais publiée d’office. Pour un plat, les allergènes sont à confirmer à nouveau. Un menu copié reprend les mêmes plats, sans les dupliquer.',
    category: 'cuisiniers',
  },
  {
    id: 'r17',
    question: 'Puis-je adapter un ingrédient de la liste commune ?',
    answer:
      'Oui. Depuis « Mes ingrédients », vous adoptez une entrée de la liste commune et corrigez votre version (nom, mois de saison, régimes). Vos plats se classent alors depuis votre version.',
    category: 'cuisiniers',
  },
  {
    id: 'r18',
    question: 'Puis-je télécharger ma fiche recette ?',
    answer:
      'Oui, en PDF, depuis le formulaire de la recette.',
    category: 'cuisiniers',
  },

  // ─── Avantage fiscal ────────────────────────────────────────────────────────
  {
    id: 'f12',
    question: 'Le batch cooking à domicile donne-t-il droit au crédit d’impôt ?',
    answer:
      'Oui. La préparation de repas à domicile, y compris le temps passé aux courses, figure parmi les services à la personne listés à l’article D. 7231-1 (II, 7°) du Code du travail. Elle ouvre droit au crédit d’impôt de l’article 199 sexdecies du Code général des impôts, lorsqu’elle est réalisée à votre domicile en France par un intervenant déclaré.',
    category: 'fiscal',
    sources: [SOURCES.cgi199sexdecies, SOURCES.codeTravailD7231, SOURCES.bofipRepas],
  },
  {
    id: 'f13',
    question: 'Quel est le montant de l’avantage fiscal ?',
    answer:
      'Le crédit d’impôt est de 50 % des dépenses payées dans l’année, dans la limite de 12 000 € de dépenses, soit 6 000 € de crédit au maximum. Ce plafond est majoré de 1 500 € par enfant à charge et par membre du foyer de plus de 65 ans, sans dépasser 15 000 €, et porté à 20 000 € dans certaines situations d’invalidité. Il s’applique à l’ensemble de vos services à la personne, pas seulement au batch cooking.',
    category: 'fiscal',
    sources: [SOURCES.cgi199sexdecies, SOURCES.impotsEmploiDomicile, SOURCES.servicePublic],
  },
  {
    id: 'f14',
    question: 'Faut-il payer de l’impôt pour en bénéficier ?',
    answer:
      'Non. C’est un crédit d’impôt et non une simple réduction : il s’impute après les autres réductions et crédits d’impôt, et si son montant dépasse l’impôt que vous devez, l’excédent vous est restitué.',
    category: 'fiscal',
    sources: [SOURCES.cgi199sexdecies],
  },
  {
    id: 'f15',
    question: 'L’intervenant doit-il être déclaré ?',
    answer:
      'Oui. L’activité de services à la personne doit être déclarée (article L. 7232-1-1 du Code du travail) pour que vous puissiez bénéficier du crédit d’impôt. Une dérogation à l’activité exclusive (article L. 7232-1-2) permet notamment aux micro-entrepreneurs d’exercer d’autres activités. Votre attestation fiscale annuelle indique la déclaration de chaque batch cooker.',
    category: 'fiscal',
    sources: [SOURCES.cgi199sexdecies, SOURCES.codeTravailL7232, SOURCES.bofipDeclaration],
  },
  {
    id: 'f16',
    question: 'Qu’est-ce que l’avance immédiate ?',
    answer:
      'C’est un service gratuit et facultatif de l’Urssaf. Au lieu de tout avancer puis de récupérer 50 % l’année suivante, vous ne payez que la moitié. Après la prestation, l’Urssaf vous notifie la demande de paiement, vous la validez sous 48 h, puis elle prélève votre moitié et verse le reste directement au prestataire.',
    category: 'fiscal',
    sources: [SOURCES.urssafAvanceImmediate, SOURCES.servicePublic],
  },
  {
    id: 'f17',
    question: 'Quelles sont les conditions pour l’avance immédiate ?',
    answer:
      'Il faut un numéro fiscal français et avoir déjà fait au moins une déclaration de revenus en France. Nous vous inscrivons sur la plateforme de l’Urssaf, qui vous envoie un e-mail d’activation. Vous y renseignez ensuite votre RIB, sur son espace sécurisé.',
    category: 'fiscal',
    sources: [SOURCES.urssafAvanceImmediate],
  },
  {
    id: 'f18',
    question: 'Et si je n’utilise pas l’avance immédiate ?',
    answer:
      'Vous payez le prix complet et recevez une attestation fiscale annuelle. Vous reportez le total de vos dépenses de services à la personne en case 7DB de votre déclaration de revenus. Le crédit vous est versé l’été suivant, avec un acompte de 60 % possible en janvier.',
    category: 'fiscal',
    sources: [SOURCES.impotsEmploiDomicile, SOURCES.servicePublic],
  },
  {
    id: 'f19',
    question: 'Les aides que je perçois sont-elles déduites ?',
    answer:
      'Oui. Le crédit d’impôt porte uniquement sur ce qui reste à votre charge : les aides reçues (APA, PCH, CESU préfinancé…) se reportent en case 7DR et ne comptent pas dans la base. Ces informations sont générales : votre situation fiscale se confirme auprès de l’administration fiscale.',
    category: 'fiscal',
    sources: [SOURCES.impotsEmploiDomicile, SOURCES.cgi199sexdecies],
  },
]
