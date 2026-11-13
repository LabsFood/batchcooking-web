'use client'

import { Suspense, use, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  BadgeEuro,
  CalendarRange,
  ChefHat,
  Clock,
  CreditCard,
  FileCheck2,
  Info,
  Loader2,
  Lock,
  Paperclip,
  ShieldCheck,
  Ticket,
} from 'lucide-react'
import { ApiError } from '@/lib/api/client'
import {
  CESU_ISSUERS,
  useCardCheckout,
  useDeclareCesu,
  useUploadCesuProof,
  PREUVE_MAX_MO,
  verifiePreuve,
  usePaymentOptions,
  useRequestUrssafLink,
  useSettleWithUrssaf,
  type CesuIssuer,
  type CesuMedium,
  type MethodOption,
  type PaymentMethodId,
  type PaymentOptions,
} from '@/lib/api/payments'
import { PAYMENT_METHODS } from '@/lib/client/payments'
import MockSettlement from './MockSettlement'
import { useMeProfile } from '@/lib/api/me-profile'
import { consentGaps, useBookingConsents, type ContractGap } from '@/lib/api/contract'
import { ContractBoxes, allTicked, consentsOf, type Ticks } from '@/components/client/ContractBoxes'

/* ─────────────────────────────────────────────────────────────────────────────
   Règlement d'une prestation réalisée (FLOW-03).

   Une page et pas une modale : un paiement doit survivre à un rechargement,
   se partager par lien, et revenir de Stripe sur une URL. Le choix du moyen
   n'est pas cosmétique — il change le montant dû aujourd'hui, donc chaque
   option porte son montant, et c'est ce montant qui décide.

   Tout vient de `GET /me/bookings/{id}/payment-options` : l'état, les montants,
   les moyens que ce batch cooker accepte. Revenir de Stripe ne prouve rien —
   on relit l'état jusqu'à ce que l'API dise « réglé ».

   Les prestations de démonstration (identifiants `ord_…`) gardent leur écran
   simulé, `MockSettlement`, tant que la liste des prestations tourne sur les
   mocks.
   ───────────────────────────────────────────────────────────────────────────── */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const METHOD_ICON: Record<PaymentMethodId, typeof CreditCard> = {
  urssaf: BadgeEuro,
  card: CreditCard,
  cesu: Ticket,
}

const euros = (cents: number) =>
  (cents / 100).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  })

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  })

/** Les refus que le client peut comprendre ; le reste donne le message générique. */
const MESSAGES: Record<string, string> = {
  AMOUNT_MISMATCH: 'Le montant dû a changé. La page vient d’être mise à jour : vérifiez et recommencez.',
  BOOKING_NOT_DUE: 'Cette prestation n’a pas encore eu lieu.',
  CHEF_UNAVAILABLE: 'Ce batch cooker ne peut pas recevoir de paiement pour le moment. Réessayez plus tard.',
  URSSAF_REQUEST_PENDING: 'Votre demande est déjà transmise à l’URSSAF.',
  URSSAF_UNAVAILABLE: 'L’URSSAF ne répond pas pour le moment. Réessayez, ou choisissez un autre moyen.',
}

const errorText = (error: unknown, fallback: string) => {
  if (!(error instanceof ApiError) || error.status === 0) return fallback
  const code = (error.body as { code?: string } | null)?.code ?? ''
  if (MESSAGES[code]) return MESSAGES[code]
  if (error.status === 503) return 'Le paiement par carte n’est pas encore ouvert. Réessayez plus tard.'
  return fallback
}

export default function SettlementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  if (!UUID.test(id)) return <MockSettlement id={id} />
  // `useSearchParams` impose une frontière Suspense au rendu statique.
  return (
    <Suspense fallback={null}>
      <Settlement id={id} />
    </Suspense>
  )
}

function Settlement({ id }: { id: string }) {
  const back = useSearchParams().get('paiement')
  // De retour de Stripe : le webhook peut arriver quelques secondes après nous.
  const options = usePaymentOptions(id, { watch: back === 'succes' })

  if (options.isPending) {
    return (
      <Shell>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-ink-soft" />
      </Shell>
    )
  }
  if (options.isError) {
    if (options.error instanceof ApiError && options.error.status === 404) return <NotFound />
    return (
      <Shell>
        <h1 className="font-display text-2xl font-bold text-navy">Impossible de charger le règlement</h1>
        <button onClick={() => options.refetch()} className="btn btn-primary mt-6 text-xs">
          Réessayer
        </button>
      </Shell>
    )
  }

  const data = options.data
  if (data.status === 'paid') return <Settled data={data} />
  if (data.status === 'not-due') {
    return <TooEarly date={longDate(data.startsAt)} bookingId={data.bookingId} />
  }
  if (data.status === 'processing') return <Processing data={data} />
  if (back === 'succes') return <Confirming />
  return <Form data={data} cancelled={back === 'annule'} />
}

/* ── Le choix du moyen ────────────────────────────────────────────────────── */

function Form({ data, cancelled }: { data: PaymentOptions; cancelled: boolean }) {
  const firstName = data.chef.displayName.split(' ')[0]
  const [method, setMethod] = useState<PaymentMethodId | null>(
    () => data.methods.find((m) => m.available)?.id ?? null,
  )
  const [cesuAmount, setCesuAmount] = useState('')
  // Seul l'e-CESU est proposé : le papier n'est plus accepté.
  const medium: CesuMedium = 'ecesu'
  const [preuve, setPreuve] = useState<File | null>(null)
  const [preuveRef, setPreuveRef] = useState('')
  const [issuer, setIssuer] = useState<CesuIssuer>('pluxee')
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(
    data.status === 'failed'
      ? 'Le dernier règlement n’a pas abouti. Rien n’a été débité : vous pouvez recommencer, avec le moyen de votre choix.'
      : null,
  )

  const checkout = useCardCheckout(data.bookingId)
  const declare = useDeclareCesu(data.bookingId)
  const deposer = useUploadCesuProof(data.bookingId)
  const settle = useSettleWithUrssaf(data.bookingId)
  const link = useRequestUrssafLink(data.bookingId)
  const pending = checkout.isPending || declare.isPending || settle.isPending

  /* CGV V1 : une réservation posée par le batch cooker ou l'équipe n'a pas
     encore les cases du client. Tout départ de paiement répond alors 409
     `CONTRACT_CONSENT_REQUIRED` : on montre les cases demandées, on les
     enregistre, puis le client relance son paiement. */
  const terms = useMeProfile().data?.contractTerms
  const consent = useBookingConsents()
  const [gaps, setGaps] = useState<ContractGap[]>([])
  const [ticks, setTicks] = useState<Ticks>({})
  const caughtGaps = (cause: unknown) => {
    const g = consentGaps(cause instanceof ApiError ? cause.body : null)
    if (!g) return false
    setGaps(g.missing)
    return true
  }
  function saveConsents() {
    if (!terms) return
    consent.mutate(
      { id: data.bookingId, consents: consentsOf(terms, ticks) },
      {
        onSuccess: () => {
          setGaps([])
          setError(null)
        },
        onError: (cause) => setError(errorText(cause, 'Les cases n’ont pas été enregistrées. Réessayez.')),
      },
    )
  }

  const remaining = data.amounts.remainingCents
  const chosen = data.methods.find((m) => m.id === method) ?? null
  const titresCents = Math.round((Number(cesuAmount.replace(',', '.')) || 0) * 100)
  const cesuMax = chosen?.maxCesuCents ?? remaining
  const cesuTooHigh = method === 'cesu' && titresCents > cesuMax
  const cesuEmpty = method === 'cesu' && titresCents <= 0

  function payByCard() {
    setError(null)
    checkout.mutate(remaining, {
      // On quitte le site : le bouton reste verrouillé jusqu'à la redirection.
      onSuccess: (session) => window.location.assign(session.url),
      onError: (cause) =>
        caughtGaps(cause) ||
        setError(
          errorText(
            cause,
            'La page de paiement n’a pas pu s’ouvrir. Rien n’a été débité — réessayez dans un instant.',
          ),
        ),
    })
  }

  /**
   * L'e-CESU ne se déclare pas sans la confirmation de l'émetteur : l'API
   * l'exige. On dépose donc le fichier d'abord, et son `uploadId` part avec la
   * déclaration. Si le dépôt échoue, rien n'est déclaré — et on le dit, plutôt
   * que de laisser l'API répondre « PROOF_MISSING » en anglais.
   */
  async function declareCesu() {
    if (cesuTooHigh || cesuEmpty) return
    setError(null)

    if (!preuve) {
      setError(
        'Joignez la confirmation de votre émetteur : sans elle, la déclaration est refusée.',
      )
      return
    }
    let proofUploadId: string
    try {
      proofUploadId = await deposer.mutateAsync(preuve)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Le justificatif n’a pas pu être déposé. Rien n’a été déclaré.',
      )
      return
    }

    declare.mutate(
      { amountCents: titresCents, medium, issuer, proofUploadId, clientProofRef: preuveRef },
      {
        onError: (cause) =>
          caughtGaps(cause) ||
          setError(errorText(cause, 'La déclaration n’a pas été enregistrée. Réessayez dans un instant.')),
      },
    )
  }

  function confirmAdvance() {
    setError(null)
    settle.mutate(undefined, {
      onSuccess: () => setConfirming(false),
      onError: (cause) => {
        setConfirming(false)
        if (caughtGaps(cause)) return
        setError(
          errorText(cause, 'La confirmation n’est pas passée. Rien n’a été transmis à l’URSSAF — réessayez.'),
        )
      },
    })
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/espace-client/commandes/${data.bookingId}`}
        className="inline-flex items-center gap-2 text-xs text-ink-mid hover:text-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Ma réservation
      </Link>

      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">{data.reference}</p>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-navy lg:text-4xl">
          Régler la prestation
        </h1>
        {terms && gaps.length > 0 && (
          <div className="mt-4 space-y-3 rounded-2xl border border-amber/40 bg-amber-soft/60 p-4">
            <p className="text-sm font-semibold text-navy">
              Avant de payer, acceptez les conditions de cette prestation
            </p>
            <ContractBoxes terms={terms} gaps={gaps} ticks={ticks} onChange={setTicks} missing={gaps} />
            <button
              onClick={saveConsents}
              disabled={consent.isPending || !allTicked(gaps, ticks)}
              className="btn btn-primary text-xs disabled:opacity-60"
            >
              Valider, puis payer avec obligation de paiement
            </button>
          </div>
        )}
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-mid">
          <span className="inline-flex items-center gap-1.5">
            <ChefHat className="h-4 w-4 text-amber" /> {data.chef.displayName}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarRange className="h-4 w-4 text-amber" /> {longDate(data.startsAt)}
          </span>
        </p>
      </header>

      {cancelled && !error && (
        <Notice>Vous avez quitté la page de paiement. Rien n’a été débité.</Notice>
      )}
      {error && <Notice tone="error">{error}</Notice>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="space-y-5 lg:col-span-3">
          {data.methods.length === 0 ? (
            <div className="rounded-2xl border border-[rgba(31,42,55,0.1)] bg-paper p-5 text-sm leading-relaxed text-ink-mid">
              <p className="font-display text-lg font-bold text-navy">Le paiement en ligne n’est pas encore ouvert</p>
              <p className="mt-1">
                {firstName} n’a pas terminé l’activation de ses moyens de paiement. Écrivez-lui : vous pourrez régler
                ici dès que ce sera fait.
              </p>
              <Link href="/espace-client/messages" className="btn btn-primary mt-4 text-xs">
                Écrire à {firstName}
              </Link>
            </div>
          ) : (
            <fieldset>
              <legend className="mb-1 font-display text-lg font-bold text-navy">
                Comment souhaitez-vous régler ?
              </legend>
              <p className="mb-4 text-sm text-ink-mid">
                {firstName} accepte{' '}
                {data.methods.length === 1 ? 'un seul moyen' : `${data.methods.length} moyens`} de paiement. Le
                montant dû aujourd’hui change selon celui que vous choisissez.
              </p>

              <div className="space-y-3">
                {data.methods.map((option) => (
                  <MethodCard
                    key={option.id}
                    option={option}
                    active={method === option.id}
                    onSelect={() => setMethod(option.id)}
                    onRequestLink={() => link.mutate(data.chef.chefProfileId)}
                    linking={link.isPending}
                  >
                    {option.id === 'cesu' && method === 'cesu' && (
                      <div className="mt-3 space-y-3 rounded-2xl bg-cream-soft p-4">
                        {option.crcesuNan && (
                          <p className="text-[13px] leading-relaxed text-ink-mid">
                            Pour payer {firstName} avec vos titres, ajoutez ce numéro d’affiliation chez votre
                            émetteur :{' '}
                            <span className="font-mono font-semibold text-navy">{option.crcesuNan}</span>
                          </p>
                        )}
                        <div>
                          <label htmlFor="cesu" className="block text-[13px] font-semibold text-navy">
                            Montant de titres CESU remis à {firstName}
                          </label>
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              id="cesu"
                              inputMode="decimal"
                              value={cesuAmount}
                              onChange={(e) => setCesuAmount(e.target.value.replace(/[^\d.,]/g, ''))}
                              placeholder="0"
                              aria-invalid={cesuTooHigh}
                              aria-describedby="cesu-hint"
                              className={`w-32 rounded-xl border-[1.5px] bg-paper px-3 py-2 font-display text-lg font-bold tabular-nums text-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-amber ${
                                cesuTooHigh ? 'border-red-400' : 'border-[rgba(31,42,55,0.14)]'
                              }`}
                            />
                            <span className="font-display text-lg font-bold text-ink-soft">€</span>
                          </div>
                          <p
                            id="cesu-hint"
                            className={`mt-2 text-[13px] ${cesuTooHigh ? 'font-semibold text-red-700' : 'text-ink-mid'}`}
                          >
                            {cesuTooHigh
                              ? `Vos titres dépassent ce qui reste à régler. Le maximum utilisable ici est ${euros(cesuMax)}.`
                              : `${firstName} confirmera avoir reçu vos titres. Le solde éventuel se règle ensuite par carte.`}
                          </p>
                        </div>
                        <label className="block text-[13px] font-semibold text-navy">
                          Émetteur
                          <select
                            value={issuer}
                            onChange={(e) => setIssuer(e.target.value as CesuIssuer)}
                            className="input-base mt-1.5"
                          >
                            {CESU_ISSUERS.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <PreuveECesu
                          fichier={preuve}
                          onFichier={setPreuve}
                          reference={preuveRef}
                          onReference={setPreuveRef}
                        />
                      </div>
                    )}
                  </MethodCard>
                ))}
              </div>
            </fieldset>
          )}
        </section>

        {/* Récapitulatif : ce que ce choix coûte, aujourd'hui et ensuite. */}
        <aside className="h-fit rounded-3xl bg-navy p-6 text-white lg:col-span-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">Récapitulatif</p>
          <dl className="mt-4 space-y-2 text-sm">
            <Line label="Prix de la prestation" value={euros(data.amounts.totalCents)} />
            {data.amounts.paidCents > 0 && (
              <Line label="Déjà réglé" value={`− ${euros(data.amounts.paidCents)}`} accent />
            )}
            {method === 'urssaf' && chosen && (
              <Line
                label="Crédit d’impôt déduit immédiatement"
                value={`− ${euros(remaining - (chosen.debitedLaterCents ?? 0))}`}
                accent
              />
            )}
            {method === 'cesu' && titresCents > 0 && !cesuTooHigh && (
              <Line label="Titres CESU déclarés" value={`− ${euros(titresCents)}`} accent />
            )}
          </dl>
          <div className="my-4 border-t border-white/10" />
          <p className="text-xs text-white/60">À régler aujourd’hui sur le site</p>
          <p className="font-display text-4xl font-bold tabular-nums">
            {method === 'urssaf'
              ? euros(0)
              : method === 'cesu'
                ? euros(0)
                : euros(remaining)}
          </p>
          {method === 'cesu' && titresCents > 0 && !cesuTooHigh && remaining - titresCents > 0 && (
            <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-[13px] leading-relaxed">
              Solde de <strong>{euros(remaining - titresCents)}</strong> à régler par carte
              une fois vos titres confirmés par {firstName}.
            </p>
          )}
          <p className="mt-2 text-[12px] leading-relaxed text-white/60">
            {method === 'urssaf' && chosen
              ? `L’URSSAF prélèvera ensuite ${euros(chosen.debitedLaterCents ?? 0)} sur le compte de votre rattachement et réglera ${firstName} directement.`
              : method === 'cesu'
                ? `Vos titres vont directement à ${firstName}. S’il reste un solde, vous le réglerez par carte une fois les titres confirmés.`
                : `Votre attestation fiscale annuelle vous ouvrira ${euros(data.amounts.taxCreditCents)} de crédit d’impôt sur cette prestation.`}
          </p>

          {method === 'card' && (
            <button onClick={payByCard} disabled={pending} className="btn btn-amber mt-5 w-full justify-center text-sm disabled:opacity-60">
              {checkout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Payer {euros(remaining)} par carte
            </button>
          )}
          {method === 'cesu' && (
            <button
              onClick={declareCesu}
              disabled={pending || cesuTooHigh || cesuEmpty}
              className="btn btn-amber mt-5 w-full justify-center text-sm disabled:opacity-60"
            >
              {declare.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Déclarer mes titres
            </button>
          )}
          {method === 'urssaf' &&
            (confirming ? (
              <div className="mt-5 rounded-2xl bg-white/10 p-4 text-[13px] leading-relaxed">
                <p>
                  Vous confirmez que la prestation du {longDate(data.startsAt)} a bien eu lieu. La demande part à
                  l’URSSAF : rien n’est encaissé ici.
                </p>
                <div className="mt-3 flex gap-2">
                  <button onClick={confirmAdvance} disabled={pending} className="btn btn-amber flex-1 justify-center text-xs disabled:opacity-60">
                    {settle.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Oui, je confirme
                  </button>
                  <button onClick={() => setConfirming(false)} className="px-3 text-xs font-semibold text-white/70 hover:text-white">
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                disabled={pending || !chosen?.available}
                className="btn btn-amber mt-5 w-full justify-center text-sm disabled:opacity-60"
              >
                Confirmer la prestation
              </button>
            ))}

          <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-white/50">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Paiement par carte sur une page sécurisée Stripe. Aucune donnée de carte ne transite par Lab’s Food.
          </p>
        </aside>
      </div>
    </div>
  )
}

function MethodCard({
  option,
  active,
  onSelect,
  onRequestLink,
  linking,
  children,
}: {
  option: MethodOption
  active: boolean
  onSelect: () => void
  onRequestLink: () => void
  linking: boolean
  children?: React.ReactNode
}) {
  const spec = PAYMENT_METHODS[option.id]
  const Icon = METHOD_ICON[option.id]
  return (
    <div>
      <label
        className={`flex cursor-pointer gap-4 rounded-2xl border-[1.5px] p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-amber has-[:focus-visible]:ring-offset-2 ${
          !option.available
            ? 'cursor-not-allowed border-[rgba(31,42,55,0.08)] bg-cream-soft/60 opacity-70'
            : active
              ? 'border-navy bg-paper'
              : 'border-[rgba(31,42,55,0.1)] bg-paper hover:border-[rgba(31,42,55,0.26)]'
        }`}
      >
        <input
          type="radio"
          name="payment-method"
          className="sr-only"
          value={option.id}
          checked={active}
          disabled={!option.available}
          onChange={onSelect}
        />
        <span
          aria-hidden
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            active ? 'bg-navy text-amber' : 'bg-cream-soft text-navy'
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="font-display text-base font-bold text-navy">{spec.label}</span>
            {option.available &&
              (option.id === 'urssaf' ? (
                <span className="font-display text-lg font-bold text-terra">Rien à payer</span>
              ) : (
                <span className="font-display text-lg font-bold tabular-nums text-navy">
                  {euros(option.dueNowCents)}
                  <span className="ml-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                    à régler
                  </span>
                </span>
              ))}
          </span>
          <span className="mt-0.5 block text-[13px] font-semibold text-terra">{spec.tagline}</span>
          <span className="mt-1.5 block text-[13px] leading-relaxed text-ink-mid">{spec.detail}</span>
        </span>
      </label>

      {!option.available && option.reason && (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 pl-4 text-[13px] text-ink-mid">
          <Info className="h-3.5 w-3.5 shrink-0 text-amber-deep" />
          {option.reason}
          {option.reasonCode === 'URSSAF_LINK_NONE' && (
            <button onClick={onRequestLink} disabled={linking} className="font-semibold text-navy underline disabled:opacity-60">
              {linking ? 'Demande en cours…' : 'Demander le rattachement'}
            </button>
          )}
        </p>
      )}
      {option.available && children}
    </div>
  )
}

/* ── États ────────────────────────────────────────────────────────────────── */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-lg py-12 text-center"
    >
      {children}
    </motion.div>
  )
}

/** Vers la réservation quand elle existe ; sinon, faute de mieux, vers les demandes. */
const BackLink = ({ bookingId }: { bookingId?: string }) => (
  <Link
    href={bookingId ? `/espace-client/commandes/${bookingId}` : '/espace-client/personnalisation'}
    className="btn btn-primary mt-6 text-xs"
  >
    <ArrowLeft className="h-4 w-4" />
    {bookingId ? 'Ma réservation' : 'Mes demandes'}
  </Link>
)

function NotFound() {
  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold text-navy">Prestation introuvable</h1>
      <p className="mt-2 text-sm text-ink-mid">
        Rien à régler ici : cette prestation n’existe pas ou ne vous appartient pas.
      </p>
      <BackLink />
    </Shell>
  )
}

function TooEarly({ date, bookingId }: { date: string; bookingId: string }) {
  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold text-navy">La prestation n’a pas eu lieu</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-mid">
        Le règlement s’ouvre une fois votre batch cooker passé, le {date}. Rien ne vous est demandé avant.
      </p>
      <BackLink bookingId={bookingId} />
    </Shell>
  )
}

/** De retour de Stripe, avant que sa confirmation ne nous soit parvenue. */
function Confirming() {
  return (
    <Shell>
      <Loader2 className="mx-auto h-6 w-6 animate-spin text-amber" />
      <h1 className="mt-4 font-display text-2xl font-bold text-navy">Confirmation du paiement…</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-mid">
        Votre banque nous confirme le paiement. Cela prend quelques secondes : cette page se met à jour toute
        seule.
      </p>
    </Shell>
  )
}

/** Quelqu'un d'autre a la main : le batch cooker (CESU) ou l'URSSAF. */
function Processing({ data }: { data: PaymentOptions }) {
  return (
    <Shell>
      <span aria-hidden className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-soft text-amber-deep">
        <Clock className="h-6 w-6" />
      </span>
      <h1 className="mt-4 font-display text-2xl font-bold text-navy">Règlement en cours</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-mid">
        Votre demande est enregistrée pour {data.reference}. Elle attend une confirmation — celle de{' '}
        {data.chef.displayName.split(' ')[0]} pour des titres CESU, celle de l’URSSAF pour une avance immédiate.
        Rien d’autre à faire : cette page se met à jour toute seule.
      </p>
      <BackLink bookingId={data.bookingId} />
    </Shell>
  )
}

function Settled({ data }: { data: PaymentOptions }) {
  return (
    <Shell>
      <span aria-hidden className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint text-mint-ink">
        <ShieldCheck className="h-6 w-6" />
      </span>
      <h1 className="mt-4 font-display text-2xl font-bold text-navy">Réglée.</h1>
      <p className="mt-2 text-sm text-ink-mid">
        {euros(data.amounts.paidCents)} réglés sur {data.reference}.
      </p>
      <BackLink bookingId={data.bookingId} />
    </Shell>
  )
}

function Notice({ children, tone }: { children: React.ReactNode; tone?: 'error' }) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        tone === 'error' ? 'bg-red-100 text-red-700' : 'bg-cream-soft text-ink-mid'
      }`}
    >
      {children}
    </p>
  )
}

function Line({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-white/70">{label}</dt>
      <dd className={`shrink-0 tabular-nums ${accent ? 'font-semibold text-mint' : 'text-white'}`}>{value}</dd>
    </div>
  )
}

/* ── La confirmation de l'émetteur ─────────────────────────────────────────── */

/**
 * Un virement e-CESU se prouve. L'émetteur envoie une confirmation, et c'est
 * elle que le batch cooker regardera avant de dire « j'ai reçu ». L'API la
 * rend obligatoire ; l'écran le dit avant le clic plutôt qu'après le refus.
 *
 * Le fichier ne part qu'au moment de déclarer : tant que la personne hésite,
 * rien n'est envoyé.
 */
function PreuveECesu({
  fichier,
  onFichier,
  reference,
  onReference,
}: {
  fichier: File | null
  onFichier: (f: File | null) => void
  reference: string
  onReference: (v: string) => void
}) {
  const [refus, setRefus] = useState<string | null>(null)

  function choisir(f: File | null) {
    setRefus(null)
    if (!f) {
      onFichier(null)
      return
    }
    const probleme = verifiePreuve(f)
    if (probleme) {
      setRefus(probleme)
      onFichier(null)
      return
    }
    onFichier(f)
  }

  return (
    <div className="space-y-3 border-t border-[rgba(31,42,55,0.08)] pt-3">
      <div>
        <label
          htmlFor="preuve-ecesu"
          className="block text-[13px] font-semibold text-navy"
        >
          Confirmation de votre émetteur <span className="text-red-700">*</span>
        </label>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-mid">
          Le mail ou le relevé qui atteste du virement. Sans lui, la déclaration
          est refusée.
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label
            htmlFor="preuve-ecesu"
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-paper px-3.5 py-2 text-[13px] font-semibold text-navy shadow-[0_1px_0_rgba(31,42,55,0.12)] transition-colors hover:bg-cream-deep"
          >
            <Paperclip className="h-3.5 w-3.5" aria-hidden />
            {fichier ? 'Changer le fichier' : 'Joindre le justificatif'}
          </label>
          {fichier && (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] text-ink-mid">
              <FileCheck2 className="h-3.5 w-3.5 shrink-0 text-mint-ink" aria-hidden />
              <span className="truncate">{fichier.name}</span>
              <button
                type="button"
                onClick={() => choisir(null)}
                className="shrink-0 text-ink-soft underline underline-offset-2 hover:text-red-700"
              >
                retirer
              </button>
            </span>
          )}
        </div>

        <input
          id="preuve-ecesu"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => choisir(e.target.files?.[0] ?? null)}
        />

        <p
          className={`mt-1.5 text-[12px] ${refus ? 'font-semibold text-red-700' : 'text-ink-soft'}`}
          role={refus ? 'alert' : undefined}
        >
          {refus ?? `PDF, JPG, PNG ou WebP, ${PREUVE_MAX_MO} Mo au plus.`}
        </p>
      </div>

      <label className="block text-[13px] font-semibold text-navy">
        Référence de l’émetteur <span className="font-normal text-ink-soft">(facultatif)</span>
        <input
          value={reference}
          onChange={(e) => onReference(e.target.value)}
          placeholder="Numéro lu sur le mail de confirmation"
          className="input-base mt-1.5"
        />
      </label>
    </div>
  )
}
