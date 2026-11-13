/* ─────────────────────────────────────────────────────────────────────────────
   Les questions fréquentes, côté client.

   Ce n'est pas un mock : c'est du contenu éditorial, relu et validé par
   l'équipe. Il vit ici plutôt que dans `mock-data.ts` pour que personne ne le
   remplace un jour par un appel d'API en faisant le ménage des faux jeux de
   données.

   Deux usages, une seule source :
   - la page `/faq` déroule tout, section par section ;
   - la page d'accueil n'en montre qu'une poignée, choisie dans `FAQ_ACCUEIL`.

   Une réponse peut porter un texte, une liste, un mot de la fin, un encadré
   « bon à savoir » et un petit tableau. Tout est optionnel : la plupart des
   réponses sont une phrase, et c'est très bien.
   ───────────────────────────────────────────────────────────────────────────── */

export interface FaqReponse {
  /** Le corps de la réponse. */
  texte?: string
  /** Une énumération, quand la réponse est une liste de choses. */
  liste?: string[]
  /** Ce qui vient après la liste. */
  apres?: string
  /** Une mise en garde ou une précision utile, détachée du reste. */
  note?: string
  /** Un tableau de comparaison — rare, et c'est tant mieux. */
  tableau?: { entetes: string[]; lignes: string[][] }
}

export interface FaqQuestion {
  id: string
  question: string
  reponse: FaqReponse
}

export interface FaqSection {
  id: string
  titre: string
  questions: FaqQuestion[]
}

export const FAQ_SECTIONS: FaqSection[] = [
  {
    id: 'decouvrir',
    titre: 'Découvrir Lab’s Food',
    questions: [
      {
        id: 'quest-ce-que',
        question: 'Qu’est-ce que Lab’s Food ?',
        reponse: {
          texte:
            'Lab’s Food est une plateforme qui vous met en relation avec des batch cookers indépendants près de chez vous. Le batch cooker se déplace à votre domicile et prépare en une fois les repas de votre semaine, avec des produits frais.',
        },
      },
      {
        id: 'cest-quoi-le-batch-cooking',
        question: 'C’est quoi, le batch cooking ?',
        reponse: {
          texte:
            'C’est le fait de cuisiner en une seule session plusieurs repas pour les jours suivants. Résultat : chaque soir, il suffit de réchauffer un bon plat maison. Vous gagnez du temps, vous mangez mieux et vous jetez moins.',
        },
      },
      {
        id: 'difference-traiteur',
        question: 'Quelle différence avec un traiteur ou une livraison de repas ?',
        reponse: {
          liste: [
            'Tout est cuisiné chez vous, sous vos yeux si vous le souhaitez.',
            'Les menus sont faits pour vous : vos goûts, votre famille, vos contraintes alimentaires.',
            'Pas de plats industriels ni de barquettes jetables : de vrais repas maison, dans vos propres boîtes.',
            'Une partie du prix vous est rendue grâce au crédit d’impôt.',
          ],
        },
      },
      {
        id: 'disponible-dans-ma-ville',
        question: 'Lab’s Food est-il disponible dans ma ville ?',
        reponse: {
          texte:
            'La plateforme fonctionne partout en France, selon les batch cookers présents dans votre secteur. Indiquez votre code postal pour voir qui intervient près de chez vous.',
          note: 'Personne dans votre zone pour le moment ? Laissez-nous votre contact : nous vous prévenons dès qu’un batch cooker arrive.',
        },
      },
      {
        id: 'pour-qui',
        question: 'Pour qui est fait Lab’s Food ?',
        reponse: {
          texte:
            'Pour tous ceux qui veulent bien manger sans y passer des heures : familles, parents de jeunes enfants, personnes qui travaillent beaucoup, seniors, sportifs, personnes qui suivent un régime particulier ou qui veulent simplement retrouver le plaisir des repas maison.',
        },
      },
    ],
  },

  {
    id: 'batch-cookers',
    titre: 'Nos batch cookers',
    questions: [
      {
        id: 'qui-sont-ils',
        question: 'Qui sont les batch cookers de la plateforme ?',
        reponse: {
          texte:
            'Ce sont des cuisiniers indépendants, passionnés de cuisine maison et spécialistes de l’organisation des repas. Chacun a son propre style, ses spécialités et sa zone d’intervention.',
        },
      },
      {
        id: 'selection',
        question: 'Comment les batch cookers sont-ils sélectionnés ?',
        reponse: {
          texte:
            'Chaque batch cooker passe par une étape de vérification avant d’apparaître sur la plateforme. L’équipe Lab’s Food contrôle notamment :',
          liste: [
            'son identité ;',
            'son statut d’indépendant déclaré (numéro SIRET) ;',
            'son assurance responsabilité civile professionnelle ;',
            'sa formation aux règles d’hygiène alimentaire.',
          ],
        },
      },
      {
        id: 'comment-choisir',
        question: 'Comment choisir mon batch cooker ?',
        reponse: {
          texte:
            'Chaque batch cooker a un profil complet : photo, présentation, spécialités, régimes maîtrisés, tarifs, disponibilités et avis des clients. Prenez le temps de comparer, puis échangez avec lui par la messagerie avant de réserver si vous avez des questions.',
        },
      },
      {
        id: 'garder-le-meme',
        question: 'Puis-je garder le même batch cooker chaque semaine ?',
        reponse: {
          texte:
            'Oui, s’il est disponible. C’est d’ailleurs ce que font la plupart de nos clients : au fil des prestations, votre batch cooker connaît votre cuisine, vos goûts et ceux de vos enfants.',
        },
      },
      {
        id: 'plus-disponible',
        question: 'Et si mon batch cooker n’est plus disponible ?',
        reponse: {
          texte:
            'Vous pouvez en choisir un autre dans votre secteur, à tout moment. Vos préférences et vos allergies restent enregistrées dans votre compte : vous n’avez pas à tout réexpliquer.',
        },
      },
      {
        id: 'hygiene',
        question: 'Les batch cookers respectent-ils les règles d’hygiène ?',
        reponse: {
          texte:
            'Oui. Ils s’engagent à respecter les règles d’hygiène en cuisine : lavage des mains, tenue propre, respect de la chaîne du froid, séparation des aliments crus et cuits, nettoyage du plan de travail.',
        },
      },
    ],
  },

  {
    id: 'menus',
    titre: 'Les menus et les repas',
    questions: [
      {
        id: 'proposer-des-repas',
        question: 'Le batch cooker peut-il me proposer des repas ?',
        reponse: {
          texte:
            'Oui, c’est même son rôle. Avant la prestation, il vous propose un menu adapté à vos goûts, à la saison, au nombre de personnes et à vos contraintes. Vous le validez, ou vous demandez des changements. Vous n’avez rien à préparer.',
        },
      },
      {
        id: 'choisir-mes-recettes',
        question: 'Puis-je choisir moi-même mes recettes ?',
        reponse: {
          texte:
            'Bien sûr. Vous pouvez demander vos plats préférés, une recette de famille ou des idées précises. Le batch cooker vous dit simplement si c’est réalisable dans le temps prévu.',
        },
      },
      {
        id: 'combien-de-plats',
        question: 'Combien de plats vais-je recevoir ?',
        reponse: {
          texte:
            'Cela dépend de la formule choisie et du nombre de personnes dans votre foyer. Le nombre de recettes et de portions est indiqué clairement avant la réservation — par exemple quatre recettes pour quatre personnes, soit les repas de trois à quatre jours.',
        },
      },
      {
        id: 'regimes',
        question: 'Les repas peuvent-ils suivre un régime particulier ?',
        reponse: {
          texte:
            'Oui. Précisez-le lors de la réservation : végétarien, végan, sans porc, halal, sans gluten, sans lactose, pauvre en sel, riche en protéines… Chaque batch cooker indique sur son profil les régimes qu’il maîtrise.',
        },
      },
      {
        id: 'allergies',
        question: 'J’ai une allergie alimentaire. Comment faire ?',
        reponse: {
          texte:
            'Indiquez toutes vos allergies et intolérances dans votre compte et au moment de la réservation. Le batch cooker en tient compte dans le menu et dans la liste de courses.',
          note: 'La cuisine se fait chez vous, avec vos ustensiles. Si l’aliment allergisant est déjà présent dans votre cuisine, l’absence totale de traces ne peut pas être garantie. En cas d’allergie sévère, parlez-en avec votre batch cooker avant de réserver.',
        },
      },
      {
        id: 'enfants',
        question: 'Pouvez-vous cuisiner pour mes enfants ou mon bébé ?',
        reponse: {
          texte:
            'Oui. Indiquez l’âge des enfants : le batch cooker adapte les portions, les textures et l’assaisonnement.',
        },
      },
      {
        id: 'conservation',
        question: 'Combien de temps se conservent les plats ?',
        reponse: {
          texte:
            'La plupart des plats se gardent trois à quatre jours au réfrigérateur. Ceux prévus pour la fin de la semaine peuvent être congelés. Le batch cooker vous explique comment conserver et réchauffer chaque plat, et dans quel ordre les manger.',
        },
      },
      {
        id: 'plat-qui-deplait',
        question: 'Un plat ne m’a pas plu. Que faire ?',
        reponse: {
          texte:
            'Dites-le simplement à votre batch cooker par la messagerie. Il en tiendra compte pour vos prochains menus.',
        },
      },
    ],
  },

  {
    id: 'reserver',
    titre: 'Réserver une prestation',
    questions: [
      {
        id: 'comment-reserver',
        question: 'Comment réserver ?',
        reponse: {
          liste: [
            'Créez votre compte.',
            'Indiquez votre code postal et choisissez votre batch cooker.',
            'Sélectionnez une date et un créneau.',
            'Précisez le nombre de personnes, vos goûts et vos allergies.',
            'Choisissez qui fait les courses : vous ou le batch cooker.',
            'Validez et payez en ligne.',
          ],
          apres:
            'Vous recevez une confirmation, puis vous préparez le menu avec votre batch cooker par la messagerie.',
        },
      },
      {
        id: 'delai',
        question: 'Combien de temps à l’avance faut-il réserver ?',
        reponse: {
          texte:
            'Cela dépend des disponibilités de chaque batch cooker. Nous vous conseillons de réserver au moins trois jours à l’avance, pour avoir le temps de préparer le menu ensemble.',
        },
      },
      {
        id: 'une-seule-fois',
        question: 'Puis-je réserver une seule fois pour essayer ?',
        reponse: {
          texte:
            'Oui. Vous pouvez réserver une prestation ponctuelle, sans engagement. Si vous êtes conquis, vous pouvez ensuite réserver chaque semaine, toutes les deux semaines ou une fois par mois.',
        },
      },
      {
        id: 'parler-avant',
        question: 'Puis-je parler au batch cooker avant de réserver ?',
        reponse: {
          texte:
            'Oui. La messagerie de la plateforme vous permet de poser vos questions et de parler de vos envies. Tous vos échanges restent au même endroit.',
        },
      },
      {
        id: 'presence',
        question: 'Dois-je être présent pendant la prestation ?',
        reponse: {
          texte:
            'Ce n’est pas obligatoire. Pour la première fois, nous vous conseillons d’être là pour accueillir votre batch cooker et lui montrer votre cuisine. Ensuite, vous convenez ensemble de l’accès à votre logement : remise de clés, boîte à clés, voisin ou gardien. Rien ne se fait sans votre accord.',
        },
      },
    ],
  },

  {
    id: 'jour-j',
    titre: 'Le jour de la prestation',
    questions: [
      {
        id: 'duree',
        question: 'Combien de temps dure une prestation ?',
        reponse: {
          texte:
            'En général entre 2 h 30 et 4 h, selon le nombre de plats et de personnes. La durée prévue est indiquée lors de la réservation.',
        },
      },
      {
        id: 'ce-quil-faut-prevoir',
        question: 'De quoi le batch cooker a-t-il besoin chez moi ?',
        reponse: {
          texte:
            'Il cuisine avec votre équipement : plaques, four, casseroles, poêles, plats, couteaux et planches. Pensez à prévoir :',
          liste: [
            'des boîtes de conservation en nombre suffisant, en verre de préférence ;',
            'de la place dans votre réfrigérateur ;',
            'un plan de travail dégagé.',
          ],
          apres: 'S’il manque quelque chose, votre batch cooker vous prévient avant la prestation.',
        },
      },
      {
        id: 'cuisine-propre',
        question: 'Ma cuisine sera-t-elle propre après le passage du batch cooker ?',
        reponse: {
          texte:
            'Oui, c’est inclus dans la prestation. Avant de partir, le batch cooker lave la vaisselle et les ustensiles utilisés, nettoie le plan de travail et les plaques, et range la cuisine. Vous retrouvez une cuisine propre et des plats prêts, bien rangés dans votre frigo.',
        },
      },
      {
        id: 'casse',
        question: 'Et en cas de casse ou de dégât ?',
        reponse: {
          texte:
            'Signalez-le tout de suite par la messagerie ou à notre service client. Nous trouvons une solution avec vous et le batch cooker.',
        },
      },
    ],
  },

  {
    id: 'courses',
    titre: 'Les courses',
    questions: [
      {
        id: 'qui-fait-les-courses',
        question: 'Qui fait les courses ?',
        reponse: {
          texte: 'C’est vous qui choisissez :',
          liste: [
            'Vous faites les courses vous-même : vous recevez la liste complète, avec les quantités exactes, avant la prestation.',
            'Le batch cooker s’en charge : il achète les ingrédients juste avant de venir, et vous n’avez plus rien à faire.',
          ],
        },
      },
      {
        id: 'payer-les-courses',
        question: 'Comment je paie les courses si le batch cooker les fait ?',
        reponse: {
          liste: [
            'Le batch cooker avance l’argent des courses.',
            'Il ajoute le ticket de caisse sur la plateforme.',
            'Vous remboursez le montant exact du ticket, en ligne.',
          ],
          apres:
            'Tout se fait sur la plateforme : vous n’avez jamais d’espèces à donner. Des frais de paiement en ligne s’ajoutent au montant des courses ; ils vous sont indiqués avant que vous validiez.',
        },
      },
      {
        id: 'choisir-le-magasin',
        question: 'Puis-je choisir le magasin ou le type de produits ?',
        reponse: {
          texte:
            'Oui. Indiquez vos préférences dans la messagerie : votre magasin habituel, des produits bio, locaux, de saison, ou vos marques préférées.',
        },
      },
      {
        id: 'budget-courses',
        question: 'Combien vont coûter les courses ?',
        reponse: {
          texte:
            'Cela dépend du menu et du nombre de personnes. La liste de courses vous donne une idée du budget à l’avance. Vous avez un budget à respecter ? Dites-le à votre batch cooker : il adapte le menu.',
        },
      },
      {
        id: 'ingredients-deja-chez-moi',
        question: 'J’ai déjà des ingrédients chez moi. Que faire ?',
        reponse: {
          texte:
            'Signalez-le à votre batch cooker : il les retire de la liste pour éviter les achats en double.',
        },
      },
    ],
  },

  {
    id: 'prix',
    titre: 'Prix, crédit d’impôt et avance immédiate',
    questions: [
      {
        id: 'combien-ca-coute',
        question: 'Combien coûte une prestation ?',
        reponse: {
          texte:
            'Chaque batch cooker fixe ses propres tarifs. Ils sont affichés clairement sur son profil, avant toute réservation. Le prix dépend surtout du nombre de personnes, du nombre de plats et de la durée.',
        },
      },
      {
        id: 'ce-qui-est-compris',
        question: 'Qu’est-ce qui est compris dans le prix ?',
        reponse: {
          liste: [
            'la création du menu avec vous ;',
            'la préparation et la cuisson des plats chez vous ;',
            'la vaisselle, le nettoyage et le rangement de la cuisine ;',
            'le temps passé à faire les courses, si vous choisissez cette option.',
          ],
          apres: 'Les ingrédients sont payés à part, au prix réel du ticket de caisse.',
        },
      },
      {
        id: 'credit-dimpot',
        question: 'Ai-je droit à un crédit d’impôt ?',
        reponse: {
          texte:
            'Oui. La préparation de repas à domicile fait partie des services à la personne : vous avez droit à un crédit d’impôt de 50 % sur le prix de la prestation. Autrement dit, la moitié de ce que vous payez pour la prestation vous est rendue.',
          liste: [
            'Il s’applique à la prestation, y compris le temps passé aux courses, mais pas au prix des ingrédients.',
            'C’est un crédit et non une réduction : même si vous ne payez pas d’impôt, vous êtes remboursé.',
            'Les dépenses sont prises en compte jusqu’à 12 000 € par an et par foyer. Ce plafond peut être augmenté selon votre situation, par exemple avec des enfants à charge.',
            'Vous recevez chaque année une attestation fiscale dans votre espace client.',
          ],
        },
      },
      {
        id: 'avance-immediate',
        question: 'L’avance immédiate est-elle proposée ?',
        reponse: {
          texte:
            'Oui. Grâce à l’avance immédiate de l’URSSAF, vous n’avancez plus le crédit d’impôt : vous payez directement la moitié du prix de la prestation, et l’URSSAF verse l’autre moitié. Le service est gratuit, et vous n’attendez plus l’année suivante pour être remboursé.',
          tableau: {
            entetes: ['Prestation à 80 €', 'Sans avance immédiate', 'Avec avance immédiate'],
            lignes: [
              ['Vous payez le jour J', '80 €', '40 €'],
              ['Vous récupérez plus tard', '40 € l’année suivante', 'Rien à attendre'],
              ['Coût final pour vous', '40 €', '40 €'],
            ],
          },
        },
      },
      {
        id: 'activer-avance-immediate',
        question: 'Comment activer l’avance immédiate ?',
        reponse: {
          liste: [
            'Lors de votre première réservation, choisissez l’avance immédiate.',
            'Lab’s Food vous inscrit auprès de l’URSSAF avec les informations de votre compte.',
            'Vous recevez un e-mail de l’URSSAF pour activer votre espace en ligne.',
            'Après chaque prestation, vous validez la demande de paiement sur votre espace URSSAF. Seule votre moitié est prélevée.',
          ],
          note: 'Pour en profiter, vous devez être domicilié en France et avoir déjà fait au moins une déclaration de revenus.',
        },
      },
      {
        id: 'moyens-de-paiement',
        question: 'Comment puis-je payer ?',
        reponse: {
          texte:
            'En ligne, par carte bancaire, sur un espace de paiement sécurisé. Le paiement en e-CESU est aussi accepté. Vous ne donnez jamais d’argent directement au batch cooker.',
        },
      },
      {
        id: 'facture',
        question: 'Vais-je recevoir une facture ?',
        reponse: {
          texte:
            'Oui. Toutes vos factures sont disponibles dans votre espace client, à télécharger quand vous le souhaitez.',
        },
      },
    ],
  },

  {
    id: 'annulation',
    titre: 'Annulation et modification',
    questions: [
      {
        id: 'modifier',
        question: 'Puis-je modifier ma réservation ?',
        reponse: {
          texte:
            'Oui, directement depuis votre espace client : changement de date, de créneau ou du nombre de personnes, selon les disponibilités de votre batch cooker. Il est prévenu automatiquement.',
        },
      },
      {
        id: 'comment-annuler',
        question: 'Comment annuler une prestation ?',
        reponse: {
          texte:
            'En quelques clics depuis votre espace client. La plateforme prévient le batch cooker et s’occupe du remboursement s’il y en a un.',
        },
      },
      {
        id: 'conditions-annulation',
        question: 'Quelles sont les conditions d’annulation ?',
        reponse: {
          tableau: {
            entetes: ['Vous annulez', 'Ce qui se passe'],
            lignes: [
              ['Plus de 48 h avant la prestation', 'Annulation gratuite : vous êtes remboursé en totalité.'],
              [
                'Moins de 48 h avant la prestation',
                'Une part du prix est conservée pour dédommager le batch cooker. Le montant exact vous est indiqué avant que vous confirmiez l’annulation.',
              ],
              [
                'Après l’achat des courses',
                'Les courses déjà achetées restent à votre charge. Elles vous sont remises.',
              ],
            ],
          },
        },
      },
      {
        id: 'annulation-batch-cooker',
        question: 'Et si c’est le batch cooker qui annule ?',
        reponse: {
          texte:
            'Vous êtes remboursé intégralement. Nous vous aidons aussi à trouver une nouvelle date, ou un autre batch cooker disponible près de chez vous.',
        },
      },
      {
        id: 'retard',
        question: 'Le batch cooker est en retard. Que faire ?',
        reponse: {
          texte:
            'Il doit vous prévenir dès que possible par la messagerie. Si vous n’avez pas de nouvelles, contactez notre service client.',
        },
      },
      {
        id: 'insatisfaction',
        question: 'Je ne suis pas satisfait. Que faire ?',
        reponse: {
          texte:
            'Parlez-en d’abord à votre batch cooker : la plupart des soucis se règlent simplement. Si le problème continue, contactez notre service client dans les 48 h qui suivent la prestation. Nous étudions chaque demande et cherchons une solution avec vous.',
        },
      },
      {
        id: 'avis',
        question: 'Puis-je laisser un avis ?',
        reponse: {
          texte:
            'Oui, après chaque prestation. Votre avis aide les autres clients à choisir, et permet aux batch cookers de s’améliorer.',
        },
      },
    ],
  },

  {
    id: 'compte',
    titre: 'Mon compte et mes données',
    questions: [
      {
        id: 'inscription-gratuite',
        question: 'L’inscription est-elle payante ?',
        reponse: {
          texte:
            'Non. La création de votre compte est gratuite. Vous ne payez que les prestations que vous réservez.',
        },
      },
      {
        id: 'paiement-securise',
        question: 'Le paiement en ligne est-il sécurisé ?',
        reponse: {
          texte:
            'Oui. Les paiements passent par un prestataire de paiement sécurisé. Lab’s Food ne conserve jamais vos coordonnées bancaires.',
        },
      },
      {
        id: 'donnees-personnelles',
        question: 'Que faites-vous de mes données personnelles ?',
        reponse: {
          texte:
            'Elles servent uniquement à organiser vos prestations. Elles ne sont jamais vendues. Vous pouvez à tout moment demander à les consulter, les modifier ou les supprimer — notre politique de confidentialité détaille tout cela.',
        },
      },
      {
        id: 'supprimer-mon-compte',
        question: 'Comment supprimer mon compte ?',
        reponse: {
          texte:
            'Depuis les paramètres de votre espace client, ou en nous écrivant à contact@labsfood.fr.',
        },
      },
    ],
  },
]

/**
 * Les questions posées en premier, sur la page d'accueil.
 *
 * Six, pas trente : un visiteur qui découvre le service veut savoir ce que
 * c'est, ce que ça coûte vraiment et ce qu'on attend de lui. Le reste
 * l'attend sur `/faq`.
 */
export const FAQ_ACCUEIL = [
  'cest-quoi-le-batch-cooking',
  'difference-traiteur',
  'credit-dimpot',
  'qui-fait-les-courses',
  'ce-quil-faut-prevoir',
  'cuisine-propre',
]

/** Toutes les questions à plat — pratique pour en retrouver une par son id. */
export const FAQ_TOUTES: FaqQuestion[] = FAQ_SECTIONS.flatMap((s) => s.questions)

export const questionsAccueil = (): FaqQuestion[] =>
  FAQ_ACCUEIL.map((id) => FAQ_TOUTES.find((q) => q.id === id)).filter(
    (q): q is FaqQuestion => Boolean(q),
  )
