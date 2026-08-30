'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Plus, X, ArrowRight, Send, ChefHat, Check } from 'lucide-react'
import { CUSTOM_REQUESTS, type CustomRequestStatus } from '@/lib/dashboard-mock'

const STATUS_LABEL: Record<CustomRequestStatus, string> = {
  draft: 'Brouillon',
  submitted: 'Envoyée',
  'in-review': 'En revue',
  quoted: 'Devis reçu',
  accepted: 'Acceptée',
  declined: 'Refusée',
}

const STATUS_COLOR: Record<CustomRequestStatus, string> = {
  draft: 'bg-cream-deep text-navy',
  submitted: 'bg-mint text-mint-ink',
  'in-review': 'bg-amber-soft text-amber-deep',
  quoted: 'bg-amber text-navy',
  accepted: 'bg-mint-deep text-mint-ink',
  declined: 'bg-red-100 text-red-700',
}

const DIETS = ['Végétarien', 'Vegan', 'Sans-gluten', 'Sans-lactose', 'Halal', 'Casher', 'High-protein']

export default function PersonnalisationPage() {
  const [persons, setPersons] = useState(3)
  const [meals, setMeals] = useState(4)
  const [diets, setDiets] = useState<string[]>([])
  const [brief, setBrief] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const toggle = (d: string) =>
    setDiets((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 4000)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
      {/* Form */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-paper rounded-3xl p-6 lg:p-8 border border-[rgba(31,42,55,0.06)]"
      >
        <p className="eyebrow mb-3">Nouvelle demande</p>
        <h2 className="font-display text-2xl font-bold text-navy mb-2">
          Décris ce que tu as <span className="text-terra italic font-medium">en tête.</span>
        </h2>
        <p className="text-ink-mid text-sm mb-6 leading-relaxed">
          Les chefs te répondent sous 24 h. Les options réelles (forfait + ajustement) s&apos;adaptent
          au nombre de personnes et de plats.
        </p>

        <form onSubmit={submit} className="space-y-5">
          {/* Counters */}
          <div className="grid grid-cols-2 gap-4">
            <Counter label="Personnes" value={persons} onChange={setPersons} min={1} max={20} />
            <Counter label="Plats" value={meals} onChange={setMeals} min={1} max={20} />
          </div>

          {/* Cuisine */}
          <Field label="Style culinaire">
            <input
              placeholder="Ex. Méditerranéen, asiatique, brunch, anniversaire…"
              className="input-base"
            />
          </Field>

          {/* Diets */}
          <Field label="Régimes & restrictions">
            <div className="flex flex-wrap gap-2">
              {DIETS.map((d) => {
                const on = diets.includes(d)
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() => toggle(d)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                      on
                        ? 'bg-amber text-navy font-semibold'
                        : 'bg-cream-soft text-ink-mid hover:bg-cream-deep'
                    }`}
                  >
                    {on ? <Check className="w-3 h-3 inline mr-1" /> : <Plus className="w-3 h-3 inline mr-1" />}
                    {d}
                  </button>
                )
              })}
            </div>
          </Field>

          {/* Brief */}
          <Field label="Le brief (raconte tout)">
            <textarea
              rows={5}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Ex. Brunch des 30 ans samedi 17 mai, ambiance Méditerranée. 8 personnes, 2 sans gluten, une végétarienne stricte. Un dessert wow attendu."
              className="input-base resize-none"
            />
          </Field>

          <div className="flex items-center gap-3">
            <button type="submit" className="btn btn-primary">
              {submitted ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {submitted ? 'Demande envoyée !' : 'Envoyer la demande'}
              {!submitted && <ArrowRight className="w-4 h-4 icon-arrow" />}
            </button>
            <p className="text-xs text-ink-soft">
              Réponse sous <span className="font-semibold text-navy">24h</span> ouvrées.
            </p>
          </div>
        </form>
      </motion.section>

      {/* Existing requests */}
      <section className="space-y-4">
        <h3 className="font-display text-lg font-bold text-navy">Mes demandes en cours</h3>
        {CUSTOM_REQUESTS.map((r) => (
          <div
            key={r.id}
            className="bg-paper rounded-3xl p-5 border border-[rgba(31,42,55,0.06)]"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="font-semibold text-navy text-sm leading-tight">{r.title}</p>
              <span
                className={`text-[10px] uppercase tracking-[0.12em] font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOR[r.status]}`}
              >
                {STATUS_LABEL[r.status]}
              </span>
            </div>
            <p className="text-xs text-ink-soft mb-3 line-clamp-3 leading-relaxed">
              {r.brief}
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cream-soft text-navy font-mono">{r.persons} pers.</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cream-soft text-navy font-mono">{r.meals} plats</span>
              {r.diet?.map((d) => (
                <span key={d} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-soft text-amber-deep font-mono">{d}</span>
              ))}
            </div>
            {r.quote && (
              <div className="rounded-xl bg-amber-soft/60 border border-amber/30 p-3 text-sm">
                <p className="text-[10px] uppercase tracking-[0.16em] text-amber-deep font-mono mb-1">Devis chef</p>
                <p className="font-display text-xl font-bold text-navy">{r.quote.amountTTC} €</p>
                <p className="text-[11px] text-ink-mid">soit {r.quote.amountAfterTax} € après crédit d&apos;impôt</p>
                {r.quote.note && <p className="text-[11px] text-ink-mid mt-1.5 italic">{r.quote.note}</p>}
                <div className="mt-3 flex gap-2">
                  <button className="text-[11px] font-semibold bg-navy text-amber rounded-full px-3 py-1.5">Accepter</button>
                  <button className="text-[11px] font-semibold text-ink-mid hover:text-navy">Discuter</button>
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="rounded-3xl border border-dashed border-amber/40 bg-amber-soft/30 p-5 text-sm text-ink-mid">
          <p className="font-semibold text-navy mb-1 inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber" /> Astuce
          </p>
          Plus le brief est précis (cuisson, événement, allergies), plus le devis tombe vite.
        </div>
      </section>
    </div>
  )
}

function Counter({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  min: number
  max: number
}) {
  return (
    <div>
      <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-soft mb-2">{label}</p>
      <div className="flex items-center gap-3 bg-cream-soft rounded-full p-1.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-full bg-paper text-navy font-bold flex items-center justify-center hover:bg-amber hover:text-navy transition-colors"
        >
          –
        </button>
        <span className="flex-1 text-center font-display text-xl font-bold text-navy">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-8 h-8 rounded-full bg-paper text-navy font-bold flex items-center justify-center hover:bg-amber transition-colors"
        >
          +
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-soft mb-2">{label}</p>
      {children}
    </div>
  )
}
