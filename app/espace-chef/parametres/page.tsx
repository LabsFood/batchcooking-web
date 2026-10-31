'use client'

import { useState } from 'react'
import { Bell, Globe2, LogOut, ShieldCheck, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import ChefPage, { Card } from '@/components/chef/ChefPage'
import { useAuth } from '@/lib/auth-context'
import { CHEF_PROFILE } from '@/lib/chef/mock'
import { SAP_PATH_LABEL } from '@/lib/chef/states'

const NOTIFICATIONS = [
  { id: 'requests', label: 'Nouvelles demandes', hint: 'Push + e-mail' },
  { id: 'offers', label: 'Réponses à mes offres', hint: 'Push + e-mail' },
  { id: 'documents', label: 'Documents et expirations', hint: 'E-mail' },
  { id: 'payouts', label: 'Versements', hint: 'E-mail' },
  { id: 'disputes', label: 'Litiges', hint: 'Push + e-mail' },
]

export default function ChefSettingsPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [enabled, setEnabled] = useState<string[]>(NOTIFICATIONS.map((n) => n.id))

  const toggle = (id: string) =>
    setEnabled((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <ChefPage title="Paramètres" subtitle="Compte, notifications, langue et données.">
      <div className="space-y-5 max-w-3xl">
        <Card title="Mon compte">
          <div className="space-y-3">
            <Field label="Nom" value={user?.name || CHEF_PROFILE.name} />
            <Field label="Email" value={user?.email || '—'} />
            <Field label="Ville" value={CHEF_PROFILE.city} />
            <Field label="Voie SAP" value={SAP_PATH_LABEL[CHEF_PROFILE.sapPath]} />
          </div>
        </Card>

        <Card title="Notifications">
          <ul className="space-y-2">
            {NOTIFICATIONS.map((n) => {
              const on = enabled.includes(n.id)
              return (
                <li
                  key={n.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-[rgba(31,42,55,0.08)] px-4 py-3"
                >
                  <div className="min-w-0 flex items-start gap-3">
                    <Bell className="w-4 h-4 text-terra mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-navy">{n.label}</p>
                      <p className="text-xs text-ink-soft">{n.hint}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggle(n.id)}
                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                      on ? 'bg-amber' : 'bg-cream-deep'
                    }`}
                    aria-label={n.label}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                        on ? 'left-[22px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card title="Langue">
          <div className="flex items-center gap-3">
            <Globe2 className="w-4 h-4 text-terra" />
            <select className="input-base max-w-xs" defaultValue="fr">
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
          <p className="text-xs text-ink-soft mt-2">
            Les traductions complètes arrivent dans une prochaine version.
          </p>
        </Card>

        <Card title="Sécurité & données">
          <div className="space-y-3">
            <button className="btn btn-outline w-full justify-start text-sm">
              <ShieldCheck className="w-4 h-4" /> Changer mon mot de passe
            </button>
            <button
              onClick={() => {
                signOut()
                router.push('/')
              }}
              className="btn btn-outline w-full justify-start text-sm"
            >
              <LogOut className="w-4 h-4" /> Me déconnecter
            </button>
            <button className="w-full flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors">
              <Trash2 className="w-4 h-4" /> Supprimer mon compte
            </button>
            <p className="text-xs text-ink-soft leading-relaxed">
              La suppression est définitive. Vos prestations passées sont conservées de
              façon anonymisée pour des raisons comptables et légales.
            </p>
          </div>
        </Card>
      </div>
    </ChefPage>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-[rgba(31,42,55,0.06)] last:border-0">
      <span className="text-xs uppercase tracking-wide text-ink-soft">{label}</span>
      <span className="text-sm font-semibold text-navy text-right">{value}</span>
    </div>
  )
}
