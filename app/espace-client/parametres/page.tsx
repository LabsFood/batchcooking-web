'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Bell, Mail, Lock, Eye, EyeOff, Trash2, Download, Globe, Save, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function ParametresPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [showPwd, setShowPwd] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [notifs, setNotifs] = useState({
    email: true,
    sms: false,
    weekly: true,
    marketing: false,
  })

  const flash = (label: string) => {
    setSavedAt(label)
    setTimeout(() => setSavedAt(null), 1800)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Compte */}
      <Section title="Mon compte" eyebrow="Identité" Icon={Mail}>
        <Field label="Nom complet">
          <input defaultValue={user?.name || ''} className="input-base" />
        </Field>
        <Field label="Email">
          <input type="email" defaultValue={user?.email || ''} className="input-base" />
        </Field>
        <Field label="Téléphone">
          <input type="tel" placeholder="+33 6 XX XX XX XX" className="input-base" />
        </Field>
        <Field label="Adresse de la session">
          <input placeholder="15 rue de la Paix, Paris 75001" className="input-base" />
        </Field>
        <button onClick={() => flash('compte')} className="btn btn-primary text-xs">
          {savedAt === 'compte' ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {savedAt === 'compte' ? 'Enregistré' : 'Mettre à jour'}
        </button>
      </Section>

      {/* Sécurité */}
      <Section title="Sécurité" eyebrow="Mot de passe" Icon={Lock}>
        <Field label="Mot de passe actuel">
          <div className="relative">
            <input type={showPwd ? 'text' : 'password'} className="input-base pr-12" />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-soft hover:text-navy"
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>
        <Field label="Nouveau mot de passe">
          <input type="password" className="input-base" placeholder="Minimum 8 caractères" />
        </Field>
        <button onClick={() => flash('pwd')} className="btn btn-primary text-xs">
          {savedAt === 'pwd' ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          Mettre à jour
        </button>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" eyebrow="Préférences" Icon={Bell}>
        {[
          { key: 'email', label: 'Emails de service', sub: 'Confirmations, rappels, listes de courses.' },
          { key: 'sms', label: 'SMS de session', sub: 'Pour le jour J, par ton chef.' },
          { key: 'weekly', label: 'Newsletter hebdo', sub: 'Le menu de la semaine, chaque lundi.' },
          { key: 'marketing', label: 'Offres spéciales', sub: 'Promos, événements, brunchs surprises.' },
        ].map((row) => (
          <div key={row.key} className="flex items-center justify-between py-2.5 border-b border-[rgba(31,42,55,0.06)] last:border-0">
            <div>
              <p className="text-sm font-semibold text-navy">{row.label}</p>
              <p className="text-xs text-ink-soft mt-0.5">{row.sub}</p>
            </div>
            <Toggle
              on={(notifs as any)[row.key]}
              onChange={(v) => setNotifs({ ...notifs, [row.key]: v } as typeof notifs)}
            />
          </div>
        ))}
      </Section>

      {/* Données + langue */}
      <Section title="Préférences & données" eyebrow="Confort" Icon={Globe}>
        <Field label="Langue">
          <select className="input-base">
            <option>Français</option>
            <option>English</option>
          </select>
        </Field>
        <Field label="Devise">
          <select className="input-base">
            <option>EUR (€)</option>
            <option>USD ($)</option>
          </select>
        </Field>
        <button className="inline-flex items-center gap-2 text-sm text-navy font-semibold hover:text-amber-deep transition-colors">
          <Download className="w-4 h-4" /> Télécharger mes données
        </button>
      </Section>

      {/* Danger zone */}
      <div className="lg:col-span-2 bg-red-50 border border-red-200 rounded-3xl p-6">
        <h3 className="font-display text-lg font-bold text-red-700 mb-2 flex items-center gap-2">
          <Trash2 className="w-4 h-4" /> Zone sensible
        </h3>
        <p className="text-sm text-red-700/80 mb-4 leading-relaxed">
          Supprimer ton compte effacera ton historique de commandes, tes préférences et tes badges.
          Cette action est irréversible.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              signOut()
              router.push('/')
            }}
            className="px-4 py-2 rounded-full bg-paper border border-red-300 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors"
          >
            Me déconnecter
          </button>
          <button className="px-4 py-2 rounded-full bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors">
            Supprimer mon compte
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  eyebrow,
  Icon,
  children,
}: {
  title: string
  eyebrow: string
  Icon: any
  children: React.ReactNode
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      className="bg-paper rounded-3xl p-6 border border-[rgba(31,42,55,0.06)]"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-mono text-ink-soft">{eyebrow}</p>
          <h3 className="font-display text-lg font-bold text-navy mt-0.5">{title}</h3>
        </div>
        <span className="w-9 h-9 rounded-xl bg-amber-soft text-amber-deep flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className="space-y-3">{children}</div>
    </motion.section>
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

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        on ? 'bg-amber' : 'bg-cream-deep'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
