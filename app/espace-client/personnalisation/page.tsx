'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
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
  Plus,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react'
import DatePicker from '@/components/shared/DatePicker'
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

const STATUS_LABEL: Record<QuoteStatus, string> = {
  submitted: 'Envoyée',
  in_review: 'En cours d’étude',
  quoted: 'Offre reçue',
  accepted: 'Confirmée',
  declined: 'Offre refusée',
  chef_declined: 'À réattribuer',
  cancelled: 'Retirée',
}

const STATUS_COLOR: Record<QuoteStatus, string> = {
  submitted: 'bg-mint text-mint-ink',
  in_review: 'bg-amber-soft text-amber-deep',
  quoted: 'bg-amber text-navy',
  accepted: 'bg-mint-deep text-mint-ink',
  declined: 'bg-cream-deep text-navy',
  chef_declined: 'bg-amber-soft text-amber-deep',
  cancelled: 'bg-cream-deep text-ink-mid',
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

const errorText = (error: unknown, fallback: string) =>
  error instanceof ApiError && error.status !== 0 && error.status < 500
    ? (MESSAGES[(error.body as { code?: string } | null)?.code ?? ''] ?? fallback)
    : fallback

/** Les refus de l'API que le client peut comprendre et corriger. */
const MESSAGES: Record<string, string> = {
  DATE_TOO_SOON: 'Choisis une date à partir de demain.',
  DATE_TOO_FAR: 'Choisis une date dans l’année qui vient.',
  DUPLICATE_REQUEST: 'Cette demande vient déjà d’être envoyée : elle est dans ta liste.',
  TOO_MANY_OPEN_REQUESTS: 'Tu as déjà 10 demandes en cours. Retires-en une avant d’en envoyer une nouvelle.',
  CHEF_NOT_AVAILABLE: 'Ce batch cooker n’est plus disponible. Choisis-en un autre.',
  SAME_PERSON: 'Tu ne peux pas t’adresser une demande à toi-même.',
  OFFER_EXPIRED: 'Cette offre a expiré. Le batch cooker peut t’en proposer une nouvelle.',
  OFFER_NOT_ACTIVE: 'Cette offre n’est plus en attente.',
  QUOTE_ALREADY_ACCEPTED: 'Cette demande est déjà confirmée.',
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
    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
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

  const [chefId, setChefId] = useState(preselected)
  const [title, setTitle] = useState('')
  const [occasion, setOccasion] = useState('')
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
    if (title.trim().length < 3 || !HAS_LETTER.test(title)) return 'Donne un titre à ta demande.'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Choisis la date souhaitée.'
    if (date < tomorrow()) return MESSAGES.DATE_TOO_SOON
    if (date > latest()) return MESSAGES.DATE_TOO_FAR
    if (cuisine.trim().length < 2 || !HAS_LETTER.test(cuisine)) return 'Indique le style culinaire.'
    const labels = allergyList()
    if (labels.length > 20) return 'Indique 20 allergies au plus.'
    if (labels.some((a) => a.length > 60)) {
      return 'Une allergie tient en quelques mots : sépare-les par des virgules.'
    }
    if (brief.trim().length < 10 || !HAS_LETTER.test(brief)) return 'Décris ta demande en quelques phrases.'
    if (addressLine.trim().length < 3 || !HAS_LETTER.test(addressLine)) {
      return 'Indique l’adresse de la prestation : numéro et rue.'
    }
    if (!/^\d{5}$/.test(postalCode.trim())) return 'Le code postal compte 5 chiffres.'
    if (!CITY.test(city.trim())) return 'Indique le nom de la ville.'
    if (budget.trim()) {
      const euros = Number(budget.replace(',', '.'))
      if (!Number.isFinite(euros) || euros <= 0) return 'Le budget est un montant en euros.'
      if (euros > MAX_BUDGET_EUROS) return 'Le budget indiqué est trop élevé.'
    }
    return null
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const problem = missing()
    setError(problem)
    if (problem) return

    create.mutate(
      {
        title: title.trim(),
        chefProfileId: chefId || undefined,
        occasion: occasion.trim() || undefined,
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
          setOccasion('')
          setBrief('')
          setBudget('')
          setTimeout(() => setSent(false), 5000)
        },
        onError: (cause) => setError(errorText(cause, 'La demande n’a pas pu être envoyée. Réessaie dans un instant.')),
      },
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-paper rounded-3xl p-6 lg:p-8 border border-[rgba(31,42,55,0.06)] h-fit"
    >
      <p className="eyebrow mb-3">Nouvelle demande</p>
      <h2 className="font-display text-2xl font-bold text-navy mb-2">
        Décris ce que tu as <span className="text-terra italic font-medium">en tête.</span>
      </h2>
      <p className="text-ink-mid text-sm mb-6 leading-relaxed">
        Ton batch cooker te répond avec son prix. Tu acceptes, et la prestation est inscrite à ton
        agenda. Le règlement se fait après la prestation.
      </p>

      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field label="Titre de la demande">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            placeholder="Ex. Dîner d’anniversaire pour 12"
            className="input-base"
          />
        </Field>

        <Field label="Ton batch cooker">
          <select value={chefId} onChange={(e) => setChefId(e.target.value)} className="input-base">
            <option value="">Laisser Lab’s Food me proposer quelqu’un</option>
            {chefs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Date souhaitée">
            <DatePicker
              mode="single"
              selected={date ? new Date(`${date}T12:00:00`) : undefined}
              onSelect={(d) => d && setDate(dayKey(d))}
              disabled={{
                before: new Date(`${tomorrow()}T00:00:00`),
                after: new Date(`${latest()}T00:00:00`),
              }}
              startMonth={new Date(`${tomorrow()}T00:00:00`)}
              className="rounded-2xl bg-cream-soft p-2"
            />
          </Field>
          <Field label="Créneau">
            <select value={slot} onChange={(e) => setSlot(e.target.value as TimeSlot)} className="input-base">
              {SLOTS.map((s) => (
                <option key={s} value={s}>
                  {SLOT_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Counter label="Personnes" value={persons} onChange={setPersons} min={1} max={200} />
          <Counter label="Plats" value={meals} onChange={setMeals} min={1} max={50} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Style culinaire">
            <input
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              maxLength={120}
              placeholder="Ex. Méditerranéen, asiatique…"
              className="input-base"
            />
          </Field>
          <Field label="Occasion (facultatif)">
            <input
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              maxLength={160}
              placeholder="Ex. Anniversaire, brunch…"
              className="input-base"
            />
          </Field>
        </div>

        <Field label="Régimes">
          <div className="flex flex-wrap gap-2">
            {DIETS.map((d) => {
              const on = diets.includes(d)
              return (
                <button
                  type="button"
                  key={d}
                  onClick={() => toggle(d)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                    on
                      ? 'bg-amber text-navy font-semibold'
                      : 'bg-cream-soft text-ink-mid hover:bg-cream-deep'
                  }`}
                >
                  {on ? <Check className="w-3 h-3 inline mr-1" /> : <Plus className="w-3 h-3 inline mr-1" />}
                  {d}
                </button>
              )
            })}
          </div>
        </Field>

        <Field label="Allergies (séparées par des virgules)">
          <input
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            maxLength={1300}
            placeholder="Ex. gluten, fruits à coque"
            className="input-base"
          />
        </Field>

        <Field label="Le brief (raconte tout)">
          <textarea
            rows={5}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            maxLength={4000}
            placeholder="Ex. Brunch des 30 ans, ambiance Méditerranée. 2 sans gluten, une végétarienne stricte. Un dessert wow attendu."
            className="input-base resize-none"
          />
        </Field>

        <Field label="Adresse de la prestation">
          <input
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
            maxLength={255}
            autoComplete="street-address"
            placeholder="Numéro et rue"
            className="input-base"
          />
          <div className="grid grid-cols-[120px_1fr] gap-3 mt-3">
            <input
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              inputMode="numeric"
              maxLength={5}
              autoComplete="postal-code"
              placeholder="Code postal"
              className="input-base"
            />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={120}
              autoComplete="address-level2"
              placeholder="Ville"
              className="input-base"
            />
          </div>
          <p className="text-[11px] text-ink-soft mt-1.5">
            Ton batch cooker ne voit que la ville tant que tu n’as pas accepté son offre.
          </p>
        </Field>

        <Field label="Budget indicatif en € (facultatif)">
          <input
            type="number"
            min={1}
            max={MAX_BUDGET_EUROS}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="Ex. 400"
            className="input-base"
          />
        </Field>

        {error && (
          <p role="alert" className="text-sm text-red-700 bg-red-100 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={create.isPending} className="btn btn-primary disabled:opacity-60">
            {create.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : sent ? (
              <Check className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {sent ? 'Demande envoyée !' : 'Envoyer la demande'}
            {!sent && !create.isPending && <ArrowRight className="w-4 h-4 icon-arrow" />}
          </button>
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
    <section className="space-y-4">
      <h3 className="font-display text-lg font-bold text-navy">Mes demandes</h3>

      {quotes.isPending && <p className="text-sm text-ink-soft">Chargement…</p>}
      {quotes.isError && (
        <p className="text-sm text-red-700">
          Impossible de charger tes demandes.{' '}
          <button onClick={() => quotes.refetch()} className="underline font-semibold">
            Réessayer
          </button>
        </p>
      )}
      {quotes.isSuccess && list.length === 0 && (
        <div className="bg-paper rounded-3xl p-5 border border-[rgba(31,42,55,0.06)] text-sm text-ink-mid">
          Tu n’as pas encore de demande. Remplis le formulaire : ton batch cooker te répond avec son
          prix.
        </div>
      )}

      {list.map((quote) => (
        <RequestCard key={quote.id} quote={quote} />
      ))}

      <div className="rounded-3xl border border-dashed border-amber/40 bg-amber-soft/30 p-5 text-sm text-ink-mid">
        <p className="font-semibold text-navy mb-1 inline-flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber" /> Astuce
        </p>
        Plus le brief est précis (cuisson, événement, allergies), plus l’offre arrive vite.
      </div>
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
  const open = quote.status !== 'accepted' && quote.status !== 'cancelled'

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
    <div className="bg-paper rounded-3xl p-5 border border-[rgba(31,42,55,0.06)]">
      <div className="flex items-start justify-between gap-3 mb-1">
        <p className="font-semibold text-navy text-sm leading-tight">{quote.title}</p>
        <span
          className={`shrink-0 text-[10px] uppercase tracking-[0.12em] font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOR[quote.status]}`}
        >
          {STATUS_LABEL[quote.status]}
        </span>
      </div>
      <p className="text-[11px] text-ink-soft font-mono mb-2">{quote.reference}</p>

      <p className="text-xs text-ink-mid mb-3 inline-flex items-center gap-1.5">
        <ChefHat className="w-3.5 h-3.5 text-terra" />
        {quote.chef ? quote.chef.displayName : 'Batch cooker en cours d’attribution'}
      </p>

      <p className="text-xs text-ink-soft mb-3 line-clamp-3 leading-relaxed">{quote.brief}</p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <Chip>{quote.persons} pers.</Chip>
        <Chip>{quote.mealsCount} plats</Chip>
        {quote.desiredDate && (
          <Chip>
            <CalendarDays className="w-3 h-3 inline mr-1" />
            {dayLabel(quote.desiredDate)}
          </Chip>
        )}
        {quote.address.city && (
          <Chip>
            <MapPin className="w-3 h-3 inline mr-1" />
            {quote.address.city}
          </Chip>
        )}
        {quote.diet.map((d) => (
          <span key={d} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-soft text-amber-deep font-mono">
            {d}
          </span>
        ))}
      </div>

      {quote.status === 'chef_declined' && (
        <Note>
          Le batch cooker n’est pas disponible pour cette demande. Notre équipe t’en propose un
          autre : tu peux attendre, ou retirer ta demande.
        </Note>
      )}
      {quote.status === 'submitted' && !quote.chef && (
        <Note>Notre équipe choisit le batch cooker qui te répondra.</Note>
      )}
      {quote.status === 'declined' && (
        <Note>Tu as refusé la dernière offre. Ton batch cooker peut t’en proposer une nouvelle.</Note>
      )}

      {offer && (
        <div className="rounded-xl bg-amber-soft/60 border border-amber/30 p-3 text-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-amber-deep font-mono mb-1">
            Offre de {quote.chef?.displayName ?? 'ton batch cooker'}
          </p>
          <p className="font-display text-xl font-bold text-navy">{centsToEuros(offer.clientPriceCents)}</p>
          <p className="text-[11px] text-ink-mid">
            soit {centsToEuros(offer.afterTaxCreditCents)} après crédit d’impôt
          </p>
          {(offer.proposedDate || offer.proposedTimeSlot) && (
            <p className="text-[11px] text-navy mt-1.5 font-semibold">
              Proposé : {dayLabel(offer.proposedDate ?? quote.desiredDate ?? '')}
              {', '}
              {SLOT_LABEL[offer.proposedTimeSlot ?? quote.timeSlot ?? 'evening'].toLowerCase()}
            </p>
          )}
          {offer.conditions && (
            <p className="text-[11px] text-ink-mid mt-1.5 italic whitespace-pre-line">{offer.conditions}</p>
          )}
          <p className="text-[11px] text-ink-soft mt-1.5 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Valable jusqu’au {dayLabel(offer.validUntil)}
          </p>

          {declining ? (
            <div className="mt-3 space-y-2">
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={1000}
                placeholder="Un mot pour ton batch cooker (facultatif)"
                className="input-base resize-none text-xs"
              />
              <div className="flex gap-2">
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
                  className="text-[11px] font-semibold bg-navy text-white rounded-full px-3 py-1.5 disabled:opacity-60"
                >
                  Confirmer le refus
                </button>
                <button
                  onClick={() => setDeclining(false)}
                  className="text-[11px] font-semibold text-ink-mid hover:text-navy"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                disabled={busy}
                onClick={() => {
                  setError(null)
                  accept.mutate(
                    { quoteId: quote.id, offerId: offer.id },
                    { onError: fail('L’offre n’a pas pu être acceptée. Réessaie dans un instant.') },
                  )
                }}
                className="text-[11px] font-semibold bg-navy text-amber rounded-full px-3 py-1.5 disabled:opacity-60 inline-flex items-center gap-1.5"
              >
                {accept.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Accepter et confirmer
              </button>
              <button
                disabled={busy}
                onClick={() => setDeclining(true)}
                className="text-[11px] font-semibold text-ink-mid hover:text-navy"
              >
                Refuser
              </button>
              <Link href="/espace-client/messages" className="text-[11px] font-semibold text-ink-mid hover:text-navy py-1.5">
                Discuter
              </Link>
            </div>
          )}
        </div>
      )}

      {quote.status === 'accepted' && quote.booking && (
        <div className="rounded-xl bg-mint/60 border border-mint-deep/30 p-3 text-sm">
          <p className="font-semibold text-navy inline-flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Prestation confirmée
          </p>
          <p className="text-[11px] text-ink-mid mt-1">
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
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-navy underline"
          >
            Régler la prestation <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs text-red-700">
          {error}
        </p>
      )}

      {open && (
        <div className="mt-3 pt-3 border-t border-[rgba(31,42,55,0.06)]">
          {confirmCancel ? (
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-ink-mid">Retirer cette demande ?</span>
              <button
                disabled={busy}
                onClick={() =>
                  cancel.mutate(quote.id, {
                    onSuccess: () => setConfirmCancel(false),
                    onError: fail('La demande n’a pas pu être retirée.'),
                  })
                }
                className="font-semibold text-red-700 disabled:opacity-60"
              >
                Oui, la retirer
              </button>
              <button onClick={() => setConfirmCancel(false)} className="font-semibold text-ink-mid">
                Non
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmCancel(true)}
              className="text-[11px] font-semibold text-ink-soft hover:text-red-700 inline-flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Retirer ma demande
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-cream-soft text-navy font-mono">{children}</span>
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-ink-mid bg-cream-soft rounded-xl px-3 py-2 mb-3 leading-relaxed">{children}</p>
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
    <div>
      <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-soft mb-2">{label}</p>
      <div className="flex items-center gap-3 bg-cream-soft rounded-full p-1.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-full bg-paper text-navy font-bold flex items-center justify-center hover:bg-amber hover:text-navy transition-colors"
        >
          –
        </button>
        <span className="flex-1 text-center font-display text-xl font-bold text-navy">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-8 h-8 rounded-full bg-paper text-navy font-bold flex items-center justify-center hover:bg-amber transition-colors"
        >
          +
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-soft mb-2">{label}</p>
      {children}
    </div>
  )
}
