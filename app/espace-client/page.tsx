'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  ShoppingBasket,
  Sparkles,
  Trophy,
} from 'lucide-react'
import {
  bookingMealNames,
  bookingPortions,
  bookingStatusText,
  euros,
  hour,
  isBookingOpen,
  longDate,
  useMyBookings,
  type Booking,
} from '@/lib/api/bookings'
import { useMyQuotes } from '@/lib/api/quotes'
import { useConversations } from '@/lib/api/messaging'
import { previewOf } from '@/components/messaging/format'
import CulinaryMap from '@/components/dashboard/CulinaryMap'
import { Prix, PrixLigne } from '@/components/shared/Prix'

/* ─────────────────────────────────────────────────────────────────────────────
   Accueil client.

   Trois questions, dans cet ordre : qu'est-ce qui arrive, est-ce que quelque
   chose m'attend, et qu'est-ce que ça m'a apporté. Le reste — messages,
   demande en cours, bilan — tient dans une colonne de côté : ce sont des
   nouvelles, pas des décisions.

   Le bilan est un relevé aligné à droite, pas une rangée de tuiles. Quatre
   nombres du même poids posés côte à côte ne font pas une hiérarchie, et
   leurs libellés se percutent dès que la ligne se replie. En colonne, les
   chiffres s'alignent sur leur unité et se comparent d'un coup d'œil.

   Les montants suivent la règle de la maison : le reste à charge après
   crédit d'impôt en premier, le total avant déduction dessous — c'est le
   prix que le client paie réellement.

   Tout vient de l'API — `GET /me/bookings` et `GET /me/quotes`. Le bilan se
   calcule sur les prestations **terminées** : une session annulée n'a fait
   gagner de temps à personne.
   ───────────────────────────────────────────────────────────────────────────── */

/** Les étapes que l'API fait parcourir à une prestation, dans l'ordre. */
const FLOW = ['pending', 'confirmed', 'shopping', 'cooking', 'delivered'] as const

const STEP_LABEL: Record<(typeof FLOW)[number], string> = {
  pending: 'Reçue',
  confirmed: 'Confirmée',
  shopping: 'Courses',
  cooking: 'En cuisine',
  delivered: 'Livrée',
}

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-amber',
  confirmed: 'bg-mint-deep',
  shopping: 'bg-mint-deep',
  cooking: 'bg-terra',
  delivered: 'bg-ink-soft',
  completed: 'bg-ink-soft',
  cancelled: 'bg-red-400',
  disputed: 'bg-red-400',
}

/** Deux heures gagnées par prestation : l'hypothèse est dite, pas cachée. */
const HEURES_PAR_SESSION = 2

export default function DashboardOverviewPage() {
  const query = useMyBookings({ limit: 50 })
  const devis = useMyQuotes()
  const toutes = query.data?.data ?? []

  /* La prochaine : la première encore ouverte, dans l'ordre du temps. */
  const aVenir = [...toutes]
    .filter(isBookingOpen)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const prochaine = aVenir[0] ?? null
  const etape = prochaine
    ? FLOW.indexOf(prochaine.status as (typeof FLOW)[number])
    : -1

  /** Une prestation `pending` non réglée tient son créneau 72 h, puis tombe. */
  const aRegler = toutes.find((b) => b.status === 'pending' && !b.paidCents) ?? null

  const terminees = toutes.filter(
    (b) => b.status === 'completed' || b.status === 'delivered',
  )
  const platsCuisines = terminees.reduce((n, b) => n + bookingPortions(b), 0)
  const creditCumule = terminees.reduce(
    (n, b) =>
      n + (b.amountTtc != null && b.amountAfterTax != null ? b.amountTtc - b.amountAfterTax : 0),
    0,
  )

  // La conversation la plus récemment active : la liste arrive déjà triée.
  const lastThread = useConversations().data?.find((c) => c.lastMessage)
  /** Une demande sur-mesure qui attend encore quelque chose. */
  const demande =
    (devis.data ?? []).find(
      (q) => !['accepted', 'cancelled', 'closed'].includes(q.status),
    ) ?? null

  return (
    <div className="space-y-8">
      {/* ── Ce qui arrive ─────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden rounded-3xl bg-navy text-white"
      >
        <div className="grid grid-cols-1 gap-px bg-white/10 lg:grid-cols-[1.7fr_1fr]">
          <div className="bg-navy p-6 lg:p-8">
            {query.isPending ? (
              <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
            ) : prochaine ? (
              <>
                <p className="text-sm text-amber">Prochaine session</p>
                <h2 className="mt-2 font-display text-3xl font-bold capitalize leading-tight lg:text-[2.5rem]">
                  {longDate(prochaine.startsAt) ?? 'Date à confirmer'}
                </h2>
                <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-white/70">
                  {hour(prochaine.startsAt) && (
                    <span>
                      {hour(prochaine.startsAt)}
                      {hour(prochaine.endsAt) ? ` → ${hour(prochaine.endsAt)}` : ''}
                    </span>
                  )}
                  {prochaine.chef?.displayName && <span>{prochaine.chef.displayName}</span>}
                  <span>
                    {bookingMealNames(prochaine).length} plats ·{' '}
                    {prochaine.persons ?? bookingPortions(prochaine)} personnes
                  </span>
                </p>

                {bookingMealNames(prochaine).length > 0 && (
                  <p className="mt-5 text-sm leading-relaxed text-white/60">
                    {bookingMealNames(prochaine).join(' · ')}
                  </p>
                )}

                <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Link
                    href={`/espace-client/commandes/${prochaine.id}`}
                    className="inline-flex items-center gap-2 bg-amber px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-amber-deep"
                  >
                    Voir le détail
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  <Link
                    href="/espace-client/messages"
                    className="text-sm text-white/70 underline-offset-4 hover:text-white hover:underline"
                  >
                    Écrire à mon chef
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-amber">Aucune session prévue</p>
                <h2 className="mt-2 font-display text-3xl font-bold leading-tight lg:text-[2.5rem]">
                  Votre frigo va finir par s’en apercevoir
                </h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-white/65">
                  Choisissez un batch cooker et calez une date : le reste se prépare tout seul.
                </p>
                <Link
                  href="/espace-client/menus?reserve=1"
                  className="mt-7 inline-flex items-center gap-2 bg-amber px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-amber-deep"
                >
                  Voir les cartes de la semaine
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </>
            )}
          </div>

          {/* Le montant et l'avancement : les deux questions qu'on se pose. */}
          {prochaine && (
            <div className="flex flex-col gap-5 bg-navy p-6 lg:p-7">
              {(prochaine.amountAfterTax != null || prochaine.amountTtc != null) && (
                <Prix
                  apresCredit={euros(prochaine.amountAfterTax)}
                  total={euros(prochaine.amountTtc ?? prochaine.priceCents)}
                  lead="Ce que vous payez"
                  tone="dark"
                />
              )}

              <div className="border-t border-white/10 pt-5">
                <p className="mb-4 text-sm text-white/50">Où en est ma session</p>
                <ol className="space-y-3">
                  {FLOW.map((step, i) => {
                    const done = i < etape
                    const now = i === etape
                    return (
                      <li key={step} className="flex items-center gap-3">
                        {done ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-mint-deep" aria-hidden />
                        ) : (
                          <Circle
                            className={`h-4 w-4 shrink-0 ${now ? 'text-amber' : 'text-white/25'}`}
                            strokeWidth={now ? 3 : 2}
                            aria-hidden
                          />
                        )}
                        <span
                          className={
                            now
                              ? 'text-sm font-semibold text-white'
                              : done
                                ? 'text-sm text-white/65'
                                : 'text-sm text-white/35'
                          }
                        >
                          {STEP_LABEL[step]}
                        </span>
                        {now && <span className="ml-auto text-xs text-amber">en cours</span>}
                      </li>
                    )
                  })}
                </ol>
                <p className="mt-5 text-xs leading-relaxed text-white/45">
                  {prochaine.status === 'pending'
                    ? 'C’est le paiement qui confirme la session. Le créneau est tenu 72 heures.'
                    : 'Vous réglez à l’issue de la prestation, et choisissez votre moyen de paiement à ce moment-là.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.section>

      {/* ── Une prestation attend son règlement ───────────────────────── */}
      {aRegler && (
        <Link
          href={`/espace-client/commandes/${aRegler.id}/paiement`}
          className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-amber/45 bg-amber-soft/50 px-5 py-4 transition-colors hover:border-amber hover:bg-amber-soft"
        >
          <span className="min-w-0 flex-1 text-sm leading-relaxed text-navy">
            <span className="font-semibold">
              {aRegler.chef?.displayName?.split(' ')[0] ?? 'Votre batch cooker'} vous attend
            </span>{' '}
            le {longDate(aRegler.startsAt)}. Cette réservation n’est pas encore réglée.
          </span>
          <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-semibold text-navy">
            Régler
            <PrixLigne
              apresCredit={euros(aRegler.amountAfterTax)}
              total={euros(aRegler.amountTtc)}
            />
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </Link>
      )}

      {/* ── Le corps : l'histoire à gauche, les nouvelles à droite ────── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-10">
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h3 className="font-display text-lg font-bold text-navy">Sessions récentes</h3>
              <Link
                href="/espace-client/commandes"
                className="text-xs font-semibold text-terra underline-offset-4 hover:underline"
              >
                Tout voir
              </Link>
            </div>

            {query.isPending ? (
              <div className="h-32 animate-pulse rounded-2xl bg-paper" />
            ) : toutes.length === 0 ? (
              <p className="border-t border-[rgba(31,42,55,0.08)] py-6 text-sm text-ink-soft">
                Aucune session pour l’instant.
              </p>
            ) : (
              <ul className="divide-y divide-[rgba(31,42,55,0.08)] border-t border-[rgba(31,42,55,0.08)]">
                {[...toutes]
                  .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
                  .slice(0, 5)
                  .map((o) => (
                    <li key={o.id}>
                      <SessionRow booking={o} />
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <CulinaryMap />
        </div>

        <aside className="space-y-8">
          {/* ── Bilan : un relevé, chiffres alignés à droite ──────────── */}
          <section>
            <h3 className="mb-3 font-display text-lg font-bold text-navy">Votre bilan</h3>
            {terminees.length === 0 ? (
              <p className="border-t border-[rgba(31,42,55,0.08)] pt-3 text-sm leading-relaxed text-ink-mid">
                Il se remplira après votre première session : portions cuisinées, temps
                gagné, crédit d’impôt.
              </p>
            ) : (
              <>
                <dl className="divide-y divide-[rgba(31,42,55,0.08)] border-t border-[rgba(31,42,55,0.08)]">
                  <Figure label="Sessions réalisées" value={String(terminees.length)} />
                  <Figure label="Portions cuisinées" value={String(platsCuisines)} />
                  <Figure
                    label="Passées à autre chose"
                    value={`${terminees.length * HEURES_PAR_SESSION} h`}
                  />
                  <Figure
                    label="Crédit d’impôt cumulé"
                    value={euros(creditCumule) ?? '0 €'}
                    accent
                  />
                </dl>
                <p className="mt-2.5 text-xs leading-relaxed text-ink-soft">
                  Temps gagné estimé à {HEURES_PAR_SESSION} h par session.
                </p>
              </>
            )}
          </section>

          <section>
            <h3 className="mb-3 font-display text-lg font-bold text-navy">Dernier message</h3>
            <div className="border-t border-[rgba(31,42,55,0.08)] pt-3">
              {lastThread?.lastMessage ? (
                <>
                  <p className="text-sm font-semibold text-navy">
                    {lastThread.lastMessage.senderRole === lastThread.viewerRole
                      ? `Vous, à ${lastThread.counterpart.name}`
                      : lastThread.counterpart.name}
                  </p>
                  <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-ink-mid">
                    {previewOf(lastThread.lastMessage)}
                  </p>
                </>
              ) : (
                <p className="text-sm leading-relaxed text-ink-mid">
                  Aucun message pour le moment.
                </p>
              )}
              <Link
                href={
                  lastThread
                    ? `/espace-client/messages?c=${lastThread.id}`
                    : '/espace-client/messages'
                }
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-terra underline-offset-4 hover:underline"
              >
                {lastThread ? 'Répondre' : 'Ouvrir la messagerie'}
                <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            </div>
          </section>

          {demande && (
            <section>
              <h3 className="mb-3 font-display text-lg font-bold text-navy">Demande sur-mesure</h3>
              <div className="border-t border-[rgba(31,42,55,0.08)] pt-3">
                <p className="text-sm font-semibold text-navy">{demande.title}</p>
                <p className="mt-1 text-xs text-ink-soft">
                  {demande.activeOffer
                    ? `Offre reçue · ${euros(demande.activeOffer.afterTaxCreditCents) ?? ''} après crédit d’impôt`
                    : 'En attente d’une offre'}
                </p>
                <Link
                  href="/espace-client/personnalisation"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-terra underline-offset-4 hover:underline"
                >
                  Voir la demande
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-3 font-display text-lg font-bold text-navy">Aller à</h3>
            <ul className="divide-y divide-[rgba(31,42,55,0.08)] border-t border-[rgba(31,42,55,0.08)]">
              <Shortcut
                href="/espace-client/courses"
                Icon={ShoppingBasket}
                title="Ma liste de courses"
              />
              <Shortcut
                href="/espace-client/personnalisation"
                Icon={Sparkles}
                title="Demande sur-mesure"
              />
              <Shortcut
                href="/espace-client/statistiques"
                Icon={Trophy}
                title="Mes statistiques"
              />
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}

/** Une ligne de l'historique : date, chef, ce qu'il reste à charge. */
function SessionRow({ booking: o }: { booking: Booking }) {
  return (
    <Link
      href={`/espace-client/commandes/${o.id}`}
      className="group flex items-center gap-4 py-3.5 transition-colors hover:bg-paper"
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[o.status] ?? 'bg-ink-soft'}`}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold capitalize text-navy">
          {longDate(o.startsAt)}
          {o.chef?.displayName ? ` · ${o.chef.displayName.split(' ')[0]}` : ''}
        </span>
        <span className="block truncate text-xs text-ink-soft">
          {bookingMealNames(o).length} plats · {bookingStatusText(o.status)}
        </span>
      </span>
      {o.status === 'pending' && !o.paidCents ? (
        <span className="whitespace-nowrap text-xs font-semibold text-terra">À régler</span>
      ) : (
        <PrixLigne
          apresCredit={euros(o.amountAfterTax)}
          total={euros(o.amountTtc ?? o.priceCents)}
          className="hidden shrink-0 text-sm sm:inline-flex"
        />
      )}
      <ArrowRight
        className="h-4 w-4 shrink-0 text-ink-soft transition-colors group-hover:text-navy"
        aria-hidden
      />
    </Link>
  )
}

function Figure({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-ink-mid">{label}</dt>
      <dd
        className={`shrink-0 font-display text-lg font-bold tabular-nums ${
          accent ? 'text-terra' : 'text-navy'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}

function Shortcut({
  href,
  Icon,
  title,
}: {
  href: string
  Icon: typeof ShoppingBasket
  title: string
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-3 py-2.5 transition-colors hover:bg-paper"
      >
        <Icon className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-navy">{title}</span>
        <ArrowRight
          className="h-3.5 w-3.5 shrink-0 text-ink-soft transition-colors group-hover:text-navy"
          aria-hidden
        />
      </Link>
    </li>
  )
}
