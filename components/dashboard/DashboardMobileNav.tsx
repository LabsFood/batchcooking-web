'use client'

import { LayoutDashboard, CalendarRange, ChefHat, MessageCircle } from 'lucide-react'
import { EspaceMobileNav, type NavItem } from '@/components/espace/EspaceShell'
import { CLIENT_ACCOUNT_LINKS, CLIENT_HOME, useClientNav } from './DashboardSidebar'

/* Quatre destinations, puis « Plus » : la liste de courses, le compte et le
   reste y sont rangés. La messagerie remonte dans la barre — c'est là qu'un
   message non lu doit se voir, pas derrière un panneau. */
export default function DashboardMobileNav() {
  const groups = useClientNav()
  const toutes = groups.flatMap((g) => g.items)
  const count = (href: string) => toutes.find((i) => i.href === href)?.count

  const items: NavItem[] = [
    { href: CLIENT_HOME, label: 'Accueil', Icon: LayoutDashboard },
    {
      href: '/espace-client/menus',
      label: 'Réserver',
      Icon: ChefHat,
      aussi: ['/espace-client/reservation', '/espace-client/personnalisation'],
    },
    {
      href: '/espace-client/commandes',
      label: 'Sessions',
      Icon: CalendarRange,
      count: count('/espace-client/commandes'),
      aussi: ['/espace-client/conservation'],
    },
    {
      href: '/espace-client/messages',
      label: 'Messages',
      Icon: MessageCircle,
      count: count('/espace-client/messages'),
    },
  ]

  return (
    <EspaceMobileNav
      home={CLIENT_HOME}
      items={items}
      groups={groups}
      accountLinks={CLIENT_ACCOUNT_LINKS}
    />
  )
}
