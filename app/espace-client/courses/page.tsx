'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Check,
  ClipboardCopy,
  Download,
  Loader2,
  MessageSquare,
  Pencil,
  Send,
  ShoppingBasket,
  Store,
} from 'lucide-react'
import {
  bookingStatusText,
  hour,
  useMissionShoppingList,
  useMyBookings,
  useSubmitShoppingList,
  type Booking,
  type MissionLine,
  type MissionShoppingList,
  type ShoppingListStatus,
  type ShoppingMark,
} from '@/lib/api/bookings'
import { ApiError } from '@/lib/api/client'
import { aisleLabel, displayQuantity } from '@/lib/recipe-fields'
import { reasonText } from '@/lib/reason-codes'
import { STORES } from '@/lib/client/mock'
import { Hint } from '@/components/shared/Hint'
import { InfoPopover } from '@/components/shared/InfoPopover'
import { useToast } from '@/components/shared/Toaster'

/* ─────────────────────────────────────────────────────────────────────────────
   Ma liste de courses.

   Elle affichait seize articles écrits en dur dans `lib/client/mock.ts`, pour
   une « session du 3 mai » qui n'a jamais existé. Elle lit maintenant
   `GET /chef-missions/{id}/shopping-list` : la liste calculée depuis les
   recettes de la prestation, mise à l'échelle des portions réservées, le même
   ingrédient dans la même unité additionné, groupée par rayon. C'est la liste
   que le batch cooker a sous les yeux — et quand il l'a corrigée, la ligne
   corrigée le dit.

   La prestation affichée est la prochaine qui demande des courses. On peut en
   choisir une autre quand il y en a plusieurs ; on ne devine pas.

   Qui fait les courses décide de l'écran (Recettes §10.7) :

   - le batch cooker (cas 1) : il envoie la liste, le client coche ce qu'il a
     déjà, commente une ligne et lui renvoie sa liste finale, autant de fois
     qu'il veut jusqu'à midi la veille. Tout part à l'API ;
   - le client lui-même (cas 2) : la liste est son outil. « J'ai déjà » vit
     dans la page, le temps de faire ses courses, et les enseignes sont des
     liens vers des drives, pas des données prétendues.
   ───────────────────────────────────────────────────────────────────────────── */

/** Les étapes où une liste de courses sert encore à quelque chose. */
const A_VENIR = ['confirmed', 'shopping', 'cooking']

export default function ShoppingListPage() {
  const commandes = useMyBookings({ limit: 50 })
  const [choisie, setChoisie] = useState<string | null>(null)

  const concernees = useMemo(() => {
    const tout = (commandes.data?.data ?? []) as Booking[]
    return tout
      .filter((b) => A_VENIR.includes(b.status))
      .sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''))
  }, [commandes.data])

  const active = concernees.find((b) => b.id === choisie) ?? concernees[0] ?? null

  if (commandes.isPending) {
    return (
      <div className="flex items-center justify-center rounded-3xl card-shell py-20">
        <Loader2 className="h-5 w-5 animate-spin text-ink-soft" aria-hidden />
      </div>
    )
  }

  if (!active) {
    return (
      <div className="rounded-3xl card-shell p-10 text-center">
        <ShoppingBasket className="mx-auto mb-4 h-7 w-7 text-amber" aria-hidden />
        <p className="font-display text-xl font-bold text-navy">
          Aucune session en préparation
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-mid">
          La liste de courses se calcule depuis les recettes d’une prestation
          confirmée. Réservez une session et elle s’écrira toute seule.
        </p>
        <Link href="/espace-client/reservation" className="btn btn-navy mt-6">
          Réserver une session
        </Link>
      </div>
    )
  }

  return (
    <Liste
      key={active.id}
      booking={active}
      autres={concernees}
      onChoisir={setChoisie}
    />
  )
}

/* ── La liste d'une prestation ─────────────────────────────────────────────── */

type ListeProps = {
  booking: Booking
  autres: Booking[]
  onChoisir: (id: string) => void
}

/** Le batch cooker fait les courses : on lui répond. Sinon, la liste est à soi. */
function Liste(props: ListeProps) {
  const courses = useMissionShoppingList(props.booking.id)
  const liste = courses.data
  if (liste && liste.shoppingByClient === false) {
    return (
      <Reponse
        // Une nouvelle version, un envoi ou le passage à « figée » repartent du serveur.
        key={`${liste.version ?? 0}:${liste.finalReceivedAt ?? ''}:${liste.status}`}
        {...props}
        liste={liste}
        onRecharger={() => courses.refetch()}
      />
    )
  }
  return <ListeLibre {...props} />
}

/* ── Cas 2 : le client fait ses courses ────────────────────────────────────── */

function ListeLibre({ booking, autres, onChoisir }: ListeProps) {
  const courses = useMissionShoppingList(booking.id)
  const [possedes, setPossedes] = useState<string[]>([])
  const [storeId, setStoreId] = useState(STORES[0].id)
  const [copie, setCopie] = useState(false)

  const store = STORES.find((s) => s.id === storeId)!
  const groupes = courses.data?.groups ?? []
  const total = groupes.reduce((n, g) => n + g.lines.length, 0)
  const restants = total - possedes.length

  const basculer = (clef: string) =>
    setPossedes((p) => (p.includes(clef) ? p.filter((x) => x !== clef) : [...p, clef]))

  const enTexte = () =>
    groupes
      .map(({ aisle, lines }) => {
        const reste = lines.filter((l, i) => !possedes.includes(clef(aisle, l, i)))
        if (reste.length === 0) return ''
        return `${aisleLabel(aisle) ?? aisle}\n${reste
          .map((l) => `- ${l.name} : ${quantite(l)}`)
          .join('\n')}`
      })
      .filter(Boolean)
      .join('\n\n')

  const copierEtOuvrir = async () => {
    try {
      await navigator.clipboard.writeText(enTexte())
      setCopie(true)
      setTimeout(() => setCopie(false), 2500)
    } catch {
      // Presse-papier indisponible : on ouvre quand même l'enseigne.
    }
    window.open(store.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-5">
      {/* ── Ce qu'on prépare, et pour quand ──────────────────────────────── */}
      <div className="card-shell rounded-3xl p-5 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow mb-2">
              {booking.startsAt ? sessionLabel(booking) : 'Prochaine session'}
            </p>
            {courses.isPending ? (
              <p className="font-display text-2xl font-bold text-ink-soft">…</p>
            ) : (
              <p className="font-display text-2xl font-bold text-navy">
                {restants} article{restants > 1 ? 's' : ''} à acheter
              </p>
            )}
            <p className="mt-1 text-xs text-ink-soft">
              {possedes.length} déjà dans vos placards · {total} au total
              {courses.data?.persons ? ` · pour ${courses.data.persons} personnes` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Store
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
                aria-hidden
              />
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                aria-label="Enseigne"
                className="input-base w-full pl-10 text-sm sm:w-60"
              >
                {STORES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={copierEtOuvrir}
              disabled={total === 0}
              className="btn btn-primary text-sm disabled:opacity-50"
            >
              {copie ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
              {copie ? 'Liste copiée' : 'Faire mes courses'}
            </button>
            <button onClick={() => window.print()} className="btn btn-outline text-sm">
              <Download className="h-4 w-4" /> Exporter
            </button>
          </div>
        </div>

        <AutresSessions booking={booking} autres={autres} onChoisir={onChoisir} />

        <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
          « Faire mes courses » copie la liste restante dans le presse-papier puis
          ouvre {store.name} — il ne reste qu&apos;à la coller dans la recherche.
        </p>
      </div>

      {/* ── Les rayons ───────────────────────────────────────────────────── */}
      {courses.isPending ? (
        <div className="flex items-center justify-center rounded-3xl card-shell py-16">
          <Loader2 className="h-5 w-5 animate-spin text-ink-soft" aria-hidden />
        </div>
      ) : courses.isError ? (
        <p className="rounded-3xl card-shell p-8 text-center text-sm text-ink-mid">
          La liste n’a pas pu être chargée. Elle se calcule depuis les recettes :
          si votre batch cooker ne les a pas encore renseignées, elle apparaîtra
          dès qu’il l’aura fait.
        </p>
      ) : groupes.length === 0 ? (
        <p className="rounded-3xl card-shell p-8 text-center text-sm text-ink-mid">
          Aucun ingrédient pour l’instant : les recettes de cette session ne sont
          pas encore détaillées.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {groupes.map(({ aisle, lines }) => (
            <section
              key={aisle}
              className="rounded-3xl card-shell p-5"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-soft">
                  <ShoppingBasket className="h-4 w-4 text-amber-deep" aria-hidden />
                </span>
                <h3 className="font-display text-base font-bold text-navy">
                  {aisleLabel(aisle) ?? aisle}
                </h3>
                <span className="text-[11px] text-ink-soft">({lines.length})</span>
              </div>

              <ul className="space-y-1.5">
                {lines.map((l, i) => {
                  const id = clef(aisle, l, i)
                  const possede = possedes.includes(id)
                  return (
                    <li key={id}>
                      <button
                        onClick={() => basculer(id)}
                        aria-pressed={possede}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                          possede ? 'bg-mint/40' : 'hover:bg-cream-soft'
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                            possede
                              ? 'border-mint-deep bg-mint-deep'
                              : 'border-[rgba(31,42,55,0.2)]'
                          }`}
                        >
                          {possede && <Check className="h-3 w-3 text-mint-ink" aria-hidden />}
                        </span>
                        <span
                          className={`min-w-0 flex-1 text-sm ${
                            possede ? 'text-ink-soft line-through' : 'font-medium text-navy'
                          }`}
                        >
                          {l.name}
                          {l.edited && (
                            <span
                              title="Ligne corrigée par votre batch cooker"
                              className="ml-1.5 inline-flex translate-y-px"
                            >
                              <Pencil className="h-3 w-3 text-amber-deep" aria-hidden />
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 font-mono text-xs text-ink-soft">
                          {quantite(l)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-ink-soft">
        Cochez « j’ai déjà » pour retirer un article de l’export.
      </p>
    </div>
  )
}

/* ── Cas 1 : le batch cooker fait les courses, le client répond ─────────────── */

type Marque = { alreadyHave: boolean; comment: string }

/** Une ligne par ingrédient et par unité : c'est ainsi que l'API les reconnaît. */
const cle = (l: MissionLine) => `${l.name}|${l.unit}`

const TITRE: Record<ShoppingListStatus, string> = {
  preparing: 'Votre batch cooker prépare la liste',
  sent: 'Vérifiez votre liste de courses',
  update_sent: 'Votre liste a été mise à jour',
  final_received: 'Liste envoyée à votre batch cooker',
  frozen: 'Liste figée',
}

function Reponse({
  booking,
  autres,
  onChoisir,
  liste,
  onRecharger,
}: ListeProps & { liste: MissionShoppingList; onRecharger: () => void }) {
  const toast = useToast()
  const envoyer = useSubmitShoppingList()
  const status = liste.status ?? 'preparing'
  const modifiable =
    status === 'sent' || status === 'update_sent' || status === 'final_received'
  const groupes = liste.groups
  const lignes = groupes.flatMap((g) => g.lines)

  // La réponse telle que l'API la connaît : le point de départ, et la référence
  // pour savoir s'il reste des modifications à envoyer.
  const depart = useMemo(
    () =>
      Object.fromEntries(
        groupes
          .flatMap((g) => g.lines)
          .map((l) => [cle(l), { alreadyHave: !!l.alreadyHave, comment: l.comment ?? '' }]),
      ) as Record<string, Marque>,
    [groupes],
  )
  const [marques, setMarques] = useState(depart)
  const [ouverts, setOuverts] = useState<string[]>([])

  const changer = (k: string, patch: Partial<Marque>) =>
    setMarques((m) => ({ ...m, [k]: { ...m[k], ...patch } }))

  const possedes = Object.values(marques).filter((m) => m.alreadyHave).length
  const commentes = Object.values(marques).filter((m) => m.comment.trim()).length
  const modifie = JSON.stringify(marques) !== JSON.stringify(depart)

  const envoi = () => {
    const marks: ShoppingMark[] = lignes.flatMap((l) => {
      const m = marques[cle(l)]
      const comment = m.comment.trim()
      if (!m.alreadyHave && !comment) return []
      return [{ name: l.name, unit: l.unit, alreadyHave: m.alreadyHave, ...(comment && { comment }) }]
    })
    envoyer.mutate(
      { id: booking.id, version: liste.version ?? 0, marks },
      {
        onSuccess: () =>
          toast.success('Liste envoyée', 'Votre batch cooker la reçoit tout de suite.'),
        onError: (e) => {
          const body = e instanceof ApiError ? e.body : null
          toast.error('La liste n’a pas été envoyée', reasonText(body) ?? undefined)
          if ((body as { code?: string } | null)?.code === 'SHOPPING_LIST_UPDATED') onRecharger()
        },
      },
    )
  }

  const limite = liste.deadline
    ? `${new Date(liste.deadline).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })} à ${hour(liste.deadline)}`
    : null

  return (
    <div className="space-y-5">
      <div className="card-shell rounded-3xl p-5 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow mb-2">
              {booking.startsAt ? sessionLabel(booking) : 'Prochaine session'}
            </p>
            <p className="font-display text-2xl font-bold text-navy">{TITRE[status]}</p>
            {status === 'preparing' ? (
              <p className="mt-1 text-xs text-ink-soft">
                Vous pourrez la vérifier dès qu’il vous l’aura envoyée.
              </p>
            ) : (
              <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-ink-soft">
                {possedes} déjà chez vous · {commentes} commentaire{commentes > 1 ? 's' : ''} ·{' '}
                {lignes.length} au total
                <InfoPopover label="Que veut dire « j’ai déjà » ?">
                  Cochez ce que vous avez chez vous en quantité suffisante : votre batch
                  cooker ne l’achète pas. Si la quantité change dans une mise à jour de
                  la liste, la case se décoche : vérifiez-la.
                </InfoPopover>
              </p>
            )}
            {limite && (
              <p className="mt-2 flex flex-wrap items-center gap-1 text-[13px] font-semibold text-navy">
                {status === 'frozen' ? `Figée depuis ${limite}` : `À renvoyer au plus tard ${limite}`}
                <InfoPopover label="Pourquoi cette date limite ?">
                  Jusqu’à midi la veille de la prestation, vous pouvez renvoyer votre
                  liste autant de fois que vous voulez. Ensuite, elle est figée : votre
                  batch cooker achète ce qu’elle contient. Si vous ne l’avez jamais
                  renvoyée, il achète toute la liste.
                </InfoPopover>
              </p>
            )}
            {/* Recettes lot 4 : le batch cooker a validé les courses. */}
            {liste.groceries?.validatedAt && (
              <p className="mt-2 text-[13px] text-mint-ink">
                Courses faites par votre batch cooker
                {liste.groceries.amountCents != null &&
                  ` · ticket de ${(liste.groceries.amountCents / 100).toLocaleString('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  })}, à titre d’information`}
                .
              </p>
            )}
          </div>

          {modifiable && (
            <button
              onClick={envoi}
              disabled={envoyer.isPending}
              className="btn btn-primary text-sm disabled:opacity-50"
            >
              {envoyer.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Send className="h-4 w-4" aria-hidden />
              )}
              {status === 'final_received'
                ? 'Renvoyer ma liste'
                : 'Envoyer ma liste finale au batch cooker'}
            </button>
          )}
        </div>

        {modifiable && modifie && (
          <p className="mt-3 text-[12px] font-semibold text-amber-deep">
            Modifications non envoyées : votre batch cooker voit encore la version
            précédente.
          </p>
        )}

        <AutresSessions booking={booking} autres={autres} onChoisir={onChoisir} />
      </div>

      {modifiable && (
        <Hint id="courses-liste-finale">
          Cochez ce que vous avez déjà, commentez une ligne si besoin, puis envoyez votre
          liste finale. Sans envoi avant midi la veille, votre batch cooker achète toute
          la liste.
        </Hint>
      )}

      {status === 'update_sent' && (
        <p className="rounded-2xl bg-amber-soft/60 px-4 py-3 text-[13px] leading-relaxed text-[#8B6200]">
          Votre batch cooker a modifié la liste depuis votre dernier envoi. Les lignes
          dont la quantité a changé ont été décochées : vérifiez-les, puis renvoyez
          votre liste.
        </p>
      )}

      {groupes.length === 0 ? (
        <p className="rounded-3xl card-shell p-8 text-center text-sm text-ink-mid">
          Aucun ingrédient pour l’instant : les recettes de cette session ne sont
          pas encore détaillées.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {groupes.map(({ aisle, lines }) => (
            <section
              key={aisle}
              className="rounded-3xl card-shell p-5"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-soft">
                  <ShoppingBasket className="h-4 w-4 text-amber-deep" aria-hidden />
                </span>
                <h3 className="font-display text-base font-bold text-navy">
                  {aisleLabel(aisle) ?? aisle}
                </h3>
                <span className="text-[11px] text-ink-soft">({lines.length})</span>
              </div>

              <ul className="space-y-1.5">
                {lines.map((l) => {
                  const k = cle(l)
                  const m = marques[k]
                  const ouvert = ouverts.includes(k) || m.comment !== ''
                  return (
                    <li key={k}>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => changer(k, { alreadyHave: !m.alreadyHave })}
                          disabled={!modifiable}
                          aria-pressed={m.alreadyHave}
                          className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors disabled:cursor-default ${
                            m.alreadyHave ? 'bg-mint/40' : modifiable ? 'hover:bg-cream-soft' : ''
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                              m.alreadyHave
                                ? 'border-mint-deep bg-mint-deep'
                                : 'border-[rgba(31,42,55,0.2)]'
                            }`}
                          >
                            {m.alreadyHave && (
                              <Check className="h-3 w-3 text-mint-ink" aria-hidden />
                            )}
                          </span>
                          <span
                            className={`min-w-0 flex-1 text-sm ${
                              m.alreadyHave
                                ? 'text-ink-soft line-through'
                                : 'font-medium text-navy'
                            }`}
                          >
                            {l.name}
                            {m.alreadyHave && <span className="sr-only"> (j’ai déjà)</span>}
                          </span>
                          <span className="shrink-0 font-mono text-xs text-ink-soft">
                            {quantite(l)}
                          </span>
                        </button>
                        {modifiable && !ouvert && (
                          <button
                            type="button"
                            onClick={() => setOuverts((o) => [...o, k])}
                            aria-label={`Commenter ${l.name}`}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-cream-soft hover:text-navy"
                          >
                            <MessageSquare className="h-4 w-4" aria-hidden />
                          </button>
                        )}
                      </div>
                      {ouvert &&
                        (modifiable ? (
                          <input
                            value={m.comment}
                            onChange={(e) => changer(k, { comment: e.target.value })}
                            maxLength={280}
                            placeholder="Votre commentaire : marque, variété, quantité…"
                            aria-label={`Commentaire sur ${l.name}`}
                            className="input-base mt-1 w-full py-1.5 text-[13px]"
                          />
                        ) : (
                          <p className="ml-11 mt-0.5 text-[12px] italic text-ink-mid">
                            « {m.comment} »
                          </p>
                        ))}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Plusieurs sessions à venir ────────────────────────────────────────────── */

function AutresSessions({ booking, autres, onChoisir }: ListeProps) {
  if (autres.length < 2) return null
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[rgba(31,42,55,0.06)] pt-4">
      <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-soft">
        Autre session
      </span>
      {autres.map((b) => (
        <button
          key={b.id}
          onClick={() => onChoisir(b.id)}
          className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
            b.id === booking.id ? 'bg-navy text-white' : 'bg-cream-soft text-navy hover:bg-cream-deep'
          }`}
        >
          {sessionLabel(b)}
        </button>
      ))}
    </div>
  )
}

/* ── Petites conversions ───────────────────────────────────────────────────── */

/** L'API ne numérote pas les lignes : le rayon, le nom et le rang suffisent. */
const clef = (aisle: string, l: MissionLine, i: number) => `${aisle}:${l.name}:${i}`

/** « 400 g », « 2 gousses », « selon le goût » — sans nombre pour une ligne au goût. */
const quantite = (l: MissionLine) => displayQuantity(l.qty, l.unit)

function sessionLabel(b: Booking): string {
  if (!b.startsAt) return bookingStatusText(b.status)
  const d = new Date(b.startsAt)
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} · ${hour(b.startsAt)}`
}
