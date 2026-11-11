'use client'

import { Suspense, useEffect, useId, useMemo, useRef, useState } from 'react'
import CityField from '@/components/chef/application/CityField'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChefHat,
  Clock,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Send,
  Trash2,
} from 'lucide-react'
import DatePicker from '@/components/shared/DatePicker'
import { Prix } from '@/components/shared/Prix'
import { dayKey } from '@/lib/time'
import { ApiError } from '@/lib/api/client'
import { useChefPublic, useWeekMenus } from '@/lib/api/menus'
import {
  SLOT_LABEL,
  centsToEuros,
  dayLabel,
  useAcceptOffer,
  useCancelQuote,
  useCreateQuote,
  useDeclineOffer,
  useMarkQuoteSeen,
  useMyQuotes,
  type Quote,
  type QuoteStatus,
  type TimeSlot,
} from '@/lib/api/quotes'

/* ─────────────────────────────────────────────────────────────────────────────
   Demande sur-mesure.

   Deux gestes, pas un : **décrire** ce qu'on veut, puis **répondre** à l'offre
   qui revient. L'écran les sépare — le formulaire tient la colonne de travail,
   les demandes en cours tiennent le rail de droite — parce qu'on ne revient
   pas ici pour la même raison la deuxième fois.

   Ce qui a été repris :

   - le formulaire était une colonne de onze champs d'affilée ; il est
     désormais en trois temps (la prestation, la cuisine, le lieu), chacun
     introduit par son titre, séparé par un filet ;
   - le calendrier était posé dans une grille à deux colonnes face à un menu
     déroulant : il écrasait la ligne et désalignait tout ce qui suivait. Il a
     maintenant son bloc, avec les créneaux et les quantités à côté de lui ;
   - les libellés étaient en capitales monospacées de 11 px — un costume de
     champ technique sur un formulaire qu'on lit vite. Ce sont des `<label>`
     ordinaires, reliés à leur champ ;
   - la page tutoyait quand tout le reste de l'espace client vouvoie.

   La logique — validations, codes d'erreur de l'API, mutations — n'a pas
   bougé d'une ligne : c'est la même demande qui part.
   ───────────────────────────────────────────────────────────────────────────── */

const STATUS_LABEL: Record<QuoteStatus, string> = {
  submitted: 'Envoyée',
  in_review: 'En cours d’étude',
  quoted: 'Offre reçue',
  accepted: 'Confirmée',
  declined: 'Offre refusée',
  chef_declined: 'À réattribuer',
  cancelled: 'Retirée',
  closed: 'Sans suite',
}

/** La pastille d'état : une couleur par famille, pas une par statut. */
const STATUS_DOT: Record<QuoteStatus, string> = {
  submitted: 'bg-mint-deep',
  in_review: 'bg-mint-deep',
  quoted: 'bg-amber',
  accepted: 'bg-mint-deep',
  declined: 'bg-ink-soft',
  chef_declined: 'bg-amber',
  cancelled: 'bg-ink-soft',
  closed: 'bg-ink-soft',
}

const DIETS = ['Végétarien', 'Vegan', 'Sans-gluten', 'Sans-lactose', 'Halal', 'Casher', 'High-protein']
const SLOTS: TimeSlot[] = ['morning', 'afternoon', 'evening']

/** Un jour à `n` jours d'ici, en date locale, au format des champs date. */
function dayFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Demain : l'API refuse une prestation pour le jour même. */
const tomorrow = () => dayFromNow(1)
/** Un an : au-delà, l'API refuse aussi. */
const latest = () => dayFromNow(365)

/* Les mêmes règles que l'API (`quote.dto.ts`). Elles sont répétées ici pour le
   confort — un message clair avant l'envoi — jamais pour la sécurité : c'est
   l'API qui fait foi, et elle revérifie tout. */
const HAS_LETTER = /\p{L}/u
const CITY = /^\p{L}[\p{L} .'’-]*$/u
const MAX_BUDGET_EUROS = 100_000

/* Un code connu est dit tel quel, même en 502/504 : `GEO_UNAVAILABLE` vient
   d'un service tiers, et « réessayez dans un instant » sans dire pourquoi ne
   suffisait pas. */
const errorText = (error: unknown, fallback: string) =>
  error instanceof ApiError && error.status !== 0
    ? (MESSAGES[(error.body as { code?: string } | null)?.code ?? ''] ?? fallback)
    : fallback

/** Les refus de l'API que le client peut comprendre et corriger. */
const MESSAGES: Record<string, string> = {
  DATE_TOO_SOON: 'Choisissez une date à partir de demain.',
  DATE_TOO_FAR: 'Choisissez une date dans l’année qui vient.',
  DUPLICATE_REQUEST: 'Cette demande vient déjà d’être envoyée : elle est dans votre liste.',
  TOO_MANY_OPEN_REQUESTS:
    'Vous avez déjà 10 demandes en cours. Retirez-en une avant d’en envoyer une nouvelle.',
  CHEF_NOT_AVAILABLE: 'Ce batch cooker n’est plus disponible. Choisissez-en un autre.',
  SAME_PERSON: 'Vous ne pouvez pas vous adresser une demande à vous-même.',
  OFFER_EXPIRED: 'Cette offre a expiré. Le batch cooker peut vous en proposer une nouvelle.',
  OFFER_NOT_ACTIVE: 'Cette offre n’est plus en attente.',
  QUOTE_ALREADY_ACCEPTED: 'Cette demande est déjà confirmée.',
  ADDRESS_CITY_MISMATCH:
    'Cette ville ne correspond pas au code postal. Choisissez la commune dans la liste.',
  ADDRESS_NOT_FOUND:
    'Cette adresse est introuvable dans ce code postal. Vérifiez le numéro et le nom de la rue.',
  GEO_UNAVAILABLE:
    'La vérification de l’adresse est momentanément indisponible. Réessayez dans quelques minutes.',
}

export default function PersonnalisationPage() {
  // `useSearchParams` impose une frontière Suspense au rendu statique.
  return (
    <Suspense fallback={null}>
      <Personnalisation />
    </Suspense>
  )
}

function Personnalisation() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-10">
      <RequestForm />
      <MyRequests />
    </div>
  )
}

/* ── Le formulaire ────────────────────────────────────────────────────────── */

function RequestForm() {
  const preselected = useSearchParams().get('chef') ?? ''
  const week = useWeekMenus({ limit: 50 })
  // Le batch cooker venu d'un lien peut ne pas être dans les cartes de la semaine.
  const linked = useChefPublic(preselected || undefined)
  const create = useCreateQuote()
  const champ = useId()

  const [chefId, setChefId] = useState(preselected)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState<TimeSlot>('evening')
  const [persons, setPersons] = useState(3)
  const [meals, setMeals] = useState(4)
  const [cuisine, setCuisine] = useState('')
  const [diets, setDiets] = useState<string[]>([])
  const [allergies, setAllergies] = useState('')
  const [brief, setBrief] = useState('')
  const [addressLine, setAddressLine] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [city, setCity] = useState('')
  const [budget, setBudget] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const alerte = useRef<HTMLParagraphElement>(null)

  const chefs = useMemo(() => {
    const list = (week.data?.data ?? []).map((card) => ({
      id: card.chef.id,
      label: card.chef.city ? `${card.chef.displayName} · ${card.chef.city}` : card.chef.displayName,
    }))
    if (linked.data && !list.some((c) => c.id === linked.data.id)) {
      list.unshift({
        id: linked.data.id,
        label: linked.data.city ? `${linked.data.displayName} · ${linked.data.city}` : linked.data.displayName,
      })
    }
    return list
  }, [week.data, linked.data])

  const toggle = (d: string) =>
    setDiets((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]))

  /** Les allergies saisies : nettoyées, sans vide ni doublon. */
  const allergyList = () => {
    const seen = new Set<string>()
    return allergies
      .split(',')
      .map((a) => a.trim().replace(/\s+/g, ' '))
      .filter((a) => {
        const key = a.toLowerCase()
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
  }

  /** Ce qui manque, dans les mots du formulaire — avant de solliciter l'API. */
  const missing = (): string | null => {
    if (title.trim().length < 3 || !HAS_LETTER.test(title)) return 'Donnez un titre à votre demande.'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Choisissez la date souhaitée.'
    if (date < tomorrow()) return MESSAGES.DATE_TOO_SOON
    if (date > latest()) return MESSAGES.DATE_TOO_FAR
    if (cuisine.trim().length < 2 || !HAS_LETTER.test(cuisine)) return 'Indiquez le style culinaire.'
    const labels = allergyList()
    if (labels.length > 20) return 'Indiquez 20 allergies au plus.'
    if (labels.some((a) => a.length > 60)) {
      return 'Une allergie tient en quelques mots : séparez-les par des virgules.'
    }
    if (brief.trim().length < 10 || !HAS_LETTER.test(brief)) {
      return 'Décrivez votre demande en quelques phrases.'
    }
    if (addressLine.trim().length < 3 || !HAS_LETTER.test(addressLine)) {
      return 'Indiquez l’adresse de la prestation : numéro et rue.'
    }
    if (!/^\d{5}$/.test(postalCode.trim())) return 'Le code postal compte 5 chiffres.'
    if (!CITY.test(city.trim())) return 'Indiquez le nom de la ville.'
    if (budget.trim()) {
      const euros = Number(budget.replace(',', '.'))
      if (!Number.isFinite(euros) || euros <= 0) return 'Le budget est un montant en euros.'
      if (euros > MAX_BUDGET_EUROS) return 'Le budget indiqué est trop élevé.'
    }
    return null
  }

  /** Ce qui manque est dit, puis lu : l'alerte prend le focus. */
  const signale = (probleme: string | null) => {
    setError(probleme)
    if (probleme) requestAnimationFrame(() => alerte.current?.focus())
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const problem = missing()
    signale(problem)
    if (problem) return

    create.mutate(
      {
        title: title.trim(),
        chefProfileId: chefId || undefined,
        desiredDate: date,
        timeSlot: slot,
        persons,
        mealsCount: meals,
        cuisine: cuisine.trim(),
        diet: diets,
        allergies: allergyList(),
        brief: brief.trim(),
        addressLine: addressLine.trim(),
        addressCity: city.trim(),
        addressPostalCode: postalCode.trim(),
        budgetCents: budget.trim() ? Math.round(Number(budget.replace(',', '.')) * 100) : undefined,
      },
      {
        onSuccess: () => {
          setSent(true)
          setTitle('')
          setBrief('')
          setBudget('')
          setTimeout(() => setSent(false), 5000)
        },
        onError: (cause) =>
          signale(errorText(cause, 'La demande n’a pas pu être envoyée. Réessayez dans un instant.')),
      },
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="h-fit card-shell rounded-3xl p-6 lg:p-8"
    >
      <h2 className="font-display text-2xl font-bold leading-tight text-navy">
        Décrivez ce que vous avez{' '}
        <span className="font-medium italic text-terra">en tête.</span>
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-mid">
        Un batch cooker vous répond avec son prix. Vous acceptez, et la prestation entre à
        votre agenda. Le règlement se fait après la prestation.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-8" noValidate>
        {/* ── 1. La prestation ──────────────────────────────────────── */}
        <Bloc titre="La prestation">
          <Field label="Titre de la demande" htmlFor={`${champ}-titre`}>
            <input
              id={`${champ}-titre`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
              placeholder="Ex. Les repas de la semaine pour 4"
              className="input-base"
            />
          </Field>

          <Field
            label="Votre batch cooker"
            htmlFor={`${champ}-chef`}
            hint="Sans choix de votre part, Lab’s Food attribue la demande au batch cooker le mieux placé."
          >
            <select
              id={`${champ}-chef`}
              value={chefId}
              onChange={(e) => setChefId(e.target.value)}
              className="input-base"
            >
              <option value="">Laisser Lab’s Food me proposer quelqu’un</option>
              {chefs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>

          {/* Le calendrier a son bloc : face à un menu déroulant, il écrasait
              la ligne et désalignait la suite du formulaire. */}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-navy">Quand</legend>
            {/* Empilés, pas côte à côte : le calendrier prend la largeur qu'il
                lui faut, et tout ce qui le flanquait — créneaux, compteurs —
                finissait écrasé dans ce qui restait. */}
            <div className="space-y-5">
              <DatePicker
                mode="single"
                selected={date ? new Date(`${date}T12:00:00`) : undefined}
                onSelect={(d) => d && setDate(dayKey(d))}
                disabled={{
                  before: new Date(`${tomorrow()}T00:00:00`),
                  after: new Date(`${latest()}T00:00:00`),
                }}
                startMonth={new Date(`${tomorrow()}T00:00:00`)}
                className="w-fit rounded-2xl bg-cream-soft p-3"
              />

              <div>
                <p className="mb-2 text-sm font-semibold text-navy">Créneau</p>
                <div className="flex flex-wrap gap-2">
                  {SLOTS.map((s) => {
                    const on = s === slot
                    return (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setSlot(s)}
                        aria-pressed={on}
                        className={`rounded-xl border px-4 py-2.5 text-sm transition-colors ${
                          on
                            ? 'border-amber bg-amber-soft font-semibold text-navy'
                            : 'border-[rgba(31,42,55,0.12)] bg-cream-soft text-ink-mid hover:border-amber/50 hover:text-navy'
                        }`}
                      >
                        {SLOT_LABEL[s]}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-5">
                <Counter label="Personnes" value={persons} onChange={setPersons} min={1} max={200} />
                <Counter label="Plats" value={meals} onChange={setMeals} min={1} max={50} />
              </div>
            </div>
            {date && (
              <p className="mt-3 text-sm text-ink-mid">
                Souhaité le{' '}
                <span className="font-semibold capitalize text-navy">{dayLabel(date)}</span>,{' '}
                {SLOT_LABEL[slot].toLowerCase()}.
              </p>
            )}
          </fieldset>
        </Bloc>

        {/* ── 2. La cuisine ─────────────────────────────────────────── */}
        <Bloc titre="La cuisine">
          <Field label="Style culinaire" htmlFor={`${champ}-cuisine`}>
            <input
              id={`${champ}-cuisine`}
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              maxLength={120}
              placeholder="Ex. méditerranéen, asiatique…"
              className="input-base"
            />
          </Field>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-navy">Régimes</legend>
            <div className="flex flex-wrap gap-2">
              {DIETS.map((d) => {
                const on = diets.includes(d)
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() => toggle(d)}
                    aria-pressed={on}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] transition-colors ${
                      on
                        ? 'bg-amber font-semibold text-navy'
                        : 'bg-cream-soft text-ink-mid hover:bg-cream-deep hover:text-navy'
                    }`}
                  >
                    {on ? (
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {d}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <Field
            label="Allergies"
            htmlFor={`${champ}-allergies`}
            hint="Séparées par des virgules. Elles sont transmises telles quelles au batch cooker."
          >
            <input
              id={`${champ}-allergies`}
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              maxLength={1300}
              placeholder="Ex. gluten, fruits à coque"
              className="input-base"
            />
          </Field>

          <Field
            label="Le brief"
            htmlFor={`${champ}-brief`}
            hint="Plus il est précis — cuissons, régimes, contenants —, plus l’offre arrive vite."
          >
            <textarea
              id={`${champ}-brief`}
              rows={5}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              maxLength={4000}
              placeholder="Ex. Les repas de la semaine, plutôt méditerranéens. Deux sans gluten, une végétarienne stricte. Des portions faciles à emporter le midi."
              className="input-base resize-y"
            />
          </Field>
        </Bloc>

        {/* ── 3. Le lieu et le budget ───────────────────────────────── */}
        <Bloc titre="Où, et pour quel budget">
          <Field
            label="Adresse de la prestation"
            htmlFor={`${champ}-adresse`}
            hint="Le batch cooker ne voit que la ville tant que vous n’avez pas accepté son offre."
          >
            <input
              id={`${champ}-adresse`}
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              maxLength={255}
              autoComplete="street-address"
              placeholder="Numéro et rue"
              className="input-base"
            />
            <div className="mt-3 grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3">
              <input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                inputMode="numeric"
                maxLength={5}
                autoComplete="postal-code"
                aria-label="Code postal"
                placeholder="Code postal"
                className="input-base"
              />
              <CityField bare id="request-city" postcode={postalCode} value={city} onChange={setCity} />
            </div>
          </Field>

          <Field
            label="Budget indicatif"
            htmlFor={`${champ}-budget`}
            hint="Facultatif, en euros. Il aide le batch cooker à calibrer sa proposition."
          >
            <input
              id={`${champ}-budget`}
              type="number"
              min={1}
              max={MAX_BUDGET_EUROS}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Ex. 400"
              className="input-base sm:max-w-[12rem]"
            />
          </Field>
        </Bloc>

        <div className="border-t border-[rgba(31,42,55,0.08)] pt-6">
          {error && (
            <p
              ref={alerte}
              role="alert"
              tabIndex={-1}
              className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-800 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-red-400"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={create.isPending}
            className="btn btn-primary disabled:opacity-60"
          >
            {create.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : sent ? (
              <Check className="h-4 w-4" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
            {sent ? 'Demande envoyée' : 'Envoyer la demande'}
            {!sent && !create.isPending && <ArrowRight className="icon-arrow h-4 w-4" aria-hidden />}
          </button>

          <p aria-live="polite" className="mt-3 text-sm leading-relaxed text-ink-soft">
            {sent
              ? 'Elle apparaît à droite. Vous serez prévenu dès qu’une offre arrive.'
              : 'Vous ne vous engagez à rien : c’est l’offre que vous accepterez, pas la demande.'}
          </p>
        </div>
      </form>
    </motion.section>
  )
}

/* ── Mes demandes ─────────────────────────────────────────────────────────── */

function MyRequests() {
  const quotes = useMyQuotes()
  const list = quotes.data ?? []

  return (
    <section className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-lg font-bold text-navy">Mes demandes</h2>
        {list.length > 0 && (
          <span className="text-sm tabular-nums text-ink-soft">{list.length}</span>
        )}
      </div>

      {quotes.isPending && (
        <div className="h-28 animate-pulse rounded-2xl bg-cream-soft" aria-hidden />
      )}

      {quotes.isError && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-800">
          Vos demandes n’ont pas pu être chargées.{' '}
          <button onClick={() => quotes.refetch()} className="font-semibold underline">
            Réessayer
          </button>
        </p>
      )}

      {quotes.isSuccess && list.length === 0 && (
        <div className="card-shell rounded-2xl p-5">
          <p className="text-sm leading-relaxed text-ink-mid">
            Vous n’avez pas encore de demande. Voici comment ça se passe :
          </p>
          <ol className="mt-4 space-y-3">
            {[
              'Vous décrivez la prestation, à gauche.',
              'Un batch cooker l’étudie et vous répond avec son prix.',
              'Vous acceptez, et la session entre à votre agenda.',
            ].map((texte, i) => (
              <li key={texte} className="flex gap-3 text-sm leading-relaxed text-navy">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-soft text-[11px] font-semibold text-amber-deep"
                >
                  {i + 1}
                </span>
                {texte}
              </li>
            ))}
          </ol>
        </div>
      )}

      {list.map((quote) => (
        <RequestCard key={quote.id} quote={quote} />
      ))}
    </section>
  )
}

function RequestCard({ quote }: { quote: Quote }) {
  const accept = useAcceptOffer()
  const decline = useDeclineOffer()
  const cancel = useCancelQuote()
  const seen = useMarkQuoteSeen()
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const offer = quote.activeOffer
  const busy = accept.isPending || decline.isPending || cancel.isPending
  const open =
    quote.status !== 'accepted' &&
    quote.status !== 'cancelled' &&
    quote.status !== 'closed'

  // L'offre est sous les yeux du client : on le dit au batch cooker, une fois.
  const told = useRef<string | null>(null)
  const { mutate: markSeen } = seen
  useEffect(() => {
    if (offer?.status === 'sent' && told.current !== offer.id) {
      told.current = offer.id
      markSeen(quote.id)
    }
  }, [offer?.id, offer?.status, quote.id, markSeen])

  const fail = (fallback: string) => (cause: unknown) => setError(errorText(cause, fallback))

  return (
    <article className="overflow-hidden card-shell rounded-2xl">
      <div className="p-5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold leading-snug text-navy">{quote.title}</h3>
          <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-ink-mid">
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[quote.status]}`} />
            {STATUS_LABEL[quote.status]}
          </span>
        </div>

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <ChefHat className="h-3.5 w-3.5 text-terra" aria-hidden />
            {quote.chef ? quote.chef.displayName : 'Batch cooker en cours d’attribution'}
          </span>
          <span className="tabular-nums">{quote.reference}</span>
        </p>

        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-mid">{quote.brief}</p>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
          <li className="tabular-nums">{quote.persons} personnes</li>
          <li className="tabular-nums">{quote.mealsCount} plats</li>
          {quote.desiredDate && (
            <li className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              {dayLabel(quote.desiredDate)}
            </li>
          )}
          {quote.address.city && (
            <li className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {quote.address.city}
            </li>
          )}
        </ul>

        {quote.diet.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {quote.diet.map((d) => (
              <span
                key={d}
                className="rounded-full bg-mint/60 px-2.5 py-1 text-[11px] font-medium text-mint-ink"
              >
                {d}
              </span>
            ))}
          </div>
        )}

        {quote.status === 'chef_declined' && (
          <Note>
            Le batch cooker n’est pas disponible pour cette demande. Notre équipe vous en
            propose un autre : vous pouvez attendre, ou retirer votre demande.
          </Note>
        )}
        {quote.status === 'submitted' && !quote.chef && (
          <Note>Notre équipe choisit le batch cooker qui vous répondra.</Note>
        )}
        {quote.status === 'declined' && (
          <Note>
            Vous avez refusé la dernière offre. Votre batch cooker peut vous en proposer une
            nouvelle.
          </Note>
        )}
        {quote.status === 'closed' && (
          <Note>
            Lab’s Food n’a pas donné suite à cette demande. Vous avez reçu un email qui
            l’explique — et vous pouvez en déposer une nouvelle quand vous voulez.
          </Note>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm leading-relaxed text-red-800">
            {error}
          </p>
        )}
      </div>

      {/* ── L'offre : c'est la décision du client, elle sort du corps ── */}
      {offer && (
        <div className="border-t border-amber/30 bg-amber-soft/50 p-5">
          <p className="text-xs text-ink-mid">
            Offre de {quote.chef?.displayName ?? 'votre batch cooker'}
          </p>
          <div className="mt-2">
            <Prix
              apresCredit={centsToEuros(offer.afterTaxCreditCents)}
              total={centsToEuros(offer.clientPriceCents)}
            />
          </div>

          {(offer.proposedDate || offer.proposedTimeSlot) && (
            <p className="mt-3 text-sm font-semibold capitalize text-navy">
              {dayLabel(offer.proposedDate ?? quote.desiredDate ?? '')}
              {', '}
              <span className="font-normal lowercase text-ink-mid">
                {SLOT_LABEL[offer.proposedTimeSlot ?? quote.timeSlot ?? 'evening'].toLowerCase()}
              </span>
            </p>
          )}
          {offer.conditions && (
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-mid">
              {offer.conditions}
            </p>
          )}
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-soft">
            <Clock className="h-3.5 w-3.5" aria-hidden /> Valable jusqu’au{' '}
            {dayLabel(offer.validUntil)}
          </p>

          {declining ? (
            <div className="mt-4 space-y-2">
              <label htmlFor={`refus-${offer.id}`} className="block text-sm font-semibold text-navy">
                Un mot pour votre batch cooker
              </label>
              <textarea
                id={`refus-${offer.id}`}
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={1000}
                placeholder="Facultatif"
                className="input-base resize-none text-sm"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  disabled={busy}
                  onClick={() =>
                    decline.mutate(
                      { quoteId: quote.id, offerId: offer.id, reason: reason.trim() || undefined },
                      {
                        onSuccess: () => setDeclining(false),
                        onError: fail('Le refus n’a pas pu être enregistré.'),
                      },
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-navy-deep disabled:opacity-60"
                >
                  {decline.isPending && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
                  Confirmer le refus
                </button>
                <button
                  onClick={() => setDeclining(false)}
                  className="text-xs font-semibold text-ink-mid underline-offset-4 hover:text-navy hover:underline"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                disabled={busy}
                onClick={() => {
                  setError(null)
                  accept.mutate(
                    { quoteId: quote.id, offerId: offer.id },
                    { onError: fail('L’offre n’a pas pu être acceptée. Réessayez dans un instant.') },
                  )
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-xs font-semibold text-amber transition-colors hover:bg-navy-deep disabled:opacity-60"
              >
                {accept.isPending && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
                Accepter et confirmer
              </button>
              <button
                disabled={busy}
                onClick={() => setDeclining(true)}
                className="text-xs font-semibold text-ink-mid underline-offset-4 hover:text-navy hover:underline"
              >
                Refuser
              </button>
              <Link
                href="/espace-client/messages"
                className="text-xs font-semibold text-ink-mid underline-offset-4 hover:text-navy hover:underline"
              >
                En discuter
              </Link>
            </div>
          )}
        </div>
      )}

      {quote.status === 'accepted' && quote.booking && (
        <div className="border-t border-mint-deep/30 bg-mint/50 p-5">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy">
            <Check className="h-4 w-4" aria-hidden /> Prestation confirmée
          </p>
          <p className="mt-1 text-xs text-ink-mid">
            Le{' '}
            {new Date(quote.booking.startsAt).toLocaleString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Europe/Paris',
            })}
            {quote.booking.reference ? ` · ${quote.booking.reference}` : ''}
          </p>
          {/* Le règlement se fait après la prestation : la page le dit si c'est trop tôt. */}
          <Link
            href={`/espace-client/commandes/${quote.booking.id}/paiement`}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-navy underline underline-offset-4"
          >
            Régler la prestation <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      )}

      {open && (
        <div className="border-t border-[rgba(31,42,55,0.07)] px-5 py-3">
          {confirmCancel ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
              <span className="text-ink-mid">Retirer cette demande ?</span>
              <button
                disabled={busy}
                onClick={() =>
                  cancel.mutate(quote.id, {
                    onSuccess: () => setConfirmCancel(false),
                    onError: fail('La demande n’a pas pu être retirée.'),
                  })
                }
                className="font-semibold text-red-700 underline-offset-4 hover:underline disabled:opacity-60"
              >
                Oui, la retirer
              </button>
              <button
                onClick={() => setConfirmCancel(false)}
                className="font-semibold text-ink-mid underline-offset-4 hover:text-navy hover:underline"
              >
                Non
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmCancel(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft transition-colors hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" aria-hidden /> Retirer ma demande
            </button>
          )}
        </div>
      )}
    </article>
  )
}

/* ── Les pièces du formulaire ─────────────────────────────────────────────── */

/** Un temps du formulaire : son titre, un filet, ses champs. */
function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="border-b border-[rgba(31,42,55,0.08)] pb-2 font-display text-base font-bold text-navy">
        {titre}
      </h3>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  )
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-navy">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{hint}</p>}
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 rounded-xl bg-cream-soft px-3.5 py-2.5 text-xs leading-relaxed text-ink-mid">
      {children}
    </p>
  )
}

function Counter({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  min: number
  max: number
}) {
  return (
    <div className="min-w-[9.5rem]">
      <p className="mb-2 text-sm font-semibold text-navy">{label}</p>
      <div className="flex items-center gap-2 rounded-full bg-cream-soft p-1.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Moins de ${label.toLowerCase()}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper text-navy transition-colors hover:bg-amber disabled:opacity-40 disabled:hover:bg-paper"
        >
          <Minus className="h-3.5 w-3.5" aria-hidden />
        </button>
        <span
          aria-live="polite"
          className="flex-1 text-center font-display text-xl font-bold tabular-nums text-navy"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Plus de ${label.toLowerCase()}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper text-navy transition-colors hover:bg-amber disabled:opacity-40 disabled:hover:bg-paper"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  )
}
