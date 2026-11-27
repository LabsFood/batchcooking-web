'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
  useSaveShoppingMarks,
  useSubmitShoppingList,
  type Booking,
  type MissionLine,
  type MissionShoppingList,
  type ShoppingListStatus,
  type ShoppingMark,
} from '@/lib/api/bookings'
import { ApiError } from '@/lib/api/client'
import { aisleLabel, displayQuantity } from '@/lib/recipe-fields'
import OptionalBadge from '@/components/shared/OptionalBadge'
import { reasonText } from '@/lib/reason-codes'
import { STORES } from '@/lib/client/mock'
import { Hint } from '@/components/shared/Hint'
import { Skeleton, SkeletonCard, SkeletonGroup } from '@/components/shared/Skeleton'
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

/** Deux rayons de quatre lignes (`py-2.5` + texte = 40 px), dans la grille des vrais rayons. */
function RayonsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {[0, 1].map((i) => (
        <SkeletonCard key={i} className="rounded-2xl">
          <div className="mb-3 flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-xl" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="space-y-1.5">
            {[0, 1, 2, 3].map((j) => (
              <Skeleton key={j} className="h-10 rounded-xl" />
            ))}
          </div>
        </SkeletonCard>
      ))}
    </div>
  )
}

export default function ShoppingListPage() {
  const commandes = useMyBookings({ limit: 50 })
  const [choisie, setChoisie] = useState<string | null>(null)

  const concernees = useMemo(() => {
    const tout = (commandes.data?.data ?? []) as Booking[]
    return tout
      .filter((b) => A_VENIR.includes(b.status))
      .sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''))
  }, [commandes.data])

  const active = concernees.find((b) => b.id === choisie) ?? null

  if (commandes.isPending) {
    // Le bandeau (session, compteur, boutons) puis les rayons, comme la liste réelle.
    return (
      <SkeletonGroup className="space-y-5">
        <SkeletonCard className="rounded-2xl lg:p-6">
          <Skeleton className="mb-2 h-4 w-40" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-1 h-4 w-72 max-w-full" />
        </SkeletonCard>
        <RayonsSkeleton />
      </SkeletonGroup>
    )
  }

  if (!active && concernees.length > 0) {
    return <Sessions sessions={concernees} onChoisir={setChoisie} />
  }

  if (!active) {
    return (
      <div className="rounded-2xl card-shell p-10 text-center">
        <ShoppingBasket className="mx-auto mb-4 h-7 w-7 text-amber-ink" aria-hidden />
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
      onRetour={() => setChoisie(null)}
    />
  )
}

/* ── La liste d'une prestation ─────────────────────────────────────────────── */

type ListeProps = {
  booking: Booking
  onRetour: () => void
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

function ListeLibre({ booking, onRetour }: ListeProps) {
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
      <div className="card-shell rounded-2xl p-5 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow mb-2">
              {booking.startsAt ? sessionLabel(booking) : 'Prochaine session'}
            </p>
            {courses.isPending ? (
              <Skeleton className="h-8 w-56" />
            ) : (
              <p className="font-display text-2xl font-bold text-navy">
                {restants} article{restants > 1 ? 's' : ''} à acheter
              </p>
            )}
            <Plats booking={booking} />
            <p className="mt-1 text-xs text-ink-soft">
              {possedes.length} déjà dans vos placards · {total} au total
              {courses.data?.persons ? ` · pour ${courses.data.persons} personnes` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
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

        <Retour onRetour={onRetour} />

        <p className="mt-3 text-xs leading-relaxed text-ink-soft print:hidden">
          « Faire mes courses » copie la liste restante dans le presse-papier puis
          ouvre {store.name} — il ne reste qu&apos;à la coller dans la recherche.
        </p>
      </div>

      {/* ── Les rayons ───────────────────────────────────────────────────── */}
      {courses.isPending ? (
        <SkeletonGroup>
          <RayonsSkeleton />
        </SkeletonGroup>
      ) : courses.isError ? (
        <p className="rounded-2xl card-shell p-8 text-center text-sm text-ink-mid">
          La liste n’a pas pu être chargée. Elle se calcule depuis les recettes :
          si votre batch cooker ne les a pas encore renseignées, elle apparaîtra
          dès qu’il l’aura fait.
        </p>
      ) : groupes.length === 0 ? (
        <p className="rounded-2xl card-shell p-8 text-center text-sm text-ink-mid">
          Aucun ingrédient pour l’instant : les recettes de cette session ne sont
          pas encore détaillées.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {groupes.map(({ aisle, lines }) => (
            <section
              key={aisle}
              className="rounded-2xl card-shell p-5"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-soft">
                  <ShoppingBasket className="h-4 w-4 text-amber-ink" aria-hidden />
                </span>
                <h3 className="font-display text-base font-bold text-navy">
                  {aisleLabel(aisle) ?? aisle}
                </h3>
                <span className="text-xs text-ink-soft">({lines.length})</span>
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
                          {l.optional && <OptionalBadge />}
                          {l.edited && (
                            <span
                              title="Ligne corrigée par votre batch cooker"
                              className="ml-1.5 inline-flex translate-y-px"
                            >
                              <Pencil className="h-3 w-3 text-amber-ink" aria-hidden />
                            </span>
                          )}
                        </span>
                        <span className="tabular-nums shrink-0 text-xs text-ink-soft">
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

      <p className="text-center text-xs text-ink-soft print:hidden">
        Cochez « j’ai déjà » pour retirer un article de l’export.
      </p>
    </div>
  )
}

/* ── Cas 1 : le batch cooker fait les courses, le client répond ─────────────── */

type Marque = { alreadyHave: boolean; comment: string; haveQty: string }

/** Une ligne par ingrédient et par unité : c'est ainsi que l'API les reconnaît. */
const cle = (l: MissionLine) => `${l.name}|${l.unit}`

const TITRE: Record<ShoppingListStatus, string> = {
  preparing: 'Votre batch cooker prépare la liste',
  sent: 'Vérifiez votre liste de courses',
  update_sent: 'Votre liste a été mise à jour',
  final_received: 'Vous avez terminé votre liste',
  frozen: 'Liste figée',
}

/** Les commentaires partent après une courte pause de frappe, les coches tout de suite. */
const DEBOUNCE_MS = 700

/** Une marque vide (rien coché, rien écrit) est retirée côté API. */
function versMark(l: MissionLine, m: Marque): ShoppingMark {
  const comment = m.comment.trim()
  const have = Number(m.haveQty.replace(',', '.'))
  return {
    name: l.name,
    unit: l.unit,
    alreadyHave: m.alreadyHave,
    ...(m.haveQty.trim() && have > 0 && { haveQty: have }),
    ...(comment && { comment }),
  }
}

function Reponse({
  booking,
  onRetour,
  liste,
  onRecharger,
}: ListeProps & { liste: MissionShoppingList; onRecharger: () => void }) {
  const toast = useToast()
  const envoyer = useSubmitShoppingList()
  const enregistrer = useSaveShoppingMarks()
  const status = liste.status ?? 'preparing'
  const modifiable =
    status === 'sent' || status === 'update_sent' || status === 'final_received'
  const groupes = liste.groups
  const lignes = groupes.flatMap((g) => g.lines)
  const apportes = liste.providedByChef ?? []

  const [marques, setMarques] = useState<Record<string, Marque>>(() =>
    Object.fromEntries(
      lignes.map((l) => [
        cle(l),
        {
          alreadyHave: !!l.alreadyHave,
          comment: l.comment ?? '',
          haveQty: l.haveQty != null ? String(l.haveQty) : '',
        },
      ]),
    ),
  )
  const [ouverts, setOuverts] = useState<string[]>([])

  // Les lignes touchées depuis le dernier envoi à l'API, et la version des marques en cours.
  const sale = useRef(new Set<string>())
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const courant = useRef({ marques, lignes, version: liste.version ?? 0 })
  useEffect(() => {
    courant.current = { marques, lignes, version: liste.version ?? 0 }
  })

  const erreur = (e: unknown, titre: string) => {
    const body = e instanceof ApiError ? e.body : null
    const code = (body as { code?: string } | null)?.code
    // 422 : quantité « déjà chez moi » refusée (elle doit être supérieure à zéro).
    const texte =
      reasonText(body) ??
      (e instanceof ApiError && e.status === 422
        ? 'Quantité refusée : indiquez un nombre supérieur à zéro.'
        : undefined)
    toast.error(titre, texte)
    if (code === 'SHOPPING_LIST_UPDATED' || code === 'SHOPPING_LIST_FROZEN') onRecharger()
  }

  const vider = () => {
    clearTimeout(timer.current)
    const { marques: m, lignes: ls, version } = courant.current
    const touchees = ls.filter((l) => sale.current.has(cle(l)))
    sale.current.clear()
    if (touchees.length === 0) return
    enregistrer.mutate(
      { id: booking.id, version, marks: touchees.map((l) => versMark(l, m[cle(l)])) },
      { onError: (e) => erreur(e, 'Votre dernière modification n’a pas été enregistrée') },
    )
  }

  // Une page quittée avec un commentaire en cours ne le perd pas.
  useEffect(() => () => vider(), []) // eslint-disable-line react-hooks/exhaustive-deps

  const changer = (k: string, patch: Partial<Marque>, differe = false) => {
    setMarques((m) => ({ ...m, [k]: { ...m[k], ...patch } }))
    sale.current.add(k)
    clearTimeout(timer.current)
    // `courant` ne voit la nouvelle valeur qu'au rendu suivant : on vide après lui.
    timer.current = setTimeout(vider, differe ? DEBOUNCE_MS : 0)
  }

  const possedes = Object.values(marques).filter((m) => m.alreadyHave).length
  const commentes = Object.values(marques).filter((m) => m.comment.trim()).length

  const envoi = () => {
    clearTimeout(timer.current)
    sale.current.clear()
    const marks = lignes
      .map((l) => versMark(l, marques[cle(l)]))
      .filter((mk) => mk.alreadyHave || mk.haveQty || mk.comment)
    envoyer.mutate(
      { id: booking.id, version: liste.version ?? 0, marks },
      {
        onSuccess: () =>
          toast.success('Liste envoyée', 'Votre batch cooker la reçoit tout de suite.'),
        onError: (e) => erreur(e, 'La liste n’a pas été envoyée'),
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
      <div className="card-shell rounded-2xl p-5 lg:p-6">
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
                  cooker ne l’achète pas. Vos coches sont enregistrées au fur et à
                  mesure. Si la quantité change dans une mise à jour de la liste, la
                  case se décoche : vérifiez-la.
                </InfoPopover>
              </p>
            )}
            {limite && (
              <p className="mt-2 flex flex-wrap items-center gap-1 text-[13px] font-semibold text-navy">
                {status === 'frozen' ? `Figée depuis ${limite}` : `À terminer au plus tard ${limite}`}
                <InfoPopover label="Pourquoi cette date limite ?">
                  Jusqu’à midi la veille de la prestation, vous pouvez modifier votre
                  liste autant de fois que vous voulez. Ensuite, elle est figée : votre
                  batch cooker achète ce qu’elle contient.
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
              J’ai fini
              <InfoPopover label="Que fait « J’ai fini » ?" className="text-inherit">
                Vos coches sont déjà visibles par votre batch cooker. « J’ai fini » le
                prévient que votre liste est complète ; vous pouvez encore la modifier
                jusqu’à la date limite.
              </InfoPopover>
            </button>
          )}
        </div>

        <Retour onRetour={onRetour} />
      </div>

      {status === 'preparing' && (
        <p className="rounded-2xl card-shell p-8 text-center text-sm text-ink-mid">
          Votre batch cooker prépare votre liste de courses. Vous serez prévenu dès
          qu’elle sera prête à vérifier.
        </p>
      )}

      {modifiable && (
        <Hint id="courses-liste-finale">
          Cochez ce que vous avez déjà, indiquez une quantité partielle ou commentez une
          ligne : tout est enregistré au fur et à mesure. Appuyez sur « J’ai fini » quand
          votre liste est complète.
        </Hint>
      )}

      {status === 'update_sent' && (
        <p className="rounded-2xl bg-amber-soft/60 px-4 py-3 text-[13px] leading-relaxed text-[#8B6200]">
          Votre batch cooker a modifié la liste depuis votre dernier envoi. Les lignes
          dont la quantité a changé ont été décochées : vérifiez-les.
        </p>
      )}

      {status !== 'preparing' && groupes.length === 0 && apportes.length === 0 && (
        <p className="rounded-2xl card-shell p-8 text-center text-sm text-ink-mid">
          Aucun ingrédient pour l’instant : les recettes de cette session ne sont
          pas encore détaillées.
        </p>
      )}

      {groupes.length > 0 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {groupes.map(({ aisle, lines }) => (
            <section
              key={aisle}
              className="rounded-2xl card-shell p-5"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-soft">
                  <ShoppingBasket className="h-4 w-4 text-amber-ink" aria-hidden />
                </span>
                <h3 className="font-display text-base font-bold text-navy">
                  {aisleLabel(aisle) ?? aisle}
                </h3>
                <span className="text-xs text-ink-soft">({lines.length})</span>
              </div>

              <ul className="space-y-1.5">
                {lines.map((l) => {
                  const k = cle(l)
                  const m = marques[k]
                  if (!m) return null
                  const ouvert = ouverts.includes(k) || m.comment !== '' || m.haveQty !== ''
                  const achat = l.toBuyQty != null && l.haveQty ? l.toBuyQty : null
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
                          <span className="tabular-nums shrink-0 text-xs text-ink-soft">
                            {quantite(l)}
                          </span>
                        </button>
                        {modifiable && !ouvert && (
                          <button
                            type="button"
                            onClick={() => setOuverts((o) => [...o, k])}
                            aria-label={`Commenter ou partager ${l.name}`}
                            className="hit flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-cream-soft hover:text-navy"
                          >
                            <MessageSquare className="h-4 w-4" aria-hidden />
                          </button>
                        )}
                      </div>
                      {achat != null && (
                        <p className="ml-11 mt-0.5 text-xs font-semibold text-navy">
                          À acheter : {displayQuantity(achat, l.unit)}
                        </p>
                      )}
                      {ouvert &&
                        (modifiable ? (
                          <div className="mt-1 space-y-1">
                            {l.qty > 0 && !m.alreadyHave && (
                              <label className="flex items-center gap-2 text-[13px] text-ink-mid">
                                Déjà chez moi :
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  min={0}
                                  step="any"
                                  value={m.haveQty}
                                  onChange={(e) =>
                                    changer(k, { haveQty: e.target.value }, true)
                                  }
                                  aria-label={`Quantité de ${l.name} déjà chez vous`}
                                  className="input-base w-24 py-1 text-[13px]"
                                />
                                <span className="text-xs text-ink-soft">{l.unit}</span>
                                <InfoPopover label="Comment marche la quantité déjà chez moi ?">
                                  Indiquez ce qu’il vous reste : votre batch cooker
                                  n’achète que la différence. Une quantité égale ou
                                  supérieure à la ligne revient à cocher « j’ai déjà ».
                                  Elle doit être supérieure à zéro.
                                </InfoPopover>
                              </label>
                            )}
                            <input
                              value={m.comment}
                              onChange={(e) => changer(k, { comment: e.target.value }, true)}
                              maxLength={280}
                              placeholder="Votre commentaire : marque, variété, quantité…"
                              aria-label={`Commentaire sur ${l.name}`}
                              className="input-base w-full py-1.5 text-[13px]"
                            />
                          </div>
                        ) : (
                          m.comment && (
                            <p className="ml-11 mt-0.5 text-xs text-ink-mid">« {m.comment} »</p>
                          )
                        ))}
                      {l.chefReply && (
                        <p className="ml-11 mt-1 rounded-lg bg-cream-soft px-3 py-1.5 text-xs text-navy">
                          <span className="font-semibold">Votre batch cooker : </span>
                          {l.chefReply.reply}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {apportes.length > 0 && (
        <section className="rounded-2xl card-shell p-5">
          <h3 className="mb-1 flex items-center gap-1 font-display text-base font-bold text-navy">
            Apporté par votre batch cooker
            <InfoPopover label="Pourquoi ces produits ne sont pas à cocher ?">
              Votre batch cooker a ces produits de base chez lui et les apporte : vous
              n’avez rien à acheter ni à cocher.
            </InfoPopover>
          </h3>
          <ul className="space-y-1">
            {apportes.map((l) => (
              <li key={cle(l)} className="flex justify-between gap-3 px-3 py-1.5 text-sm text-ink-mid">
                <span>{l.name}</span>
                <span className="tabular-nums shrink-0 text-xs text-ink-soft">{quantite(l)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/* ── Plusieurs sessions à venir ────────────────────────────────────────────── */

function Retour({ onRetour }: { onRetour: () => void }) {
  return (
    <div className="mt-4 border-t border-[rgba(31,42,55,0.06)] pt-4 print:hidden">
      <button
        onClick={onRetour}
        className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft hover:text-navy"
      >
        ← Toutes mes sessions
      </button>
    </div>
  )
}

/** Ce qu'on cuisine : les plats réservés, avec leurs portions. */
function Plats({ booking }: { booking: Booking }) {
  const plats = booking.meals ?? []
  if (plats.length === 0) return null
  return (
    <p className="mt-1 text-sm text-ink-mid">
      <span className="font-semibold text-navy">Au menu : </span>
      {plats.map((m) => `${m.name ?? 'Plat'} (${m.portions} portion${m.portions > 1 ? 's' : ''})`).join(' · ')}
    </p>
  )
}

/** Le point d'entrée : une carte par session réservée, la liste s'ouvre au clic. */
function Sessions({ sessions, onChoisir }: { sessions: Booking[]; onChoisir: (id: string) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-mid">Choisissez la session dont vous voulez la liste de courses.</p>
      {sessions.map((b) => (
        <button
          key={b.id}
          onClick={() => onChoisir(b.id)}
          className="card-shell block w-full rounded-2xl p-5 text-left transition-colors hover:bg-cream-soft"
        >
          <p className="eyebrow mb-1">{sessionLabel(b)}</p>
          <Plats booking={b} />
          <p className="mt-1 text-xs text-ink-soft">{bookingStatusText(b.status)}</p>
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
