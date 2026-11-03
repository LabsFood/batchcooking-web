'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  Check,
  ChefHat,
  Clock,
  CreditCard,
  Lock,
  MapPin,
  ShoppingBasket,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react'
import {
  MenuCard,
  MenuDialog,
  MenusError,
  MenusLoading,
  MenuFilterBar,
  NoMenus,
  useMenuFilters,
} from '@/components/menu/ChefMenuBrowser'
import { useChefPublic, weekLabel, type WeekCard } from '@/lib/api/menus'
import { useDiets } from '@/lib/api/referentials'
import { useChefSlots, useCreateBooking } from '@/lib/api/bookings'
import { useMeProfile } from '@/lib/api/me-profile'
import type { ClientProfile } from '@/lib/api/types'
import CityField from '@/components/chef/application/CityField'
import DatePicker from '@/components/shared/DatePicker'
import { SlotPicker } from '@/components/shared/TimeField'
import { dayKey } from '@/lib/time'
import { apiMessage } from '@/lib/api/messages'
import { ApiError } from '@/lib/api/client'
import { reasonText } from '@/lib/reason-codes'
import { AllergyDeclaration } from '@/components/client/AllergyDeclaration'
import {
  offerDuration,
  offerEuros,
  useOfferPrice,
  type OfferPrice,
} from '@/lib/api/service-offers'
import type { PublicServiceOffer } from '@/lib/api/menus'

/*
 * Trois étapes, plus quatre : la confirmation n'appartient plus à ce tunnel.
 * Le paiement se fait sur l'écran de la commande, qui connaît la carte, le
 * CESU et l'URSSAF — et c'est lui qui annonce le succès.
 */
const STEPS = [
  { id: 'chef',      label: 'Chef',      Icon: ChefHat },
  { id: 'infos',     label: 'Infos',     Icon: CalendarRange },
  { id: 'paiement',  label: 'Réserver',  Icon: CreditCard },
] as const
type StepId = typeof STEPS[number]['id']

/*
 * Le minimum de trois plats a été retiré par Lab's Food le 17/10, et l'API
 * n'en a jamais imposé : `meals` est facultatif, 20 au plus.
 *
 * Le prix ne se calcule plus ici non plus. Il vient de l'offre choisie, et les
 * montants définitifs sont ceux que l'API rend à la création : la commission,
 * le crédit d'impôt et le frais de courses sont son affaire, pas la nôtre.
 */
const MAX_DISHES = 20

/** Repli quand le batch cooker n'a publié aucun horaire : voir `WhenField`. */
const SLOTS = ['9h00 – 11h00', '10h30 – 12h30', '14h00 – 16h00', '17h00 – 19h00']

function ReservationFlow() {
  const router = useRouter()
  const params = useSearchParams()

  // La page publique et la carte d'un chef arrivent ici avec leur choix deja
  // fait : on reprend au bon endroit plutot que de le redemander.
  const initialMeals = (params.get('meals') || '').split(',').filter(Boolean)
  const chefParam = params.get('chef')

  const [chef, setChef] = useState<WeekCard | null>(null)
  const [step, setStep] = useState<StepId>('chef')

  const filters = useMenuFilters()
  const [openMenu, setOpenMenu] = useState<WeekCard | null>(null)
  const diets = useDiets([])
  const dietLabel = (code: string) => diets.find((d) => d.code === code)?.label ?? code

  /*
   * Le chef arrive de la page publique par son identifiant, mais sa carte
   * vient de l'API : on la retrouve dès que la semaine est chargée, une seule
   * fois, plutôt que de la reconstruire de mémoire.
   */
  const [reprise, setReprise] = useState(false)
  if (!reprise && chefParam && filters.menus.length > 0) {
    setReprise(true)
    const trouve = filters.menus.find((m) => m.chef.id === chefParam)
    if (trouve) {
      setChef(trouve)
      if (initialMeals.length > 0) setStep('infos')
    }
  }

  // Step state
  const [selectedMeals, setSelectedMeals] = useState<string[]>(initialMeals)
  const [date, setDate] = useState<string>('')
  const [slot, setSlot] = useState<string>(SLOTS[0])
  /** L'instant exact envoyé à l'API. `''` tant qu'aucun créneau n'est retenu. */
  const [creneauIso, setCreneauIso] = useState('')
  const [persons, setPersons] = useState(3)
  /** Les plats au-delà de ce que l'offre comprend. L'API les facture. */
  const [extraMeals, setExtraMeals] = useState(0)
  /** L'offre retenue : sa durée fait le créneau, son prix fait le montant. */
  const [offerId, setOfferId] = useState<string>('')
  /** Le client fait ses courses lui-même — c'est le `shoppingByClient` de l'API. */
  const [coursesParMoi, setCoursesParMoi] = useState(false)
  // Préremplie depuis le profil tant que le client n'y touche pas.
  const profil = useMeProfile()
  const surFiche = profil.data?.profileType === 'client' ? (profil.data.profile as ClientProfile | null) : null
  const [rue, setRue] = useState<string | null>(null)
  const [cp, setCp] = useState<string | null>(null)
  const [ville, setVille] = useState<string | null>(null)
  const address = rue ?? surFiche?.addressStreet ?? ''
  const postcode = cp ?? surFiche?.addressPostalCode ?? ''
  const city = ville ?? surFiche?.addressCity ?? ''
  const adresseComplete = !!address.trim() && /^\d{5}$/.test(postcode) && !!city
  const [notes, setNotes] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  /** Plats refusés par l'API (allergène déclaré, ou allergènes non vérifiés). */
  const [refuses, setRefuses] = useState<string[]>([])
  // Recettes lot 1 : sans réponse sur les allergies, aucun menu ne se valide.
  const clientProfile = surFiche
  const allergiesADeclarer =
    !!profil.data && profil.data.profileType !== 'chef' && !clientProfile?.allergiesDeclaredAt

  const stepIndex = STEPS.findIndex((s) => s.id === step)

  const meals = useMemo(
    () => (chef ? chef.dishes.filter((d) => selectedMeals.includes(d.id)) : []),
    [chef, selectedMeals],
  )

  /*
   * Les offres du batch cooker. `GET /chefs/{id}` ne rend que les actives,
   * de la moins chère à la plus chère. Sans offre, il n'est pas réservable :
   * l'écran le dit et renvoie vers la demande sur-mesure.
   */
  const fiche = useChefPublic(chef?.chef.id)
  const offres = fiche.data?.serviceOffers ?? []
  const offre = offres.find((o) => o.id === offerId) ?? null

  /* La première offre est pré-choisie : un client qui ne change rien a déjà
     un prix et une durée valides. */
  const [offrePrete, setOffrePrete] = useState<string | null>(null)
  if (offres.length > 0 && offrePrete !== chef?.chef.id) {
    setOffrePrete(chef?.chef.id ?? null)
    setOfferId(offres[0].id)
    setCoursesParMoi(!offres[0].shoppingIncluded)
  }

  /*
   * Le prix ne se calcule plus ici du tout : l'API le rend, suppléments
   * compris, et dit les règles qu'elle a appliquées. Tant qu'il n'est pas
   * arrivé, on montre le prix de l'offre seule plutôt qu'un vide — mais c'est
   * celui de l'API qui s'affiche dès qu'il répond.
   */
  const tarif = useOfferPrice(offre?.id, {
    persons,
    extraMeals,
    shoppingByClient: coursesParMoi,
  })
  const prix = tarif.data ?? null

  const creer = useCreateBooking()

  /** Ouvrir une carte. Changer de chef repart de zéro : les plats cochés
      appartiennent à la carte précédente, pas à celle-ci. */
  const openCarte = (menu: WeekCard) => {
    if (chef && menu.chef.id !== chef.chef.id) setSelectedMeals([])
    setOpenMenu(menu)
  }

  /** Retenir un chef depuis sa carte, avec les plats cochés dans la modale. */
  const chooseChef = (menu: WeekCard, dishes: string[]) => {
    setChef(menu)
    setSelectedMeals(dishes)
    setOffrePrete(null)
    setOpenMenu(null)
    setStep('infos')
  }

  const next = () => {
    const i = STEPS.findIndex((x) => x.id === step)
    if (i < STEPS.length - 1) setStep(STEPS[i + 1].id)
  }
  const prev = () => {
    const i = STEPS.findIndex((x) => x.id === step)
    if (i > 0) setStep(STEPS[i - 1].id)
  }

  /**
   * Réserver, puis payer.
   *
   * L'API crée la prestation en `pending` et tient le créneau 72 h ; c'est le
   * **paiement qui la confirme**, sur l'écran dédié qui connaît déjà la
   * carte, le CESU et l'URSSAF. On n'a donc plus de formulaire de carte ici :
   * on crée, et on passe la main.
   */
  function reserver() {
    if (!offre || !date || !creneauIso) return
    setErreur(null)
    setRefuses([])
    creer.mutate(
      {
        serviceOfferId: offre.id,
        startsAt: creneauIso,
        persons,
        ...(extraMeals > 0 ? { extraMeals } : {}),
        addressLine: address.trim(),
        addressPostalCode: postcode,
        addressCity: city,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        shoppingByClient: coursesParMoi,
        ...(selectedMeals.length > 0
          ? { meals: selectedMeals.slice(0, MAX_DISHES).map((mealId) => ({ mealId })) }
          : {}),
      },
      {
        onSuccess: (b) => router.push(`/espace-client/commandes/${b.id}/paiement`),
        onError: (e) => {
          /* Un 400 nomme ses champs depuis le 17/10 : on dit lequel plutôt
             que de recopier une phrase anglaise. */
          const body = (e instanceof ApiError ? e.body : null) as {
            code?: string
            conflicts?: { mealId: string }[]
            mealIds?: string[]
          } | null
          if (body?.code === 'ALLERGEN_CONFLICT') setRefuses(body.conflicts?.map((c) => c.mealId) ?? [])
          if (body?.code === 'ALLERGENS_UNVERIFIED') setRefuses(body.mealIds ?? [])
          if (body?.code === 'ALLERGIES_NOT_DECLARED') profil.refetch()
          setErreur(
            reasonText(body) ?? apiMessage(e, 'La réservation n’a pas pu être enregistrée.'),
          )
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="bg-paper rounded-3xl p-5 border border-[rgba(31,42,55,0.06)]">
        <div className="relative grid grid-cols-4 gap-2">
          <div className="absolute left-0 right-0 top-4 h-px bg-[rgba(31,42,55,0.08)]" />
          <div
            className="absolute left-0 top-4 h-px bg-amber transition-all"
            style={{ width: `${(stepIndex / (STEPS.length - 1)) * 100}%` }}
          />
          {STEPS.map((s, i) => {
            const reached = i <= stepIndex
            const current = i === stepIndex
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => i < stepIndex && setStep(s.id)}
                className="relative flex flex-col items-center text-center group disabled:cursor-not-allowed"
                disabled={i > stepIndex}
              >
                <span
                  className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    reached
                      ? current
                        ? 'bg-amber text-navy ring-4 ring-amber/20'
                        : 'bg-amber text-navy'
                      : 'bg-cream-deep text-ink-soft'
                  }`}
                >
                  <s.Icon className="w-4 h-4" />
                </span>
                <p
                  className={`mt-2 text-[10px] uppercase tracking-[0.16em] font-semibold ${
                    reached ? 'text-navy' : 'text-ink-soft'
                  }`}
                >
                  {s.label}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'chef' && (
          <StepCard
            key="chef"
            title="Avec quel batch cooker ?"
            subtitle={`Semaine ${weekLabel(filters.week)} — chaque chef compose sa carte. Ouvrez celle qui vous parle, puis choisissez vos plats dedans.`}
          >
            <MenuFilterBar filters={filters} />

            <p className="mt-5 text-sm text-ink-mid" aria-live="polite">
              {filters.isPending
                ? 'Lecture des cartes de la semaine…'
                : filters.menus.length === 0
                  ? 'Aucune carte ne correspond à votre recherche.'
                  : `${filters.menus.length} chef${filters.menus.length > 1 ? 's' : ''} disponible${filters.menus.length > 1 ? 's' : ''} cette semaine`}
            </p>

            <div className="mt-4">
              {filters.isPending ? (
                <MenusLoading />
              ) : filters.isError ? (
                <MenusError onRetry={filters.refetch} />
              ) : filters.menus.length === 0 ? (
                <NoMenus onReset={filters.reset} filtered={filters.active} filters={filters}>
                  <Link href="/espace-client/personnalisation" className="btn btn-primary text-xs">
                    Faire une demande sur mesure
                    <ArrowRight className="icon-arrow h-3.5 w-3.5" />
                  </Link>
                </NoMenus>
              ) : (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  {filters.menus.map((menu, i) => (
                    <MenuCard
                      key={menu.chef.id}
                      menu={menu}
                      index={i}
                      onOpen={() => openCarte(menu)}
                      openLabel="Voir sa carte"
                      dietLabel={dietLabel}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Link
                href="/espace-client"
                className="inline-flex items-center gap-1.5 text-sm text-ink-mid hover:text-navy"
              >
                <ArrowLeft className="h-4 w-4" /> Retour au dashboard
              </Link>
              {chef && (
                <button onClick={() => setStep('infos')} className="btn btn-primary">
                  Continuer avec {chef.chef.displayName.split(' ')[0]}
                  <ArrowRight className="h-4 w-4 icon-arrow" />
                </button>
              )}
            </div>
          </StepCard>
        )}

        {step === 'infos' && (
          <StepCard
            key="infos"
            title="Quand et où on cuisine ?"
            subtitle={
              chef
                ? `Date, créneau, adresse — ${chef.chef.displayName} s'occupe du reste.`
                : 'Date, créneau, adresse — votre chef s\u2019occupe du reste.'
            }
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
              <div className="space-y-4">
                {/* L'offre d'abord : sa durée décide des créneaux montrés. */}
                <Field label="Formule">
                  {fiche.isPending ? (
                    <div className="h-16 animate-pulse rounded-2xl bg-cream-soft" />
                  ) : offres.length === 0 ? (
                    <div className="rounded-2xl border border-amber/40 bg-amber-soft/50 p-4">
                      <p className="text-[13px] leading-relaxed text-navy">
                        {chef?.chef.displayName ?? 'Ce batch cooker'} n’a pas encore
                        publié ses formules : il n’est pas réservable en ligne.
                      </p>
                      <Link
                        href="/espace-client/personnalisation"
                        className="btn btn-outline mt-3 text-xs"
                      >
                        Faire une demande sur mesure
                        <ArrowRight className="icon-arrow h-3.5 w-3.5" />
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {offres.map((o) => {
                        const choisie = o.id === offerId
                        return (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => {
                              setOfferId(o.id)
                              setCoursesParMoi(!o.shoppingIncluded)
                              setCreneauIso('')
                              setSlot('')
                            }}
                            aria-pressed={choisie}
                            className={`flex w-full items-center justify-between gap-3 rounded-2xl p-3.5 text-left transition-colors ${
                              choisie
                                ? 'border border-amber/40 bg-amber-soft'
                                : 'border border-[rgba(31,42,55,0.08)] bg-paper hover:border-amber/40'
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-navy">
                                {o.name}
                              </span>
                              <span className="mt-0.5 block text-[11px] text-ink-soft">
                                {offerDuration(o.durationMinutes)} sur place ·{' '}
                                {o.shoppingIncluded
                                  ? o.shoppingFeeCents > 0
                                    ? `courses ${offerEuros(o.shoppingFeeCents)}`
                                    : 'courses offertes'
                                  : 'courses à votre charge'}
                              </span>
                            </span>
                            <span className="shrink-0 text-right">
                              <span className="block font-display text-lg font-bold text-navy">
                                {offerEuros(o.priceCents)}
                              </span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </Field>

                <WhenField
                  chefId={chef?.chef.id}
                  chefName={chef?.chef.displayName ?? null}
                  offerId={offre?.id}
                  date={date}
                  slot={slot}
                  onPick={(next) => {
                    setDate(next.date)
                    setSlot(next.slot)
                    setCreneauIso(next.startsAt)
                  }}
                />

                <Field label="Adresse">
                  <input
                    value={address}
                    onChange={(e) => setRue(e.target.value)}
                    autoComplete="street-address"
                    placeholder="15 rue de la Paix"
                    className="input-base"
                  />
                </Field>
                <div className="grid grid-cols-[120px_1fr] gap-3">
                  <Field label="Code postal">
                    <input
                      value={postcode}
                      onChange={(e) => setCp(e.target.value.replace(/\D/g, '').slice(0, 5))}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      placeholder="06000"
                      className="input-base"
                    />
                  </Field>
                  <Field label="Ville">
                    <CityField bare id="booking-city" postcode={postcode} value={city} onChange={setVille} />
                  </Field>
                </div>

                {/*
                  * Les deux compteurs qui font bouger le prix. Combien ils le
                  * font bouger, c'est l'API qui le dit : on affiche sa règle
                  * plutôt que de la deviner — elle se règle en console.
                  */}
                <div className="grid grid-cols-2 gap-3">
                  <Stepper
                    label="Adultes"
                    Icon={Users}
                    value={persons}
                    setValue={setPersons}
                    min={1}
                    max={10}
                  />
                  <Stepper
                    label="Plats en plus"
                    Icon={ChefHat}
                    value={extraMeals}
                    setValue={setExtraMeals}
                    min={0}
                    max={10}
                  />
                </div>

                {prix && (
                  <p className="rounded-2xl bg-cream-soft px-4 py-3 text-[12px] leading-relaxed text-ink-mid">
                    {prix.rules.includedPersons} personne
                    {prix.rules.includedPersons > 1 ? 's' : ''} comprise
                    {prix.rules.includedPersons > 1 ? 's' : ''} dans la formule, puis{' '}
                    {offerEuros(prix.rules.extraPersonCents)} par personne. Chaque plat
                    en plus : {offerEuros(prix.rules.extraMealCents)}.
                  </p>
                )}

                {/*
                  * Les courses suivent l'offre, et le client garde le dernier
                  * mot : s'il les fait lui-même, le forfait n'est pas facturé.
                  * C'est le `shoppingByClient` de l'API, dit à l'endroit.
                  */}
                {offre?.shoppingIncluded ? (
                  <button
                    type="button"
                    onClick={() => setCoursesParMoi((v) => !v)}
                    className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl transition-colors text-left ${
                      coursesParMoi
                        ? 'bg-paper border border-[rgba(31,42,55,0.08)]'
                        : 'bg-amber-soft border border-amber/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          coursesParMoi ? 'bg-cream-deep text-ink-mid' : 'bg-amber text-navy'
                        }`}
                      >
                        <ShoppingBasket className="w-4 h-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-navy">
                          {coursesParMoi
                            ? 'Je fais les courses moi-même'
                            : `${chef ? chef.chef.displayName.split(' ')[0] : 'Votre chef'} fait les courses`}
                        </p>
                        <p className="text-[11px] text-ink-soft">
                          {coursesParMoi
                            ? 'Le forfait courses n’est pas facturé.'
                            : offre.shoppingFeeCents > 0
                              ? `${offerEuros(offre.shoppingFeeCents)} — les ingrédients sont là avant la session`
                              : 'Offertes avec cette formule'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        coursesParMoi ? 'border-[rgba(31,42,55,0.2)]' : 'bg-amber border-amber text-navy'
                      }`}
                    >
                      {!coursesParMoi && <Check className="w-3 h-3" strokeWidth={3} />}
                    </span>
                  </button>
                ) : (
                  offre && (
                    <p className="flex items-center gap-3 rounded-2xl border border-[rgba(31,42,55,0.08)] bg-paper p-3.5 text-[13px] text-ink-mid">
                      <ShoppingBasket className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
                      Les courses restent à votre charge : cette formule ne les
                      comprend pas.
                    </p>
                  )
                )}

                <Field label="Notes pour le chef (optionnel)">
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Allergies, goûts, codes d’entrée…"
                    className="input-base resize-none"
                  />
                </Field>
              </div>

              <SummaryCard
                chef={chef}
                meals={meals}
                date={date}
                slot={slot}
                persons={persons}
                extraMeals={extraMeals}
                offre={offre}
                coursesParMoi={coursesParMoi}
                prix={prix}
              />
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => (chef ? openCarte(chef) : setStep('chef'))}
                className="text-sm text-ink-mid hover:text-navy inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Modifier les plats
              </button>
              <button
                onClick={next}
                disabled={!offre || !creneauIso || !adresseComplete}
                className="btn btn-primary disabled:opacity-50"
              >
                {/* Un bouton gris sans raison est une impasse : il dit ce qui
                    manque, et « Modifier les plats » rouvre la carte du chef. */}
                {!offre
                  ? 'Choisissez une formule'
                  : !creneauIso
                    ? 'Choisissez un créneau'
                    : !adresseComplete
                      ? 'Indiquez l’adresse complète'
                      : 'Vérifier et réserver'}
                <ArrowRight className="w-4 h-4 icon-arrow" />
              </button>
            </div>
          </StepCard>
        )}

        {step === 'paiement' && (
          <StepCard
            key="paiement"
            title="Vérifiez, puis réservez"
            subtitle="La réservation est posée d’abord ; le paiement la confirme juste après."
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
              <div className="space-y-4">
                <div className="rounded-2xl border border-[rgba(31,42,55,0.08)] bg-paper p-4">
                  <p className="font-display text-base font-bold text-navy">
                    Ce qui va se passer
                  </p>
                  <ol className="mt-2 space-y-2 text-[13px] leading-relaxed text-ink-mid">
                    <li>
                      <strong className="font-semibold text-navy">1.</strong> Nous
                      posons votre réservation chez{' '}
                      {chef?.chef.displayName ?? 'votre batch cooker'}. Le créneau
                      est alors tenu <strong>72 heures</strong>.
                    </li>
                    <li>
                      <strong className="font-semibold text-navy">2.</strong> Vous
                      réglez à l’écran suivant — carte, CESU préfinancé ou URSSAF,
                      selon ce que ce batch cooker accepte. C’est le paiement qui
                      confirme la session.
                    </li>
                    <li>
                      <strong className="font-semibold text-navy">3.</strong> Tant
                      que rien n’est réglé, vous pouvez tout annuler sans frais
                      depuis « Mes commandes ».
                    </li>
                  </ol>
                </div>

                {chef?.chef.acceptsCesu && (
                  <p className="flex items-start gap-2 rounded-2xl bg-mint/40 px-4 py-3 text-[13px] leading-relaxed text-mint-ink">
                    <Wallet className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {chef.chef.displayName.split(' ')[0]} accepte le{' '}
                    <strong>CESU préfinancé</strong> : vous pourrez le choisir à
                    l’étape suivante.
                  </p>
                )}

                {erreur && (
                  <p
                    role="alert"
                    className="flex items-start gap-2 rounded-2xl bg-amber-soft/70 px-4 py-3 text-[13px] leading-relaxed text-navy"
                  >
                    <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-deep" aria-hidden />
                    {erreur}
                  </p>
                )}

                {refuses.length > 0 && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-900">
                    <p className="font-semibold">
                      {meals.filter((m) => refuses.includes(m.id)).map((m) => m.name).join(', ') ||
                        'Un plat choisi'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMeals((ids) => ids.filter((id) => !refuses.includes(id)))
                        setRefuses([])
                        setErreur(null)
                      }}
                      className="mt-2 text-[12px] font-semibold underline underline-offset-2"
                    >
                      Retirer {refuses.length > 1 ? 'ces plats' : 'ce plat'} de ma sélection
                    </button>
                  </div>
                )}

                {selectedMeals.length > 0 && allergiesADeclarer && (
                  <div className="rounded-2xl border border-[rgba(31,42,55,0.08)] bg-paper p-4">
                    <p className="mb-3 text-sm font-semibold text-navy">
                      Vos allergies, avant de valider ce menu
                    </p>
                    <AllergyDeclaration
                      key={clientProfile?.allergiesDeclaredAt ?? 'jamais'}
                      profile={clientProfile}
                      consent={profil.data?.healthConsent}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={reserver}
                  disabled={
                    creer.isPending ||
                    !offre ||
                    !creneauIso ||
                    (selectedMeals.length > 0 && allergiesADeclarer)
                  }
                  className="btn btn-primary w-full justify-center disabled:opacity-60"
                >
                  {creer.isPending ? 'Enregistrement…' : 'Réserver et payer'}
                  {!creer.isPending && <ArrowRight className="h-4 w-4 icon-arrow" />}
                </button>
                <button
                  type="button"
                  onClick={prev}
                  className="w-full text-xs text-ink-soft hover:text-navy"
                >
                  ← Modifier les infos
                </button>
              </div>

              <SummaryCard
                chef={chef}
                meals={meals}
                date={date}
                slot={slot}
                persons={persons}
                extraMeals={extraMeals}
                offre={offre}
                coursesParMoi={coursesParMoi}
                prix={prix}
                address={[address.trim(), `${postcode} ${city}`.trim()].filter(Boolean).join(', ')}
              />
            </div>
          </StepCard>
        )}

      </AnimatePresence>

      {/* La carte d'un chef : meme composant que sur le site public. Ici elle
          enchaine sur la suite de la reservation au lieu d'ouvrir la connexion. */}
      <MenuDialog
        menu={openMenu}
        onClose={() => setOpenMenu(null)}
        selected={selectedMeals}
        onSelectedChange={setSelectedMeals}
        dietLabel={dietLabel}
        renderAction={({ menu, selected }) => (
          <button
            type="button"
            onClick={() => chooseChef(menu, selected)}
            disabled={selected.length > MAX_DISHES}
            className="btn btn-primary text-xs disabled:cursor-not-allowed disabled:opacity-55"
          >
            {selected.length > MAX_DISHES
              ? `${MAX_DISHES} plats au plus`
              : `Continuer avec ${menu.chef.displayName.split(' ')[0]}`}
            <ArrowRight className="icon-arrow h-3.5 w-3.5" />
          </button>
        )}
      />
    </div>
  )
}

function StepCard({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode
  title: string
  subtitle?: string
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="bg-paper rounded-3xl p-6 lg:p-8 border border-[rgba(31,42,55,0.06)]"
    >
      <p className="eyebrow mb-2">Réservation</p>
      <h2 className="font-display text-2xl lg:text-3xl font-bold text-navy leading-tight">
        {title}
      </h2>
      {subtitle && <p className="text-ink-mid text-sm mt-1.5">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </motion.section>
  )
}

/**
 * Quand : la date, puis le créneau — et seulement ceux qui existent.
 *
 * `GET /chefs/{id}/availability` rend les créneaux réellement réservables chez
 * ce batch cooker (horaires déclarés, moins ses prestations, moins ses blocs).
 * On s'en sert deux fois : pour **éteindre les jours sans créneau** dans le
 * calendrier, et pour lister les heures du jour choisi. Un client ne demande
 * plus un horaire qui sera refusé après coup.
 *
 * Deux replis, parce que l'API a deux façons de ne rien dire :
 *
 * - `scheduled: false` — ce batch cooker n'a posé aucun horaire. Tout reste
 *   possible « sur demande » : on retombe sur les créneaux indicatifs ;
 * - la route échoue (aucune offre de service configurée, par exemple). Même
 *   repli, et on le dit.
 */
/**
 * Un créneau indicatif (« 9h00 – 11h00 ») ramené à un instant.
 *
 * Il ne sert que lorsque le batch cooker n'a publié aucun horaire : l'API
 * accepte alors n'importe quelle heure, et c'est elle qui tranchera.
 */
function isoIndicatif(jour: string, libelleSlot: string): string {
  const m = libelleSlot.match(/(\d{1,2})\s*h\s*(\d{2})?/)
  const h = m ? Number(m[1]) : 9
  const min = m && m[2] ? Number(m[2]) : 0
  const d = new Date(`${jour}T00:00:00`)
  d.setHours(h, min, 0, 0)
  return d.toISOString()
}

function WhenField({
  chefId,
  chefName,
  offerId,
  date,
  slot,
  onPick,
}: {
  chefId: string | undefined
  chefName: string | null
  /** La durée de cette offre découpe les créneaux rendus par l'API. */
  offerId: string | undefined
  date: string
  slot: string
  onPick: (next: { date: string; slot: string; startsAt: string }) => void
}) {
  const [mois, setMois] = useState(() => new Date())

  /* La fenêtre lue suit le mois affiché, bornée à 31 jours comme l'API
     l'exige, et jamais avant aujourd'hui. */
  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0)
  const premier = new Date(mois.getFullYear(), mois.getMonth(), 1)
  const debut = premier < aujourdhui ? aujourdhui : premier
  const fin = new Date(debut)
  fin.setDate(debut.getDate() + 31)

  const dispos = useChefSlots(chefId, { from: dayKey(debut), to: dayKey(fin), offerId })

  const parJour = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const iso of dispos.data?.slots ?? []) {
      const cle = dayKey(new Date(iso))
      map.set(cle, [...(map.get(cle) ?? []), iso])
    }
    return map
  }, [dispos.data])

  /** L'API connaît la durée d'une session : elle fait l'heure de fin. */
  const duree = dispos.data?.durationMinutes ?? null
  const indicatif = dispos.isError || dispos.data?.scheduled === false
  const choisi = date ? new Date(`${date}T12:00:00`) : undefined
  const creneaux = date ? (parJour.get(date) ?? []) : []

  const libelle = (iso: string) => {
    const d = new Date(iso)
    const debutH = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    if (!duree) return debutH
    const f = new Date(d.getTime() + duree * 60_000)
    return `${debutH} – ${f.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <div className="space-y-3">
      <Field label="Date">
        <DatePicker
          mode="single"
          selected={choisi}
          month={mois}
          onMonthChange={setMois}
          onSelect={(d) => {
            if (!d) return
            const cle = dayKey(d)
            const premierCreneau = parJour.get(cle)?.[0]
            onPick({
              date: cle,
              slot: premierCreneau ? libelle(premierCreneau) : indicatif ? slot : '',
              startsAt: premierCreneau ?? (indicatif ? isoIndicatif(cle, slot) : ''),
            })
          }}
          disabled={
            indicatif
              ? { before: aujourdhui }
              : [{ before: aujourdhui }, (d: Date) => !parJour.has(dayKey(d))]
          }
          startMonth={aujourdhui}
          modifiers={
            indicatif
              ? undefined
              : { free: [...parJour.keys()].map((k) => new Date(`${k}T12:00:00`)) }
          }
          className="mx-auto w-fit rounded-2xl bg-paper p-2"
        />
        {!indicatif && !dispos.isPending && parJour.size === 0 && (
          <p className="mt-2 text-[12px] text-ink-soft">
            Aucun créneau libre dans les prochaines semaines
            {chefName ? ` chez ${chefName}` : ''}. Essayez le mois suivant.
          </p>
        )}
      </Field>

      <Field label="Créneau">
        {dispos.isPending && chefId ? (
          <div className="h-8 animate-pulse rounded-full bg-cream-soft" />
        ) : indicatif ? (
          <>
            <select
              value={slot}
              onChange={(e) =>
                onPick({
                  date,
                  slot: e.target.value,
                  startsAt: date ? isoIndicatif(date, e.target.value) : '',
                })
              }
              className="input-base"
            >
              {SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
              {chefName ?? 'Ce batch cooker'} n’a pas publié ses horaires : ces
              créneaux sont indicatifs, et l’heure sera confirmée avec vous.
            </p>
          </>
        ) : !date ? (
          <p className="text-[12px] text-ink-soft">Choisissez d’abord une date.</p>
        ) : (
          <SlotPicker
            slots={creneaux}
            value={creneaux.find((iso) => libelle(iso) === slot) ?? null}
            onSelect={(iso) => onPick({ date, slot: libelle(iso), startsAt: iso })}
            empty="Plus aucun créneau ce jour-là."
          />
        )}
      </Field>
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

function Stepper({
  label,
  Icon,
  value,
  setValue,
  min,
  max,
}: {
  label: string
  Icon: any
  value: number
  setValue: (n: number) => void
  min: number
  max: number
}) {
  return (
    <div className="bg-paper border border-[rgba(31,42,55,0.08)] rounded-2xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-7 h-7 rounded-lg bg-mint/40 text-mint-ink flex items-center justify-center">
          <Icon className="w-3.5 h-3.5" />
        </span>
        <p className="text-xs font-semibold text-navy">{label}</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setValue(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-full bg-cream-soft hover:bg-amber text-navy font-bold"
        >
          –
        </button>
        <span className="font-display text-xl font-bold text-navy">{value}</span>
        <button
          type="button"
          onClick={() => setValue(Math.min(max, value + 1))}
          className="w-8 h-8 rounded-full bg-cream-soft hover:bg-amber text-navy font-bold"
        >
          +
        </button>
      </div>
    </div>
  )
}

/**
 * Le récapitulatif.
 *
 * Il ne calcule rien : `GET /service-offers/{id}/price` rend chaque ligne, y
 * compris les suppléments par personne et par plat, et le montant après
 * crédit d'impôt. C'est le même calcul que celui qui s'appliquera à la
 * réservation : ce que le client lit ici est ce qu'il paiera.
 */
function SummaryCard({
  chef,
  meals,
  date,
  slot,
  persons,
  extraMeals,
  offre,
  coursesParMoi,
  prix,
  address,
}: {
  chef: WeekCard | null
  meals: { id: string; name: string }[]
  date: string
  slot: string
  persons: number
  extraMeals: number
  offre: PublicServiceOffer | null
  coursesParMoi: boolean
  /** `null` tant que l'API n'a pas répondu. */
  prix: OfferPrice | null
  address?: string
}) {
  const dateLabel = date
    ? new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : '—'

  return (
    <aside className="bg-navy text-white rounded-3xl p-5 lg:p-6 relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-amber/25 blur-3xl pointer-events-none" />
      <div className="relative">
        <p className="text-[10px] uppercase tracking-[0.2em] font-mono text-amber mb-3 inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Récap
        </p>

        <ul className="space-y-2 text-sm">
          {chef && (
            <Line
              Icon={ChefHat}
              label={chef.chef.displayName}
              sub={`${chef.title} · ${chef.chef.city}`}
            />
          )}
          {offre && (
            <Line
              Icon={Clock}
              label={offre.name}
              sub={`${offerDuration(offre.durationMinutes)} sur place`}
            />
          )}
          <Line
            Icon={Sparkles}
            label={`${meals.length} plat${meals.length > 1 ? 's' : ''}`}
            sub={meals.map((m) => m.name).join(', ') || 'Au choix avec votre batch cooker'}
          />
          <Line Icon={CalendarRange} label={dateLabel} sub={slot || 'Créneau à choisir'} />
          <Line
            Icon={Users}
            label={`${persons} personne${persons > 1 ? 's' : ''}`}
            sub={
              prix && persons > prix.rules.includedPersons
                ? `${prix.rules.includedPersons} comprise${prix.rules.includedPersons > 1 ? 's' : ''}, ${persons - prix.rules.includedPersons} en supplément`
                : 'Comprises dans la formule'
            }
          />
          {extraMeals > 0 && (
            <Line
              Icon={ChefHat}
              label={`${extraMeals} plat${extraMeals > 1 ? 's' : ''} en plus`}
              sub="Au-delà de ce que comprend la formule"
            />
          )}
          {address && <Line Icon={MapPin} label="Adresse" sub={address} />}
          <Line
            Icon={ShoppingBasket}
            label="Courses"
            sub={
              !offre?.shoppingIncluded
                ? 'À votre charge'
                : coursesParMoi
                  ? 'Vous les faites vous-même'
                  : `Faites par ${chef ? chef.chef.displayName.split(' ')[0] : 'le chef'}`
            }
          />
        </ul>

        <div className="mt-5 pt-5 border-t border-white/10 space-y-1.5">
          {prix ? (
            <>
              <Row label="Prestation" value={offerEuros(prix.priceCents)} />
              {prix.extraPersonsCents > 0 && (
                <Row
                  label={`+ ${persons - prix.rules.includedPersons} personne${persons - prix.rules.includedPersons > 1 ? 's' : ''}`}
                  value={offerEuros(prix.extraPersonsCents)}
                />
              )}
              {prix.extraMealsCents > 0 && (
                <Row
                  label={`+ ${extraMeals} plat${extraMeals > 1 ? 's' : ''}`}
                  value={offerEuros(prix.extraMealsCents)}
                />
              )}
              {prix.shoppingFeeCents > 0 && (
                <Row label="Courses" value={offerEuros(prix.shoppingFeeCents)} />
              )}
              <div className="pt-3 border-t border-white/10 flex items-baseline justify-between">
                <span className="text-[10px] uppercase tracking-[0.16em] text-white/55">
                  Total TTC
                </span>
                <span className="font-display text-3xl font-bold">
                  {offerEuros(prix.amountTtc)}
                </span>
              </div>
              <p className="text-[11px] text-amber font-semibold text-right">
                soit {offerEuros(prix.amountAfterTax)} après crédit d&apos;impôt
              </p>
            </>
          ) : offre ? (
            /* En attendant la réponse de l'API : le prix de l'offre seule,
               annoncé comme tel plutôt que pris pour un total. */
            <>
              <Row label="À partir de" value={offerEuros(offre.priceCents)} />
              <p className="text-[11px] leading-relaxed text-white/55">
                Calcul du total en cours…
              </p>
            </>
          ) : (
            <p className="text-[12px] leading-relaxed text-white/60">
              Choisissez une formule : son prix s&apos;affichera ici.
            </p>
          )}
        </div>
      </div>
    </aside>
  )
}

function Line({ Icon, label, sub }: { Icon: any; label: string; sub: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="w-7 h-7 rounded-lg bg-white/5 text-amber flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">{label}</p>
        <p className="text-[11px] text-white/55 leading-snug truncate">{sub}</p>
      </div>
    </li>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs text-white/65">
      <span>{label}</span>
      <span className="text-white font-semibold">{value}</span>
    </div>
  )
}

export default function ReservationPage() {
  return (
    <Suspense fallback={null}>
      <ReservationFlow />
    </Suspense>
  )
}
