'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Image as ImageIcon,
  Info,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { COUNTRIES } from '@/lib/chef/countries'
import { useAllergens, useDiets, useDishCategories } from '@/lib/api/referentials'
import {
  AISLES,
  REHEAT_MODES,
  STORAGE_METHODS,
  UNITS,
  cleanIngredients,
  cleanReheating,
  cleanStorage,
  ingredientReady,
  ingredientStarted,
  aisleLabel,
  toRow,
  type IngredientRow,
} from '@/lib/recipe-fields'
import {
  DIFFICULTY_LABEL,
  checkPhoto,
  photoMessage,
  useDeleteDishPhoto,
  useDishPhoto,
  type Dish,
  type DishInput,
  type Difficulty,
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
     rayon) et un couple réchauffage ou conservation exige ses deux valeurs.
     Incomplets, ils font refuser **tout le plat** : l'écran les écarte et le
     dit, au lieu de laisser tomber un 422 sur un formulaire rempli ;
   - la photo s'envoie en trois temps et a besoin de l'identifiant du plat.
     À la création il n'y en a pas encore : on le dit, et le champ s'ouvre
     dès le premier enregistrement.

   Seuls le nom et le temps de préparation sont exigés pour enregistrer un
   brouillon : on n'oblige personne à tout écrire d'un trait.
   ───────────────────────────────────────────────────────────────────────────── */

type Draft = DishInput & {
  ingredients: IngredientRow[]
  steps: string[]
  reheatMode: string
  reheatTemperature: string
  reheatMinutes: string
  reheatNote: string
  storageMethod: string
  storageDays: string
  storageContainer: string
}

function toDraft(dish: Dish | null): Draft {
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
    ingredients: (dish?.recipe?.ingredients ?? []).map(toRow),
    steps: dish?.recipe?.steps ?? [],
    reheatMode: dish?.recipe?.reheating?.mode ?? '',
    reheatTemperature: dish?.recipe?.reheating?.temperature?.toString() ?? '',
    reheatMinutes: dish?.recipe?.reheating?.minutes?.toString() ?? '',
    reheatNote: dish?.recipe?.reheating?.note ?? '',
    storageMethod: dish?.recipe?.storage?.method ?? '',
    storageDays: dish?.recipe?.storage?.days?.toString() ?? '',
    storageContainer: dish?.recipe?.storage?.container ?? '',
  }
}

function toPayload(d: Draft): DishInput {
  const ingredients = cleanIngredients(d.ingredients)
  const steps = d.steps.map((s) => s.trim()).filter(Boolean)
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
    recipe: hasRecipe
      ? {
          ingredients,
          steps,
          reheating: cleanReheating({
            mode: d.reheatMode,
            temperature: d.reheatTemperature,
            minutes: d.reheatMinutes,
            note: d.reheatNote,
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

export default function DishForm({
  dish,
  onSave,
  saving,
  error,
  backHref,
}: {
  /** Plat existant, ou null pour une création. */
  dish: Dish | null
  onSave: (input: DishInput) => void
  saving: boolean
  error: string | null
  backHref: string
}) {
  const [d, setD] = useState<Draft>(() => toDraft(dish))
  const [customDiet, setCustomDiet] = useState('')
  const [customAllergen, setCustomAllergen] = useState('')

  const diets = useDiets()
  const allergens = useAllergens()
  const categories = useDishCategories()

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }))
  const toggle = (k: 'diets' | 'allergens', code: string) =>
    setD((p) => ({
      ...p,
      [k]: p[k]!.includes(code) ? p[k]!.filter((x) => x !== code) : [...p[k]!, code],
    }))

  const ready = d.name.trim().length >= 2 && d.prepMinutes > 0

  /* Ce qui manque pour publier — les mêmes règles que `publishBlockers`, mais
     lues sur le brouillon en cours plutôt que sur le plat enregistré. */
  const manques: string[] = []
  if (!d.description?.trim()) manques.push('une description')
  if (!d.country) manques.push('le pays d’origine')
  if (!d.allergensNone && (d.allergens?.length ?? 0) === 0 && (d.customAllergens?.length ?? 0) === 0) {
    manques.push('les allergènes, ou la mention « aucun »')
  }
  const recetteOk =
    cleanIngredients(d.ingredients).length > 0 &&
    d.steps.some((s) => s.trim().length > 0)
  if (!recetteOk) manques.push('la recette')

  /* Les lignes et les couples que l'API refuserait. */
  const lignesIncompletes = d.ingredients.filter(
    (i) => ingredientStarted(i) && !ingredientReady(i),
  ).length
  const reheatIncomplet = Boolean(
    (d.reheatMode || d.reheatMinutes.trim() || d.reheatTemperature.trim()) &&
      (!d.reheatMode || !d.reheatMinutes.trim()),
  )
  const storageIncomplet = Boolean(
    (d.storageMethod || d.storageDays.trim() || d.storageContainer.trim()) &&
      (!d.storageMethod || !d.storageDays.trim()),
  )

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (ready && !saving) onSave(toPayload(d))
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
        <p className="relative mt-1.5 max-w-prose text-sm leading-relaxed text-white/70">
          Le nom et le temps de préparation suffisent pour enregistrer. Le reste
          se complète quand vous voulez — rien n’est public avant publication.
        </p>
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
            <Field label="Description" hint="Ce que le client lit sur la carte.">
              <textarea
                value={d.description ?? ''}
                onChange={(e) => set('description', e.target.value)}
                rows={3}
                placeholder="Poulet fermier rôti, thym et romarin, pommes de terre grenaille."
                className="input-base resize-y"
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Pays d’origine" hint="Il colore la carte culinaire du client.">
                <select
                  value={d.country ?? ''}
                  onChange={(e) => set('country', e.target.value)}
                  className="input-base"
                >
                  <option value="">À préciser</option>
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
              <Field label="Prépa (min)" required hint="Non visible des clients.">
                <input
                  type="number"
                  min={1}
                  value={d.prepMinutes}
                  onChange={(e) => set('prepMinutes', Number(e.target.value))}
                  className="input-base"
                />
              </Field>
              <Field label="Cuisson (min)" hint="Non visible des clients.">
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
            <Field label="Photo du plat">
              <PhotoField dish={dish} />
            </Field>
          </Group>

          {/* ── Régimes ──────────────────────────────────────────────────── */}
          <Group
            title="Régimes couverts"
            hint="Une carte n’est « sans gluten » que si tous ses plats le sont."
          >
            <Chips
              options={diets}
              selected={d.diets ?? []}
              onToggle={(c) => toggle('diets', c)}
            />
            <FreeList
              value={customDiet}
              onChange={setCustomDiet}
              items={d.customDiets ?? []}
              onAdd={(v) => set('customDiets', [...(d.customDiets ?? []), v])}
              onRemove={(v) =>
                set('customDiets', (d.customDiets ?? []).filter((x) => x !== v))
              }
              placeholder="Autre régime (ex. sans porc)"
            />
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

            <StepRows value={d.steps} onChange={(v) => set('steps', v)} />
          </Group>

          {/* ── Après la session ─────────────────────────────────────────── */}
          <Group
            title="Réchauffage et conservation"
            hint="Ce que le client lit dans son espace, plusieurs jours après votre passage."
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Réchauffer au">
                <select
                  value={d.reheatMode}
                  onChange={(e) => set('reheatMode', e.target.value)}
                  className="input-base"
                >
                  <option value="">Non précisé</option>
                  {REHEAT_MODES.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
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
              <Field label="Durée (min)" required={Boolean(d.reheatMode)}>
                <input
                  type="number"
                  min={0}
                  value={d.reheatMinutes}
                  onChange={(e) => set('reheatMinutes', e.target.value)}
                  placeholder="15"
                  aria-invalid={(Boolean(d.reheatMode) && !d.reheatMinutes.trim()) || undefined}
                  className="input-base"
                />
              </Field>
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
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
              <Field label="Contenant" className="sm:col-span-2">
                <input
                  value={d.storageContainer}
                  onChange={(e) => set('storageContainer', e.target.value)}
                  placeholder="Boîte hermétique"
                  className="input-base"
                />
              </Field>
            </div>

            <Field label="Conseil" hint="Une phrase, celle que vous diriez de vive voix.">
              <input
                value={d.reheatNote}
                onChange={(e) => set('reheatNote', e.target.value)}
                placeholder="Ajoutez une cuillère de bouillon pour éviter le dessèchement."
                className="input-base"
              />
            </Field>

            {(reheatIncomplet || storageIncomplet) && (
              <Note>
                {reheatIncomplet && storageIncomplet
                  ? 'Le réchauffage demande un mode et une durée ; la conservation, un lieu et un nombre de jours. Incomplets, ils ne seront pas enregistrés.'
                  : reheatIncomplet
                    ? 'Le réchauffage ne s’enregistre qu’avec un mode et une durée.'
                    : 'La conservation ne s’enregistre qu’avec un lieu et un nombre de jours.'}
              </Note>
            )}
          </Group>
        </div>

        {/* ── Publication ──────────────────────────────────────────────────── */}
        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-5 lg:p-6">
            <h3 className="font-display text-base font-bold text-navy">
              Avant de publier
            </h3>

            {manques.length === 0 ? (
              <p className="mt-2 flex items-start gap-2 text-[13px] leading-relaxed text-mint-ink">
                <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Ce plat est publiable. Vous publierez depuis la liste de vos
                plats, quand il vous conviendra.
              </p>
            ) : (
              <>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-mid">
                  Il manque encore :
                </p>
                <ul className="mt-2 space-y-1.5">
                  {manques.map((m) => (
                    <li
                      key={m}
                      className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-mid"
                    >
                      <span
                        aria-hidden
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber"
                      />
                      {m}
                    </li>
                  ))}
                </ul>
                <p className="mt-2.5 text-xs leading-relaxed text-ink-soft">
                  Rien n’empêche d’enregistrer : le plat reste en brouillon,
                  visible de vous seul.
                </p>
              </>
            )}
          </section>

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
              disabled={!ready || saving}
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
            {!ready && (
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
            {!ready
              ? 'Le nom et le temps de préparation sont nécessaires.'
              : manques.length > 0
                ? `Enregistré en brouillon — il manque ${manques.length} chose${manques.length > 1 ? 's' : ''} pour publier.`
                : 'Enregistré en brouillon : rien n’est public tant que vous ne publiez pas.'}
          </p>
          <div className="flex gap-2">
            <Link href={backHref} className="btn btn-outline text-xs">
              Annuler
            </Link>
            <button
              type="submit"
              disabled={!ready || saving}
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
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">
        Ingrédients
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
                }`}
              >
                <input
                  value={ing.name}
                  onChange={(e) => set(i, { name: e.target.value })}
                  placeholder="Poulet fermier"
                  aria-label={`Ingrédient ${i + 1}`}
                  className="input-base min-w-32 flex-1"
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
                    <option key={u} value={u}>
                      {u}
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
              </li>
            )
          })}
        </ul>
      )}
      <button
        type="button"
        onClick={() =>
          onChange([...value, { name: '', qty: '', unit: 'g', aisle: AISLES[0] }])
        }
        className="btn btn-outline text-xs"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden /> Ajouter un ingrédient
      </button>
    </div>
  )
}

function StepRows({
  value,
  onChange,
}: {
  value: string[]
  onChange: (v: string[]) => void
}) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">
        Étapes
      </p>
      {value.length === 0 ? (
        <p className="mb-2 text-[13px] text-ink-soft">
          Aucune étape écrite pour l’instant.
        </p>
      ) : (
        <ol className="mb-2 space-y-2">
          {value.map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-2.5 w-5 shrink-0 text-right text-xs tabular-nums text-ink-soft"
              >
                {i + 1}.
              </span>
              <textarea
                value={step}
                rows={2}
                onChange={(e) =>
                  onChange(value.map((s, j) => (j === i ? e.target.value : s)))
                }
                aria-label={`Étape ${i + 1}`}
                className="input-base min-w-0 flex-1 resize-y"
              />
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                aria-label={`Retirer l’étape ${i + 1}`}
                className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ol>
      )}
      <button
        type="button"
        onClick={() => onChange([...value, ''])}
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
  className = '',
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-semibold text-navy">
        {label}
        {required && <span className="text-terra"> *</span>}
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
