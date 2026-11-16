'use client'

import Link from 'next/link'
import { AlertTriangle, MessageCircle, Sparkles, UtensilsCrossed } from 'lucide-react'
import { InfoPopover } from '@/components/shared/InfoPopover'
import { ALLERGENS } from '@/components/client/AllergyDeclaration'
import { useAllergens } from '@/lib/api/referentials'
import type { OfferAllergy, OfferDish } from '@/lib/api/quotes'

/* ─────────────────────────────────────────────────────────────────────────────
   Les plats d'une offre sur-mesure (décision du 15/11).

   Seul le batch cooker en ajoute : ses plats publiés, ses menus publiés, et des
   « plats express » écrits en quelques mots pour la demande. Face aux allergies
   du client, c'est un avertissement, jamais un refus : on invite les deux à en
   parler dans la messagerie avant l'acceptation.
   ───────────────────────────────────────────────────────────────────────────── */

type Viewer = 'client' | 'chef'

export default function OfferDishes({
  dishes,
  allergy,
  viewer,
  talkHref,
}: {
  dishes: OfferDish[]
  allergy: OfferAllergy | null | undefined
  viewer: Viewer
  /** La messagerie ouverte sur le fil de la demande ; absent : pas de lien. */
  talkHref?: string
}) {
  const allergens = useAllergens(ALLERGENS)
  const label = (code: string) => allergens.find((a) => a.code === code)?.label ?? code
  if (dishes.length === 0) return null

  // Les plats d'un même menu restent ensemble, dans l'ordre de l'offre.
  const groups: { menu: OfferDish['menu']; dishes: OfferDish[] }[] = []
  for (const dish of dishes) {
    const last = groups[groups.length - 1]
    if (last && last.menu?.id === dish.menu?.id && dish.menu) last.dishes.push(dish)
    else groups.push({ menu: dish.menu, dishes: [dish] })
  }
  const conflictOf = (id: string) => allergy?.conflicts.find((c) => c.mealId === id)?.allergens ?? []

  return (
    <div className="mt-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-navy">
        <UtensilsCrossed className="h-3.5 w-3.5 text-terra" aria-hidden />
        {dishes.length} plat{dishes.length > 1 ? 's' : ''} proposé{dishes.length > 1 ? 's' : ''}
        <InfoPopover label="D’où viennent ces plats ?">
          Le batch cooker les choisit dans sa carte (plats et menus publiés), ou les écrit pour
          cette demande : ce sont les « plats express », sans fiche recette. Une fois l’offre
          acceptée, ce sont les plats de la prestation.
        </InfoPopover>
      </p>
      <ul className="space-y-2">
        {groups.map((group, i) => (
          <li key={group.menu?.id ?? `seul-${i}`}>
            {group.menu && (
              <p className="mb-1 text-[11px] uppercase tracking-wide text-ink-soft">
                Menu « {group.menu.title} »
              </p>
            )}
            <ul className="space-y-1.5">
              {group.dishes.map((dish) => {
                const conflict = conflictOf(dish.id)
                return (
                  <li key={dish.id} className="rounded-xl bg-white/70 px-3 py-2">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-navy">
                      {dish.name}
                      {dish.express && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-soft px-2 py-0.5 text-[10px] font-semibold text-amber-deep">
                          <Sparkles className="h-3 w-3" aria-hidden /> Plat express
                        </span>
                      )}
                    </p>
                    {dish.description && (
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-mid">{dish.description}</p>
                    )}
                    <p className="mt-0.5 text-[11px] text-ink-soft">
                      {dish.allergens.length > 0
                        ? `Allergènes : ${dish.allergens.map(label).join(', ')}`
                        : dish.allergensNone
                          ? 'Aucun des 14 allergènes réglementés'
                          : 'Allergènes non renseignés'}
                      {!dish.allergensVerified && ' · non vérifiés'}
                    </p>
                    {conflict.length > 0 && (
                      <p className="mt-1 flex items-start gap-1 text-[12px] font-semibold text-red-800">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                        {conflict.map(label).join(', ')} :{' '}
                        {viewer === 'client' ? 'une de vos allergies' : 'une allergie du client'}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ul>

      {allergy?.check === 'unverified' && (
        <div
          role="note"
          className="mt-3 rounded-xl border border-[#E8C46B] bg-[#FFF6DD] px-3 py-2.5 text-xs leading-relaxed text-[#6B4A00]"
        >
          <p className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> À vérifier ensemble avant
            {viewer === 'client' ? ' d’accepter' : ' la prestation'}
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {allergy.reasons.includes('ALLERGEN_CONFLICT') && (
              <li>
                {viewer === 'client'
                  ? 'Un plat contient un allergène que vous avez déclaré.'
                  : 'Un plat contient un allergène déclaré par le client.'}
              </li>
            )}
            {allergy.reasons.includes('ALLERGENS_UNVERIFIED') && (
              <li>
                Les allergènes d’un plat ne sont pas vérifiés : un plat express n’a pas de fiche
                recette, ses allergènes sont ceux que le batch cooker connaît.
              </li>
            )}
            {allergy.reasons.includes('ALLERGIES_NOT_DECLARED') && (
              <li>
                {viewer === 'client'
                  ? 'Vous n’avez pas encore déclaré vos allergies.'
                  : 'Le client n’a pas encore déclaré ses allergies.'}
              </li>
            )}
            {allergy.reasons.includes('CUSTOM_ALLERGIES') && (
              <li>Une allergie est écrite en toutes lettres : la plateforme ne peut pas la vérifier.</li>
            )}
          </ul>
          <p className="mt-1.5">
            Ce n’est pas bloquant : parlez-en dans la messagerie, le plat peut être adapté.
          </p>
          {talkHref && (
            <Link
              href={talkHref}
              className="mt-2 inline-flex items-center gap-1.5 font-semibold text-navy underline-offset-2 hover:underline"
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden />
              {viewer === 'client' ? 'En parler avec le batch cooker' : 'En parler avec le client'}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
