'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Clock,
  Eye,
  FileText,
  FileWarning,
  Globe2,
  Lock,
  Pencil,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import ChefPage, { Card, Empty } from '@/components/chef/ChefPage'
import StatusBadge, { type Tone } from '@/components/chef/StatusBadge'
import DishForm from '@/components/chef/recipes/DishForm'
import ShowcaseMonth from '@/components/chef/recipes/ShowcaseMonth'
import DocDialog from '@/components/chef/documents/DocDialog'
import RecipeSheet from '@/components/chef/documents/RecipeSheet'
import {
  CHEF_DISHES,
  CHEF_MENUS,
  CHEF_PROFILE,
  CONTENT_STATUS_LABEL,
  LF_SUGGESTIONS,
  type ChefDish,
  type ChefMenu,
  type ContentStatus,
  type LfSuggestion,
} from '@/lib/chef/mock'
import { EMPTY_RECIPE } from '@/lib/chef/recipes'
import { cn } from '@/lib/utils'

const STATUS_TONE: Record<ContentStatus, Tone> = {
  draft: 'neutral',
  pending: 'warning',
  published: 'success',
  rejected: 'danger',
}

type Tab = 'dishes' | 'menus' | 'showcase' | 'suggestions'

export default function ChefRecipesPage() {
  const [tab, setTab] = useState<Tab>('dishes')
  const [dishes, setDishes] = useState<ChefDish[]>(CHEF_DISHES)
  const [menus, setMenus] = useState<ChefMenu[]>(CHEF_MENUS)
  const [suggestions, setSuggestions] = useState<LfSuggestion[]>(LF_SUGGESTIONS)

  const [editingDish, setEditingDish] = useState<ChefDish | 'new' | null>(null)
  const [editingMenu, setEditingMenu] = useState<ChefMenu | 'new' | null>(null)
  const [sheetDish, setSheetDish] = useState<ChefDish | null>(null)

  const saveDish = (d: ChefDish) =>
    setDishes((prev) => (prev.some((x) => x.id === d.id) ? prev.map((x) => (x.id === d.id ? d : x)) : [d, ...prev]))

  const saveMenu = (m: ChefMenu) =>
    setMenus((prev) => (prev.some((x) => x.id === m.id) ? prev.map((x) => (x.id === m.id ? m : x)) : [m, ...prev]))

  // ── Formulaires plein écran ────────────────────────────────────────────
  if (editingDish) {
    return (
      <ChefPage title={editingDish === 'new' ? 'Nouveau plat' : 'Modifier le plat'}>
        <DishForm
          dish={editingDish === 'new' ? null : editingDish}
          onCancel={() => setEditingDish(null)}
          onSave={(d) => {
            saveDish(d)
            setEditingDish(null)
          }}
        />
      </ChefPage>
    )
  }

  if (editingMenu) {
    return (
      <ChefPage title={editingMenu === 'new' ? 'Nouveau menu' : 'Modifier le menu'}>
        <MenuForm
          menu={editingMenu === 'new' ? null : editingMenu}
          dishes={dishes}
          onCancel={() => setEditingMenu(null)}
          onSave={(m) => {
            saveMenu(m)
            setEditingMenu(null)
          }}
        />
      </ChefPage>
    )
  }

  const TABS: { id: Tab; label: string; n?: number }[] = [
    { id: 'dishes', label: 'Mes plats', n: dishes.length },
    { id: 'menus', label: 'Mes menus', n: menus.length },
    { id: 'showcase', label: 'Vitrine du mois' },
    { id: 'suggestions', label: 'Menus proposés par Lab’s Food', n: suggestions.length },
  ]

  return (
    <ChefPage title="Menus & recettes" subtitle="Vos plats, vos menus et votre vitrine du mois.">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                tab === t.id ? 'bg-navy text-white' : 'border border-[rgba(31,42,55,0.1)] bg-paper text-ink-mid hover:text-navy',
              )}
            >
              {t.label}
              {t.n !== undefined && <span className="tabular-nums opacity-70"> ({t.n})</span>}
            </button>
          ))}
        </div>

        {/* ── Mes plats ───────────────────────────────────────────────── */}
        {tab === 'dishes' && (
          <Card
            title={`Mes plats (${dishes.length})`}
            action={
              <button onClick={() => setEditingDish('new')} className="btn btn-primary px-4 py-2 text-xs">
                <Plus className="h-3.5 w-3.5" aria-hidden /> Nouveau plat
              </button>
            }
          >
            {dishes.length === 0 ? (
              <Empty text="Créez votre premier plat pour composer un menu." />
            ) : (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {dishes.map((d) => (
                  <li key={d.id} className="flex flex-col rounded-2xl border border-[rgba(31,42,55,0.08)] p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="font-display text-base font-bold leading-tight text-navy">{d.name}</p>
                      <StatusBadge tone={STATUS_TONE[d.status]}>{CONTENT_STATUS_LABEL[d.status]}</StatusBadge>
                    </div>

                    <p className="mb-2 line-clamp-2 text-xs text-ink-mid">{d.description}</p>

                    <p className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
                      <Globe2 className="h-3.5 w-3.5" aria-hidden /> {d.country} · {d.category}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                      <Chip Icon={Users}>{d.portions} portions</Chip>
                      <Chip Icon={Clock}>{d.prepMin + d.cookMin} min</Chip>
                      {d.recipe.ingredients.length > 0 && (
                        <Chip Icon={FileText}>{d.recipe.ingredients.length} ingrédients</Chip>
                      )}
                    </div>

                    {d.allergens.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {d.allergens.map((a) => (
                          <span key={a} className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-red-700">
                            {a}
                          </span>
                        ))}
                      </div>
                    )}

                    {d.status === 'rejected' && d.rejectionReason && (
                      <div className="mt-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                        <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-700" aria-hidden />
                        <p className="text-[11px] leading-relaxed text-red-700">{d.rejectionReason}</p>
                      </div>
                    )}

                    <div className="mt-auto flex gap-2 pt-3">
                      <button
                        onClick={() => setEditingDish(d)}
                        className="btn btn-outline flex-1 justify-center px-3 py-1.5 text-xs"
                      >
                        <Pencil className="h-3 w-3" aria-hidden /> Modifier
                      </button>
                      <button
                        onClick={() => setSheetDish(d)}
                        aria-label={`Aperçu de la fiche ${d.name}`}
                        title="Aperçu de la fiche"
                        className="btn btn-outline px-3 py-1.5 text-xs"
                      >
                        <Eye className="h-3 w-3" aria-hidden />
                      </button>
                      {d.status === 'draft' && (
                        <button
                          onClick={() => saveDish({ ...d, status: 'pending' })}
                          className="btn btn-primary flex-1 justify-center px-3 py-1.5 text-xs"
                        >
                          <Send className="h-3 w-3" aria-hidden /> Publier
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {/* ── Mes menus ───────────────────────────────────────────────── */}
        {tab === 'menus' && (
          <Card
            title={`Mes menus (${menus.length})`}
            action={
              <button onClick={() => setEditingMenu('new')} className="btn btn-primary px-4 py-2 text-xs">
                <Plus className="h-3.5 w-3.5" aria-hidden /> Nouveau menu
              </button>
            }
          >
            {menus.length === 0 ? (
              <Empty text="Composez un menu à partir de vos plats." />
            ) : (
              <ul className="space-y-3">
                {menus.map((m) => (
                  <li key={m.id} className="rounded-2xl border border-[rgba(31,42,55,0.08)] p-4">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-base font-bold text-navy">{m.title}</p>
                        <p className="text-xs capitalize text-ink-soft">
                          {m.period} · {m.dishIds.length} plats
                        </p>
                      </div>
                      <StatusBadge tone={STATUS_TONE[m.status]}>{CONTENT_STATUS_LABEL[m.status]}</StatusBadge>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.dishIds.map((id) => {
                        const d = dishes.find((x) => x.id === id)
                        return (
                          <span key={id} className="rounded-full bg-cream-soft px-2.5 py-1 text-[11px] text-navy">
                            {d?.name ?? 'Plat supprimé'}
                          </span>
                        )
                      })}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button onClick={() => setEditingMenu(m)} className="btn btn-outline px-3 py-1.5 text-xs">
                        <Pencil className="h-3 w-3" aria-hidden /> Modifier
                      </button>
                      {m.status === 'draft' && (
                        <button
                          onClick={() => saveMenu({ ...m, status: 'pending' })}
                          className="btn btn-primary px-3 py-1.5 text-xs"
                        >
                          <Send className="h-3 w-3" aria-hidden /> Publier
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {/* ── Vitrine du mois ─────────────────────────────────────────── */}
        {tab === 'showcase' && <ShowcaseMonth menus={menus} dishes={dishes} />}

        {/* ── Menus proposés par Lab's Food ───────────────────────────── */}
        {tab === 'suggestions' && (
          <>
            <div className="flex items-start gap-3 rounded-2xl border border-amber/30 bg-amber-soft/40 px-4 py-3.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-deep" aria-hidden />
              <p className="text-xs leading-relaxed text-ink-mid">
                <span className="font-semibold text-navy">Aucun menu ne vous est imposé.</span> Ce sont des
                propositions : vous n&apos;en voyez que l&apos;aperçu tant que vous ne les ajoutez pas vous-même à
                votre vitrine. Votre choix est enregistré pour garantir votre indépendance.
              </p>
            </div>

            <Card title={`Propositions (${suggestions.length})`}>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {suggestions.map((r) => (
                  <SuggestionCard
                    key={r.id}
                    suggestion={r}
                    onAdopt={() => {
                      setSuggestions((prev) => prev.map((x) => (x.id === r.id ? { ...x, unlocked: true } : x)))
                      saveDish({
                        id: `dish_${Date.now()}`,
                        name: r.name,
                        description: 'Menu proposé par Lab’s Food, à adapter à votre façon de cuisiner.',
                        country: r.country,
                        category: r.category,
                        portions: r.portions,
                        prepMin: r.prepMin,
                        cookMin: r.cookMin,
                        difficulty: 'moyen',
                        diets: [],
                        allergens: r.allergens,
                        status: 'draft',
                        origin: 'labs-food',
                        recipe: EMPTY_RECIPE,
                      })
                    }}
                  />
                ))}
              </ul>
            </Card>
          </>
        )}
      </div>

      <DocDialog
        open={Boolean(sheetDish)}
        onOpenChange={(v) => !v && setSheetDish(null)}
        title="Fiche recette Lab's Food"
        description={sheetDish?.name}
      >
        {sheetDish && <RecipeSheet dish={sheetDish} chefName={CHEF_PROFILE.name} />}
      </DocDialog>
    </ChefPage>
  )
}

/* ── Formulaire menu (composition de plats) ─────────────────────────────── */

function MenuForm({
  menu,
  dishes,
  onCancel,
  onSave,
}: {
  menu: ChefMenu | null
  dishes: ChefDish[]
  onCancel: () => void
  onSave: (m: ChefMenu) => void
}) {
  const [title, setTitle] = useState(menu?.title ?? '')
  const [period, setPeriod] = useState<'semaine' | 'mois'>(menu?.period ?? 'semaine')
  const [dishIds, setDishIds] = useState<string[]>(menu?.dishIds ?? [])

  const toggleDish = (id: string) =>
    setDishIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const canSave = title.trim().length > 0 && dishIds.length > 0

  const submit = (status: ContentStatus) =>
    onSave({ id: menu?.id ?? `menu_${Date.now()}`, title: title.trim(), period, dishIds, status })

  return (
    <div className="max-w-3xl space-y-5">
      <button
        onClick={onCancel}
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-ink-mid hover:text-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Menus &amp; recettes
      </button>

      <Card title="Informations">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_200px]">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy">
              Titre du menu <span className="text-terra">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Semaine méditerranéenne"
              className="input-base"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy">Période</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'semaine' | 'mois')}
              className="input-base"
            >
              <option value="semaine">Semaine</option>
              <option value="mois">Mois</option>
            </select>
          </div>
        </div>
      </Card>

      <Card title={`Composition (${dishIds.length} plat${dishIds.length > 1 ? 's' : ''})`}>
        {dishes.length === 0 ? (
          <Empty text="Créez d’abord des plats pour composer un menu." />
        ) : (
          <ul className="space-y-2">
            {dishes.map((d) => {
              const on = dishIds.includes(d.id)
              return (
                <li key={d.id}>
                  <button
                    onClick={() => toggleDish(d.id)}
                    aria-pressed={on}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors',
                      on ? 'border-amber bg-amber-soft/30' : 'border-[rgba(31,42,55,0.08)] hover:bg-cream-soft',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2',
                        on ? 'border-amber bg-amber' : 'border-[rgba(31,42,55,0.2)]',
                      )}
                      aria-hidden
                    >
                      {on && <span className="h-2 w-2 rounded-sm bg-navy" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-navy">{d.name}</p>
                      <p className="text-xs text-ink-soft">
                        {d.country} · {d.category} · {d.portions} portions
                      </p>
                    </div>
                    <StatusBadge tone={STATUS_TONE[d.status]}>{CONTENT_STATUS_LABEL[d.status]}</StatusBadge>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        <button onClick={onCancel} className="btn btn-outline text-sm">
          <X className="h-4 w-4" aria-hidden /> Annuler
        </button>
        <button
          onClick={() => submit('draft')}
          disabled={!canSave}
          className="btn btn-outline text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          Enregistrer en brouillon
        </button>
        <button
          onClick={() => submit('pending')}
          disabled={!canSave}
          className="btn btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" aria-hidden /> Soumettre à validation
        </button>
      </div>
      {!canSave && <p className="text-[11px] text-ink-soft">Un titre et au moins un plat sont nécessaires.</p>}
    </div>
  )
}

/* ── Proposition Lab's Food (verrou de consentement) ────────────────────── */

function SuggestionCard({ suggestion: r, onAdopt }: { suggestion: LfSuggestion; onAdopt: () => void }) {
  const [consent, setConsent] = useState(false)
  const [open, setOpen] = useState(false)

  if (r.unlocked) {
    return (
      <li className="rounded-2xl border border-mint-deep/50 bg-mint/20 p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="font-display text-base font-bold leading-tight text-navy">{r.name}</p>
          <StatusBadge tone="success">
            <Sparkles className="h-3 w-3" aria-hidden /> Ajoutée
          </StatusBadge>
        </div>
        <p className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
          <Globe2 className="h-3.5 w-3.5" aria-hidden /> {r.country}
        </p>
        <p className="mt-3 text-[11px] text-mint-ink">
          Choix enregistré — le menu a rejoint vos plats en brouillon.
        </p>
      </li>
    )
  }

  return (
    <li className="rounded-2xl border border-[rgba(31,42,55,0.08)] p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-display text-base font-bold leading-tight text-navy">{r.name}</p>
        <StatusBadge tone="warning">
          <Lock className="h-3 w-3" aria-hidden /> Aperçu
        </StatusBadge>
      </div>
      <p className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
        <Globe2 className="h-3.5 w-3.5" aria-hidden /> {r.country}
      </p>

      <div className="relative mt-3">
        <div className="pointer-events-none select-none space-y-1.5 blur-[3px]" aria-hidden>
          <p className="text-xs text-ink-mid">Ingrédients : 8 éléments structurés…</p>
          <p className="text-xs text-ink-mid">Étapes : 6 étapes ordonnées…</p>
          <p className="text-xs text-ink-mid">Réchauffage et conservation renseignés…</p>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Eye className="h-4 w-4 text-ink-soft" aria-hidden />
        </div>
      </div>

      {!open ? (
        <button onClick={() => setOpen(true)} className="btn btn-primary mt-4 w-full justify-center py-2.5 text-xs">
          Ajouter à ma vitrine
        </button>
      ) : (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
          <label className="mb-3 flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-[11px] leading-relaxed text-ink-mid">
              J&apos;ajoute ce menu à ma vitrine de ma propre initiative et je reste libre de le retirer à tout moment.
            </span>
          </label>
          <button
            disabled={!consent}
            onClick={onAdopt}
            className="btn btn-primary w-full justify-center py-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirmer et déverrouiller
          </button>
        </motion.div>
      )}
    </li>
  )
}

function Chip({ Icon, children }: { Icon: typeof Users; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-cream-soft px-2.5 py-1 text-navy">
      <Icon className="h-3 w-3" aria-hidden /> {children}
    </span>
  )
}
