'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { AlertBell } from '@/components/shared/AlertDrawer'
import { EspaceTopbar } from '@/components/espace/EspaceShell'
import { useClientAlerts } from './ClientSignals'

const TITLES: Record<string, { title: string; sub?: string }> = {
  '/espace-client': { title: 'Accueil' },
  '/espace-client/commandes': {
    title: 'Mes sessions',
    sub: 'Vos prestations, à venir et passées.',
  },
  '/espace-client/menus': {
    title: 'Menus et plats',
    sub: 'Les cartes de la semaine, chef par chef.',
  },
  '/espace-client/reservation': {
    title: 'Réserver une session',
    sub: 'Le batch cooker, ses plats, la date.',
  },
  '/espace-client/courses': {
    title: 'Ma liste de courses',
    sub: 'Rangée par rayon.',
  },
  '/espace-client/personnalisation': {
    title: 'Demande sur-mesure',
    sub: 'Décrivez ce que vous voulez, un chef vous chiffre.',
  },
  '/espace-client/messages': {
    title: 'Messagerie',
    sub: 'Vos échanges avec vos chefs et avec le support.',
  },
  '/espace-client/profil': {
    title: 'Profil et goûts',
    sub: 'Préférences, allergies, foyer.',
  },
  '/espace-client/compte': {
    title: 'Mon compte',
    sub: 'Adresses, moyens de paiement, rattachements.',
  },
  '/espace-client/compte/avance-immediate': {
    title: 'Avance immédiate',
    sub: 'Votre dossier URSSAF, à remplir une fois.',
  },
  '/espace-client/conservation': {
    title: 'Réchauffage et conservation',
    sub: 'Combien de temps, à quelle température.',
  },
  '/espace-client/parametres': {
    title: 'Paramètres',
    sub: 'Notifications, sécurité, données personnelles.',
  },
  '/espace-client/statistiques': {
    title: 'Mes statistiques',
    sub: 'Vos plats, votre temps gagné.',
  },
}

/** « mardi 17 novembre » : le jour, dit comme sur un agenda. */
function aujourdhui() {
  const d = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return d.charAt(0).toUpperCase() + d.slice(1)
}

export default function DashboardTopbar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { alerts, loading } = useClientAlerts()

  const isDetail = /^\/espace-client\/[^/]+\/[^/]+/.test(pathname)
  const baseSegment = '/' + pathname.split('/').slice(1, 3).join('/')
  const meta = TITLES[pathname] ?? TITLES[isDetail ? baseSegment : pathname] ?? TITLES['/espace-client']

  const accueil = pathname === '/espace-client'
  const firstName = user?.name?.split(' ')[0] || ''

  return (
    <EspaceTopbar
      title={accueil && firstName ? `Bonjour ${firstName}` : meta.title}
      subtitle={accueil ? aujourdhui() : meta.sub}
      paletteLabel="Aller à une page…"
      bell={
        // Ce qui demande une action, recalculé à chaque ouverture.
        <AlertBell alerts={alerts} loading={loading}>
          Ces points sont déduits de vos sessions, de vos devis et de votre
          profil de goûts. Le journal des notifications attend son endpoint
          côté API.
        </AlertBell>
      }
    />
  )
}
