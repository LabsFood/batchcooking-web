'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Camera,
  Check,
  ClipboardList,
  Clock,
  FileText,
  History,
  Info,
  Loader2,
  MapPin,
  Plus,
  RotateCcw,
  RotateCw,
  Send,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import ChefPage, { Card, Empty } from '@/components/chef/ChefPage'
import ApprovalGate from '@/components/chef/ApprovalGate'
import ProposerPrestation from '@/components/chef/ProposerPrestation'
import DocDialog from '@/components/chef/documents/DocDialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DatePicker from '@/components/shared/DatePicker'
import TimeField, { SlotPicker } from '@/components/shared/TimeField'
import { useToast } from '@/components/shared/Toaster'
import { atTime, dayKey, durationLabel } from '@/lib/time'
import { useOwnSlots } from '@/lib/api/agenda'
import {
  aisleLabel,
  AISLES,
  REHEAT_MODES,
  UNITS,
  reheatingLine,
  storageLine,
} from '@/lib/recipe-fields'
import {
  refLabel,
  useAllergens,
  useDiets,
  useReheatModes,
  useStepTypes,
} from '@/lib/api/referentials'
import { countryLabel } from '@/lib/chef/countries'
import {
  bookingPortions,
  bookingStatusText,
  checkPhoto,
  euros,
  hour,
  isBookingOpen,
  longDate,
  nextTransition,
  photoMessage,
  slot,
  useAddBookingPhoto,
  useAdvanceBooking,
  useAnswerReschedule,
  useChefBooking,
  DISH_NOTES_OPEN,
  useSaveDishNotes,
  useChefBookings,
  useMissionRecipeSheet,
  useMissionShoppingList,
  useProposeReschedule,
  useRemoveBookingPhoto,
  useRepinMissionRecipes,
  useResetMissionShoppingList,
  useSaveMissionShoppingList,
  useSendMissionShoppingList,
  type Booking,
  type BookingStatus,
  type MissionLine,
  type ShoppingListStatus,
} from '@/lib/api/bookings'
import { apiMessage } from '@/lib/api/messages'
import { reasonText } from '@/lib/reason-codes'
import { ApiError } from '@/lib/api/client'
import { InfoPopover } from '@/components/shared/InfoPopover'
import { PaymentInvoiceList } from '@/components/shared/PaymentInvoiceList'
import { AllergyBadge, AllergyConflicts } from '@/components/shared/AllergyStatus'
import { useDishes } from '@/lib/api/chef-catalog'

/* ─────────────────────────────────────────────────────────────────────────────
   Prestations.

   Depuis le 16/10, `/chef/bookings` est la vue du batch cooker — distincte de
   celle du client — et elle porte enfin ce que lui seul doit voir : sa part
   nette, la commission, l'adresse de la session, et ce que le client ne peut
   pas manger.

   Le cycle de vie est à lui :

     confirmed ──> shopping ──> cooking ──> delivered ──> completed
                                  │
                            (arrivedAt)

   `cooking` **est** le pointage d'arrivée : l'API enregistre l'heure, et
   n'accepte la transition qu'à partir de deux heures avant le début. C'est
   elle qui fait foi en cas de litige — raison pour laquelle ce bouton
   n'existait pas tant qu'il n'écrivait nulle part.

   Les outils de la prestation (liste de courses, fiches recettes) sont
   inchangés : ils vivent sur `/chef-missions/{id}/…`.
   ───────────────────────────────────────────────────────────────────────────── */

type Filter = 'all' | 'upcoming' | 'history'

const FILTERS: { id: Filter; label: string; match: (b: Booking) => boolean }[] = [
  { id: 'all', label: 'Tout', match: () => true },
  { id: 'upcoming', label: 'À venir', match: isBookingOpen },
  { id: 'history', label: 'Passées', match: (b) => !isBookingOpen(b) },
]

export default function ChefMissionsPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const query = useChefBookings({ limit: 50 })

  const missions = query.data?.data ?? []

  if (openId) {
    return <MissionDetail id={openId} onBack={() => setOpenId(null)} />
  }

  const liste = missions.filter(FILTERS.find((f) => f.id === filter)!.match)
  const aPointer = missions.filter(
    (m) => m.status === 'confirmed' || m.status === 'shopping',
  ).length

  return (
    <ChefPage title="Prestations" subtitle="Vos sessions à venir, en cours et passées.">
      <div className="space-y-5">
        <ApprovalGate quoi="Vos prestations s’ouvrent" />

        {query.isError ? (
          <Card>
            <p className="flex items-start gap-2 font-display text-lg font-bold text-navy">
              <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-red-700" aria-hidden />
              Vos prestations n’ont pas pu être chargées
            </p>
            <p className="mt-1.5 text-sm text-ink-mid">Rien n’est perdu.</p>
            <button onClick={() => query.refetch()} className="btn btn-primary mt-4 text-xs">
              <RotateCw className="h-3.5 w-3.5" aria-hidden /> Réessayer
            </button>
          </Card>
        ) : (
          <>
            <div className="flex justify-end">
              <ProposerPrestation />
            </div>

            <div
              className="flex flex-wrap gap-2"
              role="tablist"
              aria-label="Filtrer les prestations"
            >
              {FILTERS.map((f) => {
                const n = missions.filter(f.match).length
                const active = filter === f.id
                return (
                  <button
                    key={f.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(f.id)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active
                      ? 'bg-navy text-white'
                      : 'border border-[rgba(31,42,55,0.1)] bg-paper text-ink-mid hover:text-navy'
                      }`}
                  >
                    {f.label}
                    {!query.isPending && (
                      <span className="ml-1.5 tabular-nums opacity-70">({n})</span>
                    )}
                  </button>
                )
              })}
            </div>

            {query.isPending ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-44 animate-pulse rounded-3xl bg-paper" />
                ))}
              </div>
            ) : missions.length === 0 ? (
              <Card>
                <Empty text="Aucune prestation pour l’instant. Elles apparaîtront ici dès qu’un client réservera avec vous." />
                <p className="mt-2 flex items-start gap-2 px-1 text-[12px] leading-relaxed text-ink-soft">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  Pour être réservable, il faut des horaires de travail posés
                  dans votre{' '}
                  <Link href="/espace-chef/agenda" className="font-semibold text-terra">
                    agenda
                  </Link>{' '}
                  — sans eux, aucun créneau n’est proposé aux clients.
                </p>
              </Card>
            ) : liste.length === 0 ? (
              <Card>
                <Empty text="Aucune prestation dans cette catégorie." />
              </Card>
            ) : (
              <>
                {aPointer > 0 && filter !== 'history' && (
                  <p className="flex items-start gap-2 rounded-2xl bg-amber-soft/60 px-4 py-3 text-[13px] leading-relaxed text-[#8B6200]">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {aPointer === 1
                      ? 'Une prestation attend que vous la fassiez avancer : courses, puis arrivée sur place.'
                      : `${aPointer} prestations attendent que vous les fassiez avancer.`}
                  </p>
                )}
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {liste.map((m) => (
                    <MissionCard key={m.id} mission={m} onOpen={() => setOpenId(m.id)} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </ChefPage>
  )
}

// ── La carte d'une prestation ───────────────────────────────────────────────

function MissionCard({ mission: m, onOpen }: { mission: Booking; onOpen: () => void }) {
  const portions = bookingPortions(m)
  const plats = (m.meals ?? []).map((x) => x.name).filter(Boolean) as string[]
  const net = euros(m.netCents)
  const suite = nextTransition(m)

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="font-display text-lg font-bold text-navy">
              {m.client?.name ?? 'Client'}
            </p>
            <span className="rounded-full bg-cream-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-mid">
              {bookingStatusText(m.status)}
            </span>
          </div>
          <p className="text-sm capitalize text-ink-mid">
            {longDate(m.startsAt) ?? 'Date à confirmer'}
            {slot(m) ? ` · ${slot(m)}` : ''}
          </p>
          <p className="mt-1 inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
            {m.city && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden /> {m.city}
              </span>
            )}
            {portions > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" aria-hidden /> {portions} portions
              </span>
            )}
            {m.reference && <span className="font-mono">{m.reference}</span>}
          </p>
        </div>
        {net && (
          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-wide text-ink-soft">
              {m.commissionEstimated ? 'Net estimé' : 'Net perçu'}
            </p>
            <p className="font-display text-xl font-bold text-navy">{net}</p>
          </div>
        )}
      </div>

      {plats.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {plats.map((nom) => (
            <span key={nom} className="rounded-full bg-cream-soft px-2.5 py-1 text-[11px] text-navy">
              {nom}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[rgba(31,42,55,0.08)] pt-3">
        <p className="text-[11px] text-ink-soft">
          {m.reschedule?.status === 'pending'
            ? 'Un report attend une réponse'
            : suite
              ? `Prochaine étape : ${suite.label.toLowerCase()}`
              : ' '}
        </p>
        <button onClick={onOpen} className="btn btn-outline px-4 py-2 text-xs">
          Ouvrir
        </button>
      </div>
    </Card>
  )
}

// ── Le détail ───────────────────────────────────────────────────────────────

function MissionDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const toast = useToast()
  const query = useChefBooking(id)
  const avancer = useAdvanceBooking()
  const proposer = useProposeReschedule('chef')
  const repondre = useAnswerReschedule('chef')
  const diets = useDiets()
  const allergens = useAllergens()

  const [fiche, setFiche] = useState<{ dishId: string; nom: string } | null>(null)
  const [courses, setCourses] = useState(false)
  const [aAvancer, setAAvancer] = useState<ReturnType<typeof nextTransition>>(null)

  if (query.isPending) {
    return (
      <ChefPage title="Prestation">
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-3xl bg-paper" />
          <div className="h-64 animate-pulse rounded-3xl bg-paper" />
        </div>
      </ChefPage>
    )
  }

  if (query.isError || !query.data) {
    return (
      <ChefPage title="Prestation introuvable">
        <Card>
          <p className="text-sm leading-relaxed text-ink-mid">
            Cette prestation n’existe plus, ou elle ne vous est pas confiée.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => query.refetch()} className="btn btn-outline text-xs">
              <RotateCw className="h-3.5 w-3.5" aria-hidden /> Réessayer
            </button>
            <button onClick={onBack} className="btn btn-primary text-xs">
              Toutes les prestations
            </button>
          </div>
        </Card>
      </ChefPage>
    )
  }

  const m = query.data
  const portions = bookingPortions(m)
  const net = euros(m.netCents)
  const commission = euros(m.commissionCents)
  const ttc = euros(m.amountTtc ?? m.priceCents)
  const suite = nextTransition(m)

  /** Un report proposé par le client attend notre réponse. */
  const report =
    m.reschedule?.status === 'pending' && m.reschedule.proposedBy === 'client'
      ? m.reschedule
      : null
  /** Celui qu'on a proposé soi-même, et qui attend le client. */
  const enAttente =
    m.reschedule?.status === 'pending' && m.reschedule.proposedBy === 'chef'
      ? m.reschedule
      : null

  return (
    <ChefPage
      title={m.client?.name ?? 'Prestation'}
      subtitle={m.reference ? `Prestation n° ${m.reference}` : undefined}
    >
      <div className="space-y-5">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-ink-mid hover:text-navy"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Toutes les prestations
        </button>

        {/* ── Un report attend une réponse ──────────────────────────────── */}
        {report && (
          <Card className="!border-amber/40 !bg-amber-soft/50">
            <p className="flex items-start gap-2 font-display text-base font-bold text-navy">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-deep" aria-hidden />
              Le client propose un autre horaire
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-mid">
              Au lieu du {longDate(report.from)} à {hour(report.from)}, il propose le{' '}
              <strong className="font-semibold text-navy">
                {longDate(report.to)} à {hour(report.to)}
              </strong>
              . La durée et le prix ne changent pas.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() =>
                  repondre.mutate(
                    { id: m.id, decision: 'accepted' },
                    {
                      onSuccess: () => toast.success('Nouvel horaire accepté'),
                      onError: () => toast.error('La réponse n’a pas été enregistrée'),
                    },
                  )
                }
                disabled={repondre.isPending}
                className="btn btn-primary text-xs"
              >
                Accepter
              </button>
              <button
                onClick={() =>
                  repondre.mutate(
                    { id: m.id, decision: 'declined' },
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
          </Card>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            {/* ── Les repères ─────────────────────────────────────────── */}
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="rounded-full bg-cream-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-mid">
                    {bookingStatusText(m.status)}
                  </span>
                  <p className="mt-2 font-display text-xl font-bold capitalize text-navy">
                    {longDate(m.startsAt) ?? 'Date à confirmer'}
                  </p>
                  <p className="text-sm text-ink-mid">{slot(m) ?? 'Horaire à confirmer'}</p>
                </div>
                {net && (
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wide text-ink-soft">
                      {m.commissionEstimated ? 'Net estimé' : 'Net perçu'}
                    </p>
                    <p className="font-display text-2xl font-bold text-navy">{net}</p>
                    {ttc && commission && (
                      <p className="text-[11px] text-ink-soft">
                        Client {ttc} · commission {commission}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-[rgba(31,42,55,0.08)] pt-4 sm:grid-cols-2">
                <Info2
                  icon={<MapPin className="h-4 w-4" />}
                  label="Adresse"
                  value={
                    m.addressLine
                      ? `${m.addressLine}${m.city ? `, ${m.city}` : ''}`
                      : (m.city ?? 'Non communiquée')
                  }
                />
                <Info2
                  icon={<Users className="h-4 w-4" />}
                  label="Portions"
                  value={portions > 0 ? `${portions} portions` : 'Non précisé'}
                />
                <Info2
                  icon={<ClipboardList className="h-4 w-4" />}
                  label="Courses"
                  value={
                    m.shoppingByClient
                      ? 'Faites par le client'
                      : m.shoppingFeeCents
                        ? `À votre charge · forfait ${euros(m.shoppingFeeCents)}`
                        : 'À votre charge'
                  }
                />
                <Info2
                  icon={<Clock className="h-4 w-4" />}
                  label="Arrivée"
                  value={
                    m.arrivedAt ? `Pointée à ${hour(m.arrivedAt)}` : 'Pas encore pointée'
                  }
                />
              </dl>

              {m.commissionEstimated && net && (
                <p className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-ink-soft">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  Ce net est une estimation tant que la prestation n’est pas
                  entièrement payée : la commission se fixe au paiement.
                </p>
              )}
            </Card>

            {/* ── Consignes et allergies ─────────────────────────────── */}
            {(m.notes ||
              m.allergyCheck ||
              (m.allergies?.length ?? 0) > 0 ||
              (m.diets?.length ?? 0) > 0) && (
                <Card title="Ce qu’il faut savoir">
                  {m.allergyCheck && (
                    <p className="mb-3">
                      <AllergyBadge check={m.allergyCheck} reasons={m.allergyCheckReasons} />
                    </p>
                  )}
                  {m.notes ? (
                    <p className="rounded-xl bg-cream-soft px-4 py-3 text-sm leading-relaxed text-ink">
                      {m.notes}
                    </p>
                  ) : (
                    <p className="text-sm text-ink-soft">Aucune consigne particulière.</p>
                  )}
                  {((m.allergies?.length ?? 0) > 0 || (m.diets?.length ?? 0) > 0) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(m.allergies ?? []).map((a) => (
                        <span
                          key={a}
                          className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-[12px] font-semibold text-red-700"
                        >
                          <AlertTriangle className="h-3 w-3" aria-hidden />
                          {refLabel(allergens, a)}
                        </span>
                      ))}
                      {(m.diets ?? []).map((d) => (
                        <span
                          key={d}
                          className="rounded-full bg-mint/50 px-3 py-1 text-[12px] text-mint-ink"
                        >
                          {refLabel(diets, d)}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-2.5 text-[12px] leading-relaxed text-ink-soft">
                    Lues au moment où vous ouvrez cette fiche : le client peut les
                    changer dans son profil.
                  </p>
                </Card>
              )}

            {(m.allergyConflicts?.length ?? 0) > 0 && <ChefConflicts booking={m} />}

            {/* ── Les plats ───────────────────────────────────────────── */}
            <Card title="Plats de la prestation">
              {(m.meals?.length ?? 0) === 0 ? (
                <Empty text="Aucun plat rattaché à cette prestation." />
              ) : (
                <ul className="divide-y divide-[rgba(31,42,55,0.07)]">
                  {m.meals!.map((bm) => (
                    <li key={bm.mealId} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-navy">
                          {bm.name ?? 'Plat retiré du catalogue'}
                        </span>
                        <span className="block text-xs text-ink-soft">
                          {bm.portions} portion{bm.portions > 1 ? 's' : ''}
                          {bm.recipeVersion != null && ` · recette v${bm.recipeVersion}`}
                        </span>
                      </span>
                      <button
                        onClick={() =>
                          setFiche({ dishId: bm.mealId, nom: bm.name ?? 'ce plat' })
                        }
                        className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-amber-deep hover:bg-amber-soft/40"
                      >
                        Fiche recette
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* ── La liste de courses ─────────────────────────────────── */}
            <ShoppingCard missionId={m.id} onOpenFull={() => setCourses(true)} />

            {/* ── Les photos ─────────────────────────────────────────── */}
            {(m.status === 'cooking' ||
              m.status === 'delivered' ||
              m.status === 'completed' ||
              (m.photos?.length ?? 0) > 0) && <PhotosCard booking={m} />}
          </div>

          {/* ── Colonne latérale ─────────────────────────────────────── */}
          <aside className="space-y-5">
            {/* L'étape suivante, un seul geste à la fois. */}
            {suite && (
              <Card>
                <p className="text-sm font-semibold text-navy">Faire avancer</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-mid">{suite.hint}</p>
                <button
                  onClick={() => setAAvancer(suite)}
                  disabled={avancer.isPending}
                  className="btn btn-primary mt-3 w-full justify-center text-sm"
                >
                  {avancer.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  )}
                  {suite.label}
                </button>
              </Card>
            )}

            <Card title="Documents">
              <ul className="space-y-2">
                <DocRow
                  icon={<ClipboardList className="h-4 w-4" />}
                  label="Liste de courses"
                  detail="Calculée depuis vos recettes · modifiable"
                  onClick={() => setCourses(true)}
                />
                {(m.meals ?? []).map((bm) => (
                  <DocRow
                    key={bm.mealId}
                    icon={<FileText className="h-4 w-4" />}
                    label={`Fiche — ${bm.name ?? 'plat'}`}
                    detail={`${bm.portions} portions`}
                    onClick={() => setFiche({ dishId: bm.mealId, nom: bm.name ?? 'ce plat' })}
                  />
                ))}
              </ul>
              <div className="mt-3 empty:hidden">
                <PaymentInvoiceList side="chef" bookingId={m.id} heading="Factures" />
              </div>
            </Card>

            {/* Déplacer la prestation */}
            {(m.status === 'confirmed' || m.status === 'shopping') && !report && (
              <RescheduleCard booking={m} enAttente={enAttente} />
            )}

            <Card title="Le client">
              <p className="flex items-center gap-2 text-sm font-semibold text-navy">
                <UserRound className="h-4 w-4 text-amber-deep" aria-hidden />
                {m.client?.name ?? 'Client'}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-mid">
                Son foyer et ses préférences vous sont donnés dans la conversation
                de la prestation — jamais son numéro avant les 48 h qui précèdent.
              </p>
              <Link
                href="/espace-chef/messagerie"
                className="btn btn-outline mt-3 w-full justify-center text-xs"
              >
                Ouvrir la messagerie
              </Link>
            </Card>

            {/* Ce qui n'existe toujours pas. */}
            <Card title="Pas encore disponible">
              <ul className="space-y-1.5 text-[13px] leading-relaxed text-ink-mid">
                {['La checklist d’hygiène', 'Le mandat de débours et vos justificatifs'].map(
                  (x) => (
                    <li key={x} className="flex items-start gap-2">
                      <span
                        aria-hidden
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-soft/50"
                      />
                      <span>
                        {x} — <strong className="font-semibold text-navy">N/A</strong>
                      </span>
                    </li>
                  ),
                )}
              </ul>
              <p className="mt-2.5 text-[12px] leading-relaxed text-ink-soft">
                Les deux attendent un cadrage, pas du code : le contenu de la
                checklist, et les conséquences juridiques du mandat.
              </p>
            </Card>
          </aside>
        </div>
      </div>

      <RecipeSheetDialog
        missionId={m.id}
        status={m.status}
        dish={fiche}
        reference={m.reference}
        onClose={() => setFiche(null)}
      />

      <DocDialog
        open={courses}
        onOpenChange={(v) => !v && setCourses(false)}
        title="Liste de courses"
        description={
          m.client?.name ? `${m.client.name} · ${portions} portions` : `${portions} portions`
        }
      >
        <div className="p-5 sm:p-6">
          <ShoppingEditor missionId={m.id} />
        </div>
      </DocDialog>

      <ConfirmDialog
        open={aAvancer !== null}
        onClose={() => setAAvancer(null)}
        onConfirm={() =>
          aAvancer &&
          avancer.mutate(
            { id: m.id, status: aAvancer.status },
            {
              onSuccess: (b) => {
                setAAvancer(null)
                toast.success(
                  aAvancer.status === 'cooking'
                    ? `Arrivée pointée à ${hour(b.arrivedAt) ?? 'maintenant'}`
                    : `Prestation passée en « ${bookingStatusText(b.status).toLowerCase()} »`,
                )
              },
              onError: (e) =>
                toast.error(
                  'La prestation n’a pas avancé',
                  apiMessage(e),
                ),
            },
          )
        }
        pending={avancer.isPending}
        title={aAvancer ? `${aAvancer.label} ?` : ''}
        lead={
          aAvancer?.status === 'cooking'
            ? 'L’heure est enregistrée par l’API et fait foi en cas de litige. Elle n’est pas modifiable ensuite.'
            : (aAvancer?.hint ?? '')
        }
        detail={
          aAvancer?.status === 'cooking'
            ? 'Possible à partir de deux heures avant le début de la session.'
            : undefined
        }
        confirmLabel={aAvancer?.label ?? 'Continuer'}
      />
    </ChefPage>
  )
}

// ── Déplacer la session ─────────────────────────────────────────────────────

/**
 * Proposer un autre horaire au client.
 *
 * Avant, c'était un `datetime-local` : le batch cooker tapait une date, et
 * découvrait le refus de l'API après l'envoi — journée fermée, créneau déjà
 * pris, moins de 48 h. Ici il choisit dans **ses propres créneaux libres**
 * (`GET /chef/availability/slots`, la même route que voit un client), pour la
 * durée exacte de la prestation. Un horaire qu'on ne peut pas tenir ne
 * s'affiche plus.
 *
 * L'API garde le dernier mot : le délai de 48 h et la disponibilité sont
 * revérifiés à l'envoi, et son message est montré tel quel.
 */
function RescheduleCard({
  booking: m,
  enAttente,
}: {
  booking: Booking
  enAttente: NonNullable<Booking['reschedule']> | null
}) {
  const toast = useToast()
  const proposer = useProposeReschedule('chef')
  const repondre = useAnswerReschedule('chef')

  const [jour, setJour] = useState<Date | null>(null)
  const [choisi, setChoisi] = useState<string | null>(null)
  /** Repli quand l'API ne propose rien : l'heure se tape, à vos risques. */
  const [heure, setHeure] = useState('09:00')
  const [manuel, setManuel] = useState(false)

  /* La durée de la prestation, pas une durée au hasard : c'est elle qui
     décide quels créneaux sont assez longs. */
  const duree =
    m.endsAt && m.startsAt
      ? Math.max(
        30,
        Math.round(
          (new Date(m.endsAt).getTime() - new Date(m.startsAt).getTime()) / 60_000,
        ),
      )
      : 180

  const slots = useOwnSlots(
    jour ? dayKey(jour) : undefined,
    jour ? dayKey(new Date(jour.getTime() + 86_400_000)) : undefined,
    duree,
  )

  /* L'API refuse tout mouvement à moins de 48 h : autant ne pas proposer ces
     journées. Le lendemain d'aujourd'hui + 2 jours, pour rester du bon côté. */
  const plancher = new Date()
  plancher.setHours(0, 0, 0, 0)
  plancher.setDate(plancher.getDate() + 2)

  const libres = slots.data?.slots ?? []
  const sansHoraire = slots.data?.scheduled === false
  const horaire = manuel && jour ? atTime(jour, heure).toISOString() : choisi

  if (enAttente) {
    return (
      <Card title="Déplacer la session">
        <p className="text-[13px] leading-relaxed text-ink-mid">
          Vous avez proposé le{' '}
          <strong className="font-semibold text-navy">
            {longDate(enAttente.to)} à {hour(enAttente.to)}
          </strong>
          . Le client n’a pas encore répondu.
        </p>
        <button
          onClick={() =>
            repondre.mutate(
              { id: m.id, decision: 'withdrawn' },
              {
                onSuccess: () => toast.info('Proposition retirée'),
                onError: () => toast.error('Le retrait a échoué'),
              },
            )
          }
          disabled={repondre.isPending}
          className="btn btn-outline mt-3 w-full justify-center text-xs"
        >
          Retirer ma proposition
        </button>
      </Card>
    )
  }

  return (
    <Card title="Déplacer la session">
      <p className="text-[13px] leading-relaxed text-ink-mid">
        Vous proposez, le client confirme. Rien ne bouge dans les 48 dernières
        heures — ni l’horaire actuel, ni le nouveau.
      </p>

      <DatePicker
        mode="single"
        selected={jour ?? undefined}
        onSelect={(d) => {
          setJour(d ?? null)
          setChoisi(null)
          setManuel(false)
        }}
        disabled={{ before: plancher }}
        startMonth={plancher}
        className="mx-auto mt-3 w-fit"
      />

      {jour && (
        <div className="mt-3 border-t border-[rgba(31,42,55,0.07)] pt-3">
          <p className="text-[12px] text-ink-soft">
            Créneaux libres de {durationLabel(duree)} le{' '}
            {jour.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
          </p>

          <div className="mt-2">
            {slots.isPending ? (
              <div className="h-8 animate-pulse rounded-full bg-cream-soft" />
            ) : manuel ? (
              <TimeField
                id="report-heure"
                label="Heure proposée"
                value={heure}
                onChange={setHeure}
                className="w-32"
              />
            ) : (
              <SlotPicker
                slots={libres}
                value={choisi}
                onSelect={setChoisi}
                empty={
                  sansHoraire
                    ? 'Vous n’avez aucun horaire déclaré : l’API ne propose rien.'
                    : 'Aucun créneau de cette durée ce jour-là.'
                }
              />
            )}
          </div>

          <button
            onClick={() => {
              setManuel(!manuel)
              setChoisi(null)
            }}
            className="mt-2 text-[12px] font-semibold text-terra hover:underline"
          >
            {manuel
              ? 'Revenir à mes créneaux libres'
              : 'Proposer une autre heure quand même'}
          </button>
        </div>
      )}

      <button
        onClick={() =>
          horaire &&
          proposer.mutate(
            { id: m.id, startsAt: horaire },
            {
              onSuccess: () => {
                setJour(null)
                setChoisi(null)
                setManuel(false)
                toast.success('Proposition envoyée', 'Le client a 48 h pour répondre.')
              },
              onError: (e) =>
                toast.error(
                  'La proposition a été refusée',
                  apiMessage(e),
                ),
            },
          )
        }
        disabled={!horaire || proposer.isPending}
        className="btn btn-outline mt-3 w-full justify-center text-xs disabled:opacity-55"
      >
        {proposer.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
        {horaire
          ? `Proposer le ${new Date(horaire).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
          })} à ${hour(horaire)}`
          : 'Choisissez une date et un créneau'}
      </button>
    </Card>
  )
}

// ── Les photos de la session ────────────────────────────────────────────────

/**
 * Plats dressés, contenants étiquetés, cuisine rendue.
 *
 * Même trio que partout ailleurs, et 5 Mo au plus — moitié moins que les
 * pièces jointes de messagerie. Elles accompagnent le compte rendu du client.
 */
function PhotosCard({ booking: m }: { booking: Booking }) {
  const toast = useToast()
  const ajouter = useAddBookingPhoto()
  const retirer = useRemoveBookingPhoto()
  const champ = useRef<HTMLInputElement>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [aRetirer, setARetirer] = useState<string | null>(null)

  const photos = m.photos ?? []

  function choisir(files: FileList | null) {
    setErreur(null)
    const file = files?.[0]
    if (!file) return
    const probleme = checkPhoto(file)
    if (probleme) {
      setErreur(probleme)
      return
    }
    ajouter.mutate(
      { id: m.id, file },
      {
        onSuccess: () => {
          if (champ.current) champ.current.value = ''
          toast.success('Photo ajoutée')
        },
        onError: (e) => setErreur(photoMessage(e)),
      },
    )
  }

  return (
    <Card
      title="Photos de la prestation"
      action={
        <button
          onClick={() => champ.current?.click()}
          disabled={ajouter.isPending}
          className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-navy px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy hover:text-white disabled:opacity-55"
        >
          {ajouter.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Camera className="h-3.5 w-3.5" aria-hidden />
          )}
          Ajouter
        </button>
      }
    >
      <input
        ref={champ}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => choisir(e.target.files)}
      />
      <p className="mb-3 text-[13px] leading-relaxed text-ink-mid">
        Plats dressés, contenants étiquetés, cuisine rendue : elles accompagnent
        le compte rendu du client. JPG, PNG ou WebP, 5 Mo au plus.
      </p>

      {erreur && (
        <p role="alert" className="mb-3 text-[13px] text-red-700">
          {erreur}
        </p>
      )}

      {photos.length === 0 ? (
        <button
          onClick={() => champ.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl border-[1.5px] border-dashed border-[rgba(31,42,55,0.2)] px-4 py-8 text-center transition-colors hover:border-amber hover:bg-amber-soft/20"
        >
          <Camera className="h-5 w-5 text-ink-soft" aria-hidden />
          <span className="text-sm font-semibold text-navy">
            Ajouter vos premières photos
          </span>
        </button>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p) => (
            <li key={p.id} className="group relative overflow-hidden rounded-xl bg-cream-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.caption ?? ''}
                className="aspect-[4/3] w-full object-cover"
              />
              <button
                onClick={() => setARetirer(p.id)}
                aria-label={`Retirer ${p.caption ?? 'la photo'}`}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-navy/75 text-white opacity-0 transition-opacity hover:bg-navy focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={aRetirer !== null}
        onClose={() => setARetirer(null)}
        onConfirm={() =>
          aRetirer &&
          retirer.mutate(
            { id: m.id, photoId: aRetirer },
            {
              onSuccess: () => {
                setARetirer(null)
                toast.success('Photo retirée')
              },
              onError: () => toast.error('La photo n’a pas été retirée'),
            },
          )
        }
        pending={retirer.isPending}
        tone="danger"
        title="Retirer cette photo ?"
        lead="Elle disparaît du compte rendu que le client consulte."
        detail="C’est définitif : il faudra la renvoyer pour la retrouver."
        confirmLabel="Retirer la photo"
      />
    </Card>
  )
}

// ── Liste de courses ────────────────────────────────────────────────────────

/** Où en est l'échange avec le client (Recettes §10.7), vu du batch cooker. */
const ETAT_LISTE: Record<ShoppingListStatus, string> = {
  preparing: 'Pas encore envoyée au client',
  sent: 'Envoyée, en attente de la réponse du client',
  update_sent: 'Mise à jour envoyée, en attente de la réponse du client',
  final_received: 'Liste finale reçue du client',
  frozen: 'Figée : achetez ce qu’elle contient',
}

function ShoppingCard({
  missionId,
  onOpenFull,
}: {
  missionId: string
  onOpenFull: () => void
}) {
  const toast = useToast()
  const query = useMissionShoppingList(missionId)
  const envoyer = useSendMissionShoppingList()
  const groupes = query.data?.groups ?? []
  const lignes = groupes.reduce((n, g) => n + g.lines.length, 0)
  const corrigees = groupes.reduce((n, g) => n + g.lines.filter((l) => l.edited).length, 0)
  const liste = query.data
  const status = liste?.status ?? 'preparing'
  // L'API ne rend la réponse du client que si elle porte sur la dernière liste envoyée.
  const toutes = groupes.flatMap((g) => g.lines)
  const dejaLa = toutes.filter((l) => l.alreadyHave)
  const commentees = toutes.filter((l) => l.comment)

  const envoi = () =>
    envoyer.mutate(missionId, {
      onSuccess: () =>
        toast.success('Liste envoyée', 'Le client est prévenu dans l’application.'),
      onError: (e) =>
        toast.error(
          'La liste n’a pas été envoyée',
          reasonText(e instanceof ApiError ? e.body : null) ?? apiMessage(e),
        ),
    })

  return (
    <Card
      title="Liste de courses"
      action={
        <button onClick={onOpenFull} className="btn btn-outline px-3 py-1.5 text-xs">
          Ouvrir et corriger
        </button>
      }
    >
      {query.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded-xl bg-cream-soft" />
          ))}
        </div>
      ) : query.isError ? (
        <p className="text-[13px] leading-relaxed text-ink-mid">
          La liste n’a pas pu être lue. Elle se calcule depuis les recettes de la
          prestation : si aucun de ses plats n’a de recette, il n’y a rien à
          calculer.
        </p>
      ) : lignes === 0 ? (
        <Empty text="Aucune ligne : les plats de cette prestation n’ont pas de recette renseignée." />
      ) : (
        <>
          <p className="mb-3 text-[13px] text-ink-mid">
            {lignes} ligne{lignes > 1 ? 's' : ''} sur {groupes.length} rayon
            {groupes.length > 1 ? 's' : ''}
            {corrigees > 0 && ` · ${corrigees} corrigée${corrigees > 1 ? 's' : ''} par vous`}
          </p>

          {liste?.shoppingByClient ? (
            <p className="mb-3 text-[12px] leading-relaxed text-ink-soft">
              Le client fait les courses lui-même : la liste ne lui est pas envoyée.
            </p>
          ) : (
            <div className="mb-3 rounded-xl bg-cream-soft px-3 py-2.5">
              <p className="flex flex-wrap items-center gap-1 text-[13px] font-semibold text-navy">
                {ETAT_LISTE[status]}
                <InfoPopover label="Comment marche l’envoi de la liste ?">
                  Le client coche ce qu’il a déjà, commente une ligne et vous renvoie sa
                  liste finale, autant de fois qu’il veut jusqu’à midi la veille. Ensuite
                  elle est figée : achetez ce qu’elle contient. S’il n’a rien renvoyé,
                  achetez toute la liste. Vos corrections n’arrivent chez lui qu’avec
                  « Envoyer la mise à jour ».
                </InfoPopover>
              </p>
              {liste?.deadline && (
                <p className="mt-0.5 text-[12px] text-ink-soft">
                  Date limite : {longDate(liste.deadline)} à {hour(liste.deadline)}
                </p>
              )}
              {status !== 'frozen' && (
                <button
                  type="button"
                  onClick={envoi}
                  disabled={envoyer.isPending}
                  className="btn btn-primary mt-2.5 px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  {envoyer.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Send className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {(liste?.version ?? 0) > 0 ? 'Envoyer la mise à jour' : 'Envoyer la liste au client'}
                </button>
              )}
            </div>
          )}

          {(dejaLa.length > 0 || commentees.length > 0) && (
            <div className="mb-3 space-y-2 text-[12px] leading-relaxed">
              {dejaLa.length > 0 && (
                <p className="text-ink-mid">
                  <span className="font-semibold text-navy">Déjà chez le client, à ne pas acheter :</span>{' '}
                  {dejaLa.map((l) => l.name).join(', ')}
                </p>
              )}
              {commentees.length > 0 && (
                <ul className="space-y-1">
                  {commentees.map((l) => (
                    <li key={`${l.name}|${l.unit}`} className="text-ink-mid">
                      <span className="font-semibold text-navy">{l.name}</span> : « {l.comment} »
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <ul className="flex flex-wrap gap-1.5">
            {groupes.map((g) => (
              <li
                key={g.aisle}
                className="rounded-full bg-cream-soft px-2.5 py-1 text-[11px] text-navy"
              >
                {aisleLabel(g.aisle)}
                <span className="ml-1.5 tabular-nums text-ink-soft">{g.lines.length}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}

/**
 * La liste, telle qu'on la veut.
 *
 * `PUT` envoie **la liste entière** : ce qui diffère des recettes est gardé
 * comme correction et survit aux recalculs, une ligne calculée qu'on retire
 * est barrée. On édite donc une copie locale, et on l'envoie d'un bloc.
 */
function ShoppingEditor({ missionId }: { missionId: string }) {
  const toast = useToast()
  const query = useMissionShoppingList(missionId)
  const save = useSaveMissionShoppingList()
  const reset = useResetMissionShoppingList()

  type Row = MissionLine & { aisle: string }
  const [brouillon, setBrouillon] = useState<Row[] | null>(null)
  const [aRemettre, setARemettre] = useState(false)

  const serveur: Row[] = (query.data?.groups ?? []).flatMap((g) =>
    g.lines.map((l) => ({ ...l, aisle: g.aisle })),
  )
  const lignes = brouillon ?? serveur
  const modifie = brouillon !== null

  const changer = (i: number, patch: Partial<Row>) =>
    setBrouillon(lignes.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  if (query.isPending) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-xl bg-cream-soft" />
        ))}
      </div>
    )
  }

  if (query.isError) {
    return (
      <p className="text-sm leading-relaxed text-ink-mid">
        La liste n’a pas pu être lue. Elle se calcule depuis les recettes de la
        prestation.
      </p>
    )
  }

  const valides = lignes.filter(
    (l) => l.name.trim() && Number.isFinite(l.qty) && l.unit.trim() && l.aisle.trim(),
  )
  const incompletes = lignes.length - valides.length

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-prose text-[13px] leading-relaxed text-ink-mid">
          Calculée depuis les recettes de la prestation, mise à l’échelle des
          portions commandées.{' '}
          <strong className="font-semibold text-navy">
            Vos corrections survivent aux recalculs
          </strong>{' '}
          — une ligne retirée reste retirée. Si la liste est déjà envoyée, le client
          ne voit vos corrections qu’après « Envoyer la mise à jour ».
        </p>
        {query.data?.persons != null && (
          <span className="shrink-0 rounded-full bg-cream-soft px-2.5 py-1 text-[11px] font-semibold text-ink-mid">
            {query.data.persons} personnes
          </span>
        )}
      </div>

      {lignes.length === 0 ? (
        <Empty text="Aucune ligne. Les plats de cette prestation n’ont pas de recette renseignée." />
      ) : (
        <ul className="space-y-2">
          {lignes.map((l, i) => (
            <li
              key={`${l.name}-${i}`}
              className="flex flex-wrap items-center gap-2 rounded-xl bg-cream-soft p-2"
            >
              <input
                value={l.name}
                onChange={(e) => changer(i, { name: e.target.value })}
                aria-label={`Ingrédient ${i + 1}`}
                className="input-base min-w-32 flex-1 py-2"
              />
              <input
                type="number"
                step="any"
                min={0}
                value={Number.isFinite(l.qty) ? l.qty : ''}
                onChange={(e) => changer(i, { qty: Number(e.target.value) })}
                aria-label={`Quantité de ${l.name || 'la ligne'}`}
                className="input-base w-20 shrink-0 py-2"
              />
              <select
                value={l.unit}
                onChange={(e) => changer(i, { unit: e.target.value })}
                aria-label={`Unité de ${l.name || 'la ligne'}`}
                className="input-base w-24 shrink-0 py-2"
              >
                <option value="">Unité</option>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <select
                value={l.aisle}
                onChange={(e) => changer(i, { aisle: e.target.value })}
                aria-label={`Rayon de ${l.name || 'la ligne'}`}
                className="input-base w-36 shrink-0 py-2"
              >
                <option value="">Rayon</option>
                {AISLES.map((a) => (
                  <option key={a} value={a}>
                    {aisleLabel(a)}
                  </option>
                ))}
              </select>
              {l.edited && !modifie && (
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-amber-deep">
                  corrigée
                </span>
              )}
              <button
                type="button"
                onClick={() => setBrouillon(lignes.filter((_, j) => j !== i))}
                aria-label={`Retirer ${l.name || 'cette ligne'}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() =>
          setBrouillon([...lignes, { name: '', qty: 1, unit: 'g', aisle: AISLES[0] }])
        }
        className="btn btn-outline mt-3 text-xs"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden /> Ajouter une ligne
      </button>

      {incompletes > 0 && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-soft/60 px-3.5 py-2.5 text-[12px] leading-relaxed text-[#8B6200]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {incompletes === 1
            ? 'Une ligne est incomplète : elle ne sera pas envoyée. Il faut un nom, une quantité, une unité et un rayon.'
            : `${incompletes} lignes sont incomplètes : elles ne seront pas envoyées.`}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[rgba(31,42,55,0.08)] pt-4">
        <button
          type="button"
          disabled={!modifie || save.isPending || valides.length === 0}
          onClick={() =>
            save.mutate(
              { id: missionId, lines: valides as Required<Row>[] },
              {
                onSuccess: () => {
                  setBrouillon(null)
                  toast.success('Liste de courses enregistrée')
                },
                onError: (e) =>
                  toast.error(
                    'La liste n’a pas été enregistrée',
                    apiMessage(e),
                  ),
              },
            )
          }
          className="btn btn-primary text-xs disabled:opacity-55"
        >
          {save.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="h-3.5 w-3.5" aria-hidden />
          )}
          Enregistrer mes corrections
        </button>

        {modifie && (
          <button
            type="button"
            onClick={() => setBrouillon(null)}
            className="btn btn-outline text-xs"
          >
            Annuler mes changements
          </button>
        )}

        <button
          type="button"
          onClick={() => setARemettre(true)}
          disabled={reset.isPending}
          className="btn ml-auto text-xs text-ink-mid hover:text-navy"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Revenir à la liste calculée
        </button>
      </div>

      <ConfirmDialog
        open={aRemettre}
        onClose={() => setARemettre(false)}
        onConfirm={() =>
          reset.mutate(missionId, {
            onSuccess: () => {
              setARemettre(false)
              setBrouillon(null)
              toast.success('Liste remise à son calcul')
            },
            onError: () => toast.error('La remise à zéro a échoué'),
          })
        }
        pending={reset.isPending}
        tone="danger"
        title="Abandonner vos corrections ?"
        lead="La liste redevient celle que vos recettes donnent, pour les portions commandées."
        detail="Toutes vos corrections sont perdues : les lignes ajoutées, les quantités changées et celles que vous aviez retirées."
        confirmLabel="Revenir à la liste calculée"
      />
    </div>
  )
}

// ── Fiche recette ───────────────────────────────────────────────────────────

function RecipeSheetDialog({
  missionId,
  status,
  dish,
  reference,
  onClose,
}: {
  missionId: string
  status: BookingStatus
  dish: { dishId: string; nom: string } | null
  reference: string | null
  onClose: () => void
}) {
  const toast = useToast()
  const query = useMissionRecipeSheet(missionId, dish?.dishId)
  const repin = useRepinMissionRecipes()
  const diets = useDiets()
  const allergens = useAllergens()
  const stepTypes = useStepTypes()
  const reheatModes = useReheatModes(REHEAT_MODES)
  const [aBasculer, setABasculer] = useState(false)

  const f = query.data

  return (
    <>
      <DocDialog
        open={dish !== null}
        onOpenChange={(v) => !v && onClose()}
        title={dish ? `Fiche — ${dish.nom}` : 'Fiche recette'}
        description={
          f
            ? `${f.portions} portions${reference ? ` · prestation n° ${reference}` : ''}`
            : undefined
        }
      >
        <div className="p-5 sm:p-6">
          {query.isPending ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-xl bg-cream-soft" />
              ))}
            </div>
          ) : query.isError || !f ? (
            <p className="text-sm leading-relaxed text-ink-mid">
              Cette fiche n’a pas pu être lue. Elle n’existe que pour un plat de
              la prestation dont la recette est renseignée.
            </p>
          ) : (
            <div className="space-y-5">
              <div>
                <h3 className="font-display text-xl font-bold text-navy">{f.dish.name}</h3>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {[countryLabel(f.dish.country), `${f.portions} portions`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>

              {f.version.newerAvailable && (
                <div className="rounded-2xl border border-amber/40 bg-amber-soft/50 p-4">
                  <p className="flex items-start gap-2 text-[13px] font-semibold text-[#8B6200]">
                    <History className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    Cette prestation cuisine la version {f.version.pinned} de votre
                    recette ; vous en êtes à la version {f.version.current}.
                  </p>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-ink-mid">
                    C’est voulu : une prestation ne change pas sous les pieds du
                    client qui l’a réservée. Vous pouvez la basculer sur votre
                    version actuelle, tant qu’elle n’a pas commencé.
                  </p>
                  <button
                    onClick={() => setABasculer(true)}
                    disabled={repin.isPending}
                    className="btn btn-outline mt-3 text-xs"
                  >
                    Basculer sur ma recette actuelle
                  </button>
                </div>
              )}

              {(f.dish.diets.length > 0 || f.dish.customDiets.length > 0) && (
                <Section titre="Régimes">
                  <div className="flex flex-wrap gap-1.5">
                    {f.dish.diets.map((d) => (
                      <span
                        key={d}
                        className="rounded-full bg-mint/50 px-2.5 py-1 text-[12px] text-mint-ink"
                      >
                        {refLabel(diets, d)}
                      </span>
                    ))}
                    {f.dish.customDiets.map((d) => (
                      <span
                        key={d}
                        className="rounded-full bg-mint/40 px-2.5 py-1 text-[12px] italic text-mint-ink"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              <Section titre="Allergènes">
                {f.dish.allergensNone ? (
                  <p className="text-[13px] text-mint-ink">
                    Aucun des 14 allergènes réglementés.
                  </p>
                ) : f.dish.allergens.length === 0 && f.dish.customAllergens.length === 0 ? (
                  <p className="text-[13px] text-amber-deep">Non renseignés sur ce plat.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {f.dish.allergens.map((a) => (
                      <span
                        key={a}
                        className="rounded-full bg-red-50 px-2.5 py-1 text-[12px] text-red-700"
                      >
                        {refLabel(allergens, a)}
                      </span>
                    ))}
                    {f.dish.customAllergens.map((a) => (
                      <span
                        key={a}
                        className="rounded-full bg-red-50 px-2.5 py-1 text-[12px] italic text-red-700"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </Section>

              <Section titre={`Ingrédients pour ${f.portions} portions`}>
                {f.recipe.ingredients.length === 0 ? (
                  <p className="text-[13px] text-ink-soft">Aucun ingrédient.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {f.recipe.ingredients.map((ing, i) => (
                      <li
                        key={`${ing.name}-${i}`}
                        className="flex items-baseline justify-between gap-3 text-[13px]"
                      >
                        <span className="text-navy">{ing.name}</span>
                        <span className="shrink-0 tabular-nums text-ink-mid">
                          {ing.qty.toLocaleString('fr-FR')} {ing.unit}
                          {ing.aisle && (
                            <span className="ml-2 text-ink-soft">{aisleLabel(ing.aisle)}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section titre="Préparation">
                {f.recipe.steps.length === 0 ? (
                  <p className="text-[13px] text-ink-soft">Aucune étape écrite.</p>
                ) : (
                  <ol className="space-y-2">
                    {f.recipe.steps.map((s, i) => (
                      <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed">
                        <span
                          aria-hidden
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-cream-deep text-[10px] font-semibold tabular-nums text-navy"
                        >
                          {i + 1}
                        </span>
                        <span className="text-ink-mid">
                          {(s.type || s.durationMinutes) && (
                            <span className="mr-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                              {[
                                s.type ? refLabel(stepTypes, s.type) : null,
                                s.durationMinutes ? `${s.durationMinutes} min` : null,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          )}
                          {s.text}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </Section>

              {(reheatingLine(f.recipe.reheating, reheatModes) ||
                storageLine(f.recipe.storage)) && (
                  <Section titre="Après la session">
                    <ul className="space-y-1 text-[13px] text-ink-mid">
                      {reheatingLine(f.recipe.reheating, reheatModes) && (
                        <li>Réchauffage · {reheatingLine(f.recipe.reheating, reheatModes)}</li>
                      )}
                      {storageLine(f.recipe.storage) && (
                        <li>Conservation · {storageLine(f.recipe.storage)}</li>
                      )}
                    </ul>
                    {f.recipe.reheating?.note && (
                      <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
                        {f.recipe.reheating.note}
                      </p>
                    )}
                  </Section>
                )}

              {dish && (
                <DishNotesForm
                  // Repart des notes enregistrées quand elles changent.
                  key={`${dish.dishId}:${f.notes?.reheating ?? ''}:${f.notes?.storage ?? ''}`}
                  missionId={missionId}
                  dishId={dish.dishId}
                  status={status}
                  saved={f.notes}
                />
              )}
            </div>
          )}
        </div>
      </DocDialog>

      <ConfirmDialog
        open={aBasculer}
        onClose={() => setABasculer(false)}
        onConfirm={() =>
          repin.mutate(missionId, {
            onSuccess: () => {
              setABasculer(false)
              toast.success(
                'Prestation basculée sur vos recettes actuelles',
                'La liste de courses a été recalculée ; vos corrections sont gardées.',
              )
            },
            onError: (e) =>
              toast.error(
                'La bascule a été refusée',
                apiMessage(e),
              ),
          })
        }
        pending={repin.isPending}
        title="Basculer sur vos recettes actuelles ?"
        lead="Toutes les fiches de cette prestation passeront à la version actuelle de vos recettes, et la liste de courses sera recalculée."
        detail="Vos corrections de liste sont gardées. Le geste est enregistré, et devient impossible une fois la prestation commencée."
        confirmLabel="Basculer"
      />
    </>
  )
}

// ── Notes du plat, pour cette prestation ───────────────────────────────────

const NOTE_MAX = 500

/**
 * Ce que le batch cooker écrit de ce plat tel qu'il l'a cuisiné chez ce
 * client : réchauffage et conservation. Rattaché à la prestation, pas à la
 * recette (retours de test du 09/11) : les consignes de la recette, plus
 * haut, ne bougent pas. Le client les lit dans « Réchauffage & conservation »
 * une fois la prestation terminée.
 */
function DishNotesForm({
  missionId,
  dishId,
  status,
  saved,
}: {
  missionId: string
  dishId: string
  status: BookingStatus
  saved?: { reheating: string | null; storage: string | null }
}) {
  const toast = useToast()
  const save = useSaveDishNotes()
  const [reheating, setReheating] = useState(saved?.reheating ?? '')
  const [storage, setStorage] = useState(saved?.storage ?? '')
  const ouvert = DISH_NOTES_OPEN.includes(status)
  const modifie =
    reheating.trim() !== (saved?.reheating ?? '') || storage.trim() !== (saved?.storage ?? '')

  const champ =
    'w-full rounded-xl border border-[rgba(31,42,55,0.12)] bg-paper px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-soft/80 focus-visible:border-[rgba(31,42,55,0.35)] disabled:bg-cream-soft disabled:text-ink-soft'

  return (
    <div className="rounded-2xl border border-[rgba(31,42,55,0.08)] p-4">
      <p className="flex flex-wrap items-center gap-1 text-[13px] font-semibold text-navy">
        Vos notes pour ce client
        <InfoPopover label="À quoi servent ces notes ?">
          Elles disent comment réchauffer et garder ce plat tel que vous l’avez cuisiné
          pour cette prestation — une cuisson plus courte, un contenant différent. Elles
          s’ajoutent aux consignes de la recette sans les remplacer, et ne valent que pour
          cette prestation. Le client les lit une fois la prestation terminée.
        </InfoPopover>
      </p>
      {!ouvert && (
        <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
          Vous pourrez les écrire dès que vous passez « En cuisine ».
        </p>
      )}
      <form
        className="mt-3 space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate(
            { missionId, dishId, notes: { reheatingNote: reheating, storageNote: storage } },
            {
              onSuccess: () => toast.success('Notes enregistrées', 'Le client les verra sur sa fiche.'),
              onError: (err) => toast.error('Notes non enregistrées', apiMessage(err)),
            },
          )
        }}
      >
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink-mid">Réchauffage</span>
          <textarea
            value={reheating}
            onChange={(e) => setReheating(e.target.value)}
            maxLength={NOTE_MAX}
            rows={2}
            disabled={!ouvert}
            placeholder="Ex. Four à 160 °C, 15 min, couvercle retiré."
            className={champ}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink-mid">Conservation</span>
          <textarea
            value={storage}
            onChange={(e) => setStorage(e.target.value)}
            maxLength={NOTE_MAX}
            rows={2}
            disabled={!ouvert}
            placeholder="Ex. Réfrigérateur, 3 jours ; se congèle bien."
            className={champ}
          />
        </label>
        {ouvert && (
          <button
            type="submit"
            disabled={!modifie || save.isPending}
            className="btn btn-outline text-xs disabled:opacity-50"
          >
            {save.isPending ? 'Enregistrement…' : 'Enregistrer les notes'}
          </button>
        )}
      </form>
    </div>
  )
}

// ── Petits blocs ────────────────────────────────────────────────────────────

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        {titre}
      </p>
      {children}
    </div>
  )
}

function Info2({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 shrink-0 text-amber-deep" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] uppercase tracking-wide text-ink-soft">{label}</dt>
        <dd className="text-[13px] font-medium text-navy">{value}</dd>
      </div>
    </div>
  )
}

function DocRow({
  icon,
  label,
  detail,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  detail: string
  onClick: () => void
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-xl border border-[rgba(31,42,55,0.08)] px-3 py-2.5 text-left transition-colors hover:border-[rgba(31,42,55,0.2)] hover:bg-cream-soft"
      >
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cream-soft text-navy"
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-navy">{label}</span>
          <span className="block text-xs text-ink-soft">{detail}</span>
        </span>
      </button>
    </li>
  )
}

/** Les plats de remplacement : mes plats publiés, lus seulement quand il en faut. */
function ChefConflicts({ booking }: { booking: Booking }) {
  const dishes = useDishes()
  const published = (dishes.data ?? []).filter((d) => d.status === 'published')
  return <AllergyConflicts booking={booking} side="chef" candidates={published} />
}
