'use client'

import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import type { PublicServiceOffer } from '@/lib/api/menus'
import {
  offerAfterTaxCents,
  offerClientCents,
  offerEuros,
  offerSummary,
} from '@/lib/api/service-offers'
import { Prix } from '@/components/shared/Prix'

/** Les formules d'un chef, en tête de sa carte : elles fixent combien de plats cocher. */
export function FormulePicker({
  chefName,
  loading,
  offres,
  chosenId,
  onPick,
}: {
  chefName: string
  loading: boolean
  offres: PublicServiceOffer[]
  chosenId: string | null
  onPick: (o: PublicServiceOffer) => void
}) {
  return (
    <div className="mb-6">
      <p className="mb-3 text-sm font-semibold text-navy">1. Choisissez votre formule</p>
      {loading ? (
        <div className="h-16 animate-pulse rounded-2xl bg-cream-soft" />
      ) : offres.length === 0 ? (
        <div className="rounded-2xl border border-amber/40 bg-amber-soft/50 p-4">
          <p className="text-[13px] leading-relaxed text-navy">
            {chefName} n’a pas encore publié ses formules : il n’est pas réservable en ligne.
          </p>
          <Link href="/espace-client/personnalisation" className="btn btn-outline mt-3 text-xs">
            Faire une demande sur mesure
            <ArrowRight className="icon-arrow h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        /*
          Une formule par ligne, comme une liste de choix : côte à côte dans la
          colonne de la carte, le prix prenait toute la place et le nom se
          cassait mot par mot. Le nom et ce qu'elle comprend à gauche, le prix
          aligné à droite, et la formule retenue se reconnaît à son cadre marine
          et à sa coche, pas à un aplat de couleur.
        */
        <div role="radiogroup" aria-label="Formules" className="space-y-2">
          {offres.map((o) => {
            const choisie = o.id === chosenId
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={choisie}
                onClick={() => onPick(o)}
                className={`flex w-full items-center gap-3 rounded-xl border bg-paper px-4 py-3 text-left transition-colors sm:gap-4 ${
                  choisie
                    ? 'border-navy shadow-[inset_0_0_0_1px_var(--navy)]'
                    : 'border-[var(--line-strong)] hover:border-[rgba(31,42,55,0.32)]'
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    choisie ? 'border-navy bg-navy text-white' : 'border-[var(--line-strong)] bg-paper'
                  }`}
                >
                  {choisie && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                {/* Étroit, le prix passe sous le nom : côte à côte, il l'écrasait. */}
                <span className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-snug text-navy">{o.name}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
                      {offerSummary(o)}
                    </span>
                    {/* Ce que le batch cooker dit de sa formule : le client la
                        choisit en sachant ce qu'elle comprend. */}
                    {o.description?.trim() && (
                      <span className="mt-1.5 block whitespace-pre-line text-xs leading-relaxed text-ink-mid">
                        {o.description.trim()}
                      </span>
                    )}
                  </span>
                  <Prix
                    // Toujours le reste à charge d'abord, connecté ou pas.
                    apresCredit={offerEuros(offerAfterTaxCents(o))}
                    total={offerEuros(offerClientCents(o))}
                    taille="sm"
                    className="shrink-0 sm:text-right sm:[&>p]:justify-end"
                  />
                </span>
              </button>
            )
          })}
        </div>
      )}
      <p className="mt-3 text-xs text-ink-soft">
        Envie d’autres plats, ou de plus de plats ? Proposez vos repas dans une{' '}
        <Link
          href="/espace-client/personnalisation"
          className="font-semibold text-navy underline underline-offset-2 hover:text-amber-deep"
        >
          demande sur-mesure
        </Link>
        .
      </p>
    </div>
  )
}
