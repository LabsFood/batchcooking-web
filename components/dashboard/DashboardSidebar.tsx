'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarRange,
  UtensilsCrossed,
  Sparkles,
  MessageCircle,
  UserCircle2,
  BarChart3,
  Settings,
  LogOut,
  ChefHat,
  ArrowRight,
} from 'lucide-react'
import { motion } from 'framer-motion'
import Logo from '@/components/shared/Logo'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { DASHBOARD_STATS } from '@/lib/dashboard-mock'
import ReserveButton from '@/components/shared/ReserveButton'

const NAV = [
  { href: '/espace-client',                  label: 'Aperçu',          Icon: LayoutDashboard, badge: null },
  { href: '/espace-client/commandes',        label: 'Mes commandes',    Icon: CalendarRange,   badge: '2' },
  { href: '/espace-client/menus',            label: 'Menus',            Icon: UtensilsCrossed, badge: null },
  { href: '/espace-client/personnalisation', label: 'Personnalisation', Icon: Sparkles,        badge: null },
  { href: '/espace-client/messages',         label: 'Messages',         Icon: MessageCircle,   badge: '1' },
  { href: '/espace-client/profil',           label: 'Profil',           Icon: UserCircle2,     badge: null },
  { href: '/espace-client/statistiques',     label: 'Statistiques',     Icon: BarChart3,       badge: null },
  { href: '/espace-client/parametres',       label: 'Paramètres',       Icon: Settings,        badge: null },
]

export default function DashboardSidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    signOut()
    router.push('/')
  }

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'GO'

  const loyaltyPct = Math.min(
    100,
    Math.round((DASHBOARD_STATS.loyaltyPoints / DASHBOARD_STATS.loyaltyTarget) * 100),
  )

  return (
    <aside className="hidden lg:flex flex-col w-72 shrink-0 sticky top-6 self-start h-[calc(100vh-3rem)] ml-6 my-6">
      <div className="flex flex-col h-full bg-navy text-white rounded-3xl overflow-hidden shadow-[0_30px_70px_-30px_rgba(31,42,55,0.55)] relative">
        {/* glow */}
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-amber/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-mint/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 pt-6 pb-4">
            <Logo variant="white" size="sm" />
          </div>

          {/* Profile card */}
          <div className="mx-4 mb-4 rounded-2xl bg-white/[0.06] border border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-amber text-navy font-bold text-sm flex items-center justify-center">
                  {initials}
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-mint-deep border-2 border-navy" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{user?.name || 'Invité'}</p>
                <p className="text-[11px] text-white/55 truncate">Formule Confort</p>
              </div>
            </div>

            {/* Loyalty progress */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-white/55">
                <span>Club Marmitons</span>
                <span className="text-amber font-semibold">
                  {DASHBOARD_STATS.loyaltyPoints}/{DASHBOARD_STATS.loyaltyTarget}
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${loyaltyPct}%` }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full bg-gradient-to-r from-amber to-amber-deep"
                />
              </div>
              <p className="mt-2 text-[11px] text-white/55 leading-tight">
                Plus qu&apos;une session avant le brunch offert avec Ivy 🥐
              </p>
            </div>
          </div>

          {/* Nav */}
          <nav className="px-3 flex-1 overflow-y-auto custom-scroll">
            <ul className="space-y-1">
              {NAV.map(({ href, label, Icon, badge }) => {
                const active =
                  href === '/espace-client'
                    ? pathname === href
                    : pathname.startsWith(href)
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
                        active
                          ? 'bg-amber text-navy font-semibold shadow-[0_10px_24px_-12px_rgba(243,156,18,0.6)]'
                          : 'text-white/75 hover:text-white hover:bg-white/5',
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={active ? 2.4 : 2} />
                      <span className="flex-1">{label}</span>
                      {badge && (
                        <span
                          className={cn(
                            'min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-mono font-semibold',
                            active ? 'bg-navy text-amber' : 'bg-amber text-navy',
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* CTA + logout */}
          <div className="p-4 space-y-2">
            <ReserveButton
              asChild
              className="group flex items-center justify-between w-full bg-gradient-to-br from-amber to-amber-deep text-navy rounded-2xl px-4 py-3 font-semibold text-sm hover:shadow-[0_18px_36px_-12px_rgba(243,156,18,0.6)] transition-shadow"
            >
              <span className="flex items-center gap-2">
                <ChefHat className="w-4 h-4" />
                Nouvelle session
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </ReserveButton>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/55 hover:text-white hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
      `}</style>
    </aside>
  )
}
