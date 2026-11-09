'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  Building2,
  Check,
  CreditCard,
  ExternalLink,
  FileCheck2,
  Info,
  Loader2,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import ChefPage, { Card } from '@/components/chef/ChefPage'
import ApprovalGate from '@/components/chef/ApprovalGate'
import { useToast } from '@/components/shared/Toaster'
import { apiMessage } from '@/lib/api/messages'
import {
  SAP_LABEL,
  statutLabel,
  useSapProfile,
  useSaveSapProfile,
  useConfirmSepaMandate,
  useSepaMandate,
  useSepaMandateCheckout,
  useStripeDashboardLink,
  useStripeLink,
  useStripeStatus,
  type SapDeclarationType,
  type SapInput,
} from '@/lib/api/chef-money'

/* ─────────────────────────────────────────────────────────────────────────────
   Mode de rémunération.

   L'écran proposait de basculer entre deux « modes de versement » avec un
   préavis de N jours — une mécanique qui n'existe nulle part dans l'API. Ce
   qui existe, et qui décide vraiment de la façon dont l'argent circule, c'est
   trois choses que personne ne pouvait régler :

   - **la voie de déclaration SAP.** Voie A : le batch cooker déclare son
     activité en son nom (numéro NOVA). Voie B : une coopérative la porte pour
     lui. Ce choix décide de qui facture le client et de l'ouverture du crédit
     d'impôt ;
   - **le compte Stripe** qui reçoit les virements ;
   - **le mandat SEPA** qui autorise Lab's Food à prélever sa commission. Il
     se signe sur une page Stripe (l'IBAN ne passe jamais par nous) ; au
     retour, `?mandat=signe&session_id=…` l'active aussitôt. Sans lui, ni le
     CESU ni l'avance immédiate ne sont proposés aux clients : leur commission
     ne peut être que prélevée.

   Deux statuts sont en lecture seule parce que c'est l'équipe qui les
   instruit : l'affiliation CRCESU et l'avance immédiate URSSAF. L'écran le
   dit plutôt que d'offrir un bouton qui ne ferait rien.
   ───────────────────────────────────────────────────────────────────────────── */

const VOIES: { id: SapDeclarationType; titre: string; quoi: string; pour: string }[] = [
  {
    id: 'type_a_nova',
    titre: SAP_LABEL.type_a_nova,
    quoi: 'Vous déclarez votre activité de service à la personne en votre nom, avec un numéro NOVA obtenu auprès de la DDETS.',
    pour: 'Vous facturez vos clients, et ce sont vos factures qui ouvrent leur crédit d’impôt.',
  },
  {
    id: 'type_b_cooperative',
    titre: SAP_LABEL.type_b_cooperative,
    quoi: 'Une coopérative d’activité porte la déclaration : vous y êtes affilié, elle facture à votre place.',
    pour: 'Rien à déclarer vous-même, mais la coopérative prélève sa part et édite les factures.',
  },
]

export default function ChefPayoutModePage() {
  // `useSearchParams` (retour de la page Stripe) impose une frontière Suspense.
  return (
    <Suspense fallback={null}>
      <PayoutMode />
    </Suspense>
  )
}

function PayoutMode() {
  const toast = useToast()
  const sap = useSapProfile()
  const save = useSaveSapProfile()
  const stripe = useStripeStatus()
  const lien = useStripeLink()
  const tableauDeBord = useStripeDashboardLink()
  const sepa = useSepaMandate()
  const mandat = useSepaMandateCheckout()
  const confirmer = useConfirmSepaMandate()
  const retour = useSearchParams()
  const router = useRouter()
  const traite = useRef(false)

  /* De retour de la page Stripe. Le webhook active aussi le mandat : confirmer
     ici évite seulement d'attendre qu'il arrive. On nettoie l'adresse pour
     qu'un rechargement ne rejoue rien. */
  useEffect(() => {
    const issue = retour.get('mandat')
    if (!issue || traite.current) return
    traite.current = true
    const sessionId = retour.get('session_id')
    router.replace('/espace-chef/remuneration', { scroll: false })
    if (issue === 'annule') {
      toast.info('Mandat non signé', 'Vous pourrez le signer quand vous voudrez.')
      return
    }
    if (issue === 'signe' && sessionId) {
      confirmer.mutate(sessionId, {
        onSuccess: () =>
          toast.success('Mandat signé', 'Il est rangé dans vos documents.'),
        onError: (e) =>
          toast.error('Le mandat n’a pas pu être confirmé', apiMessage(e)),
      })
    }
  }, [retour, router, toast, confirmer])

  function signer() {
    // Retour par la page publique : un espace connecté renvoyait à la connexion.
    mandat.mutate(`${window.location.origin}/retour-stripe?vers=/espace-chef/remuneration`, {
      onSuccess: (r) => {
        if (r?.url) window.location.href = r.url
        else toast.error('Stripe n’a pas renvoyé de page de signature')
      },
      onError: (e) => toast.error('Le mandat n’a pas pu être préparé', apiMessage(e)),
    })
  }
  const mandatActif = sepa.data?.status === 'active'

  const d = sap.data
  const [brouillon, setBrouillon] = useState<SapInput | null>(null)
  const v = brouillon

  const ouvrir = () => {
    if (!d) return
    setBrouillon({
      declarationType: d.declarationType ?? 'type_a_nova',
      novaCode: d.novaCode ?? '',
      cooperativeName: d.cooperativeName ?? '',
      acceptsCesu: d.acceptsCesu,
      crcesuNan: d.crcesuNan ?? '',
    })
  }

  function enregistrer() {
    if (!v) return
    const corps: SapInput = {
      declarationType: v.declarationType,
      acceptsCesu: v.acceptsCesu,
      ...(v.declarationType === 'type_a_nova'
        ? { novaCode: v.novaCode?.trim() || null }
        : { cooperativeName: v.cooperativeName?.trim() || null }),
      ...(v.acceptsCesu ? { crcesuNan: v.crcesuNan?.trim() || null } : {}),
    }
    save.mutate(corps, {
      onSuccess: () => {
        setBrouillon(null)
        toast.success('Déclaration enregistrée')
      },
      onError: (e) => toast.error('La déclaration n’a pas été enregistrée', apiMessage(e)),
    })
  }

  return (
    <ChefPage
      title="Mode de rémunération"
      subtitle="Sous quelle voie vous déclarez, où vous êtes payé, et comment la commission est prélevée."
    >
      <div className="space-y-5">
        <ApprovalGate quoi="Votre déclaration s’enregistre" />

        {/* ── La voie de déclaration ───────────────────────────────────── */}
        <Card
          title="Ma voie de déclaration"
          action={
            d && !v ? (
              <button onClick={ouvrir} className="btn btn-outline text-xs">
                Modifier
              </button>
            ) : undefined
          }
        >
          {sap.isPending ? (
            <div className="h-24 animate-pulse rounded-2xl bg-cream-soft" />
          ) : sap.isError ? (
            <p className="text-[13px] text-ink-soft">{apiMessage(sap.error)}</p>
          ) : v ? (
            <>
              <div className="space-y-2">
                {VOIES.map((voie) => {
                  const choisie = v.declarationType === voie.id
                  return (
                    <button
                      key={voie.id}
                      type="button"
                      onClick={() => setBrouillon({ ...v, declarationType: voie.id })}
                      aria-pressed={choisie}
                      className={`w-full rounded-2xl p-4 text-left transition-colors ${
                        choisie
                          ? 'border border-amber/40 bg-amber-soft'
                          : 'border border-[rgba(31,42,55,0.08)] bg-paper hover:border-amber/40'
                      }`}
                    >
                      <p className="flex items-center gap-2 text-sm font-semibold text-navy">
                        {voie.id === 'type_a_nova' ? (
                          <FileCheck2 className="h-4 w-4 text-terra" aria-hidden />
                        ) : (
                          <Building2 className="h-4 w-4 text-terra" aria-hidden />
                        )}
                        {voie.titre}
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-ink-mid">
                        {voie.quoi}
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                        {voie.pour}
                      </p>
                    </button>
                  )
                })}
              </div>

              {v.declarationType === 'type_a_nova' ? (
                <label className="mt-3 block">
                  <span className="mb-1 block text-[11px] text-ink-soft">
                    Numéro de déclaration NOVA
                  </span>
                  <input
                    value={v.novaCode ?? ''}
                    onChange={(e) => setBrouillon({ ...v, novaCode: e.target.value })}
                    placeholder="SAP123456789"
                    className="input-base py-2"
                  />
                </label>
              ) : (
                <label className="mt-3 block">
                  <span className="mb-1 block text-[11px] text-ink-soft">
                    Nom de la coopérative
                  </span>
                  <input
                    value={v.cooperativeName ?? ''}
                    onChange={(e) =>
                      setBrouillon({ ...v, cooperativeName: e.target.value })
                    }
                    placeholder="Coopérative des métiers"
                    className="input-base py-2"
                  />
                </label>
              )}

              <label className="mt-3 flex cursor-pointer items-start gap-3 border-t border-[rgba(31,42,55,0.08)] pt-3">
                <input
                  type="checkbox"
                  checked={v.acceptsCesu ?? false}
                  onChange={(e) => setBrouillon({ ...v, acceptsCesu: e.target.checked })}
                  className="mt-1"
                />
                <span>
                  <span className="text-sm font-semibold text-navy">
                    J’accepte les titres CESU préfinancés
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
                    Le badge « CESU accepté » apparaît alors sur votre vitrine —
                    une fois votre numéro d’affiliation renseigné et votre mandat
                    de prélèvement signé.
                  </span>
                </span>
              </label>

              {v.acceptsCesu && (
                <label className="mt-3 block pl-7">
                  <span className="mb-1 block text-[11px] text-ink-soft">
                    Numéro d’affiliation CRCESU (NAN)
                  </span>
                  <input
                    value={v.crcesuNan ?? ''}
                    onChange={(e) => setBrouillon({ ...v, crcesuNan: e.target.value })}
                    placeholder="123456789"
                    className="input-base py-2"
                  />
                </label>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={enregistrer}
                  disabled={save.isPending}
                  className="btn btn-primary flex-1 justify-center text-xs"
                >
                  {save.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Enregistrer
                </button>
                <button
                  onClick={() => setBrouillon(null)}
                  className="btn btn-outline text-xs"
                >
                  Annuler
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-navy">
                {d?.declarationType ? SAP_LABEL[d.declarationType] : 'Aucune voie déclarée'}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-mid">
                {d?.declarationType === 'type_a_nova'
                  ? d.novaCode
                    ? `Numéro NOVA : ${d.novaCode}`
                    : 'Numéro NOVA non renseigné : le crédit d’impôt de vos clients en dépend.'
                  : d?.declarationType === 'type_b_cooperative'
                    ? (d.cooperativeName ?? 'Coopérative non renseignée')
                    : 'Choisissez votre voie : elle décide de qui facture vos clients.'}
              </p>

              <dl className="mt-4 space-y-2 border-t border-[rgba(31,42,55,0.08)] pt-4 text-[13px]">
                <Ligne
                  label="Titres CESU préfinancés"
                  value={d?.acceptsCesu ? 'Acceptés' : 'Non acceptés'}
                />
                {d?.acceptsCesu && (
                  <Ligne
                    label="Affiliation CRCESU"
                    value={`${statutLabel(d.crcesuAffiliationStatus)}${d.crcesuNan ? ` · NAN ${d.crcesuNan}` : ''}`}
                  />
                )}
                <Ligne
                  label="Avance immédiate URSSAF"
                  value={statutLabel(d?.urssafTiersPrestationStatus)}
                />
              </dl>

              <p className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-ink-soft">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                L’affiliation CRCESU et l’avance immédiate sont instruites par
                l’équipe Lab’s Food : elles ne se changent pas depuis cet écran.
              </p>
            </>
          )}
        </Card>

        {/* ── Où vous êtes payé ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card title="Recevoir mes virements">
            <p className="text-[13px] leading-relaxed text-ink-mid">
              Les prestations réglées par carte transitent par Stripe, qui vous
              verse directement.
            </p>

            {stripe.isPending ? (
              <div className="mt-3 h-16 animate-pulse rounded-2xl bg-cream-soft" />
            ) : stripe.isError ? (
              <p className="mt-3 text-[13px] text-ink-soft">{apiMessage(stripe.error)}</p>
            ) : (
              <>
                <dl className="mt-3 space-y-2 text-[13px]">
                  <Ligne
                    label="Dossier Stripe"
                    value={stripe.data?.detailsSubmitted ? 'Complet' : 'À compléter'}
                  />
                  <Ligne
                    label="Virements"
                    value={stripe.data?.payoutsEnabled ? 'Activés' : 'Pas encore activés'}
                  />
                </dl>

                {!stripe.data?.payoutsEnabled && (
                  <p className="mt-2 flex items-start gap-2 text-[12px] leading-relaxed text-amber-deep">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    Tant que Stripe n’a pas validé votre dossier, vos prestations
                    sont encaissées mais rien ne vous est versé.
                  </p>
                )}

                {/* Empilés, et non côte à côte : `.btn` ne coupe pas ses
                    libellés, il les masque (`nowrap` + `overflow: hidden`).
                    Dans une carte de demi-largeur, deux pilules en capitales
                    espacées se tronquent sans rien dire. */}
                <div className="mt-3 space-y-2">
                  <button
                    onClick={() =>
                      lien.mutate(undefined, {
                        onSuccess: (r) => {
                          if (r?.url) window.location.href = r.url
                          else toast.error('Stripe n’a pas renvoyé de lien')
                        },
                        onError: (e) =>
                          toast.error('Le lien n’a pas pu être créé', apiMessage(e)),
                      })
                    }
                    disabled={lien.isPending}
                    className="btn btn-outline w-full justify-center text-xs"
                  >
                    {lien.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {stripe.data?.stripeAccountId
                      ? 'Mon compte Stripe'
                      : 'Créer mon compte Stripe'}
                  </button>
                  {stripe.data?.detailsSubmitted && (
                    <button
                      onClick={() =>
                        tableauDeBord.mutate(undefined, {
                          onSuccess: (r) => {
                            if (r?.url) window.location.href = r.url
                            else toast.error('Stripe n’a pas renvoyé de lien')
                          },
                          onError: (e) =>
                            toast.error('Le tableau de bord n’a pas pu s’ouvrir', apiMessage(e)),
                        })
                      }
                      disabled={tableauDeBord.isPending}
                      className="btn btn-outline w-full justify-center text-xs"
                    >
                      {tableauDeBord.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      )}
                      Tableau de bord Stripe
                    </button>
                  )}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                  Stripe vérifie votre identité et vos coordonnées bancaires.
                  Lab’s Food ne les conserve pas.
                </p>
              </>
            )}
          </Card>

          <Card title="Mandat de prélèvement">
            <p className="text-[13px] leading-relaxed text-ink-mid">
              Sur les prestations réglées en CESU ou par l’avance immédiate,
              l’argent ne passe pas par Lab’s Food : la commission est prélevée
              sur votre compte bancaire, facture à l’appui. Sur une carte, elle
              est retenue au paiement et ce mandat ne sert pas.
            </p>

            {sepa.isPending ? (
              <div className="mt-3 h-16 animate-pulse rounded-2xl bg-cream-soft" />
            ) : sepa.isError ? (
              <p className="mt-3 text-[13px] text-ink-soft">{apiMessage(sepa.error)}</p>
            ) : (
              <>
                <dl className="mt-3 space-y-2 text-[13px]">
                  <Ligne label="Mandat" value={statutLabel(sepa.data?.status)} />
                  {sepa.data?.ibanLast4 && (
                    <Ligne label="Compte" value={`•••• ${sepa.data.ibanLast4}`} />
                  )}
                  {sepa.data?.signedAt && (
                    <Ligne
                      label="Signé le"
                      value={new Date(sepa.data.signedAt).toLocaleDateString('fr-FR')}
                    />
                  )}
                </dl>

                {!mandatActif && (
                  <p className="mt-2 flex items-start gap-2 text-[12px] leading-relaxed text-amber-deep">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    {sepa.data?.status === 'revoked'
                      ? 'Votre mandat a été révoqué. Tant qu’il n’est pas signé à nouveau, vos clients ne peuvent plus vous régler en CESU ni par l’avance immédiate.'
                      : 'Tant que le mandat n’est pas signé, vos clients ne peuvent pas vous régler en CESU ni par l’avance immédiate.'}
                  </p>
                )}

                <button
                  onClick={signer}
                  disabled={mandat.isPending || confirmer.isPending}
                  className={`btn ${mandatActif ? 'btn-outline' : 'btn-primary'} mt-3 w-full justify-center text-xs`}
                >
                  {mandat.isPending || confirmer.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <CreditCard className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {mandatActif ? 'Changer de compte bancaire' : 'Signer le mandat'}
                </button>
                <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                  La signature se fait sur la page sécurisée de Stripe.
                  {mandatActif && (
                    <>
                      {' '}
                      Le mandat signé est rangé dans{' '}
                      <Link href="/espace-chef/dossier" className="font-semibold text-navy underline-offset-2 hover:underline">
                        vos documents
                      </Link>
                      .
                    </>
                  )}
                </p>
              </>
            )}
          </Card>
        </div>

        <p className="flex items-start gap-2 px-1 text-[12px] leading-relaxed text-ink-soft">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Ces informations ne sortent jamais vers un client. Seul le badge
          <Wallet className="mx-1 inline h-3 w-3 align-[-1px]" aria-hidden />
          « CESU accepté » apparaît sur votre vitrine, et seulement si votre
          affiliation est complète et votre mandat signé.
        </p>
      </div>
    </ChefPage>
  )
}

function Ligne({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-right font-semibold text-navy">{value}</dd>
    </div>
  )
}
