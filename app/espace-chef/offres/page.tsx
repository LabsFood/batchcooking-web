'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarDays,
  Check,
  FileText,
  Send,
  Sparkles,
  Users,
} from 'lucide-react'
import ChefPage, { Card, Empty } from '@/components/chef/ChefPage'
import StatusBadge, { OfferBadge } from '@/components/chef/StatusBadge'
import { CHEF_OFFERS, CUSTOM_BRIEFS, type CustomBrief } from '@/lib/chef/mock'

/** Taux de commission — valeur de démonstration, décision client en attente. */
const COMMISSION_RATE = 0.1
/** Crédit d'impôt services à la personne : 50 %. */
const TAX_CREDIT = 0.5

const euros = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} €`
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

export default function ChefOffersPage() {
  const [selected, setSelected] = useState<CustomBrief | null>(null)

  return (
    <ChefPage
      title="Offres sur-mesure"
      subtitle="Répondez aux demandes personnalisées avec votre propre prix et vos conditions."
    >
      <div className="space-y-5">
        {/* Demandes reçues */}
        <Card title={`Demandes personnalisées reçues (${CUSTOM_BRIEFS.length})`}>
          {CUSTOM_BRIEFS.length === 0 ? (
            <Empty text="Aucune demande personnalisée pour le moment." />
          ) : (
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {CUSTOM_BRIEFS.map((b) => (
                <li
                  key={b.id}
                  className="rounded-2xl border border-[rgba(31,42,55,0.08)] p-4 flex flex-col"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-base font-bold text-navy">{b.occasion}</p>
                      <p className="text-xs text-ink-soft">
                        {b.client} · reçue le {shortDate(b.receivedAt)}
                      </p>
                    </div>
                    <StatusBadge tone="warning">À répondre</StatusBadge>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {b.wishes.map((w) => (
                      <span key={w} className="text-[11px] px-2.5 py-1 rounded-full bg-mint text-mint-ink">
                        {w}
                      </span>
                    ))}
                    {b.allergies.map((a) => (
                      <span key={a} className="text-[11px] px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                        ⚠ {a}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-cream-soft p-3 text-center">
                    <Mini Icon={Users} label="Convives" value={`${b.persons}`} />
                    <Mini Icon={CalendarDays} label="Date" value={shortDate(b.date)} />
                    <Mini Icon={Sparkles} label="Budget" value={euros(b.budgetHint)} />
                  </div>

                  <button
                    onClick={() => setSelected(b)}
                    className="btn btn-primary w-full justify-center mt-4 text-sm"
                  >
                    Composer une offre <ArrowRight className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Composeur */}
        {selected && <OfferComposer brief={selected} onClose={() => setSelected(null)} />}

        {/* Suivi */}
        <Card title="Suivi de mes offres">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft border-b border-[rgba(31,42,55,0.08)]">
                  <th className="pb-2 font-normal">Client</th>
                  <th className="pb-2 font-normal">Occasion</th>
                  <th className="pb-2 font-normal">Net</th>
                  <th className="pb-2 font-normal">Validité</th>
                  <th className="pb-2 font-normal">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(31,42,55,0.06)]">
                {CHEF_OFFERS.map((o) => (
                  <tr key={o.id}>
                    <td className="py-3 font-semibold text-navy">{o.client}</td>
                    <td className="py-3 text-ink-mid">{o.occasion}</td>
                    <td className="py-3 font-semibold text-navy">{euros(o.net)}</td>
                    <td className="py-3 text-xs text-ink-soft">
                      {new Date(o.validUntil) > new Date()
                        ? `jusqu'au ${shortDate(o.validUntil)}`
                        : 'échue'}
                    </td>
                    <td className="py-3">
                      <OfferBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </ChefPage>
  )
}

/**
 * Composeur d'offre.
 *
 * Contrainte § 6.2 : le batch cooker saisit son **net perçu**, jamais le prix
 * de vente. Le prix client et le montant après crédit d'impôt sont calculés et
 * affichés en temps réel.
 */
function OfferComposer({ brief, onClose }: { brief: CustomBrief; onClose: () => void }) {
  const [net, setNet] = useState(brief.budgetHint)
  const [validityDays, setValidityDays] = useState(7)
  const [conditions, setConditions] = useState('Courses incluses. Déplacement compris dans un rayon de 30 km.')
  const [sent, setSent] = useState(false)

  const clientPrice = net / (1 - COMMISSION_RATE)
  const commission = clientPrice - net
  const afterCredit = clientPrice * (1 - TAX_CREDIT)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        title={`Composer une offre — ${brief.client}`}
        action={
          <button onClick={onClose} className="text-xs text-ink-soft hover:text-navy">
            Fermer
          </button>
        }
      >
        {sent ? (
          <div className="py-8 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-mint-deep text-mint-ink">
              <Check className="h-6 w-6" />
            </span>
            <p className="font-display text-lg font-bold text-navy">Offre envoyée</p>
            <p className="text-sm text-ink-mid mt-1">
              Elle passera en « Vue » dès que {brief.client} l&apos;aura consultée.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-4">
              <div>
                <label className="label-muted block mb-2">Votre net perçu</label>
                <div className="relative">
                  <input
                    type="number"
                    value={net}
                    onChange={(e) => setNet(Math.max(0, Number(e.target.value)))}
                    className="input-base pr-10 font-display text-xl font-bold"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-soft">€</span>
                </div>
                <p className="text-[11px] text-ink-soft mt-1.5">
                  Vous saisissez ce que vous touchez. Le prix client est calculé automatiquement.
                </p>
              </div>

              <div>
                <label className="label-muted block mb-2">Validité de l&apos;offre</label>
                <div className="flex gap-2">
                  {[3, 7, 14].map((d) => (
                    <button
                      key={d}
                      onClick={() => setValidityDays(d)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        validityDays === d ? 'bg-amber text-navy' : 'bg-cream-soft text-ink-mid'
                      }`}
                    >
                      {d} jours
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label-muted block mb-2">Conditions</label>
                <textarea
                  rows={3}
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  className="input-base resize-none"
                />
              </div>
            </div>

            {/* Récapitulatif calculé en temps réel */}
            <aside className="bg-navy text-white rounded-2xl p-5 h-fit">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber mb-4">
                Récapitulatif
              </p>
              <Row label="Votre net perçu" value={euros(net)} strong />
              <Row label={`Commission (${COMMISSION_RATE * 100} %)`} value={euros(commission)} muted />
              <div className="my-3 border-t border-white/10" />
              <Row label="Prix client" value={euros(clientPrice)} strong />
              <Row
                label="Après crédit d'impôt"
                value={euros(afterCredit)}
                accent
              />
              <p className="text-[10px] text-white/45 mt-3 leading-relaxed">
                Taux de commission indicatif — en attente de la décision client.
              </p>
              <button
                onClick={() => setSent(true)}
                className="btn btn-amber w-full justify-center mt-4 text-sm"
              >
                <Send className="w-4 h-4" /> Envoyer l&apos;offre
              </button>
            </aside>
          </div>
        )}
      </Card>
    </motion.div>
  )
}

function Row({
  label,
  value,
  strong,
  muted,
  accent,
}: {
  label: string
  value: string
  strong?: boolean
  muted?: boolean
  accent?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className={`text-xs ${muted ? 'text-white/50' : 'text-white/70'}`}>{label}</span>
      <span
        className={`font-display font-bold ${
          accent ? 'text-amber text-lg' : strong ? 'text-white text-lg' : 'text-white/70 text-sm'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function Mini({
  Icon,
  label,
  value,
}: {
  Icon: typeof Users
  label: string
  value: string
}) {
  return (
    <div>
      <Icon className="w-3.5 h-3.5 text-terra mx-auto mb-1" />
      <p className="text-xs font-bold text-navy">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-ink-soft">{label}</p>
    </div>
  )
}
