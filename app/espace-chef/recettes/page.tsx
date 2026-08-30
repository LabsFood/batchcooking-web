'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Clock,
  Eye,
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
import {
  AI_RECIPES,
  CHEF_DISHES,
  CHEF_MENUS,
  CONTENT_STATUS_LABEL,
  type AiRecipe,
  type ChefDish,
  type ChefMenu,
  type ContentStatus,
  type Difficulty,
} from '@/lib/chef/mock'
import { cn } from '@/lib/utils'

const STATUS_TONE: Record<ContentStatus, Tone> = {
  draft: 'neutral',
  pending: 'warning',
  published: 'success',
  rejected: 'danger',
}

const DIETS = ['Végétarien', 'Vegan', 'Sans-gluten', 'Sans-lactose', 'Halal', 'Sans-porc']
const ALLERGENS = [
  'Gluten', 'Crustacés', 'Œufs', 'Poisson', 'Arachides', 'Soja', 'Lait',
  'Fruits à coque', 'Céleri', 'Moutarde', 'Sésame', 'Sulfites', 'Lupin', 'Mollusques',
]
const CATEGORIES = ['Entrée', 'Plat', 'Dessert', 'Accompagnement']

type Tab = 'dishes' | 'menus' | 'ai'

export default function ChefRecipesPage() {
  const [tab, setTab] = useState<Tab>('dishes')
  const [dishes, setDishes] = useState<ChefDish[]>(CHEF_DISHES)
  const [menus, setMenus] = useState<ChefMenu[]>(CHEF_MENUS)
  const [aiRecipes, setAiRecipes] = useState<AiRecipe[]>(AI_RECIPES)

  const [editingDish, setEditingDish] = useState<ChefDish | 'new' | null>(null)
  const [editingMenu, setEditingMenu] = useState<ChefMenu | 'new' | null>(null)

  const saveDish = (d: ChefDish) =>
    setDishes((prev) =>
      prev.some((x) => x.id === d.id) ? prev.map((x) => (x.id === d.id ? d : x)) : [d, ...prev],
    )

  const saveMenu = (m: ChefMenu) =>
    setMenus((prev) =>
      prev.some((x) => x.id === m.id) ? prev.map((x) => (x.id === m.id ? m : x)) : [m, ...prev],
    )

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

  return (
    <ChefPage title="Menus & recettes" subtitle="Vos plats, vos menus et les propositions de l'IA.">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'dishes' as Tab, label: 'Mes plats', n: dishes.length },
              { id: 'menus' as Tab, label: 'Mes menus', n: menus.length },
              { id: 'ai' as Tab, label: 'Proposées par l’IA', n: aiRecipes.length },
            ]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-semibold transition-colors',
                tab === t.id
                  ? 'bg-navy text-white'
                  : 'bg-paper text-ink-mid border border-[rgba(31,42,55,0.1)]',
              )}
            >
              {t.label} ({t.n})
            </button>
          ))}
        </div>

        {/* ── Mes plats ───────────────────────────────────────────────── */}
        {tab === 'dishes' && (
          <Card
            title={`Mes plats (${dishes.length})`}
            action={
              <button onClick={() => setEditingDish('new')} className="btn btn-primary text-xs px-4 py-2">
                <Plus className="w-3.5 h-3.5" /> Nouveau plat
              </button>
            }
          >
            {dishes.length === 0 ? (
              <Empty text="Créez votre premier plat pour composer un menu." />
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {dishes.map((d) => (
                  <li key={d.id} className="rounded-2xl border border-[rgba(31,42,55,0.08)] p-4 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-display text-base font-bold text-navy leading-tight">
                        {d.name}
                      </p>
                      <StatusBadge tone={STATUS_TONE[d.status]}>
                        {CONTENT_STATUS_LABEL[d.status]}
                      </StatusBadge>
                    </div>

                    <p className="text-xs text-ink-mid line-clamp-2 mb-2">{d.description}</p>

                    <p className="text-xs text-ink-soft inline-flex items-center gap-1.5">
                      <Globe2 className="w-3.5 h-3.5" /> {d.country} · {d.category}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                      <Chip Icon={Users}>{d.portions} portions</Chip>
                      <Chip Icon={Clock}>{d.prepMin + d.cookMin} min</Chip>
                    </div>

                    {d.allergens.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {d.allergens.map((a) => (
                          <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                            ⚠ {a}
                          </span>
                        ))}
                      </div>
                    )}

                    {d.status === 'rejected' && d.rejectionReason && (
                      <div className="mt-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 flex items-start gap-2">
                        <FileWarning className="w-3.5 h-3.5 text-red-700 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-red-700 leading-relaxed">
                          {d.rejectionReason}
                        </p>
                      </div>
                    )}

                    <div className="mt-auto pt-3 flex gap-2">
                      <button
                        onClick={() => setEditingDish(d)}
                        className="btn btn-outline text-xs px-3 py-1.5 flex-1 justify-center"
                      >
                        <Pencil className="w-3 h-3" /> Modifier
                      </button>
                      {d.status === 'draft' && (
                        <button
                          onClick={() => saveDish({ ...d, status: 'pending' })}
                          className="btn btn-primary text-xs px-3 py-1.5 flex-1 justify-center"
                        >
                          <Send className="w-3 h-3" /> Publier
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
              <button onClick={() => setEditingMenu('new')} className="btn btn-primary text-xs px-4 py-2">
                <Plus className="w-3.5 h-3.5" /> Nouveau menu
              </button>
            }
          >
            {menus.length === 0 ? (
              <Empty text="Composez un menu à partir de vos plats." />
            ) : (
              <ul className="space-y-3">
                {menus.map((m) => (
                  <li key={m.id} className="rounded-2xl border border-[rgba(31,42,55,0.08)] p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="font-display text-base font-bold text-navy">{m.title}</p>
                        <p className="text-xs text-ink-soft capitalize">
                          {m.period} · {m.dishIds.length} plats
                        </p>
                      </div>
                      <StatusBadge tone={STATUS_TONE[m.status]}>
                        {CONTENT_STATUS_LABEL[m.status]}
                      </StatusBadge>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {m.dishIds.map((id) => {
                        const d = dishes.find((x) => x.id === id)
                        return (
                          <span
                            key={id}
                            className="text-[11px] px-2.5 py-1 rounded-full bg-cream-soft text-navy"
                          >
                            {d?.name ?? 'Plat supprimé'}
                          </span>
                        )
                      })}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setEditingMenu(m)}
                        className="btn btn-outline text-xs px-3 py-1.5"
                      >
                        <Pencil className="w-3 h-3" /> Modifier
                      </button>
                      {m.status === 'draft' && (
                        <button
                          onClick={() => saveMenu({ ...m, status: 'pending' })}
                          className="btn btn-primary text-xs px-3 py-1.5"
                        >
                          <Send className="w-3 h-3" /> Publier
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {/* ── Recettes IA ─────────────────────────────────────────────── */}
        {tab === 'ai' && (
          <>
            <div className="rounded-2xl border border-amber/30 bg-amber-soft/40 px-4 py-3.5 flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-amber-deep mt-0.5 shrink-0" />
              <p className="text-xs text-ink-mid leading-relaxed">
                <span className="font-semibold text-navy">Aucun menu ne vous est imposé.</span>{' '}
                Ces recettes sont des propositions : vous n&apos;en voyez que l&apos;aperçu tant
                que vous ne les ajoutez pas volontairement à votre vitrine. Votre choix est
                enregistré pour garantir votre indépendance.
              </p>
            </div>

            <Card title={`Recettes proposées (${aiRecipes.length})`}>
              <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {aiRecipes.map((r) => (
                  <AiCard
                    key={r.id}
                    recipe={r}
                    onAdopt={() => {
                      setAiRecipes((prev) =>
                        prev.map((x) => (x.id === r.id ? { ...x, unlocked: true } : x)),
                      )
                      // La recette adoptée rejoint les plats du chef, en brouillon.
                      saveDish({
                        id: `dish_${Date.now()}`,
                        name: r.name,
                        description: 'Recette proposée par l’IA, adaptable à votre foyer.',
                        country: r.country,
                        category: r.category,
                        portions: r.portions,
                        prepMin: r.prepMin,
                        cookMin: r.cookMin,
                        difficulty: 'moyen',
                        diets: [],
                        allergens: r.allergens,
                        status: 'draft',
                        origin: 'ai',
                      })
                    }}
                  />
                ))}
              </ul>
            </Card>
          </>
        )}
      </div>
    </ChefPage>
  )
}

/* ── Formulaire plat ────────────────────────────────────────────────────── */

function DishForm({
  dish,
  onCancel,
  onSave,
}: {
  dish: ChefDish | null
  onCancel: () => void
  onSave: (d: ChefDish) => void
}) {
  const [name, setName] = useState(dish?.name ?? '')
  const [description, setDescription] = useState(dish?.description ?? '')
  const [country, setCountry] = useState(dish?.country ?? '')
  const [category, setCategory] = useState(dish?.category ?? 'Plat')
  const [portions, setPortions] = useState(dish?.portions ?? 3)
  const [prepMin, setPrepMin] = useState(dish?.prepMin ?? 20)
  const [cookMin, setCookMin] = useState(dish?.cookMin ?? 30)
  const [difficulty, setDifficulty] = useState<Difficulty>(dish?.difficulty ?? 'facile')
  const [diets, setDiets] = useState<string[]>(dish?.diets ?? [])
  const [allergens, setAllergens] = useState<string[]>(dish?.allergens ?? [])

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  // Le pays est obligatoire quand le plat est une spécialité nationale ;
  // la photo, elle, n'est jamais bloquante (§ 6.6 du brief).
  const canSave = name.trim().length > 0 && country.trim().length > 0

  const submit = (status: ContentStatus) =>
    onSave({
      id: dish?.id ?? `dish_${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      country: country.trim(),
      category,
      portions,
      prepMin,
      cookMin,
      difficulty,
      diets,
      allergens,
      status,
      origin: dish?.origin ?? 'chef',
    })

  return (
    <div className="space-y-5 max-w-3xl">
      <Card title="Informations">
        <div className="space-y-4">
          <div>
            <label className="label-muted block mb-2">
              Nom du plat <span className="text-terra">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Poulet rôti aux herbes de Provence"
              className="input-base"
            />
          </div>

          <div>
            <label className="label-muted block mb-2">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ingrédients principaux, particularités…"
              className="input-base resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-muted block mb-2">
                Pays d&apos;origine <span className="text-terra">*</span>
              </label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="France"
                className="input-base"
              />
              <p className="text-[11px] text-ink-soft mt-1">
                Alimente la carte culinaire du client.
              </p>
            </div>
            <div>
              <label className="label-muted block mb-2">Catégorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-base"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <NumField label="Portions" value={portions} onChange={setPortions} />
            <NumField label="Préparation (min)" value={prepMin} onChange={setPrepMin} />
            <NumField label="Cuisson (min)" value={cookMin} onChange={setCookMin} />
            <div>
              <label className="label-muted block mb-2">Difficulté</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="input-base"
              >
                <option value="facile">Facile</option>
                <option value="moyen">Moyen</option>
                <option value="difficile">Difficile</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Régimes alimentaires">
        <div className="flex flex-wrap gap-2">
          {DIETS.map((d) => (
            <Toggle key={d} on={diets.includes(d)} onClick={() => toggle(diets, setDiets, d)}>
              {d}
            </Toggle>
          ))}
        </div>
      </Card>

      <Card title="Allergènes">
        <p className="text-xs text-ink-soft mb-3">
          Déclaration obligatoire — les 14 allergènes réglementaires.
        </p>
        <div className="flex flex-wrap gap-2">
          {ALLERGENS.map((a) => (
            <Toggle
              key={a}
              on={allergens.includes(a)}
              danger
              onClick={() => toggle(allergens, setAllergens, a)}
            >
              {a}
            </Toggle>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <button onClick={onCancel} className="btn btn-outline text-sm">
          <X className="w-4 h-4" /> Annuler
        </button>
        <button
          onClick={() => submit('draft')}
          disabled={!canSave}
          className="btn btn-outline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Enregistrer en brouillon
        </button>
        <button
          onClick={() => submit('pending')}
          disabled={!canSave}
          className="btn btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" /> Soumettre à validation
        </button>
      </div>
      {!canSave && (
        <p className="text-[11px] text-ink-soft">
          Le nom et le pays d&apos;origine sont obligatoires.
        </p>
      )}
    </div>
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
    onSave({
      id: menu?.id ?? `menu_${Date.now()}`,
      title: title.trim(),
      period,
      dishIds,
      status,
    })

  return (
    <div className="space-y-5 max-w-3xl">
      <Card title="Informations">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-4">
          <div>
            <label className="label-muted block mb-2">
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
            <label className="label-muted block mb-2">Période</label>
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

      <Card
        title={`Composition (${dishIds.length} plat${dishIds.length > 1 ? 's' : ''})`}
      >
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
                    className={cn(
                      'w-full text-left flex items-center gap-3 rounded-2xl border p-3.5 transition-colors',
                      on
                        ? 'border-amber bg-amber-soft/30'
                        : 'border-[rgba(31,42,55,0.08)] hover:bg-cream-soft',
                    )}
                  >
                    <span
                      className={cn(
                        'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0',
                        on ? 'bg-amber border-amber' : 'border-[rgba(31,42,55,0.2)]',
                      )}
                    >
                      {on && <span className="w-2 h-2 rounded-sm bg-navy" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-navy truncate">{d.name}</p>
                      <p className="text-xs text-ink-soft">
                        {d.country} · {d.category} · {d.portions} portions
                      </p>
                    </div>
                    <StatusBadge tone={STATUS_TONE[d.status]}>
                      {CONTENT_STATUS_LABEL[d.status]}
                    </StatusBadge>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        <button onClick={onCancel} className="btn btn-outline text-sm">
          <X className="w-4 h-4" /> Annuler
        </button>
        <button
          onClick={() => submit('draft')}
          disabled={!canSave}
          className="btn btn-outline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Enregistrer en brouillon
        </button>
        <button
          onClick={() => submit('pending')}
          disabled={!canSave}
          className="btn btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" /> Soumettre à validation
        </button>
      </div>
      {!canSave && (
        <p className="text-[11px] text-ink-soft">
          Un titre et au moins un plat sont nécessaires.
        </p>
      )}
    </div>
  )
}

/* ── Carte recette IA (verrou de consentement § 6.4) ────────────────────── */

function AiCard({ recipe: r, onAdopt }: { recipe: AiRecipe; onAdopt: () => void }) {
  const [consent, setConsent] = useState(false)
  const [open, setOpen] = useState(false)

  if (r.unlocked) {
    return (
      <li className="rounded-2xl border border-mint-deep/50 bg-mint/20 p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="font-display text-base font-bold text-navy leading-tight">{r.name}</p>
          <StatusBadge tone="success">
            <Sparkles className="w-3 h-3" /> Ajoutée
          </StatusBadge>
        </div>
        <p className="text-xs text-ink-soft inline-flex items-center gap-1.5">
          <Globe2 className="w-3.5 h-3.5" /> {r.country}
        </p>
        <p className="text-[11px] text-mint-ink mt-3">
          Consentement enregistré — la recette a rejoint vos plats en brouillon.
        </p>
      </li>
    )
  }

  return (
    <li className="rounded-2xl border border-[rgba(31,42,55,0.08)] p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-display text-base font-bold text-navy leading-tight">{r.name}</p>
        <StatusBadge tone="warning">
          <Lock className="w-3 h-3" /> Aperçu
        </StatusBadge>
      </div>
      <p className="text-xs text-ink-soft inline-flex items-center gap-1.5">
        <Globe2 className="w-3.5 h-3.5" /> {r.country}
      </p>

      <div className="mt-3 relative">
        <div className="blur-[3px] select-none pointer-events-none space-y-1.5" aria-hidden>
          <p className="text-xs text-ink-mid">Ingrédients : 8 éléments structurés…</p>
          <p className="text-xs text-ink-mid">Étapes : 6 étapes ordonnées…</p>
          <p className="text-xs text-ink-mid">Valeurs nutritionnelles disponibles…</p>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Eye className="w-4 h-4 text-ink-soft" />
        </div>
      </div>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="btn btn-primary w-full justify-center text-xs mt-4 py-2.5"
        >
          Ajouter à ma vitrine
        </button>
      ) : (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
          <label className="flex items-start gap-2.5 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-[11px] text-ink-mid leading-relaxed">
              J&apos;ajoute cette recette à ma vitrine de ma propre initiative et je
              reste libre de la retirer à tout moment.
            </span>
          </label>
          <button
            disabled={!consent}
            onClick={onAdopt}
            className="btn btn-primary w-full justify-center text-xs py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmer et déverrouiller
          </button>
        </motion.div>
      )}
    </li>
  )
}

/* ── Petits composants ──────────────────────────────────────────────────── */

function NumField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div>
      <label className="label-muted block mb-2">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="input-base"
      />
    </div>
  )
}

function Toggle({
  on,
  onClick,
  danger,
  children,
}: {
  on: boolean
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
        on
          ? danger
            ? 'bg-red-100 text-red-700'
            : 'bg-amber text-navy'
          : 'bg-cream-soft text-ink-mid hover:bg-cream-deep',
      )}
    >
      {children}
    </button>
  )
}

function Chip({ Icon, children }: { Icon: typeof Users; children: React.ReactNode }) {
  return (
    <span className="px-2.5 py-1 rounded-full bg-cream-soft text-navy inline-flex items-center gap-1">
      <Icon className="w-3 h-3" /> {children}
    </span>
  )
}
