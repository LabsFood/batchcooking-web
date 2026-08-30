'use client'

import { useState } from 'react'
import { CreditCard, Home, Info, MapPin, Plus, ShieldCheck, Star } from 'lucide-react'
import {
  ADDRESSES,
  PAYMENT_CARDS,
  URSSAF_LINKS,
  URSSAF_STATUS_LABEL,
  type UrssafStatus,
} from '@/lib/client/mock'

const URSSAF_TONE: Record<UrssafStatus, string> = {
  active: 'bg-mint text-mint-ink',
  pending: 'bg-amber-soft text-amber-deep',
  none: 'bg-cream-deep text-ink-mid',
  refused: 'bg-red-100 text-red-700',
}

type Tab = 'addresses' | 'payments' | 'urssaf'

export default function AccountPage() {
  const [tab, setTab] = useState<Tab>('addresses')

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'addresses' as Tab, label: 'Adresses' },
            { id: 'payments' as Tab, label: 'Moyens de paiement' },
            { id: 'urssaf' as Tab, label: 'Avance immédiate' },
          ]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              tab === t.id
                ? 'bg-navy text-white'
                : 'bg-paper text-ink-mid border border-[rgba(31,42,55,0.1)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'addresses' && (
        <section className="bg-paper rounded-3xl p-5 lg:p-6 border border-[rgba(31,42,55,0.06)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-navy">Mes adresses</h2>
            <button className="btn btn-outline text-xs px-3.5 py-2">
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </button>
          </div>
          <ul className="space-y-2.5">
            {ADDRESSES.map((a) => (
              <li
                key={a.id}
                className="rounded-2xl border border-[rgba(31,42,55,0.08)] p-4 flex items-start gap-3"
              >
                <span className="w-10 h-10 rounded-xl bg-cream-soft flex items-center justify-center shrink-0">
                  <Home className="w-4 h-4 text-terra" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-navy">{a.label}</p>
                    {a.isDefault && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-mint text-mint-ink font-semibold inline-flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-current" /> Par défaut
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-mid mt-0.5 inline-flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-ink-soft" />
                    {a.street}, {a.postalCode} {a.city}
                  </p>
                  {a.accessCode && (
                    <p className="text-[11px] text-ink-soft mt-0.5">Code d&apos;accès : {a.accessCode}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'payments' && (
        <section className="bg-paper rounded-3xl p-5 lg:p-6 border border-[rgba(31,42,55,0.06)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-navy">Mes cartes</h2>
            <button className="btn btn-outline text-xs px-3.5 py-2">
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </button>
          </div>
          <ul className="space-y-2.5">
            {PAYMENT_CARDS.map((c) => (
              <li
                key={c.id}
                className="rounded-2xl border border-[rgba(31,42,55,0.08)] p-4 flex items-center gap-3"
              >
                <span className="w-10 h-10 rounded-xl bg-navy flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4 text-amber" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy">
                    {c.brand} •••• {c.last4}
                  </p>
                  <p className="text-xs text-ink-soft">Expire {c.expiry}</p>
                </div>
                {c.isDefault && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-mint text-mint-ink font-semibold">
                    Par défaut
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-ink-soft mt-4 leading-relaxed">
            Les cartes sont conservées de façon sécurisée par notre prestataire de
            paiement. Lab&apos;s Food n&apos;a jamais accès à vos numéros.
          </p>
        </section>
      )}

      {tab === 'urssaf' && (
        <section className="bg-paper rounded-3xl p-5 lg:p-6 border border-[rgba(31,42,55,0.06)]">
          <h2 className="font-display text-lg font-bold text-navy mb-1">
            Avance immédiate — mes rattachements
          </h2>
          <p className="text-sm text-ink-mid mb-4 leading-relaxed">
            L&apos;avance immédiate de crédit d&apos;impôt se met en place{' '}
            <strong>pour chaque batch cooker séparément</strong> : ce n&apos;est pas un
            réglage global de votre compte.
          </p>

          <div className="rounded-2xl border border-mint-deep/40 bg-mint/40 px-4 py-3 flex items-start gap-3 mb-5">
            <Info className="w-4 h-4 text-mint-ink mt-0.5 shrink-0" />
            <p className="text-xs text-mint-ink leading-relaxed">
              Avec un rattachement actif, vous ne payez que 50 % du montant : l&apos;URSSAF
              verse directement l&apos;autre moitié au chef. Aucune avance de trésorerie
              de votre part, aucune déclaration à faire.
            </p>
          </div>

          <ul className="space-y-2.5">
            {URSSAF_LINKS.map((l) => (
              <li
                key={l.chefId}
                className="rounded-2xl border border-[rgba(31,42,55,0.08)] p-4 flex items-center gap-3"
              >
                <span className="w-10 h-10 rounded-xl bg-cream-soft flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-terra" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy">{l.chefName}</p>
                  {l.since && (
                    <p className="text-xs text-ink-soft">
                      Depuis le {new Date(l.since).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
                <span
                  className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${URSSAF_TONE[l.status]}`}
                >
                  {URSSAF_STATUS_LABEL[l.status]}
                </span>
                {l.status === 'none' && (
                  <button className="btn btn-primary text-xs px-3.5 py-2 shrink-0">
                    Demander
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
