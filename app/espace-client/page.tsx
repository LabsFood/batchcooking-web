'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, MessageCircle } from 'lucide-react'
import {
  bookingMealNames,
  bookingPortions,
  bookingStatusText,
  bookingStatusTone,
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
import BienDemarrer from '@/components/client/BienDemarrer'
import { Prix, PrixLigne } from '@/components/shared/Prix'
import { Skeleton, SkeletonGroup } from '@/components/shared/Skeleton'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────────
   Accueil client.

   Trois questions, dans cet ordre : est-ce que quelque chose m'attend,
   qu'est-ce qui arrive, et qu'est-ce que ça m'a apporté.

   - Ce qui demande un geste (un règlement, une étape de départ) passe avant
     tout, sur une ligne : c'est une tâche, pas un décor.
   - La prochaine session est le seul bloc marine de l'écran. Sa progression se
     lit de gauche à droite, comme le temps qui passe.
   - Le reste tient en panneaux blancs sur une grille de trois colonnes :
     l'historique à gauche, le bilan et les nouvelles à droite.

   Le bilan est un relevé aligné à droite, pas une rangée de tuiles. Quatre
   nombres du même poids posés côte à côte ne font pas une hiérarchie. En
   colonne, les chiffres s'alignent sur leur unité et se comparent d'un coup
   d'œil.

   Les montants suivent la règle de la maison : le reste à charge après crédit
   d'impôt en premier, le total avant déduction dessous.

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

/** Deux heures gagnées par prestation : l'hypothèse est dite, pas cachée. */
const HEURES_PAR_SESSION = 2

const JOUR_MS = 86_400_000

/** « Aujourd'hui », « Demain », « Dans 4 jours » — en jours de calendrier. */
function echeance(iso: string, maintenant: Date): string {
  const debut = new Date(iso)
  const a = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate())
  const b = new Date(debut.getFullYear(), debut.getMonth(), debut.getDate())
  const n = Math.round((b.getTime() - a.getTime()) / JOUR_MS)
  if (n <= 0) return 'Aujourd’hui'
  if (n === 1) return 'Demain'
  return `Dans ${n} jours`
}

export default function DashboardOverviewPage() {
  // Une seule lecture de l'heure, au montage : le rendu reste pur.
  const [maintenant] = useState(() => new Date())
  const query = useMyBookings({ limit: 50 })
  const devis = useMyQuotes()
  const toutes = query.data?.data ?? []

  /* La prochaine : la première encore ouverte, dans l'ordre du temps. */
  const aVenir = [...toutes]
    .filter(isBookingOpen)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const prochaine = aVenir[0] ?? null
  const etape = prochaine ? FLOW.indexOf(prochaine.status as (typeof FLOW)[number]) : -1

  /** Une prestation `pending` non réglée tient son créneau 72 h, puis tombe. */
  const aRegler = toutes.find((b) => b.status === 'pending' && !b.paidCents) ?? null

  const terminees = toutes.filter((b) => b.status === 'completed' || b.status === 'delivered')
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
    (devis.data ?? []).find((q) => !['accepted', 'cancelled', 'closed'].includes(q.status)) ?? null

  const prenomChef = prochaine?.chef?.displayName?.split(' ')[0]

  return (
    <div className="space-y-6">
      {/* ── Ce qui attend un geste ─────────────────────────────────────── */}
      {aRegler && (
        <Link
          href={`/espace-client/commandes/${aRegler.id}/paiement`}
          className="group flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-amber/50 bg-[var(--warn-soft)] px-5 py-3.5 transition-colors hover:border-amber"
        >
          <span className="min-w-0 flex-1 basis-72 text-sm leading-relaxed text-navy">
            <span className="font-semibold">
              {aRegler.chef?.displayName?.split(' ')[0] ?? 'Votre batch cooker'} vous attend
            </span>{' '}
            le {longDate(aRegler.startsAt)}. Cette réservation n’est pas encore réglée : le
            créneau est tenu 72 heures.
          </span>
          <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-semibold tabular-nums text-navy">
            Régler
            <PrixLigne
              apresCredit={euros(aRegler.amountAfterTax)}
              total={euros(aRegler.amountTtc)}
            />
            {/* action secondaire : la flèche avance de 2 px */}
            <ArrowRight
              className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </Link>
      )}

      {/* ── Bien démarrer (LF-0221) : disparaît une fois tout fait ─────── */}
      <BienDemarrer />

      {/* ── Ce qui arrive ─────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-3xl bg-navy text-white">
        {query.isPending ? (
          // Mêmes hauteurs que le bloc « Prochaine session », en clair sur le marine.
          <SkeletonGroup className="p-6 lg:p-8">
            <Skeleton className="h-6 w-40 bg-white/10" />
            <Skeleton className="mt-4 h-10 w-3/4 bg-white/10" />
            <Skeleton className="mt-4 h-5 w-2/3 bg-white/10" />
            <Skeleton className="mt-8 h-2 w-full bg-white/10" />
            <Skeleton className="mt-8 h-10 w-44 rounded-xl bg-white/10" />
          </SkeletonGroup>
        ) : prochaine ? (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="p-6 lg:p-8">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h2 className="text-sm font-semibold text-white/70">Prochaine session</h2>
                <span className="status status-on-dark">{echeance(prochaine.startsAt, maintenant)}</span>
              </div>

              <p className="cap-first mt-3 font-display text-3xl font-bold leading-tight lg:text-[2.5rem]">
                {longDate(prochaine.startsAt) ?? 'Date à confirmer'}
              </p>

              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm tabular-nums text-white/75">
                {hour(prochaine.startsAt) && (
                  <span>
                    {hour(prochaine.startsAt)}
                    {hour(prochaine.endsAt) ? ` → ${hour(prochaine.endsAt)}` : ''}
                  </span>
                )}
                {prochaine.chef?.displayName && <span>avec {prochaine.chef.displayName}</span>}
                <span>
                  {bookingMealNames(prochaine).length} plats pour{' '}
                  {prochaine.persons ?? bookingPortions(prochaine)} personnes
                </span>
              </p>

              {bookingMealNames(prochaine).length > 0 && (
                <p className="mt-4 max-w-[65ch] text-sm leading-relaxed text-white/60">
                  {bookingMealNames(prochaine).join(' · ')}
                </p>
              )}

              {/* L'avancement, de gauche à droite. */}
              <Avancement etape={etape} />

              <p className="mt-4 max-w-[65ch] text-xs leading-relaxed text-white/55">
                {prochaine.status === 'pending'
                  ? 'C’est le paiement qui confirme la session. Le créneau est tenu 72 heures.'
                  : 'Vous réglez à l’issue de la prestation, et choisissez votre moyen de paiement à ce moment-là.'}
              </p>
            </div>

            {/* Le montant, puis ce qu'on peut faire. */}
            <div className="flex flex-col justify-between gap-6 border-t border-white/10 p-6 lg:border-l lg:border-t-0 lg:p-8">
              {(prochaine.amountAfterTax != null || prochaine.amountTtc != null) && (
                <Prix
                  apresCredit={euros(prochaine.amountAfterTax)}
                  total={euros(prochaine.amountTtc ?? prochaine.priceCents)}
                  lead="Ce que vous payez"
                  tone="dark"
                  taille="lg"
                />
              )}
              <div className="space-y-2">
                <Link
                  href={`/espace-client/commandes/${prochaine.id}`}
                  className="btn btn-amber w-full"
                >
                  Voir le détail
                  <ArrowRight className="icon-arrow h-4 w-4" aria-hidden />
                </Link>
                <Link href="/espace-client/messages" className="btn btn-outline-light w-full">
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  Écrire à {prenomChef ?? 'mon batch cooker'}
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 lg:p-10">
            <h2 className="text-sm font-semibold text-white/70">Aucune session prévue</h2>
            <p className="mt-3 max-w-xl font-display text-3xl font-bold leading-tight lg:text-[2.5rem]">
              Votre frigo va finir par s’en apercevoir
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
              Choisissez un batch cooker et calez une date : le reste se prépare tout seul.
            </p>
            <Link href="/espace-client/menus?reserve=1" className="btn btn-amber mt-7">
              Voir les cartes de la semaine
              <ArrowRight className="icon-arrow h-4 w-4" aria-hidden />
            </Link>
          </div>
        )}
      </section>

      {/* ── Le corps : l'histoire à gauche, les nouvelles à droite ────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="panel overflow-hidden">
            <div className="panel-head pb-3">
              <h2 className="panel-title">Sessions récentes</h2>
              <Link href="/espace-client/commandes" className="panel-link hit">
                Tout voir
              </Link>
            </div>

            {query.isPending ? (
              // Une ligne = 68 px (SessionRow) ; cinq lignes comme la liste réelle.
              <SkeletonGroup className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3 lg:px-6">
                    <Skeleton className="h-11 w-11 rounded-xl" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-5 w-48 max-w-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="hidden h-5 w-20 sm:block" />
                  </div>
                ))}
              </SkeletonGroup>
            ) : toutes.length === 0 ? (
              <div className="border-t border-[var(--line)] px-5 py-8 lg:px-6">
                <p className="text-sm leading-relaxed text-ink-mid">
                  Vos sessions apparaîtront ici, de la réservation à la livraison.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
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

        <aside className="space-y-6">
          {/* ── Bilan : un relevé, chiffres alignés à droite ──────────── */}
          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">Votre bilan</h2>
              <Link href="/espace-client/statistiques" className="panel-link hit">
                Détail
              </Link>
            </div>
            <div className="px-5 pb-5 pt-2 lg:px-6 lg:pb-6">
              {terminees.length === 0 ? (
                <p className="pt-1 text-sm leading-relaxed text-ink-mid">
                  Il se remplira après votre première session : portions cuisinées, temps
                  gagné, crédit d’impôt.
                </p>
              ) : (
                <>
                  <dl className="divide-y divide-[var(--line)]">
                    <Figure label="Sessions réalisées" value={String(terminees.length)} />
                    <Figure label="Portions cuisinées" value={String(platsCuisines)} />
                    <Figure
                      label="Temps gagné"
                      value={`${terminees.length * HEURES_PAR_SESSION} h`}
                    />
                    <Figure
                      label="Crédit d’impôt cumulé"
                      value={euros(creditCumule) ?? '0 €'}
                      accent
                    />
                  </dl>
                  <p className="mt-3 text-xs leading-relaxed text-ink-soft">
                    Temps gagné estimé à {HEURES_PAR_SESSION} h par session.
                  </p>
                </>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">Dernier message</h2>
            </div>
            <div className="px-5 pb-5 pt-2 lg:px-6 lg:pb-6">
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
                  Aucun message pour le moment. Vous pourrez écrire à votre batch cooker dès
                  votre première réservation.
                </p>
              )}
              <Link
                href={
                  lastThread
                    ? `/espace-client/messages?c=${lastThread.id}`
                    : '/espace-client/messages'
                }
                className="btn btn-outline mt-4 w-full"
              >
                {lastThread ? 'Répondre' : 'Ouvrir la messagerie'}
              </Link>
            </div>
          </section>

          {demande && (
            <section className="panel">
              <div className="panel-head">
                <h2 className="panel-title">Demande sur-mesure</h2>
                <span className={cn('status', demande.activeOffer ? 'status-ok' : 'status-warn')}>
                  {demande.activeOffer ? 'Offre reçue' : 'En attente'}
                </span>
              </div>
              <div className="px-5 pb-5 pt-2 lg:px-6 lg:pb-6">
                <p className="text-sm font-semibold text-navy">{demande.title}</p>
                <p className="mt-1 text-sm tabular-nums text-ink-mid">
                  {demande.activeOffer
                    ? `${euros(demande.activeOffer.afterTaxCreditCents) ?? ''} après crédit d’impôt`
                    : 'Un batch cooker prépare son offre.'}
                </p>
                <Link href="/espace-client/personnalisation" className="btn btn-outline mt-4 w-full">
                  {demande.activeOffer ? 'Voir l’offre' : 'Voir la demande'}
                </Link>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}

/**
 * L'avancement d'une session : cinq étapes sur une ligne. L'étape en cours est
 * nommée même sur un petit écran, où les cinq libellés ne tiendraient pas.
 */
function Avancement({ etape }: { etape: number }) {
  return (
    <div className="mt-7">
      <ol className="grid grid-cols-5 gap-1.5" aria-label="Où en est ma session">
        {FLOW.map((step, i) => {
          const done = i < etape
          const now = i === etape
          return (
            <li key={step} aria-current={now ? 'step' : undefined}>
              <span
                aria-hidden
                className={cn(
                  'block h-1.5 rounded-full',
                  done ? 'bg-mint-deep' : now ? 'bg-amber' : 'bg-white/15',
                )}
              />
              <span
                className={cn(
                  'mt-2 hidden items-center gap-1 text-xs sm:flex',
                  now ? 'font-semibold text-white' : done ? 'text-white/70' : 'text-white/55',
                )}
              >
                {done && <Check className="h-3 w-3 text-mint-deep" aria-hidden />}
                {STEP_LABEL[step]}
                <span className="sr-only">{done ? ' : fait' : now ? ' : en cours' : ' : à venir'}</span>
              </span>
            </li>
          )
        })}
      </ol>
      {etape >= 0 && (
        <p className="mt-2 text-xs text-white/75 sm:hidden">
          Étape {etape + 1} sur {FLOW.length} :{' '}
          <span className="font-semibold text-white">{STEP_LABEL[FLOW[etape]]}</span>
        </p>
      )}
    </div>
  )
}

/** Une ligne de l'historique : le jour en vignette, le chef, ce qu'il reste à charge. */
function SessionRow({ booking: o }: { booking: Booking }) {
  const d = new Date(o.startsAt)
  const mois = d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
  const jourSemaine = d.toLocaleDateString('fr-FR', { weekday: 'long' })
  const aPayer = o.status === 'pending' && !o.paidCents

  return (
    <Link href={`/espace-client/commandes/${o.id}`} className="row-link group">
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-cream-soft leading-none text-navy"
      >
        <span className="font-display text-base font-bold tabular-nums">{d.getDate()}</span>
        <span className="mt-0.5 text-xs text-ink-soft">{mois}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="cap-first block truncate text-sm font-semibold text-navy">
          {jourSemaine}
          {o.chef?.displayName ? ` avec ${o.chef.displayName.split(' ')[0]}` : ''}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
          <span className={cn('status', bookingStatusTone(o.status))}>
            {aPayer ? 'À régler' : bookingStatusText(o.status)}
          </span>
          <span>{bookingMealNames(o).length} plats</span>
        </span>
      </span>
      <PrixLigne
        apresCredit={euros(o.amountAfterTax)}
        total={euros(o.amountTtc ?? o.priceCents)}
        className="hidden shrink-0 text-sm sm:inline-flex"
      />
      {/* action secondaire : la flèche avance de 2 px */}
      <ArrowRight
        className="h-4 w-4 shrink-0 text-ink-soft transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-navy"
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
        className={cn(
          'shrink-0 font-display text-lg font-bold tabular-nums',
          accent ? 'text-amber-ink' : 'text-navy',
        )}
      >
        {value}
      </dd>
    </div>
  )
}
