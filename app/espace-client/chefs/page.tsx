'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Globe2, Info, MapPin, Search, ShoppingBasket, Star } from 'lucide-react'
import { CHEF_LISTINGS, PAYMENT_LABEL, URSSAF_LINKS, type ChefListing } from '@/lib/client/mock'

const euros = (n: number) => `${n.toLocaleString('fr-FR')} €`

/**
 * Trouver un batch cooker (CL-02) + fiche (CL-11).
 *
 * Contrainte § 6.1 : les moyens de paiement disponibles sont l'**intersection**
 * de ce que le chef accepte, du rattachement URSSAF du client **avec ce chef**,
 * et du choix fait sur la prestation. Ils se calculent donc APRÈS la sélection
 * du chef — jamais avant.
 */
export default function FindChefPage() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<ChefListing | null>(null)

  const list = CHEF_LISTINGS.filter((c) => {
    const q = query.toLowerCase()
    return (
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.specialties.some((s) => s.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-5">
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, ville, spécialité…"
          className="input-base pl-10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {list.map((c, i) => (
          <motion.button
            key={c.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            onClick={() => setSelected(c)}
            className={`text-left bg-paper rounded-3xl p-5 border transition-colors ${
              selected?.id === c.id
                ? 'border-amber'
                : 'border-[rgba(31,42,55,0.06)] hover:border-amber/40'
            }`}
          >
            <div className="flex items-start gap-3 mb-3">
              <span className="w-12 h-12 rounded-2xl bg-navy text-amber font-display font-bold flex items-center justify-center shrink-0">
                {c.name.split(' ').map((n) => n[0]).join('')}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-base font-bold text-navy truncate">{c.name}</p>
                <p className="text-xs text-ink-soft inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {c.city} · {c.zone}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mb-3">
              <Star className="w-3.5 h-3.5 text-amber fill-amber" />
              <span className="text-sm font-bold text-navy">{c.rating}</span>
              <span className="text-xs text-ink-soft">({c.reviews} avis)</span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {c.badges.map((b) => (
                <span key={b} className="text-[10px] px-2 py-0.5 rounded-full bg-mint text-mint-ink font-medium">
                  {b}
                </span>
              ))}
              {c.specialties.map((s) => (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-cream-soft text-navy font-medium">
                  {s}
                </span>
              ))}
            </div>

            <div className="pt-3 border-t border-[rgba(31,42,55,0.06)] flex items-end justify-between">
              <div>
                <p className="font-display text-lg font-bold text-navy">{euros(c.basePrice)}</p>
                <p className="text-[10px] text-terra font-semibold">
                  soit {euros(c.basePrice / 2)} après crédit d&apos;impôt
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-terra" />
            </div>
          </motion.button>
        ))}
      </div>

      {selected && <ChefDetail chef={selected} />}
    </div>
  )
}

function ChefDetail({ chef }: { chef: ChefListing }) {
  // Intersection des moyens de paiement (§ 6.1).
  const link = URSSAF_LINKS.find((l) => l.chefId === chef.id)
  const available = chef.acceptedPayments.filter((p) => {
    if (p !== 'urssaf') return true
    return link?.status === 'active'
  })
  const blockedUrssaf = chef.acceptedPayments.includes('urssaf') && link?.status !== 'active'

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-paper rounded-3xl p-5 lg:p-6 border border-[rgba(31,42,55,0.06)]"
    >
      <h2 className="font-display text-xl font-bold text-navy mb-1">{chef.name}</h2>
      <p className="text-sm text-ink-mid mb-5">
        {chef.city} · intervention jusqu&apos;à {chef.zone}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <Block title="Langues">
            <div className="flex flex-wrap gap-1.5">
              {chef.languages.map((l) => (
                <span key={l} className="text-[11px] px-2.5 py-1 rounded-full bg-cream-soft text-navy inline-flex items-center gap-1">
                  <Globe2 className="w-3 h-3" /> {l}
                </span>
              ))}
            </div>
          </Block>

          <Block title="Courses">
            {chef.shoppingIncluded ? (
              <p className="text-sm text-ink-mid inline-flex items-center gap-2">
                <ShoppingBasket className="w-4 h-4 text-terra" />
                Réalisées par le chef — {euros(chef.shoppingFee)}
              </p>
            ) : (
              <p className="text-sm text-ink-soft">À votre charge</p>
            )}
          </Block>
        </div>

        {/* Moyens de paiement calculés APRÈS le choix du chef */}
        <div className="rounded-2xl bg-cream-soft p-4">
          <p className="eyebrow mb-3">Moyens de paiement disponibles</p>
          <ul className="space-y-2">
            {available.map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm text-navy font-medium">
                <Check className="w-4 h-4 text-mint-ink" />
                {PAYMENT_LABEL[p]}
              </li>
            ))}
          </ul>

          {blockedUrssaf && (
            <div className="mt-3 rounded-xl border border-amber/30 bg-amber-soft/50 px-3.5 py-2.5 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-amber-deep mt-0.5 shrink-0" />
              <p className="text-[11px] text-ink-mid leading-relaxed">
                Ce chef accepte l&apos;avance immédiate, mais votre rattachement URSSAF
                avec lui{' '}
                {link?.status === 'pending' ? 'est en cours de validation' : "n'est pas encore fait"}.
                Rendez-vous dans <strong>Mon compte → Avance immédiate</strong>.
              </p>
            </div>
          )}

          <button className="btn btn-primary w-full justify-center text-sm mt-4">
            Composer ma session <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.section>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-2">{title}</p>
      {children}
    </div>
  )
}
