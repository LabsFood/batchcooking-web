'use client'

import { motion } from 'framer-motion'
import { fadeUpInView } from '@/lib/motion'
import {
  Flame,
  Refrigerator,
  Blend,
  Cog,
  Utensils,
  ChefHat,
  Package,
  Scale,
  Cookie,
  Timer,
  CookingPot,
  Microwave,
} from 'lucide-react'

type Tier = 'indispensable' | 'recommande' | 'optionnel'

type Item = {
  Icon: any
  name: string
  desc: string
  tier: Tier
}

const ITEMS: Item[] = [
  { Icon: Microwave, name: 'Four', desc: 'Pour cuire vos plats au four', tier: 'indispensable' },
  { Icon: Flame, name: 'Plaque de cuisson', desc: 'Gaz, électrique ou induction', tier: 'indispensable' },
  { Icon: Refrigerator, name: 'Réfrigérateur', desc: 'Pour conserver vos préparations', tier: 'indispensable' },
  { Icon: Blend, name: 'Mixeur', desc: 'Pour soupes & sauces onctueuses', tier: 'recommande' },
  { Icon: Cog, name: 'Robot culinaire', desc: 'Gain de temps pour la préparation', tier: 'recommande' },
  { Icon: ChefHat, name: 'Couteaux de qualité', desc: 'Chef, émincer, d’office', tier: 'indispensable' },
  { Icon: Utensils, name: 'Planches à découper', desc: 'Plusieurs pour éviter contamination', tier: 'indispensable' },
  { Icon: CookingPot, name: 'Casseroles & poêles', desc: 'Différentes tailles', tier: 'indispensable' },
  { Icon: Package, name: 'Contenants hermétiques', desc: 'Pour stocker vos repas', tier: 'indispensable' },
  { Icon: Scale, name: 'Balance de cuisine', desc: 'Pour des portions précises', tier: 'recommande' },
  { Icon: Cookie, name: 'Batteur électrique', desc: 'Pour pâtisseries et desserts', tier: 'optionnel' },
  { Icon: Timer, name: 'Autocuiseur', desc: 'Cuisson rapide sous pression', tier: 'optionnel' },
]

const TIER_META: Record<Tier, { label: string; chip: string; dot: string; ring: string }> = {
  indispensable: {
    label: 'Indispensable',
    chip: 'bg-amber/15 text-amber-deep',
    dot: 'bg-amber',
    ring: 'ring-1 ring-amber/30 group-hover:ring-amber/60',
  },
  recommande: {
    label: 'Recommandé',
    chip: 'bg-mint text-mint-ink',
    dot: 'bg-mint-deep',
    ring: 'ring-1 ring-mint-deep/40 group-hover:ring-mint-deep/70',
  },
  optionnel: {
    label: 'Optionnel',
    chip: 'bg-cream-deep text-navy',
    dot: 'bg-navy/30',
    ring: 'ring-1 ring-[rgba(31,42,55,0.1)] group-hover:ring-[rgba(31,42,55,0.25)]',
  },
}

type Props = {
  variant?: 'cream' | 'paper'
  compact?: boolean
}

export default function EquipmentSection({ variant = 'cream', compact = false }: Props) {
  return (
    <section className={`${compact ? 'py-12' : 'section-padding'} ${variant === 'paper' ? 'section-paper' : 'section-cream-soft'}`}>
      <div className="container-xl">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="eyebrow mb-4 justify-center">Avant le jour J</p>
          <h2 className="h-section">
            Équipements de base.
          </h2>
          <p className="text-ink-mid mt-4 leading-relaxed text-sm">
            Voici ce dont vous aurez besoin pour profiter pleinement de la session de batch
            cooking à domicile. Pas de panique : la plupart des cuisines françaises sont déjà prêtes.
          </p>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {(Object.keys(TIER_META) as Tier[]).map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-mid"
              >
                <span className={`w-2 h-2 rounded-full ${TIER_META[t].dot}`} />
                {TIER_META[t].label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
          {ITEMS.map((it, i) => {
            const meta = TIER_META[it.tier]
            return (
              <motion.div
                key={it.name}
                // slow-out : chaque tuile se pose en 240 ms, décalée de 30 ms
                {...fadeUpInView(i * 0.03)}
                className={`group bg-paper rounded-2xl p-4 lg:p-5 ${meta.ring}`}
              >
                <div className={`w-10 h-10 rounded-xl ${meta.chip} flex items-center justify-center mb-3`}>
                  <it.Icon className="w-4 h-4" strokeWidth={2} />
                </div>
                <p className="font-semibold text-navy text-sm leading-tight">{it.name}</p>
                <p className="text-xs text-ink-soft mt-1 leading-relaxed">{it.desc}</p>
                <span className={`inline-flex mt-3 text-xs uppercase tracking-[0.12em] font-semibold px-2 py-0.5 rounded-full ${meta.chip}`}>
                  {meta.label}
                </span>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
