'use client'

import { useState } from 'react'
import { ArrowRight, CalendarDays, ChefHat, SlidersHorizontal } from 'lucide-react'
import ReserveButton from '@/components/shared/ReserveButton'
import EquipmentSection from '@/components/shared/EquipmentSection'
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
import type { WeekCard } from '@/lib/api/menus'
import { useDiets } from '@/lib/api/referentials'

/* ─────────────────────────────────────────────────────────────────────────────
   Les cartes des batch cookers.

   Le client ne choisit pas des plats dans un catalogue anonyme : il choisit
   d'abord un batch cooker et sa carte. La page se lit donc par chef — une
   carte par chef, ses plats en aperçu — et la sélection des plats se fait à
   l'intérieur du menu retenu.

   L'en-tête dit comment s'y prendre : les filtres sont dans la colonne de
   gauche (dans un tiroir sur mobile), et la demande sur-mesure est à portée
   pour celui qui cherche autre chose que ce qui est proposé.

   Le parcours de choix vit dans `components/menu/ChefMenuBrowser` : la
   réservation de l'espace client présente exactement le même, à ceci près
   qu'elle enchaîne au lieu de demander une connexion.
   ───────────────────────────────────────────────────────────────────────────── */

const DEMARCHE = [
  { Icon: CalendarDays, text: 'Choisissez vos dates dans le calendrier' },
  { Icon: SlidersHorizontal, text: 'Filtrez par région, régime ou courses incluses' },
  { Icon: ChefHat, text: 'Ouvrez la carte du batch cooker qui vous plaît' },
]

export default function MenuClient() {
  const filters = useMenuFilters()
  const [open, setOpen] = useState<WeekCard | null>(null)
  const [tiroir, setTiroir] = useState(false)
  const diets = useDiets([])
  const dietLabel = (code: string) =>
    diets.find((d) => d.code === code)?.label ?? code

  const menus = filters.menus

  return (
    <div className="page-transition min-h-screen bg-cream pt-24">
      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy py-16 text-white lg:py-20">
        {/* Image de fond : elle porte l'appétit, le voile porte la lisibilité. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&auto=format&fit=crop&q=80"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(105deg, rgba(31,45,61,0.96) 0%, rgba(44,62,80,0.9) 45%, rgba(44,62,80,0.62) 100%)',
          }}
        />
        <div className="container-xl relative">
          <h1
            className="mb-5 max-w-3xl font-display font-bold leading-[1.05] text-white"
            style={{ fontSize: 'clamp(2.2rem, 5.4vw, 4rem)', letterSpacing: '-0.02em' }}
          >
            Choisissez votre batch cooker,{' '}
            <span className="font-medium italic text-terra">composez votre menu.</span>
          </h1>
          <p className="max-w-xl leading-relaxed text-white/70">
            Chaque batch cooker propose sa propre carte. Les filtres vous montrent ceux qui sont
            disponibles à vos dates, près de chez vous, et qui cuisinent ce que vous aimez.
          </p>

          <ul className="mt-7 flex flex-col gap-3 text-sm text-white/80 sm:flex-row sm:flex-wrap sm:gap-x-8">
            {DEMARCHE.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0 text-amber" aria-hidden />
                {text}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <MenuFilterButton
              filters={filters}
              onClick={() => setTiroir(true)}
              className="btn btn-amber lg:hidden"
            />
            <ReserveButton href="/espace-client/personnalisation" variant="outline-light">
              Faire une demande sur mesure
              <ArrowRight className="icon-arrow h-4 w-4" />
            </ReserveButton>
            <p className="text-sm text-white/60">
              Une envie particulière, une allergie ? Dites-le nous.
            </p>
          </div>
        </div>
      </section>

      {/* ── Filtres + cartes ─────────────────────────────────────────────── */}
      <section className="py-12 lg:py-14">
        <div className="container-xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-10">
            <MenuFilterSidebar filters={filters} className="lg:sticky lg:top-28 lg:self-start" />

            <div>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-mid" aria-live="polite">
                  {filters.isPending
                    ? 'Lecture des cartes…'
                    : menus.length === 0
                      ? 'Aucune carte ne correspond à votre recherche.'
                      : `${menus.length} batch cooker${menus.length > 1 ? 's' : ''} disponible${menus.length > 1 ? 's' : ''} sur cette période`}
                </p>
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
                <NoMenus onReset={filters.reset} filtered={filters.active} filters={filters} />
              ) : (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  {menus.map((menu, i) => (
                    <MenuCard
                      key={menu.chef.id}
                      menu={menu}
                      index={i}
                      onOpen={() => setOpen(menu)}
                      customOrder
                      dietLabel={dietLabel}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Demande sur-mesure */}
          <div className="mt-16 rounded-2xl border-2 border-dashed border-[rgba(217,105,65,0.3)] bg-paper p-10 text-center">
            <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(217,105,65,0.1)]">
              <ChefHat className="h-7 w-7 text-terra" aria-hidden />
            </span>
            <h2 className="mb-3 font-display text-2xl font-bold text-navy">Aucune carte ne vous ressemble ?</h2>
            <p className="mx-auto mb-6 max-w-md leading-relaxed text-ink-mid">
              Décrivez vos envies, vos allergies et votre budget : les batch cookers disponibles vous répondent avec
              une proposition chiffrée.
            </p>
            <ReserveButton href="/espace-client/personnalisation">
              Faire une demande sur mesure
              <ArrowRight className="icon-arrow h-4 w-4" />
            </ReserveButton>
          </div>
        </div>
      </section>

      <EquipmentSection variant="paper" compact />

      <MenuFilterDrawer filters={filters} open={tiroir} onOpenChange={setTiroir} />

      <MenuDialog
        menu={open}
        onClose={() => setOpen(null)}
        dietLabel={dietLabel}
        renderAction={({ menu, selected, close }) => (
          // La carte se referme : sinon le dialog Radix bloque la modale de connexion.
          <ReserveButton
            meals={selected.join(',')}
            chef={menu.chef.id}
            className="text-xs"
            onClick={close}
          >
            Réserver cette session
            <ArrowRight className="icon-arrow h-3.5 w-3.5" />
          </ReserveButton>
        )}
      />
    </div>
  )
}
