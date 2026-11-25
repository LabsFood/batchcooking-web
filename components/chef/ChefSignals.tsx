'use client'

import { useMemo, type ReactNode } from 'react'
import {
  BookOpen,
  Carrot,
  CalendarDays,
  CalendarRange,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  MessageCircle,
  Repeat,
  Settings,
  ShieldCheck,
  Star,
  Store,
  Tag,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react'
import {
  CommandPaletteProvider,
  type PaletteItem,
} from '@/components/shared/CommandPalette'
import type { Alert } from '@/components/shared/AlertDrawer'
import {
  DOC_STATUS_LABEL,
  useChefApplication,
  useChefDocuments,
  type ChefDocument,
} from '@/lib/api/chef-documents'
import {
  publishBlockers,
  useDishes,
  useMenus,
  useOffers,
} from '@/lib/api/chef-catalog'
import { countryLabel } from '@/lib/chef/countries'
import { openToCandidate, useChefApproved } from '@/lib/chef/approval'

/* ─────────────────────────────────────────────────────────────────────────────
   Ce que la barre du haut de l'espace batch cooker sait dire.

   Deux choses, toutes deux tirées de ce qui est déjà chargé : ce qu'on peut
   chercher, et ce qui demande une action. Aucun appel en plus — les écrans ont
   déjà ces données en cache, la barre les relit.
   ───────────────────────────────────────────────────────────────────────────── */

const PAGES: { href: string; label: string; Icon: PaletteItem['Icon']; keywords: string }[] = [
  { href: '/espace-chef', label: 'Accueil', Icon: LayoutDashboard, keywords: 'tableau de bord pilotage' },
  { href: '/espace-chef/offres', label: 'Offres sur-mesure', Icon: FileText, keywords: 'devis propositions' },
  { href: '/espace-chef/prestations', label: 'Prestations', Icon: CalendarRange, keywords: 'sessions missions' },
  { href: '/espace-chef/agenda', label: 'Agenda', Icon: CalendarDays, keywords: 'disponibilites planning calendrier' },
  { href: '/espace-chef/recettes', label: 'Menus & recettes', Icon: UtensilsCrossed, keywords: 'plats catalogue' },
  { href: '/espace-chef/ingredients', label: 'Mes ingrédients', Icon: Carrot, keywords: 'liste commune en attente crees' },
  { href: '/espace-chef/recettes/nouveau', label: 'Écrire un plat', Icon: BookOpen, keywords: 'nouveau creer recette' },
  { href: '/espace-chef/tarifs', label: 'Mes tarifs', Icon: Tag, keywords: 'prix grille' },
  { href: '/espace-chef/vitrine', label: 'Ma vitrine', Icon: Store, keywords: 'page publique semaines' },
  { href: '/espace-chef/revenus', label: 'Revenus & paiements', Icon: Wallet, keywords: 'argent versements' },
  { href: '/espace-chef/remuneration', label: 'Mode de rémunération', Icon: Repeat, keywords: 'urssaf cesu' },
  { href: '/espace-chef/dossier', label: 'Mon dossier', Icon: ShieldCheck, keywords: 'pieces documents profil candidature immatriculation siret' },
  { href: '/espace-chef/parametres', label: 'Paramètres', Icon: Settings, keywords: 'compte notifications moyens de paiement' },
  { href: '/espace-chef/messagerie', label: 'Messagerie', Icon: MessageCircle, keywords: 'messages fil client' },
  { href: '/espace-chef/avis', label: 'Avis', Icon: Star, keywords: 'notes etoiles reputation' },
  { href: '/espace-chef/litiges', label: 'Litiges & support', Icon: LifeBuoy, keywords: 'aide reclamation' },
]

/** Dans combien de jours, à partir d'une date `AAAA-MM-JJ`. */
function joursAvant(iso?: string | null): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return Math.ceil((t - Date.now()) / 86_400_000)
}

export function useChefPaletteItems(): PaletteItem[] {
  const dishes = useDishes()
  const menus = useMenus()
  const docs = useChefDocuments()
  const { candidate } = useChefApproved()

  return useMemo(() => {
    const out: PaletteItem[] = PAGES.map((p) => ({
      id: `page:${p.href}`,
      label: p.label,
      group: 'Aller à',
      href: p.href,
      Icon: p.Icon,
      keywords: p.keywords,
    }))

    for (const d of dishes.data ?? []) {
      out.push({
        id: `dish:${d.id}`,
        label: d.name,
        hint: d.status === 'published' ? 'en ligne' : 'brouillon',
        group: 'Mes plats',
        href: `/espace-chef/recettes/${d.id}`,
        Icon: UtensilsCrossed,
        keywords: [countryLabel(d.country), d.category ?? '', ...d.diets].join(' '),
      })
    }

    for (const m of menus.data ?? []) {
      out.push({
        id: `menu:${m.id}`,
        label: m.title,
        hint: `${m.dishes.length} plat${m.dishes.length > 1 ? 's' : ''}`,
        group: 'Mes menus',
        href: '/espace-chef/recettes',
        Icon: BookOpen,
        keywords: m.pitch ?? '',
      })
    }

    for (const d of docs.data?.documents ?? []) {
      out.push({
        id: `doc:${d.type}`,
        label: d.label,
        hint: DOC_STATUS_LABEL[d.status],
        group: 'Mes pièces',
        href: '/espace-chef/dossier',
        Icon: ShieldCheck,
        keywords: `${d.type} piece justificatif dossier`,
      })
    }

    // Avant validation, la recherche ne propose que ce qui s'ouvre.
    return candidate ? out.filter((i) => openToCandidate(i.href ?? '')) : out
  }, [dishes.data, menus.data, docs.data, candidate])
}

export function useChefAlerts(): { alerts: Alert[]; loading: boolean } {
  const app = useChefApplication()
  const docs = useChefDocuments()
  const dishes = useDishes()
  const menus = useMenus()
  const offers = useOffers()
  const { candidate } = useChefApproved()

  const alerts = useMemo(() => {
    const out: Alert[] = []
    const a = app.data
    const dossier = docs.data

    // ── Le dossier d'abord : c'est lui qui conditionne tout le reste ────────
    if (a?.status === 'changes-requested') {
      out.push({
        id: 'app:changes',
        tone: 'urgent',
        title: 'Lab’s Food attend des compléments',
        detail: 'Une ou plusieurs pièces sont à redéposer avant la décision.',
        href: '/espace-chef/dossier',
        cta: 'Ouvrir mon dossier',
      })
    }
    if (a?.status === 'rejected') {
      out.push({
        id: 'app:rejected',
        tone: 'urgent',
        title: 'Votre candidature a été refusée',
        detail: a.refusal?.reason ?? 'Le motif est dans votre dossier.',
        href: '/espace-chef/dossier',
        cta: 'Lire le motif',
      })
    }
    if (dossier?.dossierStatus === 'suspended') {
      out.push({
        id: 'dossier:suspended',
        tone: 'urgent',
        title: 'Votre vitrine est hors ligne',
        detail: 'Une pièce obligatoire a expiré. La remplacer la remet en ligne tout de suite.',
        href: '/espace-chef/dossier',
        cta: 'Remplacer la pièce',
      })
    }
    if (dossier?.dossierStatus === 'awaiting-registration') {
      out.push({
        id: 'dossier:registration',
        tone: 'todo',
        title: 'Il manque votre immatriculation',
        detail: 'Tout le reste est validé : votre numéro suffit à débloquer le dossier.',
        href: '/espace-chef/dossier',
        cta: 'Renseigner mon entreprise',
      })
    }

    const pieces: ChefDocument[] = dossier?.documents ?? []

    for (const d of pieces.filter((x) => x.status === 'rejected').slice(0, 4)) {
      out.push({
        id: `doc:rejected:${d.type}`,
        tone: 'urgent',
        title: `« ${d.label} » a été refusée`,
        detail: d.reason ?? 'Le motif est dans votre dossier.',
        href: '/espace-chef/dossier',
        cta: 'Déposer une nouvelle version',
      })
    }

    const manquantes = pieces.filter(
      (x) => x.status === 'missing' && x.family === 'blocking',
    )
    if (manquantes.length > 0) {
      out.push({
        id: 'doc:missing',
        tone: 'todo',
        title: `${manquantes.length} pièce${manquantes.length > 1 ? 's' : ''} obligatoire${manquantes.length > 1 ? 's' : ''} manque${manquantes.length > 1 ? 'nt' : ''}`,
        detail: manquantes.map((d) => d.label).join(', '),
        href: '/espace-chef/dossier',
        cta: 'Les déposer',
      })
    }

    for (const d of pieces) {
      const j = joursAvant(d.expiresOn)
      if (j === null) continue
      if (j < 0) {
        out.push({
          id: `doc:expired:${d.type}`,
          tone: 'urgent',
          title: `« ${d.label} » a expiré`,
          detail: `Depuis ${Math.abs(j)} jour${Math.abs(j) > 1 ? 's' : ''}.`,
          href: '/espace-chef/dossier',
          cta: 'Déposer la nouvelle',
        })
      } else if (j <= 30) {
        out.push({
          id: `doc:expiring:${d.type}`,
          tone: 'todo',
          title: `« ${d.label} » expire dans ${j} jour${j > 1 ? 's' : ''}`,
          detail: 'La remplacer avant l’échéance évite la mise hors ligne.',
          href: '/espace-chef/dossier',
          cta: 'Anticiper',
        })
      }
    }

    // ── Les offres : quelqu'un attend une réponse ──────────────────────────
    const nOffres = (offers.data?.dishes?.length ?? 0) + (offers.data?.menus?.length ?? 0)
    if (nOffres > 0) {
      out.push({
        id: 'offers',
        tone: 'todo',
        title: `${nOffres} proposition${nOffres > 1 ? 's' : ''} vous attend${nOffres > 1 ? 'ent' : ''}`,
        detail: 'Lab’s Food a préparé cela pour vous seul. À accepter ou à refuser.',
        href: '/espace-chef/recettes?onglet=propositions',
        cta: 'Les voir',
      })
    }

    // ── La vitrine : ce qui est prêt et qui dort ────────────────────────────
    const plats = dishes.data ?? []
    const prets = plats.filter(
      (d) => d.status === 'draft' && publishBlockers(d).length === 0,
    )
    if (prets.length > 0) {
      out.push({
        id: 'dishes:ready',
        tone: 'todo',
        title: `${prets.length} plat${prets.length > 1 ? 's' : ''} prêt${prets.length > 1 ? 's' : ''} à publier`,
        detail: prets
          .slice(0, 3)
          .map((d) => d.name)
          .join(', '),
        href: '/espace-chef/recettes',
        cta: 'Publier',
      })
    }

    const incomplets = plats.filter(
      (d) => d.status === 'draft' && publishBlockers(d).length > 0,
    )
    if (incomplets.length > 0) {
      out.push({
        id: 'dishes:incomplete',
        tone: 'info',
        title: `${incomplets.length} brouillon${incomplets.length > 1 ? 's' : ''} à compléter`,
        detail: `Il manque par exemple ${publishBlockers(incomplets[0]).join(', ')} sur « ${incomplets[0].name} ».`,
        href: '/espace-chef/recettes',
        cta: 'Reprendre',
      })
    }

    if (
      plats.length > 0 &&
      plats.every((d) => d.status !== 'published') &&
      dossier?.dossierStatus !== 'suspended'
    ) {
      out.push({
        id: 'dishes:none-published',
        tone: 'info',
        title: 'Aucun plat en ligne',
        detail: 'Votre vitrine ne montre rien aux clients pour l’instant.',
        href: '/espace-chef/recettes',
        cta: 'Choisir quoi publier',
      })
    }

    const mesMenus = menus.data ?? []
    const vides = mesMenus.filter((m) => m.dishes.length === 0)
    if (vides.length > 0) {
      out.push({
        id: 'menus:empty',
        tone: 'info',
        title: `${vides.length} menu${vides.length > 1 ? 's' : ''} sans plat`,
        detail: 'Un menu vide ne peut pas être proposé.',
        href: '/espace-chef/recettes',
        cta: 'Le composer',
      })
    }

    // Une alerte qui mène à une page fermée ne ferait que renvoyer au dossier.
    return candidate ? out.filter((a) => !a.href || openToCandidate(a.href)) : out
  }, [app.data, docs.data, dishes.data, menus.data, offers.data, candidate])

  return {
    alerts,
    loading: app.isPending || docs.isPending,
  }
}

/** Monte la palette avec les sources de l'espace batch cooker. */
export default function ChefSignals({ children }: { children: ReactNode }) {
  const items = useChefPaletteItems()
  return (
    <CommandPaletteProvider
      items={items}
      placeholder="Une page, un plat, un menu, une pièce…"
    >
      {children}
    </CommandPaletteProvider>
  )
}
