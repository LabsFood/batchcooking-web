'use client'

import { useState } from 'react'
import { CreditCard, Home, Info, MapPin, Plus, ShieldCheck, Star } from 'lucide-react'
import { ADDRESSES, PAYMENT_CARDS } from '@/lib/client/mock'
import { ApiError } from '@/lib/api/client'
import { apiMessage } from '@/lib/api/messages'
import {
  centimes,
  useFiscalAttestation,
  useMyUrssafLinks,
  URSSAF_LABEL,
  URSSAF_TON,
} from '@/lib/api/fiscal'

type Tab = 'addresses' | 'payments' | 'urssaf' | 'fiscal'

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

      {tab === 'urssaf' && <AvanceImmediate />}

      {tab === 'fiscal' && <Attestation />}
    </div>
  )
}

/* ── Avance immédiate ──────────────────────────────────────────────────────── */

/**
 * Les rattachements URSSAF, un par batch cooker.
 *
 * L'avance immédiate ne se règle pas une fois pour le compte : elle se demande
 * auprès de chaque batch cooker, et l'URSSAF instruit. C'est la raison pour
 * laquelle cet écran liste des lignes et non un interrupteur.
 *
 * La demande, elle, part depuis l'écran de paiement d'une prestation — c'est
 * là qu'elle a un sens, et c'est là que le batch cooker est connu.
 */
function AvanceImmediate() {
  const liens = useMyUrssafLinks()

  return (
    <section className="rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-5 lg:p-6">
      <h2 className="mb-1 font-display text-lg font-bold text-navy">
        Avance immédiate — mes rattachements
      </h2>
      <p className="mb-4 text-sm leading-relaxed text-ink-mid">
        L’avance immédiate de crédit d’impôt se met en place{' '}
        <strong>pour chaque batch cooker séparément</strong> : ce n’est pas un
        réglage global de votre compte.
      </p>

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-mint-deep/40 bg-mint/40 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-mint-ink" aria-hidden />
        <p className="text-xs leading-relaxed text-mint-ink">
          Avec un rattachement actif, vous ne payez que 50 % du montant :
          l’URSSAF verse directement l’autre moitié au batch cooker. Aucune
          avance de trésorerie de votre part, aucune déclaration à faire.
        </p>
      </div>

      {liens.isPending ? (
        <div className="h-20 animate-pulse rounded-2xl bg-cream-soft" />
      ) : liens.isError ? (
        <p className="text-sm text-ink-soft">{apiMessage(liens.error)}</p>
      ) : (liens.data ?? []).length === 0 ? (
        <div className="rounded-2xl bg-cream-soft px-4 py-6 text-center">
          <p className="text-sm text-ink-mid">Aucun rattachement pour l’instant.</p>
          <p className="mx-auto mt-1 max-w-prose text-xs leading-relaxed text-ink-soft">
            La demande se fait au moment de régler une prestation : choisissez
            « avance immédiate » sur l’écran de paiement, et l’URSSAF instruit.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {(liens.data ?? []).map((l) => (
            <li
              key={l.id}
              className="flex items-center gap-3 rounded-2xl border border-[rgba(31,42,55,0.08)] p-4"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream-soft">
                <ShieldCheck className="h-4 w-4 text-terra" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy">
                  {l.chefName ?? 'Batch cooker'}
                </p>
                <p className="text-xs text-ink-soft">
                  Demandé le {new Date(l.requestedAt).toLocaleDateString('fr-FR')}
                  {l.decidedAt
                    ? ` · réponse le ${new Date(l.decidedAt).toLocaleDateString('fr-FR')}`
                    : ''}
                </p>
                {l.refusalReason && (
                  <p className="mt-0.5 text-xs leading-relaxed text-red-700">
                    {l.refusalReason}
                  </p>
                )}
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  URSSAF_TON[l.status] ?? 'bg-cream-deep text-ink-mid'
                }`}
              >
                {URSSAF_LABEL[l.status] ?? l.status}
              </span>
            </li>
          ))}
        </ul>
      )}
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
    <section className="rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-5 lg:p-6">
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
