'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, X, Sparkles, Flame, Save, Check } from 'lucide-react'
import { DEFAULT_PREFS, type ProfilePrefs } from '@/lib/dashboard-mock'
import { useAuth } from '@/lib/auth-context'

const SUGGEST = {
  diets: ['Végétarien', 'Vegan', 'Sans-porc', 'Sans-bœuf', 'Halal', 'Casher', 'Sans-gluten', 'Sans-lactose'],
  allergies: ['Fruits à coque', 'Arachides', 'Œufs', 'Poisson', 'Crustacés', 'Soja', 'Sésame'],
  favorites: ['Risotto', 'Curry', 'Lasagnes', 'Tajine', 'Wok', 'Saumon', 'Pad thaï'],
}

export default function ProfilPage() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState<ProfilePrefs>(DEFAULT_PREFS)
  const [saved, setSaved] = useState(false)

  const addTo = (key: 'diets' | 'allergies' | 'dislikes' | 'favorites', value: string) => {
    if (!value.trim()) return
    setPrefs((p) => ({ ...p, [key]: Array.from(new Set([...p[key], value.trim()])) }))
  }
  const removeFrom = (key: 'diets' | 'allergies' | 'dislikes' | 'favorites', value: string) => {
    setPrefs((p) => ({ ...p, [key]: p[key].filter((x) => x !== value) }))
  }

  const save = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      {/* Avatar + identity */}
      <aside className="space-y-4">
        <div className="bg-navy text-white rounded-3xl p-5 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-amber/25 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-amber text-navy text-2xl font-display font-bold flex items-center justify-center mb-3">
              {user?.name?.[0]?.toUpperCase() || 'G'}
            </div>
            <p className="font-display text-lg font-bold">{user?.name || 'Invité'}</p>
            <p className="text-white/55 text-xs">{user?.email}</p>
            <button className="mt-4 text-[11px] uppercase tracking-[0.16em] font-semibold text-amber hover:text-white transition-colors">
              Changer ma photo
            </button>
          </div>
        </div>

        <div className="bg-paper rounded-3xl p-5 border border-[rgba(31,42,55,0.06)]">
          <p className="eyebrow mb-3">Foyer</p>
          <div className="grid grid-cols-2 gap-3">
            <Counter
              label="Adultes"
              value={prefs.household.adults}
              onChange={(n) => setPrefs({ ...prefs, household: { ...prefs.household, adults: n } })}
            />
            <Counter
              label="Enfants"
              value={prefs.household.kids}
              onChange={(n) => setPrefs({ ...prefs, household: { ...prefs.household, kids: n } })}
            />
          </div>
        </div>

        <button
          onClick={save}
          className="btn btn-primary w-full justify-center"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Profil enregistré' : 'Enregistrer'}
        </button>
      </aside>

      {/* Cards */}
      <section className="space-y-5">
        <Card title="Régimes alimentaires" eyebrow="Tu manges comment ?" Icon={Sparkles}>
          <Tags
            items={prefs.diets}
            onRemove={(v) => removeFrom('diets', v)}
            suggest={SUGGEST.diets}
            onAdd={(v) => addTo('diets', v)}
          />
        </Card>

        <Card title="Allergies" eyebrow="Pas touche !" Icon={Flame} accent="red">
          <Tags
            items={prefs.allergies}
            onRemove={(v) => removeFrom('allergies', v)}
            suggest={SUGGEST.allergies}
            onAdd={(v) => addTo('allergies', v)}
            tone="red"
          />
        </Card>

        <Card title="Plats préférés" eyebrow="Hall of fame" Icon={Sparkles}>
          <Tags
            items={prefs.favorites}
            onRemove={(v) => removeFrom('favorites', v)}
            suggest={SUGGEST.favorites}
            onAdd={(v) => addTo('favorites', v)}
            tone="mint"
          />
        </Card>

        <Card title="Aliments à éviter" eyebrow="Pas mes goûts" Icon={X}>
          <Tags
            items={prefs.dislikes}
            onRemove={(v) => removeFrom('dislikes', v)}
            suggest={[]}
            onAdd={(v) => addTo('dislikes', v)}
          />
        </Card>

        <Card title="Niveau d’épice" eyebrow="Le piment" Icon={Flame}>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setPrefs({ ...prefs, spiceLevel: n as ProfilePrefs['spiceLevel'] })}
                className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-colors ${
                  n <= prefs.spiceLevel ? 'bg-amber text-navy' : 'bg-cream-soft text-ink-mid'
                }`}
              >
                {'🌶️'.repeat(n)}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Notes sur ta cuisine" eyebrow="Hardware" Icon={Sparkles}>
          <textarea
            rows={3}
            value={prefs.kitchenNotes}
            onChange={(e) => setPrefs({ ...prefs, kitchenNotes: e.target.value })}
            placeholder="Plaque, four, robot, espace de découpe…"
            className="input-base resize-none"
          />
        </Card>
      </section>
    </div>
  )
}

function Card({
  title,
  eyebrow,
  Icon,
  children,
  accent,
}: {
  title: string
  eyebrow: string
  Icon: any
  children: React.ReactNode
  accent?: 'red'
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="bg-paper rounded-3xl p-5 lg:p-6 border border-[rgba(31,42,55,0.06)]"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-mono text-ink-soft">{eyebrow}</p>
          <h3 className="font-display text-lg font-bold text-navy mt-0.5">{title}</h3>
        </div>
        <span
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            accent === 'red' ? 'bg-red-100 text-red-700' : 'bg-amber-soft text-amber-deep'
          }`}
        >
          <Icon className="w-4 h-4" />
        </span>
      </div>
      {children}
    </motion.div>
  )
}

function Tags({
  items,
  onRemove,
  suggest,
  onAdd,
  tone = 'amber',
}: {
  items: string[]
  onRemove: (v: string) => void
  suggest: string[]
  onAdd: (v: string) => void
  tone?: 'amber' | 'red' | 'mint'
}) {
  const [draft, setDraft] = useState('')
  const toneClass =
    tone === 'red'
      ? 'bg-red-100 text-red-700'
      : tone === 'mint'
        ? 'bg-mint text-mint-ink'
        : 'bg-amber-soft text-amber-deep'

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {items.map((v) => (
          <span key={v} className={`text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 ${toneClass}`}>
            {v}
            <button onClick={() => onRemove(v)} className="opacity-60 hover:opacity-100">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {items.length === 0 && (
          <span className="text-xs text-ink-soft">Rien pour l&apos;instant.</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onAdd(draft)
              setDraft('')
            }
          }}
          placeholder="Ajouter…"
          className="input-base text-sm flex-1"
        />
        <button
          type="button"
          onClick={() => {
            onAdd(draft)
            setDraft('')
          }}
          className="px-4 rounded-xl bg-navy text-amber text-xs font-semibold hover:bg-navy-deep transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {suggest.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggest
            .filter((s) => !items.includes(s))
            .slice(0, 8)
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onAdd(s)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-cream-soft text-ink-mid hover:bg-amber-soft hover:text-amber-deep transition-colors"
              >
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

function Counter({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-soft mb-2">{label}</p>
      <div className="flex items-center bg-cream-soft rounded-full p-1.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-8 h-8 rounded-full bg-paper flex items-center justify-center font-bold"
        >
          –
        </button>
        <span className="flex-1 text-center font-display text-lg font-bold text-navy">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="w-8 h-8 rounded-full bg-paper flex items-center justify-center font-bold"
        >
          +
        </button>
      </div>
    </div>
  )
}
