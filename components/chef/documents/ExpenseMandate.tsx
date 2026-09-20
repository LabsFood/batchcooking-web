'use client'

import { CheckCircle2, Clock } from 'lucide-react'
import type { ChefMission } from '@/lib/chef/mock'

/* ─────────────────────────────────────────────────────────────────────────────
   Mandat de débours.

   Quand le batch cooker fait les courses, il avance l'argent du client : ce
   document dit au nom de qui il achète, jusqu'à quel montant, et comment il est
   remboursé. Il est joint à la prestation et signé des deux côtés.

   Le texte ci-dessous est une trame de travail, à faire valider juridiquement
   avant mise en production.
   ───────────────────────────────────────────────────────────────────────────── */

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

export default function ExpenseMandate({
  mission,
  chefName,
  signedByChefAt,
  signedByClientAt,
  onSign,
}: {
  mission: ChefMission
  chefName: string
  signedByChefAt?: string
  signedByClientAt?: string
  onSign?: () => void
}) {
  const cap = mission.expenseCap ?? 0

  return (
    <article className="bg-paper">
      <header className="flex items-start justify-between gap-6 border-b-[1.5px] border-navy px-6 py-5 sm:px-8">
        <div>
          <p className="font-display text-lg font-bold leading-none text-navy">Lab&apos;s Food</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft">Mandat de débours</p>
        </div>
        <p className="text-right text-[11px] leading-relaxed text-ink-soft">
          Prestation n° <span className="font-semibold text-navy">{mission.reference}</span>
          <br />
          {dateLabel(mission.date)}
        </p>
      </header>

      <div className="space-y-5 px-6 py-6 text-sm leading-relaxed text-ink sm:px-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Party role="Mandant (client)" name={mission.client} detail={mission.address} />
          <Party role="Mandataire (batch cooker)" name={chefName} detail="Prestataire indépendant" />
        </div>

        <p>
          Le mandant confie au mandataire l’achat des denrées nécessaires à la prestation du{' '}
          <strong className="font-semibold text-navy">{dateLabel(mission.date)}</strong>, pour{' '}
          <strong className="font-semibold text-navy">{mission.persons} personnes</strong>, selon la liste de courses
          jointe.
        </p>

        <ul className="space-y-2 rounded-xl bg-cream-soft px-4 py-3">
          <Clause>
            Le mandataire achète <strong>au nom et pour le compte du mandant</strong> : les denrées appartiennent au
            mandant dès leur achat.
          </Clause>
          <Clause>
            Les achats ne dépassent pas{' '}
            <strong className="tabular-nums">{cap > 0 ? `${cap} €` : 'le plafond convenu'}</strong>. Au-delà, l’accord
            écrit du mandant est requis.
          </Clause>
          <Clause>
            Les sommes avancées sont remboursées <strong>à l’euro près</strong>, sur présentation des tickets de caisse
            remis à la fin de la prestation.
          </Clause>
          <Clause>
            Ce remboursement est un <strong>débours</strong> : il ne fait pas partie du prix de la prestation, n’est pas
            commissionné et n’ouvre pas droit au crédit d’impôt.
          </Clause>
          <Clause>
            Les produits non utilisés et les tickets restent chez le mandant à l’issue de la prestation.
          </Clause>
        </ul>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Signature label="Le client" at={signedByClientAt} pendingText="Signature demandée à la réservation" />
          <Signature label="Le batch cooker" at={signedByChefAt} pendingText="À signer avant les courses" />
        </div>

        {!signedByChefAt && onSign && (
          <button type="button" onClick={onSign} className="btn btn-primary w-full justify-center text-sm">
            Signer le mandat
          </button>
        )}

        <p className="text-[11px] leading-relaxed text-ink-soft">
          Trame de travail Lab&apos;s Food, à faire valider juridiquement avant mise en production.
        </p>
      </div>
    </article>
  )
}

function Party({ role, name, detail }: { role: string; name: string; detail: string }) {
  return (
    <div className="rounded-xl border border-[rgba(31,42,55,0.08)] px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-ink-soft">{role}</p>
      <p className="mt-0.5 text-sm font-semibold text-navy">{name}</p>
      <p className="text-[13px] text-ink-mid">{detail}</p>
    </div>
  )
}

function Clause({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-[13px] leading-relaxed text-ink-mid">
      <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-deep" />
      <span>{children}</span>
    </li>
  )
}

function Signature({ label, at, pendingText }: { label: string; at?: string; pendingText: string }) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl px-4 py-3 ${at ? 'bg-mint/50' : 'border border-dashed border-[rgba(31,42,55,0.2)]'}`}
    >
      {at ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint-ink" aria-hidden />
      ) : (
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
      )}
      <div>
        <p className={`text-[13px] font-semibold ${at ? 'text-mint-ink' : 'text-navy'}`}>{label}</p>
        <p className={`text-[12px] ${at ? 'text-mint-ink/80' : 'text-ink-soft'}`}>
          {at ? `Signé le ${dateLabel(at)}` : pendingText}
        </p>
      </div>
    </div>
  )
}
