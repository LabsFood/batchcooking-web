'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Archive, Check, PenLine, Sparkles } from 'lucide-react'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { InfoPopover } from '@/components/shared/InfoPopover'
import { apiMessage } from '@/lib/api/messages'
import { useDecideExpressDish, useMyExpressDishes, type ExpressDish } from '@/lib/api/quotes'

/* ─────────────────────────────────────────────────────────────────────────────
   Les plats express à garder ou retirer (sur-mesure, décision du 15/11).

   Écrits en quelques mots pour une demande, ils restent hors de « Mes plats ».
   Une fois la prestation livrée (ou l'offre tombée), le batch cooker décide :
   garder (un brouillon dont il complète la recette avant de le publier) ou
   retirer (archivé ; la prestation où il a été cuisiné le garde).
   ───────────────────────────────────────────────────────────────────────────── */

const WAITING: Record<NonNullable<ExpressDish['decisionBlockedBy']>, string> = {
  OFFER_PENDING: 'Une offre avec ce plat attend la réponse du client.',
  PRESTATION_PENDING: 'La prestation avec ce plat n’a pas encore eu lieu.',
}

export default function ExpressDishesToDecide() {
  const list = useMyExpressDishes()
  // Un plat gardé quitte la liste à la relecture : on garde le lien vers sa recette.
  const [kept, setKept] = useState<{ id: string; name: string }[]>([])
  const dishes = (list.data ?? []).filter((d) => !kept.some((k) => k.id === d.id))
  if (dishes.length === 0 && kept.length === 0) return null

  return (
    <section id="plats-express" className="scroll-mt-24 rounded-2xl border border-amber/40 bg-amber-soft/40 p-5">
      <h2 className="flex flex-wrap items-center gap-1.5 font-display text-base font-bold text-navy">
        <Sparkles className="h-4 w-4 text-amber-deep" aria-hidden />
        Plats express à garder ou retirer ({dishes.length})
        <InfoPopover label="Qu’est-ce qu’un plat express ?">
          Un plat que vous avez écrit en quelques mots pour une demande sur-mesure. Il n’est pas
          dans votre carte. Après la prestation, gardez-le : il rejoint « Mes plats » en
          brouillon, vous complétez sa recette puis le publiez comme les autres. Ou retirez-le :
          il est archivé, la prestation où il a été cuisiné le garde.
        </InfoPopover>
      </h2>
      <ul className="mt-3 space-y-2">
        {kept.map((dish) => (
          <li
            key={dish.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3"
          >
            <p className="flex items-center gap-1.5 text-sm font-semibold text-mint-ink">
              <Check className="h-4 w-4" aria-hidden /> « {dish.name} » est dans « Mes plats »
            </p>
            <Link href={`/espace-chef/recettes/${dish.id}`} className="btn btn-primary text-xs">
              <PenLine className="h-3.5 w-3.5" aria-hidden /> Compléter la recette
            </Link>
          </li>
        ))}
        {dishes.map((dish) => (
          <ExpressRow
            key={dish.id}
            dish={dish}
            onKept={() => setKept((k) => [...k, { id: dish.id, name: dish.name }])}
          />
        ))}
      </ul>
    </section>
  )
}

function ExpressRow({ dish, onKept }: { dish: ExpressDish; onKept: () => void }) {
  const decide = useDecideExpressDish()
  const [confirmDrop, setConfirmDrop] = useState(false)
  const blocked = dish.decisionBlockedBy

  return (
    <li className="rounded-2xl bg-white px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy">{dish.name}</p>
          {dish.description && <p className="mt-0.5 text-xs text-ink-mid">{dish.description}</p>}
          <p className="mt-0.5 text-[11px] text-ink-soft">
            {dish.request ? `${dish.request.title} · ${dish.request.reference}` : 'Demande sur-mesure'}
            {dish.prestation?.reference ? ` · ${dish.prestation.reference}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={!!blocked || decide.isPending}
            onClick={() =>
              decide.mutate({ id: dish.id, decision: 'kept' }, { onSuccess: onKept })
            }
            className="btn btn-primary text-xs disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" aria-hidden /> Garder dans ma carte
          </button>
          <button
            type="button"
            disabled={!!blocked || decide.isPending}
            onClick={() => setConfirmDrop(true)}
            className="btn btn-outline text-xs disabled:opacity-50"
          >
            <Archive className="h-3.5 w-3.5" aria-hidden /> Retirer
          </button>
        </div>
      </div>
      {blocked && <p className="mt-1.5 text-[12px] text-ink-soft">{WAITING[blocked]}</p>}
      {decide.isError && !confirmDrop && (
        <p role="alert" className="mt-1.5 text-[12px] text-red-700">
          {apiMessage(decide.error, 'La décision n’a pas pu être enregistrée.')}
        </p>
      )}

      <ConfirmDialog
        open={confirmDrop}
        onClose={() => setConfirmDrop(false)}
        onConfirm={() =>
          decide.mutate(
            { id: dish.id, decision: 'dropped' },
            { onSuccess: () => setConfirmDrop(false) },
          )
        }
        pending={decide.isPending}
        error={decide.isError ? apiMessage(decide.error, 'Le plat n’a pas pu être retiré.') : null}
        tone="danger"
        title={`Retirer « ${dish.name} » ?`}
        lead="Le plat est archivé : il n’entre pas dans votre carte."
        detail="La prestation où il a été cuisiné le garde. Ce choix est définitif."
        confirmLabel="Retirer le plat"
      />
    </li>
  )
}
