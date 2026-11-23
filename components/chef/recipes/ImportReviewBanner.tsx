'use client'

import Link from 'next/link'
import { AlertTriangle, Sparkles } from 'lucide-react'
import { refLabel, useAllergens } from '@/lib/api/referentials'
import { ESTIMATED_LABEL, type RecipeImport } from '@/lib/api/recipe-imports'

/**
 * Le brouillon vient d'un import : ce qu'il faut relire avant d'aller plus loin.
 * Champs estimés, ingrédients à vérifier, avertissements de lecture, et en rouge
 * les allergènes que l'IA soupçonne sans que la liste commune les calcule : à
 * regarder avant « Confirmer les allergènes ». Aucun champ du formulaire ne change.
 * Un import qui a donné plusieurs brouillons : le détail de ce plat-ci, et un
 * lien vers les autres.
 */
export default function ImportReviewBanner({ data: all, mealId }: { data: RecipeImport; mealId: string }) {
  const allergens = useAllergens()
  const data = { ...all, ...(all.perMeal?.[mealId] ?? {}) }
  const others = all.meals.filter((m) => m.id !== mealId)
  const estimated = data.estimatedFields.map((f) => ESTIMATED_LABEL[f]).filter(Boolean)
  return (
    <section aria-label="Recette importée" className="mx-auto mb-5 max-w-2xl rounded-3xl bg-cream-soft p-5">
      <p className="flex items-center gap-2 font-display text-base font-bold text-navy">
        <Sparkles className="h-4 w-4" aria-hidden /> Importé, à relire
      </p>
      <ul className="mt-2 space-y-1 text-[13px] leading-relaxed text-ink-mid">
        {(data.toVerify ?? 0) > 0 && (
          <li>
            {data.toVerify} ingrédient{(data.toVerify ?? 0) > 1 ? 's' : ''} à vérifier : reliez-les à la liste ou corrigez la quantité.
          </li>
        )}
        {estimated.length > 0 && <li>Estimés par l’IA, à confirmer : {estimated.join(', ')}.</li>}
        {data.warnings.slice(0, 5).map((w) => (
          <li key={w}>{w}</li>
        ))}
        <li>Les allergènes restent à confirmer par vous avant toute réservation.</li>
      </ul>
      {data.allergenGaps.length > 0 && (
        <p role="note" className="mt-3 flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-[13px] leading-relaxed text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Allergènes possibles à vérifier avant de confirmer :{' '}
            <strong>{data.allergenGaps.map((code) => refLabel(allergens, code)).join(', ')}</strong>. Ils ne sont pas
            ajoutés d’office : ajoutez-les si la recette les contient.
          </span>
        </p>
      )}
      {others.length > 0 && (
        <p className="mt-3 text-[13px] leading-relaxed text-ink-mid">
          Du même import, aussi en brouillon :{' '}
          {others.map((m, i) => (
            <span key={m.id}>
              {i > 0 && ', '}
              <Link href={`/espace-chef/recettes/${m.id}?import=${all.id}`} className="font-semibold text-navy underline underline-offset-2">
                {m.name}
              </Link>
            </span>
          ))}
          .
        </p>
      )}
    </section>
  )
}
