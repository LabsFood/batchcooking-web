'use client'

import { useState } from 'react'
import { ArrowRight, ChefHat, Sparkles } from 'lucide-react'
import ReserveButton from '@/components/shared/ReserveButton'
import EquipmentSection from '@/components/shared/EquipmentSection'
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
   Menus de la semaine.

   Le client ne choisit plus des plats dans un catalogue anonyme : il choisit
   d'abord un batch cooker et sa carte de la semaine. La page se lit donc par
   chef — une carte par chef, ses plats en aperçu — et la sélection des plats
   se fait à l'intérieur du menu retenu.

   Le parcours de choix vit dans `components/menu/ChefMenuBrowser` : la
   réservation de l'espace client présente exactement le même, à ceci près
   qu'elle enchaîne au lieu de demander une connexion.
   ───────────────────────────────────────────────────────────────────────────── */

export default function MenuClient() {
  const filters = useMenuFilters()
  const [open, setOpen] = useState<WeekCard | null>(null)
  const diets = useDiets([])
  const dietLabel = (code: string) =>
    diets.find((d) => d.code === code)?.label ?? code

  const menus = filters.menus
  const totalDishes = menus.reduce((n, m) => n + m.dishes.length, 0)

  return (
    <div className="page-transition min-h-screen bg-cream pt-24">
      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy py-20 text-white lg:py-24">
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
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-amber">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Semaine {weekLabel(filters.week)}
          </p>
          <h1
            className="mb-5 font-display font-bold leading-none text-white"
            style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)', letterSpacing: '-0.02em' }}
          >
            Les menus de <span className="font-medium italic text-terra">vos chefs.</span>
          </h1>
          <p className="max-w-xl leading-relaxed text-white/70">
            Chaque batch cooker compose sa carte de la semaine. Choisissez celui dont la cuisine vous parle, puis les
            plats que vous voulez retrouver dans votre frigo.
          </p>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            <Stat
              value={filters.isPending ? '—' : String(menus.length)}
              label={`chef${menus.length > 1 ? 's' : ''} cette semaine`}
            />
            <Stat
              value={filters.isPending ? '—' : String(totalDishes)}
              label="plats proposés"
            />
            <Stat value="2 h" label="chez vous, une seule session" />
          </dl>
        </div>
      </section>

      {/* ── Filtres ──────────────────────────────────────────────────────── */}
      <section className="sticky top-20 z-30 border-b border-[rgba(31,42,55,0.08)] bg-cream/95 backdrop-blur">
        <div className="container-xl py-4">
          <MenuFilterBar filters={filters} />
        </div>
      </section>

      {/* ── Menus ────────────────────────────────────────────────────────── */}
      <section className="py-14 lg:py-16">
        <div className="container-xl">
          <p className="mb-6 text-sm text-ink-mid" aria-live="polite">
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
            <NoMenus onReset={filters.reset} filtered={filters.active} />
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {menus.map((menu, i) => (
                <MenuCard
                  key={menu.chef.id}
                  menu={menu}
                  index={i}
                  onOpen={() => setOpen(menu)}
                  dietLabel={dietLabel}
                />
              ))}
            </div>
          )}

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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="block font-display text-2xl font-bold text-amber">{value}</span>
        <span className="block text-xs text-white/60">{label}</span>
      </dd>
    </div>
  )
}
