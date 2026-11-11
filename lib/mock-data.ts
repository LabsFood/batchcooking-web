import type { Meal, Recipe, Chef, Plan, Testimonial, FAQItem } from '@/types'

// ─── Plans / Formules ─────────────────────────────────────────────────────────

export const PLANS: Plan[] = [
  {
    id: 'essentiel',
    name: 'Essentiel',
    price: 150,
    priceAfterTax: 75,
    duration: '2h minimum',
    meals: 5,
    persons: '2–3 personnes',
    description: 'Parfait pour débuter avec le batch cooking',
    features: [
      '5 plats variés',
      'Chef professionnel à domicile',
      'Liste de courses automatique',
      'Fiches recettes incluses',
      'Crédit d\'impôt 50%',
    ],
  },
  {
    id: 'confort',
    name: 'Confort',
    price: 220,
    priceAfterTax: 110,
    duration: '3h minimum',
    meals: 7,
    persons: '3–4 personnes',
    description: 'La formule idéale pour toute la famille',
    popular: true,
    features: [
      '7 plats variés',
      'Chef professionnel à domicile',
      'Liste de courses automatique',
      'Fiches recettes incluses',
      'Crédit d\'impôt 50%',
      'Personnalisation du menu',
      'Support prioritaire',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 320,
    priceAfterTax: 160,
    duration: '4h minimum',
    meals: 10,
    persons: '4–6 personnes',
    description: 'L\'expérience culinaire complète',
    features: [
      '10 plats variés',
      'Chef professionnel à domicile',
      'Liste de courses automatique',
      'Fiches recettes incluses',
      'Crédit d\'impôt 50%',
      'Menu 100% personnalisé',
      'Accompagnement nutritionnel',
      'Commande courses partenaires',
      'Support dédié 7j/7',
    ],
  },
]

// ─── Weekly Meals ─────────────────────────────────────────────────────────────

export const WEEKLY_MEALS: Meal[] = [
  {
    id: '1',
    name: 'Poulet rôti aux herbes de Provence',
    description: 'Cuisse et blanc de poulet fermier, thym, romarin, ail confit, pommes de terre fondantes',
    image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600&auto=format&fit=crop',
    portions: '4 portions',
    prepTime: 90,
    dietaryTags: ['sans-gluten'],
    allergens: [],
    calories: 420,
    isFeatured: true,
  },
  {
    id: '2',
    name: 'Risotto crémeux aux champignons',
    description: 'Arborio, shiitake & champignons de Paris, parmesan AOP, truffe noire',
    image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&auto=format&fit=crop',
    portions: '3 portions',
    prepTime: 45,
    dietaryTags: ['végétarien', 'sans-gluten'],
    allergens: ['lait'],
    calories: 380,
    isFeatured: true,
  },
  {
    id: '3',
    name: 'Curry de lentilles corail',
    description: 'Lentilles corail, lait de coco, épices, gingembre frais, coriandre',
    image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&auto=format&fit=crop',
    portions: '4 portions',
    prepTime: 35,
    dietaryTags: ['vegan', 'sans-gluten', 'halal'],
    allergens: [],
    calories: 340,
  },
  {
    id: '4',
    name: 'Saumon en papillote, légumes du jardin',
    description: 'Pavé de saumon Atlantique, courgettes, tomates cerise, citron, aneth',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&auto=format&fit=crop',
    portions: '2 portions',
    prepTime: 25,
    dietaryTags: ['sans-gluten', 'sans-lactose'],
    allergens: ['poisson'],
    calories: 360,
  },
  {
    id: '5',
    name: 'Bœuf bourguignon traditionnel',
    description: 'Joue de bœuf braisée 6h, carottes, champignons, lardons, sauce au vin rouge',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop',
    portions: '4 portions',
    prepTime: 360,
    dietaryTags: ['sans-gluten'],
    allergens: ['sulfites'],
    calories: 510,
    isFeatured: true,
  },
  {
    id: '6',
    name: 'Gratin de légumes Méditerranée',
    description: 'Aubergine, poivrons tricolores, courgettes, mozzarella, sauce tomate maison',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop',
    portions: '4 portions',
    prepTime: 55,
    dietaryTags: ['végétarien', 'sans-gluten'],
    allergens: ['lait'],
    calories: 290,
  },
  {
    id: '7',
    name: 'Tajine d\'agneau aux fruits secs',
    description: 'Épaule d\'agneau confite, pruneaux, abricots, amandes, ras-el-hanout, couscous',
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&auto=format&fit=crop',
    portions: '4 portions',
    prepTime: 180,
    dietaryTags: ['halal', 'sans-lactose'],
    allergens: ['fruits à coque', 'gluten'],
    calories: 480,
  },
]

// ─── World Recipes ─────────────────────────────────────────────────────────────

export const WORLD_RECIPES: Recipe[] = [
  {
    id: 'r1',
    name: 'Pho Bo Vietnamien',
    description: 'Bouillon de bœuf mijoté 12h, pho, herbes fraîches, citron vert',
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&auto=format&fit=crop',
    portions: '4 portions',
    prepTime: 720,
    continent: 'Asie',
    country: 'Vietnam',
    dietaryTags: ['sans-lactose', 'halal'],
    allergens: ['gluten', 'soja'],
    difficulty: 'Difficile',
    ingredients: [],
    steps: [],
    calories: 350,
  },
  {
    id: 'r2',
    name: 'Mafé Sénégalais',
    description: 'Ragoût d\'arachide, bœuf ou poulet, légumes, piment',
    image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop',
    portions: '6 portions',
    prepTime: 120,
    continent: 'Afrique',
    country: 'Sénégal',
    dietaryTags: ['halal', 'sans-gluten'],
    allergens: ['arachides'],
    difficulty: 'Moyen',
    ingredients: [],
    steps: [],
    calories: 440,
  },
  {
    id: 'r3',
    name: 'Shakshuka Tunisienne',
    description: 'Œufs pochés dans une sauce tomate épicée, poivrons, cumin, paprika',
    image: 'https://images.unsplash.com/photo-1590412200988-a436970781fa?w=600&auto=format&fit=crop',
    portions: '3 portions',
    prepTime: 30,
    continent: 'Moyen-Orient',
    country: 'Tunisie',
    dietaryTags: ['végétarien', 'sans-gluten', 'halal'],
    allergens: ['œufs'],
    difficulty: 'Facile',
    ingredients: [],
    steps: [],
    calories: 280,
  },
  {
    id: 'r4',
    name: 'Ceviche Péruvien',
    description: 'Cabillaud mariné au citron vert, oignons rouges, coriandre, ají amarillo',
    image: 'https://images.unsplash.com/photo-1535400255456-984b2d9a91d2?w=600&auto=format&fit=crop',
    portions: '2 portions',
    prepTime: 20,
    continent: 'Amériques',
    country: 'Pérou',
    dietaryTags: ['sans-gluten', 'sans-lactose'],
    allergens: ['poisson'],
    difficulty: 'Facile',
    ingredients: [],
    steps: [],
    calories: 190,
  },
  {
    id: 'r5',
    name: 'Coq au Vin Bourguignon',
    description: 'Poulet fermier braisé au Pinot Noir, lardons, champignons, oignons grelots',
    image: 'https://images.unsplash.com/photo-1448043552756-e747b7a2b2b8?w=600&auto=format&fit=crop',
    portions: '4 portions',
    prepTime: 150,
    continent: 'Europe',
    country: 'France',
    dietaryTags: ['sans-gluten'],
    allergens: ['sulfites'],
    difficulty: 'Moyen',
    ingredients: [],
    steps: [],
    calories: 490,
  },
  {
    id: 'r6',
    name: 'Dhal de Lentilles Indiennes',
    description: 'Lentilles beluga, curcuma, cumin, tomates, ghee, chapati maison',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop',
    portions: '4 portions',
    prepTime: 60,
    continent: 'Asie',
    country: 'Inde',
    dietaryTags: ['végétarien', 'vegan', 'halal'],
    allergens: ['gluten'],
    difficulty: 'Facile',
    ingredients: [],
    steps: [],
    calories: 310,
  },
  {
    id: 'r7',
    name: 'Tagine Marocain Végétarien',
    description: 'Potimarron, pois chiches, raisins secs, épices ras-el-hanout, coriandre',
    image: 'https://images.unsplash.com/photo-1509200050770-c6f066a94c11?w=600&auto=format&fit=crop',
    portions: '4 portions',
    prepTime: 75,
    continent: 'Afrique',
    country: 'Maroc',
    dietaryTags: ['vegan', 'sans-gluten', 'halal'],
    allergens: [],
    difficulty: 'Facile',
    ingredients: [],
    steps: [],
    calories: 320,
  },
  {
    id: 'r8',
    name: 'Bibimbap Coréen',
    description: 'Riz, légumes sautés, œuf, sauce gochujang, bœuf émincé',
    image: 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=600&auto=format&fit=crop',
    portions: '2 portions',
    prepTime: 45,
    continent: 'Asie',
    country: 'Corée du Sud',
    dietaryTags: ['sans-lactose'],
    allergens: ['soja', 'œufs', 'gluten'],
    difficulty: 'Moyen',
    ingredients: [],
    steps: [],
    calories: 420,
  },
]

// ─── Chefs ────────────────────────────────────────────────────────────────────

export const CHEFS: Chef[] = [
  {
    id: 'c1',
    name: 'Ivy Siyaptze',
    avatar: '/images/IvyChef.png',
    specialty: 'Cuisine française & cuisines du monde',
    region: 'Provence-Alpes-Côte d\'Azur',
    city: 'Côte d\'Azur',
    bio: 'Fondatrice de Lab\'s Food, Ivy est ingénieure de formation devenue cheffe à domicile. Inspirée par 22 pays explorés, elle puise dans les cuisines du monde entier pour proposer des menus authentiques, savoureux et infiniment variés.',
    rating: 4.9,
    reviewCount: 28,
    sessionsDone: 30,
    pricePerSession: 150,
    available: true,
    badges: ['Fondatrice', 'Cuisine du monde', '22 pays explorés'],
    specialties: ['Cuisine française', 'Cuisines du monde', 'Batch cooking'],
  },
]

// ─── Testimonials ─────────────────────────────────────────────────────────────

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    clientName: 'Ted',
    clientCity: 'Côte d\'Azur',
    rating: 5,
    text:
      'Expérience appétissante avec Lab\'s Food. En tant qu\'inculte de la cuisine, j\'ai commandé trois plats pour découvrir : fondue de poireaux riz et saumon, bœuf aux oignons, poulet basquaise et plantain vapeur. Le programme prévu a bien été respecté, le rendu était clean et bien organisé. Une semaine avec de la bouffe à la maison validée, de quoi souffler des McDo ! Service au top, cheffe de bonne humeur, à recommander.',
    date: '2026',
    planUsed: 'essentiel',
    verified: true,
  },
  {
    id: 't2',
    clientName: 'Ghislain & Raissa B.',
    clientCity: 'Côte d\'Azur',
    rating: 5,
    text:
      'Nous avons fait appel à Lab\'s Food après la naissance de notre fille pour nous faire du batch cooking et tout s\'est parfaitement bien déroulé. Les plats choisis ont été respectés à la lettre. En bonus, nous avons eu droit à un cleaning complet de la cuisine. Nous vous le recommandons vivement.',
    date: '2026',
    planUsed: 'confort',
    verified: true,
  },
  {
    id: 't3',
    clientName: 'Joe W.',
    clientCity: 'Côte d\'Azur',
    rating: 5,
    text:
      'J\'ai fait appel à Lab\'s Food car j\'étais débordée avec les enfants (maman solo de 3). J\'ai pu manger pendant 3 jours sans me poser la question de savoir « qu\'est-ce que je cuisine aujourd\'hui ? ». Ce fut une belle expérience que j\'ai renouvelée et que je recommande à 10 000 %.',
    date: '2026',
    planUsed: 'essentiel',
    verified: true,
  },
]

// ─── FAQ ──────────────────────────────────────────────────────────────────────

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
      'À ce jour, Lab’s Food déploie ses services sur l’ensemble de la Côte d’Azur. Les cuisinier·es se déplacent directement à votre domicile au sein de cette zone géographique.',
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
]
