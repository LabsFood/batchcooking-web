'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Globe2 } from 'lucide-react'
import { geoNaturalEarth1, geoPath, geoGraticule10 } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import type { Feature, Geometry } from 'geojson'
import worldAtlas from 'world-atlas/countries-110m.json'
import {
  EXPLORED_COUNTRIES,
  TOTAL_COUNTRIES,
  type ExploredCountry,
} from '@/lib/client/mock'

/* ─────────────────────────────────────────────────────────────────────────────
   Carte culinaire (CL-01) — pièce maîtresse de l'accueil client.

   Les frontières viennent de `world-atlas` (TopoJSON 110m, ~108 Ko), projetées
   avec d3-geo. Les pays sont identifiés par leur code ISO 3166-1 numérique,
   renseigné sur chaque plat via le rattachement plat → pays (CL-06).
   ───────────────────────────────────────────────────────────────────────────── */

const WIDTH = 820
const HEIGHT = 420

export default function CulinaryMap() {
  const [active, setActive] = useState<ExploredCountry | null>(null)

  const exploredByIso = useMemo(
    () => new Map(EXPLORED_COUNTRIES.map((c) => [c.iso, c])),
    [],
  )

  // Projection + tracés calculés une seule fois : la topologie ne change pas.
  const { countries, graticule, outline } = useMemo(() => {
    const topo = worldAtlas as unknown as Topology
    const fc = feature(topo, topo.objects.countries) as unknown as {
      features: Feature<Geometry, { name: string }>[]
    }

    const projection = geoNaturalEarth1().fitExtent(
      [
        [8, 8],
        [WIDTH - 8, HEIGHT - 8],
      ],
      { type: 'Sphere' },
    )
    const path = geoPath(projection)

    return {
      countries: fc.features.map((f) => ({
        id: String(f.id),
        name: f.properties?.name ?? '',
        d: path(f) ?? '',
      })),
      graticule: path(geoGraticule10()) ?? '',
      outline: path({ type: 'Sphere' }) ?? '',
    }
  }, [])

  const explored = EXPLORED_COUNTRIES.length
  const ratio = (explored / TOTAL_COUNTRIES) * 100

  return (
    <div className="bg-navy text-white rounded-3xl p-5 lg:p-6 relative overflow-hidden">
      {/* <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-amber/20 blur-3xl pointer-events-none" /> */}

      <div className="relative">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber mb-2">
              Ma carte culinaire
            </p>
            <p className="font-display text-4xl font-bold leading-none">
              {explored}
              <span className="text-white/40 text-2xl"> / {TOTAL_COUNTRIES}</span>
            </p>
            <p className="text-xs text-white/60 mt-1">pays explorés</p>
          </div>
          <span className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
            <Globe2 className="w-5 h-5 text-amber" />
          </span>
        </div>

        {/* Carte */}
        <div className="relative rounded-2xl bg-navy-deep/40 overflow-hidden mb-4">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full h-auto block"
            role="img"
            aria-label={`Carte du monde : ${explored} pays explorés sur ${TOTAL_COUNTRIES}`}
          >
            {/* Contour du globe et méridiens */}
            <path d={outline} fill="rgba(255,255,255,0.03)" />
            <path
              d={graticule}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={0.5}
            />

            {countries.map((c) => {
              const found = exploredByIso.get(c.id)
              const isActive = active?.iso === c.id
              return (
                <path
                  key={c.id}
                  d={c.d}
                  fill={
                    found
                      ? isActive
                        ? '#FBBF4A'
                        : '#F39C12'
                      : 'rgba(255,255,255,0.09)'
                  }
                  stroke={found ? '#2C3E50' : 'rgba(255,255,255,0.14)'}
                  strokeWidth={found ? 0.7 : 0.4}
                  className={found ? 'cursor-pointer transition-[fill]' : ''}
                  onClick={() => found && setActive(isActive ? null : found)}
                >
                  {found && <title>{`${found.name} — ${found.dishes.length} plat(s)`}</title>}
                </path>
              )
            })}
          </svg>
        </div>

        {/* Progression */}
        <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-4">
          <motion.div
            className="h-full rounded-full bg-amber"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(ratio, 2)}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        {/* Pastilles pays */}
        <div className="flex flex-wrap gap-2">
          {EXPLORED_COUNTRIES.map((c, i) => (
            <motion.button
              key={c.code}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.04 * i, duration: 0.3 }}
              onClick={() => setActive(active?.code === c.code ? null : c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${active?.code === c.code
                  ? 'bg-amber text-navy'
                  : 'bg-white/10 text-white/80 hover:bg-white/15'
                }`}
            >
              <span className="text-sm leading-none">{c.flag}</span>
              {c.name}
            </motion.button>
          ))}
          <span className="px-3 py-1.5 rounded-xl bg-white/5 text-white/40 text-xs">
            +{TOTAL_COUNTRIES - explored} à découvrir
          </span>
        </div>

        {/* Détail du pays sélectionné */}
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl bg-white/[0.07] border border-white/10 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg leading-none">{active.flag}</span>
              <p className="font-display text-base font-bold">{active.name}</p>
            </div>
            <p className="text-[11px] uppercase tracking-wide text-white/45 mb-1.5">
              Plats découverts
            </p>
            <div className="flex flex-wrap gap-1.5">
              {active.dishes.map((d) => (
                <span
                  key={d}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-white/10 text-white/85"
                >
                  {d}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
