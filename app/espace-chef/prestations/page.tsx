'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  ClipboardList,
  Clock,
  FileText,
  History,
  Info,
  Loader2,
  Plus,
  RotateCcw,
  RotateCw,
  Trash2,
  UserRound,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import ChefPage, { Card, Empty } from '@/components/chef/ChefPage'
import DocDialog from '@/components/chef/documents/DocDialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useToast } from '@/components/shared/Toaster'
import { aisleLabel, AISLES, UNITS } from '@/lib/recipe-fields'
import { refLabel, useAllergens, useDiets } from '@/lib/api/referentials'
import { reheatingLine, storageLine } from '@/lib/recipe-fields'
import { countryLabel } from '@/lib/chef/countries'
import {
  bookingPortions,
  bookingStatusText,
  euros,
  hour,
  isBookingOpen,
  longDate,
  shortDate,
  slot,
  useMissionRecipeSheet,
  useMissionShoppingList,
  useMyBookings,
  useRepinMissionRecipes,
  useResetMissionShoppingList,
  useSaveMissionShoppingList,
  type Booking,
  type MissionLine,
} from '@/lib/api/bookings'

/* ─────────────────────────────────────────────────────────────────────────────
   Prestations.

   Trois routes portent cet écran :

   - `GET /bookings/me` — les prestations qui me sont confiées. C'est la même
     route que les commandes du client : l'API sait de quel côté on est ;
   - `GET /chef-missions/{id}/shopping-list` — la liste de courses, calculée
     depuis les recettes et mise à l'échelle des portions commandées, groupée
     par rayon. Elle se corrige (`PUT`), et les corrections **survivent aux
     recalculs** ; `reset` les abandonne ;
   - `GET /chef-missions/{id}/dishes/{dishId}/recipe-sheet` — la fiche d'un
     plat. Une prestation cuisine depuis la version épinglée au moment de la
     réservation : si la recette a changé depuis, la fiche le dit, et `repin`
     bascule la prestation sur la version actuelle.

   Ce que l'API ne sait pas encore : le pointage d'arrivée, la checklist
   d'hygiène, les photos de fin de session, le mandat de débours, l'adresse du
   client et la part nette du batch cooker. Les écrans correspondants étaient
   des maquettes ; ils sont nommés en bas plutôt que simulés.

   Noter aussi : `GET /bookings/me/bookings/{id}` est réservé au client. Le
   batch cooker n'a donc pas de route de détail — on travaille avec la ligne
   de liste, qu'on garde en mémoire.
   ───────────────────────────────────────────────────────────────────────────── */

type Filter = 'all' | 'upcoming' | 'history'

const FILTERS: { id: Filter; label: string; match: (b: Booking) => boolean }[] = [
  { id: 'all', label: 'Tout', match: () => true },
  { id: 'upcoming', label: 'À venir', match: isBookingOpen },
  { id: 'history', label: 'Historique', match: (b) => !isBookingOpen(b) },
]

export default function ChefMissionsPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const query = useMyBookings({ limit: 50 })

  const missions = query.data?.data ?? []
  const ouverte = missions.find((m) => m.id === openId) ?? null

  if (ouverte) {
    return <MissionDetail mission={ouverte} onBack={() => setOpenId(null)} />
  }

  const liste = missions.filter(FILTERS.find((f) => f.id === filter)!.match)

  return (
    <ChefPage title="Prestations" subtitle="Vos sessions à venir, en cours et passées.">
      <div className="space-y-5">
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
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      active
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
                  La réservation n’est pas encore ouverte côté API :{' '}
                  <code>POST /bookings</code> répond 501. Rien ne peut donc
                  arriver ici avant que le backend ne l’ouvre.
                </p>
              </Card>
            ) : liste.length === 0 ? (
              <Card>
                <Empty text="Aucune prestation dans cette catégorie." />
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {liste.map((m) => (
                  <MissionCard key={m.id} mission={m} onOpen={() => setOpenId(m.id)} />
                ))}
              </div>
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
  const plats = (m.bookingMeals ?? []).map((x) => x.meal?.name).filter(Boolean) as string[]
  const ttc = euros(m.priceCents)

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="font-display text-lg font-bold text-navy">
              {m.client?.fullName ?? 'Client'}
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
            {portions > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" aria-hidden /> {portions} portions
              </span>
            )}
            {m.reference && <span className="font-mono">{m.reference}</span>}
          </p>
        </div>
        {ttc && (
          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-wide text-ink-soft">Payé par le client</p>
            <p className="font-display text-xl font-bold text-navy">{ttc}</p>
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

      <div className="mt-4 flex items-center justify-end border-t border-[rgba(31,42,55,0.08)] pt-3">
        <button onClick={onOpen} className="btn btn-outline px-4 py-2 text-xs">
          Ouvrir
        </button>
      </div>
    </Card>
  )
}

// ── Le détail ───────────────────────────────────────────────────────────────

function MissionDetail({ mission: m, onBack }: { mission: Booking; onBack: () => void }) {
  const [fiche, setFiche] = useState<{ dishId: string; nom: string } | null>(null)
  const [courses, setCourses] = useState(false)

  const portions = bookingPortions(m)
  const ttc = euros(m.priceCents)

  return (
    <ChefPage
      title={m.client?.fullName ?? 'Prestation'}
      subtitle={m.reference ? `Prestation n° ${m.reference}` : undefined}
    >
      <div className="space-y-5">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-ink-mid hover:text-navy"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Toutes les prestations
        </button>

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
                {ttc && (
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wide text-ink-soft">
                      Payé par le client
                    </p>
                    <p className="font-display text-2xl font-bold text-navy">{ttc}</p>
                    <p className="text-[11px] text-ink-soft">
                      Votre part n’est pas renvoyée par l’API
                    </p>
                  </div>
                )}
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-[rgba(31,42,55,0.08)] pt-4 sm:grid-cols-2">
                <Info2
                  icon={<Users className="h-4 w-4" />}
                  label="Portions"
                  value={portions > 0 ? `${portions} portions commandées` : 'Non précisé'}
                />
                <Info2
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="Durée"
                  value={
                    m.startsAt && m.endsAt
                      ? `${hour(m.startsAt)} → ${hour(m.endsAt)}`
                      : 'Non précisée'
                  }
                />
                <Info2
                  icon={<UserRound className="h-4 w-4" />}
                  label="Client"
                  value={m.client?.fullName ?? m.client?.email ?? 'Non communiqué'}
                />
                <Info2
                  icon={<Clock className="h-4 w-4" />}
                  label="Référence"
                  value={m.reference ?? '—'}
                />
              </dl>
            </Card>

            {/* ── Les plats ───────────────────────────────────────────── */}
            <Card title="Plats de la prestation">
              {(m.bookingMeals?.length ?? 0) === 0 ? (
                <Empty text="Aucun plat rattaché à cette prestation." />
              ) : (
                <ul className="divide-y divide-[rgba(31,42,55,0.07)]">
                  {m.bookingMeals!.map((bm) => (
                    <li key={bm.mealId} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-navy">
                          {bm.meal?.name ?? 'Plat retiré du catalogue'}
                        </span>
                        <span className="block text-xs text-ink-soft">
                          {bm.portions} portion{bm.portions > 1 ? 's' : ''}
                        </span>
                      </span>
                      <button
                        onClick={() =>
                          setFiche({ dishId: bm.mealId, nom: bm.meal?.name ?? 'ce plat' })
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
          </div>

          {/* ── Colonne latérale ─────────────────────────────────────── */}
          <aside className="space-y-5">
            <Card title="Documents">
              <ul className="space-y-2">
                <DocRow
                  icon={<ClipboardList className="h-4 w-4" />}
                  label="Liste de courses"
                  detail="Calculée depuis vos recettes · modifiable"
                  onClick={() => setCourses(true)}
                />
                {(m.bookingMeals ?? []).map((bm) => (
                  <DocRow
                    key={bm.mealId}
                    icon={<FileText className="h-4 w-4" />}
                    label={`Fiche — ${bm.meal?.name ?? 'plat'}`}
                    detail={`${bm.portions} portions`}
                    onClick={() =>
                      setFiche({ dishId: bm.mealId, nom: bm.meal?.name ?? 'ce plat' })
                    }
                  />
                ))}
              </ul>
            </Card>

            <Card title="Le client">
              <p className="text-[13px] leading-relaxed text-ink-mid">
                Son foyer, ses allergies et ses régimes vous sont donnés dans la
                conversation de la prestation — jamais son adresse postale.
              </p>
              <Link href="/espace-chef/messagerie" className="btn btn-outline mt-3 w-full justify-center text-xs">
                Ouvrir la messagerie
              </Link>
            </Card>

            {/* Ce qui n'existe pas encore, nommé plutôt que simulé. */}
            <Card title="Pas encore disponible">
              <ul className="space-y-1.5 text-[13px] leading-relaxed text-ink-mid">
                {[
                  'Pointer votre arrivée',
                  'La checklist d’hygiène',
                  'Les photos de fin de session',
                  'Le mandat de débours',
                  'L’adresse de la prestation',
                  'Votre part nette et la commission',
                ].map((x) => (
                  <li key={x} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-soft/50" aria-hidden />
                    <span>
                      {x} — <strong className="font-semibold text-navy">N/A</strong>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-[12px] leading-relaxed text-ink-soft">
                Aucune route de l’API ne les porte. Ces écrans existaient en
                maquette : ils reviendront branchés, pas simulés.
              </p>
            </Card>
          </aside>
        </div>
      </div>

      <RecipeSheetDialog
        missionId={m.id}
        dish={fiche}
        reference={m.reference}
        onClose={() => setFiche(null)}
      />

      <DocDialog
        open={courses}
        onOpenChange={(v) => !v && setCourses(false)}
        title="Liste de courses"
        description={
          m.client?.fullName
            ? `${m.client.fullName} · ${portions} portions`
            : `${portions} portions`
        }
      >
        <div className="p-5 sm:p-6">
          <ShoppingEditor missionId={m.id} />
        </div>
      </DocDialog>
    </ChefPage>
  )
}

// ── Liste de courses ────────────────────────────────────────────────────────

function ShoppingCard({
  missionId,
  onOpenFull,
}: {
  missionId: string
  onOpenFull: () => void
}) {
  const query = useMissionShoppingList(missionId)
  const groupes = query.data?.groups ?? []
  const lignes = groupes.reduce((n, g) => n + g.lines.length, 0)
  const corrigees = groupes.reduce((n, g) => n + g.lines.filter((l) => l.edited).length, 0)

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

  // La liste du serveur, aplatie. On n'ouvre le brouillon qu'à la première
  // modification : tant qu'on n'a rien touché, c'est le serveur qui affiche.
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
          — une ligne retirée reste retirée.
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
                    e instanceof Error ? e.message : undefined,
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
  dish,
  reference,
  onClose,
}: {
  missionId: string
  dish: { dishId: string; nom: string } | null
  reference: string | null
  onClose: () => void
}) {
  const toast = useToast()
  const query = useMissionRecipeSheet(missionId, dish?.dishId)
  const repin = useRepinMissionRecipes()
  const diets = useDiets()
  const allergens = useAllergens()
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
                  <p className="text-[13px] text-amber-deep">
                    Non renseignés sur ce plat.
                  </p>
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
                        <span className="text-ink-mid">{s}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </Section>

              {(reheatingLine(f.recipe.reheating) || storageLine(f.recipe.storage)) && (
                <Section titre="Après la session">
                  <ul className="space-y-1 text-[13px] text-ink-mid">
                    {reheatingLine(f.recipe.reheating) && (
                      <li>Réchauffage · {reheatingLine(f.recipe.reheating)}</li>
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
                e instanceof Error ? e.message : 'Une prestation commencée ne bascule plus.',
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
