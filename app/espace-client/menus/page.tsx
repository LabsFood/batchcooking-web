'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import {
  MenuCard,
  MenuDialog,
  MenuFilterBar,
  MenusError,
  MenusLoading,
  NoMenus,
  useMenuFilters,
} from '@/components/menu/ChefMenuBrowser'
import { weekLabel, type WeekCard } from '@/lib/api/menus'
import { useDiets } from '@/lib/api/referentials'

/* ─────────────────────────────────────────────────────────────────────────────
   Menus et plats, côté client connecté.

   L'écran montrait une grille de plats sans chef, tirée des maquettes. Or on
   ne réserve pas un plat : on réserve quelqu'un, qui cuisine chez vous. C'est
   donc le même parcours que sur le site public et que dans la réservation —
   littéralement le même composant, pour que ce qu'on a vu avant de se
   connecter soit ce qu'on retrouve après.

   Seule l'action finale change : ici elle emmène vers la réservation avec le
   chef et les plats déjà retenus.
   ───────────────────────────────────────────────────────────────────────────── */

function DashboardMenusInner() {
  const reserveMode = useSearchParams().get('reserve') === '1'
  const filters = useMenuFilters()
  const [open, setOpen] = useState<WeekCard | null>(null)
  const diets = useDiets([])
  const dietLabel = (code: string) => diets.find((d) => d.code === code)?.label ?? code

  const menus = filters.menus

  return (
    <div className="space-y-6">
      {reserveMode && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-3xl border border-amber/40 bg-amber-soft/70 p-4 lg:p-5"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber text-navy">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div className="flex-1 text-sm text-navy">
            <p className="font-semibold">D’abord le chef, ensuite ses plats.</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-mid">
              Ouvrez la carte de celui dont la cuisine vous parle, cochez vos plats, et la
              réservation reprend là où vous en êtes.
            </p>
          </div>
        </motion.div>
      )}

      <section className="rounded-3xl border border-mint-deep/30 bg-gradient-to-br from-mint via-mint/80 to-mint-deep/30 p-6 lg:p-7">
        <p className="eyebrow mb-3" style={{ color: 'var(--mint-ink)' }}>
          Semaine {weekLabel(filters.week)}
        </p>
        <h2 className="font-display text-2xl font-bold leading-tight text-navy lg:text-3xl">
          Les cartes de la semaine, chef par chef.
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-mid">
          Chaque batch cooker compose la sienne. Choisissez celui dont la cuisine vous
          parle, puis les plats que vous voulez retrouver dans votre frigo.
        </p>
      </section>

      <MenuFilterBar filters={filters} />

      <p className="text-sm text-ink-mid" aria-live="polite">
        {filters.isPending
          ? 'Lecture des cartes de la semaine…'
          : menus.length === 0
            ? 'Aucune carte ne correspond à votre recherche.'
            : `${menus.length} batch cooker${menus.length > 1 ? 's' : ''} cette semaine`}
      </p>

      {filters.isPending ? (
        <MenusLoading />
      ) : filters.isError ? (
        <MenusError onRetry={filters.refetch} />
      ) : menus.length === 0 ? (
        <NoMenus onReset={filters.reset} filtered={filters.active}>
          <Link href="/espace-client/personnalisation" className="btn btn-primary text-xs">
            Faire une demande sur mesure
            <ArrowRight className="icon-arrow h-3.5 w-3.5" aria-hidden />
          </Link>
        </NoMenus>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {menus.map((menu, i) => (
            <MenuCard
              key={menu.chef.id}
              menu={menu}
              index={i}
              onOpen={() => setOpen(menu)}
              openLabel="Voir sa carte"
              dietLabel={dietLabel}
            />
          ))}
        </div>
      )}

      <MenuDialog
        menu={open}
        onClose={() => setOpen(null)}
        dietLabel={dietLabel}
        renderAction={({ menu, selected }) => (
          <Link
            href={`/espace-client/reservation?chef=${menu.chef.id}${
              selected.length > 0 ? `&meals=${selected.join(',')}` : ''
            }`}
            className={`btn btn-primary text-xs ${
              selected.length === 0 ? 'pointer-events-none opacity-55' : ''
            }`}
            aria-disabled={selected.length === 0}
          >
            Réserver avec {menu.chef.displayName.split(' ')[0]}
            <ArrowRight className="icon-arrow h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      />
    </div>
  )
}

export default function DashboardMenusPage() {
  return (
    <Suspense fallback={<MenusLoading />}>
      <DashboardMenusInner />
    </Suspense>
  )
}
