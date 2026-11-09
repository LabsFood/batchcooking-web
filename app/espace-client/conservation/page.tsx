'use client'

import { Flame, Info, Refrigerator, Snowflake, Timer } from 'lucide-react'
import { DISH_CARE } from '@/lib/client/mock'

/**
 * Réchauffage & conservation (CL-09).
 *
 * Fiche dérivée de la recette — jamais la recette elle-même (§ 6.5) : on
 * n'affiche que le mode de réchauffage, la conservation et le conditionnement.
 */
export default function ConservationPage() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-mint-deep/40 bg-mint/40 px-4 py-3 flex items-start gap-3">
        <Info className="w-4 h-4 text-mint-ink mt-0.5 shrink-0" />
        <p className="text-xs text-mint-ink leading-relaxed">
          Les durées de conservation démarrent au jour de la prestation. Respectez la
          chaîne du froid : replacez au réfrigérateur dans les deux heures.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {DISH_CARE.map((d) => (
          <section
            key={d.id}
            className="card-shell rounded-3xl p-5 lg:p-6"
          >
            <h3 className="font-display text-lg font-bold text-navy mb-4">{d.dish}</h3>

            <div className="rounded-2xl bg-cream-soft p-4 mb-4">
              <p className="text-[10px] uppercase tracking-wide text-ink-soft mb-2">
                Réchauffage
              </p>
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-navy">
                  <Flame className="w-4 h-4 text-terra" /> {d.reheatMode}
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm text-ink-mid">
                  <Timer className="w-4 h-4 text-ink-soft" /> {d.reheatTime}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <Box
                Icon={Refrigerator}
                label="Réfrigérateur"
                value={`${d.fridgeDays} jour${d.fridgeDays > 1 ? 's' : ''}`}
              />
              <Box
                Icon={Snowflake}
                label="Congélateur"
                value={d.freezerMonths ? `${d.freezerMonths} mois` : 'Déconseillé'}
                muted={!d.freezerMonths}
              />
            </div>

            <p className="text-xs text-ink-mid">
              <span className="text-ink-soft">Conditionnement : </span>
              {d.container}
            </p>

            {d.tip && (
              <div className="mt-3 rounded-xl border border-amber/30 bg-amber-soft/40 px-3.5 py-2.5">
                <p className="text-xs text-ink-mid leading-relaxed">
                  <span className="font-semibold text-navy">Astuce du chef — </span>
                  {d.tip}
                </p>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}

function Box({
  Icon,
  label,
  value,
  muted,
}: {
  Icon: typeof Flame
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="rounded-2xl border border-[rgba(31,42,55,0.08)] p-3 text-center">
      <Icon className={`w-4 h-4 mx-auto mb-1.5 ${muted ? 'text-ink-soft' : 'text-terra'}`} />
      <p className={`font-display text-base font-bold ${muted ? 'text-ink-soft' : 'text-navy'}`}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-ink-soft mt-0.5">{label}</p>
    </div>
  )
}
