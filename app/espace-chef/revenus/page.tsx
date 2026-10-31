'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Check,
  FileText,
  Info,
  Loader2,
  Receipt,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'
import ChefPage, { Card, Empty } from '@/components/chef/ChefPage'
import ApprovalGate from '@/components/chef/ApprovalGate'
import { useToast } from '@/components/shared/Toaster'
import { apiMessage } from '@/lib/api/messages'
import { MICRO_ALERT_RATIO, MICRO_CEILING_EUR } from '@/lib/chef/states'
import { useChefBookings } from '@/lib/api/bookings'
import {
  cesuAttendMoi,
  moneyCents,
  statutLabel,
  useChefCesuPayments,
  useCommissionInvoices,
  useConfirmCesuPayment,
  useRejectCesuPayment,
  type CesuPayment,
  type CommissionInvoice,
} from '@/lib/api/chef-money'

/* ─────────────────────────────────────────────────────────────────────────────
   Revenus & paiements.

   Cet écran affichait un solde, un prochain versement et un détail par
   prestation — tout cela inventé : `lib/chef/mock.ts`. Il n'y a pas de solde
   dans l'API, et aucune date de versement n'est promise à personne. Ce qui
   existe, et qui manquait à l'écran, c'est plus utile que ça :

   - **les paiements CESU qui attendent un geste.** Un client déclare avoir
     payé en titres ; tant que le batch cooker ne confirme pas les avoir reçus,
     la prestation reste en attente de règlement. C'est la seule chose de cet
     écran qui bloque de l'argent, et elle était invisible ;
   - **les factures de commission** de Lab's Food, et leurs prélèvements ;
   - **ce qui a été encaissé**, calculé sur les prestations réellement payées
     (`paidCents`), et annoncé comme tel.

   Le plafond de la micro-entreprise reste affiché, mais sur du réel et avec
   sa réserve : l'API ne connaît que ce qui passe par Lab's Food.
   ───────────────────────────────────────────────────────────────────────────── */

const ANNEE = new Date().getFullYear()

export default function ChefEarningsPage() {
  const bookings = useChefBookings()
  const cesu = useChefCesuPayments()
  const factures = useCommissionInvoices()

  const prestations = bookings.data?.data ?? []

  /* Ce qui a été encaissé, et ce que Lab's Food a retenu, sur l'année en
     cours : la somme des prestations qui portent un paiement. */
  const annee = prestations.filter(
    (b) => b.paidCents && new Date(b.startsAt).getFullYear() === ANNEE,
  )
  const netAnnee = annee.reduce((n, b) => n + (b.collectedNetCents ?? 0), 0)
  // Seulement la commission prélevée sur ce qui est payé : `commissionCents`
  // y ajoute l'estimation sur le reste à payer.
  const commissionAnnee = annee.reduce(
    (n, b) => n + Math.max(0, (b.paidCents ?? 0) - (b.collectedNetCents ?? 0)),
    0,
  )
  // Une prestation payée en partie compte dans les sommes, pas dans ce décompte.
  const reglees = annee.filter((b) => b.commissionEstimated === false)
  const mois = new Date().getMonth()
  const netMois = annee
    .filter((b) => new Date(b.startsAt).getMonth() === mois)
    .reduce((n, b) => n + (b.collectedNetCents ?? 0), 0)

  const ratio = netAnnee / 100 / MICRO_CEILING_EUR
  const alerte = ratio >= MICRO_ALERT_RATIO

  const aTraiter = (cesu.data ?? []).filter(cesuAttendMoi)
  const traites = (cesu.data ?? []).filter((p) => !cesuAttendMoi(p))

  return (
    <ChefPage
      title="Revenus & paiements"
      subtitle="Ce que vous avez encaissé, ce qui attend votre accord, et ce que Lab’s Food vous facture."
    >
      <div className="space-y-5">
        <ApprovalGate quoi="Vos revenus s’affichent" />

        {/* ── Les chiffres de l'année ──────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <p className="eyebrow mb-2">Net encaissé en {ANNEE}</p>
            <p className="font-display text-4xl font-bold text-navy">
              {bookings.isPending ? '…' : (moneyCents(netAnnee) ?? '0 €')}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              Sur {reglees.length} prestation{reglees.length > 1 ? 's' : ''} réglée
              {reglees.length > 1 ? 's' : ''}
            </p>
          </Card>

          <Card>
            <TrendingUp className="mb-2 h-4 w-4 text-terra" aria-hidden />
            <p className="font-display text-2xl font-bold text-navy">
              {bookings.isPending ? '…' : (moneyCents(netMois) ?? '0 €')}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-ink-soft">
              Net ce mois-ci
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
              Commission retenue cette année : {moneyCents(commissionAnnee) ?? '0 €'}
            </p>
          </Card>

          <Card>
            <Wallet className="mb-2 h-4 w-4 text-terra" aria-hidden />
            <p className="font-display text-2xl font-bold text-navy">
              {Math.round(ratio * 100)} %
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-ink-soft">
              du plafond micro-entreprise
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-deep">
              <div
                className={`h-full rounded-full ${alerte ? 'bg-red-500' : 'bg-mint-deep'}`}
                style={{ width: `${Math.min(100, ratio * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-ink-soft">
              {MICRO_CEILING_EUR.toLocaleString('fr-FR')} € — d’après vos seules
              prestations Lab’s Food.
            </p>
          </Card>
        </div>

        {alerte && (
          <p className="flex items-start gap-2 rounded-2xl bg-amber-soft/60 px-4 py-3 text-[13px] leading-relaxed text-navy">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-deep" aria-hidden />
            Vous approchez du plafond de la micro-entreprise. Au-delà, le régime
            change : parlez-en à votre comptable avant d’accepter de nouvelles
            prestations.
          </p>
        )}

        {/* ── Le CESU qui attend ───────────────────────────────────────── */}
        <Card title={`Titres CESU à confirmer (${aTraiter.length})`}>
          <p className="text-[13px] leading-relaxed text-ink-mid">
            Quand un client règle en CESU préfinancé, il le déclare ici. La
            prestation reste en attente de règlement <strong>tant que vous
            n’avez pas confirmé</strong> avoir reçu les titres.
          </p>

          {cesu.isPending ? (
            <div className="mt-3 h-20 animate-pulse rounded-2xl bg-cream-soft" />
          ) : cesu.isError ? (
            <p className="mt-3 text-[13px] text-ink-soft">{apiMessage(cesu.error)}</p>
          ) : aTraiter.length === 0 ? (
            <Empty text="Rien à confirmer pour l’instant." />
          ) : (
            <ul className="mt-3 space-y-2">
              {aTraiter.map((p) => (
                <CesuRow key={p.paymentId} paiement={p} />
              ))}
            </ul>
          )}

          {traites.length > 0 && (
            <div className="mt-4 border-t border-[rgba(31,42,55,0.07)] pt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                Déjà traités
              </p>
              <ul className="space-y-1.5">
                {traites.map((p) => (
                  <li
                    key={p.paymentId}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-cream-soft px-3 py-2 text-[12px]"
                  >
                    <span className="font-semibold text-navy">
                      {moneyCents(p.amountTtc)}
                    </span>
                    <span className="text-ink-mid">{p.clientName ?? 'Client'}</span>
                    <span className="font-mono text-[11px] text-ink-soft">
                      {p.bookingReference ?? ''}
                    </span>
                    <span className="ml-auto text-ink-soft">
                      {statutLabel(p.settlementStatus)}
                      {p.rejectionReason ? ` — « ${p.rejectionReason} »` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* ── Les factures de commission ───────────────────────────────── */}
        <Card title="Factures de commission">
          <p className="text-[13px] leading-relaxed text-ink-mid">
            Ce que Lab’s Food vous facture sur les prestations encaissées, et
            les prélèvements correspondants.
          </p>

          {factures.isPending ? (
            <div className="mt-3 h-20 animate-pulse rounded-2xl bg-cream-soft" />
          ) : factures.isError ? (
            <p className="mt-3 text-[13px] text-ink-soft">{apiMessage(factures.error)}</p>
          ) : (factures.data ?? []).length === 0 ? (
            <Empty text="Aucune facture pour l’instant." />
          ) : (
            <ul className="mt-3 space-y-2">
              {(factures.data ?? []).map((f) => (
                <FactureRow key={f.id} facture={f} />
              ))}
            </ul>
          )}
        </Card>

        <p className="flex items-start gap-2 px-1 text-[12px] leading-relaxed text-ink-soft">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Comment vous êtes payé — voie de déclaration, compte bancaire, mandat
          de prélèvement — se règle dans{' '}
          <Link
            href="/espace-chef/remuneration"
            className="font-semibold text-terra hover:underline"
          >
            Mode de rémunération
          </Link>
          .
        </p>
      </div>
    </ChefPage>
  )
}

/* ── Un paiement CESU en attente ───────────────────────────────────────────── */

function CesuRow({ paiement: p }: { paiement: CesuPayment }) {
  const toast = useToast()
  const confirmer = useConfirmCesuPayment()
  const refuser = useRejectCesuPayment()
  const [motif, setMotif] = useState<string | null>(null)

  const occupe = confirmer.isPending || refuser.isPending

  return (
    <li className="rounded-2xl border border-[rgba(31,42,55,0.08)] bg-paper p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-base font-bold text-navy">
            {moneyCents(p.amountTtc)}
            <span className="ml-2 text-[12px] font-normal text-ink-mid">
              {p.clientName ?? 'Client'}
            </span>
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-ink-soft">
            <span className="font-mono">{p.bookingReference ?? ''}</span>
            <span>{p.issuer}</span>
            <span>{p.medium === 'paper' ? 'Titres papier' : 'Dématérialisé'}</span>
            <span>
              déclaré le{' '}
              {new Date(p.declaredAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
              })}
            </span>
          </p>
          {p.clientProofRef && (
            <p className="mt-1 text-[11px] text-ink-soft">
              Référence donnée par le client : {p.clientProofRef}
            </p>
          )}
        </div>

        {motif === null ? (
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() =>
                confirmer.mutate(p.paymentId, {
                  onSuccess: () =>
                    toast.success(
                      'Paiement confirmé',
                      'La prestation est soldée côté client.',
                    ),
                  onError: (e) => toast.error('La confirmation a échoué', apiMessage(e)),
                })
              }
              disabled={occupe}
              className="btn btn-primary text-xs"
            >
              {confirmer.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Check className="h-3.5 w-3.5" aria-hidden />
              )}
              J’ai reçu les titres
            </button>
            <button
              onClick={() => setMotif('')}
              disabled={occupe}
              className="btn text-xs text-ink-mid hover:text-red-700"
            >
              <X className="h-3.5 w-3.5" aria-hidden /> Pas reçus
            </button>
          </div>
        ) : null}
      </div>

      {motif !== null && (
        <div className="mt-3 border-t border-[rgba(31,42,55,0.07)] pt-3">
          <label className="block">
            <span className="mb-1 block text-[11px] text-ink-soft">
              Ce que le client lira — dites ce qui manque, pas « non »
            </span>
            <input
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Les titres ne sont jamais arrivés."
              maxLength={300}
              className="input-base py-2"
              autoFocus
            />
          </label>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() =>
                refuser.mutate(
                  { id: p.paymentId, reason: motif.trim() },
                  {
                    onSuccess: () => {
                      setMotif(null)
                      toast.info('Paiement refusé', 'Le client est prévenu.')
                    },
                    onError: (e) => toast.error('Le refus a échoué', apiMessage(e)),
                  },
                )
              }
              disabled={motif.trim().length < 3 || refuser.isPending}
              className="btn btn-outline text-xs disabled:opacity-55"
            >
              {refuser.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              )}
              Envoyer le refus
            </button>
            <button onClick={() => setMotif(null)} className="btn text-xs text-ink-soft">
              Annuler
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

/* ── Une facture de commission ─────────────────────────────────────────────── */

function FactureRow({ facture: f }: { facture: CommissionInvoice }) {
  const periode = `${new Date(f.periodStart).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })} → ${new Date(f.periodEnd).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })}`
  const echoue = f.debits.some((d) => d.status === 'failed')

  return (
    <li className="rounded-2xl bg-cream-soft p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-navy">
            <FileText className="h-3.5 w-3.5 text-amber-deep" aria-hidden />
            {f.invoiceNumber}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-soft">
            {periode} · {f.commissionsCount} prestation
            {f.commissionsCount > 1 ? 's' : ''} · taux{' '}
            {(f.rateBps / 100).toLocaleString('fr-FR')} %
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-lg font-bold text-navy">
            {moneyCents(f.amountTtcCents)}
          </p>
          <p className="text-[11px] text-ink-soft">
            dont {moneyCents(f.amountVatCents)} de TVA
          </p>
        </div>
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[rgba(31,42,55,0.07)] pt-2 text-[11px]">
        <span className={echoue ? 'font-semibold text-red-700' : 'text-ink-mid'}>
          <Receipt className="mr-1 inline h-3 w-3 align-[-1px]" aria-hidden />
          {statutLabel(f.status)}
        </span>
        <span className="text-ink-soft">
          {f.collectionMethod === 'sepa_debit'
            ? 'Prélèvement SEPA'
            : statutLabel(f.collectionMethod)}
        </span>
        {echoue && (
          <span className="text-red-700">
            Un prélèvement a échoué — vérifiez votre mandat.
          </span>
        )}
      </p>
    </li>
  )
}
