'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  Download,
  FileText,
  Info,
  Loader2,
  Receipt,
  Wallet,
} from 'lucide-react'
import ChefPage, { Card, Empty } from '@/components/chef/ChefPage'
import ApprovalGate from '@/components/chef/ApprovalGate'
import { useToast } from '@/components/shared/Toaster'
import { Skeleton, SkeletonGroup } from '@/components/shared/Skeleton'
import { apiMessage } from '@/lib/api/messages'
import { MICRO_ALERT_RATIO, MICRO_CEILING_EUR } from '@/lib/chef/states'
import { useChefBookings } from '@/lib/api/bookings'
import {
  moneyCents,
  PAYOUT_METHOD_LABEL,
  statutLabel,
  useChefCesuPayments,
  useCommissionInvoices,
  useMyPayouts,
  useMyPayoutStatements,
  usePayoutStatementDownload,
  type ChefPayoutLine,
  type CommissionInvoice,
  type PayoutStatement,
} from '@/lib/api/chef-money'

/* ─────────────────────────────────────────────────────────────────────────────
   Revenus & paiements, flux « prix net » (26/11/2026).

   Le client paie Labs Food Batchcooking SAS, TVA comprise. La SAS achète la
   prestation au batch cooker au prix net et le lui vire, avec une autofacture
   (art. 289 I-2 CGI) : il n'a rien à émettre ni à confirmer. Cet écran montre :

   - **ce qui a été versé** cette année et **ce qui est à recevoir** (argent
     déjà reçu par Labs Food, virement sous 2 jours ouvrés) ;
   - **le détail de chaque montant** : TTC, TVA (10 %), HT, part Labs Food,
     frais CESU, net ;
   - **les autofactures** à télécharger ;
   - **les paiements CESU** des clients, en lecture seule : le rapprochement
     bancaire les solde ;
   - **les factures de commission**, qui ne concernent plus que la carte
     (encore versée par Stripe) et les prestations d'avant ce changement.

   Le plafond de la micro-entreprise reste affiché, avec sa réserve : l'API ne
   connaît que ce qui passe par Lab's Food.
   ───────────────────────────────────────────────────────────────────────────── */

const ANNEE = new Date().getFullYear()
const DEBUT_ANNEE = `${ANNEE}-01-01`

const pct = (bps: number) => `${(bps / 100).toLocaleString('fr-FR')} %`
const jour = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'

export default function ChefEarningsPage() {
  const bookings = useChefBookings()
  const aRecevoir = useMyPayouts('payable')
  const verses = useMyPayouts('paid', DEBUT_ANNEE)
  const autofactures = useMyPayoutStatements()
  const cesu = useChefCesuPayments()
  const factures = useCommissionInvoices()

  /* Le plafond se juge sur tout ce qui est encaissé, carte comprise : la somme
     des prestations payées de l'année. */
  const prestations = bookings.data?.data ?? []
  const netAnnee = prestations
    .filter((b) => b.paidCents && new Date(b.startsAt).getFullYear() === ANNEE)
    .reduce((n, b) => n + (b.collectedNetCents ?? 0), 0)
  const ratio = netAnnee / 100 / MICRO_CEILING_EUR
  const alerte = ratio >= MICRO_ALERT_RATIO

  const lignes = [
    ...(aRecevoir.data?.lines ?? []).map((l) => ({ ...l, verse: false })),
    ...(verses.data?.lines ?? []).map((l) => ({ ...l, verse: true })),
  ]
  const lignesPending = aRecevoir.isPending || verses.isPending
  const lignesError = aRecevoir.error ?? verses.error

  return (
    <ChefPage
      title="Revenus & paiements"
      subtitle="Ce que Labs Food vous verse, et le détail de chaque montant."
    >
      <div className="space-y-5">
        <ApprovalGate quoi="Vos revenus s’affichent" />

        {/* ── Les chiffres ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <p className="eyebrow mb-2">Versé en {ANNEE}</p>
            {verses.isPending ? (
              <Skeleton className="h-10 w-40" />
            ) : (
              <p className="tabular-nums font-display text-4xl font-bold text-navy">
                {moneyCents(verses.data?.totalNetCents ?? 0)}
              </p>
            )}
            <p className="mt-1 text-xs text-ink-soft">
              Sur {verses.data?.counts.paid ?? 0} prestation
              {(verses.data?.counts.paid ?? 0) > 1 ? 's' : ''}
            </p>
          </Card>

          <Card>
            <p className="eyebrow mb-2">À recevoir</p>
            {aRecevoir.isPending ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <p className="tabular-nums font-display text-2xl font-bold text-navy">
                {moneyCents(aRecevoir.data?.totalNetCents ?? 0)}
              </p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              Argent reçu par Labs Food, virement sous 2 jours ouvrés
            </p>
          </Card>

          <Card>
            <Wallet className="mb-2 h-4 w-4 text-amber-ink" aria-hidden />
            <p className="font-display text-2xl font-bold text-navy">
              {Math.round(ratio * 100)} %
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-ink-soft">
              du plafond micro-entreprise
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-deep">
              <div
                className={`h-full rounded-full ${alerte ? 'bg-red-500' : 'bg-mint-deep'}`}
                style={{ width: `${Math.min(100, ratio * 100)}%` }}
              />
            </div>
            <p className="tabular-nums mt-1 text-xs leading-relaxed text-ink-soft">
              {MICRO_CEILING_EUR.toLocaleString('fr-FR')} € — d’après vos seules
              prestations Lab’s Food.
            </p>
          </Card>
        </div>

        {alerte && (
          <p className="flex items-start gap-2 rounded-2xl bg-amber-soft/60 px-4 py-3 text-[13px] leading-relaxed text-navy">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-ink" aria-hidden />
            Vous approchez du plafond de la micro-entreprise. Au-delà, le régime
            change : parlez-en à votre comptable avant d’accepter de nouvelles
            prestations.
          </p>
        )}

        {/* ── Mes versements ───────────────────────────────────────────── */}
        <Card title="Mes versements">
          <p className="text-[13px] leading-relaxed text-ink-mid">
            Le client paie Labs Food. Labs Food vous achète la prestation au prix
            net et vous le vire. La TVA payée par le client va à l’État. La part
            payée par carte reste versée par Stripe, comme aujourd’hui.
          </p>
          {lignesPending ? (
            <LignesSkeleton />
          ) : lignesError ? (
            <p className="mt-3 text-[13px] text-ink-soft">{apiMessage(lignesError)}</p>
          ) : lignes.length === 0 ? (
            <Empty text="Aucun versement pour l’instant." />
          ) : (
            <TableVersements lignes={lignes} />
          )}
        </Card>

        {/* ── Mes autofactures ─────────────────────────────────────────── */}
        <Card title="Mes autofactures">
          <p className="text-[13px] leading-relaxed text-ink-mid">
            Labs Food les établit à votre nom à chaque virement
            (autofacturation). Elles valent facture pour votre comptabilité :
            vous n’avez rien à émettre.
          </p>
          {autofactures.isPending ? (
            <LignesSkeleton />
          ) : autofactures.isError ? (
            <p className="mt-3 text-[13px] text-ink-soft">{apiMessage(autofactures.error)}</p>
          ) : (autofactures.data ?? []).length === 0 ? (
            <Empty text="Aucune autofacture pour l’instant." />
          ) : (
            <ul className="mt-3 space-y-2">
              {(autofactures.data ?? []).map((a) => (
                <AutofactureRow key={a.id} autofacture={a} />
              ))}
            </ul>
          )}
        </Card>

        {/* ── Le CESU des clients, en lecture seule ────────────────────── */}
        <Card title="Paiements CESU de vos clients">
          <p className="text-[13px] leading-relaxed text-ink-mid">
            Vos clients paient en CESU à Labs Food, plus à vous. Vous n’avez plus
            rien à confirmer : on rapproche le virement du CRCESU automatiquement.
          </p>
          {cesu.isPending ? (
            <LignesSkeleton />
          ) : cesu.isError ? (
            <p className="mt-3 text-[13px] text-ink-soft">{apiMessage(cesu.error)}</p>
          ) : (cesu.data ?? []).length === 0 ? (
            <Empty text="Aucun paiement CESU pour l’instant." />
          ) : (
            <ul className="mt-3 space-y-1.5">
              {(cesu.data ?? []).map((p) => (
                <li
                  key={p.paymentId}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-cream-soft px-3 py-2 text-[12px]"
                >
                  <span className="tabular-nums font-semibold text-navy">
                    {moneyCents(p.amountTtc)}
                  </span>
                  <span className="text-ink-mid">{p.clientName ?? 'Client'}</span>
                  <span className="font-mono text-xs text-ink-soft">
                    {p.bookingReference ?? ''}
                  </span>
                  <span className="ml-auto text-ink-soft">
                    {statutLabel(p.settlementStatus)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ── Les factures de commission (carte) ───────────────────────── */}
        <Card title="Factures de commission">
          <p className="text-[13px] leading-relaxed text-ink-mid">
            Seulement pour les paiements par carte (et les prestations d’avant ce
            changement).
          </p>

          {factures.isPending ? (
            <LignesSkeleton />
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
          Comment vous êtes payé — compte bancaire, mandat de prélèvement — se
          règle dans{' '}
          <Link
            href="/espace-chef/remuneration"
            className="font-semibold text-amber-ink hover:underline"
          >
            Mode de rémunération
          </Link>
          .
        </p>
      </div>
    </ChefPage>
  )
}

/** Deux rangées de liste (montant + détail, p-3.5). */
function LignesSkeleton() {
  return (
    <SkeletonGroup className="mt-3 space-y-2">
      {[0, 1].map((i) => (
        <div key={i} className="flex items-start justify-between gap-3 rounded-2xl border border-transparent p-3.5">
          <div className="space-y-1">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
          <Skeleton className="h-7 w-20" />
        </div>
      ))}
    </SkeletonGroup>
  )
}

/* ── Le tableau des versements ─────────────────────────────────────────────── */

function TableVersements({ lignes }: { lignes: (ChefPayoutLine & { verse: boolean })[] }) {
  const th = 'px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-soft'
  const num = 'tabular-nums px-2 py-2 text-right whitespace-nowrap'
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[720px] text-[12px]">
        <thead className="border-b border-[rgba(31,42,55,0.08)]">
          <tr>
            <th className={th}>Réservation</th>
            <th className={th}>Paiement</th>
            <th className={`${th} text-right`}>Prix TTC</th>
            <th className={`${th} text-right`}>TVA</th>
            <th className={`${th} text-right`}>Prix HT</th>
            <th className={`${th} text-right`}>Part Labs Food</th>
            <th className={`${th} text-right`}>Frais CESU</th>
            <th className={`${th} text-right`}>Net</th>
            <th className={th}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.id ?? l.paymentId} className="border-b border-[rgba(31,42,55,0.05)]">
              <td className="px-2 py-2 font-mono text-xs text-ink-mid">
                {l.bookingReference ?? '—'}
              </td>
              <td className="px-2 py-2 text-ink-mid">
                {PAYOUT_METHOD_LABEL[l.method] ?? l.method}
              </td>
              <td className={num}>{moneyCents(l.amountTtcCents)}</td>
              <td className={num}>
                {moneyCents(l.amountVatCents)}{' '}
                <span className="text-ink-soft">({pct(l.vatRateBps)})</span>
              </td>
              <td className={num}>{moneyCents(l.amountHtCents)}</td>
              <td className={num}>
                − {moneyCents(l.commissionCents)}{' '}
                <span className="text-ink-soft">({pct(l.commissionRateBps)})</span>
              </td>
              <td className={num}>
                {l.cesuFeeCents > 0 ? `− ${moneyCents(l.cesuFeeCents)}` : '—'}
              </td>
              <td className={`${num} font-semibold text-navy`}>{moneyCents(l.netCents)}</td>
              <td className="px-2 py-2 whitespace-nowrap text-ink-mid">
                {l.verse ? `Versé le ${jour(l.paidAt)}` : 'À recevoir'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Une autofacture ───────────────────────────────────────────────────────── */

function AutofactureRow({ autofacture: a }: { autofacture: PayoutStatement }) {
  const toast = useToast()
  const telecharger = usePayoutStatementDownload()
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-cream-soft p-3.5">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-semibold text-navy">
          <FileText className="h-3.5 w-3.5 text-amber-ink" aria-hidden />
          {a.number}
        </p>
        <p className="mt-0.5 text-xs text-ink-soft">
          {jour(a.issuedAt)} · {a.lines} prestation{a.lines > 1 ? 's' : ''} ·{' '}
          <span className="tabular-nums">{moneyCents(a.netCents)}</span>
        </p>
      </div>
      <button
        onClick={() =>
          telecharger.mutate(a.id, {
            onSuccess: ({ url }) => window.open(url, '_blank', 'noopener'),
            onError: (e) => toast.error('Le téléchargement a échoué', apiMessage(e)),
          })
        }
        disabled={telecharger.isPending}
        className="btn btn-outline text-xs"
      >
        {telecharger.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Download className="h-3.5 w-3.5" aria-hidden />
        )}
        PDF
      </button>
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
            <FileText className="h-3.5 w-3.5 text-amber-ink" aria-hidden />
            {f.invoiceNumber}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {periode} · {f.commissionsCount} prestation
            {f.commissionsCount > 1 ? 's' : ''} · taux{' '}
            {(f.rateBps / 100).toLocaleString('fr-FR')} %
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-lg font-bold text-navy">
            {moneyCents(f.amountTtcCents)}
          </p>
          <p className="text-xs text-ink-soft">
            dont {moneyCents(f.amountVatCents)} de TVA
          </p>
        </div>
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[rgba(31,42,55,0.07)] pt-2 text-xs">
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
