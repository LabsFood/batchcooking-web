'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Camera,
  CheckCircle2,
  Circle,
  ClipboardList,
  FileText,
  LayoutGrid,
  List,
  MapPin,
  MessageSquare,
  Receipt,
  ShoppingBasket,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import ChefPage, { Card, Empty } from '@/components/chef/ChefPage'
import StatusBadge, { MissionBadge } from '@/components/chef/StatusBadge'
import DocDialog from '@/components/chef/documents/DocDialog'
import RecipeSheet from '@/components/chef/documents/RecipeSheet'
import ShoppingList from '@/components/chef/documents/ShoppingList'
import ExpenseMandate from '@/components/chef/documents/ExpenseMandate'
import {
  CHEF_MISSIONS,
  CHEF_PROFILE,
  HYGIENE_CHECKLIST,
  clientById,
  dishById,
  type ChefMission,
  type MissionPhoto,
} from '@/lib/chef/mock'
import type { MissionStatus } from '@/lib/chef/states'

/* ─────────────────────────────────────────────────────────────────────────────
   Prestations.

   Une prestation se lit d'abord sur place : qui, où, quels plats, quelles
   consignes, quels documents. Le batch cooker pointe son arrivée (horodatage
   qui fait foi en cas de litige), travaille avec la checklist, puis ajoute ses
   photos une fois la session terminée.
   ───────────────────────────────────────────────────────────────────────────── */

const euros = (n: number) => `${n.toLocaleString('fr-FR')} €`

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

type Filter = 'all' | 'upcoming' | 'current' | 'history'

const FILTERS: { id: Filter; label: string; match: (m: ChefMission) => boolean }[] = [
  { id: 'all', label: 'Tout', match: () => true },
  { id: 'upcoming', label: 'À venir', match: (m) => m.status === 'upcoming' || m.status === 'confirmed' },
  { id: 'current', label: 'En cours', match: (m) => m.status === 'in-progress' },
  { id: 'history', label: 'Historique', match: (m) => ['done', 'cancelled', 'disputed'].includes(m.status) },
]

export default function ChefMissionsPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const [view, setView] = useState<'cards' | 'list'>('cards')
  const [openId, setOpenId] = useState<string | null>(null)
  // Les changements d'état restent locaux tant que l'API n'est pas branchée.
  const [statuses, setStatuses] = useState<Record<string, MissionStatus>>({})
  const [arrivals, setArrivals] = useState<Record<string, string>>({})
  const [photos, setPhotos] = useState<Record<string, MissionPhoto[]>>({})

  const missions = CHEF_MISSIONS.map((m) => ({
    ...m,
    status: statuses[m.id] ?? m.status,
    arrivedAt: arrivals[m.id] ?? m.arrivedAt,
    photos: photos[m.id] ?? m.photos,
  }))

  const open = missions.find((m) => m.id === openId) ?? null

  if (open) {
    return (
      <MissionDetail
        mission={open}
        onBack={() => setOpenId(null)}
        onArrive={() => {
          setArrivals((p) => ({ ...p, [open.id]: new Date().toISOString() }))
          setStatuses((p) => ({ ...p, [open.id]: 'in-progress' }))
        }}
        onComplete={() => setStatuses((p) => ({ ...p, [open.id]: 'done' }))}
        onPhotos={(next) => setPhotos((p) => ({ ...p, [open.id]: next }))}
      />
    )
  }

  const list = missions.filter(FILTERS.find((f) => f.id === filter)!.match)

  return (
    <ChefPage title="Prestations" subtitle="Vos sessions à venir, en cours et passées.">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrer les prestations">
            {FILTERS.map((f) => {
              const count = missions.filter(f.match).length
              const active = filter === f.id
              return (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    active ? 'bg-navy text-white' : 'border border-[rgba(31,42,55,0.1)] bg-paper text-ink-mid hover:text-navy'
                  }`}
                >
                  {f.label} <span className="tabular-nums opacity-70">({count})</span>
                </button>
              )
            })}
          </div>

          <div className="flex rounded-full border border-[rgba(31,42,55,0.1)] bg-paper p-0.5">
            {([
              { id: 'cards' as const, label: 'Cartes', Icon: LayoutGrid },
              { id: 'list' as const, label: 'Liste', Icon: List },
            ]).map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                aria-pressed={view === v.id}
                title={`Affichage en ${v.label.toLowerCase()}`}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  view === v.id ? 'bg-navy text-white' : 'text-ink-mid hover:text-navy'
                }`}
              >
                <v.Icon className="h-3.5 w-3.5" aria-hidden /> {v.label}
              </button>
            ))}
          </div>
        </div>

        {list.length === 0 ? (
          <Card>
            <Empty text="Aucune prestation dans cette catégorie." />
          </Card>
        ) : view === 'list' ? (
          <MissionTable missions={list} onOpen={setOpenId} />
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {list.map((m) => (
              <MissionCard key={m.id} mission={m} onOpen={() => setOpenId(m.id)} />
            ))}
          </div>
        )}
      </div>
    </ChefPage>
  )
}

// ── Liste ───────────────────────────────────────────────────────────────────

function MissionTable({ missions, onOpen }: { missions: ChefMission[]; onOpen: (id: string) => void }) {
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-[rgba(31,42,55,0.08)] text-left">
              {['Date', 'Client', 'Plats', 'Statut', 'Net'].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {h}
                </th>
              ))}
              <th className="px-4 py-3">
                <span className="sr-only">Ouvrir</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(31,42,55,0.06)]">
            {missions.map((m) => (
              <tr
                key={m.id}
                onClick={() => onOpen(m.id)}
                className="cursor-pointer transition-colors hover:bg-cream-soft"
              >
                <td className="whitespace-nowrap px-4 py-3">
                  <p className="font-semibold tabular-nums text-navy">{shortDate(m.date)}</p>
                  <p className="text-xs text-ink-soft">{m.timeSlot}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-navy">{m.client}</p>
                  <p className="text-xs text-ink-soft">{m.city}</p>
                </td>
                <td className="max-w-[260px] px-4 py-3">
                  <p className="truncate text-ink-mid">{m.meals.join(', ')}</p>
                  <p className="text-xs text-ink-soft">
                    {m.persons} pers. · {m.shoppingByChef ? 'courses incluses' : 'courses client'}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <MissionBadge status={m.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums text-navy">{euros(m.net)}</td>
                <td className="px-4 py-3 text-right">
                  <span className="text-xs font-semibold text-amber-deep">Ouvrir</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function MissionCard({ mission: m, onOpen }: { mission: ChefMission; onOpen: () => void }) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="font-display text-lg font-bold text-navy">{m.client}</p>
            <MissionBadge status={m.status} />
          </div>
          <p className="text-sm capitalize text-ink-mid">
            {longDate(m.date)} · {m.timeSlot}
          </p>
          <p className="mt-1 inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" aria-hidden /> {m.city}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" aria-hidden /> {m.persons} personnes
            </span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] uppercase tracking-wide text-ink-soft">Net perçu</p>
          <p className="font-display text-xl font-bold text-navy">{euros(m.net)}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {m.meals.map((meal) => (
          <span key={meal} className="rounded-full bg-cream-soft px-2.5 py-1 text-[11px] text-navy">
            {meal}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[rgba(31,42,55,0.08)] pt-3">
        <p className="text-[11px] text-ink-soft">
          Prestation n° <span className="font-mono text-ink-mid">{m.reference}</span>
        </p>
        <button onClick={onOpen} className="btn btn-outline px-4 py-2 text-xs">
          Ouvrir
        </button>
      </div>
    </Card>
  )
}

// ── Détail ──────────────────────────────────────────────────────────────────

function MissionDetail({
  mission: m,
  onBack,
  onArrive,
  onComplete,
  onPhotos,
}: {
  mission: ChefMission
  onBack: () => void
  onArrive: () => void
  onComplete: () => void
  onPhotos: (photos: MissionPhoto[]) => void
}) {
  const [doc, setDoc] = useState<{ kind: 'recipe' | 'shopping' | 'mandate'; dishId?: string } | null>(null)
  const [checked, setChecked] = useState<string[]>([])
  const [mandateSignedAt, setMandateSignedAt] = useState<string | undefined>()

  const client = clientById(m.clientId)
  const dishes = m.dishIds.map(dishById).filter((d): d is NonNullable<typeof d> => Boolean(d))
  const allDone = checked.length === HYGIENE_CHECKLIST.length
  const started = Boolean(m.arrivedAt) || m.status === 'in-progress'
  const finished = m.status === 'done' || m.status === 'disputed'

  return (
    <ChefPage title={m.client} subtitle={`Prestation n° ${m.reference}`}>
      <div className="space-y-5">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-ink-mid hover:text-navy"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Toutes les prestations
        </button>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            {/* Repères */}
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <MissionBadge status={m.status} />
                  <p className="mt-2 font-display text-xl font-bold capitalize text-navy">{longDate(m.date)}</p>
                  <p className="text-sm text-ink-mid">{m.timeSlot}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-ink-soft">Net perçu</p>
                  <p className="font-display text-2xl font-bold text-navy">{euros(m.net)}</p>
                  <p className="text-[11px] text-ink-soft">
                    Client {euros(m.amountTTC)} · commission {euros(m.commission)}
                  </p>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-[rgba(31,42,55,0.08)] pt-4 sm:grid-cols-2">
                <Info icon={<MapPin className="h-4 w-4" />} label="Adresse" value={m.address} />
                <Info icon={<Users className="h-4 w-4" />} label="Convives" value={`${m.persons} personnes`} />
                <Info
                  icon={<ShoppingBasket className="h-4 w-4" />}
                  label="Courses"
                  value={
                    m.shoppingByChef
                      ? `À votre charge${m.expenseCap ? ` · plafond ${m.expenseCap} €` : ''}`
                      : 'Faites par le client'
                  }
                />
                <Info
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="Arrivée"
                  value={m.arrivedAt ? `Pointée à ${timeLabel(m.arrivedAt)}` : 'Pas encore pointée'}
                />
              </dl>
            </Card>

            {/* Consignes du client */}
            <Card title="Consignes du client">
              {m.clientNote ? (
                <p className="rounded-xl bg-cream-soft px-4 py-3 text-sm leading-relaxed text-ink">{m.clientNote}</p>
              ) : (
                <Empty text="Aucune consigne particulière." />
              )}
              {(m.allergies.length > 0 || m.diets.length > 0) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.allergies.map((a) => (
                    <StatusBadge key={a} tone="danger">
                      <AlertTriangle className="h-3 w-3" aria-hidden /> {a}
                    </StatusBadge>
                  ))}
                  {m.diets.map((d) => (
                    <StatusBadge key={d} tone="info">
                      {d}
                    </StatusBadge>
                  ))}
                </div>
              )}
            </Card>

            {/* Plats */}
            <Card title="Plats associés">
              <ul className="divide-y divide-[rgba(31,42,55,0.07)]">
                {m.meals.map((meal) => {
                  const dish = dishes.find((d) => d.name === meal)
                  return (
                    <li key={meal} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-navy">{meal}</span>
                        <span className="block text-xs text-ink-soft">
                          {dish
                            ? `${dish.country} · ${dish.portions} portions de base`
                            : 'Plat hors catalogue — pas de fiche recette'}
                        </span>
                      </span>
                      {dish && (
                        <button
                          onClick={() => setDoc({ kind: 'recipe', dishId: dish.id })}
                          className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-amber-deep hover:bg-amber-soft/40"
                        >
                          Fiche recette
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </Card>

            {/* Checklist */}
            {started && !finished && (
              <Card
                title="Checklist hygiène"
                action={
                  <StatusBadge tone={allDone ? 'success' : 'warning'}>
                    {checked.length}/{HYGIENE_CHECKLIST.length}
                  </StatusBadge>
                }
              >
                <p className="mb-3 text-[13px] text-ink-soft">
                  Contenu provisoire : cette checklist doit être revue avec Lab&apos;s Food.
                </p>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {HYGIENE_CHECKLIST.map((item) => {
                    const on = checked.includes(item)
                    return (
                      <li key={item}>
                        <button
                          onClick={() =>
                            setChecked((p) => (p.includes(item) ? p.filter((i) => i !== item) : [...p, item]))
                          }
                          aria-pressed={on}
                          className={`flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                            on ? 'border-mint-deep bg-mint/40' : 'border-[rgba(31,42,55,0.08)] hover:bg-cream-soft'
                          }`}
                        >
                          {on ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint-ink" aria-hidden />
                          ) : (
                            <Circle className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
                          )}
                          <span className={`text-xs ${on ? 'text-mint-ink' : 'text-ink-mid'}`}>{item}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <button
                  disabled={!allDone}
                  onClick={onComplete}
                  className="btn btn-primary mt-4 w-full justify-center text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Terminer la prestation
                </button>
                {!allDone && (
                  <p className="mt-2 text-center text-[11px] text-ink-soft">Complétez la checklist pour clôturer.</p>
                )}
              </Card>
            )}

            {/* Photos */}
            {(started || finished) && <PhotoSection photos={m.photos} onChange={onPhotos} />}
          </div>

          {/* Colonne latérale */}
          <aside className="space-y-5">
            {!started && (
              <Card>
                <p className="mb-2 text-sm font-semibold text-navy">Sur place ?</p>
                <p className="mb-3 text-[13px] leading-relaxed text-ink-mid">
                  Pointez votre arrivée : l&apos;heure est enregistrée et fait foi en cas de litige. La checklist et
                  l&apos;ajout de photos s&apos;ouvrent ensuite.
                </p>
                <button onClick={onArrive} className="btn btn-primary w-full justify-center text-sm">
                  Je suis arrivé(e)
                </button>
              </Card>
            )}

            <Card title="Documents">
              <ul className="space-y-2">
                <DocRow
                  icon={<ClipboardList className="h-4 w-4" />}
                  label="Liste de courses"
                  detail={`${m.persons} personnes · modifiable`}
                  onClick={() => setDoc({ kind: 'shopping' })}
                />
                {m.shoppingByChef && (
                  <DocRow
                    icon={<Receipt className="h-4 w-4" />}
                    label="Mandat de débours"
                    detail={mandateSignedAt ? 'Signé' : 'À signer avant les courses'}
                    tone={mandateSignedAt ? 'success' : 'warning'}
                    onClick={() => setDoc({ kind: 'mandate' })}
                  />
                )}
                {dishes.map((d) => (
                  <DocRow
                    key={d.id}
                    icon={<FileText className="h-4 w-4" />}
                    label={`Fiche recette — ${d.name}`}
                    detail={`${m.persons} portions`}
                    onClick={() => setDoc({ kind: 'recipe', dishId: d.id })}
                  />
                ))}
              </ul>
            </Card>

            {client && (
              <Card title="Le client">
                <p className="flex items-center gap-2 text-sm font-semibold text-navy">
                  <UserRound className="h-4 w-4 text-amber-deep" aria-hidden /> {client.name}
                </p>
                <dl className="mt-3 space-y-2 text-[13px]">
                  <SideRow label="Foyer" value={client.household} />
                  <SideRow label="Allergies" value={client.allergies.join(', ') || 'Aucune'} />
                  <SideRow label="Régimes" value={client.diets.join(', ') || 'Aucun'} />
                  <SideRow label="Équipement" value={client.equipment.join(', ')} />
                  <SideRow label="Sessions" value={`${client.sessionsCount} avec vous`} />
                </dl>
                {client.note && (
                  <p className="mt-3 rounded-xl bg-cream-soft px-3 py-2 text-[13px] leading-relaxed text-ink-mid">
                    <MessageSquare className="mr-1.5 inline h-3.5 w-3.5 text-ink-soft" aria-hidden />
                    {client.note}
                  </p>
                )}
              </Card>
            )}
          </aside>
        </div>
      </div>

      {/* Documents */}
      <DocDialog
        open={doc?.kind === 'recipe'}
        onOpenChange={(v) => !v && setDoc(null)}
        title="Fiche recette"
        description={`Prestation n° ${m.reference} · ${m.persons} portions`}
      >
        {doc?.dishId && dishById(doc.dishId) && (
          <RecipeSheet dish={dishById(doc.dishId)!} portions={m.persons} chefName={CHEF_PROFILE.name} />
        )}
      </DocDialog>

      <DocDialog
        open={doc?.kind === 'shopping'}
        onOpenChange={(v) => !v && setDoc(null)}
        title="Liste de courses"
        description={`${m.client} · ${m.persons} personnes`}
      >
        <div className="p-5 sm:p-6">
          <ShoppingList dishes={dishes} persons={m.persons} />
        </div>
      </DocDialog>

      <DocDialog
        open={doc?.kind === 'mandate'}
        onOpenChange={(v) => !v && setDoc(null)}
        title="Mandat de débours"
        description={`Prestation n° ${m.reference}`}
      >
        <ExpenseMandate
          mission={m}
          chefName={CHEF_PROFILE.name}
          signedByChefAt={mandateSignedAt}
          signedByClientAt={m.date}
          onSign={() => setMandateSignedAt(new Date().toISOString())}
        />
      </DocDialog>
    </ChefPage>
  )
}

// ── Photos ──────────────────────────────────────────────────────────────────

function PhotoSection({
  photos,
  onChange,
}: {
  photos: MissionPhoto[]
  onChange: (photos: MissionPhoto[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const photosRef = useRef(photos)
  useEffect(() => {
    photosRef.current = photos
  }, [photos])
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), [])

  const add = (files: FileList | null) => {
    if (!files?.length) return
    const accepted: MissionPhoto[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        setError('Seules les images sont acceptées (JPG, PNG, WebP).')
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(`« ${file.name} » dépasse 10 Mo.`)
        continue
      }
      accepted.push({
        id: `${file.name}-${file.lastModified}`,
        url: URL.createObjectURL(file),
        caption: file.name,
        at: new Date().toISOString(),
      })
    }
    if (accepted.length) {
      setError(null)
      onChange([...photos, ...accepted])
    }
  }

  return (
    <Card
      title="Photos de la prestation"
      action={
        <button
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-navy px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy hover:text-white"
        >
          <Camera className="h-3.5 w-3.5" aria-hidden /> Ajouter
        </button>
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          add(e.target.files)
          e.target.value = ''
        }}
      />
      <p className="mb-3 text-[13px] text-ink-mid">
        Plats dressés, contenants étiquetés, cuisine rendue : ces photos accompagnent le compte rendu envoyé au client.
      </p>
      {error && (
        <p role="alert" className="mb-3 text-[13px] text-red-700">
          {error}
        </p>
      )}
      {photos.length === 0 ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl border-[1.5px] border-dashed border-[rgba(31,42,55,0.2)] px-4 py-8 text-center transition-colors hover:border-amber hover:bg-amber-soft/20"
        >
          <Camera className="h-5 w-5 text-ink-soft" aria-hidden />
          <span className="text-sm font-semibold text-navy">Ajouter vos premières photos</span>
          <span className="text-xs text-ink-soft">JPG, PNG ou WebP, 10 Mo maximum par photo</span>
        </button>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p) => (
            <li key={p.id} className="group relative overflow-hidden rounded-xl bg-cream-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.caption ?? ''} className="aspect-[4/3] w-full object-cover" />
              <button
                onClick={() => {
                  URL.revokeObjectURL(p.url)
                  onChange(photos.filter((x) => x.id !== p.id))
                }}
                aria-label={`Retirer ${p.caption ?? 'la photo'}`}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-navy/75 text-white opacity-0 transition-opacity hover:bg-navy focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// ── Détails de présentation ─────────────────────────────────────────────────

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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

function SideRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-ink-soft">{label}</dt>
      <dd className="text-right font-medium text-navy">{value}</dd>
    </div>
  )
}

function DocRow({
  icon,
  label,
  detail,
  tone = 'neutral',
  onClick,
}: {
  icon: React.ReactNode
  label: string
  detail: string
  tone?: 'neutral' | 'success' | 'warning'
  onClick: () => void
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-xl border border-[rgba(31,42,55,0.08)] px-3 py-2.5 text-left transition-colors hover:border-[rgba(31,42,55,0.2)] hover:bg-cream-soft"
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            tone === 'warning' ? 'bg-amber-soft text-amber-deep' : tone === 'success' ? 'bg-mint text-mint-ink' : 'bg-cream-soft text-navy'
          }`}
          aria-hidden
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
