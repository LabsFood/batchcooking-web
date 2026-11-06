'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
import { apiMessage } from '@/lib/api/messages'
import { ApiError } from '@/lib/api/client'
import IngredientCreateDialog, { type LinkedIngredient } from './IngredientCreateDialog'
import {
  EMPTY_INGREDIENT,
  FREEZER_MONTHS,
  INGREDIENT_MAX,
  THAWING_MAX,
  QTY_MAX,
  TO_TASTE,
  MONTHS,
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
  aisleLabel,
  linkValid,
  qtyValid,
  reheatModesOf,
  scaledQty,
  seasonsLine,
  sentIndexes,
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

/** La fiche a changé ailleurs depuis qu'on l'a lue : rien n'a été écrit. */
const isConflict = (error: unknown) => apiCode(error, 409) === 'RECIPE_CONFLICT'

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
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')

/**
 * Ce que l'API refuserait sur la congélation, avec le message. Une valeur
 * manquante n'est pas ici : c'est un brouillon, et « Prête » la réclame.
 */
function storageInvalid(d: Draft): string | null {
  if (d.storageFreezable !== 'yes') return null
  if (d.storageMonths.trim() && !freezerMonthsValid(d.storageMonths)) {
    return `Les mois de congélation : un nombre entier de ${FREEZER_MONTHS.min} à ${FREEZER_MONTHS.max}.`
  }
  if (d.storageThawing.trim().length > THAWING_MAX) {
    return `La décongélation tient en ${THAWING_MAX} caractères au plus.`
  }
  return null
}

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
    addedAllergens: dish?.addedAllergens ?? [],
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

function toPayload(d: Draft): DishInput {
  const ingredients = cleanIngredients(d.ingredients)
  const steps = cleanSteps(d.steps)
  const hasRecipe = ingredients.length > 0 || steps.length > 0

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
    addedAllergens: d.addedAllergens ?? [],
    customAllergens: d.customAllergens ?? [],
    equipment: d.equipment,
    declaredDiets: d.declaredDiets,
    profiles: d.profiles,
    personalTags: d.personalTags,
    seasonsOverride: d.seasonsOverride,
    recipe: hasRecipe
      ? {
          ingredients,
          steps,
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
      : null,
  }
}

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
  onSave: (input: DishInput) => void
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
  const [reloadError, setReloadError] = useState<string | null>(null)
  /** Les lignes (rangs de l'API) qu'un `422 INGREDIENT_NOT_LINKED` a refusées. */
  const [notLinked, setNotLinked] = useState<number[]>([])
  const [customAllergenError, setCustomAllergenError] = useState<string | null>(null)

  const diets = useDiets()
  const allergens = useAllergens()
  const categories = useDishCategories()
  const reheatModes = useReheatModes(REHEAT_MODES)
  const computedDiets = useComputedDiets()
  const profiles = useRecipeProfiles()

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }))
  const toggle = (k: 'diets' | 'addedAllergens', code: string) =>
    setD((p) => ({
      ...p,
      [k]: p[k]!.includes(code) ? p[k]!.filter((x) => x !== code) : [...p[k]!, code],
    }))

  const saveable = d.name.trim().length >= 2 && d.prepMinutes > 0

  /* Ce qui diffère de la fiche enregistrée, comparé tel que l'API le recevrait. */
  const payload = toPayload(d)
  const saved = useMemo(() => (dish ? JSON.stringify(toPayload(toDraft(dish))) : null), [dish])
  const dirty = saved === null || JSON.stringify(payload) !== saved

  /* Un conflit : la fiche a changé ailleurs. Plus aucun enregistrement, automatique
     ou non, tant qu'on n'a pas rechargé : renvoyer la nouvelle version à notre
     place écraserait l'autre modification. Une liste relue qui porte une version
     plus récente que la nôtre le dit aussi, avant même d'avoir essayé. */
  const conflict =
    conflictSeen ||
    (isConflict(saveError) && saveError !== conflictDismissed) ||
    isConflict(autosaveError) ||
    Boolean(dish && lockVersion !== undefined && dish.lockVersion > lockVersion)

  /* Le brouillon s'enregistre seul tant que la fiche n'est pas Prête : un
     enregistrement d'une fiche Prête crée une version (R6), et une version ne
     naît pas d'une frappe au clavier. */
  const autosave = Boolean(
    dish && onAutosave && dish.status === 'draft' && !dish.readiness?.ready,
  )
  /** Ce qui s'envoie : la fiche, avec la version lue. */
  const withLock = (input: DishInput): DishInput =>
    dish && lockVersion !== undefined ? { ...input, lockVersion } : input

  const storageProblem = storageInvalid(d)
  useEffect(() => {
    if (!autosave || !dirty || !saveable || saving || autosaving || conflict || storageProblem) return
    const t = setTimeout(() => {
      setAutosaving(true)
      onAutosave!(withLock(toPayload(d)))
        .then((res) => {
          setLockVersion(res.lockVersion)
          setAutosaved(new Date())
          setAutosaveFailed(false)
          setAutosaveError(null)
        })
        .catch((e: unknown) => {
          setAutosaveFailed(true)
          setAutosaveError(e)
          if (isConflict(e)) setConflictSeen(true)
        })
        .finally(() => setAutosaving(false))
    }, 2500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `withLock` ne change qu'avec `lockVersion`, listé.
  }, [d, autosave, dirty, saveable, saving, autosaving, conflict, storageProblem, lockVersion, onAutosave])

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
      setD(toDraft(fresh))
      setLockVersion(fresh.lockVersion)
      setConflictSeen(false)
      setConflictDismissed(saveError)
      setAutosaveFailed(false)
      setAutosaveError(null)
      setDupDismissed(dupError ?? null)
      setNotLinked([])
    } catch (e) {
      setReloadError(apiMessage(e, 'Le plat n’a pas pu être rechargé.'))
    } finally {
      setReloading(false)
    }
  }

  const readiness = dish?.readiness
  const manques = readiness ? [...readiness.problems, ...readiness.toPublish] : []

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
  const reheatNoteLost = d.reheatModes.length === 0 && d.reheatNote.trim() !== ''
  const blocked = storageProblem

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (saveable && !saving && !autosaving && !conflict && !blocked) onSave(withLock(toPayload(d)))
      }}
      className="space-y-6"
    >
      <Link
        href={backHref}
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
          <p className="relative mt-3 text-xs text-white/80">
            {autosaveFailed
              ? 'Le brouillon n’a pas pu s’enregistrer : vos modifications restent sur cette page.'
              : autosaved && !dirty
                ? `Brouillon enregistré à ${heure(autosaved)}`
                : autosave
                  ? 'Brouillon : il s’enregistre tout seul pendant que vous écrivez.'
                  : `Version ${dish.recipeVersion}`}
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
                onChange={(e) => set('name', e.target.value)}
                placeholder="Poulet rôti aux herbes"
                className="input-base"
              />
            </Field>
            <Field
              label="Description courte"
              hint="Ce que le client lit sur la carte. Demandée pour publier."
            >
              <textarea
                id="dish-description"
                value={d.description ?? ''}
                onChange={(e) => set('description', e.target.value)}
                rows={3}
                placeholder="Poulet fermier rôti, thym et romarin, pommes de terre grenaille."
                className="input-base resize-y"
              />
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
                  min={1}
                  value={d.portions ?? 4}
                  onChange={(e) => set('portions', Number(e.target.value))}
                  className="input-base"
                />
              </Field>
              <Field label="Prépa (min)" required>
                <input
                  type="number"
                  min={1}
                  value={d.prepMinutes}
                  onChange={(e) => set('prepMinutes', Number(e.target.value))}
                  className="input-base"
                />
              </Field>
              <Field label="Cuisson (min)" hint="0 si le plat ne cuit pas.">
                <input
                  id="dish-cook"
                  type="number"
                  min={0}
                  value={d.cookMinutes ?? ''}
                  onChange={(e) =>
                    set('cookMinutes', e.target.value ? Number(e.target.value) : null)
                  }
                  className="input-base"
                />
              </Field>
              <Field label="Difficulté">
                <select
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

            <div>
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
              <ComputedAllergens dish={dish} options={allergens} />

              <AddedAllergens
                options={allergens}
                dish={dish}
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

              {dish && (
                <AllergenCheck
                  dish={dish}
                  dirty={dirty}
                  locked={conflict}
                  lockVersion={lockVersion}
                  onConfirmed={(v) => setLockVersion(v)}
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
              onChange={(v) => {
                set('ingredients', v)
                if (dupError) setDupDismissed(dupError)
                if (notLinked.length > 0) setNotLinked([])
              }}
              duplicates={dupRows}
              unlinked={notLinkedRows}
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
                Un lien doit commencer par http:// ou https:// : sinon il n’est pas
                enregistré.
              </Note>
            )}

            <PortionsPreview
              ingredients={cleanIngredients(d.ingredients)}
              base={d.portions ?? 4}
            />

            <StepRows value={d.steps} onChange={(v) => set('steps', v)} />
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
                  type="number"
                  min={0}
                  value={d.reheatTemperature}
                  onChange={(e) => set('reheatTemperature', e.target.value)}
                  placeholder="160"
                  className="input-base"
                />
              </Field>
              <Field label="Durée (min)">
                <input
                  type="number"
                  min={0}
                  value={d.reheatMinutes}
                  onChange={(e) => set('reheatMinutes', e.target.value)}
                  placeholder="15"
                  className="input-base"
                />
              </Field>
              <Field label="Contenant conseillé">
                <input
                  value={d.reheatContainer}
                  onChange={(e) => set('reheatContainer', e.target.value)}
                  placeholder="Plat en verre"
                  className="input-base"
                />
              </Field>
            </div>
            <Field
              label="Consignes de réchauffage"
              required
              hint="Une phrase, celle que vous diriez de vive voix. Demandée pour que la fiche soit Prête."
            >
              <input
                id="reheat-note"
                aria-invalid={reheatNoteMissing || undefined}
                value={d.reheatNote}
                onChange={(e) => set('reheatNote', e.target.value)}
                placeholder="Ajoutez une cuillère de bouillon pour éviter le dessèchement."
                maxLength={300}
                className="input-base"
              />
            </Field>
            {reheatNoteMissing && (
              <Note>Les consignes de réchauffage sont nécessaires pour que la fiche soit Prête.</Note>
            )}
            {reheatNoteLost && (
              <Note>
                Les consignes ne s’enregistrent qu’avec un mode de réchauffage : cochez-en un
                plus haut.
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
                  type="number"
                  min={0}
                  value={d.storageDays}
                  onChange={(e) => set('storageDays', e.target.value)}
                  placeholder="3"
                  aria-invalid={
                    (Boolean(d.storageMethod) && !d.storageDays.trim()) || undefined
                  }
                  className="input-base"
                />
              </Field>
              <Field label="Contenant">
                <input
                  value={d.storageContainer}
                  onChange={(e) => set('storageContainer', e.target.value)}
                  placeholder="Boîte hermétique"
                  className="input-base"
                />
              </Field>
            </div>

            <fieldset id="storage-freezable" aria-describedby="storage-freezable-hint">
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
                    aria-invalid={
                      (d.storageMonths.trim() !== '' && !freezerMonthsValid(d.storageMonths)) ||
                      undefined
                    }
                    className="input-base"
                  />
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
                    aria-invalid={d.storageThawing.trim() === '' || undefined}
                    className="input-base"
                  />
                </Field>
              </div>
            )}
            {freezeYes && (!d.storageMonths.trim() || !d.storageThawing.trim()) && (
              <Note>
                Un plat congelable demande les mois de conservation et la façon de le
                décongeler pour que la fiche soit Prête.
              </Note>
            )}
            {storageProblem && (
              <p role="alert" className="text-xs font-semibold text-red-700">
                {storageProblem} Corrigez-la pour enregistrer.
              </p>
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
                {manques.length === 0 && (
                  <p className="mt-2 flex items-start gap-2 text-[13px] leading-relaxed text-mint-ink">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    La fiche est Prête et publiable. Vous publierez depuis la liste de vos
                    plats, quand il vous conviendra.
                  </p>
                )}
                <MissingGroup
                  title="Pour être Prête, il manque"
                  items={readiness?.problems ?? []}
                  rows={sentRows}
                />
                <MissingGroup
                  title="Pour publier, il manque"
                  items={readiness?.toPublish ?? []}
                  rows={sentRows}
                />
                <MissingGroup
                  title="À surveiller"
                  note="Ces points n’empêchent rien."
                  items={readiness?.warnings ?? []}
                  rows={sentRows}
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

          {error && !isConflict(saveError) && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-2xl bg-red-50 p-3.5 text-[13px] leading-relaxed text-red-700"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {error}
            </p>
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
            <Link href={backHref} className="btn btn-outline w-full text-xs">
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
          <p className="min-w-0 flex-1 text-[13px] text-ink-mid">
            {!saveable
              ? 'Le nom et le temps de préparation sont nécessaires.'
              : manques.length > 0
                ? `Il manque ${manques.length} point${manques.length > 1 ? 's' : ''} pour publier.`
                : dish
                  ? 'La fiche est Prête : rien n’est public tant que vous ne publiez pas.'
                  : 'Enregistré en brouillon : rien n’est public tant que vous ne publiez pas.'}
          </p>
          <div className="flex gap-2">
            <Link href={backHref} className="btn btn-outline text-xs">
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
  alert = false,
}: {
  title: string
  note?: string
  items: Problem[]
  rows: number[]
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
          const target = fieldTarget(m.field, rows)
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
 * Les allergènes calculés, avec les ingrédients qui les apportent. C'est ce que
 * lit un client allergique : un allergène n'est jamais présenté comme absent
 * quand le calcul est incomplet.
 */
function ComputedAllergens({
  dish,
  options,
}: {
  dish: Dish | null
  options: { code: string; label: string }[]
}) {
  const sources = dish?.allergenSources ?? {}
  const computed = Object.keys(sources)
  const conditional = new Set(dish?.conditionalAllergens ?? [])
  const blocking = dish ? blocksAllergens(dish) : []

  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-navy">
        Calculés d’après vos ingrédients
        <InfoPopover label="D’où viennent les allergènes calculés ?">
          Chaque ingrédient de la liste commune porte ses allergènes : la fiche les
          rassemble. Vous ne les modifiez pas ici, mais vous pouvez en ajouter ci-dessous.
          Un ingrédient facultatif compte aussi : son allergène est marqué « si
          l’ingrédient facultatif est utilisé ».
        </InfoPopover>
      </p>
      {!dish ? (
        <p className="text-[13px] text-ink-soft">Calculés après le premier enregistrement.</p>
      ) : (
        <>
          {computed.length > 0 ? (
            <ul className="space-y-1.5">
              {computed.map((code) => (
                <li
                  key={code}
                  className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-800"
                >
                  <span>
                    <span className="font-semibold">{refLabel(options, code)}</span>
                    {' : '}
                    {sources[code].join(', ')}
                  </span>
                  {conditional.has(code) && (
                    <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[11px] font-semibold text-[#8B6200]">
                      si l’ingrédient facultatif est utilisé
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : dish.allergensNone && blocking.length === 0 ? (
            <p className="text-[13px] text-ink-mid">
              Aucun des quatorze allergènes dans vos ingrédients.
            </p>
          ) : (
            <p className="text-[13px] text-ink-mid">Aucun allergène calculé pour l’instant.</p>
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
 * Les allergènes que le chef ajoute aux calculés. Un allergène calculé est coché
 * et ne se décoche pas : il vient d'un ingrédient, pas d'un choix.
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
  /* Un code ancien, hors des quatorze, déjà ajouté : il reste visible et se retire. */
  const legacy = added.filter((c) => !options.some((o) => o.code === c))
  const all = [...options, ...legacy.map((code) => ({ code, label: code }))]

  return (
    <fieldset>
      <legend className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-navy">
        Ajouter d’autres allergènes
        <InfoPopover label="Quand ajouter un allergène à la main ?">
          Pour une trace ou un ingrédient que la liste commune ne dit pas (une sauce
          achetée, par exemple). Il s’ajoute à ceux des ingrédients et ne les remplace pas.
        </InfoPopover>
      </legend>
      {options.length === 0 ? (
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
                    {!options.some((x) => x.code === o.code) && (
                      <span className="block text-xs text-[#8B6200]">
                        Code ancien, hors des quatorze : décochez-le pour le retirer.
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
  locked,
  lockVersion,
  onConfirmed,
  onConflict,
  onNotLinked,
}: {
  dish: Dish
  dirty: boolean
  /** Un conflit est affiché : on ne confirme plus. */
  locked: boolean
  lockVersion: number | undefined
  onConfirmed: (lockVersion: number) => void
  onConflict: () => void
  /** Les rangs (lignes enregistrées) d'un `422 INGREDIENT_NOT_LINKED`. */
  onNotLinked: (lines: number[]) => void
}) {
  const confirm = useConfirmAllergens()
  const toast = useToast()
  const blocking = blocksAllergens(dish).length
  const noLine = (dish.recipe?.ingredients.length ?? 0) === 0

  const reason = locked
    ? 'Rechargez d’abord la recette : elle a changé ailleurs.'
    : dirty
      ? 'Enregistrez d’abord vos modifications : la confirmation porte sur la fiche enregistrée.'
      : noLine
        ? 'Ajoutez d’abord au moins un ingrédient.'
        : blocking > 0
          ? `Reliez d’abord ${blocking === 1 ? 'l’ingrédient non relié' : `les ${blocking} ingrédients non reliés`} à la liste commune : la confirmation porte sur des allergènes complets.`
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
            type="button"
            onClick={() =>
              confirm.mutate(
                { id: dish.id, lockVersion },
                {
                  onSuccess: (res) => {
                    onConfirmed(res.lockVersion)
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
            <span
              id="confirm-allergens-reason"
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
  onChange,
  duplicates,
  unlinked,
}: {
  value: IngredientRow[]
  onChange: (v: IngredientRow[]) => void
  /** Les groupes de lignes (indices affichés) qui disent la même chose. */
  duplicates: number[][]
  /** Les lignes (indices affichés) que la confirmation des allergènes a refusées : non reliées. */
  unlinked: number[]
}) {
  const units = useUnits()
  const aisles = useAisles()
  const set = (i: number, patch: Partial<IngredientRow>) =>
    onChange(value.map((row, j) => (j === i ? { ...row, ...patch } : row)))
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
            return (
              <li
                key={i}
                className={`flex flex-wrap items-center gap-2 rounded-xl ${
                  amorcee && !complet ? 'bg-cream-soft px-2 py-2' : ''
                } ${ing.toVerify ? 'bg-amber-soft/40 px-2 py-2' : ''} ${
                  dup || refused ? 'bg-red-50 px-2 py-2 ring-1 ring-red-300' : ''
                }`}
              >
                <IngredientName
                  row={ing}
                  index={i}
                  onChange={(patch) => set(i, patch)}
                />
                {!toTaste && (
                  <input
                    id={`ingredient-${i}-qty`}
                    type="number"
                    step="0.001"
                    min={0}
                    max={QTY_MAX}
                    value={ing.qty}
                    onChange={(e) => set(i, { qty: e.target.value })}
                    placeholder="Qté"
                    aria-label={`Quantité de l’ingrédient ${i + 1}`}
                    aria-invalid={qtyBad || undefined}
                    className={`input-base w-20 shrink-0 ${qtyBad ? 'border-red-400' : ''}`}
                  />
                )}
                <select
                  id={`ingredient-${i}-unit`}
                  value={ing.unit}
                  onChange={(e) =>
                    set(
                      i,
                      e.target.value === TO_TASTE
                        ? { unit: e.target.value, qty: '' }
                        : { unit: e.target.value },
                    )
                  }
                  aria-label={`Unité de l’ingrédient ${i + 1}`}
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
                    onChange={(e) => set(i, { aisle: e.target.value })}
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
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
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
                    value={ing.precision}
                    maxLength={INGREDIENT_MAX.precision}
                    onChange={(e) => set(i, { precision: e.target.value })}
                    placeholder="Précision : bio, fermier…"
                    aria-label={`Précision de l’ingrédient ${i + 1}`}
                    className="input-base min-w-32 flex-1 py-1.5 text-[13px]"
                  />
                  <input
                    value={ing.preparation}
                    maxLength={INGREDIENT_MAX.preparation}
                    onChange={(e) => set(i, { preparation: e.target.value })}
                    placeholder="Préparation : émincé, en dés…"
                    aria-label={`Préparation de l’ingrédient ${i + 1}`}
                    className="input-base min-w-32 flex-1 py-1.5 text-[13px]"
                  />
                  <input
                    value={ing.group}
                    maxLength={INGREDIENT_MAX.group}
                    onChange={(e) => set(i, { group: e.target.value })}
                    placeholder="Groupe : Pour la sauce…"
                    aria-label={`Groupe de l’ingrédient ${i + 1}`}
                    className="input-base min-w-32 flex-1 py-1.5 text-[13px]"
                  />
                </div>
                <div className="flex w-full flex-wrap items-center gap-2">
                  <input
                    type="url"
                    value={ing.link}
                    maxLength={INGREDIENT_MAX.link}
                    onChange={(e) => set(i, { link: e.target.value })}
                    placeholder="Lien (facultatif) : https://…"
                    aria-label={`Lien de l’ingrédient ${i + 1}`}
                    aria-invalid={!linkValid(ing.link) || undefined}
                    className="input-base min-w-40 flex-1 py-1.5 text-[13px]"
                  />
                  <label className="inline-flex items-center gap-1.5 text-xs text-ink-mid">
                    <input
                      type="checkbox"
                      checked={ing.fixedQuantity}
                      onChange={(e) => set(i, { fixedQuantity: e.target.checked })}
                      className="h-3.5 w-3.5 accent-navy"
                    />
                    Quantité fixe
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-ink-mid">
                    <input
                      type="checkbox"
                      checked={ing.optional}
                      onChange={(e) => set(i, { optional: e.target.checked })}
                      className="h-3.5 w-3.5 accent-navy"
                    />
                    Facultatif
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-ink-mid">
                    <input
                      type="checkbox"
                      checked={ing.hiddenFromClient}
                      onChange={(e) => set(i, { hiddenFromClient: e.target.checked })}
                      className="h-3.5 w-3.5 accent-navy"
                    />
                    Caché au client
                  </label>
                  {ing.toVerify && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-soft px-2.5 py-1 text-[11px] font-semibold text-[#8B6200]">
                      À vérifier
                      <button
                        type="button"
                        onClick={() => set(i, { toVerify: false })}
                        className="underline underline-offset-2 hover:text-navy"
                      >
                        C’est vérifié
                      </button>
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <button
        type="button"
        onClick={() => onChange([...value, { ...EMPTY_INGREDIENT, aisle: '' }])}
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
 */
function IngredientName({
  row,
  index,
  onChange,
}: {
  row: IngredientRow
  index: number
  onChange: (patch: Partial<IngredientRow>) => void
}) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const allergens = useAllergens()
  const term = open && !row.catalogIngredientId ? row.name : ''
  const search = useIngredientSearch(term)
  const matches = search.data ?? []
  const typed = term.trim()
  const exact = matches.some((m) => m.name.toLowerCase() === typed.toLowerCase())
  const canCreate = typed.length >= 2 && !search.isFetching && !exact

  /** Relie la ligne à une entrée : son rayon, et « caché » prérempli pour un basique. */
  const link = (m: LinkedIngredient) => {
    onChange({
      name: m.name,
      catalogIngredientId: m.id,
      ...(m.aisle !== undefined ? { aisle: m.aisle ?? '' } : {}),
      ...(m.isBasic !== undefined ? { hiddenFromClient: m.isBasic } : {}),
    })
    setOpen(false)
    setCreating(false)
  }

  return (
    <div className="relative min-w-32 flex-1">
      <input
        value={row.name}
        maxLength={INGREDIENT_MAX.name}
        onChange={(e) => {
          onChange({ name: e.target.value, catalogIngredientId: null })
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Poulet fermier"
        id={`ingredient-${index}-name`}
        aria-label={`Ingrédient ${index + 1}`}
        aria-autocomplete="list"
        className={`input-base w-full ${row.catalogIngredientId ? 'pr-16' : ''}`}
      />
      {row.catalogIngredientId && (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-mint/60 px-1.5 py-0.5 text-[10px] font-semibold text-mint-ink">
          liste
        </span>
      )}
      {open && (matches.length > 0 || canCreate) && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full min-w-64 overflow-y-auto rounded-xl border border-[rgba(31,42,55,0.1)] bg-paper py-1 shadow-lg"
        >
          {matches.map((m) => (
            <li key={m.id} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => link({ id: m.id, name: m.name, aisle: m.aisle, isBasic: m.isBasic })}
                className="block w-full px-3 py-1.5 text-left text-[13px] text-navy hover:bg-cream-soft"
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
            <li role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setCreating(true)
                  setOpen(false)
                }}
                className="block w-full border-t border-[rgba(31,42,55,0.08)] px-3 py-2 text-left text-[13px] font-semibold text-navy hover:bg-cream-soft"
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
          onClose={() => setCreating(false)}
          onLinked={link}
        />
      )}
    </div>
  )
}

function StepRows({
  value,
  onChange,
}: {
  value: StepRow[]
  onChange: (v: StepRow[]) => void
}) {
  const types = useStepTypes()
  const set = (i: number, patch: Partial<StepRow>) =>
    onChange(value.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  const move = (i: number, by: -1 | 1) => {
    const next = [...value]
    ;[next[i], next[i + by]] = [next[i + by], next[i]]
    onChange(next)
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
            <li key={i} className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-2.5 w-5 shrink-0 text-right text-xs tabular-nums text-ink-soft"
              >
                {i + 1}.
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <textarea
                  value={step.text}
                  rows={2}
                  onChange={(e) => set(i, { text: e.target.value })}
                  aria-label={`Étape ${i + 1}`}
                  className="input-base w-full resize-y"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    id={`step-${i}-type`}
                    value={step.type}
                    onChange={(e) => set(i, { type: e.target.value })}
                    aria-label={`Type de l’étape ${i + 1}`}
                    aria-invalid={(step.text.trim() !== '' && !step.type) || undefined}
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
                    type="number"
                    min={0}
                    value={step.minutes}
                    onChange={(e) => set(i, { minutes: e.target.value })}
                    placeholder="Durée"
                    aria-label={`Durée de l’étape ${i + 1}, en minutes`}
                    className="input-base w-24 py-1.5 text-[13px]"
                  />
                  <span className="text-xs text-ink-soft">min</span>
                </div>
              </div>
              <div className="mt-1 flex shrink-0 flex-col">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Monter l’étape ${i + 1}`}
                  className="flex h-7 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-cream-soft hover:text-navy disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
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
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
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
      <button
        type="button"
        onClick={() => onChange([...value, { text: '', type: '', minutes: '' }])}
        className="btn btn-outline text-xs"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden /> Ajouter une étape
      </button>
    </div>
  )
}

// ── Petits blocs ────────────────────────────────────────────────────────────

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
  value,
  onChange,
  items,
  onAdd,
  onRemove,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  items: string[]
  /** Renvoie `false` pour refuser la valeur : le champ garde alors ce qui a été tapé. */
  onAdd: (v: string) => void | boolean
  onRemove: (v: string) => void
  placeholder: string
}) {
  const add = () => {
    const v = value.trim()
    if (!v || items.includes(v)) return
    if (onAdd(v) === false) return
    onChange('')
  }
  return (
    <div>
      <div className="flex gap-2">
        <input
          value={value}
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
        <button type="button" onClick={add} className="btn btn-outline text-xs">
          Ajouter
        </button>
      </div>
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
