'use client'

import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { motion } from 'framer-motion'
import {
  ChevronDown,
  ExternalLink,
  Lock,
  LogOut,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  type LucideIcon,
} from 'lucide-react'
import Logo from '@/components/shared/Logo'
import { Avatar, AvatarEditor } from '@/components/shared/Avatar'
import { PaletteIconTrigger, PaletteTrigger } from '@/components/shared/CommandPalette'
import { useAuth } from '@/lib/auth-context'
import { useMe } from '@/lib/api/me'
import { DURATION, EASE_MOVE } from '@/lib/motion'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────────
   La coque des deux espaces.

   L'espace client et l'espace batch cooker avaient chacun leur barre latérale,
   leur barre haute et leur barre mobile, écrites deux fois et déjà divergentes :
   rayons différents, compte rangé à deux endroits, un tiroir d'un côté et pas
   de l'autre. Une seule coque, deux configurations.

   - Bureau : une colonne marine sur toute la hauteur, qui se replie en une
     rangée d'icônes (le choix est retenu d'une visite à l'autre). L'entrée
     ouverte est une pastille claire : elle se voit au premier coup d'œil,
     repliée comme dépliée. Le compte est dans la barre haute, à droite, là où
     on le cherche.
   - Mobile : quatre destinations et « Plus », qui ouvre tout le reste. Plus
     aucune page n'est hors d'atteinte du pouce.
   ───────────────────────────────────────────────────────────────────────────── */

export interface NavItem {
  href: string
  label: string
  Icon: LucideIcon
  /** Ce qui attend, compté à partir de l'API. Zéro ou absent : rien ne s'affiche. */
  count?: number
  children?: { href: string; label: string }[]
  /** Des routes qui appartiennent à l'entrée sans y avoir de lien. */
  aussi?: string[]
  /** Fermée pour l'instant : grisée, sans lien, et dite au lecteur d'écran. */
  locked?: boolean
}

export interface NavGroup {
  /** Omis : le groupe n'a pas de titre (une navigation courte n'en a pas besoin). */
  label?: string
  items: NavItem[]
}

export interface AccountLink {
  href: string
  label: string
  Icon: LucideIcon
}

/** L'entrée correspond-elle à l'adresse courante ? `home` ne vaut que pour elle-même. */
function isActive(pathname: string, item: NavItem, home: string) {
  if (item.href === home) return pathname === home
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return true
  if ((item.aussi ?? []).some((h) => pathname.startsWith(h))) return true
  return (item.children ?? []).some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`))
}

function Count({ n, onAmber }: { n?: number; onAmber?: boolean }) {
  if (!n || n <= 0) return null
  return (
    <span
      className={cn(
        'relative inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums',
        onAmber ? 'bg-navy text-amber' : 'bg-amber text-navy',
      )}
    >
      {n > 99 ? '99+' : n}
    </span>
  )
}

/* ── La colonne repliée : un choix qui se retient d'une visite à l'autre ──── */

const CLE_COLONNE = 'labsfood.espace.colonne'
const abonnes = new Set<() => void>()

function lireRepliee(): boolean {
  try {
    return window.localStorage.getItem(CLE_COLONNE) === 'repliee'
  } catch {
    // Navigation privée, stockage bloqué : la colonne reste dépliée.
    return false
  }
}

function sAbonnerColonne(prevenir: () => void) {
  abonnes.add(prevenir)
  window.addEventListener('storage', prevenir)
  return () => {
    abonnes.delete(prevenir)
    window.removeEventListener('storage', prevenir)
  }
}

function ecrireRepliee(repliee: boolean) {
  try {
    window.localStorage.setItem(CLE_COLONNE, repliee ? 'repliee' : 'depliee')
  } catch {
    // Sans stockage, le choix vaut pour cette page : c'est déjà ça.
  }
  abonnes.forEach((prevenir) => prevenir())
}

/* ── Barre latérale ───────────────────────────────────────────────────────── */

export function EspaceSidebar({
  home,
  groups,
  note,
  footer,
}: {
  /** L'accueil de l'espace : `/espace-client` ou `/espace-chef`. */
  home: string
  groups: NavGroup[]
  /** Un mot au-dessus des entrées, quand une partie du menu est fermée. */
  note?: ReactNode
  /** L'action de l'espace, en bas de la colonne. Une seule ; elle sait se réduire à une icône. */
  footer?: (repliee: boolean) => ReactNode
}) {
  const pathname = usePathname()
  const indicateur = useId()
  // Dépliage manuel : ce que l'utilisateur ouvre prime sur la section active.
  const [opened, setOpened] = useState<Record<string, boolean>>({})
  // Le serveur ne connaît pas le choix : il rend la colonne dépliée.
  const repliee = useSyncExternalStore(sAbonnerColonne, lireRepliee, () => false)

  return (
    <aside
      className={cn(
        // déplacement : la colonne change de largeur en 200 ms
        'sticky top-[var(--lf-dev-banner)] hidden h-[calc(100vh-var(--lf-dev-banner))] shrink-0 flex-col bg-navy-deep text-white transition-[width] duration-200 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none lg:flex',
        repliee ? 'w-[4.5rem]' : 'w-[17rem]',
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center pb-4 pt-5',
          repliee ? 'flex-col gap-3' : 'justify-between gap-2 pl-5 pr-3',
        )}
      >
        {repliee ? (
          <Logo
            variant="mark-only"
            size="sm"
            href={home}
            className="[&_img]:brightness-0 [&_img]:invert"
          />
        ) : (
          <Logo variant="white" size="sm" href={home} />
        )}
        <button
          type="button"
          onClick={() => ecrireRepliee(!repliee)}
          aria-label={repliee ? 'Déplier le menu' : 'Réduire le menu'}
          aria-expanded={!repliee}
          title={repliee ? 'Déplier le menu' : 'Réduire le menu'}
          className="hit flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/55 transition-colors hover:bg-white/10 hover:text-white"
        >
          {repliee ? (
            <PanelLeftOpen className="h-4 w-4" aria-hidden />
          ) : (
            <PanelLeftClose className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>

      <nav
        aria-label="Navigation de l’espace"
        className={cn('espace-scroll min-h-0 flex-1 overflow-y-auto pb-4', repliee ? 'px-0' : 'px-3')}
      >
        {!repliee && note}
        {groups.map((group, g) => (
          <div
            key={group.label ?? g}
            className={cn(
              g > 0 && (repliee ? 'mt-2 border-t border-white/10 pt-2' : 'mt-5'),
            )}
          >
            {group.label && !repliee && (
              <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-white/40">
                {group.label}
              </p>
            )}
            <ul className={cn('space-y-0.5', repliee && 'flex flex-col items-center')}>
              {group.items.map((item) => {
                const active = isActive(pathname, item, home)
                const expanded = item.children ? (opened[item.href] ?? active) : false
                const panelId = `nav-${item.href.replace(/\W+/g, '-')}`

                // L'entrée ouverte : une pastille ambre qui glisse de l'une à l'autre.
                // Texte marine sur ambre : 5:1, lisible ; le blanc n'y ferait que 2,2:1.
                const fond = active && (
                  // déplacement : le fond glisse d'une entrée à l'autre en 180 ms
                  <motion.span
                    layoutId={indicateur}
                    aria-hidden
                    className="absolute inset-0 rounded-[0.625rem] bg-amber shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
                    transition={{ duration: DURATION.fast, ease: EASE_MOVE }}
                  />
                )

                /* Repliée : l'icône seule, son nom au survol et pour les lecteurs d'écran. */
                if (repliee) {
                  const carre = cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-[0.625rem]',
                    active ? 'text-navy' : 'text-white/70',
                    !active && !item.locked && 'transition-colors hover:bg-white/[0.08] hover:text-white',
                    item.locked && 'opacity-40',
                  )
                  const icone = (
                    <>
                      {fond}
                      <item.Icon className="relative h-[1.125rem] w-[1.125rem]" strokeWidth={active ? 2.2 : 1.9} aria-hidden />
                      {(item.count ?? 0) > 0 && (
                        <span
                          aria-hidden
                          className={cn(
                            'absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber ring-2',
                            active ? 'bg-navy ring-amber' : 'ring-navy-deep',
                          )}
                        />
                      )}
                    </>
                  )
                  return (
                    <li key={item.href}>
                      {item.locked ? (
                        <span aria-disabled="true" title={item.label} className={carre}>
                          {icone}
                          <span className="sr-only">
                            {item.label}, disponible après validation de votre dossier
                          </span>
                        </span>
                      ) : (
                        <Link
                          href={item.href}
                          title={item.label}
                          aria-current={active ? 'page' : undefined}
                          className={carre}
                        >
                          {icone}
                          <span className="sr-only">
                            {item.label}
                            {(item.count ?? 0) > 0 ? `, ${item.count} en attente` : ''}
                          </span>
                        </Link>
                      )}
                    </li>
                  )
                }

                const row = cn(
                  'relative flex min-w-0 flex-1 items-center gap-3 px-3 text-sm',
                  active ? 'font-semibold text-navy' : 'text-white/70 group-hover:text-white',
                )
                const contenu = (
                  <>
                    <item.Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.2 : 1.9} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  </>
                )

                return (
                  <li key={item.href}>
                    <div
                      className={cn(
                        'group relative flex h-10 items-center rounded-[0.625rem]',
                        item.locked && 'opacity-45',
                        !active && !item.locked && 'transition-colors hover:bg-white/[0.06]',
                      )}
                    >
                      {fond}

                      {item.locked ? (
                        <span aria-disabled="true" className={cn(row, 'h-full')}>
                          {contenu}
                          <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          <span className="sr-only">, disponible après validation de votre dossier</span>
                        </span>
                      ) : (
                        <Link
                          href={item.href}
                          aria-current={active && !item.children ? 'page' : undefined}
                          className={cn(row, 'h-full rounded-[0.625rem]')}
                        >
                          {contenu}
                          <Count n={item.count} onAmber={active} />
                        </Link>
                      )}

                      {item.children && !item.locked && (
                        <button
                          type="button"
                          onClick={() => setOpened((prev) => ({ ...prev, [item.href]: !expanded }))}
                          aria-expanded={expanded}
                          aria-controls={panelId}
                          aria-label={`${expanded ? 'Masquer' : 'Afficher'} les pages de ${item.label}`}
                          className={cn(
                            'hit relative mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                            active
                              ? 'text-navy/70 hover:bg-navy/10 hover:text-navy'
                              : 'text-white/55 hover:bg-white/10 hover:text-white',
                          )}
                        >
                          <ChevronDown
                            className={cn('h-4 w-4 transition-transform duration-200', expanded && 'rotate-180')}
                            aria-hidden
                          />
                        </button>
                      )}
                    </div>

                    {expanded && item.children && (
                      <ul id={panelId} className="mb-1 ml-5 mt-1 space-y-0.5 border-l border-white/10 pl-3">
                        {item.children.map((c) => {
                          const on = pathname === c.href
                          return (
                            <li key={c.href}>
                              <Link
                                href={c.href}
                                aria-current={on ? 'page' : undefined}
                                className={cn(
                                  'flex min-h-9 items-center gap-2 rounded-lg px-3 text-[0.8125rem] transition-colors',
                                  on
                                    ? 'font-semibold text-white'
                                    : 'text-white/60 hover:bg-white/[0.06] hover:text-white',
                                )}
                              >
                                {/* La page ouverte : un point ambre, pas un changement de couleur du texte. */}
                                <span
                                  aria-hidden
                                  className={cn('h-1.5 w-1.5 shrink-0 rounded-full', on ? 'bg-amber' : 'bg-transparent')}
                                />
                                {c.label}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {footer && (
        <div className={cn('shrink-0 pb-4', repliee ? 'flex justify-center' : 'px-3')}>
          {footer(repliee)}
        </div>
      )}
    </aside>
  )
}

/* ── Le compte, dans la barre haute ───────────────────────────────────────── */

function AccountMenu({ links, publicHint }: { links: AccountLink[]; publicHint?: boolean }) {
  const [open, setOpen] = useState(false)
  const boite = useRef<HTMLDivElement>(null)
  const { user, roleLabel, signOut } = useAuth()
  const me = useMe()
  const router = useRouter()

  // Un clic ailleurs ou Échap referme. `mouseleave` refermait le menu dès que
  // le curseur glissait d'un pixel hors du panneau.
  useEffect(() => {
    if (!open) return
    const dehors = (e: PointerEvent) => {
      if (!boite.current?.contains(e.target as Node)) setOpen(false)
    }
    const echap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', dehors)
    document.addEventListener('keydown', echap)
    return () => {
      document.removeEventListener('pointerdown', dehors)
      document.removeEventListener('keydown', echap)
    }
  }, [open])

  const nom = me.data?.fullName ?? user?.name ?? 'Mon compte'

  return (
    <div ref={boite} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Mon compte : ${nom}`}
        className="flex h-10 items-center gap-2 rounded-full border border-[var(--line)] bg-paper pl-1 pr-2.5 transition-colors hover:border-[var(--line-strong)]"
      >
        <Avatar url={me.data?.avatarUrl} name={nom} className="h-8 w-8 shrink-0 text-xs" />
        <span className="hidden max-w-[9rem] truncate text-sm font-semibold text-navy xl:inline">
          {nom.split(' ')[0]}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-ink-soft transition-transform duration-200', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Mon compte"
          className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-[var(--line)] bg-paper p-2 text-ink shadow-[var(--shadow-pop)]"
        >
          {/* La photo se change là où l'on va déjà, pas dans un réglage à chercher. */}
          <AvatarEditor publicHint={publicHint} />
          {roleLabel && <p className="px-3 pb-1 text-xs text-ink-soft">{roleLabel}</p>}
          <div className="my-1 h-px bg-[var(--line)]" />
          {links.map(({ href, label, Icon }) => (
            <Link key={href} href={href} role="menuitem" onClick={() => setOpen(false)} className="account-item">
              <Icon className="h-4 w-4 text-ink-soft" aria-hidden />
              {label}
            </Link>
          ))}
          <Link href="/" role="menuitem" onClick={() => setOpen(false)} className="account-item">
            <ExternalLink className="h-4 w-4 text-ink-soft" aria-hidden />
            Retour au site
          </Link>
          <div className="my-1 h-px bg-[var(--line)]" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              signOut()
              router.push('/')
            }}
            className="account-item w-full"
          >
            <LogOut className="h-4 w-4 text-ink-soft" aria-hidden />
            Déconnexion
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Barre haute ──────────────────────────────────────────────────────────── */

export function EspaceTopbar({
  title,
  subtitle,
  paletteLabel,
  bell,
  accountLinks,
  accountHint,
}: {
  title: string
  subtitle?: string
  paletteLabel: string
  /** La cloche de l'espace, déjà branchée sur ses alertes. */
  bell: ReactNode
  accountLinks: AccountLink[]
  /** Passé à l'éditeur de photo : la photo d'un batch cooker est publique. */
  accountHint?: boolean
}) {
  return (
    <header className="sticky top-[var(--lf-dev-banner)] z-30 border-b border-[var(--line)] bg-shell/85 backdrop-blur-md">
      <div className="mx-auto flex min-h-[4.5rem] w-full max-w-[84rem] items-center gap-3 px-4 py-3 sm:px-6 lg:px-10">
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[1.375rem] font-bold leading-tight text-navy sm:text-2xl">
            {title}
          </h1>
          {subtitle && <p className="mt-0.5 hidden truncate text-sm text-ink-mid md:block">{subtitle}</p>}
        </div>

        <PaletteTrigger label={paletteLabel} className="hidden w-64 shrink-0 xl:flex" />
        <PaletteIconTrigger className="shrink-0 xl:hidden" />
        {bell}
        {/* Sur mobile, le compte est dans le panneau « Plus » de la barre basse. */}
        <div className="hidden lg:block">
          <AccountMenu links={accountLinks} publicHint={accountHint} />
        </div>
      </div>
    </header>
  )
}

/** La zone de contenu d'un écran : même largeur et mêmes marges partout. */
export function EspaceMain({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[84rem] flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-14 lg:pt-8">
      {children}
    </main>
  )
}

/* ── Barre basse mobile ───────────────────────────────────────────────────── */

export function EspaceMobileNav({
  home,
  items,
  groups,
  accountLinks,
  accountHint,
  note,
}: {
  home: string
  /** Quatre destinations au plus : la cinquième case est « Plus ». */
  items: NavItem[]
  /** Toute la navigation, pour le panneau « Plus ». */
  groups: NavGroup[]
  accountLinks: AccountLink[]
  accountHint?: boolean
  note?: ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { user, roleLabel, signOut } = useAuth()
  const me = useMe()
  const nom = me.data?.fullName ?? user?.name ?? 'Mon compte'

  // Ce qui attend derrière « Plus » : sans ce point, un message non lu rangé
  // dans le panneau ne se verrait pas depuis la barre.
  const visibles = new Set(items.map((i) => i.href))
  const cache = groups
    .flatMap((g) => g.items)
    .some((i) => !visibles.has(i.href) && (i.count ?? 0) > 0)
  // « Plus » est la case active quand la page ouverte n'a pas la sienne.
  const dansPlus = !items.some((i) => isActive(pathname, i, home))

  const tab = (active: boolean) =>
    cn(
      'flex h-14 w-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
      active ? 'text-white' : 'text-white/60',
    )

  return (
    <>
      <nav
        aria-label="Navigation de l’espace"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-navy pb-[env(safe-area-inset-bottom)] text-white lg:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {items.slice(0, 4).map((item) => {
            const active = isActive(pathname, item, home)
            return (
              <li key={item.href}>
                {item.locked ? (
                  <span aria-disabled="true" className={cn(tab(false), 'opacity-40')}>
                    <item.Icon className="h-5 w-5" aria-hidden />
                    {item.label}
                    <span className="sr-only">, disponible après validation de votre dossier</span>
                  </span>
                ) : (
                  <Link href={item.href} aria-current={active ? 'page' : undefined} className={tab(active)}>
                    <span className="relative">
                      <item.Icon
                        className={cn('h-5 w-5', active && 'text-amber')}
                        strokeWidth={active ? 2.2 : 1.9}
                        aria-hidden
                      />
                      {(item.count ?? 0) > 0 && (
                        <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full border-2 border-navy bg-amber">
                          <span className="sr-only">{item.count} en attente</span>
                        </span>
                      )}
                    </span>
                    {item.label}
                  </Link>
                )}
              </li>
            )
          })}
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              className={tab(dansPlus)}
            >
              <span className="relative">
                <MoreHorizontal className={cn('h-5 w-5', dansPlus && 'text-amber')} aria-hidden />
                {cache && (
                  <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full border-2 border-navy bg-amber" />
                )}
              </span>
              Plus
            </button>
          </li>
        </ul>
      </nav>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-deep/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:[animation-duration:120ms] lg:hidden" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-3xl bg-navy text-white shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.5)] focus:outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=closed]:[animation-duration:120ms] lg:hidden">
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <Avatar url={me.data?.avatarUrl} name={nom} className="h-10 w-10 shrink-0 text-sm" />
              <div className="min-w-0 flex-1">
                <Dialog.Title className="truncate text-sm font-semibold">{nom}</Dialog.Title>
                <Dialog.Description className="truncate text-xs text-white/55">
                  {roleLabel ?? 'Mon espace'}
                </Dialog.Description>
              </div>
              <Dialog.Close
                aria-label="Fermer"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden />
              </Dialog.Close>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {note}
              {groups.map((group, g) => (
                <div key={group.label ?? g} className={g > 0 ? 'mt-5' : undefined}>
                  {group.label && (
                    <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-white/40">
                      {group.label}
                    </p>
                  )}
                  <ul className="space-y-0.5">
                    {group.items.flatMap((item) => {
                      const entrees = [
                        { href: item.href, label: item.label, count: item.count, tete: true },
                        // Une entrée et sa première page fille mènent au même endroit.
                        ...(item.children ?? [])
                          .filter((c) => c.href !== item.href)
                          .map((c) => ({ href: c.href, label: c.label, count: undefined, tete: false })),
                      ]
                      return entrees.map((e) => {
                        const on = e.tete ? isActive(pathname, item, home) && pathname === e.href : pathname === e.href
                        const cls = cn(
                          'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm',
                          e.tete ? '' : 'pl-10 text-white/75',
                          // La page ouverte : la même pastille ambre que dans la colonne.
                          on ? 'bg-amber font-semibold text-navy' : 'text-white/85',
                        )
                        return (
                          <li key={e.href}>
                            {item.locked ? (
                              <span aria-disabled="true" className={cn(cls, 'opacity-40')}>
                                {e.tete && <item.Icon className="h-4 w-4 shrink-0" aria-hidden />}
                                <span className="flex-1">{e.label}</span>
                                <Lock className="h-3.5 w-3.5" aria-hidden />
                              </span>
                            ) : (
                              <Link href={e.href} onClick={() => setOpen(false)} className={cls}>
                                {e.tete && (
                                  <item.Icon className="h-4 w-4 shrink-0" aria-hidden />
                                )}
                                <span className="flex-1">{e.label}</span>
                                <Count n={e.count} onAmber={on} />
                              </Link>
                            )}
                          </li>
                        )
                      })
                    })}
                  </ul>
                </div>
              ))}

              <div className="mt-5 border-t border-white/10 pt-3">
                <div className="rounded-2xl bg-paper p-2 text-ink">
                  <AvatarEditor publicHint={accountHint} />
                </div>
                <ul className="mt-3 space-y-0.5">
                  {accountLinks.map(({ href, label, Icon }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={() => setOpen(false)}
                        className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-white/85"
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        {label}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link
                      href="/"
                      className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-white/85"
                    >
                      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                      Retour au site
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        signOut()
                        router.push('/')
                      }}
                      className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-white/85"
                    >
                      <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                      Déconnexion
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
