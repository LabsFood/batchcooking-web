'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, ChefHat, Info } from 'lucide-react'
import {
  MenuCard,
  MenuDialog,
  MenuFilterButton,
  MenuFilterDrawer,
  MenuFilterSidebar,
  MenusError,
  MenusLoading,
  NoMenus,
  useMenuFilters,
} from '@/components/menu/ChefMenuBrowser'
import { moisLabel, weekLabel, type WeekCard } from '@/lib/api/menus'
import { useDiets } from '@/lib/api/referentials'

/* ─────────────────────────────────────────────────────────────────────────────
   Menus et plats, côté client connecté.

   C'est la page `/menu` du site, à l'intérieur du tableau de bord : même
   composant de parcours, même colonne de filtres, mêmes cartes. Elle en
   différait par un bandeau et une barre de filtres horizontale — ce qui
   revenait à faire découvrir deux fois le même écran à la même personne,
   avant et après connexion.

   Ce qui reste propre au dashboard : l'en-tête est porté par la barre du
   haut (titre + sous-titre), il n'est donc pas répété ici, et l'action
   finale enchaîne sur la réservation au lieu de demander une connexion.
   ───────────────────────────────────────────────────────────────────────────── */

function DashboardMenusInner() {
  const reserveMode = useSearchParams().get('reserve') === '1'
  const filters = useMenuFilters()
  const [open, setOpen] = useState<WeekCard | null>(null)
  const [tiroir, setTiroir] = useState(false)
  const diets = useDiets([])
  const dietLabel = (code: string) => diets.find((d) => d.code === code)?.label ?? code

  const menus = filters.menus

  // La période regardée, dite en tête des résultats — comme sur le site.
  const debut = new Date(`${filters.semaine}T00:00:00`)
  const fin = new Date(debut)
  fin.setDate(fin.getDate() + 6)
  const periode =
    filters.mode === 'mois'
      ? moisLabel(filters.mois).replace(/^./, (c) => c.toUpperCase())
      : `Semaine ${weekLabel({ start: debut.toISOString(), end: fin.toISOString() })}`

  return (
    <div className="space-y-8">
      {reserveMode && (
        <div
          className="flex items-start gap-3 rounded-2xl border border-amber/40 bg-amber-soft/60 p-4"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-ink" aria-hidden />
          <p className="text-sm leading-relaxed text-navy">
            <span className="font-semibold">D’abord le batch cooker, ensuite ses plats.</span>{' '}
            Ouvrez la carte de celui dont la cuisine vous parle, cochez vos plats, et la
            réservation reprend là où vous en êtes.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-10">
        <MenuFilterSidebar filters={filters} className="lg:self-start" />

        <div>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold leading-tight text-navy">
                {periode}
              </h2>
              <p className="mt-1 text-sm text-ink-mid" aria-live="polite">
                {filters.isPending
                  ? 'Lecture des cartes…'
                  : menus.length === 0
                    ? 'Aucune carte ne correspond à votre recherche.'
                    : `${menus.length} batch cooker${menus.length > 1 ? 's' : ''} disponible${menus.length > 1 ? 's' : ''} sur cette période`}
              </p>
            </div>
            <MenuFilterButton
              filters={filters}
              onClick={() => setTiroir(true)}
              className="btn btn-outline inline-flex items-center gap-2 px-4 py-2.5 text-xs lg:hidden"
            />
          </div>

          {filters.isPending ? (
            <MenusLoading />
          ) : filters.isError ? (
            <MenusError onRetry={filters.refetch} />
          ) : menus.length === 0 ? (
            <NoMenus onReset={filters.reset} filtered={filters.active} filters={filters}>
              <Link href="/espace-client/personnalisation" className="btn btn-primary text-xs whitespace-normal text-balance">
                Faire une demande sur mesure
                <ArrowRight className="icon-arrow h-3.5 w-3.5" aria-hidden />
              </Link>
            </NoMenus>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {menus.map((menu, i) => (
                <MenuCard
                  key={menu.chef.id}
                  menu={menu}
                  index={i}
                  onOpen={() => setOpen(menu)}
                  openLabel="Voir sa carte"
                  customOrder
                  dietLabel={dietLabel}
                />
              ))}
            </div>
          )}

          {/* Demande sur-mesure : la même porte de sortie que sur le site. */}
          <div className="mt-12 rounded-2xl border-2 border-dashed border-[rgba(217,105,65,0.3)] bg-paper p-8 text-center">
            <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(217,105,65,0.1)]">
              <ChefHat className="h-6 w-6 text-amber-ink" aria-hidden />
            </span>
            <h2 className="mb-2 font-display text-xl font-bold text-navy">
              Aucune carte ne vous ressemble ?
            </h2>
            <p className="mx-auto mb-5 max-w-md text-sm leading-relaxed text-ink-mid">
              Décrivez vos envies, vos allergies et votre budget : les batch cookers
              disponibles vous répondent avec une proposition chiffrée.
            </p>
            <Link href="/espace-client/personnalisation" className="btn btn-primary text-xs whitespace-normal text-balance">
              Faire une demande sur mesure
              <ArrowRight className="icon-arrow h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>

      <MenuFilterDrawer filters={filters} open={tiroir} onOpenChange={setTiroir} />

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
