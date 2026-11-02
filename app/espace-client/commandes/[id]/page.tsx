'use client'

import { Suspense, use, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeEuro,
  CalendarClock,
  CalendarPlus,
  Camera,
  CheckCircle2,
  ChefHat,
  Circle,
  Clock,
  Info,
  MapPin,
  MessageCircle,
  Receipt,
  RotateCw,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useToast } from '@/components/shared/Toaster'
import {
  bookingPortions,
  bookingStatusText,
  euros,
  hour,
  useAnswerReschedule,
  useBookingIcs,
  useMissionShoppingList,
  useMyBooking,
  useUpdateMyBooking,
  type Booking,
  type BookingPhoto,
} from '@/lib/api/bookings'
import { aisleLabel } from '@/lib/recipe-fields'
import { AllergyBadge, AllergyConflicts } from '@/components/shared/AllergyStatus'
import { useChefPublic } from '@/lib/api/menus'
import { apiMessage } from '@/lib/api/messages'
import { usePaymentStatus } from '@/lib/api/payments'

/* ─────────────────────────────────────────────────────────────────────────────
   Le détail d'une commande — `GET /me/bookings/{id}`.

   La route a changé le 16/10 ; l'ancienne (`/bookings/me/bookings/{id}`, au
   segment doublé) est dépréciée. La nouvelle rend tout ce qui manquait :
   l'adresse, les consignes, le nom du batch cooker, ce qui a été payé, le
   reste à charge après crédit d'impôt — et la demande de report en cours, s'il
   y en a une.

   Trois règles de l'API tiennent cet écran :

   - **le paiement confirme.** Une commande `pending` tient son créneau 72 h ;
   - **les détails ne se changent que sur un `pending`**, et l'annulation n'est
     possible que si rien n'est payé, ou avant le début une fois confirmée ;
   - **un report se propose et se confirme**, et rien ne bouge dans les 48
     dernières heures.
   ───────────────────────────────────────────────────────────────────────────── */

/** Le parcours d'une prestation, tel que les statuts de l'API le décrivent. */
const FLOW = ['pending', 'confirmed', 'shopping', 'cooking', 'delivered'] as const

const STEP_LABEL: Record<string, string> = {
  pending: 'À régler',
  confirmed: 'Confirmée',
  shopping: 'Courses',
  cooking: 'En cuisine',
  delivered: 'Livrée',
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
  const toast = useToast()
  const courses = useMissionShoppingList(b.id)
  const update = useUpdateMyBooking()
  const repondre = useAnswerReschedule('client')
  const ics = useBookingIcs()
  const [aAnnuler, setAAnnuler] = useState(false)

  const ttc = euros(b.amountTtc ?? b.priceCents)
  /* Les courses ont leur ligne : l'API les facture à part depuis le 17/10, et
     elles disparaîtraient dans un total. */
  const prestation = euros(b.priceCents)
  const forfaitCourses = b.shoppingFeeCents ? euros(b.shoppingFeeCents) : null
  const reste = euros(b.amountAfterTax)
  const credit =
    b.amountTtc != null && b.amountAfterTax != null
      ? euros(b.amountTtc - b.amountAfterTax)
      : null
  const paye = euros(b.paidCents)
  const portions = bookingPortions(b)

  const aRegler = b.status === 'pending'
  const arretee = b.status === 'cancelled' || b.status === 'disputed'
  const etape = FLOW.indexOf(b.status as (typeof FLOW)[number])

  /**
   * Annuler : tant que rien n'est payé, ou avant le début si c'est confirmé.
   *
   * On ne compare pas l'heure ici : c'est l'API qui tient la vérité, et un
   * `Date.now()` pendant le rendu donnerait une réponse qui change d'un rendu
   * à l'autre. Le bouton reste donc offert sur une prestation confirmée, et
   * l'API répond `409` si elle a commencé — le message est affiché tel quel.
   */
  const annulable = (b.status === 'pending' && !b.paidCents) || b.status === 'confirmed'

  /** Un report proposé par le batch cooker attend une réponse. */
  const report =
    b.reschedule?.status === 'pending' && b.reschedule.proposedBy === 'chef'
      ? b.reschedule
      : null

  const groupes = courses.data?.groups ?? []

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

      {/* ── Une demande de report attend votre réponse ──────────────────── */}
      {report && (
        <section className="rounded-3xl border border-amber/40 bg-amber-soft/60 p-5">
          <p className="flex items-start gap-2 font-display text-base font-bold text-navy">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-deep" aria-hidden />
            Votre batch cooker propose un autre horaire
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-mid">
            Au lieu du {longDate(report.from)} à {hour(report.from)}, il propose le{' '}
            <strong className="font-semibold text-navy">
              {longDate(report.to)} à {hour(report.to)}
            </strong>
            . La durée, le prix et ce qui est payé ne changent pas.
          </p>
          {report.expiresAt && (
            <p className="mt-1 text-[12px] text-ink-soft">
              Sans réponse avant le {longDate(report.expiresAt)}, la prestation garde
              son heure.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() =>
                repondre.mutate(
                  { id: b.id, decision: 'accepted' },
                  {
                    onSuccess: () => toast.success('Nouvel horaire accepté'),
                    onError: (e) =>
                      toast.error(
                        'La réponse n’a pas été enregistrée',
                        apiMessage(e),
                      ),
                  },
                )
              }
              disabled={repondre.isPending}
              className="btn btn-primary text-xs"
            >
              Accepter ce nouvel horaire
            </button>
            <button
              onClick={() =>
                repondre.mutate(
                  { id: b.id, decision: 'declined' },
                  {
                    onSuccess: () =>
                      toast.info('Horaire refusé', 'La prestation garde son heure.'),
                    onError: () => toast.error('La réponse n’a pas été enregistrée'),
                  },
                )
              }
              disabled={repondre.isPending}
              className="btn btn-outline text-xs"
            >
              Garder l’horaire prévu
            </button>
          </div>
        </section>
      )}

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
              {b.chef?.displayName && (
                <span className="inline-flex items-center gap-1.5">
                  <ChefHat className="h-4 w-4 text-amber" aria-hidden />
                  {b.chef.displayName}
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

            {/* Le fichier exige le jeton : on le télécharge, on ne le lie pas. */}
            {b.startsAt && !arretee && (
              <button
                onClick={() =>
                  ics.mutate(
                    { id: b.id, reference: b.reference },
                    {
                      onSuccess: () =>
                        toast.success(
                          'Prestation ajoutée à votre agenda',
                          'Ouvrez le fichier téléchargé : il crée l’événement, et le met à jour si l’horaire change.',
                        ),
                      onError: (e) =>
                        toast.error(
                          'Le calendrier n’a pas pu être préparé',
                          apiMessage(e),
                        ),
                    },
                  )
                }
                disabled={ics.isPending}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-60"
              >
                {ics.isPending ? (
                  <RotateCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <CalendarPlus className="h-3.5 w-3.5 text-amber" aria-hidden />
                )}
                Ajouter à mon agenda
              </button>
            )}
          </div>
          {ttc && (
            <div className="flex flex-col items-start lg:items-end">
              <p className="font-display text-3xl font-bold text-amber">{ttc}</p>
              {reste && (
                <p className="text-xs text-white/60">soit {reste} après crédit d’impôt</p>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── À régler ─────────────────────────────────────────────────────── */}
      {aRegler && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-amber/40 bg-amber-soft/60 p-5">
          <div className="min-w-0">
            <p className="font-display text-base font-bold text-navy">
              Cette commande attend son règlement
            </p>
            <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-ink-mid">
              C’est le paiement qui la confirme auprès de votre batch cooker. Le
              créneau est tenu 72 heures, puis la commande est annulée.
            </p>
            <ResteAPayer bookingId={b.id} />
          </div>
          <Link
            href={`/espace-client/commandes/${b.id}/paiement`}
            className="btn btn-primary shrink-0 text-xs"
          >
            Régler maintenant
            <ArrowRight className="icon-arrow h-3.5 w-3.5" aria-hidden />
          </Link>
        </section>
      )}

      {/* ── Suivi ────────────────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-6 lg:p-7">
        <h3 className="mb-5 font-display text-lg font-bold text-navy">
          Suivi de la commande
        </h3>
        {arretee ? (
          <p className="text-sm font-semibold text-red-700">
            {b.status === 'disputed'
              ? 'Cette commande fait l’objet d’un litige. Notre équipe vous répond par la messagerie.'
              : 'Cette commande a été annulée.'}
          </p>
        ) : b.status === 'completed' ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-mint-ink">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Prestation terminée. Merci !
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
              style={{ width: `${(Math.max(etape, 0) / (FLOW.length - 1)) * 100}%` }}
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
        {b.arrivedAt && (
          <p className="mt-4 flex items-center gap-2 text-[13px] text-ink-mid">
            <Clock className="h-3.5 w-3.5 text-amber" aria-hidden />
            Votre batch cooker est arrivé à {hour(b.arrivedAt)}.
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          {/* ── Plats ──────────────────────────────────────────────────── */}
          <div className="rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-6">
            <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-navy">
              <ChefHat className="h-4 w-4 text-amber" aria-hidden /> Plats prévus
              <span className="ml-auto">
                <AllergyBadge check={b.allergyCheck} reasons={b.allergyCheckReasons} />
              </span>
            </h3>
            {(b.meals?.length ?? 0) === 0 ? (
              <p className="text-sm text-ink-soft">
                Aucun plat rattaché à cette commande.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {b.meals!.map((m) => (
                  <li
                    key={m.mealId}
                    className="flex items-center gap-3 rounded-2xl border border-[rgba(31,42,55,0.04)] bg-cream-soft px-4 py-3"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-soft text-xs font-bold text-amber-deep">
                      {m.portions}
                    </span>
                    <p className="min-w-0 text-sm font-semibold text-navy">
                      {m.name ?? 'Plat retiré du catalogue'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 empty:hidden">
              <ClientConflicts booking={b} />
            </div>
          </div>

          {/* ── Les photos de la session ───────────────────────────────── */}
          {(b.photos?.length ?? 0) > 0 && <PhotosSession photos={b.photos!} />}

          {/* ── Liste de courses ───────────────────────────────────────── */}
          <div className="rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold text-navy">
                <ShoppingBasket className="h-4 w-4 text-amber" aria-hidden /> Liste de
                courses
              </h3>
              <span className="rounded-full bg-cream-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-mid">
                {b.shoppingByClient ? 'À votre charge' : 'Faites par le batch cooker'}
              </span>
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

          {/* ── Vos consignes ──────────────────────────────────────────── */}
          {b.notes && (
            <div className="rounded-3xl border border-amber/30 bg-amber-soft/50 p-5 text-sm text-navy">
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-deep">
                <Sparkles className="h-3.5 w-3.5" aria-hidden /> Vos consignes
              </p>
              {b.notes}
            </div>
          )}
        </section>

        {/* ── Colonne de droite ─────────────────────────────────────────── */}
        <aside className="space-y-4">
          <div className="rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-5">
            <h4 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-navy">
              <Receipt className="h-4 w-4 text-amber" aria-hidden /> Récapitulatif
            </h4>
            {ttc ? (
              <>
              <ul className="space-y-2 text-sm text-ink-mid">
                {forfaitCourses && prestation ? (
                  <>
                    <Row label="Prestation" value={prestation} />
                    <Row label="Courses" value={forfaitCourses} />
                    <Row label="Total TTC" value={ttc} />
                  </>
                ) : (
                  <Row label="Prestation TTC" value={ttc} />
                )}
                {credit && <Row label="Crédit d’impôt" value={`− ${credit}`} accent />}
                {reste && <Row label="Reste à charge" value={reste} bold />}
                {paye && <Row label="Déjà réglé" value={paye} />}
              </ul>
              {b.shoppingByClient && (
                <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                  Vous faites les courses vous-même : aucun forfait n’est facturé.
                </p>
              )}
              </>
            ) : (
              <p className="text-sm text-ink-soft">Montant non communiqué par l’API.</p>
            )}
          </div>

          {b.addressLine && (
            <div className="rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-5">
              <h4 className="mb-2 flex items-center gap-2 font-display text-base font-bold text-navy">
                <MapPin className="h-4 w-4 text-amber" aria-hidden /> Où
              </h4>
              <p className="text-[13px] leading-relaxed text-ink-mid">
                {b.addressLine}
                {b.city ? `, ${b.city}` : ''}
              </p>
            </div>
          )}

          {!aRegler && b.status !== 'cancelled' && (
            <div className="rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-5">
              <h4 className="flex items-center gap-2 font-display text-base font-bold text-navy">
                <BadgeEuro className="h-4 w-4 text-amber" aria-hidden /> Règlement
              </h4>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-mid">
                {b.paidCents && b.amountTtc && b.paidCents >= b.amountTtc
                  ? 'Réglée. Votre reçu est dans votre espace.'
                  : 'Il reste une part à régler sur cette prestation.'}
              </p>
              <Link
                href={`/espace-client/commandes/${b.id}/paiement`}
                className="btn btn-outline mt-3 w-full justify-center text-xs"
              >
                Voir le règlement
                <ArrowRight className="icon-arrow h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          )}

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

          {annulable ? (
            <button
              onClick={() => setAAnnuler(true)}
              className="w-full text-center text-xs text-ink-soft transition-colors hover:text-red-700"
            >
              Annuler cette prestation
            </button>
          ) : (
            !arretee &&
            b.status !== 'completed' && (
              <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-ink-soft">
                <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                Une prestation déjà réglée ne s’annule plus depuis cet écran, et
                plus du tout une fois commencée. Passez par la messagerie.
              </p>
            )
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={aAnnuler}
        onClose={() => setAAnnuler(false)}
        onConfirm={() =>
          update.mutate(
            { id: b.id, patch: { status: 'cancelled' } },
            {
              onSuccess: () => {
                setAAnnuler(false)
                toast.success('Prestation annulée', 'Votre batch cooker est prévenu.')
              },
              onError: (e) =>
                toast.error(
                  'L’annulation a été refusée',
                  apiMessage(e),
                ),
            },
          )
        }
        pending={update.isPending}
        tone="danger"
        title="Annuler cette prestation ?"
        lead={`Le créneau du ${longDate(b.startsAt)} est libéré, et votre batch cooker est prévenu.`}
        detail={
          b.status === 'pending'
            ? 'Rien n’a été réglé : il n’y a rien à rembourser.'
            : 'Une prestation déjà commencée ne peut plus être annulée — celle-ci ne l’est pas encore.'
        }
        confirmLabel="Annuler la prestation"
      />
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
            prestation est confirmée, et votre reçu arrive par email.
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

/* ── Les photos de la session ──────────────────────────────────────────────── */

/**
 * Ce que le batch cooker a photographié chez vous : les bocaux alignés, les
 * parts filmées, l'étiquette sur le couvercle. L'API les rendait déjà sur la
 * commande, l'écran ne les montrait qu'au batch cooker — alors que c'est au
 * client qu'elles servent, le soir où il ouvre le frigo.
 *
 * Pas de visionneuse : chaque photo s'ouvre en grand dans un onglet. Une
 * légende, quand il en a laissé une, dit de quel plat il s'agit.
 */
function PhotosSession({ photos }: { photos: BookingPhoto[] }) {
  return (
    <div className="rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-6">
      <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-navy">
        <Camera className="h-4 w-4 text-amber" aria-hidden /> Photos de la session
      </h3>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((p) => (
          <li key={p.id}>
            <a
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="group block overflow-hidden rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-terra focus-visible:ring-offset-2"
            >
              <span className="block aspect-[4/3] overflow-hidden rounded-2xl bg-cream-deep">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.caption ?? ''}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
              </span>
              {p.caption && (
                <span className="mt-1.5 block text-[12px] leading-snug text-ink-mid">
                  {p.caption}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
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

/* ── Ce qu'il reste à payer ────────────────────────────────────────────────── */

/**
 * `GET /me/bookings/{id}/payment-status` ne compte que les paiements
 * **soldés**. Un règlement en titres CESU que le batch cooker n'a pas encore
 * confirmé ne couvre donc rien — et c'est précisément ce qu'il faut dire : le
 * client qui a remis ses titres croit avoir payé, et verra sa commande
 * attendre sans comprendre pourquoi.
 */
function ResteAPayer({ bookingId }: { bookingId: string }) {
  const etat = usePaymentStatus(bookingId)
  if (!etat.data) return null

  const { amountTtcCents, coveredAmountCents, remainingAmountCents } = etat.data
  if (coveredAmountCents <= 0) return null

  return (
    <p className="mt-3 text-[13px] text-ink-mid">
      <span className="font-semibold text-navy">
        {euros(remainingAmountCents)}
      </span>{' '}
      à régler, sur {euros(amountTtcCents)} — {euros(coveredAmountCents)} déjà
      couverts.
      <span className="mt-1 block text-[12px] text-ink-soft">
        Un règlement en titres CESU ne compte qu’une fois votre batch cooker
        l’a confirmé.
      </span>
    </p>
  )
}

/** Les plats de remplacement : la carte publiée du batch cooker, lue seulement s'il en faut. */
function ClientConflicts({ booking }: { booking: Booking }) {
  const chef = useChefPublic(booking.allergyConflicts?.length ? booking.chef?.id : undefined)
  return (
    <AllergyConflicts booking={booking} side="client" candidates={chef.data?.dishes ?? []} />
  )
}
