import { problemText } from '@/lib/chef/readiness'
import { reasonText } from '@/lib/reason-codes'
import { ApiError, fieldErrors, type FieldError } from './client'

/* ─────────────────────────────────────────────────────────────────────────────
   Dire un refus de l'API en français, et au bon endroit.

   Depuis le 17/10 un `400` porte `errors: [{ field, code, message }]`. Le
   `message` est anglais et destiné au développement — l'API le dit
   elle-même : « traduire à partir du `code` ». C'est ce que fait ce module.

   La règle tenue ici : **nommer le champ**. « meals.0.portions must not be
   less than 1 » ne dit rien à personne ; « les portions du 1ᵉʳ plat doivent
   valoir au moins 1 » envoie quelqu'un au bon endroit du formulaire.

   Ce qui n'est pas traduit est montré tel quel plutôt qu'avalé : un message
   obscur reste plus utile qu'un « une erreur est survenue ».
   ───────────────────────────────────────────────────────────────────────────── */

/** Les noms de champs que l'API utilise, dits comme l'écran les appelle. */
const CHAMPS: Record<string, string> = {
  name: 'le nom',
  title: 'le titre',
  description: 'la description',
  prepTime: 'le temps de préparation',
  cookTime: 'le temps de cuisson',
  portions: 'le nombre de portions',
  calories: 'les calories',
  country: 'le pays',
  continent: 'le continent',
  category: 'la catégorie',
  difficulty: 'la difficulté',
  allergens: 'les allergènes',
  diets: 'les régimes',
  ingredients: 'les ingrédients',
  reheating: 'la réchauffe',
  storage: 'la conservation',
  imageUrl: 'la photo',
  startsAt: 'la date et l’heure',
  persons: 'le nombre de personnes',
  addressLine: 'l’adresse',
  addressStreet: 'l’adresse',
  firstName: 'le prénom',
  lastName: 'le nom',
  addressCity: 'la ville',
  addressPostalCode: 'le code postal',
  notes: 'les consignes',
  meals: 'les plats',
  serviceOfferId: 'la formule',
  durationMinutes: 'la durée',
  priceCents: 'le prix',
  shoppingFeeCents: 'le forfait courses',
  phone: 'le téléphone',
  bio: 'la présentation',
  city: 'la ville',
  displayName: 'le nom affiché',
  serviceRadiusKm: 'le rayon d’intervention',
  weekly: 'les horaires',
  exceptions: 'les exceptions',
  // Une recette (Recettes §4, §5.2).
  recipe: 'la recette',
  steps: 'les étapes',
  text: 'le texte',
  qty: 'la quantité',
  unit: 'l’unité',
  aisle: 'le rayon',
  link: 'le lien',
  precision: 'la précision',
  preparation: 'la préparation',
  group: 'le groupe',
  rawText: 'le texte d’origine',
  catalogIngredientId: 'l’ingrédient de la liste commune',
  temperature: 'la température',
  minutes: 'la durée',
  container: 'le contenant',
  modes: 'les modes de réchauffage',
  method: 'le lieu de conservation',
  days: 'le nombre de jours',
  freezable: 'la réponse « congelable »',
  freezerMonths: 'les mois de congélation',
  thawing: 'la décongélation',
  prepMinutes: 'le temps de préparation',
  cookMinutes: 'le temps de cuisson',
  customDiets: 'les autres régimes',
  customAllergens: 'les autres allergènes',
  addedAllergens: 'les allergènes ajoutés',
  declaredDiets: 'les régimes déclarés',
  equipment: 'le matériel',
  personalTags: 'les étiquettes personnelles',
  profiles: 'les profils',
  seasonsOverride: 'les saisons choisies',
  lockVersion: 'la version lue',
}

/** Les champs d'une recette dont le nom seul serait ambigu (deux « contenant », deux « durée »). */
const CHEMINS: Record<string, string> = {
  'recipe.reheating.note': 'les consignes de réchauffage',
  'recipe.reheating.temperature': 'la température de réchauffage',
  'recipe.reheating.minutes': 'la durée de réchauffage',
  'recipe.reheating.container': 'le contenant de réchauffage',
  'recipe.storage.days': 'les jours de conservation',
  'recipe.storage.container': 'le contenant de conservation',
  'recipe.storage.thawing': 'la façon de décongeler',
}

/** L'élément d'une liste, au singulier : « du 3ᵉ ingrédient », « de la 2ᵉ étape ». */
const ELEMENTS: Record<string, { nom: string; feminin?: boolean }> = {
  ingredients: { nom: 'ingrédient' },
  steps: { nom: 'étape', feminin: true },
  meals: { nom: 'plat' },
  exceptions: { nom: 'exception', feminin: true },
}

/** « les ingrédients » → « des ingrédients », « la recette » → « de la recette ». */
const de = (nom: string) =>
  nom.startsWith('les ')
    ? `des ${nom.slice(4)}`
    : nom.startsWith('le ')
      ? `du ${nom.slice(3)}`
      : `de ${nom}`

/** Ce que la règle violée veut dire, sans jargon. */
const REGLES: Record<string, string> = {
  min: 'est trop petit',
  max: 'est trop grand',
  isLength: 'n’a pas la bonne longueur',
  minLength: 'est trop court',
  maxLength: 'est trop long',
  isNotEmpty: 'est obligatoire',
  isString: 'n’a pas le bon format',
  isNumber: 'doit être un nombre',
  isInt: 'doit être un nombre entier',
  isBoolean: 'doit être oui ou non',
  isUuid: 'ne désigne rien de connu',
  isUrl: 'n’est pas une adresse valide',
  isEmail: 'n’est pas une adresse email valide',
  isEnum: 'a une valeur que l’API n’accepte pas',
  isDateString: 'n’est pas une date valide',
  arrayMaxSize: 'contient trop d’éléments',
  arrayMinSize: 'n’en contient pas assez',
  arrayUnique: 'contient un doublon',
  isPositive: 'doit être au-dessus de zéro',
  isIn: 'a une valeur que l’API n’accepte pas',
  whitelistValidation: 'n’existe pas côté API',
}

/**
 * `meals.0.portions` → « le nombre de portions du 1ᵉʳ plat » ;
 * `recipe.ingredients.3.link` (ou `recipe.ingredients[3].link`) → « le lien du 4ᵉ ingrédient ».
 *
 * L'API indexe à partir de zéro ; un humain compte à partir de un.
 */
export function champLabel(field: string): string {
  const chemin = field.replace(/\[(\d+)\]/g, '.$1')
  if (CHEMINS[chemin]) return CHEMINS[chemin]
  const parts = chemin.split('.')
  const feuille = parts[parts.length - 1]
  const index = parts.findIndex((p) => /^\d+$/.test(p))
  if (index <= 0) return CHAMPS[feuille] ?? `« ${feuille} »`

  const parentKey = parts[index - 1]
  const rang = Number(parts[index]) + 1
  const element = ELEMENTS[parentKey]
  const ordinal = rang === 1 ? (element?.feminin ? '1ʳᵉ' : '1ᵉʳ') : `${rang}ᵉ`
  const parent = CHAMPS[parentKey] ?? parentKey
  // `customDiets.2` : l'élément lui-même est en cause.
  if (index === parts.length - 1) {
    return element
      ? `${element.feminin ? 'la' : 'le'} ${ordinal} ${element.nom}`
      : `le ${ordinal} élément ${de(parent)}`
  }
  const nom = CHAMPS[feuille] ?? `« ${feuille} »`
  return element
    ? `${nom} ${element.feminin ? 'de la' : 'du'} ${ordinal} ${element.nom}`
    : `${nom} du ${ordinal} élément ${de(parent)}`
}

/** Une erreur de champ, en une phrase. */
export function champMessage(e: FieldError): string {
  const regle = REGLES[e.code]
  const nom = champLabel(e.field)
  if (regle) return `${nom.charAt(0).toUpperCase()}${nom.slice(1)} ${regle}.`
  return `${nom.charAt(0).toUpperCase()}${nom.slice(1)} n’a pas été accepté : ${e.message}`
}

/**
 * Le message à montrer pour un refus de l'API.
 *
 * Un seul champ en cause : on le nomme et on dit pourquoi. Plusieurs : on les
 * liste, parce qu'un formulaire corrigé champ par champ fait autant d'allers
 * et retours qu'il reste d'erreurs.
 */
export function apiMessage(error: unknown, repli = 'L’enregistrement a été refusé.'): string {
  const champs = fieldErrors(error)
  if (champs.length === 1) return champMessage(champs[0])
  if (champs.length > 1) {
    return `${champs.length} champs n’ont pas été acceptés : ${champs
      .map((c) => champLabel(c.field))
      .join(', ')}.`
  }

  if (error instanceof ApiError) {
    if (error.status === 0) return 'L’API est injoignable. Vérifiez votre connexion.'
    if (error.status === 401) return 'Votre session a expiré. Reconnectez-vous puis réessayez.'
    if (error.status === 403) {
      return 'Cette action demande un dossier approuvé : l’API l’a refusée.'
    }
    if (error.status === 413) return 'Le fichier est trop lourd pour l’API.'
    const code = (error.body as { code?: string } | null)?.code
    if (code === 'CHEF_UNAVAILABLE') {
      return 'Ce batch cooker ne peut pas recevoir de réservation ni de paiement pour le moment.'
    }
    // Recettes §4.11 : la fiche n'est pas prête, chaque point manquant nommé.
    const refus = error.body as { code?: string; problems?: unknown } | null
    if (refus?.code === 'RECIPE_NOT_READY' && Array.isArray(refus.problems)) {
      return `La fiche n’est pas prête. Il manque : ${(
        refus.problems as { code: string; field: string }[]
      )
        .map(problemText)
        .join(', ')}.`
    }
    const raison = reasonText(error.body)
    if (raison) return raison
    return error.message || repli
  }
  return error instanceof Error ? error.message : repli
}
