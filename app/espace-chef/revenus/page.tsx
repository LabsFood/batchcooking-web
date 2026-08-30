'use client'

import { Info, TrendingUp, Wallet } from 'lucide-react'
import ChefPage, { Card } from '@/components/chef/ChefPage'
import StatusBadge from '@/components/chef/StatusBadge'
import { CHEF_EARNINGS, CHEF_MISSIONS, CHEF_PROFILE } from '@/lib/chef/mock'
import {
  MICRO_ALERT_RATIO,
  MICRO_CEILING_EUR,
  PAYMENT_CIRCUIT,
  PAYMENT_METHOD_LABEL,
} from '@/lib/chef/states'

const euros = (n: number) => `${n.toLocaleString('fr-FR')} €`

/**
 * Voie SAP Type B (coopérative) : la plateforme n'émet ni facture de prestation
 * ni attestation fiscale — ces blocs doivent être **masqués**, pas vidés
 * (§ 3.4 du brief), sous peine de double facturation.
 */
const SHOW_SAP_INVOICES = CHEF_PROFILE.sapPath === 'type-a'

export default function ChefEarningsPage() {
  const ratio = CHEF_EARNINGS.yearRevenue / MICRO_CEILING_EUR
  const alert = ratio >= MICRO_ALERT_RATIO
  const billable = CHEF_MISSIONS.filter((m) => m.status === 'done' || m.status === 'in-progress')

  return (
    <ChefPage title="Revenus & paiements" subtitle="Votre solde, vos versements et le détail par prestation.">
      <div className="space-y-5">
        {/* Solde */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <p className="eyebrow mb-2">Solde disponible</p>
            <p className="font-display text-4xl font-bold text-navy">{euros(CHEF_EARNINGS.balance)}</p>
            <p className="text-xs text-ink-soft mt-1">
              Prochain versement le{' '}
              {new Date(CHEF_EARNINGS.nextPayoutAt).toLocaleDateString('fr-FR')}
            </p>
          </Card>

          <Card>
            <TrendingUp className="w-4 h-4 text-terra mb-2" />
            <p className="font-display text-2xl font-bold text-navy">{euros(CHEF_EARNINGS.monthNet)}</p>
            <p className="text-[11px] uppercase tracking-wide text-ink-soft mt-1">Net ce mois</p>
          </Card>

          <Card>
            <Wallet className="w-4 h-4 text-terra mb-2" />
            <p className="font-display text-2xl font-bold text-navy">{euros(CHEF_EARNINGS.yearRevenue)}</p>
            <p className="text-[11px] uppercase tracking-wide text-ink-soft mt-1">CA de l&apos;année</p>
            <div className="h-1.5 rounded-full bg-cream-deep overflow-hidden mt-2">
              <div
                className={`h-full rounded-full ${alert ? 'bg-red-500' : 'bg-mint-deep'}`}
                style={{ width: `${Math.min(100, ratio * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-ink-soft mt-1">
              {Math.round(ratio * 100)} % du plafond ({euros(MICRO_CEILING_EUR)})
            </p>
          </Card>
        </div>

        {/* Suivi par moyen de paiement — les deux circuits */}
        <Card title="Suivi par moyen de paiement">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {CHEF_EARNINGS.byMethod.map((m) => {
              const circuit = PAYMENT_CIRCUIT[m.method]
              return (
                <div key={m.method} className="rounded-2xl border border-[rgba(31,42,55,0.08)] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-navy">
                      {PAYMENT_METHOD_LABEL[m.method]}
                    </p>
                    <StatusBadge tone={circuit === 'platform' ? 'info' : 'warning'}>
                      {circuit === 'platform' ? 'Split' : 'Direct'}
                    </StatusBadge>
                  </div>
                  <Line label="Encaissé" value={euros(m.gross)} />
                  <Line label="Commission" value={`− ${euros(m.commission)}`} muted />
                  <div className="my-2 border-t border-[rgba(31,42,55,0.08)]" />
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-ink-mid">Net</span>
                    <span className="font-display text-xl font-bold text-navy">{euros(m.net)}</span>
                  </div>
                  <p className="text-[11px] text-ink-soft mt-2 leading-relaxed">{m.note}</p>
                </div>
              )
            })}
          </div>
          <div className="mt-4 rounded-xl bg-cream-soft px-4 py-3 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-ink-soft mt-0.5 shrink-0" />
            <p className="text-xs text-ink-mid leading-relaxed">
              En <strong>carte bancaire</strong>, la plateforme encaisse et prélève sa
              commission au moment du paiement. En <strong>avance immédiate</strong> et{' '}
              <strong>CESU</strong>, l&apos;argent vous est versé directement : la commission
              est prélevée ensuite sur votre compte pro (mandat SEPA B2B).
            </p>
          </div>
        </Card>

        {/* Détail par prestation */}
        <Card title="Détail par prestation">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft border-b border-[rgba(31,42,55,0.08)]">
                  <th className="pb-2 font-normal">Référence</th>
                  <th className="pb-2 font-normal">Client</th>
                  <th className="pb-2 font-normal">Moyen</th>
                  <th className="pb-2 font-normal text-right">Montant</th>
                  <th className="pb-2 font-normal text-right">Commission</th>
                  <th className="pb-2 font-normal text-right">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(31,42,55,0.06)]">
                {billable.map((m) => (
                  <tr key={m.id}>
                    <td className="py-3 font-mono text-[11px] text-ink-soft">{m.reference}</td>
                    <td className="py-3 font-semibold text-navy">{m.client}</td>
                    <td className="py-3 text-xs text-ink-mid">
                      {PAYMENT_METHOD_LABEL[m.paymentMethod]}
                    </td>
                    <td className="py-3 text-right text-ink-mid">{euros(m.amountTTC)}</td>
                    <td className="py-3 text-right text-ink-soft">− {euros(m.commission)}</td>
                    <td className="py-3 text-right font-display font-bold text-navy">
                      {euros(m.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Factures & attestations — masquées en Type B */}
        {SHOW_SAP_INVOICES ? (
          <Card title="Factures & attestations">
            <p className="text-sm text-ink-mid">
              Factures de prestation et attestation fiscale annuelle.
            </p>
          </Card>
        ) : (
          <div className="rounded-2xl border border-[rgba(31,42,55,0.1)] bg-cream-soft px-4 py-3.5 flex items-start gap-3">
            <Info className="w-4 h-4 text-ink-soft mt-0.5 shrink-0" />
            <p className="text-xs text-ink-mid leading-relaxed">
              <span className="font-semibold text-navy">Voie Type B (coopérative).</span>{' '}
              Les factures de prestation et l&apos;attestation fiscale sont émises par la
              coopérative, pas par Lab&apos;s Food — ces documents ne figurent donc pas ici.
              Seule la facture de commission vous est adressée.
            </p>
          </div>
        )}
      </div>
    </ChefPage>
  )
}

function Line({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-0.5">
      <span className="text-xs text-ink-soft">{label}</span>
      <span className={`text-sm ${muted ? 'text-ink-soft' : 'font-semibold text-navy'}`}>{value}</span>
    </div>
  )
}
