'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Download,
  Image as ImageIcon,
  Info,
  Loader2,
  Plus,
  RotateCw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { Hint } from '@/components/shared/Hint'
import { InfoPopover } from '@/components/shared/InfoPopover'
import { useToast } from '@/components/shared/Toaster'
import { COUNTRIES } from '@/lib/chef/countries'
import { fieldTarget, focusField, problemText } from '@/lib/chef/readiness'
import {
  DECLARED_DIETS,
  refLabel,
  useAisles,
  useAllergens,
  useComputedDiets,
  useDiets,
  useDishCategories,
  useRecipeProfiles,
  useReheatModes,
  useStepTypes,
  useUnits,
} from '@/lib/api/referentials'
import { apiMessage, champMessage } from '@/lib/api/messages'
import { ApiError, fieldErrors } from '@/lib/api/client'
import { reasonText } from '@/lib/reason-codes'
import IngredientCreateDialog, { type LinkedIngredient } from './IngredientCreateDialog'
import RecipeHistory from './RecipeHistory'
import {
  DISH_LIMITS,
  FREEZER_MONTHS,
  FREE_LIST_LIMITS,
  INGREDIENT_MAX,
  LINK_INVALID_TEXT,
  THAWING_MAX,
  QTY_MAX,
  TO_TASTE,
  MONTHS,
  REGULATED_ALLERGENS,
  REHEAT_MODES,
  STORAGE_METHODS,
  cleanIngredients,
  cleanReheating,
  cleanSteps,
  cleanStorage,
  displayQuantity,
  freezerMonthsValid,
  ingredientReady,
  ingredientStarted,
  intIn,
  aisleLabel,
  isRegulatedAllergen,
  lineComplete,
  linkValid,
  mergeSavedRows,
  mergeSavedSteps,
  newIngredientRow,
  newStepRow,
  qtyValid,
  reheatModesOf,
  sameJson,
  scaledQty,
  seasonsLine,
  sentIndexes,
  sentStepIndexes,
  shownGroups,
  shownRows,
  toRow,
  toStepRow,
  type IngredientRow,
  type StepRow,
} from '@/lib/recipe-fields'
import {
  DIFFICULTY_LABEL,
  checkPhoto,
  photoMessage,
  useConfirmAllergens,
  useDeleteDishPhoto,
  useDishPhoto,
  useIngredientSearch,
  useRecipePdf,
  type Dish,
  type DishInput,
  type Problem,
  type Difficulty,
  type Ingredient,
} from '@/lib/api/chef-catalog'

/* ─────────────────────────────────────────────────────────────────────────────
   Écriture d'un plat.

   Quatre règles viennent de l'API et tiennent tout le formulaire :

   - les régimes et les allergènes se prennent dans les référentiels ; ce qui
     n'y est pas va dans les listes libres, pas dans un champ texte perdu ;
   - « aucun allergène » est une déclaration, pas une absence de saisie, et ne
     se combine avec aucun allergène coché. C'est ce qui permet de distinguer
     « vérifié, il n'y en a pas » de « pas encore rempli » ;
   - une ligne d'ingrédient exige ses quatre champs (nom, quantité, unité,
     rayon) et la conservation exige ses deux valeurs. Incomplètes, elles font
     refuser **tout le plat** : l'écran les écarte et le dit, au lieu de laisser
     tomber un 422 sur un formulaire rempli ;
   - la photo s'envoie en trois temps et a besoin de l'identifiant du plat.
     À la création il n'y en a pas encore : on le dit, et le champ s'ouvre
     dès le premier enregistrement.

   Module Recettes, lot 2 : la fiche est « Prête » quand l'API ne trouve plus
   rien à redire (§4.11). Tant qu'elle ne l'est pas, le brouillon s'enregistre
   tout seul ; une fois Prête, chaque enregistrement crée une version (R6), donc
   il ne se fait plus qu'au bouton.

   Seuls le nom et le temps de préparation sont exigés pour enregistrer un
   brouillon : on n'oblige personne à tout écrire d'un trait.
   ───────────────────────────────────────────────────────────────────────────── */

type Draft = DishInput & {
  ingredients: IngredientRow[]
  steps: StepRow[]
  equipment: string[]
  declaredDiets: string[]
  profiles: string[]
  personalTags: string[]
  seasonsOverride: number[]
  reheatModes: string[]
  reheatTemperature: string
  reheatMinutes: string
  reheatNote: string
  reheatContainer: string
  storageMethod: string
  storageDays: string
  storageContainer: string
  /** Oui, non, ou rien de choisi : une fiche ancienne ne dit rien, et ce n'est pas « non ». */
  storageFreezable: '' | 'yes' | 'no'
  storageMonths: string
  storageThawing: string
}

/** Les groupes de lignes d'un `422 DUPLICATE_INGREDIENT_LINE`, ou null pour toute autre erreur. */
function duplicateLines(error: unknown): number[][] | null {
  if (!(error instanceof ApiError) || error.status !== 422) return null
  const body = error.body as { code?: string; lines?: unknown } | null
  if (body?.code !== 'DUPLICATE_INGREDIENT_LINE' || !Array.isArray(body.lines)) return null
  return body.lines.filter(Array.isArray).map((g: unknown[]) => g.filter((n): n is number => typeof n === 'number'))
}

/** Le code d'un refus de l'API (`409 RECIPE_CONFLICT`, `422 INGREDIENT_NOT_LINKED`…), ou null. */
function apiCode(error: unknown, status: number): string | null {
  if (!(error instanceof ApiError) || error.status !== status) return null
  const code = (error.body as { code?: unknown } | null)?.code
  return typeof code === 'string' ? code : null
}

/** Session expirée (401) : se reconnecter, puis renvoyer. Corriger la saisie n'y changerait rien. */
const isSessionLost = (error: unknown) => error instanceof ApiError && error.status === 401

/**
 * Accès refusé (403) : un batch cooker pas encore vérifié, ou suspendu. Ce n'est
 * pas une session (R34) : se reconnecter n'y changerait rien non plus.
 */
const isForbidden = (error: unknown) => error instanceof ApiError && error.status === 403

/** La fiche a changé ailleurs depuis qu'on l'a lue : rien n'a été écrit. */
const isConflict = (error: unknown) => apiCode(error, 409) === 'RECIPE_CONFLICT'

/**
 * Un échec qui peut passer tout seul : réseau coupé, délai dépassé, serveur en
 * panne (5xx), trop de requêtes. L'enregistrement automatique réessaie. Tout
 * autre 4xx est un refus : le même envoi serait refusé de nouveau.
 */
const isTransient = (error: unknown) =>
  !(error instanceof ApiError) ||
  error.status === 0 ||
  error.status >= 500 ||
  error.status === 408 ||
  error.status === 429

/** Les délais entre deux essais après un échec passager : 2,5 s, 10 s, puis 30 s au plus. */
const RETRY_DELAYS = [2500, 10_000, 30_000]
const AUTOSAVE_DELAY = 2500

/** Les rangs (lignes enregistrées) d'un `422 INGREDIENT_NOT_LINKED`, ou null pour toute autre erreur. */
function notLinkedLines(error: unknown): number[] | null {
  if (apiCode(error, 422) !== 'INGREDIENT_NOT_LINKED') return null
  const lines = (error as ApiError).body as { lines?: unknown }
  return Array.isArray(lines.lines) ? lines.lines.filter((n): n is number => typeof n === 'number') : []
}

/** Sans casse, sans accents ni ligature : « oeufs » est « Œufs ». */
const normalise = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\u0153/g, 'oe')
    .replace(/\u00e6/g, 'ae')

/** Les listes libres du brouillon, avec l'id de leur champ et leur nom dans un message. */
const FREE_LISTS = [
  ['customDiets', 'dish-custom-diets', 'Les autres régimes'],
  ['customAllergens', 'dish-custom-allergens', 'Les autres allergènes'],
  ['equipment', 'dish-equipment', 'Le matériel'],
  ['personalTags', 'dish-tags', 'Les étiquettes personnelles'],
] as const

/**
 * Ce que l'API refuserait (400 ou 422 sur **tout** le plat), champ par champ :
 * l'id du champ à l'écran, et le message à lire dessous. Ce sont les bornes de
 * `dish.dto.ts` et de `RECIPE_LIMITS`. Tant qu'il en reste, rien ne part :
 * l'envoi ferait refuser le plat entier, et toutes les autres saisies avec.
 *
 * Une valeur manquante n'est pas ici : c'est un brouillon, et « Prête » la
 * réclame. Une ligne incomplète non plus : elle ne part pas, et le formulaire
 * le dit à part.
 */
function fieldProblems(d: Draft): Record<string, string> {
  const out: Record<string, string> = {}
  const tooLong = (id: string, value: string | null | undefined, max: number, what: string) => {
    if ((value ?? '').trim().length > max) out[id] = `${what} tient en ${max} caractères au plus.`
  }
  const wholeIn = (id: string, value: string, min: number, max: number, what: string) => {
    if (value.trim() && !intIn(value, min, max)) out[id] = `${what} : un nombre entier de ${min} à ${max}.`
  }

  tooLong('dish-name', d.name, DISH_LIMITS.name, 'Le nom')
  tooLong('dish-description', d.description, DISH_LIMITS.description, 'La description')
  wholeIn(
    'dish-portions',
    String(d.portions ?? ''),
    DISH_LIMITS.portions.min,
    DISH_LIMITS.portions.max,
    'Les portions',
  )
  wholeIn('dish-prep', String(d.prepMinutes), 0, DISH_LIMITS.minutes, 'Le temps de préparation (en minutes)')
  if (d.cookMinutes != null) {
    wholeIn('dish-cook', String(d.cookMinutes), 0, DISH_LIMITS.minutes, 'Le temps de cuisson (en minutes)')
  }

  for (const [key, id, what] of FREE_LISTS) {
    const { items, length } = FREE_LIST_LIMITS[key]
    const list = d[key] ?? []
    const long = list.find((v) => v.trim().length > length)
    if (list.length > items) out[id] = `${what} : ${items} au plus. Retirez-en ${list.length - items}.`
    else if (long) out[id] = `« ${long} » est trop long : ${length} caractères au plus.`
  }
  if (d.profiles.length > DISH_LIMITS.profiles) {
    out['dish-profiles'] = `${DISH_LIMITS.profiles} profils au plus.`
  }

  d.ingredients.forEach((row, i) => {
    if (!linkValid(row.link)) out[`ingredient-${i}-link`] = LINK_INVALID_TEXT
    tooLong(`ingredient-${i}-name`, row.name, INGREDIENT_MAX.name, 'Le nom de l’ingrédient')
    tooLong(`ingredient-${i}-precision`, row.precision, INGREDIENT_MAX.precision, 'La précision')
    tooLong(`ingredient-${i}-preparation`, row.preparation, INGREDIENT_MAX.preparation, 'La préparation')
    tooLong(`ingredient-${i}-group`, row.group, INGREDIENT_MAX.group, 'Le groupe')
  })
  if (sentIndexes(d.ingredients).length > DISH_LIMITS.ingredients) {
    out.ingredients = `${DISH_LIMITS.ingredients} ingrédients au plus par recette.`
  }

  d.steps.forEach((s, i) => {
    tooLong(`step-${i}-text`, s.text, DISH_LIMITS.stepText, 'Une étape')
    wholeIn(`step-${i}-minutes`, s.minutes, 0, DISH_LIMITS.minutes, 'La durée (en minutes)')
  })
  if (sentStepIndexes(d.steps).length > DISH_LIMITS.steps) {
    out.steps = `${DISH_LIMITS.steps} étapes au plus par recette.`
  }

  wholeIn('reheat-temperature', d.reheatTemperature, 0, DISH_LIMITS.reheatTemperature, 'La température')
  wholeIn('reheat-minutes', d.reheatMinutes, 0, DISH_LIMITS.reheatMinutes, 'La durée (en minutes)')
  tooLong('reheat-container', d.reheatContainer, DISH_LIMITS.container, 'Le contenant')
  tooLong('reheat-note', d.reheatNote, DISH_LIMITS.reheatNote, 'Le texte des consignes')

  wholeIn('storage-days', d.storageDays, 0, DISH_LIMITS.storageDays, 'Les jours de conservation')
  tooLong('storage-container', d.storageContainer, DISH_LIMITS.container, 'Le contenant')
  if (d.storageFreezable === 'yes') {
    if (d.storageMonths.trim() && !freezerMonthsValid(d.storageMonths)) {
      out['storage-months'] = `Les mois de congélation : un nombre entier de ${FREEZER_MONTHS.min} à ${FREEZER_MONTHS.max}.`
    }
    tooLong('storage-thawing', d.storageThawing, THAWING_MAX, 'La décongélation')
  }
  return out
}

/**
 * Un refus de l'API (400 par champ, 422), avec l'envoi refusé : ce qui est parti
 * (`json`) et les clés des lignes et des étapes parties, dans l'ordre de l'API.
 * Ses messages ne s'affichent que tant que l'écran n'a pas changé depuis : une
 * frappe les rend caducs, et les clés ramènent un rang de l'API à sa ligne même
 * si une autre a été retirée entre-temps.
 */
interface Refusal {
  error: unknown
  json: string
  rowKeys: string[]
  stepKeys: string[]
}

/** Les clés des lignes et des étapes que l'envoi de ce brouillon porte, dans l'ordre de l'API. */
const sentKeys = (d: Draft) => ({
  rowKeys: sentIndexes(d.ingredients).map((k) => d.ingredients[k].key),
  stepKeys: sentStepIndexes(d.steps).map((k) => d.steps[k].key),
})

/** Les rangs affichés, par rang de l'API ; un trou pour une ligne retirée depuis. */
function shownByKey(keys: string[], list: { key: string }[]): number[] {
  const out: number[] = []
  keys.forEach((key, k) => {
    const i = list.findIndex((x) => x.key === key)
    if (i >= 0) out[k] = i
  })
  return out
}

/**
 * Les messages d'un refus, rangés sous l'id du champ à l'écran (`fieldTarget`).
 * Un champ sans place à l'écran garde son message dans l'en-tête (`apiMessage`).
 */
function refusedFields(r: Refusal, d: Draft): Record<string, string> {
  const opts = { rows: shownByKey(r.rowKeys, d.ingredients), stepRows: shownByKey(r.stepKeys, d.steps) }
  const out: Record<string, string> = {}
  for (const fe of fieldErrors(r.error)) {
    const id = fieldTarget(fe.field, opts)
    if (id && !out[id]) out[id] = champMessage(fe)
  }
  const body = r.error instanceof ApiError ? (r.error.body as { code?: unknown; limit?: unknown } | null) : null
  if (body?.code === 'LIMIT_REACHED') {
    out[body.limit === 'ingredients' ? 'ingredients' : 'steps'] = reasonText(body) ?? apiMessage(r.error)
  }
  return out
}

/**
 * Les allergènes que le brouillon envoie comme « ajoutés » : ceux que le chef a
 * ajoutés, plus tout code de `allergens` que les ingrédients n'expliquent pas
 * (déclaré à la main avant le calcul). Sans cela, ce code serait caché puis
 * effacé par le deuxième enregistrement. Comme l'API (`legacyDeclaredAllergens`),
 * une saisie libre n'explique rien.
 *
 * Seuls les quatorze partent, dans l'ordre de l'annexe : l'API refuse tout autre
 * code (400). Un code ancien reste affiché, en lecture seule, et l'API le garde
 * à chaque enregistrement (R22).
 */
function seedAdded(dish: Dish | null): string[] {
  if (!dish) return []
  const explained = new Set(Object.keys(dish.allergenSources ?? {}))
  const seeded = new Set([
    ...(dish.addedAllergens ?? []),
    ...(dish.allergens ?? []).filter((c) => !explained.has(c)),
  ])
  return REGULATED_ALLERGENS.map((a) => a.code).filter((c) => seeded.has(c))
}

/** Les codes hors des quatorze qu'un plat porte encore : affichés, jamais envoyés. */
const legacyCodes = (dish: Dish | null): string[] =>
  [...new Set([...(dish?.allergens ?? []), ...(dish?.addedAllergens ?? [])])].filter(
    (c) => !isRegulatedAllergen(c),
  )

function toDraft(dish: Dish | null): Draft {
  const reheating = dish?.recipe?.reheating
  return {
    name: dish?.name ?? '',
    description: dish?.description ?? '',
    country: dish?.country ?? '',
    category: dish?.category ?? 'main',
    portions: dish?.portions ?? 4,
    prepMinutes: dish?.prepMinutes ?? 20,
    cookMinutes: dish?.cookMinutes ?? null,
    difficulty: dish?.difficulty ?? 'easy',
    diets: dish?.diets ?? [],
    customDiets: dish?.customDiets ?? [],
    addedAllergens: seedAdded(dish),
    customAllergens: dish?.customAllergens ?? [],
    equipment: dish?.equipment ?? [],
    declaredDiets: dish?.declaredDiets ?? [],
    profiles: dish?.profiles ?? [],
    personalTags: dish?.personalTags ?? [],
    seasonsOverride: dish?.classification?.seasonsOverride ?? [],
    ingredients: (dish?.recipe?.ingredients ?? []).map(toRow),
    steps: (dish?.recipe?.steps ?? []).map(toStepRow),
    reheatModes: reheatModesOf(reheating),
    reheatTemperature: reheating?.temperature?.toString() ?? '',
    reheatMinutes: reheating?.minutes?.toString() ?? '',
    reheatNote: reheating?.note ?? '',
    reheatContainer: reheating?.container ?? '',
    storageMethod: dish?.recipe?.storage?.method ?? '',
    storageDays: dish?.recipe?.storage?.days?.toString() ?? '',
    storageContainer: dish?.recipe?.storage?.container ?? '',
    storageFreezable:
      dish?.recipe?.storage?.freezable === undefined
        ? ''
        : dish.recipe.storage.freezable
          ? 'yes'
          : 'no',
    storageMonths: dish?.recipe?.storage?.freezerMonths?.toString() ?? '',
    storageThawing: dish?.recipe?.storage?.thawing ?? '',
  }
}

/**
 * Ce que la fiche enregistrée porte déjà de sa recette : des lignes ou des
 * étapes (`lines`), seulement un réchauffage ou une conservation (`aftercare`),
 * ou rien (`none`).
 */
type StoredRecipe = 'lines' | 'aftercare' | 'none'

/** Le réchauffage et la conservation du brouillon, tels qu'ils partent (null : rien à envoyer). */
function aftercareOf(d: Draft) {
  return {
    reheating: cleanReheating({
      modes: d.reheatModes,
      temperature: d.reheatTemperature,
      minutes: d.reheatMinutes,
      note: d.reheatNote,
      container: d.reheatContainer,
    }),
    storage: cleanStorage({
      method: d.storageMethod,
      days: d.storageDays,
      container: d.storageContainer,
      freezable: d.storageFreezable,
      freezerMonths: d.storageMonths,
      thawing: d.storageThawing,
    }),
  }
}

/**
 * Ce que la fiche enregistrée porte de sa recette. Le réchauffage et la
 * conservation comptent tels que le formulaire les relit : un reste ancien
 * qu'il n'enverrait pas (des consignes sans mode) ne déclenche rien, et
 * n'est donc jamais effacé sans que le chef y touche.
 */
function storedRecipe(dish: Dish | null): StoredRecipe {
  if (!dish?.recipe) return 'none'
  if (dish.recipe.ingredients.length > 0 || dish.recipe.steps.length > 0) return 'lines'
  const care = aftercareOf(toDraft(dish))
  return care.reheating || care.storage ? 'aftercare' : 'none'
}

/**
 * Ce que l'API reçoit. `had` : ce que la fiche enregistrée porte déjà.
 *
 * - Des lignes ou des étapes, toutes vidées par le chef (R24) : on envoie une
 *   recette vide, et non `null`. `null` veut dire « ne touchez pas à la
 *   recette », et les anciennes lignes resteraient. Une ligne en cours de
 *   saisie, pas encore prête, n'est pas un vidage : on n'efface pas une recette
 *   sur une saisie à moitié faite.
 * - Aucune ligne enregistrée : une recette vide n'efface rien. Le réchauffage et
 *   la conservation partent donc seuls, dès qu'ils disent quelque chose (ou pour
 *   s'effacer, s'ils étaient enregistrés). Sans cela, écrits avant le premier
 *   ingrédient, ils ne partaient jamais, et la fiche se disait enregistrée.
 * - Un plat neuf, sans rien de tout cela : `null`.
 */
function toPayload(d: Draft, had: StoredRecipe = 'none'): DishInput {
  const ingredients = cleanIngredients(d.ingredients)
  const steps = cleanSteps(d.steps)
  const { reheating, storage } = aftercareOf(d)
  const hasRecipe = ingredients.length > 0 || steps.length > 0
  const emptied =
    had === 'lines' &&
    !hasRecipe &&
    !d.ingredients.some(ingredientStarted) &&
    d.steps.every((s) => !s.text.trim())
  const aftercareOnly =
    had !== 'lines' &&
    !hasRecipe &&
    (reheating !== null || storage !== null || had === 'aftercare')

  return {
    name: d.name.trim(),
    description: d.description?.trim() || null,
    country: d.country || null,
    category: d.category || null,
    portions: d.portions,
    prepMinutes: d.prepMinutes,
    cookMinutes: d.cookMinutes ?? null,
    difficulty: d.difficulty ?? null,
    diets: d.diets,
    customDiets: d.customDiets,
    // Jamais `allergens` ni `allergensNone` : l'API les calcule et refuse (400) de les recevoir.
    // Ni un code hors des quatorze : refusé lui aussi, et l'API le garde de son côté (R22).
    addedAllergens: (d.addedAllergens ?? []).filter(isRegulatedAllergen),
    customAllergens: d.customAllergens ?? [],
    equipment: d.equipment,
    declaredDiets: d.declaredDiets,
    profiles: d.profiles,
    personalTags: d.personalTags,
    seasonsOverride: d.seasonsOverride,
    recipe: hasRecipe || emptied || aftercareOnly ? { ingredients, steps, reheating, storage } : null,
  }
}

/** Les champs du brouillon qui partent tels quels, sous leur propre nom. */
const PLAIN_KEYS = [
  'name',
  'description',
  'country',
  'category',
  'portions',
  'prepMinutes',
  'cookMinutes',
  'difficulty',
  'diets',
  'customDiets',
  'addedAllergens',
  'customAllergens',
  'equipment',
  'declaredDiets',
  'profiles',
  'personalTags',
  'seasonsOverride',
] as const satisfies readonly (keyof DishInput & keyof Draft)[]

/**
 * Ce qu'un enregistrement réussi change au brouillon (R23) : uniquement ce que
 * l'API a normalisé. Le brouillon n'est jamais remplacé par la réponse.
 *
 * - `current` est le brouillon à l'écran, `sent` celui qui est parti, `res` la
 *   fiche que l'API a enregistrée.
 * - Par clé de ce qui s'envoie : la valeur de l'API n'est prise que si elle
 *   diffère de ce qu'on a envoyé, et sur un champ que le chef n'a pas touché
 *   depuis l'envoi. Une chaîne rendue sans ses blancs (« Poulet » pour
 *   « Poulet ») garde donc sa saisie.
 * - Les lignes et les étapes sont appariées par leur clé (`mergeSavedRows`,
 *   `mergeSavedSteps`) ; celles qui ne sont pas parties restent où elles sont.
 * - Ce qui n'est pas parti (réchauffage sans mode, conservation sans lieu ni
 *   jours, choix « Congelable », lien invalide) n'a pas de valeur côté API à
 *   comparer : la saisie reste.
 *
 * Sans modification entre l'envoi et la réponse, `toPayload` du résultat égale
 * celui de la fiche enregistrée : l'enregistrement automatique ne repart pas.
 */
function mergeSaved(current: Draft, sent: Draft, res: Dish, hadSent: StoredRecipe): Draft {
  const back = toDraft(res)
  const sentP = toPayload(sent, hadSent)
  // Une recette vidée (ou sans ligne) revient sans ligne : on la lit quand même, pour reprendre réchauffage et conservation.
  const backP = toPayload(back, 'lines')
  const next: Draft = { ...current }
  const take = <K extends keyof Draft>(k: K, sentValue: unknown, savedValue: unknown) => {
    if (!sameJson(sentValue, savedValue) && sameJson(current[k], sent[k])) next[k] = back[k]
  }

  for (const k of PLAIN_KEYS) take(k, sentP[k], backP[k])

  // Sans recette envoyée (ni ligne, ni étape, ni réchauffage, ni conservation), l'API n'y a pas touché : rien à reprendre.
  const sentRecipe = sentP.recipe
  const savedRecipe = backP.recipe
  if (sentRecipe && savedRecipe) {
    next.ingredients = mergeSavedRows(
      current.ingredients,
      sent.ingredients,
      res.recipe?.ingredients ?? [],
    )
    next.steps = mergeSavedSteps(current.steps, sent.steps, res.recipe?.steps ?? [])

    const rs = sentRecipe.reheating ?? null
    const rb = savedRecipe.reheating ?? null
    take('reheatModes', rs?.modes, rb?.modes)
    take('reheatTemperature', rs?.temperature, rb?.temperature)
    take('reheatMinutes', rs?.minutes, rb?.minutes)
    take('reheatNote', rs?.note, rb?.note)
    take('reheatContainer', rs?.container, rb?.container)

    const ss = sentRecipe.storage ?? null
    const sb = savedRecipe.storage ?? null
    take('storageMethod', ss?.method, sb?.method)
    take('storageDays', ss?.days, sb?.days)
    take('storageContainer', ss?.container, sb?.container)
    take('storageFreezable', ss?.freezable, sb?.freezable)
    take('storageMonths', ss?.freezerMonths, sb?.freezerMonths)
    take('storageThawing', ss?.thawing, sb?.thawing)
  }
  return next
}

/** Le plat neuf tel qu'il s'ouvre : ce qui en diffère est une saisie à ne pas perdre. */
const EMPTY_DISH_JSON = JSON.stringify(toPayload(toDraft(null)))

/** « a, b et c ». */
const enumeration = (items: string[]) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`

/** « 14:32 », l'heure du dernier enregistrement automatique. */
const heure = (date: Date) =>
  date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

export default function DishForm({
  dish,
  variantOfName,
  onSave,
  onAutosave,
  onReload,
  saving,
  error,
  saveError,
  backHref,
}: {
  /** Plat existant, ou null pour une création. */
  dish: Dish | null
  /** Le nom du plat dont celui-ci est la copie (§5.4), s'il est encore là. */
  variantOfName?: string | null
  /**
   * L'enregistrement voulu. Pour un plat existant, renvoie la fiche enregistrée :
   * le formulaire en reprend la version et ce que l'API a normalisé, même si la
   * page le quitte ensuite (sinon la liste relue ferait croire à un conflit).
   */
  onSave: (input: DishInput) => void | Promise<Dish>
  /** Enregistre le brouillon sans quitter la page (plat existant, pas encore Prête). */
  onAutosave?: (input: DishInput) => Promise<Dish>
  /** Relit le plat (liste à jour) pour repartir de la dernière version ; null s'il n'existe plus. */
  onReload?: () => Promise<Dish | null>
  saving: boolean
  error: string | null
  /** L'erreur brute du dernier enregistrement : un doublon de lignes y est lu. */
  saveError?: unknown
  backHref: string
}) {
  const [d, setD] = useState<Draft>(() => toDraft(dish))
  const [customDiet, setCustomDiet] = useState('')
  const [customAllergen, setCustomAllergen] = useState('')
  const [equipment, setEquipment] = useState('')
  const [personalTag, setPersonalTag] = useState('')
  const [autosaved, setAutosaved] = useState<Date | null>(null)
  const [autosaveFailed, setAutosaveFailed] = useState(false)
  const [autosaveError, setAutosaveError] = useState<unknown>(null)
  /** L'erreur de doublon que l'on a cessé d'afficher, parce que les lignes ont changé. */
  const [dupDismissed, setDupDismissed] = useState<unknown>(null)
  /** La version lue avec la fiche, renvoyée à chaque enregistrement et mise à jour par chaque réponse. */
  const [lockVersion, setLockVersion] = useState<number | undefined>(dish?.lockVersion)
  const [conflictSeen, setConflictSeen] = useState(false)
  /** L'erreur 409 d'un enregistrement voulu que « Recharger » a réglée : elle ne rouvre pas le bandeau. */
  const [conflictDismissed, setConflictDismissed] = useState<unknown>(null)
  const [reloading, setReloading] = useState(false)
  /** Un enregistrement automatique part : un autre en même temps porterait une version périmée. */
  const [autosaving, setAutosaving] = useState(false)
  /** Une restauration de version part : ni enregistrement automatique ni saisie tant qu'elle n'a pas répondu (même `lockVersion`, faux conflit). */
  const [restoring, setRestoring] = useState(false)
  const [reloadError, setReloadError] = useState<string | null>(null)
  /** Les lignes (rangs de l'API) qu'un `422 INGREDIENT_NOT_LINKED` a refusées. */
  const [notLinked, setNotLinked] = useState<number[]>([])
  const [customAllergenError, setCustomAllergenError] = useState<string | null>(null)
  /** La fiche telle que le dernier enregistrement l'a rendue : sert de référence tant que la liste n'est pas relue. */
  const [baseline, setBaseline] = useState<{ lock: number; json: string; had: StoredRecipe; dish: Dish } | null>(null)
  /**
   * Un envoi que l'enregistrement automatique ne refait pas tel quel : refusé
   * (4xx, hors conflit), ou accepté mais gardé autrement par l'API. On attend
   * une modification, sans quoi il repartirait en boucle.
   */
  const heldRef = useRef<string | null>(null)
  /** Le même envoi gardé, en état : l'en-tête ne doit pas promettre un enregistrement automatique qui n'aura pas lieu. */
  const [heldJson, setHeldJson] = useState<string | null>(null)
  const hold = (json: string | null) => {
    heldRef.current = json
    setHeldJson(json)
  }
  /** Le brouillon, au moment de l'envoi qui a échoué : une frappe ensuite remet le compteur d'essais à zéro. */
  const retryDraftRef = useRef<Draft | null>(null)
  /** Les échecs passagers (réseau, 5xx) d'affilée : ils espacent les essais suivants. */
  const [retries, setRetries] = useState(0)
  /** Une tentative d'enregistrement a eu lieu : les champs obligatoires vides se signalent alors. */
  const [attempted, setAttempted] = useState(false)
  const [thawingTouched, setThawingTouched] = useState(false)
  /** Le dernier envoi automatique refusé champ par champ (400, 422), pour en placer les messages. */
  const [refusal, setRefusal] = useState<Refusal | null>(null)
  /** Le dernier envoi voulu : son refus arrive par `saveError`, et se place de même. */
  const [submitted, setSubmitted] = useState<Omit<Refusal, 'error'> | null>(null)

  const diets = useDiets()
  const allergens = useAllergens(REGULATED_ALLERGENS)
  const categories = useDishCategories()
  const reheatModes = useReheatModes(REHEAT_MODES)
  const computedDiets = useComputedDiets()
  const profiles = useRecipeProfiles()

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }))
  /* Les codes se rangent dans l'ordre du référentiel : c'est celui que l'API
     renvoie, donc un cochage dans le désordre ne fait pas diverger le brouillon. */
  const toggle = (k: 'diets' | 'addedAllergens', code: string) => {
    const order = (k === 'diets' ? diets : allergens).map((o) => o.code)
    const rank = (c: string) => {
      const i = order.indexOf(c)
      return i === -1 ? order.length : i
    }
    setD((p) => {
      const cur = p[k]!
      if (cur.includes(code)) return { ...p, [k]: cur.filter((x) => x !== code) }
      // Tri stable : les codes hors référentiel gardent leur ordre, en fin de liste.
      const next = [...cur, code]
        .map((c, i) => ({ c, i }))
        .sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i)
        .map((x) => x.c)
      return { ...p, [k]: next }
    })
  }

  const saveable = d.name.trim().length >= 2 && d.prepMinutes > 0

  /* Ce qui diffère de la fiche enregistrée, comparé tel que l'API le recevrait. */
  /* Ce que la fiche enregistrée porte de sa recette (la liste relue peut être en retard sur la dernière réponse). */
  const hadRecipe =
    baseline && dish && baseline.lock > dish.lockVersion ? baseline.had : storedRecipe(dish)
  const payload = toPayload(d, hadRecipe)
  const payloadJson = JSON.stringify(payload)
  const saved = useMemo(() => {
    if (!dish) return null
    // La liste relue peut être en retard sur la réponse du dernier enregistrement.
    if (baseline && baseline.lock > dish.lockVersion) return baseline.json
    return JSON.stringify(toPayload(toDraft(dish), storedRecipe(dish)))
  }, [dish, baseline])
  const dirty = saved === null || payloadJson !== saved

  /* Un conflit : la fiche a changé ailleurs. Plus aucun enregistrement, automatique
     ou non, tant qu'on n'a pas rechargé : renvoyer la nouvelle version à notre
     place écraserait l'autre modification. Une liste relue qui porte une version
     plus récente que la nôtre le dit aussi, avant même d'avoir essayé. */
  const conflict =
    conflictSeen ||
    (isConflict(saveError) && saveError !== conflictDismissed) ||
    isConflict(autosaveError) ||
    Boolean(dish && lockVersion !== undefined && dish.lockVersion > lockVersion)

  /* La fiche la plus récente : entre la réponse d'un enregistrement et la liste relue,
     la liste porte encore l'ancienne (son statut, « Prête », la confirmation des
     allergènes). C'est la réponse qui fait foi tant que la liste ne l'a pas rattrapée. */
  const liveDish = baseline && dish && baseline.lock > dish.lockVersion ? baseline.dish : dish

  /* Le brouillon s'enregistre seul tant que la fiche n'est pas Prête : un
     enregistrement d'une fiche Prête crée une version (R6), et une version ne
     naît pas d'une frappe au clavier. Lue sur la liste seule, une réponse qui
     vient de rendre la fiche Prête laisserait partir un second envoi, et une
     seconde version. */
  const autosave = Boolean(
    liveDish && onAutosave && liveDish.status === 'draft' && !liveDish.readiness?.ready,
  )
  /** Ce qui s'envoie : la fiche, avec la version lue. */
  const withLock = (input: DishInput): DishInput =>
    dish && lockVersion !== undefined ? { ...input, lockVersion } : input

  /**
   * Une réponse d'enregistrement (automatique ou voulu) : la version qu'elle
   * porte, la référence de comparaison, et ce que l'API a normalisé, reporté sur
   * le brouillon tel qu'il est maintenant (`mergeSaved`), jamais à sa place.
   */
  function adoptSaved(sentDraft: Draft, res: Dish, hadSent: StoredRecipe) {
    const hadAfter = storedRecipe(res)
    const savedJson = JSON.stringify(toPayload(toDraft(res), hadAfter))
    setLockVersion(res.lockVersion)
    setBaseline({ lock: res.lockVersion, json: savedJson, had: hadAfter, dish: res })
    setD((cur) => mergeSaved(cur, sentDraft, res, hadSent))
    // Sans frappe depuis l'envoi, le brouillon devient `settled`. S'il diffère encore
    // de la fiche, l'API a gardé autre chose (une recette vidée de toutes ses lignes,
    // par exemple) : on ne le renvoie pas en boucle, on attend une modification.
    const settledJson = JSON.stringify(toPayload(mergeSaved(sentDraft, sentDraft, res, hadSent), hadAfter))
    hold(settledJson === savedJson ? null : settledJson)
    // La fiche est enregistrée : un échec d'avant ne vaut plus.
    setRetries(0)
    setAutosaveFailed(false)
    setAutosaveError(null)
    setRefusal(null)
  }

  /* Les valeurs que l'API refuserait : rien ne part tant qu'il en reste. */
  const problems = useMemo(() => fieldProblems(d), [d])
  const firstProblem = Object.keys(problems)[0] ?? null
  const blocked = firstProblem !== null
  useEffect(() => {
    if (!autosave || !dirty || !saveable || saving || autosaving || restoring || conflict || blocked) return
    const sentDraft = d
    const sentHad = hadRecipe
    const sentJson = JSON.stringify(toPayload(sentDraft, sentHad))
    // Ce même envoi a été refusé (un 422, par exemple), ou l'API l'a gardé autrement :
    // on attend une modification.
    if (heldRef.current === sentJson) return
    // Une frappe depuis le dernier échec : on repart du délai normal, pas de 10 à 30 s.
    if (retries > 0 && retryDraftRef.current !== sentDraft) {
      setRetries(0)
      return
    }
    // Après un échec passager, les essais s'espacent : 2,5 s, 10 s, puis 30 s.
    const delay =
      retries === 0 ? AUTOSAVE_DELAY : RETRY_DELAYS[Math.min(retries, RETRY_DELAYS.length) - 1]
    const t = setTimeout(() => {
      setAutosaving(true)
      onAutosave!(withLock(toPayload(sentDraft, sentHad)))
        .then((res) => {
          adoptSaved(sentDraft, res, sentHad)
          setAutosaved(new Date())
        })
        .catch((e: unknown) => {
          if (isConflict(e)) setConflictSeen(true)
          else if (isTransient(e)) {
            retryDraftRef.current = sentDraft
            setRetries((n) => n + 1)
          }
          else {
            hold(sentJson)
            setRefusal({ error: e, json: sentJson, ...sentKeys(sentDraft) })
          }
          setAutosaveFailed(true)
          setAutosaveError(e)
        })
        .finally(() => setAutosaving(false))
    }, delay)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `withLock` ne change qu'avec `lockVersion`, listé ; `adoptSaved` n'utilise que des setters et une ref.
  }, [d, autosave, dirty, saveable, saving, autosaving, restoring, conflict, blocked, lockVersion, onAutosave, retries, hadRecipe])

  /**
   * Repart d'une fiche rendue par l'API, à la place du brouillon : « Recharger »
   * et « Restaurer » le veulent. `baseline` : la fiche de la liste relue fait foi
   * (null), ou, pour une réponse que la liste n'a pas encore, cette réponse même.
   */
  function replaceWith(fresh: Dish, keep: Dish | null) {
    setD(toDraft(fresh))
    setLockVersion(fresh.lockVersion)
    setBaseline(
      keep
        ? {
            lock: keep.lockVersion,
            json: JSON.stringify(toPayload(toDraft(keep), storedRecipe(keep))),
            had: storedRecipe(keep),
            dish: keep,
          }
        : null,
    )
    hold(null)
    setRetries(0)
    setConflictSeen(false)
    setConflictDismissed(saveError)
    setAutosaveFailed(false)
    setAutosaveError(null)
    setDupDismissed(dupError ?? null)
    setNotLinked([])
    setRefusal(null)
    setSubmitted(null)
  }

  /** « Recharger » : relit le plat et repart de lui. Les saisies locales sont perdues. */
  async function reload() {
    if (!onReload || reloading) return
    if (
      dirty &&
      !window.confirm('Recharger efface vos modifications non enregistrées sur cette page. Continuer ?')
    ) {
      return
    }
    setReloading(true)
    setReloadError(null)
    try {
      const fresh = await onReload()
      if (!fresh) {
        setReloadError('Ce plat n’existe plus : il a peut-être été supprimé ailleurs.')
        return
      }
      replaceWith(fresh, null)
    } catch (e) {
      setReloadError(apiMessage(e, 'Le plat n’a pas pu être rechargé.'))
    } finally {
      setReloading(false)
    }
  }

  /* Le bloc des allergènes et le panneau « Prête ? » lisent la fiche la plus récente. */
  const allergenDish = liveDish

  const readiness = liveDish?.readiness

  /* Les lignes et les couples que l'API refuserait. */
  const lignesIncompletes = d.ingredients.filter(
    (i) => ingredientStarted(i) && !ingredientReady(i),
  ).length
  /* Un doublon refusé par l'API (422) : ses indices valent pour les lignes envoyées,
     c'est-à-dire après `cleanIngredients`. On les ramène aux lignes affichées. */
  const dupError = [autosaveError, saveError].find(
    (e) => e !== dupDismissed && duplicateLines(e) !== null,
  )
  const dupRows = useMemo(() => {
    const sent = duplicateLines(dupError)
    if (!sent) return []
    return shownGroups(d.ingredients, sent)
  }, [dupError, d.ingredients])
  /* Les lignes que la confirmation a refusées (non reliées), en rangs affichés. */
  const notLinkedRows = useMemo(
    () => shownRows(d.ingredients, notLinked),
    [notLinked, d.ingredients],
  )
  /* Le rang d'une ligne de l'API → la ligne affichée, pour les liens du panneau. */
  const sentRows = useMemo(() => sentIndexes(d.ingredients), [d.ingredients])
  const stepRows = useMemo(() => sentStepIndexes(d.steps), [d.steps])
  const liensInvalides = d.ingredients.filter((i) => !linkValid(i.link)).length
  const storageIncomplet = Boolean(
    (d.storageMethod ||
      d.storageDays.trim() ||
      d.storageContainer.trim() ||
      d.storageFreezable ||
      d.storageMonths.trim() ||
      d.storageThawing.trim()) &&
      (!d.storageMethod || !d.storageDays.trim()),
  )
  const freezeYes = d.storageFreezable === 'yes'
  const reheatNoteMissing = d.reheatModes.length > 0 && !d.reheatNote.trim()
  /* Sans mode coché, rien du réchauffage ne part (`cleanReheating`) : ce qui est écrit le dit. */
  const reheatLost = [
    d.reheatNote.trim() ? 'les consignes' : null,
    d.reheatTemperature.trim() ? 'la température' : null,
    d.reheatMinutes.trim() ? 'la durée' : null,
    d.reheatContainer.trim() ? 'le contenant' : null,
  ].filter((x): x is string => x !== null)
  const reheatNoteLost = d.reheatModes.length === 0 && reheatLost.length > 0

  /* Sous chaque champ : ce que l'API refuserait (`problems`), sinon ce qu'elle a refusé,
     tant que l'écran est celui de l'envoi refusé. */
  const manualRefusal: Refusal | null =
    saveError && submitted ? { error: saveError, ...submitted } : null
  const refused = [refusal, manualRefusal]
    .filter((r): r is Refusal => r !== null && r.json === payloadJson)
    .reduce<Record<string, string>>((acc, r) => ({ ...refusedFields(r, d), ...acc }), {})
  const fieldMsgs: Record<string, string> = { ...refused, ...problems }
  const invalid = (id: string, also = false) => invalidProps(fieldMsgs, id, also)

  /**
   * Une modification des lignes d'ingrédients, toujours appliquée à la liste du
   * moment : le dialogue de création répond après coup, et sa ligne a pu bouger
   * (ou la liste être reprise après un enregistrement) entre-temps.
   */
  const editRows = (fn: (rows: IngredientRow[]) => IngredientRow[]) => {
    setD((p) => ({ ...p, ingredients: fn(p.ingredients) }))
    if (dupError) setDupDismissed(dupError)
    if (notLinked.length > 0) setNotLinked([])
  }

  /* L'enregistrement automatique a échoué (hors conflit, qui a son bandeau) : la
     saisie reste sur la page, et le chef doit savoir qu'elle n'est pas enregistrée. */
  const unsaved = autosaveFailed && !conflict
  const authLost = isSessionLost(autosaveError)
  const forbidden = isForbidden(autosaveError)
  /* Un envoi qui a réussi mais que l'API a gardé autrement : rien ne repart seul. */
  const heldNow = heldJson !== null && heldJson === payloadJson
  const unsavedTransient = unsaved && isTransient(autosaveError)
  const unsavedText = !unsaved
    ? null
    : unsavedTransient
      ? 'Le brouillon n’a pas pu s’enregistrer (connexion ou serveur) : vos modifications restent sur cette page, et un nouvel essai part tout seul. Pour les enregistrer tout de suite, appuyez sur « Enregistrer ».'
      : authLost
        ? 'Votre session a expiré : reconnectez-vous, puis cliquez sur « Enregistrer ». Le brouillon n’a pas été enregistré ; vos modifications restent sur cette page.'
        : forbidden
          ? `Le brouillon n’a pas été enregistré : ${apiMessage(autosaveError)} Vos modifications restent sur cette page.`
          : `Le brouillon n’a pas été enregistré : ${apiMessage(autosaveError)} Vos modifications restent sur cette page : corrigez ce qui est signalé, puis appuyez sur « Enregistrer ».`
  const unsavedShort = !unsaved
    ? null
    : unsavedTransient
      ? 'Brouillon non enregistré (connexion) : nouvel essai automatique, ou appuyez sur « Enregistrer ».'
      : authLost
        ? 'Votre session a expiré : reconnectez-vous, puis cliquez sur « Enregistrer ».'
        : forbidden
          ? `Brouillon refusé : ${apiMessage(autosaveError)}`
          : 'Brouillon refusé : corrigez ce qui est signalé, puis appuyez sur « Enregistrer ».'
  /* En pratique, un envoi gardé vient d'une ligne commencée mais pas prête, après le
     retrait de toutes les lignes enregistrées : la recette n'est pas vidée tant
     qu'elle est là (R24). On le dit, plutôt qu'un « vérifiez » sans objet. */
  const blockedText = 'Rien ne s’enregistre : corrigez d’abord les champs signalés en rouge.'
  /* Une fiche Prête ou publiée ne s'enregistre qu'au bouton (R6) : le dire dès la
     première frappe, sans quoi l'en-tête afficherait « Version 4 » sur des
     modifications qu'un départ effacerait. */
  const manualText = 'Modifications non enregistrées : cliquez sur « Enregistrer »'
  const needText = 'Le nom (2 caractères au moins) et le temps de préparation sont nécessaires pour enregistrer.'
  const heldText =
    lignesIncompletes > 0
      ? 'Une ligne d’ingrédient est incomplète : la recette ne s’enregistre pas telle qu’elle est à l’écran. Complétez cette ligne ou retirez-la.'
      : 'Une partie de vos modifications n’a pas été prise en compte : vérifiez puis cliquez sur « Enregistrer ».'

  /* L'état de l'enregistrement, dans l'en-tête : ce qui n'est pas enregistré passe avant tout. */
  const headerWarning =
    unsavedText ??
    (blocked && dirty
      ? blockedText
      : heldNow
        ? heldText
        : dirty && !saveable
          ? needText
          : dirty && !autosave
            ? manualText
            : null)
  const headerAlert = headerWarning !== null
  const headerText =
    headerWarning ??
    (autosaved && !dirty
      ? `Brouillon enregistré à ${heure(autosaved)}`
      : autosave
        ? 'Brouillon : il s’enregistre tout seul pendant que vous écrivez.'
        : `Version ${liveDish?.recipeVersion ?? ''}`)
  /* La barre du téléphone : la même alerte, en court, sinon ce qui manque à « Prête ». */
  const barWarning =
    unsavedShort ??
    (blocked
      ? blockedText
      : heldNow
        ? heldText
        : !saveable
          ? 'Le nom et le temps de préparation sont nécessaires.'
          : dish && dirty && !autosave
            ? manualText
            : null)
  const barAlert = barWarning !== null && (unsavedShort !== null || saveable)

  /* Fermer ou recharger la page perdrait ce qui n'est pas enregistré, ou l'envoi en
     cours : le navigateur demande d'abord. Un plat neuf compte dès la première saisie. */
  const changed = dish ? dirty : payloadJson !== EMPTY_DISH_JSON
  const leaveGuard = changed || autosaving
  useEffect(() => {
    if (!leaveGuard) return
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Safari et les anciens navigateurs attendent encore `returnValue`.
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [leaveGuard])
  /* « Annuler » et « Mes plats » quittent sans recharger : le navigateur ne demande
     rien, le formulaire demande. Un envoi automatique en cours, lui, aboutit quand même. */
  const confirmLeave = (e: React.MouseEvent) => {
    if (
      changed &&
      !window.confirm('Vos modifications ne sont pas enregistrées : quitter la page les efface. Quitter quand même ?')
    ) {
      e.preventDefault()
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setAttempted(true)
        if (firstProblem) focusField(firstProblem)
        if (!saveable || saving || autosaving || restoring || conflict || blocked) return
        const sentDraft = d
        const sentHad = hadRecipe
        setSubmitted({ json: JSON.stringify(toPayload(sentDraft, sentHad)), ...sentKeys(sentDraft) })
        const pending = onSave(withLock(toPayload(sentDraft, sentHad)))
        // La nouvelle version et ce que l'API a normalisé, comme après un enregistrement
        // automatique. Un échec est montré par la page (`error`).
        if (dish && pending) pending.then((res) => adoptSaved(sentDraft, res, sentHad), () => {})
      }}
    >
      {/* Pendant une restauration, tout le formulaire est inerte : une frappe partirait avec la version périmée. */}
      <fieldset disabled={restoring} className="m-0 min-w-0 space-y-6 border-0 p-0">
      <Link
        href={backHref}
        onClick={confirmLeave}
        className="inline-flex items-center gap-2 text-xs text-ink-mid hover:text-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Mes plats
      </Link>

      {conflict && (
        <div
          role="alert"
          className="flex flex-wrap items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] leading-relaxed text-red-800"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              Cette recette a été modifiée ailleurs (un autre onglet, ou Lab’s Food a mis à
              jour un ingrédient). Rechargez pour voir la dernière version.
            </p>
            <p className="mt-1">
              Rien n’a été écrit, et l’enregistrement est suspendu.{' '}
              {dirty
                ? 'Recharger efface les modifications que vous n’avez pas enregistrées sur cette page.'
                : 'Vous n’avez pas de modification en attente sur cette page.'}{' '}
              Relisez surtout les allergènes avant de les confirmer.
            </p>
            {reloadError && <p className="mt-1 font-semibold">{reloadError}</p>}
          </div>
          {onReload && (
            <button
              type="button"
              onClick={reload}
              disabled={reloading}
              className="btn btn-primary text-xs disabled:opacity-55"
            >
              {reloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <RotateCw className="h-3.5 w-3.5" aria-hidden />
              )}
              Recharger
            </button>
          )}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white lg:p-7"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-amber/25 blur-3xl"
        />
        <h2 className="relative font-display text-2xl font-bold leading-tight lg:text-3xl">
          {dish ? dish.name : 'Nouveau plat'}
        </h2>
        {dish?.variantOfId && (
          <p className="relative mt-1 flex items-center gap-1 text-xs text-white/80">
            {variantOfName ? `Variante de « ${variantOfName} »` : 'Variante d’un autre de vos plats'}
            <InfoPopover
              label="Qu’est-ce qu’une variante ?"
              className="text-white/70 hover:text-white"
            >
              Une copie d’un de vos plats, faite pour en écrire une autre version. Elle
              reste en brouillon tant que vous ne la publiez pas ; ses allergènes sont à
              confirmer à nouveau, et sa photo est une copie indépendante.
            </InfoPopover>
          </p>
        )}
        <p className="relative mt-1.5 max-w-prose text-sm leading-relaxed text-white/70">
          Le nom et le temps de préparation suffisent pour enregistrer. Le reste
          se complète quand vous voulez — rien n’est public avant publication.
        </p>
        {dish && (
          <p
            role="status"
            className={`relative mt-3 text-xs ${headerAlert ? 'font-semibold text-amber' : 'text-white/80'}`}
          >
            {headerText}
          </p>
        )}
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Le plat ──────────────────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          <Group title="Le plat">
            <Field label="Nom" required>
              <input
                id="dish-name"
                value={d.name}
                maxLength={DISH_LIMITS.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Poulet rôti aux herbes"
                {...invalid('dish-name')}
                className="input-base"
              />
              <ProblemText id="dish-name" msgs={fieldMsgs} />
            </Field>
            <Field
              label="Description courte"
              hint="Ce que le client lit sur la carte. Demandée pour publier."
            >
              <textarea
                id="dish-description"
                value={d.description ?? ''}
                maxLength={DISH_LIMITS.description}
                onChange={(e) => set('description', e.target.value)}
                rows={3}
                placeholder="Poulet fermier rôti, thym et romarin, pommes de terre grenaille."
                {...invalid('dish-description')}
                className="input-base resize-y"
              />
              <ProblemText id="dish-description" msgs={fieldMsgs} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Pays d’origine"
                hint="Facultatif. Il colore la carte culinaire du client."
                popover={
                  <InfoPopover label="L’origine est-elle obligatoire ?">
                    Non. Sans pays choisi, la fiche indique « Non spécifié ». L’origine
                    n’empêche ni « Prête » ni la publication.
                  </InfoPopover>
                }
              >
                <select
                  id="dish-country"
                  value={d.country ?? ''}
                  onChange={(e) => set('country', e.target.value)}
                  className="input-base"
                >
                  <option value="">Non spécifié</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Place dans le repas">
                <select
                  id="dish-category"
                  value={d.category ?? ''}
                  onChange={(e) => set('category', e.target.value)}
                  className="input-base"
                >
                  <option value="">À préciser</option>
                  {categories.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Hint id="recette-temps-prives">
              Les temps de préparation et de cuisson ne sont pas montrés aux clients :
              ils restent dans votre espace.
            </Hint>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Portions">
                <input
                  id="dish-portions"
                  type="number"
                  min={DISH_LIMITS.portions.min}
                  max={DISH_LIMITS.portions.max}
                  step={1}
                  value={d.portions ?? 4}
                  onChange={(e) => set('portions', Number(e.target.value))}
                  {...invalid('dish-portions')}
                  className="input-base"
                />
                <ProblemText id="dish-portions" msgs={fieldMsgs} />
              </Field>
              <Field label="Prépa (min)" required>
                <input
                  id="dish-prep"
                  type="number"
                  min={1}
                  max={DISH_LIMITS.minutes}
                  step={1}
                  value={d.prepMinutes}
                  onChange={(e) => set('prepMinutes', Number(e.target.value))}
                  {...invalid('dish-prep')}
                  className="input-base"
                />
                <ProblemText id="dish-prep" msgs={fieldMsgs} />
              </Field>
              <Field label="Cuisson (min)" hint="0 si le plat ne cuit pas.">
                <input
                  id="dish-cook"
                  type="number"
                  min={0}
                  max={DISH_LIMITS.minutes}
                  step={1}
                  value={d.cookMinutes ?? ''}
                  onChange={(e) =>
                    set('cookMinutes', e.target.value ? Number(e.target.value) : null)
                  }
                  {...invalid('dish-cook')}
                  className="input-base"
                />
                <ProblemText id="dish-cook" msgs={fieldMsgs} />
              </Field>
              <Field label="Difficulté">
                <select
                  id="dish-difficulty"
                  value={d.difficulty ?? ''}
                  onChange={(e) => set('difficulty', (e.target.value || null) as Difficulty)}
                  className="input-base"
                >
                  {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((k) => (
                    <option key={k} value={k}>
                      {DIFFICULTY_LABEL[k]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field
              label="Photo du plat"
              hint="Une vraie photo de votre plat, pas une image générée."
              popover={
                <InfoPopover label="Pourquoi une vraie photo ?">
                  Le client réserve sur ce qu’il voit : la photo doit montrer votre plat.
                  Une image générée peut être retirée par l’équipe. Pour l’instant, une
                  fiche sans photo se publie quand même ; ce ne sera bientôt plus le cas.
                </InfoPopover>
              }
            >
              <div id="dish-photo">
                <PhotoField dish={dish} />
              </div>
            </Field>
            <div>
              <p className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-navy">
                Matériel <span className="font-normal text-ink-soft">(facultatif)</span>
                <InfoPopover label="Le matériel est-il contrôlé ?">
                  Non, jamais. C’est un mémo pour vous : il figure sur la fiche et sur le
                  PDF, et n’empêche ni « Prête » ni la publication.
                </InfoPopover>
              </p>
              <FreeList
                id="dish-equipment"
                limits={FREE_LIST_LIMITS.equipment}
                problem={fieldMsgs['dish-equipment']}
                value={equipment}
                onChange={setEquipment}
                items={d.equipment}
                onAdd={(v) => set('equipment', [...d.equipment, v])}
                onRemove={(v) => set('equipment', d.equipment.filter((x) => x !== v))}
                placeholder="Cocotte en fonte, mixeur plongeant…"
              />
            </div>
          </Group>

          {/* ── Classement (§4.8) ────────────────────────────────────────── */}
          <Group
            title="Classement"
            hint="Ce qui aide le client à trouver le plat. Rien ici n’empêche de publier."
          >
            <div>
              <p className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-navy">
                Régimes calculés
                <InfoPopover label="D’où viennent les régimes calculés ?">
                  De la liste commune d’ingrédients : un régime s’affiche quand tous les
                  ingrédients le permettent. Ils ne se modifient pas à la main. Tant
                  qu’une ligne n’est pas reliée à la liste, rien n’est calculé. Le client
                  lit « selon les produits achetés ».
                </InfoPopover>
              </p>
              {!dish ? (
                <p className="text-[13px] text-ink-soft">Calculés après le premier enregistrement.</p>
              ) : dish.computedDiets === null ? (
                <p className="text-[13px] text-ink-mid">
                  Non calculé
                  {dish.classification.unlinkedLines > 0 &&
                    ` : ${dish.classification.unlinkedLines} ligne${
                      dish.classification.unlinkedLines > 1 ? 's' : ''
                    } à relier à la liste commune (choisissez l’ingrédient dans les suggestions).`}
                </p>
              ) : dish.computedDiets.length === 0 ? (
                <p className="text-[13px] text-ink-mid">Aucun régime commun à tous les ingrédients.</p>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {dish.computedDiets.map((c) => (
                    <li
                      key={c}
                      className="rounded-full bg-mint/50 px-3 py-1.5 text-xs font-semibold text-mint-ink"
                    >
                      {refLabel(computedDiets, c)}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div id="dish-declared-diets">
              <p className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-navy">
                Régimes déclarés
                <InfoPopover label="Pourquoi déclarer halal ou casher ?">
                  Aucun ingrédient ne prouve qu’un plat est halal ou casher : c’est vous
                  qui le déclarez, sous votre responsabilité.
                </InfoPopover>
              </p>
              <Chips
                options={DECLARED_DIETS}
                selected={d.declaredDiets}
                onToggle={(c) =>
                  set(
                    'declaredDiets',
                    d.declaredDiets.includes(c)
                      ? d.declaredDiets.filter((x) => x !== c)
                      : [...d.declaredDiets, c],
                  )
                }
              />
            </div>

            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-navy">
                Régimes indiqués par vous
              </p>
              <p className="mb-2 text-xs leading-relaxed text-ink-soft">
                Montrés tant que le calcul ne se fait pas. Une carte n’est « sans gluten »
                que si tous ses plats le sont.
              </p>
              <Chips
                options={diets}
                selected={d.diets ?? []}
                onToggle={(c) => toggle('diets', c)}
              />
              <div className="mt-2">
                <FreeList
                  id="dish-custom-diets"
                  limits={FREE_LIST_LIMITS.customDiets}
                  problem={fieldMsgs['dish-custom-diets']}
                  value={customDiet}
                  onChange={setCustomDiet}
                  items={d.customDiets ?? []}
                  onAdd={(v) => set('customDiets', [...(d.customDiets ?? []), v])}
                  onRemove={(v) =>
                    set('customDiets', (d.customDiets ?? []).filter((x) => x !== v))
                  }
                  placeholder="Autre régime"
                />
              </div>
            </div>

            <div id="dish-seasons">
              <p className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-navy">
                Saisons
                <InfoPopover label="Comment les saisons sont-elles calculées ?">
                  Les mois que partagent les ingrédients de saison de la liste commune ;
                  « toute l’année » s’il n’y en a pas. Vous pouvez choisir vos propres
                  mois : ils remplacent le calcul.
                </InfoPopover>
              </p>
              <p className="mb-2 text-xs text-ink-mid">
                {d.seasonsOverride.length
                  ? `Vos mois : ${seasonsLine(d.seasonsOverride)}`
                  : dish?.classification.computedSeasonMonths
                    ? `Calculées : ${seasonsLine(dish.classification.computedSeasonMonths)}`
                    : 'Non calculées pour l’instant.'}
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {MONTHS.map((m, i) => {
                  const on = d.seasonsOverride.includes(i + 1)
                  return (
                    <li key={m}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          set(
                            'seasonsOverride',
                            on
                              ? d.seasonsOverride.filter((x) => x !== i + 1)
                              : [...d.seasonsOverride, i + 1].sort((a, b) => a - b),
                          )
                        }
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          on ? 'bg-navy text-white' : 'bg-cream-soft text-ink-mid hover:text-navy'
                        }`}
                      >
                        {m}
                      </button>
                    </li>
                  )
                })}
              </ul>
              {d.seasonsOverride.length > 0 && (
                <button
                  type="button"
                  onClick={() => set('seasonsOverride', [])}
                  className="mt-2 text-xs text-ink-mid underline underline-offset-2 hover:text-navy"
                >
                  Revenir aux saisons calculées
                </button>
              )}
            </div>

            <div id="dish-profiles">
              <p className="mb-1.5 text-[13px] font-semibold text-navy">Profils</p>
              <Chips
                options={profiles}
                selected={d.profiles}
                onToggle={(c) =>
                  set(
                    'profiles',
                    d.profiles.includes(c)
                      ? d.profiles.filter((x) => x !== c)
                      : [...d.profiles, c],
                  )
                }
              />
              <ProblemText id="dish-profiles" msgs={fieldMsgs} />
            </div>

            <div>
              <p className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-navy">
                Étiquettes personnelles
                <InfoPopover label="Qui voit les étiquettes personnelles ?">
                  Vous seul. Elles servent à ranger vos plats et ne sont jamais montrées
                  aux clients.
                </InfoPopover>
              </p>
              <FreeList
                id="dish-tags"
                limits={FREE_LIST_LIMITS.personalTags}
                problem={fieldMsgs['dish-tags']}
                value={personalTag}
                onChange={setPersonalTag}
                items={d.personalTags}
                onAdd={(v) => set('personalTags', [...d.personalTags, v])}
                onRemove={(v) => set('personalTags', d.personalTags.filter((x) => x !== v))}
                placeholder="Rapide, été, best-seller…"
              />
            </div>
          </Group>

          {/* ── Allergènes ───────────────────────────────────────────────── */}
          <Group
            title="Allergènes"
            hint="Les quatorze allergènes réglementaires. C’est ce que lit un client allergique."
          >
            <div id="dish-allergens" className="space-y-4">
              <RecipeAllergens dish={allergenDish} options={allergens} />

              <AddedAllergens
                options={allergens}
                dish={allergenDish}
                added={d.addedAllergens ?? []}
                onToggle={(c) => toggle('addedAllergens', c)}
              />

              <div>
                <p className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-navy">
                  Autre
                  <InfoPopover label="Quand utiliser « Autre » ?">
                    Pour un allergène qui n’est pas parmi les quatorze (le sarrasin, par
                    exemple). Un des quatorze se coche plus haut : il n’est pas accepté ici.
                  </InfoPopover>
                </p>
                <FreeList
                  id="dish-custom-allergens"
                  limits={FREE_LIST_LIMITS.customAllergens}
                  problem={fieldMsgs['dish-custom-allergens']}
                  value={customAllergen}
                  onChange={(v) => {
                    setCustomAllergen(v)
                    setCustomAllergenError(null)
                  }}
                  items={d.customAllergens ?? []}
                  onAdd={(v) => {
                    const known = allergens.find(
                      (o) => normalise(o.label) === normalise(v) || normalise(o.code) === normalise(v),
                    )
                    if (known) {
                      setCustomAllergenError(
                        `« ${known.label} » fait partie des quatorze : cochez-le plus haut.`,
                      )
                      return false
                    }
                    set('customAllergens', [...(d.customAllergens ?? []), v])
                  }}
                  onRemove={(v) =>
                    set('customAllergens', (d.customAllergens ?? []).filter((x) => x !== v))
                  }
                  placeholder="Autre allergène (ex. sarrasin)"
                />
                {customAllergenError && (
                  <p role="alert" className="mt-1 text-xs text-red-700">
                    {customAllergenError}
                  </p>
                )}
              </div>

              {allergenDish && (
                <AllergenCheck
                  dish={allergenDish}
                  dirty={dirty}
                  incompleteRows={lignesIncompletes}
                  badLinks={liensInvalides}
                  locked={conflict}
                  lockVersion={lockVersion}
                  onConfirmed={(res) => {
                    setLockVersion(res.lockVersion)
                    // La liste relue arrive après : la confirmation s'affiche déjà.
                    setBaseline({
                      lock: res.lockVersion,
                      json: JSON.stringify(toPayload(toDraft(res), storedRecipe(res))),
                      had: storedRecipe(res),
                      dish: res,
                    })
                  }}
                  onConflict={() => setConflictSeen(true)}
                  onNotLinked={setNotLinked}
                />
              )}
            </div>
          </Group>

          {/* ── Recette ──────────────────────────────────────────────────── */}
          <Group
            title="Recette"
            hint="Elle sert à la liste de courses, groupée par rayon, et à la fiche que vous suivez chez le client."
          >
            <IngredientRows
              value={d.ingredients}
              onEdit={editRows}
              duplicates={dupRows}
              unlinked={notLinkedRows}
              problems={fieldMsgs}
            />
            {notLinkedRows.length > 0 && (
              <Note>
                La confirmation des allergènes est refusée : les lignes en rouge ne sont pas
                reliées à la liste commune. Choisissez l’ingrédient dans les suggestions, ou
                créez-le.
              </Note>
            )}
            {dupRows.length > 0 && (
              <Note>
                Le même ingrédient est sur plusieurs lignes (en rouge) : l’enregistrement
                est refusé tant qu’elles ne sont pas fusionnées en une seule.
              </Note>
            )}
            {lignesIncompletes > 0 && (
              <Note>
                {lignesIncompletes === 1
                  ? 'Une ligne est incomplète : elle ne sera pas enregistrée. Il faut le nom, la quantité et l’unité.'
                  : `${lignesIncompletes} lignes sont incomplètes : elles ne seront pas enregistrées. Il faut le nom, la quantité et l’unité.`}
              </Note>
            )}
            {liensInvalides > 0 && (
              <Note>
                {liensInvalides === 1
                  ? 'Un lien n’est pas une adresse complète (https://exemple.fr/…) : corrigez-le ou videz-le, la fiche ne s’enregistre pas d’ici là.'
                  : `${liensInvalides} liens ne sont pas des adresses complètes (https://exemple.fr/…) : corrigez-les ou videz-les, la fiche ne s’enregistre pas d’ici là.`}
              </Note>
            )}

            <PortionsPreview
              ingredients={cleanIngredients(d.ingredients)}
              base={d.portions ?? 4}
            />

            <StepRows
              value={d.steps}
              problems={fieldMsgs}
              onEdit={(fn) => setD((p) => ({ ...p, steps: fn(p.steps) }))}
            />
          </Group>

          {/* ── Après la session ─────────────────────────────────────────── */}
          <Group
            title="Réchauffage et conservation"
            hint="Ce que le client lit dans son espace, plusieurs jours après votre passage."
          >
            <div id="reheat-modes">
              <p className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-navy">
                Se réchauffe au
                <InfoPopover label="Changer le réchauffage crée-t-il une version ?">
                  Non. Les modes et les consignes de réchauffage s’appliquent dès
                  l’enregistrement, même sur un plat publié : ni nouvelle version, ni
                  nouvelle confirmation des allergènes.
                </InfoPopover>
              </p>
              <Chips
                options={reheatModes}
                selected={d.reheatModes}
                onToggle={(c) =>
                  set(
                    'reheatModes',
                    d.reheatModes.includes(c)
                      ? d.reheatModes.filter((x) => x !== c)
                      : [...d.reheatModes, c],
                  )
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Température (°C)">
                <input
                  id="reheat-temperature"
                  type="number"
                  min={0}
                  max={DISH_LIMITS.reheatTemperature}
                  step={1}
                  value={d.reheatTemperature}
                  onChange={(e) => set('reheatTemperature', e.target.value)}
                  placeholder="160"
                  {...invalid('reheat-temperature')}
                  className="input-base"
                />
                <ProblemText id="reheat-temperature" msgs={fieldMsgs} />
              </Field>
              <Field label="Durée (min)">
                <input
                  id="reheat-minutes"
                  type="number"
                  min={0}
                  max={DISH_LIMITS.reheatMinutes}
                  step={1}
                  value={d.reheatMinutes}
                  onChange={(e) => set('reheatMinutes', e.target.value)}
                  placeholder="15"
                  {...invalid('reheat-minutes')}
                  className="input-base"
                />
                <ProblemText id="reheat-minutes" msgs={fieldMsgs} />
              </Field>
              <Field label="Contenant conseillé">
                <input
                  id="reheat-container"
                  value={d.reheatContainer}
                  maxLength={DISH_LIMITS.container}
                  onChange={(e) => set('reheatContainer', e.target.value)}
                  placeholder="Plat en verre"
                  {...invalid('reheat-container')}
                  className="input-base"
                />
                <ProblemText id="reheat-container" msgs={fieldMsgs} />
              </Field>
            </div>
            <Field
              label="Consignes de réchauffage"
              required
              hint="Une phrase, celle que vous diriez de vive voix. Demandée pour que la fiche soit Prête."
            >
              <input
                id="reheat-note"
                {...invalid('reheat-note', reheatNoteMissing)}
                value={d.reheatNote}
                onChange={(e) => set('reheatNote', e.target.value)}
                placeholder="Ajoutez une cuillère de bouillon pour éviter le dessèchement."
                maxLength={DISH_LIMITS.reheatNote}
                className="input-base"
              />
              <ProblemText id="reheat-note" msgs={fieldMsgs} />
            </Field>
            {reheatNoteMissing && (
              <Note>Les consignes de réchauffage sont nécessaires pour que la fiche soit Prête.</Note>
            )}
            {reheatNoteLost && (
              <Note>
                {`${enumeration(reheatLost).replace(/^./, (c) => c.toUpperCase())} ne s’enregistre${
                  reheatLost.length > 1 || reheatLost[0] === 'les consignes' ? 'nt' : ''
                } qu’avec un mode de réchauffage : cochez-en un plus haut.`}
              </Note>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Conserver au">
                <select
                  id="storage-method"
                  value={d.storageMethod}
                  onChange={(e) => set('storageMethod', e.target.value)}
                  className="input-base"
                >
                  <option value="">Non précisé</option>
                  {STORAGE_METHODS.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Jours de conservation" required={Boolean(d.storageMethod)}>
                <input
                  id="storage-days"
                  type="number"
                  min={0}
                  max={DISH_LIMITS.storageDays}
                  step={1}
                  value={d.storageDays}
                  onChange={(e) => set('storageDays', e.target.value)}
                  placeholder="3"
                  {...invalid('storage-days', Boolean(d.storageMethod) && !d.storageDays.trim())}
                  className="input-base"
                />
                <ProblemText id="storage-days" msgs={fieldMsgs} />
              </Field>
              <Field label="Contenant">
                <input
                  id="storage-container"
                  value={d.storageContainer}
                  maxLength={DISH_LIMITS.container}
                  onChange={(e) => set('storageContainer', e.target.value)}
                  placeholder="Boîte hermétique"
                  {...invalid('storage-container')}
                  className="input-base"
                />
                <ProblemText id="storage-container" msgs={fieldMsgs} />
              </Field>
            </div>

            <fieldset
              id="storage-freezable"
              role="radiogroup"
              aria-required
              aria-describedby="storage-freezable-hint"
            >
              <legend className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-navy">
                Congelable <span className="text-terra">*</span>
                <InfoPopover label="Pourquoi dire si le plat se congèle ?">
                  Le client lit la réponse dans sa fiche. Si le plat se congèle, dites pour
                  combien de mois et comment le décongeler. Une fiche écrite avant cette
                  question n’a pas de réponse : elle reste « à préciser » jusqu’à ce que vous
                  choisissiez, et ce n’est pas un « non ».
                </InfoPopover>
              </legend>
              <div className="flex flex-wrap gap-4">
                {(
                  [
                    ['yes', 'Oui'],
                    ['no', 'Non'],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="inline-flex items-center gap-2 text-[13px] text-navy">
                    <input
                      type="radio"
                      name="storage-freezable"
                      value={value}
                      checked={d.storageFreezable === value}
                      onChange={() => set('storageFreezable', value)}
                      className="h-4 w-4 accent-navy"
                    />
                    {label}
                  </label>
                ))}
              </div>
              <p id="storage-freezable-hint" className="mt-1 text-xs text-ink-soft">
                {d.storageFreezable === ''
                  ? 'À préciser : demandé pour que la fiche soit Prête.'
                  : 'Vous pouvez changer votre réponse à tout moment.'}
              </p>
            </fieldset>

            {freezeYes && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field
                  label="Se garde au congélateur (mois)"
                  required
                  hint={`Un nombre entier de ${FREEZER_MONTHS.min} à ${FREEZER_MONTHS.max}.`}
                >
                  <input
                    id="storage-months"
                    type="number"
                    min={FREEZER_MONTHS.min}
                    max={FREEZER_MONTHS.max}
                    step={1}
                    value={d.storageMonths}
                    onChange={(e) => set('storageMonths', e.target.value)}
                    placeholder="3"
                    {...invalid('storage-months')}
                    className="input-base"
                  />
                  <ProblemText id="storage-months" msgs={fieldMsgs} />
                </Field>
                <Field
                  label="Comment le décongeler"
                  required
                  className="sm:col-span-2"
                  hint={`${d.storageThawing.length} / ${THAWING_MAX} caractères.`}
                >
                  <input
                    id="storage-thawing"
                    value={d.storageThawing}
                    maxLength={THAWING_MAX}
                    onChange={(e) => set('storageThawing', e.target.value)}
                    placeholder="Une nuit au réfrigérateur, puis au four."
                    onBlur={() => setThawingTouched(true)}
                    {...invalid(
                      'storage-thawing',
                      (attempted || thawingTouched) && d.storageThawing.trim() === '',
                    )}
                    className="input-base"
                  />
                  <ProblemText id="storage-thawing" msgs={fieldMsgs} />
                </Field>
              </div>
            )}
            {freezeYes && (!d.storageMonths.trim() || !d.storageThawing.trim()) && (
              <Note>
                Un plat congelable demande les mois de conservation et la façon de le
                décongeler pour que la fiche soit Prête.
              </Note>
            )}

            {storageIncomplet && (
              <Note>
                La conservation ne s’enregistre qu’avec un lieu et un nombre de jours.
              </Note>
            )}
          </Group>
        </div>

        {/* ── Prête, version, publication ───────────────────────────────────── */}
        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-5 lg:p-6">
            <h3 className="flex items-center gap-1 font-display text-base font-bold text-navy">
              Prête ?
              <InfoPopover label="Que veut dire « Prête » ?">
                Une fiche est Prête quand tout ce qui sert à cuisiner et à faire les
                courses est rempli, et ses allergènes confirmés. L’origine et le
                matériel ne sont jamais demandés. Publier demande en plus une
                description courte.
              </InfoPopover>
            </h3>

            {!dish ? (
              <p className="mt-2 text-[13px] leading-relaxed text-ink-mid">
                Enregistrez le plat : la liste de ce qui manque s’affiche ensuite.
              </p>
            ) : (
              <>
                {readiness?.ready && (
                  <p className="mt-2 flex items-start gap-2 text-[13px] leading-relaxed text-mint-ink">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {readiness.toPublish.length === 0
                      ? 'La fiche est Prête et publiable. Vous publierez depuis la liste de vos plats, quand il vous conviendra.'
                      : 'La fiche est Prête. Pour la publier, il reste les points ci-dessous.'}
                  </p>
                )}
                <MissingGroup
                  title="Pour être Prête, il manque"
                  items={readiness?.problems ?? []}
                  rows={sentRows}
                  stepRows={stepRows}
                />
                <MissingGroup
                  title="Pour publier, il manque"
                  items={readiness?.toPublish ?? []}
                  rows={sentRows}
                  stepRows={stepRows}
                />
                <MissingGroup
                  title="À surveiller"
                  note="Ces points n’empêchent rien."
                  items={readiness?.warnings ?? []}
                  rows={sentRows}
                  stepRows={stepRows}
                  alert
                />
              </>
            )}
            {dish && dirty && (
              <p className="mt-2.5 text-xs leading-relaxed text-ink-soft">
                Calculé sur la fiche enregistrée : vos dernières modifications compteront
                une fois enregistrées.
              </p>
            )}
          </section>

          {dish && <VersionCard dish={dish} />}
          {dish && (
            <RecipeHistory
              dish={dish}
              lockVersion={lockVersion}
              dirty={dirty}
              disabled={conflict || saving || autosaving || reloading || restoring}
              onRestored={(restored) => replaceWith(restored, restored)}
              onPending={setRestoring}
              onConflict={() => setConflictSeen(true)}
            />
          )}

          {error && !isConflict(saveError) && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-2xl bg-red-50 p-3.5 text-[13px] leading-relaxed text-red-700"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          {/* Ce que l'API refuserait : chaque point mène à son champ. */}
          {blocked && (
            <div className="rounded-2xl bg-red-50 p-3.5 text-[13px] leading-relaxed text-red-700">
              <p className="font-semibold">À corriger avant d’enregistrer</p>
              <ul className="mt-1.5 space-y-1">
                {Object.entries(problems).map(([id, text]) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => focusField(id)}
                      className="text-left underline decoration-red-300 underline-offset-2 hover:decoration-red-700"
                    >
                      {text}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Les actions, à côté du formulaire sur grand écran. */}
          <div className="hidden flex-col gap-2 lg:flex">
            <button
              type="submit"
              disabled={!saveable || saving || autosaving || conflict || Boolean(blocked)}
              className="btn btn-primary w-full text-xs disabled:cursor-not-allowed disabled:opacity-55"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Enregistrement…
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" aria-hidden />
                  {dish ? 'Enregistrer les modifications' : 'Créer le plat'}
                </>
              )}
            </button>
            <Link href={backHref} onClick={confirmLeave} className="btn btn-outline w-full text-xs">
              Annuler
            </Link>
            {!saveable && (
              <p className="text-xs leading-relaxed text-ink-soft">
                Le nom et le temps de préparation sont nécessaires pour
                enregistrer.
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* Sur un téléphone, la barre suit : un bouton en pied de page longue se
          cherche, et ce formulaire se remplit souvent debout dans une cuisine. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(31,42,55,0.08)] bg-paper/95 backdrop-blur lg:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p
            role="status"
            className={`min-w-0 flex-1 text-[13px] ${barAlert ? 'font-semibold text-red-700' : 'text-ink-mid'}`}
          >
            {barWarning ??
              ((readiness?.problems.length ?? 0) > 0
                  ? `Il manque ${readiness!.problems.length} point${readiness!.problems.length > 1 ? 's' : ''} pour que la fiche soit Prête.`
                  : (readiness?.toPublish.length ?? 0) > 0
                    ? `La fiche est Prête ; il manque ${readiness!.toPublish.length} point${readiness!.toPublish.length > 1 ? 's' : ''} pour publier.`
                    : dish
                      ? 'La fiche est Prête : rien n’est public tant que vous ne publiez pas.'
                      : 'Enregistré en brouillon : rien n’est public tant que vous ne publiez pas.')}
          </p>
          <div className="flex gap-2">
            <Link href={backHref} onClick={confirmLeave} className="btn btn-outline text-xs">
              Annuler
            </Link>
            <button
              type="submit"
              disabled={!saveable || saving || autosaving || conflict || Boolean(blocked)}
              className="btn btn-primary text-xs disabled:cursor-not-allowed disabled:opacity-55"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> …
                </>
              ) : (
                'Enregistrer'
              )}
            </button>
          </div>
        </div>
      </div>
      <div aria-hidden className="h-16 lg:hidden" />
      </fieldset>
    </form>
  )
}

// ── Ce qu'il manque ─────────────────────────────────────────────────────────

/**
 * Un groupe du panneau « Prête ? » : chaque point renvoie à son champ (défilement
 * et focus). `rows` ramène le rang d'une ligne de l'API à la ligne affichée.
 */
function MissingGroup({
  title,
  note,
  items,
  rows,
  stepRows,
  alert = false,
}: {
  title: string
  note?: string
  items: Problem[]
  rows: number[]
  stepRows: number[]
  alert?: boolean
}) {
  if (items.length === 0) return null
  return (
    <div className="mt-3">
      <p className="text-[13px] font-semibold text-navy">
        {title}
        {note && <span className="ml-1.5 font-normal text-ink-soft">{note}</span>}
      </p>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((m) => {
          const target = fieldTarget(m.field, { rows, stepRows, code: m.code })
          return (
            <li
              key={`${m.code}-${m.field}`}
              className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-mid"
            >
              <span
                aria-hidden
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${alert ? 'bg-ink-soft' : 'bg-amber'}`}
              />
              {target ? (
                <button
                  type="button"
                  onClick={() => focusField(target)}
                  className="text-left underline decoration-ink-soft/40 underline-offset-2 hover:text-navy hover:decoration-navy"
                >
                  {problemText(m)}
                </button>
              ) : (
                problemText(m)
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ── Allergènes calculés, ajoutés, confirmés ─────────────────────────────────

/** Les lignes de la fiche enregistrée qui empêchent un calcul complet des allergènes. */
const blocksAllergens = (dish: Dish) =>
  (dish.readiness?.problems ?? []).filter(
    (p) => p.code === 'INGREDIENT_NOT_LINKED' || p.code === 'INGREDIENT_INCOMPLETE',
  )

/**
 * Les allergènes de la recette enregistrée, chacun avec sa provenance : les
 * ingrédients qui l'apportent, ou « ajouté par vous ». C'est ce que lit un
 * client allergique : un allergène n'est jamais présenté comme absent quand le
 * calcul est incomplet, et un code ancien (hors des quatorze) reste affiché,
 * en lecture seule, jusqu'à ce que Lab's Food le corrige.
 */
function RecipeAllergens({
  dish,
  options,
}: {
  dish: Dish | null
  options: { code: string; label: string }[]
}) {
  const sources = dish?.allergenSources ?? {}
  const added = new Set(dish?.addedAllergens ?? [])
  // Tout code de `allergens` s'affiche, et tout code ajouté : rien n'est jamais caché.
  const all = [
    ...new Set([...(dish?.allergens ?? []), ...Object.keys(sources), ...(dish?.addedAllergens ?? [])]),
  ]
  const legacy = new Set(legacyCodes(dish))
  const conditional = new Set(dish?.conditionalAllergens ?? [])
  const blocking = dish ? blocksAllergens(dish) : []
  /* Les allergènes hors des quatorze (« Autre ») : le client les lit aussi, la liste ne les tait pas. */
  const customs = dish?.customAllergens ?? []

  /** « beurre, crème ; ajouté par vous » : d'où vient l'allergène. */
  const provenance = (code: string) => {
    const from = sources[code] ?? []
    const byChef = added.has(code) || from.length === 0
    return [from.join(', '), byChef ? 'ajouté par vous' : ''].filter(Boolean).join(' ; ')
  }

  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-navy">
        Allergènes de la recette
        <InfoPopover label="D’où viennent les allergènes de la recette ?">
          De deux sources, indiquées pour chaque allergène. Les ingrédients de la liste
          commune portent les leurs : un tel allergène ne part qu’avec l’ingrédient qui
          l’apporte. Ceux que vous cochez plus bas s’y ajoutent (« ajouté par vous ») et
          se décochent au même endroit. Un ingrédient facultatif compte aussi : son
          allergène est marqué « si l’ingrédient facultatif est utilisé ». Ceux que vous
          écrivez dans « Autre », hors des quatorze, figurent aussi dans la liste. Un code
          ancien reste affiché jusqu’à ce que Lab’s Food le corrige.
        </InfoPopover>
      </p>
      {!dish ? (
        <p className="text-[13px] text-ink-soft">Affichés après le premier enregistrement.</p>
      ) : (
        <>
          {all.length > 0 || customs.length > 0 ? (
            <ul className="space-y-1.5">
              {all.map((code) => (
                <li
                  key={code}
                  className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-800"
                >
                  {legacy.has(code) ? (
                    <span>
                      <span className="font-semibold">code ancien ({code})</span>
                      {' : à faire corriger par Lab’s Food'}
                      {(sources[code] ?? []).length > 0 && ` (apporté par : ${sources[code].join(', ')})`}
                    </span>
                  ) : (
                    <span>
                      <span className="font-semibold">{refLabel(options, code)}</span>
                      {' : '}
                      {provenance(code)}
                    </span>
                  )}
                  {conditional.has(code) && (
                    <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[11px] font-semibold text-[#8B6200]">
                      si l’ingrédient facultatif est utilisé
                    </span>
                  )}
                </li>
              ))}
              {customs.map((c) => (
                <li
                  key={`autre-${c}`}
                  className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-800"
                >
                  <span>
                    <span className="font-semibold">{c}</span>
                    {' : hors des quatorze, indiqué par vous'}
                  </span>
                </li>
              ))}
            </ul>
          ) : dish.allergensNone && blocking.length === 0 ? (
            <p className="text-[13px] text-ink-mid">
              Aucun des quatorze allergènes dans vos ingrédients.
            </p>
          ) : (
            <p className="text-[13px] text-ink-mid">Aucun des quatorze allergènes pour l’instant.</p>
          )}
          {all.length === 0 && customs.length > 0 && blocking.length === 0 && (
            <p className="mt-1.5 text-xs text-ink-mid">
              Aucun des quatorze allergènes réglementaires dans vos ingrédients.
            </p>
          )}
          {blocking.length > 0 && (
            <div className="mt-2">
              <Note>
                {blocking.length === 1
                  ? 'Un ingrédient n’est pas relié à la liste commune, ou y est incomplet'
                  : `${blocking.length} ingrédients ne sont pas reliés à la liste commune, ou y sont incomplets`}
                {' '}: cette liste n’est pas complète, et un ingrédient non relié n’apporte aucun
                allergène au calcul. Ne la lisez pas comme « sans allergène ».
              </Note>
            </div>
          )}
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            D’après la fiche enregistrée : les lignes modifiées depuis ne comptent pas encore,
            la liste est mise à jour à l’enregistrement.
          </p>
        </>
      )}
    </div>
  )
}

/**
 * Les allergènes que le chef ajoute aux calculés : les quatorze seulement. Un
 * allergène calculé est coché et ne se décoche pas : il vient d'un ingrédient,
 * pas d'un choix. Un code ancien n'est pas ici : le chef ne peut ni le cocher ni
 * le retirer, il s'affiche dans « Allergènes de la recette ».
 */
function AddedAllergens({
  options,
  dish,
  added,
  onToggle,
}: {
  options: { code: string; label: string }[]
  dish: Dish | null
  added: string[]
  onToggle: (code: string) => void
}) {
  const sources = dish?.allergenSources ?? {}
  const all = options.filter((o) => isRegulatedAllergen(o.code))

  return (
    <fieldset>
      <legend className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-navy">
        Ajouter d’autres allergènes
        <InfoPopover label="Quand ajouter un allergène à la main ?">
          Pour une trace ou un ingrédient que la liste commune ne dit pas (une sauce
          achetée, par exemple). Il s’ajoute à ceux des ingrédients et ne les remplace pas.
        </InfoPopover>
      </legend>
      {all.length === 0 ? (
        <p className="text-xs text-ink-soft">Référentiel indisponible pour le moment.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
          {all.map((o) => {
            const computed = sources[o.code] !== undefined
            const reason = `reason-${o.code}`
            return (
              <li key={o.code}>
                <label className="flex items-start gap-2 text-[13px] text-navy">
                  <input
                    type="checkbox"
                    checked={computed || added.includes(o.code)}
                    disabled={computed}
                    onChange={() => onToggle(o.code)}
                    aria-describedby={computed ? reason : undefined}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-red-600"
                  />
                  <span>
                    {o.label}
                    {computed && (
                      <span id={reason} className="block text-xs text-ink-soft">
                        Déjà apporté par : {sources[o.code].join(', ')}. Il ne se décoche pas.
                      </span>
                    )}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </fieldset>
  )
}

/**
 * La confirmation des allergènes (§4.9), sur la fiche enregistrée : c'est elle
 * qui rend le plat réservable, et ses modifications en attente deviennent alors
 * une version. Elle envoie la version lue avec les allergènes : si la fiche a
 * changé depuis (409), le chef doit recharger et relire avant de confirmer.
 */
function AllergenCheck({
  dish,
  dirty,
  incompleteRows,
  badLinks,
  locked,
  lockVersion,
  onConfirmed,
  onConflict,
  onNotLinked,
}: {
  dish: Dish
  dirty: boolean
  /**
   * Les lignes commencées mais pas prêtes : elles ne partent pas, donc `dirty` ne
   * les voit pas, et leurs allergènes manquent à la fiche enregistrée.
   */
  incompleteRows: number
  /** Les liens refusés : ils ne partent pas non plus, la fiche diffère de l'écran. */
  badLinks: number
  /** Un conflit est affiché : on ne confirme plus. */
  locked: boolean
  lockVersion: number | undefined
  onConfirmed: (dish: Dish) => void
  onConflict: () => void
  /** Les rangs (lignes enregistrées) d'un `422 INGREDIENT_NOT_LINKED`. */
  onNotLinked: (lines: number[]) => void
}) {
  const confirm = useConfirmAllergens()
  const toast = useToast()
  const unlinked = (dish.readiness?.problems ?? []).filter((p) => p.code === 'INGREDIENT_NOT_LINKED').length
  const incomplete = (dish.readiness?.problems ?? []).filter((p) => p.code === 'INGREDIENT_INCOMPLETE').length
  const stale = lockVersion !== undefined && lockVersion !== dish.lockVersion
  const noLine = (dish.recipe?.ingredients.length ?? 0) === 0
  /* L'API refuse de confirmer un code hors des quatorze (422) : seul Lab's Food le corrige. */
  const legacy = legacyCodes(dish)

  const reason = locked
    ? 'Rechargez d’abord la recette : elle a changé ailleurs.'
    : dirty
      ? 'Enregistrez d’abord vos modifications : la confirmation porte sur la fiche enregistrée.'
      : incompleteRows > 0
        ? incompleteRows === 1
          ? 'Complétez ou retirez d’abord la ligne incomplète : ses allergènes ne sont pas comptés.'
          : `Complétez ou retirez d’abord les ${incompleteRows} lignes incomplètes : leurs allergènes ne sont pas comptés.`
      : badLinks > 0
        ? 'Corrigez ou videz d’abord le lien refusé : il n’est pas enregistré, et la confirmation porte sur la fiche enregistrée.'
      : noLine
        ? 'Ajoutez d’abord au moins un ingrédient.'
        : stale
          ? 'Les allergènes affichés se mettent à jour après votre enregistrement : patientez un instant.'
          : unlinked > 0
            ? `Reliez d’abord ${unlinked === 1 ? 'l’ingrédient non relié' : `les ${unlinked} ingrédients non reliés`} à la liste commune : la confirmation porte sur des allergènes complets.`
            : incomplete > 0
              ? `Complétez d’abord ${incomplete === 1 ? 'l’ingrédient dont les allergènes ne sont pas renseignés' : `les ${incomplete} ingrédients dont les allergènes ne sont pas renseignés`} dans la liste commune.`
              : legacy.length > 0
                ? `La fiche porte ${legacy.length === 1 ? 'un code ancien' : 'des codes anciens'} (${legacy.join(', ')}) : Lab’s Food doit ${legacy.length === 1 ? 'le' : 'les'} corriger avant que vous puissiez confirmer.`
                : null

  return (
    <div className="rounded-xl bg-cream-soft px-3.5 py-3">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
        <ShieldCheck
          className={`h-4 w-4 shrink-0 ${dish.allergensVerifiedAt ? 'text-mint-ink' : 'text-amber-deep'}`}
          aria-hidden
        />
        <span className="font-semibold text-navy">
          {dish.allergensVerifiedAt
            ? `Allergènes confirmés le ${new Date(dish.allergensVerifiedAt).toLocaleDateString('fr-FR')}`
            : 'Allergènes à confirmer'}
        </span>
        <InfoPopover label="Pourquoi confirmer les allergènes ?">
          Vous confirmez que les allergènes ci-dessus, calculés et ajoutés, correspondent
          à votre recette. Sans confirmation, le plat n’est pas Prête et ne peut pas être
          réservé. Ajouter, retirer ou renommer un ingrédient efface la confirmation ;
          changer une quantité, non.
        </InfoPopover>
      </p>
      {!dish.allergensVerifiedAt && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            id="confirm-allergens"
            type="button"
            onClick={() =>
              confirm.mutate(
                { id: dish.id, lockVersion },
                {
                  onSuccess: (res) => {
                    onConfirmed(res)
                    toast.success('Allergènes confirmés')
                  },
                  onError: (e) => {
                    // Périmée, ou recalculés autrement : le chef recharge et relit.
                    if (isConflict(e)) {
                      onConflict()
                      return
                    }
                    const lines = notLinkedLines(e)
                    if (lines) {
                      onNotLinked(lines)
                      toast.error(
                        'La confirmation a été refusée',
                        'Des ingrédients ne sont pas reliés à la liste commune : ils sont en rouge dans la recette.',
                      )
                      return
                    }
                    toast.error('La confirmation a été refusée', apiMessage(e))
                  },
                },
              )
            }
            disabled={reason !== null || confirm.isPending}
            aria-describedby={reason ? 'confirm-allergens-reason' : undefined}
            className="btn btn-outline text-xs disabled:cursor-not-allowed disabled:opacity-55"
          >
            {confirm.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Check className="h-3.5 w-3.5" aria-hidden />
            )}
            Confirmer les allergènes
          </button>
          {reason && (
            // Focusable (-1) : un lien du panneau « Prête ? » y mène quand le bouton est désactivé.
            <span
              id="confirm-allergens-reason"
              tabIndex={-1}
              className="text-xs leading-relaxed text-ink-soft"
            >
              {reason}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Version, PDF ────────────────────────────────────────────────────────────

function VersionCard({ dish }: { dish: Dish }) {
  const pdf = useRecipePdf()
  const toast = useToast()
  return (
    <section className="rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-5 lg:p-6">
      <h3 className="flex items-center gap-1 font-display text-base font-bold text-navy">
        Version {dish.recipeVersion}
        <InfoPopover label="Qu’est-ce qu’une version ?">
          Une prestation cuisine la version de la fiche en vigueur au moment de la
          réservation. Une nouvelle version naît quand la fiche redevient Prête, quand
          vous confirmez les allergènes ou quand vous publiez. Le brouillon enregistré
          entre-temps n’en crée pas.
        </InfoPopover>
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-mid">
        {dish.versionPending
          ? 'Des modifications attendent la prochaine version : les prestations suivent encore la précédente.'
          : 'Les prestations réservées suivent cette version.'}
      </p>
      <div className="mt-3 flex items-center gap-1">
        <button
          type="button"
          onClick={() =>
            pdf.mutate(
              { id: dish.id, name: dish.name },
              { onError: (e) => toast.error('Le PDF n’a pas pu être créé', apiMessage(e)) },
            )
          }
          disabled={pdf.isPending}
          className="btn btn-outline text-xs"
        >
          {pdf.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Download className="h-3.5 w-3.5" aria-hidden />
          )}
          Télécharger la fiche (PDF)
        </button>
        <InfoPopover label="Que contient le PDF ?">
          La fiche telle qu’enregistrée, avec un filigrane LAB’S FOOD sur chaque page :
          ingrédients, étapes, allergènes, matériel, conservation et réchauffage. Les
          modifications non enregistrées n’y figurent pas.
        </InfoPopover>
      </div>
    </section>
  )
}

// ── Adapter les portions (§4.12) ────────────────────────────────────────────

/**
 * Les quantités pour un autre nombre de portions, à l'affichage seulement : la
 * fiche garde ses portions de base. Les quantités fixes ne bougent pas.
 */
function PortionsPreview({ ingredients, base }: { ingredients: Ingredient[]; base: number }) {
  const [to, setTo] = useState('')
  const n = Number(to)
  if (ingredients.length === 0) return null

  return (
    <div className="mt-4 rounded-xl bg-cream-soft px-3.5 py-3">
      <label className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-navy">
        Voir les quantités pour
        <input
          type="number"
          min={0.5}
          step={0.5}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder={String(base)}
          className="input-base w-20 py-1.5"
        />
        portions
        <InfoPopover label="Comment les quantités sont-elles recalculées ?">
          Chaque quantité suit le nombre de portions, sauf les quantités fixes. Rien
          n’est arrondi avant l’affichage, et les pièces passent à l’unité supérieure.
          Un enfant compte pour une demi-portion. Les temps ne sont pas recalculés.
        </InfoPopover>
      </label>
      {n > 0 && n !== base && (
        <>
          <ul className="mt-2.5 space-y-1">
            {ingredients.map((i, k) => (
              <li
                key={`${i.name}-${k}`}
                className="flex items-baseline justify-between gap-3 text-[13px]"
              >
                <span className="text-navy">{i.name}</span>
                <span className="shrink-0 tabular-nums text-ink-mid">
                  {displayQuantity(scaledQty(i, base, n), i.unit)}
                  {i.fixedQuantity && <span className="ml-1.5 text-ink-soft">(fixe)</span>}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2.5">
            <Note>
              Vérifiez les temps de cuisson et la taille des ustensiles : ils ne suivent
              pas les quantités. Au besoin, prévenez le client d’un nouveau tarif.
            </Note>
          </div>
        </>
      )}
    </div>
  )
}

// ── Photo ───────────────────────────────────────────────────────────────────

/**
 * La photo d'un plat.
 *
 * L'envoi passe par le trio habituel — ticket, transfert direct, confirmation —
 * et a besoin de l'identifiant du plat. À la création il n'existe pas encore,
 * et `POST /me/dishes` n'accepte pas d'URL d'image : on l'annonce plutôt que
 * d'afficher un champ qui ne marcherait pas.
 */
function PhotoField({ dish }: { dish: Dish | null }) {
  const envoi = useDishPhoto()
  const retrait = useDeleteDishPhoto()
  const [erreur, setErreur] = useState<string | null>(null)
  const champ = useRef<HTMLInputElement>(null)

  if (!dish) {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-cream-soft px-3.5 py-3">
        <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
        <p className="text-[12px] leading-relaxed text-ink-mid">
          Enregistrez d’abord le plat : l’envoi d’une photo a besoin de son
          identifiant. Le champ s’ouvre juste après.
        </p>
      </div>
    )
  }

  function choisir(file: File | null) {
    setErreur(null)
    if (!file) return
    const probleme = checkPhoto(file)
    if (probleme) {
      setErreur(probleme)
      return
    }
    envoi.mutate(
      { id: dish!.id, file },
      {
        onSuccess: () => {
          if (champ.current) champ.current.value = ''
        },
        onError: (e) => setErreur(photoMessage(e)),
      },
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={champ}
          id={`photo-${dish.id}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => choisir(e.target.files?.[0] ?? null)}
        />
        <label
          htmlFor={`photo-${dish.id}`}
          className={`btn btn-outline cursor-pointer text-xs ${
            envoi.isPending ? 'pointer-events-none opacity-55' : ''
          }`}
        >
          {envoi.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Upload className="h-3.5 w-3.5" aria-hidden />
          )}
          {dish.imageUrl ? 'Remplacer la photo' : 'Envoyer une photo'}
        </label>
        {dish.imageUrl && (
          <button
            type="button"
            onClick={() =>
              retrait.mutate(dish.id, { onError: (e) => setErreur(photoMessage(e)) })
            }
            disabled={retrait.isPending}
            className="btn text-xs text-red-700 hover:bg-red-50"
          >
            {retrait.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <X className="h-3.5 w-3.5" aria-hidden />
            )}
            Retirer
          </button>
        )}
        <span className="text-[11px] text-ink-soft">JPG, PNG ou WebP</span>
      </div>

      {erreur && (
        <p role="alert" className="text-[12px] leading-relaxed text-red-700">
          {erreur}
        </p>
      )}

      {dish.imageUrl && (
        <div className="overflow-hidden rounded-2xl bg-cream-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dish.imageUrl}
            alt="Aperçu de la photo du plat"
            className="aspect-[16/9] w-full object-cover"
          />
        </div>
      )}
    </div>
  )
}

// ── Ingrédients et étapes ───────────────────────────────────────────────────

function IngredientRows({
  value,
  onEdit,
  duplicates,
  unlinked,
  problems,
}: {
  value: IngredientRow[]
  /** Applique une modification à la liste du moment (jamais à une copie ancienne). */
  onEdit: (fn: (rows: IngredientRow[]) => IngredientRow[]) => void
  /** Les groupes de lignes (indices affichés) qui disent la même chose. */
  duplicates: number[][]
  /** Les lignes (indices affichés) que la confirmation des allergènes a refusées : non reliées. */
  unlinked: number[]
  /** Les messages par id de champ (`ingredient-3-link`…), ceux du formulaire puis ceux de l'API. */
  problems: Record<string, string>
}) {
  const units = useUnits()
  const aisles = useAisles()
  /* Par la clé de la ligne, pas par son rang : un dialogue qui répond après coup
     modifie toujours sa propre ligne, même si d'autres ont bougé entre-temps. */
  const set = (key: string, patch: Partial<IngredientRow>) =>
    onEdit((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  const groupOf = (i: number) => duplicates.find((g) => g.includes(i))

  return (
    <div id="ingredients">
      <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">
        Ingrédients
        <InfoPopover label="Liste commune, quantité fixe, caché au client, à vérifier : de quoi s’agit-il ?">
          Tapez un nom et choisissez l’ingrédient dans la liste commune : c’est
          d’elle que se calculent les régimes, les allergènes et les saisons. S’il n’y
          est pas, créez le vôtre sans quitter la recette : il reste « à valider »
          jusqu’à ce que Lab’s Food le reprenne. Une quantité fixe ne change pas avec les
          portions (une feuille de laurier, une pincée de sel). « Facultatif » : ses
          allergènes ne comptent que « si utilisé ». « Caché au client » retire la ligne
          de la fiche du client, mais pas de la liste de courses. Le lien, facultatif,
          dit où acheter l’ingrédient. Un ingrédient « à vérifier » vient d’une recette
          importée : reliez-le à la liste, relisez-le, puis indiquez qu’il est vérifié —
          tant qu’il ne l’est pas, la fiche n’est pas Prête.
        </InfoPopover>
      </p>
      {value.length === 0 ? (
        <p className="mb-2 text-[13px] text-ink-soft">
          Aucun ingrédient : pas de liste de courses pour ce plat.
        </p>
      ) : (
        <ul className="mb-2 space-y-2">
          {value.map((ing, i) => {
            const complet = ingredientReady(ing)
            const amorcee = ingredientStarted(ing)
            const dup = groupOf(i)
            const refused = unlinked.includes(i)
            const linked = Boolean(ing.catalogIngredientId)
            const toTaste = ing.unit === TO_TASTE
            const qtyBad = ing.qty.trim() !== '' && !qtyValid(ing.qty)
            const verifiable = lineComplete(ing)
            return (
              <li
                key={ing.key}
                className={`flex flex-wrap items-center gap-2 rounded-xl ${
                  amorcee && !complet ? 'bg-cream-soft px-2 py-2' : ''
                } ${ing.toVerify ? 'bg-amber-soft/40 px-2 py-2' : ''} ${
                  dup || refused ? 'bg-red-50 px-2 py-2 ring-1 ring-red-300' : ''
                }`}
              >
                <IngredientName
                  row={ing}
                  index={i}
                  problem={problems[`ingredient-${i}-name`]}
                  onChange={(patch) => set(ing.key, patch)}
                />
                {!toTaste && (
                  <input
                    id={`ingredient-${i}-qty`}
                    type="number"
                    step="0.001"
                    min={0}
                    max={QTY_MAX}
                    value={ing.qty}
                    onChange={(e) => set(ing.key, { qty: e.target.value })}
                    placeholder="Qté"
                    aria-label={`Quantité de l’ingrédient ${i + 1}`}
                    {...invalidProps(problems, `ingredient-${i}-qty`, qtyBad)}
                    className={`input-base w-20 shrink-0 ${qtyBad ? 'border-red-400' : ''}`}
                  />
                )}
                <select
                  id={`ingredient-${i}-unit`}
                  value={ing.unit}
                  onChange={(e) =>
                    set(
                      ing.key,
                      e.target.value === TO_TASTE
                        ? { unit: e.target.value, qty: '' }
                        : { unit: e.target.value },
                    )
                  }
                  aria-label={`Unité de l’ingrédient ${i + 1}`}
                  {...invalidProps(problems, `ingredient-${i}-unit`)}
                  className="input-base w-32 shrink-0"
                >
                  <option value="">Unité</option>
                  {units.map((u) => (
                    <option key={u.code} value={u.code}>
                      {u.label}
                    </option>
                  ))}
                </select>
                {!linked && (
                  <select
                    id={`ingredient-${i}-aisle`}
                    value={ing.aisle ?? ''}
                    onChange={(e) => set(ing.key, { aisle: e.target.value })}
                    aria-label={`Rayon de l’ingrédient ${i + 1}`}
                    className="input-base w-40 shrink-0"
                  >
                    <option value="">Rayon</option>
                    {aisles.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => onEdit((rows) => rows.filter((r) => r.key !== ing.key))}
                  aria-label={`Retirer ${ing.name || 'cet ingrédient'}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                {qtyBad && (
                  <p role="alert" className="w-full text-xs text-red-700">
                    La quantité est un nombre au-dessus de 0, jusqu’à 100 000, avec 3 décimales
                    au plus.
                  </p>
                )}
                {/* Ce que le formulaire ou l'API refuse sur cette ligne, champ par champ. */}
                {Object.entries(problems)
                  .filter(([id]) => id.startsWith(`ingredient-${i}-`))
                  .map(([id, text]) => (
                    <p key={id} id={`${id}-problem`} role="alert" className="w-full text-xs font-semibold text-red-700">
                      {text}
                    </p>
                  ))}

                {dup && (
                  <p
                    role="alert"
                    className="flex w-full items-start gap-1.5 text-xs font-semibold text-red-700"
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>
                      Même ingrédient que{' '}
                      {dup
                        .filter((j) => j !== i)
                        .map((j) => `la ligne ${j + 1}`)
                        .join(', ')}{' '}
                      : fusionnez-les en une seule (additionnez les quantités).
                    </span>
                  </p>
                )}

                {refused && (
                  <p
                    role="alert"
                    className="flex w-full items-start gap-1.5 text-xs font-semibold text-red-700"
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    Cette ligne n’est pas reliée à la liste commune, ou son ingrédient y est
                    incomplet : la confirmation des allergènes est refusée tant que c’est le cas.
                  </p>
                )}

                {ing.rawText && (ing.toVerify || !linked) && (
                  <p className="w-full text-xs text-[#8B6200]">
                    Écrit à l’origine : <span className="font-semibold">« {ing.rawText} »</span>
                  </p>
                )}
                {amorcee && !linked && (
                  <p className="w-full text-xs font-semibold text-[#8B6200]">
                    {ing.toVerify
                      ? 'À vérifier : choisissez l’ingrédient dans la liste, ou créez-le, pour relier cette ligne.'
                      : 'Pas reliée à la liste : choisissez un ingrédient dans les suggestions, ou créez-le. Sans lien, la fiche n’est pas Prête.'}
                  </p>
                )}
                {linked && ing.aisle && (
                  <p className="w-full text-xs text-ink-soft">
                    Rayon : {aisleLabel(ing.aisle, aisles)}
                  </p>
                )}

                <div className="flex w-full flex-wrap items-center gap-2">
                  <input
                    id={`ingredient-${i}-precision`}
                    value={ing.precision}
                    maxLength={INGREDIENT_MAX.precision}
                    {...invalidProps(problems, `ingredient-${i}-precision`)}
                    onChange={(e) => set(ing.key, { precision: e.target.value })}
                    placeholder="Précision : bio, fermier…"
                    aria-label={`Précision de l’ingrédient ${i + 1}`}
                    className="input-base min-w-32 flex-1 py-1.5 text-[13px]"
                  />
                  <input
                    id={`ingredient-${i}-preparation`}
                    value={ing.preparation}
                    maxLength={INGREDIENT_MAX.preparation}
                    {...invalidProps(problems, `ingredient-${i}-preparation`)}
                    onChange={(e) => set(ing.key, { preparation: e.target.value })}
                    placeholder="Préparation : émincé, en dés…"
                    aria-label={`Préparation de l’ingrédient ${i + 1}`}
                    className="input-base min-w-32 flex-1 py-1.5 text-[13px]"
                  />
                  <input
                    id={`ingredient-${i}-group`}
                    value={ing.group}
                    maxLength={INGREDIENT_MAX.group}
                    {...invalidProps(problems, `ingredient-${i}-group`)}
                    onChange={(e) => set(ing.key, { group: e.target.value })}
                    placeholder="Groupe : Pour la sauce…"
                    aria-label={`Groupe de l’ingrédient ${i + 1}`}
                    className="input-base min-w-32 flex-1 py-1.5 text-[13px]"
                  />
                </div>
                <div className="flex w-full flex-wrap items-center gap-2">
                  <input
                    id={`ingredient-${i}-link`}
                    type="url"
                    value={ing.link}
                    maxLength={INGREDIENT_MAX.link}
                    onChange={(e) => set(ing.key, { link: e.target.value })}
                    placeholder="Lien (facultatif) : https://…"
                    aria-label={`Lien de l’ingrédient ${i + 1}`}
                    {...invalidProps(problems, `ingredient-${i}-link`)}
                    className="input-base min-w-40 flex-1 py-1.5 text-[13px]"
                  />
                  <label className="inline-flex items-center gap-1.5 text-xs text-ink-mid">
                    <input
                      type="checkbox"
                      checked={ing.fixedQuantity}
                      onChange={(e) => set(ing.key, { fixedQuantity: e.target.checked })}
                      aria-label={`Quantité fixe, ingrédient ${i + 1}`}
                      className="h-3.5 w-3.5 accent-navy"
                    />
                    Quantité fixe
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-ink-mid">
                    <input
                      type="checkbox"
                      checked={ing.optional}
                      onChange={(e) => set(ing.key, { optional: e.target.checked })}
                      aria-label={`Facultatif, ingrédient ${i + 1}`}
                      className="h-3.5 w-3.5 accent-navy"
                    />
                    Facultatif
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-ink-mid">
                    <input
                      type="checkbox"
                      checked={ing.hiddenFromClient}
                      onChange={(e) => set(ing.key, { hiddenFromClient: e.target.checked })}
                      aria-label={`Caché au client, ingrédient ${i + 1}`}
                      className="h-3.5 w-3.5 accent-navy"
                    />
                    Caché au client
                  </label>
                  {ing.toVerify && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-soft px-2.5 py-1 text-[11px] font-semibold text-[#8B6200]">
                      À vérifier
                      {/* Une ligne incomplète qui ne serait plus « à vérifier » sortirait de
                          l'envoi, et la fiche la perdrait au prochain enregistrement. */}
                      <button
                        type="button"
                        onClick={() => set(ing.key, { toVerify: false })}
                        disabled={!verifiable}
                        aria-describedby={verifiable ? undefined : `ingredient-${i}-verify-why`}
                        className="underline underline-offset-2 hover:text-navy disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
                      >
                        C’est vérifié
                      </button>
                    </span>
                  )}
                </div>
                {ing.toVerify && !verifiable && (
                  <p id={`ingredient-${i}-verify-why`} className="w-full text-xs text-[#8B6200]">
                    Pour la dire vérifiée, complétez la ligne : le nom, la quantité et l’unité (ou
                    « selon le goût »).
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <ProblemText id="ingredients" msgs={problems} />
      <button
        type="button"
        onClick={() => onEdit((rows) => [...rows, newIngredientRow()])}
        className="btn btn-outline text-xs"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden /> Ajouter un ingrédient
      </button>
    </div>
  )
}

/**
 * Le nom d'un ingrédient, avec les suggestions de la liste commune (§4.10).
 * Choisir une suggestion relie la ligne ; retaper le nom la délie. Quand rien
 * ne correspond, « Créer « … » » ouvre la création, sans quitter la recette.
 *
 * Relier une ligne est exigé pour « Prête » : tout se fait aussi au clavier,
 * comme une liste déroulante (le motif « combobox ») — flèches pour parcourir
 * les suggestions et « Créer », Entrée pour choisir, Échap pour fermer. Le focus
 * reste dans le champ ; l'option désignée est annoncée (`aria-activedescendant`).
 */
function IngredientName({
  row,
  index,
  problem,
  onChange,
}: {
  row: IngredientRow
  index: number
  /** Un refus sur le nom : le message est affiché sous la ligne, le champ y renvoie. */
  problem?: string
  onChange: (patch: Partial<IngredientRow>) => void
}) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  /** L'option désignée au clavier (flèches) ; -1 : aucune. */
  const [active, setActive] = useState(-1)
  const uid = useId()
  const listId = `${uid}-suggestions`
  const optionId = (k: number) => `${uid}-option-${k}`
  /** Le focus rendu au champ par le dialogue qui se ferme n'ouvre pas les suggestions. */
  const skipOpen = useRef(false)
  const closeDialog = () => {
    skipOpen.current = true
    setTimeout(() => {
      skipOpen.current = false
    }, 200)
    setCreating(false)
  }
  const allergens = useAllergens(REGULATED_ALLERGENS)
  const term = open && !row.catalogIngredientId ? row.name : ''
  const search = useIngredientSearch(term)
  const matches = search.data ?? []
  const typed = term.trim()
  const exact = matches.some((m) => m.name.toLowerCase() === typed.toLowerCase())
  const canCreate = typed.length >= 2 && !search.isFetching && !exact
  /* Les options, dans l'ordre : les suggestions, puis « Créer ». */
  const count = matches.length + (canCreate ? 1 : 0)
  const shown = open && count > 0
  const current = shown && active >= 0 && active < count ? active : -1

  /* L'option désignée reste visible quand la liste défile. */
  useEffect(() => {
    if (current >= 0) document.getElementById(optionId(current))?.scrollIntoView({ block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `optionId` ne dépend que de `uid`, listé.
  }, [current, uid])

  /**
   * Relie la ligne à une entrée : son rayon, et « caché » prérempli pour un
   * basique. Les allergènes de l'ancienne entrée ne valent plus : l'API écrira
   * ceux de la nouvelle au prochain enregistrement.
   */
  const link = (m: LinkedIngredient) => {
    onChange({
      name: m.name,
      catalogIngredientId: m.id,
      ...(m.aisle !== undefined ? { aisle: m.aisle ?? '' } : {}),
      ...(m.isBasic !== undefined ? { hiddenFromClient: m.isBasic } : {}),
      allergens: null,
      incomplete: null,
    })
    setOpen(false)
    setActive(-1)
    closeDialog()
  }

  /** Choisit l'option `k` : relie la ligne à la suggestion, ou ouvre la création. */
  const choose = (k: number) => {
    const m = matches[k]
    if (m) {
      link({ id: m.id, name: m.name, aisle: m.aisle, isBasic: m.isBasic })
      return
    }
    setCreating(true)
    setOpen(false)
    setActive(-1)
  }

  return (
    <div
      className="relative min-w-32 flex-1"
      onBlur={(e) => {
        // Le focus reste dans le bloc (une suggestion) : la liste reste ouverte.
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
        setOpen(false)
        setActive(-1)
      }}
    >
      <input
        value={row.name}
        maxLength={INGREDIENT_MAX.name}
        onChange={(e) => {
          // Retaper le nom délie la ligne : ce que l'API avait écrit pour l'entrée ne vaut plus.
          onChange({
            name: e.target.value,
            catalogIngredientId: null,
            allergens: null,
            incomplete: null,
          })
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => {
          if (!skipOpen.current) setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            const down = e.key === 'ArrowDown'
            setOpen(true)
            setActive((a) =>
              count === 0 ? -1 : a < 0 || a >= count ? (down ? 0 : count - 1) : (a + (down ? 1 : -1) + count) % count,
            )
          } else if (e.key === 'Enter' && shown) {
            // Liste ouverte : Entrée choisit, et n'enregistre pas le plat.
            e.preventDefault()
            if (current >= 0) choose(current)
          } else if (e.key === 'Escape' && shown) {
            e.preventDefault()
            setOpen(false)
            setActive(-1)
          }
        }}
        placeholder="Poulet fermier"
        id={`ingredient-${index}-name`}
        role="combobox"
        aria-label={`Ingrédient ${index + 1}`}
        aria-invalid={problem ? true : undefined}
        aria-describedby={problem ? `ingredient-${index}-name-problem` : undefined}
        aria-autocomplete="list"
        aria-expanded={shown}
        aria-controls={listId}
        aria-activedescendant={current >= 0 ? optionId(current) : undefined}
        className={`input-base w-full ${row.catalogIngredientId ? 'pr-16' : ''}`}
      />
      {row.catalogIngredientId && (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-mint/60 px-1.5 py-0.5 text-[10px] font-semibold text-mint-ink">
          liste
        </span>
      )}
      {shown && (
        <ul
          id={listId}
          role="listbox"
          aria-label={`Suggestions pour l’ingrédient ${index + 1}`}
          className="absolute z-30 mt-1 max-h-64 w-full min-w-64 overflow-y-auto rounded-xl border border-[rgba(31,42,55,0.1)] bg-paper py-1 shadow-lg"
        >
          {matches.map((m, k) => (
            <li key={m.id} role="none">
              {/* Le focus reste dans le champ (`aria-activedescendant`) : l'option ne le prend pas. */}
              <button
                type="button"
                id={optionId(k)}
                role="option"
                aria-selected={current === k}
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(k)}
                onClick={() => choose(k)}
                className={`block w-full px-3 py-1.5 text-left text-[13px] text-navy hover:bg-cream-soft ${
                  current === k ? 'bg-cream-soft' : ''
                }`}
              >
                <span className="flex flex-wrap items-center gap-1.5">
                  {m.name}
                  {m.private && (
                    <span className="rounded-full bg-amber-soft px-1.5 py-0.5 text-[10px] font-semibold text-[#8B6200]">
                      à valider
                    </span>
                  )}
                </span>
                {m.aliases.length > 0 && (
                  <span className="block text-[11px] text-ink-soft">{m.aliases.join(', ')}</span>
                )}
                <span className="mt-0.5 flex flex-wrap gap-1">
                  {m.allergensNone ? (
                    <span className="text-[11px] text-ink-soft">aucun allergène</span>
                  ) : (
                    m.allergens.map((a) => (
                      <span
                        key={a}
                        className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700"
                      >
                        {refLabel(allergens, a)}
                      </span>
                    ))
                  )}
                </span>
              </button>
            </li>
          ))}
          {canCreate && (
            <li role="none">
              <button
                type="button"
                id={optionId(matches.length)}
                role="option"
                aria-selected={current === matches.length}
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(matches.length)}
                onClick={() => choose(matches.length)}
                className={`block w-full border-t border-[rgba(31,42,55,0.08)] px-3 py-2 text-left text-[13px] font-semibold text-navy hover:bg-cream-soft ${
                  current === matches.length ? 'bg-cream-soft' : ''
                }`}
              >
                Créer « {typed} »
              </button>
            </li>
          )}
        </ul>
      )}
      {creating && (
        <IngredientCreateDialog
          open
          initialName={row.name.trim()}
          onClose={closeDialog}
          onLinked={link}
        />
      )}
    </div>
  )
}

function StepRows({
  value,
  problems,
  onEdit,
}: {
  value: StepRow[]
  /** Les messages par id de champ (`step-2-minutes`…), ceux du formulaire puis ceux de l'API. */
  problems: Record<string, string>
  /** Applique une modification à la liste du moment. */
  onEdit: (fn: (steps: StepRow[]) => StepRow[]) => void
}) {
  const types = useStepTypes()
  /* Par la clé de l'étape : l'étape en cours de frappe reste la sienne. */
  const set = (key: string, patch: Partial<StepRow>) =>
    onEdit((steps) => steps.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  const move = (i: number, by: -1 | 1) => {
    const j = i + by
    onEdit((steps) => {
      const next = [...steps]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
    /* Les étapes ont une clé : React déplace la ligne dans la page, et le bouton
       pressé perd le focus en route. On le lui rend, sur l'étape déplacée (l'autre
       flèche si celle-ci est désormais désactivée). */
    requestAnimationFrame(() => {
      const dir = by < 0 ? 'up' : 'down'
      const same = document.getElementById(`step-${j}-${dir}`) as HTMLButtonElement | null
      const other = document.getElementById(`step-${j}-${by < 0 ? 'down' : 'up'}`)
      ;(same && !same.disabled ? same : other)?.focus()
    })
  }

  return (
    <div id="steps" className="mt-5">
      <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">
        Étapes
        <InfoPopover label="Pourquoi un type par étape ?">
          Le type (préparation, cuisson, refroidissement, mise en boîte) range la
          session et la fiche. Une étape sans type empêche la fiche d’être Prête. La
          durée est facultative. Les flèches changent l’ordre.
        </InfoPopover>
      </p>
      {value.length === 0 ? (
        <p className="mb-2 text-[13px] text-ink-soft">
          Aucune étape écrite pour l’instant.
        </p>
      ) : (
        <ol className="mb-2 space-y-3">
          {value.map((step, i) => (
            <li key={step.key} className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-2.5 w-5 shrink-0 text-right text-xs tabular-nums text-ink-soft"
              >
                {i + 1}.
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <textarea
                  id={`step-${i}-text`}
                  value={step.text}
                  rows={2}
                  maxLength={DISH_LIMITS.stepText}
                  onChange={(e) => set(step.key, { text: e.target.value })}
                  aria-label={`Étape ${i + 1}`}
                  {...invalidProps(problems, `step-${i}-text`)}
                  className="input-base w-full resize-y"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    id={`step-${i}-type`}
                    value={step.type}
                    onChange={(e) => set(step.key, { type: e.target.value })}
                    aria-label={`Type de l’étape ${i + 1}`}
                    {...invalidProps(problems, `step-${i}-type`, step.text.trim() !== '' && !step.type)}
                    className="input-base w-44 py-1.5 text-[13px]"
                  >
                    <option value="">Type à choisir</option>
                    {types.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <input
                    id={`step-${i}-minutes`}
                    type="number"
                    min={0}
                    max={DISH_LIMITS.minutes}
                    step={1}
                    value={step.minutes}
                    onChange={(e) => set(step.key, { minutes: e.target.value })}
                    placeholder="Durée"
                    aria-label={`Durée de l’étape ${i + 1}, en minutes`}
                    {...invalidProps(problems, `step-${i}-minutes`)}
                    className="input-base w-24 py-1.5 text-[13px]"
                  />
                  <span className="text-xs text-ink-soft">min</span>
                </div>
                {Object.entries(problems)
                  .filter(([id]) => id.startsWith(`step-${i}-`))
                  .map(([id, text]) => (
                    <p key={id} id={`${id}-problem`} role="alert" className="text-xs font-semibold text-red-700">
                      {text}
                    </p>
                  ))}
              </div>
              <div className="mt-1 flex shrink-0 flex-col">
                <button
                  id={`step-${i}-up`}
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Monter l’étape ${i + 1}`}
                  className="flex h-7 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-cream-soft hover:text-navy disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  id={`step-${i}-down`}
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === value.length - 1}
                  aria-label={`Descendre l’étape ${i + 1}`}
                  className="flex h-7 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-cream-soft hover:text-navy disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onEdit((steps) => steps.filter((s) => s.key !== step.key))}
                  aria-label={`Retirer l’étape ${i + 1}`}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <ProblemText id="steps" msgs={problems} />
      <button
        type="button"
        onClick={() => onEdit((steps) => [...steps, newStepRow()])}
        className="btn btn-outline text-xs"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden /> Ajouter une étape
      </button>
    </div>
  )
}

// ── Petits blocs ────────────────────────────────────────────────────────────

/** `aria-invalid` et `aria-describedby` d'un champ, d'après son message (`also` : une autre raison de le marquer). */
function invalidProps(msgs: Record<string, string>, id: string, also = false) {
  return {
    'aria-invalid': also || Boolean(msgs[id]) || undefined,
    'aria-describedby': msgs[id] ? `${id}-problem` : undefined,
  }
}

/** Le message d'un champ refusé, sous le champ : son `aria-describedby` y renvoie. */
function ProblemText({ id, msgs }: { id: string; msgs: Record<string, string> }) {
  if (!msgs[id]) return null
  return (
    <span id={`${id}-problem`} role="alert" className="mt-1 block text-xs font-semibold text-red-700">
      {msgs[id]}
    </span>
  )
}

function Group({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-5 lg:p-6">
      <div>
        <h3 className="font-display text-base font-bold text-navy">{title}</h3>
        {hint && (
          <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-ink-soft">
            {hint}
          </p>
        )}
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  hint,
  required,
  popover,
  className = '',
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  /** Une explication à côté du libellé (`InfoPopover`). */
  popover?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-navy">
        {label}
        {required && <span className="text-terra"> *</span>}
        {popover}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-xs leading-relaxed text-ink-soft">{hint}</span>
      )}
    </label>
  )
}

/** Un avertissement qui n'empêche rien, mais qu'il faut avoir lu. */
function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-amber-soft/60 px-3.5 py-2.5 text-[12px] leading-relaxed text-[#8B6200]">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      {children}
    </p>
  )
}

function Chips({
  options,
  selected,
  onToggle,
  tone = 'navy',
}: {
  options: { code: string; label: string }[]
  selected: string[]
  onToggle: (code: string) => void
  tone?: 'navy' | 'danger'
}) {
  if (options.length === 0) {
    return <p className="text-xs text-ink-soft">Référentiel indisponible pour le moment.</p>
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = selected.includes(o.code)
        return (
          <li key={o.code}>
            <button
              type="button"
              onClick={() => onToggle(o.code)}
              aria-pressed={on}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                on
                  ? tone === 'danger'
                    ? 'bg-red-600 text-white'
                    : 'bg-navy text-white'
                  : 'bg-cream-soft text-ink-mid hover:text-navy'
              }`}
            >
              {o.label}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function FreeList({
  id,
  limits,
  problem,
  value,
  onChange,
  items,
  onAdd,
  onRemove,
  placeholder,
}: {
  /** L'id du champ de saisie : les messages et le panneau « Prête ? » y mènent. */
  id?: string
  /** Les bornes de l'API : combien d'éléments, et combien de caractères chacun. */
  limits?: { items: number; length: number }
  /** Ce que le formulaire ou l'API refuse sur la liste. */
  problem?: string
  value: string
  onChange: (v: string) => void
  items: string[]
  /** Renvoie `false` pour refuser la valeur : le champ garde alors ce qui a été tapé. */
  onAdd: (v: string) => void | boolean
  onRemove: (v: string) => void
  placeholder: string
}) {
  const full = limits !== undefined && items.length >= limits.items
  const add = () => {
    const v = value.trim()
    if (!v || items.includes(v) || full) return
    if (onAdd(v) === false) return
    onChange('')
  }
  return (
    <div>
      <div className="flex gap-2">
        <input
          id={id}
          value={value}
          maxLength={limits?.length}
          disabled={full}
          aria-invalid={problem ? true : undefined}
          aria-describedby={id && (problem || full) ? `${id}-problem` : undefined}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          className="input-base min-w-0 flex-1 py-2"
        />
        <button type="button" onClick={add} disabled={full} className="btn btn-outline text-xs disabled:opacity-55">
          Ajouter
        </button>
      </div>
      {(problem || full) && (
        <p
          id={id ? `${id}-problem` : undefined}
          role={problem ? 'alert' : undefined}
          className={`mt-1 text-xs ${problem ? 'font-semibold text-red-700' : 'text-ink-soft'}`}
        >
          {problem ?? `${limits!.items} au plus : retirez-en un pour en ajouter un autre.`}
        </p>
      )}
      {items.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {items.map((it) => (
            <li key={it}>
              <button
                type="button"
                onClick={() => onRemove(it)}
                className="inline-flex items-center gap-1.5 rounded-full bg-cream-soft px-3 py-1.5 text-xs text-navy hover:text-red-700"
              >
                {it}
                <X className="h-3 w-3" aria-hidden />
                <span className="sr-only">Retirer</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
