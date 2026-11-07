'use client'

import { useState } from 'react'
import { Bell, Globe2, LogOut, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import ChefPage, { Card } from '@/components/chef/ChefPage'
import DeleteMyAccount from '@/components/client/DeleteMyAccount'
import ChangePassword from '@/components/shared/ChangePassword'
import { useAuth } from '@/lib/auth-context'

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
  const [changingPassword, setChangingPassword] = useState(false)

  const toggle = (id: string) =>
    setEnabled((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <ChefPage title="Paramètres" subtitle="Compte, notifications, langue et données.">
      <div className="space-y-5 max-w-3xl">
        <Card title="Mon compte">
          <div className="space-y-3">
            {/* Ville et voie SAP venaient d'un profil fictif (« Nice »), le même
                pour chaque batch cooker : retirés tant que l'API ne les rend pas. */}
            <Field label="Nom" value={user?.name || '—'} />
            <Field label="Email" value={user?.email || '—'} />
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
            <button
              onClick={() => setChangingPassword((v) => !v)}
              aria-expanded={changingPassword}
              className="btn btn-outline w-full justify-start text-sm"
            >
              <ShieldCheck className="w-4 h-4" /> Changer mon mot de passe
            </button>
            {changingPassword && (
              <div className="space-y-3 rounded-2xl border border-[rgba(31,42,55,0.08)] p-4">
                <ChangePassword />
              </div>
            )}
            <button
              onClick={() => {
                signOut()
                router.push('/')
              }}
              className="btn btn-outline w-full justify-start text-sm"
            >
              <LogOut className="w-4 h-4" /> Me déconnecter
            </button>
            <div className="flex flex-wrap items-start gap-3">
              <DeleteMyAccount />
            </div>
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
