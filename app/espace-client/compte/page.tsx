'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CreditCard, Home, Info, MapPin, Pencil } from 'lucide-react'
import { ApiError } from '@/lib/api/client'
import { apiMessage } from '@/lib/api/messages'
import { useMeProfile } from '@/lib/api/me-profile'
import { PaymentInvoiceList, PaymentInvoicesInfo } from '@/components/shared/PaymentInvoiceList'
import type { ClientProfile } from '@/lib/api/types'
import { centimes, useFiscalAttestation } from '@/lib/api/fiscal'

type Tab = 'addresses' | 'payments' | 'invoices' | 'fiscal'

export default function AccountPage() {
  const [tab, setTab] = useState<Tab>('addresses')

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'addresses' as Tab, label: 'Adresses' },
            { id: 'payments' as Tab, label: 'Moyens de paiement' },
            { id: 'invoices' as Tab, label: 'Factures' },
            { id: 'fiscal' as Tab, label: 'Attestation fiscale' },
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

      {tab === 'addresses' && <Adresse />}

      {tab === 'payments' && <MoyensDePaiement />}

      {tab === 'invoices' && <Factures />}

      {tab === 'fiscal' && <Attestation />}
    </div>
  )
}

/* ── Factures ──────────────────────────────────────────────────────────────── */

/** Une facture par paiement par carte, au nom du batch cooker. */
function Factures() {
  return (
    <section className="card-shell rounded-3xl p-5 lg:p-6">
      <h2 className="flex items-center gap-1 font-display text-lg font-bold text-navy">
        Mes factures <PaymentInvoicesInfo side="client" />
      </h2>
      <p className="mb-4 mt-1 max-w-prose text-sm leading-relaxed text-ink-mid">
        Une facture par paiement par carte, au nom de votre batch cooker. Elles se
        retrouvent aussi sur chaque commande.
      </p>
      <PaymentInvoiceList side="client" emptyText="Aucune facture pour l’instant." />
    </section>
  )
}

/* ── Adresse ───────────────────────────────────────────────────────────────── */

/**
 * L'API garde une adresse par compte, sur le profil : celle des sessions. Elle
 * se modifie dans les paramètres, avec le reste de l'identité.
 */
function Adresse() {
  const me = useMeProfile()
  const p = me.data?.profileType === 'client' ? (me.data.profile as ClientProfile) : null
  const ville = [p?.addressPostalCode, p?.addressCity].filter(Boolean).join(' ')
  const ligne = [p?.addressStreet, ville].filter(Boolean).join(', ')

  return (
    <section className="card-shell rounded-3xl p-5 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-bold text-navy">Mon adresse</h2>
        <Link href="/espace-client/parametres" className="btn btn-outline text-xs px-3.5 py-2">
          <Pencil className="w-3.5 h-3.5" /> {ligne ? 'Modifier' : 'Ajouter'}
        </Link>
      </div>
      {me.isPending ? (
        <div className="h-20 animate-pulse rounded-2xl bg-cream-soft" />
      ) : me.isError ? (
        <p className="text-sm text-ink-soft">{apiMessage(me.error)}</p>
      ) : ligne ? (
        <div className="rounded-2xl border border-[rgba(31,42,55,0.08)] p-4 flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-cream-soft flex items-center justify-center shrink-0">
            <Home className="w-4 h-4 text-terra" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-navy">Adresse des sessions</p>
            <p className="text-xs text-ink-mid mt-0.5 inline-flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-ink-soft" />
              {ligne}
            </p>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl bg-cream-soft px-4 py-6 text-center text-sm text-ink-mid">
          Aucune adresse enregistrée.
        </p>
      )}
    </section>
  )
}

/* ── Moyens de paiement ────────────────────────────────────────────────────── */

/**
 * Aucune carte n'est enregistrée : chaque paiement passe par Stripe Checkout,
 * sans client Stripe, et la carte ne sert qu'une fois.
 */
function MoyensDePaiement() {
  return (
    <section className="card-shell rounded-3xl p-5 lg:p-6">
      <h2 className="font-display text-lg font-bold text-navy mb-4">Moyens de paiement</h2>
      <div className="rounded-2xl bg-cream-soft px-4 py-6 text-center">
        <CreditCard className="mx-auto h-5 w-5 text-ink-soft" aria-hidden />
        <p className="mt-2 text-sm text-ink-mid">Aucune carte enregistrée.</p>
        <p className="mx-auto mt-1 max-w-prose text-xs leading-relaxed text-ink-soft">
          Chaque prestation se règle au moment du paiement, sur la page sécurisée de Stripe :
          votre carte n’est pas conservée. Les titres CESU et l’avance immédiate se choisissent
          sur ce même écran.
        </p>
      </div>
    </section>
  )
}

/* ── Attestation fiscale ───────────────────────────────────────────────────── */

/**
 * L'attestation annuelle, celle qu'on joint à sa déclaration de revenus.
 *
 * Elle distingue deux montants, et la nuance n'est pas cosmétique : ce qui
 * **ouvre droit** au crédit d'impôt, et ce que **Lab's Food atteste**. Quand un
 * batch cooker déclare son activité lui-même (voie NOVA), c'est lui qui
 * atteste sa part — l'écran le dit, sinon la différence passe pour une erreur
 * de notre part.
 */
function Attestation() {
  const [annee, setAnnee] = useState(() => new Date().getFullYear() - 1)
  const a = useFiscalAttestation(annee)
  const annees = [annee + 1, annee, annee - 1]

  const vide = a.error instanceof ApiError && a.error.status === 404

  return (
    <section className="card-shell rounded-3xl p-5 lg:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-navy">
            Mon attestation fiscale
          </h2>
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-mid">
            Le montant à reporter sur votre déclaration de revenus. Il ne
            comprend pas les prestations réglées en avance immédiate : pour
            celles-là, le crédit d’impôt a déjà été déduit.
          </p>
        </div>
        <div className="flex gap-1.5">
          {annees.map((y) => (
            <button
              key={y}
              onClick={() => setAnnee(y)}
              aria-pressed={y === annee}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                y === annee
                  ? 'bg-navy text-white'
                  : 'border border-[rgba(31,42,55,0.1)] bg-paper text-ink-mid'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {a.isPending ? (
        <div className="h-28 animate-pulse rounded-2xl bg-cream-soft" />
      ) : vide ? (
        <p className="rounded-2xl bg-cream-soft px-4 py-6 text-center text-sm text-ink-mid">
          Aucune prestation réglée en {annee}.
        </p>
      ) : a.isError ? (
        <p className="text-sm text-ink-soft">{apiMessage(a.error)}</p>
      ) : (
        a.data && (
          <>
            <div className="rounded-2xl bg-navy p-5 text-white">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">
                Crédit d’impôt {annee}
              </p>
              <p className="mt-2 font-display text-4xl font-bold">
                {centimes(Math.round(a.data.eligibleAmountCents / 2))}
              </p>
              <p className="mt-1 text-sm text-white/70">
                soit la moitié de {centimes(a.data.eligibleAmountCents)} de
                prestations ouvrant droit, sur {a.data.paymentsCount} règlement
                {a.data.paymentsCount > 1 ? 's' : ''}
              </p>
            </div>

            {a.data.platformAttestedAmountCents !== a.data.eligibleAmountCents && (
              <p className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-soft/60 px-4 py-3 text-[13px] leading-relaxed text-navy">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-deep" aria-hidden />
                Lab’s Food atteste {centimes(a.data.platformAttestedAmountCents)}.
                Le reste est attesté par les batch cookers qui déclarent leur
                activité eux-mêmes : demandez-leur leur attestation.
              </p>
            )}

            <ul className="mt-4 space-y-2">
              {a.data.providers.map((p) => (
                <li
                  key={p.chefProfileId}
                  className="rounded-2xl border border-[rgba(31,42,55,0.08)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy">
                        {p.chefDisplayName}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {p.paymentsCount} règlement{p.paymentsCount > 1 ? 's' : ''}
                        {p.novaCode
                          ? ` · déclaration ${p.novaCode}`
                          : p.cooperativeName
                            ? ` · via ${p.cooperativeName}`
                            : ''}
                      </p>
                    </div>
                    <p className="font-display text-base font-bold text-navy">
                      {centimes(p.eligibleAmountCents)}
                    </p>
                  </div>
                  {!p.sapDeclared && (
                    <p className="mt-2 text-xs leading-relaxed text-amber-deep">
                      Ce batch cooker n’a pas déclaré son activité de service à la
                      personne : ces montants n’ouvrent pas droit au crédit
                      d’impôt.
                    </p>
                  )}
                  {p.notes.map((n) => (
                    <p key={n} className="mt-1 text-xs leading-relaxed text-ink-soft">
                      {n}
                    </p>
                  ))}
                </li>
              ))}
            </ul>

            <p className="mt-4 text-[11px] leading-relaxed text-ink-soft">
              Document généré à partir de vos règlements. Conservez-le : en cas
              de contrôle, c’est lui qui justifie le montant déclaré.
            </p>
          </>
        )
      )}
    </section>
  )
}
