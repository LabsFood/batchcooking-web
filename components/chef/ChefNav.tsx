'use client'

import {
  LayoutDashboard,
  FileText,
  CalendarRange,
  CalendarDays,
  UtensilsCrossed,
  Carrot,
  Tag,
  Store,
  Wallet,
  Repeat,
  ShieldCheck,
  Settings,
  UserCircle2,
  MessageCircle,
  Star,
  LifeBuoy,
  Lock,
} from 'lucide-react'
import {
  EspaceMobileNav,
  EspaceSidebar,
  EspaceTopbar,
  type AccountLink,
  type NavGroup,
  type NavItem,
} from '@/components/espace/EspaceShell'
import { AlertBell } from '@/components/shared/AlertDrawer'
import { useChefAlerts } from './ChefSignals'
import { useChefDocuments } from '@/lib/api/chef-documents'
import { useChefQuotes } from '@/lib/api/quotes'
import { useUnreadCount } from '@/lib/api/messaging'
import { openToCandidate, useChefApproved } from '@/lib/chef/approval'

/**
 * Navigation en 5 groupes (cf. architecture cible § 4.1 du brief).
 *
 * Aucune pastille n'est écrite ici : un compteur en dur dit « 2 » quand il n'y
 * a rien, et le chef apprend à ne plus le croire. Celles qui s'affichent sont
 * comptées à partir de l'API, dans `useNavCounts()`.
 */
export const CHEF_NAV = [
  {
    group: 'Pilotage',
    items: [
      { href: '/espace-chef', label: 'Accueil', Icon: LayoutDashboard },
      { href: '/espace-chef/offres', label: 'Offres sur-mesure', Icon: FileText },
      { href: '/espace-chef/prestations', label: 'Prestations', Icon: CalendarRange },
      { href: '/espace-chef/agenda', label: 'Agenda', Icon: CalendarDays },
    ],
  },
  {
    group: 'Mon offre',
    items: [
      { href: '/espace-chef/recettes', label: 'Menus et recettes', Icon: UtensilsCrossed },
      { href: '/espace-chef/ingredients', label: 'Mes ingrédients', Icon: Carrot },
      { href: '/espace-chef/tarifs', label: 'Mes tarifs', Icon: Tag },
      { href: '/espace-chef/vitrine', label: 'Ma vitrine', Icon: Store },
    ],
  },
  {
    group: 'Mon argent',
    items: [
      { href: '/espace-chef/revenus', label: 'Revenus et paiements', Icon: Wallet },
      { href: '/espace-chef/remuneration', label: 'Mode de rémunération', Icon: Repeat },
    ],
  },
  {
    group: 'Mon dossier',
    items: [
      { href: '/espace-chef/dossier', label: 'Mon dossier', Icon: ShieldCheck },
      { href: '/espace-chef/parametres', label: 'Paramètres', Icon: Settings },
    ],
  },
  {
    group: 'Relation',
    items: [
      { href: '/espace-chef/messagerie', label: 'Messagerie', Icon: MessageCircle },
      { href: '/espace-chef/avis', label: 'Avis', Icon: Star },
      { href: '/espace-chef/litiges', label: 'Litiges et support', Icon: LifeBuoy },
    ],
  },
] as const

const CHEF_HOME = '/espace-chef'
const MESSAGING_HREF = '/espace-chef/messagerie'

const CHEF_ACCOUNT_LINKS: AccountLink[] = [
  { href: '/espace-chef/profil', label: 'Mon profil', Icon: UserCircle2 },
  { href: '/espace-chef/dossier', label: 'Mon dossier', Icon: ShieldCheck },
  { href: '/espace-chef/parametres', label: 'Paramètres', Icon: Settings },
]

/**
 * Ce qui attend vraiment, par entrée de menu. Seules deux entrées ont de quoi
 * compter aujourd'hui : les propositions de Lab's Food, et les pièces du
 * dossier qui demandent une action. Les autres n'auront leur pastille que le
 * jour où elles auront leur endpoint.
 */
function useNavCounts(): Record<string, number> {
  const quotes = useChefQuotes()
  const docs = useChefDocuments()
  const unread = useUnreadCount().data ?? 0

  // Les demandes sur-mesure qui attendent une réponse du batch cooker.
  const nOffres = (quotes.data ?? []).filter((q) =>
    ['submitted', 'in_review', 'declined'].includes(q.status),
  ).length

  const nPieces = (docs.data?.documents ?? []).filter(
    (d) =>
      d.status === 'rejected' ||
      d.status === 'expired' ||
      d.status === 'expiring' ||
      (d.status === 'missing' && d.required),
  ).length

  return {
    '/espace-chef/offres': nOffres,
    '/espace-chef/dossier': nPieces,
    [MESSAGING_HREF]: unread,
  }
}

/** La navigation du batch cooker : ses pastilles, et ce qui reste fermé avant validation. */
function useChefNav(): { groups: NavGroup[]; candidate: boolean } {
  const counts = useNavCounts()
  const { candidate } = useChefApproved()

  const groups: NavGroup[] = CHEF_NAV.map(({ group, items }) => ({
    label: group,
    items: items.map((i) => ({
      ...i,
      count: counts[i.href] ?? 0,
      // Fermée tant que le dossier n'est pas validé.
      locked: candidate && !openToCandidate(i.href),
    })),
  }))

  return { groups, candidate }
}

/** Ce que le menu grisé veut dire, au-dessus des entrées. */
function LockedNote() {
  return (
    <p className="mb-4 flex items-start gap-2 rounded-xl bg-white/[0.06] px-3 py-2.5 text-xs leading-relaxed text-white/75">
      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" aria-hidden />
      Le reste de votre espace s’ouvre dès que l’équipe a validé votre dossier.
    </p>
  )
}

/* ── Barre latérale ───────────────────────────────────────────────────────── */

export function ChefSidebar() {
  const { groups, candidate } = useChefNav()

  return (
    <EspaceSidebar
      home={CHEF_HOME}
      groups={groups}
      note={candidate ? <LockedNote /> : undefined}
      accountLinks={CHEF_ACCOUNT_LINKS}
      accountHint
    />
  )
}

/* ── Barre basse mobile (mobile-first § 8) ────────────────────────────────── */

export function ChefMobileNav() {
  const { groups, candidate } = useChefNav()
  const toutes = groups.flatMap((g) => g.items)
  const entree = (href: string, label: string): NavItem => {
    const source = toutes.find((i) => i.href === href)!
    return { ...source, label }
  }

  /*
   * Un batch cooker validé ouvre son espace pour ses demandes et ses
   * prestations. Avant validation, ces pages sont fermées : la barre montre
   * alors ce qu'il peut réellement faire, au lieu de quatre cases grisées.
   */
  const items = candidate
    ? [
        entree('/espace-chef/dossier', 'Dossier'),
        entree(MESSAGING_HREF, 'Messages'),
        entree('/espace-chef/litiges', 'Support'),
        entree('/espace-chef/parametres', 'Réglages'),
      ]
    : [
        entree(CHEF_HOME, 'Accueil'),
        entree('/espace-chef/offres', 'Offres'),
        entree('/espace-chef/prestations', 'Prestations'),
        entree(MESSAGING_HREF, 'Messages'),
      ]

  return (
    <EspaceMobileNav
      home={CHEF_HOME}
      items={items}
      groups={groups}
      note={candidate ? <LockedNote /> : undefined}
      accountLinks={CHEF_ACCOUNT_LINKS}
      accountHint
    />
  )
}

/* ── Barre haute ──────────────────────────────────────────────────────────── */

export function ChefTopbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { alerts, loading } = useChefAlerts()

  return (
    <EspaceTopbar
      title={title}
      subtitle={subtitle}
      paletteLabel="Un plat, un menu, une pièce…"
      bell={
        // Ce qui demande une action, recalculé à chaque ouverture.
        <AlertBell alerts={alerts} loading={loading}>
          Ces points sont déduits de votre dossier, de vos plats et de vos
          propositions. Le journal des notifications — qui a fait quoi, et
          quand — attend son endpoint côté API.
        </AlertBell>
      }
    />
  )
}
