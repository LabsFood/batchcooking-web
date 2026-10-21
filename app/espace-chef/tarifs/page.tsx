'use client'

import { useState } from 'react'
import {
  AlertCircle,
  Check,
  Clock,
  Gift,
  Info,
  Loader2,
  Pencil,
  Plus,
  ShoppingBasket,
  Trash2,
  X,
} from 'lucide-react'
import ApprovalGate, { useChefApproved } from '@/components/chef/ApprovalGate'
import ChefPage, { Card, Empty } from '@/components/chef/ChefPage'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useToast } from '@/components/shared/Toaster'
import { ApiError } from '@/lib/api/client'
import {
  afterTaxFromClientPrice,
  usePricingRules,
  type PricingRules,
} from '@/lib/api/bookings'
import {
  OFFER_LIMITS,
  offerDuration,
  offerError,
  offerEuros,
  useCreateServiceOffer,
  useDeleteServiceOffer,
  useServiceOffers,
  useUpdateServiceOffer,
  type ServiceOffer,
  type ServiceOfferInput,
} from '@/lib/api/service-offers'
import { apiMessage } from '@/lib/api/messages'

/* ─────────────────────────────────────────────────────────────────────────────
   Mes tarifs — mes offres de service.

   Cet écran simulait : il calculait un prix de session, des suppléments par
   repas et par personne, et son bouton « Enregistrer » n'appelait rien. L'API
   n'a jamais connu ces suppléments. Depuis le 17/10 elle connaît en revanche
   des **offres** : un nom, une durée, un prix, et les courses. C'est tout le
   modèle, et c'est ce que le client choisit au moment de réserver.

   Deux conséquences qui se voient à l'écran :

   - **la durée découpe l'agenda.** Une offre de 4 h ne se pose que là où
     quatre heures sont libres : c'est elle qui fait les créneaux proposés ;
   - **le prix saisi est le prix client.** C'est lui que l'API stocke. Le net
     s'en déduit par la commission, et il est affiché sous le champ pour qu'on
     ne le découvre pas au versement.
   ───────────────────────────────────────────────────────────────────────────── */

/** Les durées qu'on propose d'un clic. Le champ accepte le reste. */
const DUREES = [120, 150, 180, 240, 300, 360]

const VIDE: ServiceOfferInput = {
  name: '',
  description: '',
  durationMinutes: 180,
  priceCents: 15000,
  shoppingIncluded: true,
  shoppingFeeCents: 1500,
  active: true,
}

export default function ChefPricingPage() {
  const toast = useToast()
  const query = useServiceOffers()
  const creer = useCreateServiceOffer()
  const modifier = useUpdateServiceOffer()
  const supprimer = useDeleteServiceOffer()
  const rules = usePricingRules()

  /** `null` : aucun formulaire ouvert. `''` : une offre neuve. */
  const [edite, setEdite] = useState<string | null>(null)
  const [brouillon, setBrouillon] = useState<ServiceOfferInput>(VIDE)
  const [aSupprimer, setASupprimer] = useState<ServiceOffer | null>(null)
  const [refusSuppression, setRefusSuppression] = useState<string | null>(null)

  const offres = query.data ?? []
  /* L'API refuse d'écrire tant que le dossier n'est pas approuvé. On le sait
     avant le premier clic, sans attendre le 403 — et la lecture, elle, peut
     très bien répondre. */
  const { approved } = useChefApproved()
  const nonApprouve =
    !approved || (query.error instanceof ApiError && query.error.status === 403)

  const ouvrirNeuve = () => {
    setBrouillon(VIDE)
    setEdite('')
  }

  const ouvrirExistante = (o: ServiceOffer) => {
    setBrouillon({
      name: o.name,
      description: o.description ?? '',
      durationMinutes: o.durationMinutes,
      priceCents: o.priceCents,
      shoppingIncluded: o.shoppingIncluded,
      shoppingFeeCents: o.shoppingFeeCents,
      active: o.active,
    })
    setEdite(o.id)
  }

  function enregistrer() {
    const corps: ServiceOfferInput = {
      ...brouillon,
      name: brouillon.name.trim(),
      description: brouillon.description?.trim() || null,
      shoppingFeeCents: brouillon.shoppingIncluded ? (brouillon.shoppingFeeCents ?? 0) : 0,
    }
    if (offerError(corps)) return

    const fini = {
      onSuccess: () => {
        setEdite(null)
        toast.success(
          edite ? 'Offre modifiée' : 'Offre créée',
          corps.active
            ? 'Elle est proposée aux clients dès maintenant.'
            : 'Elle reste hors ligne tant que vous ne l’activez pas.',
        )
      },
      onError: (e: unknown) =>
        toast.error(
          'L’offre n’a pas été enregistrée',
          apiMessage(e),
        ),
    }

    if (edite) modifier.mutate({ id: edite, patch: corps }, fini)
    else creer.mutate(corps, fini)
  }

  const basculer = (o: ServiceOffer) =>
    modifier.mutate(
      { id: o.id, patch: { active: !o.active } },
      {
        onSuccess: () =>
          toast.success(
            o.active ? 'Offre désactivée' : 'Offre activée',
            o.active
              ? 'Les clients ne la voient plus. Les réservations en cours ne bougent pas.'
              : 'Elle apparaît de nouveau sur votre vitrine.',
          ),
        onError: () => toast.error('Le changement n’a pas été enregistré'),
      },
    )

  return (
    <ChefPage
      title="Mes tarifs"
      subtitle="Ce que vous proposez : une durée, un prix, et les courses ou non."
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl bg-mint/40 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-mint-ink" aria-hidden />
          <p className="text-xs leading-relaxed text-mint-ink">
            Le client choisit une de vos offres au moment de réserver. Sa{' '}
            <strong>durée</strong> décide des créneaux qu’il voit dans votre agenda,
            et son <strong>prix</strong> est ce qu’il paie — vous en touchez le
            montant moins la commission.
          </p>
        </div>

        <ApprovalGate quoi="Vos offres s’écrivent" />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            <Card
              title="Mes offres"
              action={
                !nonApprouve && edite === null ? (
                  <button onClick={ouvrirNeuve} className="btn btn-outline text-xs">
                    <Plus className="h-3.5 w-3.5" aria-hidden /> Nouvelle offre
                  </button>
                ) : undefined
              }
            >
              {query.isPending ? (
                <div className="space-y-2">
                  <div className="h-20 animate-pulse rounded-2xl bg-cream-soft" />
                  <div className="h-20 animate-pulse rounded-2xl bg-cream-soft" />
                </div>
              ) : offres.length === 0 && edite === null ? (
                <Empty
                  text={
                    nonApprouve
                      ? 'Aucune offre pour l’instant.'
                      : 'Aucune offre : personne ne peut encore vous réserver.'
                  }
                />
              ) : (
                <ul className="space-y-2">
                  {offres.map((o) => (
                    <li
                      key={o.id}
                      className={`rounded-2xl border p-4 transition-colors ${
                        o.active
                          ? 'border-[rgba(31,42,55,0.08)] bg-cream-soft'
                          : 'border-dashed border-[rgba(31,42,55,0.14)] bg-transparent'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-display text-base font-bold text-navy">
                            {o.name}
                            {!o.active && (
                              <span className="rounded-full bg-cream-deep px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                                Hors ligne
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-mid">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-amber-deep" aria-hidden />
                              {offerDuration(o.durationMinutes)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <ShoppingBasket className="h-3.5 w-3.5 text-amber-deep" aria-hidden />
                              {o.shoppingIncluded
                                ? o.shoppingFeeCents > 0
                                  ? `Courses ${offerEuros(o.shoppingFeeCents)}`
                                  : 'Courses offertes'
                                : 'Sans les courses'}
                            </span>
                          </p>
                          {o.description && (
                            <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-ink-mid">
                              {o.description}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="font-display text-xl font-bold text-navy">
                            {offerEuros(o.priceCents + (o.shoppingIncluded ? o.shoppingFeeCents : 0))}
                          </p>
                          <p className="text-[11px] text-ink-soft">
                            {rules.data
                              ? `soit ${offerEuros(
                                  afterTaxFromClientPrice(
                                    o.priceCents + (o.shoppingIncluded ? o.shoppingFeeCents : 0),
                                    rules.data,
                                  ),
                                )} après crédit d’impôt`
                              : 'tout compris'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 border-t border-[rgba(31,42,55,0.07)] pt-3">
                        <button
                          onClick={() => ouvrirExistante(o)}
                          disabled={edite !== null}
                          className="btn btn-outline text-xs disabled:opacity-50"
                        >
                          <Pencil className="h-3 w-3" aria-hidden /> Modifier
                        </button>
                        <button
                          onClick={() => basculer(o)}
                          disabled={modifier.isPending}
                          className="btn text-xs text-ink-mid hover:text-navy"
                        >
                          {o.active ? 'Désactiver' : 'Activer'}
                        </button>
                        <button
                          onClick={() => {
                            setRefusSuppression(null)
                            setASupprimer(o)
                          }}
                          className="btn ml-auto text-xs text-ink-soft hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" aria-hidden /> Supprimer
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {edite !== null && (
                <OfferForm
                  value={brouillon}
                  onChange={setBrouillon}
                  rules={rules.data}
                  pending={creer.isPending || modifier.isPending}
                  onCancel={() => setEdite(null)}
                  onSubmit={enregistrer}
                  isNew={edite === ''}
                />
              )}
            </Card>
          </div>

          {/* Ce que le client verra de l'offre en cours d'écriture. */}
          <aside className="h-fit rounded-3xl bg-navy p-5 text-white lg:sticky lg:top-24">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-amber">
              {edite !== null ? 'Ce que voit le client' : 'Comment ça se présente'}
            </p>

            {edite !== null ? (
              <Apercu offre={brouillon} rules={rules.data} />
            ) : (
              <p className="text-[13px] leading-relaxed text-white/70">
                Vos offres apparaissent sur votre vitrine et dans le tunnel de
                réservation. Le client en choisit une, puis un créneau de cette
                durée dans votre agenda.
              </p>
            )}

            <div className="mt-4 rounded-xl bg-white/5 px-3 py-2.5">
              <p className="text-[10px] leading-relaxed text-white/50">
                {rules.data
                  ? `Commission Lab’s Food : ${(rules.data.commissionBps / 100).toLocaleString('fr-FR')} % du prix client. Crédit d’impôt : ${(rules.data.taxCreditBps / 100).toLocaleString('fr-FR')} %.`
                  : 'Commission et crédit d’impôt lus sur l’API.'}
              </p>
            </div>
          </aside>
        </div>
      </div>

      <ConfirmDialog
        open={aSupprimer !== null}
        onClose={() => setASupprimer(null)}
        onConfirm={() =>
          aSupprimer &&
          supprimer.mutate(aSupprimer.id, {
            onSuccess: () => {
              setASupprimer(null)
              toast.success('Offre supprimée')
            },
            onError: (e) => {
              /* Une offre déjà réservée ne s'efface pas : on propose la seule
                 chose qui a le même effet pour les clients. */
              if (e instanceof ApiError && e.status === 409) {
                setRefusSuppression(
                  'Cette offre porte déjà des réservations : elle ne peut pas être effacée. Désactivez-la — elle disparaît des vitrines, et l’historique reste intact.',
                )
              } else {
                toast.error(
                  'L’offre n’a pas été supprimée',
                  apiMessage(e),
                )
              }
            },
          })
        }
        pending={supprimer.isPending}
        tone="danger"
        title={aSupprimer ? `Supprimer « ${aSupprimer.name} » ?` : ''}
        lead="Les clients ne pourront plus la choisir."
        detail={
          refusSuppression ??
          'Si des réservations s’y rattachent, l’API refusera : il faudra la désactiver à la place.'
        }
        confirmLabel="Supprimer l’offre"
      />
    </ChefPage>
  )
}

/* ── Le formulaire ─────────────────────────────────────────────────────────── */

function OfferForm({
  value,
  onChange,
  rules,
  pending,
  onCancel,
  onSubmit,
  isNew,
}: {
  value: ServiceOfferInput
  onChange: (v: ServiceOfferInput) => void
  rules: PricingRules | undefined
  pending: boolean
  onCancel: () => void
  onSubmit: () => void
  isNew: boolean
}) {
  const set = <K extends keyof ServiceOfferInput>(k: K, v: ServiceOfferInput[K]) =>
    onChange({ ...value, [k]: v })

  const erreur = offerError({
    ...value,
    shoppingFeeCents: value.shoppingIncluded ? (value.shoppingFeeCents ?? 0) : 0,
  })

  return (
    <div className="mt-4 rounded-2xl border-[1.5px] border-amber/40 bg-amber-soft/30 p-4">
      <p className="mb-3 font-display text-base font-bold text-navy">
        {isNew ? 'Nouvelle offre' : 'Modifier l’offre'}
      </p>

      <label className="block">
        <span className="mb-1 block text-[11px] text-ink-soft">
          Nom — c’est ce que le client lit
        </span>
        <input
          value={value.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Session 4 heures"
          maxLength={120}
          className="input-base py-2"
        />
      </label>

      <label className="mt-3 block">
        <span className="mb-1 block text-[11px] text-ink-soft">
          Description (facultative)
        </span>
        <textarea
          value={value.description ?? ''}
          onChange={(e) => set('description', e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Cinq plats pour la semaine, contenants fournis."
          className="input-base resize-y py-2"
        />
      </label>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <span className="mb-1 block text-[11px] text-ink-soft">Durée sur place</span>
          <div className="flex flex-wrap gap-1.5">
            {DUREES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => set('durationMinutes', d)}
                aria-pressed={value.durationMinutes === d}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  value.durationMinutes === d
                    ? 'border-navy bg-navy text-white'
                    : 'border-[rgba(31,42,55,0.12)] text-ink-mid hover:border-navy hover:text-navy'
                }`}
              >
                {offerDuration(d)}
              </button>
            ))}
          </div>
          <input
            type="number"
            min={OFFER_LIMITS.durationMin}
            max={OFFER_LIMITS.durationMax}
            step={15}
            value={value.durationMinutes}
            onChange={(e) => set('durationMinutes', Number(e.target.value))}
            aria-label="Durée en minutes"
            className="input-base mt-2 py-2"
          />
          <span className="mt-1 block text-[11px] text-ink-soft">
            En minutes, de 30 à 720.
          </span>
        </div>

        <div>
          <span className="mb-1 block text-[11px] text-ink-soft">Prix client</span>
          <div className="relative">
            <input
              type="number"
              min={0}
              step="0.01"
              value={(value.priceCents / 100).toString()}
              onChange={(e) => set('priceCents', Math.round(Number(e.target.value) * 100))}
              className="input-base py-2 pr-8 font-semibold"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft">
              €
            </span>
          </div>
          <span className="mt-1 block text-[11px] leading-relaxed text-ink-soft">
            {rules
              ? `Vous en touchez ${offerEuros(
                  Math.round((value.priceCents * (10000 - rules.commissionBps)) / 10000),
                )} après commission.`
              : 'Le net se calcule avec la commission.'}
          </span>
        </div>
      </div>

      <div className="mt-3 border-t border-[rgba(31,42,55,0.08)] pt-3">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={value.shoppingIncluded ?? false}
            onChange={(e) => set('shoppingIncluded', e.target.checked)}
            className="mt-1"
          />
          <span className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy">
              <ShoppingBasket className="h-4 w-4 text-terra" aria-hidden /> Je fais les
              courses
            </span>
            <span className="mt-0.5 block text-xs text-ink-soft">
              Le client peut toujours choisir de les faire lui-même : le forfait
              n’est alors pas facturé.
            </span>
          </span>
        </label>

        {value.shoppingIncluded && (
          <div className="mt-3 pl-7">
            <span className="mb-1 block text-[11px] text-ink-soft">
              Forfait courses — 0 pour les offrir
            </span>
            <div className="relative w-36">
              <input
                type="number"
                min={0}
                step="0.01"
                value={((value.shoppingFeeCents ?? 0) / 100).toString()}
                onChange={(e) =>
                  set('shoppingFeeCents', Math.round(Number(e.target.value) * 100))
                }
                className="input-base py-2 pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft">
                €
              </span>
            </div>
            {(value.shoppingFeeCents ?? 0) === 0 && (
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-mint-ink">
                <Gift className="h-3 w-3" aria-hidden /> Les courses sont offertes.
              </p>
            )}
          </div>
        )}
      </div>

      <label className="mt-3 flex cursor-pointer items-center gap-2 border-t border-[rgba(31,42,55,0.08)] pt-3 text-[13px] text-navy">
        <input
          type="checkbox"
          checked={value.active ?? true}
          onChange={(e) => set('active', e.target.checked)}
        />
        Proposer cette offre aux clients
      </label>

      {erreur && (
        <p className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-amber-deep">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {erreur}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={onSubmit}
          disabled={Boolean(erreur) || pending}
          className="btn btn-primary flex-1 justify-center text-xs disabled:opacity-55"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="h-3.5 w-3.5" aria-hidden />
          )}
          Enregistrer
        </button>
        <button onClick={onCancel} className="btn btn-outline text-xs">
          <X className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">Annuler</span>
        </button>
      </div>
    </div>
  )
}

/* ── L'aperçu ──────────────────────────────────────────────────────────────── */

function Apercu({
  offre,
  rules,
}: {
  offre: ServiceOfferInput
  rules: PricingRules | undefined
}) {
  const courses = offre.shoppingIncluded ? (offre.shoppingFeeCents ?? 0) : 0
  const total = offre.priceCents + courses

  return (
    <>
      <p className="font-display text-xl font-bold leading-snug">
        {offre.name.trim() || 'Votre offre'}
      </p>
      <p className="mt-0.5 text-xs text-white/60">
        {offerDuration(offre.durationMinutes)} sur place
      </p>

      <p className="mt-3 font-display text-3xl font-bold">{offerEuros(total)}</p>
      {rules && (
        <p className="mt-1 text-sm font-semibold text-amber">
          soit {offerEuros(afterTaxFromClientPrice(total, rules))} après crédit d’impôt
        </p>
      )}

      <div className="my-4 border-t border-white/10" />

      <Detail label="Prestation" value={offerEuros(offre.priceCents)} />
      <Detail
        label="Courses"
        value={
          offre.shoppingIncluded
            ? courses > 0
              ? offerEuros(courses)
              : 'Offertes'
            : 'À sa charge'
        }
        muted
      />
      {rules && (
        <Detail
          label="Votre net"
          value={offerEuros(Math.round((total * (10000 - rules.commissionBps)) / 10000))}
          muted
        />
      )}
    </>
  )
}

function Detail({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-0.5">
      <span className={`text-xs ${muted ? 'text-white/45' : 'text-white/70'}`}>{label}</span>
      <span className={`text-sm font-semibold ${muted ? 'text-white/60' : 'text-white'}`}>
        {value}
      </span>
    </div>
  )
}
