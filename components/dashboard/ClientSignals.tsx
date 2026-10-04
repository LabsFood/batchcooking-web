'use client'

import { useMemo, type ReactNode } from 'react'
import {
  CalendarRange,
  ChefHat,
  CreditCard,
  Globe2,
  LayoutDashboard,
  MessageCircle,
  Settings,
  ShoppingBasket,
  Snowflake,
  Sparkles,
  UserCircle2,
  UtensilsCrossed,
} from 'lucide-react'
import {
  CommandPaletteProvider,
  type PaletteItem,
} from '@/components/shared/CommandPalette'
import type { Alert } from '@/components/shared/AlertDrawer'
import { useMyDashboard, useMyStats } from '@/lib/api/me-dashboard'
import { useMeProfile } from '@/lib/api/me-profile'
import type { ClientProfile } from '@/lib/api/types'

/* ─────────────────────────────────────────────────────────────────────────────
   Ce que la barre du haut de l'espace client sait dire.

   Les chiffres viennent de `/me/dashboard` et `/me/stats`, le profil de
   `/me/profile`. Les écrans de cet espace lisent encore des maquettes pour le
   reste : les alertes ne portent donc que sur ce qui est vrai.
   ───────────────────────────────────────────────────────────────────────────── */

const PAGES: { href: string; label: string; Icon: PaletteItem['Icon']; keywords: string }[] = [
  { href: '/espace-client', label: 'Accueil', Icon: LayoutDashboard, keywords: 'tableau de bord' },
  { href: '/espace-client/reservation', label: 'Composer ma session', Icon: CalendarRange, keywords: 'reserver nouvelle prestation batch cooking' },
  { href: '/espace-client/commandes', label: 'Mes sessions', Icon: CalendarRange, keywords: 'commandes historique prestations' },
  { href: '/espace-client/menus', label: 'Menus et plats', Icon: UtensilsCrossed, keywords: 'carte semaine recettes' },
  { href: '/espace-client/chefs', label: 'Trouver un batch cooker', Icon: ChefHat, keywords: 'chefs cuisinier pres de chez moi' },
  { href: '/espace-client/courses', label: 'Ma liste de courses', Icon: ShoppingBasket, keywords: 'ingredients rayon' },
  { href: '/espace-client/conservation', label: 'Réchauffage et conservation', Icon: Snowflake, keywords: 'congelation duree temperature' },
  { href: '/espace-client/personnalisation', label: 'Demande sur-mesure', Icon: Sparkles, keywords: 'devis brief special' },
  { href: '/espace-client/statistiques', label: 'Mes statistiques', Icon: Globe2, keywords: 'economies pays carte culinaire' },
  { href: '/espace-client/messages', label: 'Messagerie', Icon: MessageCircle, keywords: 'messages chef discussion' },
  { href: '/espace-client/profil', label: 'Profil et goûts', Icon: UserCircle2, keywords: 'allergies preferences piment foyer regime' },
  { href: '/espace-client/compte', label: 'Mon compte', Icon: CreditCard, keywords: 'adresse moyens de paiement' },
  { href: '/espace-client/parametres', label: 'Paramètres', Icon: Settings, keywords: 'notifications securite donnees' },
]

export function useClientPaletteItems(): PaletteItem[] {
  return useMemo(
    () =>
      PAGES.map((p) => ({
        id: `page:${p.href}`,
        label: p.label,
        group: 'Aller à',
        href: p.href,
        Icon: p.Icon,
        keywords: p.keywords,
      })),
    [],
  )
}

function joursAvant(iso?: string | null): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return Math.ceil((t - Date.now()) / 86_400_000)
}

export function useClientAlerts(): { alerts: Alert[]; loading: boolean } {
  const board = useMyDashboard()
  const stats = useMyStats()
  const profil = useMeProfile()

  const alerts = useMemo(() => {
    const out: Alert[] = []
    const d = board.data

    // ── La prochaine session ───────────────────────────────────────────────
    const prochaine = d?.latestBooking
    const quand = prochaine?.scheduledAt ?? prochaine?.date
    const j = joursAvant(quand)
    if (prochaine && j !== null && j >= 0 && j <= 7) {
      out.push({
        id: 'booking:soon',
        tone: j <= 2 ? 'todo' : 'info',
        title:
          j === 0
            ? 'Votre session a lieu aujourd’hui'
            : `Votre session est dans ${j} jour${j > 1 ? 's' : ''}`,
        detail: prochaine.chefName
          ? `Avec ${prochaine.chefName}.`
          : 'Pensez à libérer le plan de travail.',
        href: '/espace-client/commandes',
        cta: 'Voir la session',
      })
    }

    // ── Les devis qui attendent ────────────────────────────────────────────
    const parStatut = stats.data?.quotesByStatus ?? {}
    const chiffres = Number(parStatut.quoted ?? parStatut.priced ?? 0)
    if (chiffres > 0) {
      out.push({
        id: 'quotes:priced',
        tone: 'todo',
        title: `${chiffres} devis chiffré${chiffres > 1 ? 's' : ''} vous attend${chiffres > 1 ? 'ent' : ''}`,
        detail: 'Un chef a répondu à votre demande sur-mesure.',
        href: '/espace-client/personnalisation',
        cta: 'Lire la proposition',
      })
    }
    const envoyes = Number(parStatut.submitted ?? 0)
    if (envoyes > 0) {
      out.push({
        id: 'quotes:submitted',
        tone: 'info',
        title: `${envoyes} demande${envoyes > 1 ? 's' : ''} sur-mesure en cours`,
        detail: 'Lab’s Food la chiffre et vous revient.',
        href: '/espace-client/personnalisation',
      })
    }

    // ── Le profil de goûts : c'est lui qui rend les menus pertinents ───────
    const p =
      profil.data?.profileType === 'client'
        ? (profil.data.profile as ClientProfile | null)
        : null
    if (p && p.allergies.length === 0 && p.dietaryPreferences.length === 0) {
      out.push({
        id: 'profile:empty',
        tone: 'todo',
        title: 'Vos goûts ne sont pas renseignés',
        detail:
          'Allergies, régimes, ce que vous n’aimez pas : c’est ce qui permet au chef d’adapter ses plats.',
        href: '/espace-client/profil',
        cta: 'Renseigner mes goûts',
      })
    }

    // ── Jamais réservé ─────────────────────────────────────────────────────
    if (d && (d.bookingsCount ?? 0) === 0) {
      out.push({
        id: 'booking:none',
        tone: 'info',
        title: 'Aucune session pour l’instant',
        detail: 'Choisissez un batch cooker près de chez vous, puis ses plats.',
        href: '/espace-client/reservation',
        cta: 'Composer ma première session',
      })
    }

    return out
  }, [board.data, stats.data, profil.data])

  return { alerts, loading: board.isPending || profil.isPending }
}

/** Monte la palette avec les sources de l'espace client. */
export default function ClientSignals({ children }: { children: ReactNode }) {
  const items = useClientPaletteItems()
  return (
    <CommandPaletteProvider items={items} placeholder="Une page de votre espace…">
      {children}
    </CommandPaletteProvider>
  )
}
