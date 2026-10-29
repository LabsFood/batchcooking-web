'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useWeekMenus, type WeekCard, type WeekDish } from '@/lib/api/menus'
import { countryLabel } from '@/lib/chef/countries'

/* ─────────────────────────────────────────────────────────────────────────────
   « Composez votre menu », sur la page d'accueil.

   Il n'y a pas un menu de la semaine : chaque batch cooker tient sa propre
   carte, et le client y compose le sien. La section ne présente donc plus un
   menu daté, elle invite à choisir un batch cooker — et montre, en ardoise,
   quelques plats de leurs cartes pour donner le ton.

   Les plats viennent de `GET /menus/week`, la même source que `/menu` et que
   l'étape de réservation. Aucun changement d'API : la route rend déjà, pour
   chaque batch cooker, sa carte ou à défaut ses plats publiés.

   Quand il n'y a encore aucun plat, l'ardoise reste vide et dit qu'elle est à
   composer. Elle ne retombe pas sur des plats fictifs : une carte qui ment est
   pire qu'une carte vide.
   ───────────────────────────────────────────────────────────────────────────── */

/** Un plat et celui qui le cuisine : l'API les rend ensemble, on les garde ensemble. */
interface PlatALaCarte {
  plat: WeekDish
  chef: WeekCard['chef']
}

const SORTIE = [0.16, 1, 0.3, 1] as const

/** Ce que l'ardoise suggère tant qu'aucun batch cooker n'a publié de plat. */
const ENVIES = ['Un plat réconfortant', 'Une saveur du monde', 'Une envie du moment']

export default function FeaturedMenu() {
  const carte = useWeekMenus({ limit: 6 })

  const plats: PlatALaCarte[] = (carte.data?.data ?? [])
    .flatMap((c) => c.dishes.map((plat) => ({ plat, chef: c.chef })))
    .slice(0, 4)

  return (
    <section className="section-padding section-cream relative">
      <div className="container-xl">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
          {/* ── L'invitation ───────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: SORTIE }}
          >
            <h2 className="h-section">
              Composez votre menu, <span className="accent">avec votre batch cooker.</span>
            </h2>
            <p className="mt-6 max-w-md leading-relaxed text-ink-mid">
              Chaque batch cooker propose sa propre carte. Vous choisissez les plats qui vous
              font envie, il les cuisine chez vous en une seule séance.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
              <Link href="/menu" className="btn btn-navy">
                Choisir mon batch cooker
                <ArrowRight className="icon-arrow h-4 w-4" />
              </Link>
              <Link
                href="/espace-client/personnalisation"
                className="text-sm font-semibold text-navy underline decoration-[rgba(31,42,55,0.3)] underline-offset-[5px] transition-colors hover:text-terra hover:decoration-terra"
              >
                Une envie précise ? Faire une demande sur mesure
              </Link>
            </div>
          </motion.div>

          {/* ── L'ardoise ──────────────────────────────────────────────── */}
          <Ardoise plats={plats} chargement={carte.isPending} />
        </div>
      </div>
    </section>
  )
}

/* ── L'ardoise ─────────────────────────────────────────────────────────────── */

/**
 * Le seul moment animé de la section : les lignes se posent l'une après l'autre,
 * comme une carte qu'on écrit. Le texte à gauche reste sobre.
 */
function Ardoise({ plats, chargement }: { plats: PlatALaCarte[]; chargement: boolean }) {
  const vide = !chargement && plats.length === 0

  return (
    <div className="rounded-2xl bg-paper px-7 py-8 shadow-[0_24px_60px_-32px_rgba(31,42,55,0.45)] lg:px-10 lg:py-10">
      <p className="font-display text-xl font-bold text-navy">
        {vide ? 'À composer ensemble' : 'À la carte en ce moment'}
      </p>
      <div aria-hidden className="mt-4 h-px bg-[rgba(31,42,55,0.14)]" />

      <ul>
        {chargement
          ? [0, 1, 2].map((i) => <LigneSquelette key={i} />)
          : vide
            ? ENVIES.map((envie, i) => <LigneVide key={envie} envie={envie} index={i} />)
            : plats.map((entree, i) => <LigneDePlat key={entree.plat.id} entree={entree} index={i} />)}
      </ul>

      <p className="mt-6 text-sm leading-relaxed text-ink-mid">
        {vide
          ? 'Les batch cookers publient leurs plats au fil de l’eau. Dites-nous ce qui vous ferait plaisir.'
          : 'Chaque batch cooker a sa carte : ouvrez-la pour composer la vôtre.'}
      </p>
    </div>
  )
}

/** Le pointillé qui relie le nom du plat à son origine, comme sur une carte de restaurant. */
function Pointilles() {
  return (
    <span
      aria-hidden
      className="min-w-6 flex-1 translate-y-[-0.3em] self-end border-b border-dotted border-[rgba(31,42,55,0.35)]"
    />
  )
}

function LigneDePlat({ entree, index }: { entree: PlatALaCarte; index: number }) {
  const { plat, chef } = entree
  const origine = countryLabel(plat.country)

  return (
    <motion.li
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.7, ease: SORTIE, delay: 0.1 + index * 0.1 }}
      className="border-b border-[rgba(31,42,55,0.1)] last:border-b-0"
    >
      <Link
        href="/menu"
        className="group block py-5 outline-none focus-visible:ring-2 focus-visible:ring-terra focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
      >
        <span className="flex items-baseline gap-3">
          <span className="font-display text-lg font-bold leading-snug text-navy transition-colors duration-300 group-hover:text-terra lg:text-xl">
            {plat.name}
          </span>
          {origine && (
            <>
              <Pointilles />
              <span className="shrink-0 text-sm text-ink-mid">{origine}</span>
            </>
          )}
        </span>
        <span className="mt-1 block text-sm text-ink-mid">
          Par <span className="font-semibold text-navy">{chef.displayName}</span>
        </span>
      </Link>
    </motion.li>
  )
}

function LigneVide({ envie, index }: { envie: string; index: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.7, ease: SORTIE, delay: 0.1 + index * 0.1 }}
      className="flex items-baseline gap-3 border-b border-[rgba(31,42,55,0.1)] py-5 last:border-b-0"
    >
      <span className="font-display text-lg italic leading-snug text-ink-mid lg:text-xl">{envie}</span>
      <Pointilles />
    </motion.li>
  )
}

function LigneSquelette() {
  return (
    <li className="border-b border-[rgba(31,42,55,0.1)] py-5 last:border-b-0">
      <span className="block h-5 w-2/3 animate-pulse rounded bg-cream-deep" />
      <span className="mt-2 block h-3.5 w-1/3 animate-pulse rounded bg-cream-deep" />
    </li>
  )
}
