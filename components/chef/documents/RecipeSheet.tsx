'use client'

import { Clock, Flame, Snowflake, Users, UtensilsCrossed } from 'lucide-react'
import type { ChefDish } from '@/lib/chef/mock'
import { formatQty, reheatingLabel, storageLabel } from '@/lib/chef/recipes'

/* ─────────────────────────────────────────────────────────────────────────────
   Fiche recette standardisée Lab's Food.

   Même gabarit pour tous les batch cookers : le client reçoit toujours la même
   fiche, quelle que soit la façon dont la recette a été saisie. Elle sert aussi
   d'aperçu dans « Menus & recettes » avant publication.
   ───────────────────────────────────────────────────────────────────────────── */

export default function RecipeSheet({
  dish,
  portions,
  chefName,
}: {
  dish: ChefDish
  /** Portions à produire ; à défaut, celles de la recette. */
  portions?: number
  chefName?: string
}) {
  const target = portions ?? dish.portions
  const factor = dish.portions > 0 ? target / dish.portions : 1
  const { recipe } = dish

  return (
    <article className="bg-paper text-ink print:text-black">
      {/* Bandeau */}
      <header className="flex items-start justify-between gap-6 border-b-[1.5px] border-navy px-6 py-5 sm:px-8">
        <div className="min-w-0">
          <p className="font-display text-lg font-bold leading-none text-navy">Lab&apos;s Food</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft">Fiche recette</p>
        </div>
        <div className="text-right text-[11px] leading-relaxed text-ink-soft">
          {chefName && <p className="font-semibold text-navy">{chefName}</p>}
          <p>{dish.country}</p>
          <p>{dish.category}</p>
        </div>
      </header>

      <div className="px-6 py-6 sm:px-8">
        <h3 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-navy">{dish.name}</h3>
        <p className="mt-1.5 max-w-[60ch] text-sm leading-relaxed text-ink-mid">{dish.description}</p>

        {/* Repères de production */}
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric icon={<Users className="h-4 w-4" />} label="Portions" value={String(target)} />
          <Metric icon={<Clock className="h-4 w-4" />} label="Préparation" value={`${dish.prepMin} min`} />
          <Metric icon={<Flame className="h-4 w-4" />} label="Cuisson" value={`${dish.cookMin} min`} />
          <Metric icon={<UtensilsCrossed className="h-4 w-4" />} label="Difficulté" value={dish.difficulty} />
        </dl>

        {/* Allergènes : l'information la plus sensible de la fiche. */}
        <section className="mt-6 rounded-xl bg-amber-soft/45 px-4 py-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-[#7A4A05]">Allergènes</h4>
          <p className="mt-1 text-sm text-[#7A4A05]">
            {dish.allergens.length > 0 ? dish.allergens.join(' · ') : 'Aucun allergène déclaré.'}
          </p>
          {dish.diets.length > 0 && (
            <p className="mt-1.5 text-xs text-[#7A4A05]/85">Régimes : {dish.diets.join(' · ')}</p>
          )}
        </section>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
          {/* Ingrédients */}
          <section>
            <h4 className="mb-2.5 text-sm font-bold text-navy">
              Ingrédients <span className="font-normal text-ink-soft">pour {target} portions</span>
            </h4>
            {recipe.ingredients.length === 0 ? (
              <p className="text-sm text-ink-soft">Ingrédients non renseignés.</p>
            ) : (
              <ul className="divide-y divide-[rgba(31,42,55,0.08)]">
                {recipe.ingredients.map((i) => (
                  <li key={`${i.name}-${i.unit}`} className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
                    <span className="min-w-0 text-ink">{i.name}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-navy">
                      {formatQty(Math.round(i.qty * factor * 100) / 100, i.unit)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Étapes */}
          <section>
            <h4 className="mb-2.5 text-sm font-bold text-navy">Préparation</h4>
            {recipe.steps.length === 0 ? (
              <p className="text-sm text-ink-soft">Étapes non renseignées.</p>
            ) : (
              <ol className="space-y-2.5">
                {recipe.steps.map((step, i) => (
                  <li key={step} className="flex gap-3 text-sm leading-relaxed text-ink">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold tabular-nums text-white">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* Réchauffage et conservation : ce que le client lit en semaine. */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <section className="rounded-xl bg-cream-soft px-4 py-3">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-navy">
              <Flame className="h-3.5 w-3.5 text-amber-deep" aria-hidden /> Réchauffage
            </h4>
            <p className="mt-1 text-sm font-semibold text-navy">{reheatingLabel(recipe.reheating)}</p>
            {recipe.reheating.note && <p className="mt-0.5 text-[13px] text-ink-mid">{recipe.reheating.note}</p>}
          </section>
          <section className="rounded-xl bg-cream-soft px-4 py-3">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-navy">
              <Snowflake className="h-3.5 w-3.5 text-amber-deep" aria-hidden /> Conservation
            </h4>
            <p className="mt-1 text-sm font-semibold text-navy">{storageLabel(recipe.storage)}</p>
            <p className="mt-0.5 text-[13px] text-ink-mid">Étiqueter le contenant avec la date de préparation.</p>
          </section>
        </div>
      </div>
    </article>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[rgba(31,42,55,0.08)] px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ink-soft">
        <span className="text-amber-deep" aria-hidden>
          {icon}
        </span>
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold capitalize text-navy">{value}</dd>
    </div>
  )
}
