'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, UtensilsCrossed } from 'lucide-react'
import { useWeekMenus, weekLabel, type WeekCard, type WeekDish } from '@/lib/api/menus'
import { useDiets } from '@/lib/api/referentials'
import { countryLabel } from '@/lib/chef/countries'

/* ─────────────────────────────────────────────────────────────────────────────
   Le menu de la semaine, sur la page d'accueil.

   Cette section annonçait « cette semaine » en montrant quatre plats écrits en
   dur dans `lib/mock-data.ts`. Un visiteur voyait une carte inventée ici, puis
   la vraie sur `/menu` — et un batch cooker qui publiait ses plats ne les
   voyait jamais apparaître. Elle lit maintenant `GET /menus/week`, la même
   route que `/menu` et que l'étape de réservation : trois écrans, une source.

   La forme suit ce changement. Quatre cartes identiques traitaient les plats
   comme des vignettes interchangeables ; une ardoise les traite comme un menu
   — un plat à la une, puis les suivants en liste, **chacun avec le batch
   cooker qui le cuisine**. C'est lui qu'on réserve, pas le plat : son nom ne
   peut pas rester hors du cadre.

   Quand la semaine est vide — début de saison, personne en ligne — la section
   le dit et ouvre la demande sur-mesure. Elle ne retombe pas sur des plats
   fictifs : une carte qui ment est pire qu'une carte vide.
   ───────────────────────────────────────────────────────────────────────────── */

/** Un plat et celui qui le cuisine : l'API les rend ensemble, on les garde ensemble. */
interface PlatDeLaSemaine {
  plat: WeekDish
  chef: WeekCard['chef']
}

const SORTIE = [0.16, 1, 0.3, 1] as const

export default function FeaturedMenu() {
  const semaine = useWeekMenus({ limit: 6 })
  const diets = useDiets([])
  const dietLabel = (code: string) => diets.find((d) => d.code === code)?.label ?? code

  const cartes = semaine.data?.data ?? []
  const plats: PlatDeLaSemaine[] = cartes
    .flatMap((carte) => carte.dishes.map((plat) => ({ plat, chef: carte.chef })))
    .slice(0, 4)

  const [une, ...suite] = plats
  const vide = !semaine.isPending && plats.length === 0

  return (
    <section className="section-padding section-cream relative">
      <div className="container-xl">
        <motion.div
          initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: SORTIE }}
          className="mx-auto mb-14 max-w-2xl text-center"
        >
          <p className="eyebrow mb-5 justify-center">
            {semaine.data?.week ? `Semaine ${weekLabel(semaine.data.week)}` : 'Cette semaine'}
          </p>
          <h2 className="h-section">
            Le menu de <span className="accent">la semaine</span>
          </h2>
          <p className="mt-5 leading-relaxed text-ink-mid">
            {cartes.length > 1
              ? `${cartes.length} batch cookers cuisinent près de chez vous cette semaine. Composez votre carte, ils s'occupent du reste.`
              : 'Le menu est renouvelé chaque semaine. Composez votre carte, votre batch cooker s’occupe du reste.'}
          </p>
        </motion.div>

        {semaine.isPending ? (
          <Squelette />
        ) : vide ? (
          <Vide />
        ) : (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
            <PlatALaUne entree={une} dietLabel={dietLabel} />

            {suite.length > 0 && (
              <ul className="flex flex-col lg:self-center">
                {suite.map((entree, i) => (
                  <PlatEnLigne key={entree.plat.id} entree={entree} index={i} />
                ))}
              </ul>
            )}
          </div>
        )}

        {!vide && (
          <div className="mt-12 flex justify-center">
            <Link href="/menu" className="btn btn-navy">
              Voir toute la carte
              <ArrowRight className="icon-arrow h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

/* ── Le plat à la une ──────────────────────────────────────────────────────── */

/**
 * Le seul moment animé de la section : l'image se pose. Les entrées de droite
 * suivent en décalé, sans refaire la même entrée quatre fois.
 */
function PlatALaUne({
  entree,
  dietLabel,
}: {
  entree: PlatDeLaSemaine
  dietLabel: (code: string) => string
}) {
  const { plat, chef } = entree
  const origine = countryLabel(plat.country)

  return (
    <motion.article
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.9, ease: SORTIE }}
    >
      <Link
        href="/menu"
        className="group block overflow-hidden rounded-2xl bg-paper shadow-[0_24px_60px_-32px_rgba(31,42,55,0.45)] outline-none transition-shadow duration-500 hover:shadow-[0_32px_70px_-30px_rgba(31,42,55,0.5)] focus-visible:ring-2 focus-visible:ring-terra focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
      >
        <div className="relative aspect-[5/4] overflow-hidden">
          {plat.imageUrl ? (
            <motion.img
              initial={{ scale: 1.08, filter: 'blur(10px)' }}
              whileInView={{ scale: 1, filter: 'blur(0px)' }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 1.1, ease: SORTIE }}
              src={plat.imageUrl}
              alt={plat.name}
              className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-cream-deep">
              <UtensilsCrossed className="h-9 w-9 text-ink-soft" aria-hidden />
            </div>
          )}

          {plat.diets.length > 0 && (
            <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
              {plat.diets.slice(0, 2).map((code) => (
                <span
                  key={code}
                  className="rounded-full bg-paper/95 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-navy backdrop-blur-sm"
                >
                  {dietLabel(code)}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 lg:p-7">
          <h3 className="font-display text-2xl font-bold leading-tight text-navy transition-colors duration-300 group-hover:text-terra lg:text-[1.75rem]">
            {plat.name}
          </h3>
          <p className="mt-2 text-sm text-ink-mid">
            Par <span className="font-semibold text-navy">{chef.displayName}</span>
            {chef.city ? ` · ${chef.city}` : ''}
            {origine ? ` · ${origine}` : ''}
          </p>
          {plat.description && (
            <p className="mt-4 line-clamp-2 text-[15px] leading-relaxed text-ink-mid">
              {plat.description}
            </p>
          )}
        </div>
      </Link>
    </motion.article>
  )
}

/* ── Les suivants ──────────────────────────────────────────────────────────── */

function PlatEnLigne({ entree, index }: { entree: PlatDeLaSemaine; index: number }) {
  const { plat, chef } = entree
  const origine = countryLabel(plat.country)

  return (
    <motion.li
      initial={{ opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.7, ease: SORTIE, delay: 0.15 + index * 0.1 }}
      className="border-b border-[rgba(31,42,55,0.1)] last:border-b-0"
    >
      <Link
        href="/menu"
        className="group flex items-center gap-5 py-5 outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-terra focus-visible:ring-offset-4 focus-visible:ring-offset-cream"
      >
        <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-24">
          {plat.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={plat.imageUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-cream-deep">
              <UtensilsCrossed className="h-5 w-5 text-ink-soft" aria-hidden />
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-bold leading-snug text-navy transition-colors duration-300 group-hover:text-terra">
            {plat.name}
          </span>
          <span className="mt-1 block text-sm text-ink-mid">
            Par <span className="font-semibold text-navy">{chef.displayName}</span>
            {origine ? ` · ${origine}` : ''}
          </span>
        </span>

        <ArrowRight
          className="h-4 w-4 shrink-0 text-ink-soft/60 transition-all duration-300 group-hover:translate-x-1 group-hover:text-terra"
          aria-hidden
        />
      </Link>
    </motion.li>
  )
}

/* ── Les deux autres états ─────────────────────────────────────────────────── */

function Squelette() {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
      <div className="aspect-[5/4] animate-pulse rounded-2xl bg-cream-deep" />
      <ul className="flex flex-col">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="flex items-center gap-5 border-b border-[rgba(31,42,55,0.1)] py-5 last:border-b-0"
          >
            <span className="h-20 w-20 shrink-0 animate-pulse rounded-xl bg-cream-deep sm:h-24 sm:w-24" />
            <span className="flex-1">
              <span className="block h-4 w-2/3 animate-pulse rounded bg-cream-deep" />
              <span className="mt-2 block h-3 w-1/3 animate-pulse rounded bg-cream-deep" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Vide() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl bg-paper p-10 text-center shadow-[0_24px_60px_-32px_rgba(31,42,55,0.35)]">
      <UtensilsCrossed className="mx-auto mb-4 h-7 w-7 text-terra" aria-hidden />
      <p className="font-display text-xl font-bold text-navy">
        La carte de cette semaine n’est pas encore publiée
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink-mid">
        Nos batch cookers la composent en début de semaine. En attendant, vous
        pouvez décrire ce qui vous ferait plaisir : quelqu’un vous répondra.
      </p>
      <Link href="/espace-client/personnalisation" className="btn btn-navy mt-6">
        Faire une demande sur mesure
        <ArrowRight className="icon-arrow h-4 w-4" />
      </Link>
    </div>
  )
}
