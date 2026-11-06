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
import { problemText } from '@/lib/chef/readiness'
import {
  DECLARED_DIETS,
  refLabel,
  useAllergens,
  useComputedDiets,
  useDiets,
  useDishCategories,
  useRecipeProfiles,
  useReheatModes,
  useStepTypes,
} from '@/lib/api/referentials'
import { apiMessage } from '@/lib/api/messages'
import {
  AISLES,
  EMPTY_INGREDIENT,
  MONTHS,
  REHEAT_MODES,
  STORAGE_METHODS,
  UNITS,
  cleanIngredients,
  cleanReheating,
  cleanSteps,
  cleanStorage,
  displayQuantity,
  ingredientReady,
  ingredientStarted,
  aisleLabel,
  linkValid,
  reheatModesOf,
  scaledQty,
  seasonsLine,
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
    allergens: dish?.allergens ?? [],
    allergensNone: dish?.allergensNone ?? false,
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
    allergens: d.allergensNone ? [] : d.allergens,
    allergensNone: d.allergensNone,
    customAllergens: d.allergensNone ? [] : d.customAllergens,
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
  saving,
  error,
  backHref,
}: {
  /** Plat existant, ou null pour une création. */
  dish: Dish | null
  /** Le nom du plat dont celui-ci est la copie (§5.4), s'il est encore là. */
  variantOfName?: string | null
  onSave: (input: DishInput) => void
  /** Enregistre le brouillon sans quitter la page (plat existant, pas encore Prête). */
  onAutosave?: (input: DishInput) => Promise<unknown>
  saving: boolean
  error: string | null
  backHref: string
}) {
  const [d, setD] = useState<Draft>(() => toDraft(dish))
  const [customDiet, setCustomDiet] = useState('')
  const [customAllergen, setCustomAllergen] = useState('')
  const [equipment, setEquipment] = useState('')
  const [personalTag, setPersonalTag] = useState('')
  const [autosaved, setAutosaved] = useState<Date | null>(null)
  const [autosaveFailed, setAutosaveFailed] = useState(false)

  const diets = useDiets()
  const allergens = useAllergens()
  const categories = useDishCategories()
  const reheatModes = useReheatModes(REHEAT_MODES)
  const computedDiets = useComputedDiets()
  const profiles = useRecipeProfiles()

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }))
  const toggle = (k: 'diets' | 'allergens', code: string) =>
    setD((p) => ({
      ...p,
      [k]: p[k]!.includes(code) ? p[k]!.filter((x) => x !== code) : [...p[k]!, code],
    }))

  const saveable = d.name.trim().length >= 2 && d.prepMinutes > 0

  /* Ce qui diffère de la fiche enregistrée, comparé tel que l'API le recevrait. */
  const payload = toPayload(d)
  const saved = useMemo(() => (dish ? JSON.stringify(toPayload(toDraft(dish))) : null), [dish])
  const dirty = saved === null || JSON.stringify(payload) !== saved

  /* Le brouillon s'enregistre seul tant que la fiche n'est pas Prête : un
     enregistrement d'une fiche Prête crée une version (R6), et une version ne
     naît pas d'une frappe au clavier. */
  const autosave = Boolean(
    dish && onAutosave && dish.status === 'draft' && !dish.readiness?.ready,
  )
  useEffect(() => {
    if (!autosave || !dirty || !saveable || saving) return
    const t = setTimeout(() => {
      onAutosave!(toPayload(d))
        .then(() => {
          setAutosaved(new Date())
          setAutosaveFailed(false)
        })
        .catch(() => setAutosaveFailed(true))
    }, 2500)
    return () => clearTimeout(t)
  }, [d, autosave, dirty, saveable, saving, onAutosave])

  const readiness = dish?.readiness
  const manques = readiness ? [...readiness.problems, ...readiness.toPublish] : []

  /* Les lignes et les couples que l'API refuserait. */
  const lignesIncompletes = d.ingredients.filter(
    (i) => ingredientStarted(i) && !ingredientReady(i),
  ).length
  const liensInvalides = d.ingredients.filter((i) => !linkValid(i.link)).length
  const storageIncomplet = Boolean(
    (d.storageMethod || d.storageDays.trim() || d.storageContainer.trim()) &&
      (!d.storageMethod || !d.storageDays.trim()),
  )

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (saveable && !saving) onSave(toPayload(d))
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
              <PhotoField dish={dish} />
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

            <div>
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

            <div>
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
            <button
              type="button"
              onClick={() => set('allergensNone', !d.allergensNone)}
              aria-pressed={d.allergensNone ?? false}
              className={`flex w-full items-start gap-2.5 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                d.allergensNone
                  ? 'border-mint-deep bg-mint/40'
                  : 'border-[rgba(31,42,55,0.12)] hover:border-mint-deep'
              }`}
            >
              <span
                aria-hidden
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  d.allergensNone
                    ? 'border-mint-ink bg-mint-ink text-white'
                    : 'border-ink-soft/40'
                }`}
              >
                {d.allergensNone && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
              </span>
              <span className="text-[13px] leading-snug">
                <span className="block font-semibold text-navy">
                  Ce plat ne contient aucun des 14 allergènes
                </span>
                <span className="mt-0.5 block text-ink-mid">
                  Une déclaration, pas un oubli : c’est elle qui distingue
                  « vérifié » de « pas encore rempli ». Elle ne se combine avec
                  aucun allergène coché.
                </span>
              </span>
            </button>

            {!d.allergensNone && (
              <>
                <Chips
                  options={allergens}
                  selected={d.allergens ?? []}
                  onToggle={(c) => toggle('allergens', c)}
                  tone="danger"
                />
                <FreeList
                  value={customAllergen}
                  onChange={setCustomAllergen}
                  items={d.customAllergens ?? []}
                  onAdd={(v) => set('customAllergens', [...(d.customAllergens ?? []), v])}
                  onRemove={(v) =>
                    set('customAllergens', (d.customAllergens ?? []).filter((x) => x !== v))
                  }
                  placeholder="Autre allergène (ex. sarrasin)"
                />
              </>
            )}

            {dish && <AllergenCheck dish={dish} dirty={dirty} />}
          </Group>

          {/* ── Recette ──────────────────────────────────────────────────── */}
          <Group
            title="Recette"
            hint="Elle sert à la liste de courses, groupée par rayon, et à la fiche que vous suivez chez le client."
          >
            <IngredientRows
              value={d.ingredients}
              onChange={(v) => set('ingredients', v)}
            />
            {lignesIncompletes > 0 && (
              <Note>
                {lignesIncompletes === 1
                  ? 'Une ligne est incomplète : elle ne sera pas enregistrée. Il faut le nom, la quantité, l’unité et le rayon.'
                  : `${lignesIncompletes} lignes sont incomplètes : elles ne seront pas enregistrées. Il faut le nom, la quantité, l’unité et le rayon.`}
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
            <div>
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
            <Field label="Consignes" hint="Une phrase, celle que vous diriez de vive voix.">
              <input
                value={d.reheatNote}
                onChange={(e) => set('reheatNote', e.target.value)}
                placeholder="Ajoutez une cuillère de bouillon pour éviter le dessèchement."
                className="input-base"
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Conserver au">
                <select
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
            ) : manques.length === 0 ? (
              <p className="mt-2 flex items-start gap-2 text-[13px] leading-relaxed text-mint-ink">
                <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                La fiche est Prête et publiable. Vous publierez depuis la liste de vos
                plats, quand il vous conviendra.
              </p>
            ) : (
              <>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-mid">
                  {readiness?.ready
                    ? 'La fiche est Prête. Pour publier, il manque :'
                    : 'Pour être Prête, il manque :'}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {manques.map((m) => (
                    <li
                      key={`${m.code}-${m.field}`}
                      className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-mid"
                    >
                      <span
                        aria-hidden
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber"
                      />
                      {problemText(m)}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {dish && dirty && (
              <p className="mt-2.5 text-xs leading-relaxed text-ink-soft">
                Calculé sur la fiche enregistrée : vos dernières modifications compteront
                une fois enregistrées.
              </p>
            )}
            {readiness?.warnings.some((w) => w.code === 'PHOTO_MISSING') && (
              <p className="mt-2.5 flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
                <ImageIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Pas encore de photo : elle n’empêche pas de publier pour l’instant.
              </p>
            )}
          </section>

          {dish && <VersionCard dish={dish} />}

          {error && (
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
              disabled={!saveable || saving}
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
              disabled={!saveable || saving}
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

// ── Allergènes confirmés, version, PDF ──────────────────────────────────────

/**
 * La confirmation des allergènes (§4.9), sur la fiche enregistrée : c'est elle
 * qui rend le plat réservable, et ses modifications en attente deviennent alors
 * une version.
 */
function AllergenCheck({ dish, dirty }: { dish: Dish; dirty: boolean }) {
  const confirm = useConfirmAllergens()
  const toast = useToast()
  const declared = dish.allergensNone || dish.allergens.length > 0

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
          Vous confirmez que les allergènes déclarés correspondent aux ingrédients.
          Sans confirmation, le plat n’est pas Prête et ne peut pas être réservé.
          Ajouter, retirer ou renommer un ingrédient efface la confirmation ; changer
          une quantité, non.
        </InfoPopover>
      </p>
      {!dish.allergensVerifiedAt && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              confirm.mutate(dish.id, {
                onSuccess: () => toast.success('Allergènes confirmés'),
                onError: (e) => toast.error('La confirmation a été refusée', apiMessage(e)),
              })
            }
            disabled={!declared || dirty || confirm.isPending}
            className="btn btn-outline text-xs disabled:cursor-not-allowed disabled:opacity-55"
          >
            {confirm.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Check className="h-3.5 w-3.5" aria-hidden />
            )}
            Confirmer les allergènes
          </button>
          <span className="text-xs leading-relaxed text-ink-soft">
            {!declared
              ? 'Déclarez d’abord les allergènes, ou « aucun ».'
              : dirty
                ? 'Enregistrez d’abord vos modifications : la confirmation porte sur la fiche enregistrée.'
                : null}
          </span>
        </div>
      )}
    </div>
  )
}

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
}: {
  value: IngredientRow[]
  onChange: (v: IngredientRow[]) => void
}) {
  const set = (i: number, patch: Partial<IngredientRow>) =>
    onChange(value.map((row, j) => (j === i ? { ...row, ...patch } : row)))

  return (
    <div>
      <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">
        Ingrédients
        <InfoPopover label="Liste commune, quantité fixe, lien, à vérifier : de quoi s’agit-il ?">
          En tapant un nom, choisissez l’ingrédient dans la liste commune : c’est
          d’elle que se calculent les régimes et les saisons. Un nom à vous reste
          possible. Une quantité fixe ne change pas avec les portions (une feuille de
          laurier, une pincée de sel). Le lien, facultatif, dit où acheter
          l’ingrédient. Un ingrédient « à vérifier » vient d’une recette importée :
          relisez-le, puis indiquez qu’il est vérifié — tant qu’il ne l’est pas, la
          fiche n’est pas Prête.
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
            return (
              <li
                key={i}
                className={`flex flex-wrap items-center gap-2 rounded-xl ${
                  amorcee && !complet ? 'bg-cream-soft px-2 py-2' : ''
                } ${ing.toVerify ? 'bg-amber-soft/40 px-2 py-2' : ''}`}
              >
                <IngredientName
                  row={ing}
                  index={i}
                  onChange={(patch) => set(i, patch)}
                />
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={ing.qty}
                  onChange={(e) => set(i, { qty: e.target.value })}
                  placeholder="Qté"
                  aria-label={`Quantité de l’ingrédient ${i + 1}`}
                  className="input-base w-20 shrink-0"
                />
                <select
                  value={ing.unit}
                  onChange={(e) => set(i, { unit: e.target.value })}
                  aria-label={`Unité de l’ingrédient ${i + 1}`}
                  className="input-base w-28 shrink-0"
                >
                  <option value="">Unité</option>
                  {UNITS.map((u) => (
                    <option key={u.code} value={u.code}>
                      {u.label}
                    </option>
                  ))}
                </select>
                <select
                  value={ing.aisle ?? ''}
                  onChange={(e) => set(i, { aisle: e.target.value })}
                  aria-label={`Rayon de l’ingrédient ${i + 1}`}
                  className="input-base w-40 shrink-0"
                >
                  <option value="">Rayon</option>
                  {AISLES.map((a) => (
                    <option key={a} value={a}>
                      {aisleLabel(a)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  aria-label={`Retirer ${ing.name || 'cet ingrédient'}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="flex w-full flex-wrap items-center gap-2">
                  <input
                    type="url"
                    value={ing.link}
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
        onClick={() => onChange([...value, { ...EMPTY_INGREDIENT, aisle: AISLES[0] }])}
        className="btn btn-outline text-xs"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden /> Ajouter un ingrédient
      </button>
    </div>
  )
}

/**
 * Le nom d'un ingrédient, avec les suggestions de la liste commune (§4.10).
 * Choisir une suggestion relie la ligne ; retaper le nom la délie.
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
  const search = useIngredientSearch(open && !row.catalogIngredientId ? row.name : '')
  const matches = search.data ?? []

  return (
    <div className="relative min-w-32 flex-1">
      <input
        value={row.name}
        onChange={(e) => {
          onChange({ name: e.target.value, catalogIngredientId: null })
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Poulet fermier"
        aria-label={`Ingrédient ${index + 1}`}
        aria-autocomplete="list"
        className={`input-base w-full ${row.catalogIngredientId ? 'pr-16' : ''}`}
      />
      {row.catalogIngredientId && (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-mint/60 px-1.5 py-0.5 text-[10px] font-semibold text-mint-ink">
          liste
        </span>
      )}
      {open && matches.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[rgba(31,42,55,0.1)] bg-paper py-1 shadow-lg"
        >
          {matches.map((m) => (
            <li key={m.id} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({ name: m.name, catalogIngredientId: m.id })
                  setOpen(false)
                }}
                className="block w-full px-3 py-1.5 text-left text-[13px] text-navy hover:bg-cream-soft"
              >
                {m.name}
                {m.aliases.length > 0 && (
                  <span className="ml-1.5 text-[11px] text-ink-soft">{m.aliases.join(', ')}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
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
    <div className="mt-5">
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
  onAdd: (v: string) => void
  onRemove: (v: string) => void
  placeholder: string
}) {
  const add = () => {
    const v = value.trim()
    if (!v || items.includes(v)) return
    onAdd(v)
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
