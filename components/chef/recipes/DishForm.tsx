'use client'

import { useState } from 'react'
import { ArrowLeft, ClipboardList, FileText, Plus, Send, X } from 'lucide-react'
import { Card } from '@/components/chef/ChefPage'
import DocDialog from '@/components/chef/documents/DocDialog'
import RecipeSheet from '@/components/chef/documents/RecipeSheet'
import ShoppingList from '@/components/chef/documents/ShoppingList'
import RecipeEditor from './RecipeEditor'
import { CHEF_PROFILE, type ChefDish, type ContentStatus, type Difficulty } from '@/lib/chef/mock'
import { EMPTY_RECIPE, isRecipeComplete, type Recipe } from '@/lib/chef/recipes'
import { cn } from '@/lib/utils'

/* Régimes et allergènes : listes de référence, complétables par « Autre » quand
   la situation du plat n'y entre pas. Les 14 allergènes réglementaires restent
   la base de la déclaration. */
const DIETS = ['Végétarien', 'Vegan', 'Sans-gluten', 'Sans-lactose', 'Halal', 'Casher', 'Sans-porc']
const ALLERGENS = [
  'Gluten', 'Crustacés', 'Œufs', 'Poisson', 'Arachides', 'Soja', 'Lait',
  'Fruits à coque', 'Céleri', 'Moutarde', 'Sésame', 'Sulfites', 'Lupin', 'Mollusques',
]
const CATEGORIES = ['Entrée', 'Plat', 'Dessert', 'Accompagnement']

export default function DishForm({
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
  const [recipe, setRecipe] = useState<Recipe>(dish?.recipe ?? EMPTY_RECIPE)
  const [preview, setPreview] = useState<'sheet' | 'shopping' | null>(null)

  const canSave = name.trim().length > 0 && country.trim().length > 0

  const build = (status: ContentStatus): ChefDish => ({
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
    rejectionReason: dish?.rejectionReason,
    recipe,
  })

  return (
    <div className="max-w-3xl space-y-5">
      <button
        onClick={onCancel}
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-ink-mid hover:text-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Menus &amp; recettes
      </button>

      <Card title="Informations">
        <div className="space-y-4">
          <Field label="Nom du plat" required>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Poulet rôti aux herbes de Provence"
              className="input-base"
            />
          </Field>

          <Field label="Description">
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ingrédients principaux, particularités…"
              className="input-base resize-none"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Pays d’origine" required hint="Alimente la carte culinaire du client.">
              <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="France" className="input-base" />
            </Field>
            <Field label="Catégorie">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-base">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <NumField label="Portions" value={portions} onChange={setPortions} />
            <NumField label="Préparation (min)" value={prepMin} onChange={setPrepMin} />
            <NumField label="Cuisson (min)" value={cookMin} onChange={setCookMin} />
            <Field label="Difficulté">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="input-base"
              >
                <option value="facile">Facile</option>
                <option value="moyen">Moyen</option>
                <option value="difficile">Difficile</option>
              </select>
            </Field>
          </div>
        </div>
      </Card>

      <Card title="Régimes alimentaires">
        <TagPicker
          options={DIETS}
          value={diets}
          onChange={setDiets}
          addLabel="Autre régime"
          placeholder="Ex. sans fruits de mer"
        />
      </Card>

      <Card title="Allergènes">
        <p className="mb-3 text-[13px] text-ink-soft">
          Déclaration obligatoire : les 14 allergènes réglementaires, plus tout autre allergène présent dans votre
          recette.
        </p>
        <TagPicker
          options={ALLERGENS}
          value={allergens}
          onChange={setAllergens}
          danger
          addLabel="Autre allergène"
          placeholder="Ex. sarrasin"
        />
      </Card>

      <RecipeEditor value={recipe} portions={portions} onChange={setRecipe} />

      {/* Documents produits par la recette */}
      <Card title="Ce que reçoit le client">
        <p className="mb-4 text-[13px] leading-relaxed text-ink-mid">
          Votre recette génère la fiche standardisée Lab&apos;s Food et la liste de courses de la prestation. Les deux
          restent modifiables.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPreview('sheet')}
            disabled={!canSave}
            className="btn btn-outline px-4 py-2 text-xs disabled:opacity-50"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden /> Aperçu de la fiche
          </button>
          <button
            onClick={() => setPreview('shopping')}
            disabled={recipe.ingredients.length === 0}
            className="btn btn-outline px-4 py-2 text-xs disabled:opacity-50"
          >
            <ClipboardList className="h-3.5 w-3.5" aria-hidden /> Liste de courses
          </button>
        </div>
        {!isRecipeComplete(recipe) && (
          <p className="mt-3 text-[13px] text-ink-soft">
            Ajoutez au moins un ingrédient et une étape pour que la fiche soit complète. Vous pouvez enregistrer en
            brouillon en attendant.
          </p>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        <button onClick={onCancel} className="btn btn-outline text-sm">
          <X className="h-4 w-4" aria-hidden /> Annuler
        </button>
        <button
          onClick={() => onSave(build('draft'))}
          disabled={!canSave}
          className="btn btn-outline text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          Enregistrer en brouillon
        </button>
        <button
          onClick={() => onSave(build('pending'))}
          disabled={!canSave}
          className="btn btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" aria-hidden /> Soumettre à validation
        </button>
      </div>
      {!canSave && <p className="text-[11px] text-ink-soft">Le nom et le pays d’origine sont obligatoires.</p>}

      <DocDialog
        open={preview === 'sheet'}
        onOpenChange={(v) => !v && setPreview(null)}
        title="Fiche recette Lab's Food"
        description={name || 'Nouveau plat'}
      >
        <RecipeSheet dish={build('draft')} chefName={CHEF_PROFILE.name} />
      </DocDialog>

      <DocDialog
        open={preview === 'shopping'}
        onOpenChange={(v) => !v && setPreview(null)}
        title="Liste de courses"
        description={`${name || 'Nouveau plat'} · ${portions} portions`}
      >
        <div className="p-5 sm:p-6">
          <ShoppingList dishes={[build('draft')]} persons={portions} />
        </div>
      </DocDialog>
    </div>
  )
}

/* ── Sélection d'étiquettes, avec ajout libre ───────────────────────────── */

function TagPicker({
  options,
  value,
  onChange,
  danger,
  addLabel,
  placeholder,
}: {
  options: string[]
  value: string[]
  onChange: (v: string[]) => void
  danger?: boolean
  addLabel: string
  placeholder: string
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const custom = value.filter((v) => !options.includes(v))

  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])

  const add = () => {
    const v = draft.trim()
    if (v.length < 2) return
    if (!value.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...value, v])
    setDraft('')
    setAdding(false)
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {[...options, ...custom].map((o) => {
          const on = value.includes(o)
          return (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              aria-pressed={on}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                on
                  ? danger
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber text-navy'
                  : 'bg-cream-soft text-ink-mid hover:bg-cream-deep',
              )}
            >
              {o}
            </button>
          )
        })}

        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-[rgba(31,42,55,0.25)] px-3 py-1.5 text-xs font-medium text-ink-mid transition-colors hover:border-navy hover:text-navy"
          >
            <Plus className="h-3 w-3" aria-hidden /> {addLabel}
          </button>
        )}
      </div>

      {adding && (
        <div className="mt-3 flex gap-2">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add()
              if (e.key === 'Escape') setAdding(false)
            }}
            placeholder={placeholder}
            aria-label={addLabel}
            className="input-base max-w-xs py-2 text-sm"
          />
          <button type="button" onClick={add} className="btn btn-primary px-4 py-2 text-xs">
            Ajouter
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="rounded-full px-3 py-2 text-xs font-semibold text-ink-mid hover:text-navy"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-navy">
        {label} {required && <span className="text-terra">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-ink-soft">{hint}</p>}
    </div>
  )
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="input-base"
      />
    </Field>
  )
}
