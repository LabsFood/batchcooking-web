'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Image as ImageIcon,
  Loader2,
  Plus,
  RotateCw,
  Sparkles,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import Link from 'next/link'
import ChefPage from '@/components/chef/ChefPage'
import { useToast } from '@/components/shared/Toaster'
import { countryLabel } from '@/lib/chef/countries'
import {
  DISH_STATUS_LABEL,
  checkPhoto,
  publishBlockers,
  useAdoptSuggestion,
  useCreateMenu,
  useDeleteDish,
  useDeleteMenu,
  useDishPhoto,
  useDishes,
  useMenus,
  usePublishDish,
  usePublishMenu,
  useSuggestions,
  type Dish,
  type DishStatus,
  type Menu,
} from '@/lib/api/chef-catalog'

/* ─────────────────────────────────────────────────────────────────────────────
   Mes plats et mes menus.

   Un plat naît en brouillon et ne devient public qu'à la publication : rien
   n'échappe au chef. Un menu se compose de ses propres plats, et le publier
   publie ce qu'il contient.

   L'écran dit toujours **ce qui manque pour publier** plutôt que de griser un
   bouton sans raison : c'est la seule question qu'on se pose devant un
   brouillon.
   ───────────────────────────────────────────────────────────────────────────── */

type Tab = 'dishes' | 'menus' | 'suggestions'

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

        {tab === 'dishes' && <DishesTab query={dishes} />}
        {tab === 'menus' && <MenusTab query={menus} dishes={dishes.data ?? []} />}
        {tab === 'suggestions' && <SuggestionsTab />}
      </div>
    </ChefPage>
  )
}

// ── Plats ───────────────────────────────────────────────────────────────────

function DishesTab({ query }: { query: ReturnType<typeof useDishes> }) {
  if (query.isPending) return <Skeleton />
  if (query.isError) return <Failure onRetry={() => query.refetch()} what="vos plats" />

  const dishes = query.data ?? []

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-mid">
          {dishes.length === 0
            ? 'Aucun plat pour l’instant.'
            : `${dishes.length} plat${dishes.length > 1 ? 's' : ''}, dont ${
                dishes.filter((d) => d.status === 'published').length
              } publié${dishes.filter((d) => d.status === 'published').length > 1 ? 's' : ''}`}
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
            <DishCard key={dish.id} dish={dish} />
          ))}
        </ul>
      )}
    </section>
  )
}

function DishCard({ dish }: { dish: Dish }) {
  const toast = useToast()
  const publish = usePublishDish()
  const remove = useDeleteDish()
  const photo = useDishPhoto()
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
        onSuccess: () => toast.success('Photo mise \u00e0 jour'),
        onError: () =>
          toast.error('La photo n\u2019a pas \u00e9t\u00e9 envoy\u00e9e', 'Rien n\u2019a chang\u00e9 \u2014 r\u00e9essayez.'),
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
          <span className="absolute inset-0 flex items-center justify-center bg-navy/70 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
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

          <p className="mt-0.5 text-xs text-ink-soft">
            {[
              countryLabel(dish.country) || null,
              `${dish.portions} portions`,
              `${dish.prepMinutes} min`,
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
              <span key={d} className="rounded-full bg-mint/50 px-2 py-0.5 text-[11px] text-mint-ink">
                {d}
              </span>
            ))}
            {dish.allergensNone ? (
              <span className="rounded-full bg-cream-soft px-2 py-0.5 text-[11px] text-navy">
                Sans allergène
              </span>
            ) : (
              dish.allergens.slice(0, 3).map((a) => (
                <span key={a} className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-700">
                  {a}
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

      {/* Ce qui manque pour publier, dit avant d'être refusé. */}
      {dish.status === 'draft' && blockers.length > 0 && (
        <p className="flex items-start gap-2 bg-cream-soft px-4 py-2.5 text-[13px] leading-relaxed text-ink-mid">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-deep" aria-hidden />
          Pour publier, il manque {blockers.join(', ')}.
        </p>
      )}

      <footer className="flex flex-wrap items-center gap-2 border-t border-[rgba(31,42,55,0.07)] px-4 py-3">
        <Link href={`/espace-chef/recettes/${dish.id}`} className="btn btn-outline text-xs">
          Modifier
        </Link>

        {dish.status === 'published' ? (
          <button
            onClick={() =>
              publish.mutate(
                { id: dish.id, publish: false },
                {
                  onSuccess: () =>
                    toast.info(`\u00ab\u00a0${dish.name}\u00a0\u00bb n\u2019est plus visible`, 'Il reste dans vos plats, en brouillon.'),
                  onError: () => toast.error('La d\u00e9publication a \u00e9chou\u00e9'),
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
                  onSuccess: () => toast.success(`\u00ab\u00a0${dish.name}\u00a0\u00bb est publi\u00e9`),
                  onError: (e) =>
                    toast.error(
                      'La publication a \u00e9t\u00e9 refus\u00e9e',
                      e instanceof Error ? e.message : undefined,
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

        {confirmDelete ? (
          <span className="ml-auto flex items-center gap-2 text-xs">
            <span className="text-ink-mid">Supprimer ce plat ?</span>
            <button
              onClick={() =>
                remove.mutate(dish.id, {
                  onSuccess: () => toast.success(`\u00ab\u00a0${dish.name}\u00a0\u00bb supprim\u00e9`),
                  onError: () => toast.error('La suppression a \u00e9chou\u00e9'),
                })
              }
              disabled={busy}
              className="font-semibold text-red-700 hover:underline"
            >
              Oui
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-ink-soft hover:text-navy">
              Non
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            aria-label={`Supprimer ${dish.name}`}
            className="ml-auto text-ink-soft hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </footer>
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
  const [title, setTitle] = useState('')
  const [picked, setPicked] = useState<string[]>([])

  if (query.isPending) return <Skeleton />
  if (query.isError) return <Failure onRetry={() => query.refetch()} what="vos menus" />

  const menus = query.data ?? []

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-mid">
          {menus.length === 0
            ? 'Aucun menu pour l’instant.'
            : `${menus.length} menu${menus.length > 1 ? 's' : ''}`}
        </p>
        <button onClick={() => setComposing((v) => !v)} className="btn btn-primary text-xs">
          <Plus className="h-3.5 w-3.5" aria-hidden /> Nouveau menu
        </button>
      </div>

      {composing && (
        <div className="mt-4 rounded-2xl bg-paper p-5">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-navy">
              Titre de la carte
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tour du monde en sept plats"
              className="input-base"
            />
          </label>

          <p className="mb-2 mt-4 text-[13px] font-semibold text-navy">
            Les plats de cette carte
            <span className="ml-2 font-normal text-ink-soft">{picked.length} choisi{picked.length > 1 ? 's' : ''}</span>
          </p>
          {dishes.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Écrivez d’abord un plat : une carte se compose des vôtres.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {dishes.map((d) => {
                const on = picked.includes(d.id)
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setPicked((p) => (on ? p.filter((x) => x !== d.id) : [...p, d.id]))
                      }
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        on ? 'bg-navy text-white' : 'bg-cream-soft text-ink-mid hover:text-navy'
                      }`}
                    >
                      {d.name}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={() =>
                create.mutate(
                  { title: title.trim(), dishIds: picked },
                  {
                    onSuccess: (menu) => {
                      setComposing(false)
                      setTitle('')
                      setPicked([])
                      toast.success(`Carte « ${menu.title} » créée`, 'En brouillon : publiez-la quand elle vous convient.')
                    },
                    onError: (e) =>
                      toast.error(
                        'La carte n’a pas été créée',
                        e instanceof Error ? e.message : undefined,
                      ),
                  },
                )
              }
              disabled={title.trim().length < 3 || picked.length === 0 || create.isPending}
              className="btn btn-primary text-xs disabled:opacity-50"
            >
              {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Créer la carte
            </button>
            <button onClick={() => setComposing(false)} className="btn btn-outline text-xs">
              Annuler
            </button>
          </div>
        </div>
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
            <MenuCard key={m.id} menu={m} />
          ))}
        </ul>
      )}
    </section>
  )
}

function MenuCard({ menu }: { menu: Menu }) {
  const toast = useToast()
  const publish = usePublishMenu()
  const remove = useDeleteMenu()
  const [open, setOpen] = useState(false)
  const style = STATUS_STYLE[menu.status]

  return (
    <li className="rounded-2xl bg-paper p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
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
            {menu.dishes.length} plat{menu.dishes.length > 1 ? 's' : ''}
            {menu.shoppingIncluded && ' · courses incluses'}
          </p>
          {menu.pitch && (
            <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-ink-mid">
              {menu.pitch}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {menu.status === 'published' ? (
            <button
              onClick={() =>
                publish.mutate(
                  { id: menu.id, publish: false },
                  {
                    onSuccess: () => toast.info(`« ${menu.title} » n’est plus visible`),
                    onError: () => toast.error('La dépublication a échoué'),
                  },
                )
              }
              disabled={publish.isPending}
              className="btn btn-outline text-xs"
            >
              Dépublier
            </button>
          ) : (
            <button
              onClick={() =>
                publish.mutate(
                  { id: menu.id, publish: true },
                  {
                    onSuccess: () =>
                      toast.success(`« ${menu.title} » est publiée`, 'Les plats de la carte le sont aussi.'),
                    onError: (e) =>
                      toast.error(
                        'La publication a été refusée',
                        e instanceof Error ? e.message : undefined,
                      ),
                  },
                )
              }
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
              remove.mutate(menu.id, {
                onSuccess: () => toast.success(`« ${menu.title} » supprimée`),
                onError: () => toast.error('La suppression a échoué'),
              })
            }
            aria-label={`Supprimer ${menu.title}`}
            className="text-ink-soft hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {menu.dishes.length > 0 && (
        <div className="mt-3 border-t border-[rgba(31,42,55,0.07)] pt-3">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-mid hover:text-navy"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            {open ? 'Masquer les plats' : 'Voir les plats'}
          </button>
          {open && (
            <ul className="mt-2 space-y-1.5">
              {menu.dishes.map((d) => (
                <li key={d.id} className="flex items-center gap-2 text-[13px]">
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLE[d.status].dot}`}
                  />
                  <span className="text-navy">{d.name}</span>
                  <span className="text-ink-soft">{countryLabel(d.country)}</span>
                  {!d.recipeComplete && (
                    <span className="text-[11px] text-amber-deep">recette incomplète</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  )
}

// ── Propositions Lab's Food ─────────────────────────────────────────────────

function SuggestionsTab() {
  const toast = useToast()
  const query = useSuggestions()
  const adopt = useAdoptSuggestion()

  if (query.isPending) return <Skeleton />
  if (query.isError) return <Failure onRetry={() => query.refetch()} what="les propositions" />

  const { dishes = [], menus = [] } = query.data ?? {}

  if (dishes.length === 0 && menus.length === 0) {
    return (
      <Empty
        icon={Sparkles}
        title="Rien à vous proposer aujourd’hui"
        text="Lab’s Food publie des plats et des cartes prêts à adopter. Quand il y en aura, ils apparaîtront ici."
      />
    )
  }

  return (
    <section className="space-y-6">
      <p className="max-w-prose text-sm text-ink-mid">
        Adopter crée <strong className="font-semibold text-navy">une copie chez vous</strong> :
        vous la modifiez comme n’importe quel plat, et l’original reste à Lab’s Food.
      </p>

      {dishes.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {dishes.map((d) => (
            <li key={d.id} className="rounded-2xl bg-paper p-4">
              <p className="font-display text-base font-bold text-navy">{d.name}</p>
              <p className="mt-0.5 text-xs text-ink-soft">
                {[countryLabel(d.country), `${d.portions} portions`].filter(Boolean).join(' · ')}
              </p>
              {d.description && (
                <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-mid">
                  {d.description}
                </p>
              )}
              <div className="mt-3">
                {d.adoptedCopyId ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-mint-ink">
                    <Check className="h-3.5 w-3.5" aria-hidden /> Déjà dans vos plats
                  </span>
                ) : (
                  <button
                    onClick={() =>
                      adopt.mutate(d.id, {
                        onSuccess: () =>
                          toast.success(`« ${d.name} » ajouté à vos plats`, 'Une copie : modifiez-la comme vous voulez.'),
                        onError: () => toast.error('L’adoption a échoué'),
                      })
                    }
                    disabled={adopt.isPending}
                    className="btn btn-outline text-xs"
                  >
                    {adopt.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Adopter
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {menus.length > 0 && (
        <ul className="space-y-4">
          {menus.map((m) => (
            <li key={m.id} className="rounded-2xl bg-paper p-5">
              <p className="font-display text-lg font-bold text-navy">{m.title}</p>
              {m.pitch && <p className="mt-1 text-[13px] text-ink-mid">{m.pitch}</p>}
              <p className="mt-1 text-xs text-ink-soft">
                {m.dishes.map((d) => d.name).join(' · ')}
              </p>
              <div className="mt-3">
                {m.adoptedCopyId ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-mint-ink">
                    <Check className="h-3.5 w-3.5" aria-hidden /> Déjà dans vos cartes
                  </span>
                ) : (
                  <button
                    onClick={() =>
                      adopt.mutate(m.id, {
                        onSuccess: () => toast.success(`« ${m.title} » ajoutée à vos cartes`),
                        onError: () => toast.error('L’adoption a échoué'),
                      })
                    }
                    disabled={adopt.isPending}
                    className="btn btn-outline text-xs"
                  >
                    Adopter cette carte
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ── États partagés ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-36 animate-pulse rounded-2xl bg-paper" />
      ))}
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
