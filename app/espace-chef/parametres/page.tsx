'use client'

import { useState } from 'react'
import { Bell, Globe2, LogOut, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import ChefPage, { Card } from '@/components/chef/ChefPage'
import DeleteMyAccount from '@/components/client/DeleteMyAccount'
import ChangePassword from '@/components/shared/ChangePassword'
import { useAuth } from '@/lib/auth-context'

/**
 * Ce que le batch cooker reçoit, sans interrupteur : rien n'est encore réglable
 * côté API. Les e-mails partent pour tout le monde ; les notifications push
 * n'existent pas encore (pas de push dans `public/sw.js`), d'où « Bientôt ».
 * Des interrupteurs gardés en `useState` laissaient croire le contraire.
 */
const NOTIFICATIONS = [
  { id: 'requests', label: 'Nouvelles demandes', push: true },
  { id: 'offers', label: 'Réponses à mes offres', push: true },
  { id: 'documents', label: 'Documents et expirations', push: false },
  { id: 'payouts', label: 'Versements', push: false },
  { id: 'disputes', label: 'Litiges', push: true },
]

export default function ChefSettingsPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [changingPassword, setChangingPassword] = useState(false)

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
            {NOTIFICATIONS.map((n) => (
              <li
                key={n.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-[rgba(31,42,55,0.08)] px-4 py-3"
              >
                <div className="min-w-0 flex items-start gap-3">
                  <Bell className="w-4 h-4 text-amber-ink mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-navy">{n.label}</p>
                    <p className="text-xs text-ink-soft">{n.push ? 'E-mail, puis push' : 'E-mail'}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  <span className="rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-mint-ink">
                    E-mail activé
                  </span>
                  {n.push && (
                    <span className="rounded-full bg-cream-deep px-2.5 py-1 text-xs font-semibold text-ink-mid">
                      Push bientôt
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Langue">
          <div className="flex items-center gap-3">
            <Globe2 className="w-4 h-4 text-amber-ink" />
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
