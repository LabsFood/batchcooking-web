'use client'

import { Suspense, use } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeEuro,
  CalendarRange,
  CheckCircle2,
  ChefHat,
  Circle,
  Clock,
  Info,
  MessageCircle,
  Receipt,
  RotateCw,
  ShieldCheck,
  ShoppingBasket,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react'
import {
  afterTaxCredit,
  bookingPortions,
  bookingStatusText,
  euros,
  hour,
  useMissionShoppingList,
  useMyBooking,
  type Booking,
} from '@/lib/api/bookings'
import { aisleLabel } from '@/lib/recipe-fields'
import { useChefPublic } from '@/lib/api/menus'

/* ─────────────────────────────────────────────────────────────────────────────
   Le détail d'une commande — `GET /bookings/me/bookings/{id}`.

   La route est réservée au client qui a réservé : « anyone else gets 404 ».
   D'où le message d'absence, qui ne cherche pas à distinguer une commande
   supprimée d'une commande qui n'est pas la sienne — l'API ne le dit pas.

   La liste de courses vient de `GET /chef-missions/{id}/shopping-list`, que le
   client peut lire : elle est groupée par rayon et met les quantités à
   l'échelle des portions commandées. Le booking en porte une version plus
   pauvre (`quantity` en texte libre), qui sert de repli.
   ───────────────────────────────────────────────────────────────────────────── */

/** Le parcours d'une prestation, tel que les statuts de l'API le décrivent. */
const FLOW = ['pending', 'confirmed', 'shopping', 'cooking', 'completed'] as const

const STEP_LABEL: Record<string, string> = {
  pending: 'Reçue',
  confirmed: 'Confirmée',
  shopping: 'Courses',
  cooking: 'En cuisine',
  completed: 'Terminée',
}

const longDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const query = useMyBooking(id)

  if (query.isPending) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-3xl bg-paper" />
        <div className="h-24 animate-pulse rounded-3xl bg-paper" />
        <div className="h-64 animate-pulse rounded-3xl bg-paper" />
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <UtensilsCrossed className="mx-auto h-8 w-8 text-ink-soft" aria-hidden />
        <h2 className="mt-4 font-display text-2xl font-bold text-navy">
          Commande introuvable
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-mid">
          Elle n’existe plus, ou elle n’est pas rattachée à votre compte.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => query.refetch()} className="btn btn-outline text-xs">
            <RotateCw className="h-3.5 w-3.5" aria-hidden /> Réessayer
          </button>
          <Link href="/espace-client/commandes" className="btn btn-primary text-xs">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Toutes mes commandes
          </Link>
        </div>
      </div>
    )
  }

  return <OrderDetail booking={query.data} />
}

function OrderDetail({ booking: b }: { booking: Booking }) {
  const chef = useChefPublic(b.chefProfileId ?? undefined)
  const courses = useMissionShoppingList(b.id)

  const ttc = euros(b.priceCents)
  const reste = euros(afterTaxCredit(b.priceCents))
  const credit = euros(
    b.priceCents != null ? b.priceCents - (afterTaxCredit(b.priceCents) ?? 0) : null,
  )
  const portions = bookingPortions(b)
  const annulee = b.status === 'cancelled' || b.status === 'refunded'
  const etape = FLOW.indexOf((b.status ?? '') as (typeof FLOW)[number])

  // L'API déplie les groupes ; le booking, lui, ne donne que des lignes plates.
  const groupes =
    courses.data?.groups ??
    (b.shoppingList?.items?.length
      ? [
          {
            aisle: '',
            lines: b.shoppingList.items.map((it) => ({
              name: it.name,
              qty: 0,
              unit: it.quantity ?? '',
              edited: false,
            })),
          },
        ]
      : [])

  return (
    <div className="space-y-6">
      <Link
        href="/espace-client/commandes"
        className="inline-flex items-center gap-2 text-xs text-ink-mid hover:text-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Toutes mes commandes
      </Link>

      <Suspense fallback={null}>
        <CheckoutOutcome />
      </Suspense>

      {/* ── L'essentiel ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white lg:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-amber/30 blur-3xl"
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            {b.reference && (
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">
                {b.reference}
              </p>
            )}
            <h2 className="mt-2 font-display text-3xl font-bold capitalize leading-tight lg:text-4xl">
              {longDate(b.startsAt) ?? 'Date à confirmer'}
            </h2>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/65">
              {hour(b.startsAt) && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber" aria-hidden />
                  {hour(b.startsAt)}
                  {hour(b.endsAt) ? ` → ${hour(b.endsAt)}` : ''}
                </span>
              )}
              {chef.data?.displayName && (
                <span className="inline-flex items-center gap-1.5">
                  <ChefHat className="h-4 w-4 text-amber" aria-hidden />
                  {chef.data.displayName}
                </span>
              )}
              {portions > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <UtensilsCrossed className="h-4 w-4 text-amber" aria-hidden />
                  {portions} portions
                </span>
              )}
              <span>{bookingStatusText(b.status)}</span>
            </p>
          </div>
          {ttc && (
            <div className="flex flex-col items-start lg:items-end">
              <p className="font-display text-3xl font-bold text-amber">{ttc}</p>
              {reste && (
                <p className="text-xs text-white/60">
                  soit {reste} estimés après crédit d’impôt
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Suivi ────────────────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-6 lg:p-7">
        <h3 className="mb-5 font-display text-lg font-bold text-navy">
          Suivi de la commande
        </h3>
        {annulee ? (
          <p className="text-sm font-semibold text-red-700">
            {b.status === 'refunded'
              ? 'Cette commande a été remboursée.'
              : 'Cette commande a été annulée.'}
          </p>
        ) : etape < 0 ? (
          <p className="text-sm text-ink-mid">
            Statut «&nbsp;{b.status}&nbsp;» : il ne fait pas partie du parcours
            habituel, nous ne le situons donc pas sur la frise.
          </p>
        ) : (
          <div className="relative grid grid-cols-5 gap-2">
            <div
              aria-hidden
              className="absolute left-0 right-0 top-4 h-px bg-[rgba(31,42,55,0.08)]"
            />
            <div
              aria-hidden
              className="absolute left-0 top-4 h-px bg-amber transition-all"
              style={{ width: `${(etape / (FLOW.length - 1)) * 100}%` }}
            />
            {FLOW.map((step, i) => {
              const atteinte = i <= etape
              return (
                <div key={step} className="relative flex flex-col items-center text-center">
                  <span
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                      atteinte ? 'bg-amber text-navy' : 'bg-cream-deep text-ink-soft'
                    }`}
                  >
                    {atteinte ? (
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                    ) : (
                      <Circle className="h-3.5 w-3.5" aria-hidden />
                    )}
                  </span>
                  <p
                    className={`mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                      atteinte ? 'text-navy' : 'text-ink-soft'
                    }`}
                  >
                    {STEP_LABEL[step]}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          {/* ── Plats ──────────────────────────────────────────────────── */}
          <div className="rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-6">
            <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-navy">
              <ChefHat className="h-4 w-4 text-amber" aria-hidden /> Plats prévus
            </h3>
            {(b.bookingMeals?.length ?? 0) === 0 ? (
              <p className="text-sm text-ink-soft">
                Aucun plat rattaché à cette commande.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {b.bookingMeals!.map((m) => (
                  <li
                    key={m.mealId}
                    className="flex items-center gap-3 rounded-2xl border border-[rgba(31,42,55,0.04)] bg-cream-soft px-4 py-3"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-soft text-xs font-bold text-amber-deep">
                      {m.portions}
                    </span>
                    <p className="min-w-0 text-sm font-semibold text-navy">
                      {m.meal?.name ?? 'Plat retiré du catalogue'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Liste de courses ───────────────────────────────────────── */}
          <div className="rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold text-navy">
                <ShoppingBasket className="h-4 w-4 text-amber" aria-hidden /> Liste de
                courses
              </h3>
              {courses.data?.persons != null && (
                <span className="rounded-full bg-cream-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-mid">
                  {courses.data.persons} personnes
                </span>
              )}
            </div>

            {courses.isPending ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-9 animate-pulse rounded-xl bg-cream-soft" />
                ))}
              </div>
            ) : groupes.length === 0 ? (
              <p className="text-sm leading-relaxed text-ink-soft">
                Pas encore de liste. Elle se calcule depuis les recettes de vos
                plats, une fois la prestation confirmée.
              </p>
            ) : (
              <div className="space-y-4">
                {groupes.map((g, gi) => (
                  <div key={g.aisle || gi}>
                    {g.aisle && (
                      <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
                        {aisleLabel(g.aisle)}
                      </p>
                    )}
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {g.lines.map((l, li) => (
                        <li
                          key={`${l.name}-${li}`}
                          className="flex items-center justify-between gap-2 rounded-xl bg-cream-soft px-3 py-2 text-sm"
                        >
                          <span className="min-w-0 text-navy">{l.name}</span>
                          <span className="shrink-0 text-xs tabular-nums text-ink-soft">
                            {l.qty > 0
                              ? `${l.qty.toLocaleString('fr-FR')} ${l.unit}`.trim()
                              : l.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Colonne de droite ─────────────────────────────────────────── */}
        <aside className="space-y-4">
          <div className="rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-5">
            <h4 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-navy">
              <Receipt className="h-4 w-4 text-amber" aria-hidden /> Récapitulatif
            </h4>
            {ttc ? (
              <ul className="space-y-2 text-sm text-ink-mid">
                <Row label="Prestation TTC" value={ttc} />
                <Row label="TVA" value="incluse" />
                <Row label="Crédit d’impôt estimé" value={`− ${credit}`} accent />
                <Row label="Reste à charge estimé" value={reste ?? '—'} bold />
              </ul>
            ) : (
              <p className="text-sm text-ink-soft">Montant non communiqué par l’API.</p>
            )}
            <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-soft">
              <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              Le crédit d’impôt services à la personne est de 50 %. L’API ne
              renvoie pas ce montant sur une commande : il est calculé ici.
            </p>
          </div>

          {/* Le règlement n'a aucun endpoint : on le dit au lieu de l'afficher. */}
          <div className="rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-5">
            <h4 className="flex items-center gap-2 font-display text-base font-bold text-navy">
              <BadgeEuro className="h-4 w-4 text-amber" aria-hidden /> Règlement
            </h4>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-mid">
              <strong className="font-semibold text-navy">N/A</strong> — le suivi
              du paiement n’existe pas encore côté API : une commande ne dit pas
              si elle est réglée, ni comment.
            </p>
            <Link
              href={`/espace-client/commandes/${b.id}/paiement`}
              className="btn btn-outline mt-3 w-full justify-center text-xs"
            >
              Voir l’écran de règlement
              <ArrowRight className="icon-arrow h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>

          <Link
            href="/espace-client/messages"
            className="flex items-center gap-3 rounded-3xl border border-mint-deep/40 bg-mint/40 p-4 transition-colors hover:bg-mint/60"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint-deep/20 text-mint-ink">
              <MessageCircle className="h-4 w-4" aria-hidden />
            </span>
            <div className="text-sm">
              <p className="font-semibold text-navy">Une question ?</p>
              <p className="text-xs text-ink-mid">Écrivez à votre batch cooker.</p>
            </div>
          </Link>

          <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-ink-soft">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            Annuler une prestation n’est pas encore possible depuis cet écran :
            aucune route ne le permet. Passez par la messagerie.
          </p>
        </aside>
      </div>
    </div>
  )
}

/**
 * Retour de Stripe. Le paramètre est posé par `successUrl` / `cancelUrl` de la
 * session : c'est la seule chose que le navigateur rapporte du paiement.
 */
function CheckoutOutcome() {
  const outcome = useSearchParams().get('paiement')
  if (outcome !== 'succes' && outcome !== 'annule') return null

  const ok = outcome === 'succes'
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-3xl p-4 text-sm leading-relaxed ${
        ok ? 'bg-mint/50 text-navy' : 'bg-amber-soft/70 text-navy'
      }`}
    >
      <span aria-hidden className="mt-0.5 shrink-0">
        {ok ? (
          <ShieldCheck className="h-4 w-4 text-mint-ink" />
        ) : (
          <XCircle className="h-4 w-4 text-amber-deep" />
        )}
      </span>
      <span>
        {ok ? (
          <>
            <strong className="font-semibold">Paiement enregistré.</strong> Votre
            reçu arrive par email.
          </>
        ) : (
          <>
            <strong className="font-semibold">Paiement interrompu.</strong> Rien
            n’a été débité — vous pouvez reprendre quand vous voulez.
          </>
        )}
      </span>
    </div>
  )
}

function Row({
  label,
  value,
  bold,
  accent,
}: {
  label: string
  value: string
  bold?: boolean
  accent?: boolean
}) {
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className="text-ink-soft">{label}</span>
      <span
        className={`text-right tabular-nums ${
          accent ? 'text-amber-deep' : bold ? 'font-bold text-navy' : 'text-navy'
        }`}
      >
        {value}
      </span>
    </li>
  )
}
