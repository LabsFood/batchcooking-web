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
import { moisLabel, weekLabel, type WeekCard } from '@/lib/api/menus'
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
  { Icon: CalendarDays, text: 'Choisissez vos dates' },
  { Icon: SlidersHorizontal, text: 'Filtrez par région ou régime' },
  { Icon: ChefHat, text: 'Ouvrez la carte qui vous plaît' },
]

export default function MenuClient() {
  const filters = useMenuFilters()
  const [open, setOpen] = useState<WeekCard | null>(null)
  const [tiroir, setTiroir] = useState(false)
  const diets = useDiets([])
  const dietLabel = (code: string) =>
    diets.find((d) => d.code === code)?.label ?? code

  const menus = filters.menus

  // La période regardée, dite en tête des résultats : « Semaine du 2 au 8
  // novembre », ou « Novembre 2026 » au mois.
  const debut = new Date(`${filters.semaine}T00:00:00`)
  const fin = new Date(debut)
  fin.setDate(fin.getDate() + 6)
  const periode =
    filters.mode === 'mois'
      ? moisLabel(filters.mois).replace(/^./, (c) => c.toUpperCase())
      : `Semaine ${weekLabel({ start: debut.toISOString(), end: fin.toISOString() })}`

  return (
    <div className="page-transition min-h-screen bg-cream pt-24">
      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy py-12 text-white lg:py-16">
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
          {/* Le titre ne change pas de couleur en cours de phrase : il se lit d'un trait. */}
          <h1
            className="max-w-3xl font-display font-bold leading-[1.05] text-white [text-wrap:balance]"
            style={{ fontSize: 'clamp(2.1rem, 4.6vw, 3.5rem)', letterSpacing: '-0.02em' }}
          >
            Choisissez votre batch cooker, composez votre menu.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/75 [text-wrap:pretty]">
            Chaque batch cooker a sa propre carte. Indiquez vos dates, votre région et vos envies :
            vous verrez qui peut venir cuisiner chez vous.
          </p>

          {/* La démarche est une suite : elle se numérote. */}
          <ol className="mt-7 flex flex-col gap-3 text-sm text-white/85 sm:flex-row sm:flex-wrap sm:gap-x-8">
            {DEMARCHE.map(({ Icon, text }, i) => (
              <li key={text} className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="sr-only">Étape {i + 1} : </span>
                  {text}
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <MenuFilterButton
              filters={filters}
              onClick={() => setTiroir(true)}
              className="btn btn-amber lg:hidden"
            />
            {/* Le secondaire est un lien : le bouton de la page, c'est « Voir la carte ». */}
            <ReserveButton
              asChild
              href="/espace-client/personnalisation"
              className="hit inline-flex items-center gap-2 text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
            >
              Une envie particulière, une allergie ? Faites une demande sur-mesure
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </ReserveButton>
          </div>
        </div>
      </section>

      {/* ── Filtres + cartes ─────────────────────────────────────────────── */}
      <section className="py-12 lg:py-14">
        <div className="container-xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-12">
            <MenuFilterSidebar filters={filters} className="lg:self-start" />

            <div>
              <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
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
                      semaine={filters.mode === 'semaine' ? filters.semaine : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Demande sur-mesure */}
          <div className="mt-16 flex flex-col gap-6 rounded-3xl bg-navy p-7 text-white sm:p-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
            <div className="max-w-xl">
              <h2 className="font-display text-2xl font-bold leading-tight sm:text-3xl">
                Aucune carte ne vous ressemble ?
              </h2>
              <p className="mt-3 leading-relaxed text-white/75">
                Décrivez vos envies, vos allergies et votre budget : les batch cookers disponibles
                vous répondent avec une proposition chiffrée.
              </p>
            </div>
            {/* Sur 375 px, le libellé ne tient pas sur une ligne : il passe à la
                ligne au lieu d'élargir la page. */}
            <ReserveButton
              href="/espace-client/personnalisation"
              variant="amber"
              className="shrink-0 whitespace-normal text-balance"
            >
              Faire une demande sur-mesure
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
