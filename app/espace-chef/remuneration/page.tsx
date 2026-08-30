'use client'

import { useState } from 'react'
import { AlertTriangle, Check, Info, Repeat } from 'lucide-react'
import ChefPage, { Card } from '@/components/chef/ChefPage'
import StatusBadge from '@/components/chef/StatusBadge'
import { CHEF_PAYOUT_MODE } from '@/lib/chef/mock'
import {
  PAYOUT_MODE_LABEL,
  PAYOUT_MODE_STATUS_LABEL,
  PAYOUT_SWITCH_NOTICE_DAYS,
  type PayoutMode,
} from '@/lib/chef/states'

const euros = (n: number) => `${n.toLocaleString('fr-FR')} €`

export default function ChefPayoutModePage() {
  const [mode, setMode] = useState<PayoutMode>(CHEF_PAYOUT_MODE.mode)
  const [switching, setSwitching] = useState(false)
  const [effectiveAt, setEffectiveAt] = useState('')

  // La date de prise d'effet est calculée au moment de la demande (et non
  // pendant le rendu, qui doit rester pur).
  const request = (next: PayoutMode) => {
    if (next === mode) return
    setMode(next)
    setEffectiveAt(
      new Date(Date.now() + PAYOUT_SWITCH_NOTICE_DAYS * 86_400_000).toLocaleDateString('fr-FR'),
    )
    setSwitching(true)
  }

  return (
    <ChefPage
      title="Mode de rémunération"
      subtitle="Commission ou abonnement — les deux modes sont exclusifs."
    >
      <div className="space-y-5">
        {/* Mode actif */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-navy text-amber flex items-center justify-center">
                <Repeat className="w-5 h-5" />
              </span>
              <div>
                <p className="eyebrow mb-1">Mode actif</p>
                <div className="flex items-center gap-2">
                  <p className="font-display text-xl font-bold text-navy">
                    {PAYOUT_MODE_LABEL[CHEF_PAYOUT_MODE.mode]}
                  </p>
                  <StatusBadge tone={switching ? 'warning' : 'success'}>
                    {switching
                      ? PAYOUT_MODE_STATUS_LABEL.switching
                      : PAYOUT_MODE_STATUS_LABEL[CHEF_PAYOUT_MODE.status]}
                  </StatusBadge>
                </div>
                <p className="text-xs text-ink-soft mt-1">
                  Depuis le {new Date(CHEF_PAYOUT_MODE.since).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Préavis en cours */}
        {switching && (
          <div className="rounded-2xl border border-amber/30 bg-amber-soft/40 px-4 py-3.5 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-deep mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-navy">
                Changement demandé — préavis de {PAYOUT_SWITCH_NOTICE_DAYS} jours
              </p>
              <p className="text-xs text-ink-mid mt-0.5">
                Le passage en « {PAYOUT_MODE_LABEL[mode]} » prendra effet le{' '}
                <strong>{effectiveAt}</strong>. Votre mode actuel reste appliqué jusque-là.
              </p>
            </div>
            <button
              onClick={() => {
                setMode(CHEF_PAYOUT_MODE.mode)
                setSwitching(false)
              }}
              className="btn btn-outline text-xs px-3 py-2 shrink-0"
            >
              Annuler
            </button>
          </div>
        )}

        {/* Choix du mode */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ModeCard
            id="commission"
            active={mode === 'commission'}
            title="Commission"
            price={`${CHEF_PAYOUT_MODE.commissionRate} % par prestation`}
            points={[
              'Aucun frais fixe',
              'Prélevée à chaque prestation',
              'Idéal si votre activité est irrégulière',
            ]}
            onSelect={() => request('commission')}
          />
          <ModeCard
            id="subscription"
            active={mode === 'subscription'}
            title="Abonnement 0 %"
            price={`${euros(CHEF_PAYOUT_MODE.subscriptionPrice ?? 0)} / mois`}
            points={[
              'Aucune commission sur vos prestations',
              'Montant fixe, prélevé mensuellement',
              'Rentable au-delà d’un certain volume',
            ]}
            onSelect={() => request('subscription')}
          />
        </div>

        <div className="rounded-2xl bg-cream-soft px-4 py-3 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-ink-soft mt-0.5 shrink-0" />
          <p className="text-xs text-ink-mid leading-relaxed">
            Les deux modes sont <strong>exclusifs</strong> : activer l&apos;un résilie
            l&apos;autre à l&apos;issue du préavis de {PAYOUT_SWITCH_NOTICE_DAYS} jours.
            Les montants affichés sont indicatifs — tarifs en attente de validation.
          </p>
        </div>

        {/* Historique de facturation */}
        <Card title="Historique de facturation">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[440px]">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft border-b border-[rgba(31,42,55,0.08)]">
                  <th className="pb-2 font-normal">Période</th>
                  <th className="pb-2 font-normal">Mode</th>
                  <th className="pb-2 font-normal text-right">Montant</th>
                  <th className="pb-2 font-normal">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(31,42,55,0.06)]">
                {[
                  { p: 'Mars 2026', m: 'Commission', a: 128, s: 'Payée' },
                  { p: 'Février 2026', m: 'Commission', a: 96, s: 'Payée' },
                  { p: 'Janvier 2026', m: 'Commission', a: 142, s: 'Payée' },
                ].map((r) => (
                  <tr key={r.p}>
                    <td className="py-3 text-navy font-semibold">{r.p}</td>
                    <td className="py-3 text-ink-mid">{r.m}</td>
                    <td className="py-3 text-right font-display font-bold text-navy">
                      {euros(r.a)}
                    </td>
                    <td className="py-3">
                      <StatusBadge tone="success">{r.s}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-ink-soft mt-3">
            TVA 20 % appliquée sur la commission.
          </p>
        </Card>
      </div>
    </ChefPage>
  )
}

function ModeCard({
  active,
  title,
  price,
  points,
  onSelect,
}: {
  id: PayoutMode
  active: boolean
  title: string
  price: string
  points: string[]
  onSelect: () => void
}) {
  return (
    <div
      className={`rounded-3xl p-5 lg:p-6 border transition-colors ${
        active ? 'border-amber bg-amber-soft/30' : 'border-[rgba(31,42,55,0.08)] bg-paper'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-display text-lg font-bold text-navy">{title}</h3>
          <p className="text-sm text-terra font-semibold mt-0.5">{price}</p>
        </div>
        {active && <StatusBadge tone="warning">Sélectionné</StatusBadge>}
      </div>
      <ul className="space-y-2 mb-5">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-xs text-ink-mid">
            <Check className="w-3.5 h-3.5 text-mint-ink mt-0.5 shrink-0" />
            {p}
          </li>
        ))}
      </ul>
      <button
        onClick={onSelect}
        disabled={active}
        className={`btn w-full justify-center text-sm ${
          active ? 'btn-outline opacity-60 cursor-not-allowed' : 'btn-primary'
        }`}
      >
        {active ? 'Mode actuel' : 'Basculer sur ce mode'}
      </button>
    </div>
  )
}
