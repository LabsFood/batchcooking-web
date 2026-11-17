'use client'

import {
  LayoutDashboard,
  CalendarRange,
  MessageCircle,
  UserCircle2,
  ChefHat,
  ShoppingBasket,
  Plus,
  Settings,
} from 'lucide-react'
import { EspaceSidebar, type AccountLink, type NavGroup } from '@/components/espace/EspaceShell'
import { useUnreadCount } from '@/lib/api/messaging'
import { useMyBookings } from '@/lib/api/bookings'
import ReserveButton from '@/components/shared/ReserveButton'

/* ─────────────────────────────────────────────────────────────────────────────
   Navigation client : six entrées, conformément à l'architecture cible
   (§ 4.2 du brief).

   Les pastilles viennent de l'API. « Mes sessions » affichait un « 2 » écrit en
   dur, vrai ou non : elle compte maintenant les réservations qui attendent leur
   règlement, c'est-à-dire ce qui demande réellement un geste.
   ───────────────────────────────────────────────────────────────────────────── */

export const CLIENT_HOME = '/espace-client'

export const CLIENT_ACCOUNT_LINKS: AccountLink[] = [
  { href: '/espace-client/profil', label: 'Profil et goûts', Icon: UserCircle2 },
  { href: '/espace-client/parametres', label: 'Paramètres', Icon: Settings },
]

/** La navigation de l'espace client, avec ce qui attend sur chaque entrée. */
export function useClientNav(): NavGroup[] {
  const unread = useUnreadCount().data ?? 0
  const bookings = useMyBookings({ limit: 50 })
  const aRegler = (bookings.data?.data ?? []).filter(
    (b) => b.status === 'pending' && !b.paidCents,
  ).length

  return [
    {
      items: [
        { href: CLIENT_HOME, label: 'Accueil', Icon: LayoutDashboard },
        {
          href: '/espace-client/menus',
          label: 'Réserver',
          Icon: ChefHat,
          // La réservation n'a pas d'entrée propre : on y entre depuis une carte.
          // Elle reste rattachée à cette section pour que la navigation suive.
          aussi: ['/espace-client/reservation'],
          children: [
            { href: '/espace-client/menus', label: 'Menus et plats' },
            { href: '/espace-client/personnalisation', label: 'Demande sur-mesure' },
          ],
        },
        {
          href: '/espace-client/commandes',
          label: 'Mes sessions',
          Icon: CalendarRange,
          count: aRegler,
          children: [
            { href: '/espace-client/commandes', label: 'À venir et réalisées' },
            { href: '/espace-client/conservation', label: 'Réchauffage et conservation' },
          ],
        },
        { href: '/espace-client/courses', label: 'Ma liste de courses', Icon: ShoppingBasket },
        { href: '/espace-client/messages', label: 'Messagerie', Icon: MessageCircle, count: unread },
        {
          href: '/espace-client/compte',
          label: 'Mon compte',
          Icon: UserCircle2,
          children: [
            { href: '/espace-client/compte', label: 'Adresses et paiement' },
            { href: '/espace-client/compte/avance-immediate', label: 'Avance immédiate' },
            { href: '/espace-client/profil', label: 'Profil et goûts' },
            { href: '/espace-client/statistiques', label: 'Mes statistiques' },
            { href: '/espace-client/parametres', label: 'Paramètres' },
          ],
        },
      ],
    },
  ]
}

export default function DashboardSidebar() {
  const groups = useClientNav()

  return (
    <EspaceSidebar
      home={CLIENT_HOME}
      groups={groups}
      footer={(repliee) => (
        <ReserveButton
          asChild
          href="/espace-client/menus?reserve=1"
          className={
            repliee
              ? 'flex h-10 w-10 items-center justify-center rounded-[0.625rem] bg-amber text-navy transition-colors hover:bg-[#F7AC2B] active:scale-[0.97]'
              : 'flex h-10 w-full items-center justify-center gap-2 rounded-[0.625rem] bg-amber px-3 text-sm font-semibold text-navy transition-colors hover:bg-[#F7AC2B] active:scale-[0.97]'
          }
        >
          <Plus className="h-4 w-4" aria-hidden />
          <span className={repliee ? 'sr-only' : undefined}>Nouvelle session</span>
        </ReserveButton>
      )}
    />
  )
}
