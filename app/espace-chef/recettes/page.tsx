'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  RotateCw,
  Trash2,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import ChefPage from '@/components/chef/ChefPage'
import { Skeleton, SkeletonCard, SkeletonGroup } from '@/components/shared/Skeleton'
import ApprovalGate from '@/components/chef/ApprovalGate'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import ExpressDishesToDecide from '@/components/chef/recipes/ExpressDishesToDecide'
import { InfoPopover } from '@/components/shared/InfoPopover'
import { useToast } from '@/components/shared/Toaster'
import { countryLabel } from '@/lib/chef/countries'
import { refLabel, useAllergens, useDiets, useDishCategories } from '@/lib/api/referentials'
import {
  DISH_STATUS_LABEL,
  DIFFICULTY_LABEL,
  checkPhoto,
  publishBlockers,
  useAdoptSuggestion,
  useCreateMenu,
  useDeleteDish,
  useDeleteMenu,
  useDuplicateDish,
  useDuplicateMenu,
  useDeleteMenuPhoto,
  useDishPhoto,
  useDishes,
  useMenuPhoto,
  useMenus,
  usePublishDish,
  usePublishMenu,
  useSuggestions,
  useUpdateMenu,
  type Dish,
  type DishStatus,
  type Menu,
  type MenuDish,
  type MenuInput,
  type Suggestions,
} from '@/lib/api/chef-catalog'
import { apiMessage } from '@/lib/api/messages'

/* ─────────────────────────────────────────────────────────────────────────────
   Mes plats et mes menus.

   Un plat naît en brouillon et ne devient public qu'à la publication : rien
   n'échappe au chef. Un menu se compose de ses propres plats, et le publier
   publie ce qu'il contient.

   L'écran dit toujours **ce qui manque pour publier** plutôt que de griser un
   bouton sans raison : c'est la seule question qu'on se pose devant un
   brouillon. Et les gestes qui sortent de l'écran — publier, dépublier,
   supprimer, adopter — passent par une phrase qui dit ce qu'ils entraînent.
   ───────────────────────────────────────────────────────────────────────────── */

type Tab = 'dishes' | 'menus' | 'suggestions'

const PERIODS = [
  { id: 'week', label: 'Semaine' },
  { id: 'month', label: 'Mois' },
] as const

const STATUS_STYLE: Record<DishStatus, { dot: string; text: string }> = {
  draft: { dot: 'bg-ink-soft/50', text: 'text-ink-soft' },
  published: { dot: 'bg-mint-deep', text: 'text-mint-ink' },
  suspended: { dot: 'bg-red-500', text: 'text-red-700' },
  archived: { dot: 'bg-ink-soft/40', text: 'text-ink-soft' },
}

export default function RecettesPage() {
  const [tab, setTab] = useState<Tab>('dishes')
  const dishes = useDishes()
  const menus = useMenus()

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'dishes', label: 'Mes plats', count: dishes.data?.length },
    { id: 'menus', label: 'Mes menus', count: menus.data?.length },
    { id: 'suggestions', label: 'Propositions Lab’s Food' },
  ]

  return (
    <ChefPage
      title="Menus et recettes"
      subtitle="Vos plats, vos cartes, et ce que Lab’s Food vous propose."
    >
      <div className="space-y-6">
        <ApprovalGate quoi="Vos plats et vos menus s’écrivent" />

        <div role="tablist" aria-label="Catalogue" className="flex flex-wrap items-center gap-1">
          {TABS.map((t) => {
            const on = tab === t.id
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  on ? 'bg-navy text-white' : 'text-ink-mid hover:bg-paper hover:text-navy'
                }`}
              >
                {t.label}
                {typeof t.count === 'number' && (
                  <span className={`ml-2 tabular-nums ${on ? 'text-amber' : 'text-ink-soft'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Sur-mesure (15/11) : les plats express d'une demande, à garder ou retirer. */}
        <ExpressDishesToDecide />

        {tab === 'dishes' && <DishesTab query={dishes} />}
        {tab === 'menus' && <MenusTab query={menus} dishes={dishes.data ?? []} />}
        {tab === 'suggestions' && <SuggestionsTab />}
      </div>
    </ChefPage>
  )
}

// ── Plats ───────────────────────────────────────────────────────────────────

function DishesTab({ query }: { query: ReturnType<typeof useDishes> }) {
  if (query.isPending) return <TabSkeleton layout="plats" />
  if (query.isError) return <Failure onRetry={() => query.refetch()} what="vos plats" />

  const dishes = query.data ?? []
  const published = dishes.filter((d) => d.status === 'published').length

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-mid">
          {dishes.length === 0
            ? 'Aucun plat pour l’instant.'
            : `${dishes.length} plat${dishes.length > 1 ? 's' : ''}, dont ${published} publié${published > 1 ? 's' : ''}`}
        </p>
        <Link href="/espace-chef/recettes/nouveau" className="btn btn-primary text-xs">
          <Plus className="h-3.5 w-3.5" aria-hidden /> Nouveau plat
        </Link>
      </div>

      {dishes.length === 0 ? (
        <Empty
          icon={UtensilsCrossed}
          title="Commencez par un plat"
          text="Écrivez-en un : nom, temps de préparation, et c’est enregistré. Vous compléterez la recette quand vous voudrez — rien n’est public avant publication."
          action={
            <Link href="/espace-chef/recettes/nouveau" className="btn btn-primary text-xs">
              <Plus className="h-3.5 w-3.5" aria-hidden /> Nouveau plat
            </Link>
          }
        />
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {dishes.map((dish) => (
            <DishCard
              key={dish.id}
              dish={dish}
              variantOfName={dishes.find((x) => x.id === dish.variantOfId)?.name ?? null}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function DishCard({ dish, variantOfName }: { dish: Dish; variantOfName: string | null }) {
  const toast = useToast()
  const router = useRouter()
  const publish = usePublishDish()
  const remove = useDeleteDish()
  const duplicate = useDuplicateDish()
  const photo = useDishPhoto()
  const diets = useDiets()
  const allergens = useAllergens()
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const blockers = publishBlockers(dish)
  const style = STATUS_STYLE[dish.status]
  const busy = publish.isPending || remove.isPending || photo.isPending

  function pickPhoto(file: File | null) {
    setPhotoError(null)
    if (!file) return
    const problem = checkPhoto(file)
    if (problem) {
      setPhotoError(problem)
      return
    }
    photo.mutate(
      { id: dish.id, file },
      {
        onSuccess: () => toast.success('Photo mise à jour'),
        onError: () =>
          toast.error('La photo n’a pas été envoyée', 'Rien n’a changé — réessayez.'),
      },
    )
  }

  return (
    <li className="overflow-hidden rounded-2xl bg-paper">
      <div className="flex gap-4 p-4">
        <label
          htmlFor={`photo-${dish.id}`}
          className="group relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-cream-soft"
        >
          {dish.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dish.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-5 w-5 text-ink-soft" aria-hidden />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-navy/70 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
            {photo.isPending ? '…' : dish.imageUrl ? 'Changer' : 'Ajouter'}
          </span>
          <input
            id={`photo-${dish.id}`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
          />
        </label>

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="font-display text-base font-bold leading-tight text-navy">
              {dish.name}
            </span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${style.text}`}>
              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
              {DISH_STATUS_LABEL[dish.status]}
            </span>
          </p>

          <p className="mt-1 flex flex-wrap items-center gap-1.5">
            {dish.readiness?.ready ? (
              <span className="rounded-full bg-mint/60 px-2 py-0.5 text-xs font-semibold text-mint-ink">
                Prête · version {dish.recipeVersion}
              </span>
            ) : (
              <span className="rounded-full bg-cream-soft px-2 py-0.5 text-xs font-semibold text-ink-mid">
                Pas encore Prête
              </span>
            )}
            {dish.readiness?.problems.some((p) => p.code === 'ALLERGENS_UNVERIFIED') && (
              <span className="rounded-full bg-amber-soft px-2 py-0.5 text-xs font-semibold text-[#8B6200]">
                Allergènes à confirmer
              </span>
            )}
            <InfoPopover label="Que veut dire « Prête » ?">
              Une fiche est Prête quand tout ce qui sert à cuisiner et à faire les courses
              est rempli, et ses allergènes confirmés. Un plat publié dont un ingrédient a
              changé reste en ligne, mais ne peut plus être réservé avant la confirmation
              de ses allergènes.
            </InfoPopover>
          </p>

          {dish.variantOfId && (
            <p className="mt-0.5 text-xs text-ink-soft">
              {variantOfName ? `Variante de « ${variantOfName} »` : 'Variante d’un autre plat'}
            </p>
          )}

          <p className="mt-0.5 text-xs text-ink-soft">
            {[
              countryLabel(dish.country) || null,
              `${dish.portions} portions`,
              dish.cookMinutes
                ? `${dish.prepMinutes} + ${dish.cookMinutes} min`
                : `${dish.prepMinutes} min`,
              dish.difficulty ? DIFFICULTY_LABEL[dish.difficulty] : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>

          {dish.description && (
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-mid">
              {dish.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-1.5">
            {dish.diets.map((d) => (
              <span key={d} className="rounded-full bg-mint/50 px-2 py-0.5 text-xs text-mint-ink">
                {refLabel(diets, d)}
              </span>
            ))}
            {dish.customDiets.map((d) => (
              <span
                key={d}
                className="rounded-full bg-mint/40 px-2 py-0.5 text-xs text-mint-ink"
              >
                {d}
              </span>
            ))}
            {dish.allergensNone ? (
              <span className="rounded-full bg-cream-soft px-2 py-0.5 text-xs text-navy">
                Sans allergène
              </span>
            ) : (
              dish.allergens.slice(0, 3).map((a) => (
                <span key={a} className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
                  {refLabel(allergens, a)}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {photoError && (
        <p role="alert" className="px-4 pb-2 text-[13px] text-red-700">
          {photoError}
        </p>
      )}
      {photo.isError && (
        <p role="alert" className="px-4 pb-2 text-[13px] text-red-700">
          L’image n’a pas pu être envoyée. Rien n’a changé — réessayez.
        </p>
      )}

      {/* Ce qui manque pour publier, dit avant d'être refusé (§4.11). */}
      {dish.status !== 'published' && blockers.length > 0 && (
        <p className="flex items-start gap-2 bg-cream-soft px-4 py-2.5 text-[13px] leading-relaxed text-ink-mid">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-ink" aria-hidden />
          Pour publier, il manque {blockers.join(', ')}.
        </p>
      )}

      <footer className="flex flex-wrap items-center gap-2 border-t border-[rgba(31,42,55,0.07)] px-4 py-3">
        <Link href={`/espace-chef/recettes/${dish.id}`} className="btn btn-outline text-xs">
          Modifier
        </Link>
        <span className="inline-flex items-center gap-0.5">
          <button
            onClick={() =>
              duplicate.mutate(dish.id, {
                onSuccess: (copy) => {
                  toast.success(`« ${copy.name} » créé en brouillon`)
                  router.push(`/espace-chef/recettes/${copy.id}`)
                },
                onError: (e) => toast.error('La copie a échoué', apiMessage(e)),
              })
            }
            disabled={busy || duplicate.isPending}
            className="btn btn-outline text-xs"
          >
            {duplicate.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden />
            )}
            Dupliquer
          </button>
          <InfoPopover label="Que fait « Dupliquer » ?">
            Une copie en brouillon, « (copie) », pour écrire une variante. Elle n’est
            jamais publiée d’office ; ses allergènes sont à confirmer à nouveau et sa
            photo est une copie indépendante.
          </InfoPopover>
        </span>

        {dish.status === 'published' ? (
          <button
            onClick={() =>
              publish.mutate(
                { id: dish.id, publish: false },
                {
                  onSuccess: () =>
                    toast.info(
                      `« ${dish.name} » n’est plus visible`,
                      'Il reste dans vos plats, en brouillon.',
                    ),
                  onError: () => toast.error('La dépublication a échoué'),
                },
              )
            }
            disabled={busy}
            className="btn btn-outline text-xs"
          >
            {publish.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Dépublier
          </button>
        ) : (
          <button
            onClick={() =>
              publish.mutate(
                { id: dish.id, publish: true },
                {
                  onSuccess: () => toast.success(`« ${dish.name} » est publié`),
                  onError: (e) =>
                    toast.error(
                      'La publication a été refusée',
                      apiMessage(e),
                    ),
                },
              )
            }
            disabled={busy || blockers.length > 0}
            className="btn btn-primary text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            {publish.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Publier
          </button>
        )}

        <button
          onClick={() => setConfirmDelete(true)}
          aria-label={`Supprimer ${dish.name}`}
          className="ml-auto text-ink-soft hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </footer>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(dish.id, {
            onSuccess: () => {
              setConfirmDelete(false)
              toast.success(`« ${dish.name} » supprimé`)
            },
            onError: (e) =>
              toast.error(
                'La suppression a échoué',
                apiMessage(e),
              ),
          })
        }
        pending={remove.isPending}
        tone="danger"
        title={`Supprimer « ${dish.name} » ?`}
        lead="Le plat, sa recette et sa photo disparaissent. C’est définitif."
        detail="S’il fait partie d’une de vos cartes, il en sort aussi. Un plat déjà cuisiné pour un client ne peut pas être supprimé : l’API refusera."
        confirmLabel="Supprimer le plat"
      />
    </li>
  )
}

// ── Menus ───────────────────────────────────────────────────────────────────

function MenusTab({
  query,
  dishes,
}: {
  query: ReturnType<typeof useMenus>
  dishes: Dish[]
}) {
  const toast = useToast()
  const create = useCreateMenu()
  const [composing, setComposing] = useState(false)

  if (query.isPending) return <TabSkeleton layout="cartes" />
  if (query.isError) return <Failure onRetry={() => query.refetch()} what="vos menus" />

  const menus = query.data ?? []

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-mid">
          {menus.length === 0
            ? 'Aucune carte pour l’instant.'
            : `${menus.length} carte${menus.length > 1 ? 's' : ''}`}
        </p>
        <button
          onClick={() => setComposing((v) => !v)}
          className="btn btn-primary text-xs"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden /> Nouvelle carte
        </button>
      </div>

      {composing && (
        <MenuForm
          dishes={dishes}
          submitLabel="Créer la carte"
          pending={create.isPending}
          onCancel={() => setComposing(false)}
          onSubmit={(input) =>
            create.mutate(input, {
              onSuccess: (menu) => {
                setComposing(false)
                toast.success(
                  `Carte « ${menu.title} » créée`,
                  'En brouillon : publiez-la quand elle vous convient.',
                )
              },
              onError: (e) =>
                toast.error(
                  'La carte n’a pas été créée',
                  apiMessage(e),
                ),
            })
          }
        />
      )}

      {menus.length === 0 && !composing ? (
        <Empty
          icon={UtensilsCrossed}
          title="Composez votre première carte"
          text="Une carte rassemble vos plats pour une semaine. C’est elle que le client voit sur la page des menus."
        />
      ) : (
        <ul className="mt-4 space-y-4">
          {menus.map((m) => (
            <MenuCard key={m.id} menu={m} dishes={dishes} />
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * Composer une carte, ou la reprendre : titre, accroche, courses et plats.
 *
 * Une carte publiée le reste pendant qu'on la modifie, donc l'API n'y accepte
 * que des plats déjà publiés : le choix ne propose qu'eux.
 */
function MenuForm({
  initial,
  dishes,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: Menu
  dishes: Dish[]
  submitLabel: string
  pending: boolean
  onSubmit: (input: MenuInput) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [pitch, setPitch] = useState(initial?.pitch ?? '')
  const [period, setPeriod] = useState(initial?.period ?? 'week')
  const [shoppingIncluded, setShoppingIncluded] = useState(initial?.shoppingIncluded ?? false)
  const [picked, setPicked] = useState<string[]>(initial?.dishes.map((d) => d.id) ?? [])
  const published = initial?.status === 'published'

  return (
    <div className="mt-4 space-y-5 card-shell rounded-3xl p-5 lg:p-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-navy">
            Titre de la carte <span className="text-amber-ink">*</span>
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tour du monde en sept plats"
            className="input-base"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-navy">
            Accroche
          </span>
          <input
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            placeholder="Sept plats, sept pays, une semaine de frigo."
            className="input-base"
          />
          <span className="mt-1 block text-xs text-ink-soft">
            Une phrase, lue par le client sur votre carte.
          </span>
        </label>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-[13px] font-semibold text-navy">Durée de la carte</legend>
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              aria-pressed={period === p.id}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                period === p.id
                  ? 'bg-navy text-white'
                  : 'bg-cream-soft text-ink-mid hover:text-navy'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={() => setShoppingIncluded((v) => !v)}
        aria-pressed={shoppingIncluded}
        className={`flex w-full items-start gap-2.5 rounded-xl border px-3.5 py-3 text-left transition-colors ${
          shoppingIncluded
            ? 'border-mint-deep bg-mint/40'
            : 'border-[rgba(31,42,55,0.12)] hover:border-mint-deep'
        }`}
      >
        <span
          aria-hidden
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
            shoppingIncluded
              ? 'border-mint-ink bg-mint-ink text-white'
              : 'border-ink-soft/40'
          }`}
        >
          {shoppingIncluded && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
        </span>
        <span className="text-[13px] leading-snug">
          <span className="block font-semibold text-navy">
            Je fais les courses pour cette carte
          </span>
          <span className="mt-0.5 block text-ink-mid">
            Décoché, le client achète lui-même les ingrédients de la liste.
          </span>
        </span>
      </button>

      {published && (
        <p className="rounded-xl bg-cream-soft px-3.5 py-3 text-[13px] text-ink-mid">
          Cette carte est publiée : seuls vos plats publiés peuvent y entrer.
          Pour y mettre un brouillon, publiez-le d’abord, ou dépubliez la carte.
        </p>
      )}

      <DishPicker
        dishes={published ? dishes.filter((d) => d.status === 'published') : dishes}
        picked={picked}
        onChange={setPicked}
      />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() =>
            onSubmit({
              title: title.trim(),
              pitch: pitch.trim() || null,
              period,
              shoppingIncluded,
              dishIds: picked,
            })
          }
          disabled={title.trim().length < 3 || picked.length === 0 || pending}
          className="btn btn-primary text-xs disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {submitLabel}
        </button>
        <button onClick={onCancel} className="btn btn-outline text-xs">
          Annuler
        </button>
        {picked.length === 0 && (
          <p className="basis-full text-xs text-ink-soft">
            Une carte vide ne peut pas être publiée : choisissez au moins un
            plat.
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Le choix des plats d'une carte.
 *
 * Choisir se fait sur ce qu'on voit : une liste de noms obligeait à ouvrir
 * chaque plat ailleurs pour savoir s'il allait avec les autres. La photo, les
 * portions, les temps et les régimes sont là, et l'ordre retenu se règle
 * ensuite — c'est celui dans lequel le client lira la carte.
 */
function DishPicker({
  dishes,
  picked,
  onChange,
}: {
  dishes: Dish[]
  picked: string[]
  onChange: (v: string[]) => void
}) {
  const diets = useDiets()
  const categories = useDishCategories()
  const [query, setQuery] = useState('')
  const [place, setPlace] = useState<string | null>(null)

  const q = query.trim().toLowerCase()
  const visible = dishes
    .filter((d) => !place || d.category === place)
    .filter(
      (d) =>
        !q ||
        d.name.toLowerCase().includes(q) ||
        (d.description ?? '').toLowerCase().includes(q) ||
        (countryLabel(d.country) || '').toLowerCase().includes(q),
    )

  const places = categories.filter((c) => dishes.some((d) => d.category === c.code))
  const retenus = picked
    .map((id) => dishes.find((d) => d.id === id))
    .filter((d): d is Dish => d !== undefined)

  const toggle = (id: string) =>
    onChange(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id])

  const move = (i: number, delta: number) => {
    const j = i + delta
    if (j < 0 || j >= picked.length) return
    const next = [...picked]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  if (dishes.length === 0) {
    return (
      <p className="rounded-xl bg-cream-soft px-3.5 py-3 text-sm text-ink-mid">
        Écrivez d’abord un plat : une carte se compose des vôtres.{' '}
        <Link href="/espace-chef/recettes/nouveau" className="font-semibold text-amber-ink">
          Nouveau plat
        </Link>
      </p>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-navy">
          Les plats de cette carte
          <span className="ml-2 font-normal text-ink-soft">
            {picked.length} choisi{picked.length > 1 ? 's' : ''}
          </span>
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un plat…"
          aria-label="Rechercher un de vos plats"
          className="input-base w-full py-2 sm:w-56"
        />
      </div>

      {places.length > 1 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setPlace(null)}
            aria-pressed={place === null}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
              place === null ? 'bg-navy text-white' : 'bg-cream-soft text-ink-mid hover:text-navy'
            }`}
          >
            Tous
          </button>
          {places.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setPlace(c.code)}
              aria-pressed={place === c.code}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                place === c.code
                  ? 'bg-navy text-white'
                  : 'bg-cream-soft text-ink-mid hover:text-navy'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">
          Aucun de vos plats ne correspond{q ? ` à « ${query} »` : ' à ce filtre'}.
        </p>
      ) : (
        <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
          {visible.map((d) => {
            const on = picked.includes(d.id)
            const blockers = publishBlockers(d)
            return (
              <li key={d.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(d.id)}
                  className={`flex w-full items-start gap-3 rounded-2xl p-2.5 text-left transition-colors ${
                    on ? 'bg-mint/30' : 'bg-cream-soft hover:bg-cream-deep'
                  }`}
                >
                  {d.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={d.imageUrl}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-paper text-ink-soft"
                    >
                      <ImageIcon className="h-5 w-5" />
                    </span>
                  )}

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold text-navy">{d.name}</span>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${STATUS_STYLE[d.status].text}`}
                      >
                        <span
                          aria-hidden
                          className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLE[d.status].dot}`}
                        />
                        {DISH_STATUS_LABEL[d.status]}
                      </span>
                    </span>

                    <span className="mt-0.5 block text-xs text-ink-soft">
                      {[
                        countryLabel(d.country) || 'Origine à préciser',
                        `${d.portions} portions`,
                        d.cookMinutes
                          ? `${d.prepMinutes} + ${d.cookMinutes} min`
                          : `${d.prepMinutes} min`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>

                    {d.description && (
                      <span className="mt-1 line-clamp-1 block text-[12px] leading-relaxed text-ink-mid">
                        {d.description}
                      </span>
                    )}

                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      {d.diets.slice(0, 4).map((x) => (
                        <span
                          key={x}
                          className="rounded-full bg-mint/50 px-2 py-0.5 text-xs text-mint-ink"
                        >
                          {refLabel(diets, x)}
                        </span>
                      ))}
                      {d.allergensNone && (
                        <span className="rounded-full bg-paper px-2 py-0.5 text-xs text-navy">
                          Sans allergène
                        </span>
                      )}
                      {d.status === 'draft' && blockers.length > 0 && (
                        <span className="text-xs font-semibold text-amber-ink">
                          publier la carte le publiera : il manque {blockers.length} chose
                          {blockers.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </span>
                  </span>

                  <span
                    aria-hidden
                    className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      on ? 'border-navy bg-navy text-white' : 'border-ink-soft/40 bg-paper'
                    }`}
                  >
                    {on && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {retenus.length > 1 && (
        <div className="mt-4 border-t border-[rgba(31,42,55,0.07)] pt-4">
          <p className="text-[13px] font-semibold text-navy">
            L’ordre de lecture
            <span className="ml-2 font-normal text-ink-soft">
              c’est dans cet ordre que le client les verra
            </span>
          </p>
          <ol className="mt-2 space-y-1.5">
            {retenus.map((d, i) => (
              <li key={d.id} className="flex items-center gap-2 rounded-xl bg-cream-soft p-2">
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-paper text-xs font-semibold tabular-nums text-navy"
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-navy">{d.name}</span>
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Monter ${d.name}`}
                  className="px-1.5 text-ink-soft hover:text-navy disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === retenus.length - 1}
                  aria-label={`Descendre ${d.name}`}
                  className="px-1.5 text-ink-soft hover:text-navy disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => toggle(d.id)}
                  aria-label={`Retirer ${d.name} de la carte`}
                  className="px-1 text-ink-soft hover:text-red-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function MenuCard({ menu, dishes }: { menu: Menu; dishes: Dish[] }) {
  const toast = useToast()
  const update = useUpdateMenu()
  const publish = usePublishMenu()
  const remove = useDeleteMenu()
  const duplicate = useDuplicateMenu()
  const photo = useMenuPhoto()
  const removePhoto = useDeleteMenuPhoto()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  /** Le geste qu'on s'apprête à faire, le temps de le confirmer. */
  const [geste, setGeste] = useState<'publier' | 'depublier' | 'supprimer' | null>(null)

  const style = STATUS_STYLE[menu.status]
  const brouillons = menu.dishes.filter((d) => d.status !== 'published')
  // Publier la carte publie ses brouillons : chacun doit être Prête et publiable.
  const incompletes = brouillons.filter((d) => publishBlockers(d).length > 0)

  function pickPhoto(file: File | null) {
    setPhotoError(null)
    if (!file) return
    const probleme = checkPhoto(file)
    if (probleme) {
      setPhotoError(probleme)
      return
    }
    photo.mutate(
      { id: menu.id, file },
      {
        onSuccess: () => toast.success('Photo de couverture mise à jour'),
        onError: () => toast.error('La photo n’a pas été envoyée', 'Rien n’a changé.'),
      },
    )
  }

  function basculer(publier: boolean) {
    publish.mutate(
      { id: menu.id, publish: publier },
      {
        onSuccess: () => {
          setGeste(null)
          if (publier) {
            toast.success(
              `« ${menu.title} » est publiée`,
              'Les plats de la carte le sont aussi.',
            )
          } else {
            toast.info(`« ${menu.title} » n’est plus visible`)
          }
        },
        onError: (e) =>
          toast.error(
            publier ? 'La publication a été refusée' : 'La dépublication a échoué',
            apiMessage(e),
          ),
      },
    )
  }

  return (
    <li className="overflow-hidden rounded-2xl bg-paper">
      <div className="flex flex-wrap items-start gap-4 p-5">
        <label
          htmlFor={`menu-photo-${menu.id}`}
          className="group relative flex h-20 w-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-cream-soft"
        >
          {menu.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={menu.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-5 w-5 text-ink-soft" aria-hidden />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-navy/70 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
            {photo.isPending ? '…' : menu.imageUrl ? 'Changer' : 'Couverture'}
          </span>
          <input
            id={`menu-photo-${menu.id}`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
          />
        </label>

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="font-display text-lg font-bold leading-tight text-navy">
              {menu.title}
            </span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${style.text}`}>
              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
              {DISH_STATUS_LABEL[menu.status]}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {menu.period === 'month' ? 'Carte du mois · ' : 'Carte de la semaine · '}
            {menu.dishes.length} plat{menu.dishes.length > 1 ? 's' : ''}
            {menu.shoppingIncluded ? ' · courses incluses' : ' · sans courses'}
          </p>
          {menu.pitch && (
            <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-ink-mid">
              {menu.pitch}
            </p>
          )}
          {menu.imageUrl && (
            <button
              onClick={() =>
                removePhoto.mutate(menu.id, {
                  onError: () => toast.error('La photo n’a pas été retirée'),
                })
              }
              disabled={removePhoto.isPending}
              className="hit mt-1.5 text-xs text-ink-soft underline-offset-2 hover:text-red-700 hover:underline"
            >
              Retirer la couverture
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing((v) => !v)}
            aria-expanded={editing}
            className="btn btn-outline text-xs"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden /> Modifier
          </button>
          {menu.status === 'published' ? (
            <button
              onClick={() => setGeste('depublier')}
              disabled={publish.isPending}
              className="btn btn-outline text-xs"
            >
              Dépublier
            </button>
          ) : (
            <button
              onClick={() => setGeste('publier')}
              disabled={publish.isPending || menu.dishes.length === 0}
              className="btn btn-primary text-xs disabled:opacity-50"
            >
              {publish.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Publier
            </button>
          )}
          <button
            onClick={() =>
              duplicate.mutate(menu.id, {
                onSuccess: (copy) =>
                  toast.success(
                    `« ${copy.title} » créée en brouillon`,
                    'Les mêmes plats, dans le même ordre : aucun plat n’est copié.',
                  ),
                onError: (e) => toast.error('La copie a échoué', apiMessage(e)),
              })
            }
            disabled={duplicate.isPending}
            className="btn btn-outline text-xs"
          >
            {duplicate.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden />
            )}
            Dupliquer
          </button>
          <button
            onClick={() => setGeste('supprimer')}
            aria-label={`Supprimer ${menu.title}`}
            className="text-ink-soft hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {photoError && (
        <p role="alert" className="px-5 pb-2 text-[13px] text-red-700">
          {photoError}
        </p>
      )}

      {editing && (
        <div className="px-5 pb-5">
          <MenuForm
            initial={menu}
            dishes={dishes}
            submitLabel="Enregistrer"
            pending={update.isPending}
            onCancel={() => setEditing(false)}
            onSubmit={(patch) =>
              update.mutate(
                { id: menu.id, patch },
                {
                  onSuccess: (saved) => {
                    setEditing(false)
                    toast.success(`« ${saved.title} » mise à jour`)
                  },
                  onError: (e) => toast.error('La carte n’a pas été modifiée', apiMessage(e)),
                },
              )
            }
          />
        </div>
      )}

      {menu.dishes.length > 0 && (
        <div className="border-t border-[rgba(31,42,55,0.07)] px-5 py-3">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="hit inline-flex items-center gap-1.5 text-xs font-semibold text-ink-mid hover:text-navy"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            {open ? 'Masquer les plats' : `Voir les ${menu.dishes.length} plats`}
          </button>
          {open && (
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {menu.dishes.map((d) => (
                <MenuDishRow key={d.id} dish={d} />
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Publier */}
      <ConfirmDialog
        open={geste === 'publier'}
        onClose={() => setGeste(null)}
        onConfirm={() => basculer(true)}
        pending={publish.isPending}
        title={`Publier « ${menu.title} » ?`}
        lead={`La carte devient visible des clients de votre zone, avec ses ${menu.dishes.length} plat${menu.dishes.length > 1 ? 's' : ''}.`}
        detail={
          brouillons.length > 0
            ? `${brouillons.length} de ces plats ${brouillons.length > 1 ? 'sont encore en brouillon : ils seront publiés' : 'est encore en brouillon : il sera publié'} avec la carte.`
            : 'Vous pourrez la dépublier à tout moment.'
        }
        confirmLabel="Publier la carte"
      >
        {incompletes.length > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-soft/60 px-3.5 py-2.5 text-[12px] leading-relaxed text-[#8B6200]">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {incompletes.length === 1
              ? `« ${incompletes[0].name} » n’est pas encore Prête : la carte sera refusée tant qu’il ne l’est pas.`
              : `${incompletes.length} plats ne sont pas encore Prêts : la carte sera refusée tant qu’ils ne le sont pas.`}
          </p>
        )}
      </ConfirmDialog>

      {/* Dépublier */}
      <ConfirmDialog
        open={geste === 'depublier'}
        onClose={() => setGeste(null)}
        onConfirm={() => basculer(false)}
        pending={publish.isPending}
        tone="danger"
        title={`Dépublier « ${menu.title} » ?`}
        lead="La carte disparaît de votre vitrine : les clients ne la verront plus, et elle sort des semaines où vous l’aviez programmée."
        detail="Rien n’est perdu : elle repasse en brouillon avec ses plats, et vous la republiez quand vous voulez. Les réservations déjà prises ne changent pas."
        confirmLabel="Dépublier la carte"
      />

      {/* Supprimer */}
      <ConfirmDialog
        open={geste === 'supprimer'}
        onClose={() => setGeste(null)}
        onConfirm={() =>
          remove.mutate(menu.id, {
            onSuccess: () => {
              setGeste(null)
              toast.success(`« ${menu.title} » supprimée`)
            },
            onError: (e) =>
              toast.error(
                'La suppression a échoué',
                apiMessage(e),
              ),
          })
        }
        pending={remove.isPending}
        tone="danger"
        title={`Supprimer « ${menu.title} » ?`}
        lead="Seul l’assemblage disparaît. Vos plats, eux, restent dans votre catalogue."
        detail="C’est définitif : il faudra recomposer la carte pour la retrouver."
        confirmLabel="Supprimer la carte"
      />
    </li>
  )
}

/** Un plat vu depuis une carte : assez pour savoir s'il est prêt. */
function MenuDishRow({ dish }: { dish: MenuDish }) {
  const diets = useDiets()
  return (
    <li className="flex items-center gap-2.5 rounded-xl bg-cream-soft p-2">
      {dish.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dish.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
      ) : (
        <span
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-paper text-ink-soft"
        >
          <ImageIcon className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-navy">{dish.name}</span>
          <span
            aria-hidden
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_STYLE[dish.status].dot}`}
          />
        </p>
        <p className="truncate text-xs text-ink-soft">
          {[
            countryLabel(dish.country) || null,
            `${dish.portions} portions`,
            dish.allergensNone
              ? 'sans allergène'
              : dish.allergens.length > 0
                ? `${dish.allergens.length} allergène${dish.allergens.length > 1 ? 's' : ''}`
                : 'allergènes non déclarés',
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {dish.diets.length > 0 && (
          <p className="mt-0.5 truncate text-xs text-mint-ink">
            {dish.diets.map((d) => refLabel(diets, d)).join(', ')}
          </p>
        )}
      </div>
      {!dish.readiness?.ready && (
        <span className="shrink-0 text-xs font-semibold text-amber-ink">
          pas encore Prête
        </span>
      )}
    </li>
  )
}

// ── Propositions Lab's Food ─────────────────────────────────────────────────

type SuggestionDish = Suggestions['dishes'][number]
type SuggestionMenu = Suggestions['menus'][number]

/** Ce qu'on s'apprête à adopter, le temps de le confirmer. */
interface ADopter {
  id: string
  nom: string
  genre: 'plat' | 'carte'
}

function SuggestionsTab() {
  const toast = useToast()
  const query = useSuggestions()
  const adopt = useAdoptSuggestion()
  const diets = useDiets()
  const allergens = useAllergens()
  const categories = useDishCategories()
  const [aDopter, setADopter] = useState<ADopter | null>(null)
  const [detail, setDetail] = useState<SuggestionDish | null>(null)

  /*
   * L'API exige `{ consent: true }` et **enregistre** ce consentement : elle
   * ne copie rien chez quelqu'un sans qu'il l'ait voulu. L'envoyer au clic,
   * sans rien demander, viderait la garantie de son sens. On demande donc,
   * une fois, avant de copier.
   */
  function confirmerAdoption() {
    const quoi = aDopter
    if (!quoi) return
    adopt.mutate(
      { id: quoi.id, consent: true },
      {
        onSuccess: () => {
          setADopter(null)
          setDetail(null)
          toast.success(
            `« ${quoi.nom} » ${quoi.genre === 'plat' ? 'ajouté à vos plats' : 'ajoutée à vos cartes'}`,
            'Une copie, en brouillon : modifiez-la comme vous voulez.',
          )
        },
        onError: (e) =>
          toast.error('L’adoption a échoué', apiMessage(e)),
      },
    )
  }

  if (query.isPending) return <TabSkeleton layout="propositions" />
  if (query.isError) return <Failure onRetry={() => query.refetch()} what="les propositions" />

  const { dishes = [], menus = [] } = query.data ?? {}

  if (dishes.length === 0 && menus.length === 0) {
    return (
      <Empty
        icon={UtensilsCrossed}
        title="Rien à vous proposer aujourd’hui"
        text="Lab’s Food publie des plats et des cartes prêts à adopter. Quand il y en aura, ils apparaîtront ici."
      />
    )
  }

  return (
    <section className="space-y-7">
      <p className="max-w-prose text-sm leading-relaxed text-ink-mid">
        Adopter crée <strong className="font-semibold text-navy">une copie chez vous</strong> :
        vous la modifiez comme n’importe quel plat, et l’original reste à Lab’s Food.
      </p>

      {dishes.length > 0 && (
        <div>
          <h3 className="font-display text-base font-bold text-navy">
            Des plats
            <span className="ml-2 text-sm font-normal text-ink-soft">{dishes.length}</span>
          </h3>
          <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {dishes.map((d) => (
              <SuggestionCard
                key={d.id}
                dish={d}
                dietList={diets}
                allergenList={allergens}
                categoryList={categories}
                onOpen={() => setDetail(d)}
                onAdopt={() => setADopter({ id: d.id, nom: d.name, genre: 'plat' })}
                adopting={adopt.isPending}
              />
            ))}
          </ul>
        </div>
      )}

      {menus.length > 0 && (
        <div>
          <h3 className="font-display text-base font-bold text-navy">
            Des cartes entières
            <span className="ml-2 text-sm font-normal text-ink-soft">{menus.length}</span>
          </h3>
          <ul className="mt-3 space-y-4">
            {menus.map((m) => (
              <SuggestionMenuCard
                key={m.id}
                menu={m}
                onAdopt={() => setADopter({ id: m.id, nom: m.title, genre: 'carte' })}
                adopting={adopt.isPending}
              />
            ))}
          </ul>
        </div>
      )}

      {/* La fiche complète d'une proposition, avant de décider. */}
      <SuggestionDialog
        dish={detail}
        onClose={() => setDetail(null)}
        dietList={diets}
        allergenList={allergens}
        categoryList={categories}
        onAdopt={() =>
          detail && setADopter({ id: detail.id, nom: detail.name, genre: 'plat' })
        }
        adopting={adopt.isPending}
      />

      {/* Le consentement, demandé une fois, puis enregistré par l'API. */}
      <ConfirmDialog
        open={aDopter !== null}
        onClose={() => setADopter(null)}
        onConfirm={confirmerAdoption}
        pending={adopt.isPending}
        title={aDopter ? `Adopter « ${aDopter.nom} » ?` : ''}
        lead={`Une copie entre dans vos ${
          aDopter?.genre === 'plat' ? 'plats' : 'cartes'
        }, en brouillon : vous la modifiez, la publiez ou la supprimez librement. L’original reste à Lab’s Food.`}
        detail="Si Lab’s Food corrige plus tard les allergènes, les régimes ou le pays, votre copie est signalée et vous êtes prévenu — elle n’est jamais modifiée à votre place."
        confirmLabel={adopt.isPending ? 'Copie en cours…' : 'Oui, adopter'}
      />
    </section>
  )
}

function SuggestionCard({
  dish,
  dietList,
  allergenList,
  categoryList,
  onOpen,
  onAdopt,
  adopting,
}: {
  dish: SuggestionDish
  dietList: { code: string; label: string }[]
  allergenList: { code: string; label: string }[]
  categoryList: { code: string; label: string }[]
  onOpen: () => void
  onAdopt: () => void
  adopting: boolean
}) {
  return (
    <li className="flex flex-col overflow-hidden rounded-2xl bg-paper">
      <button
        type="button"
        onClick={onOpen}
        className="group block text-left"
        aria-label={`Voir le détail de ${dish.name}`}
      >
        {dish.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dish.imageUrl}
            alt=""
            className="aspect-[4/3] w-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex aspect-[4/3] w-full items-center justify-center bg-cream-soft text-ink-soft"
          >
            <UtensilsCrossed className="h-7 w-7" />
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col p-4">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <button
            type="button"
            onClick={onOpen}
            className="font-display text-base font-bold leading-tight text-navy underline-offset-2 hover:underline"
          >
            {dish.name}
          </button>
          {dish.category && (
            <span className="rounded-full bg-cream-soft px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-ink-mid">
              {refLabel(categoryList, dish.category)}
            </span>
          )}
        </p>

        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-soft">
          <span>{countryLabel(dish.country) || 'Origine à préciser'}</span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" aria-hidden /> {dish.portions}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden />
            {dish.cookMinutes
              ? `${dish.prepMinutes} + ${dish.cookMinutes} min`
              : `${dish.prepMinutes} min`}
          </span>
          {dish.difficulty && <span>{DIFFICULTY_LABEL[dish.difficulty]}</span>}
        </p>

        {dish.description && (
          <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-mid">
            {dish.description}
          </p>
        )}

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {dish.diets.slice(0, 3).map((d) => (
            <span
              key={d}
              className="rounded-full bg-mint/50 px-2 py-0.5 text-xs text-mint-ink"
            >
              {refLabel(dietList, d)}
            </span>
          ))}
          {dish.allergensNone ? (
            <span className="rounded-full bg-cream-soft px-2 py-0.5 text-xs text-navy">
              Sans allergène
            </span>
          ) : (
            dish.allergens.slice(0, 2).map((a) => (
              <span key={a} className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
                {refLabel(allergenList, a)}
              </span>
            ))
          )}
        </div>

        <div className="mt-auto pt-3.5">
          {dish.adoptedCopyId ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-mint-ink">
              <Check className="h-3.5 w-3.5" aria-hidden /> Déjà dans vos plats
            </span>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button onClick={onAdopt} disabled={adopting} className="btn btn-primary text-xs">
                Adopter
              </button>
              <button onClick={onOpen} className="btn btn-outline text-xs">
                Voir le détail
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

function SuggestionMenuCard({
  menu,
  onAdopt,
  adopting,
}: {
  menu: SuggestionMenu
  onAdopt: () => void
  adopting: boolean
}) {
  return (
    <li className="rounded-2xl bg-paper p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-lg font-bold leading-tight text-navy">{menu.title}</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {menu.dishes.length} plat{menu.dishes.length > 1 ? 's' : ''}
          </p>
          {menu.pitch && (
            <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-ink-mid">
              {menu.pitch}
            </p>
          )}
        </div>
        {menu.adoptedCopyId ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-mint-ink">
            <Check className="h-3.5 w-3.5" aria-hidden /> Déjà dans vos cartes
          </span>
        ) : (
          <button onClick={onAdopt} disabled={adopting} className="btn btn-primary text-xs">
            Adopter cette carte
          </button>
        )}
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {menu.dishes.map((d) => (
          <MenuDishRow key={d.id} dish={d} />
        ))}
      </ul>
    </li>
  )
}

/**
 * La fiche d'une proposition.
 *
 * Tout ce que l'API donne, sauf la recette : elle n'est pas dans la réponse.
 * On le dit, plutôt que de laisser croire qu'un plat adopté arriverait sans
 * ingrédients.
 */
function SuggestionDialog({
  dish,
  onClose,
  dietList,
  allergenList,
  categoryList,
  onAdopt,
  adopting,
}: {
  dish: SuggestionDish | null
  onClose: () => void
  dietList: { code: string; label: string }[]
  allergenList: { code: string; label: string }[]
  categoryList: { code: string; label: string }[]
  onAdopt: () => void
  adopting: boolean
}) {
  if (!dish) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={dish.name}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-paper sm:rounded-3xl"
      >
        {dish.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dish.imageUrl} alt="" className="aspect-[16/9] w-full object-cover" />
        ) : (
          <span
            aria-hidden
            className="flex aspect-[16/9] w-full items-center justify-center bg-cream-soft text-ink-soft"
          >
            <UtensilsCrossed className="h-8 w-8" />
          </span>
        )}

        <div className="p-5 lg:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold leading-tight text-navy">
                {dish.name}
              </h2>
              <p className="mt-1 text-xs text-ink-soft">
                {[
                  countryLabel(dish.country) || 'Origine à préciser',
                  dish.category ? refLabel(categoryList, dish.category) : null,
                  dish.difficulty ? DIFFICULTY_LABEL[dish.difficulty] : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="hit flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream-soft text-ink-mid hover:text-navy"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {dish.description && (
            <p className="mt-3 text-sm leading-relaxed text-ink-mid">{dish.description}</p>
          )}

          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat label="portions" value={String(dish.portions)} />
            <Stat label="préparation" value={`${dish.prepMinutes} min`} prive />
            <Stat
              label="cuisson"
              value={dish.cookMinutes ? `${dish.cookMinutes} min` : '—'}
              prive
            />
          </dl>

          <Section title="Régimes couverts">
            {dish.diets.length === 0 && dish.customDiets.length === 0 ? (
              <p className="text-[13px] text-ink-soft">Aucun régime déclaré.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {dish.diets.map((d) => (
                  <span
                    key={d}
                    className="rounded-full bg-mint/50 px-2.5 py-1 text-[12px] text-mint-ink"
                  >
                    {refLabel(dietList, d)}
                  </span>
                ))}
                {dish.customDiets.map((d) => (
                  <span
                    key={d}
                    className="rounded-full bg-mint/40 px-2.5 py-1 text-xs text-mint-ink"
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}
          </Section>

          <Section title="Allergènes">
            {dish.allergensNone ? (
              <p className="text-[13px] text-mint-ink">
                Aucun des 14 allergènes réglementés — déclaré explicitement.
              </p>
            ) : dish.allergens.length === 0 && dish.customAllergens.length === 0 ? (
              <p className="text-[13px] text-amber-ink">
                Non renseignés. À vérifier avant de publier votre copie.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {dish.allergens.map((a) => (
                  <span
                    key={a}
                    className="rounded-full bg-red-50 px-2.5 py-1 text-[12px] text-red-700"
                  >
                    {refLabel(allergenList, a)}
                  </span>
                ))}
                {dish.customAllergens.map((a) => (
                  <span
                    key={a}
                    className="rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-700"
                  >
                    {a}
                  </span>
                ))}
              </div>
            )}
          </Section>

          <p className="mt-4 rounded-xl bg-cream-soft px-3.5 py-3 text-[12px] leading-relaxed text-ink-mid">
            La recette — ingrédients, étapes, réchauffage — n’est pas montrée
            ici. Elle arrive avec votre copie, et vous pourrez la modifier
            comme la vôtre.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {dish.adoptedCopyId ? (
              <>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-mint-ink">
                  <Check className="h-3.5 w-3.5" aria-hidden /> Déjà dans vos plats
                </span>
                <Link
                  href={`/espace-chef/recettes/${dish.adoptedCopyId}`}
                  className="btn btn-outline text-xs"
                >
                  Ouvrir ma copie
                </Link>
              </>
            ) : (
              <button onClick={onAdopt} disabled={adopting} className="btn btn-primary text-xs">
                Adopter ce plat
              </button>
            )}
            <button onClick={onClose} className="btn btn-outline text-xs">
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  prive,
}: {
  label: string
  value: string
  /** Absent de la vitrine publique : on le dit (temps et calories). */
  prive?: boolean
}) {
  return (
    <div className="rounded-xl bg-cream-soft p-2.5">
      <dt className="flex items-center justify-center gap-0.5 text-xs uppercase tracking-wide text-ink-soft">
        {label}
        {prive && (
          <InfoPopover label={`Qui voit la ${label} ?`}>
            Visible par vous seulement, pas par les clients.
          </InfoPopover>
        )}
      </dt>
      <dd className="font-display text-base font-bold text-navy">{value}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {title}
      </p>
      {children}
    </div>
  )
}

// ── États partagés ──────────────────────────────────────────────────────────

/**
 * Le chargement d'un onglet, à la forme de ses cartes : plats (grille à deux
 * colonnes, photo + texte + pied), cartes (une par ligne), propositions
 * (grille à trois colonnes, photo en tête).
 */
function TabSkeleton({ layout }: { layout: 'plats' | 'cartes' | 'propositions' }) {
  if (layout === 'propositions') {
    return (
      <SkeletonGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonCard key={i} className="p-0">
            <Skeleton className="aspect-[4/3] w-full rounded-none rounded-t-2xl" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-9 w-28 rounded-full" />
            </div>
          </SkeletonCard>
        ))}
      </SkeletonGroup>
    )
  }

  if (layout === 'cartes') {
    return (
      <SkeletonGroup>
        <TabHeaderSkeleton />
        <div className="mt-4 space-y-4">
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} className="space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-2">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <Skeleton className="h-12 w-12 rounded-lg" />
              <Skeleton className="h-12 w-12 rounded-lg" />
            </div>
          </SkeletonCard>
        ))}
        </div>
      </SkeletonGroup>
    )
  }

  return (
    <SkeletonGroup>
      <TabHeaderSkeleton />
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      {Array.from({ length: 4 }, (_, i) => (
        <SkeletonCard key={i} className="p-0">
          <div className="flex gap-4 p-4">
            <Skeleton className="h-24 w-24 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-1/2 rounded-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-5 w-full" />
            </div>
          </div>
          <div className="flex gap-2 border-t border-[rgba(31,42,55,0.07)] px-4 py-3">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        </SkeletonCard>
      ))}
      </div>
    </SkeletonGroup>
  )
}

/** La ligne « n plats » + bouton, au-dessus des listes de plats et de cartes. */
function TabHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3">
      <Skeleton className="h-5 w-44" />
      <Skeleton className="h-11 w-36 rounded-full" />
    </div>
  )
}

function Failure({ onRetry, what }: { onRetry: () => void; what: string }) {
  return (
    <div className="rounded-2xl bg-paper p-6">
      <p className="font-display text-lg font-bold text-navy">Chargement impossible</p>
      <p className="mt-1.5 max-w-prose text-sm text-ink-mid">
        Nous n’avons pas pu récupérer {what}. Rien n’est perdu.
      </p>
      <button onClick={onRetry} className="btn btn-primary mt-4 text-xs">
        <RotateCw className="h-3.5 w-3.5" aria-hidden /> Réessayer
      </button>
    </div>
  )
}

function Empty({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: typeof UtensilsCrossed
  title: string
  text: string
  action?: React.ReactNode
}) {
  return (
    <div className="mt-4 rounded-2xl bg-paper px-6 py-12 text-center">
      <Icon className="mx-auto h-7 w-7 text-ink-soft" aria-hidden />
      <p className="mt-3 font-display text-lg font-bold text-navy">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-mid">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
