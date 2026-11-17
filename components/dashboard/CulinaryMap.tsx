'use client'

import { useMemo, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion } from 'framer-motion'
import { fade } from '@/lib/motion'
import { Maximize2, Minus, Plus, RotateCcw, X } from 'lucide-react'
import { geoNaturalEarth1, geoPath, geoGraticule10 } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import type { Feature, Geometry } from 'geojson'
import worldAtlas from 'world-atlas/countries-110m.json'
import { useCulinaryMap, type ExploredCountry } from '@/lib/api/me-dashboard'

/* ─────────────────────────────────────────────────────────────────────────────
   Carte culinaire (CL-01).

   Sur l'accueil, elle se montre : la carte du monde, les pays goûtés en ambre,
   et le compte à côté. Elle s'ouvre en grand, là où elle a la place d'être
   lue — survol, sélection, zoom et déplacement.

   Frontières : `world-atlas` (TopoJSON 110m), projetées avec d3-geo. Les pays
   sont identifiés par leur code ISO 3166-1 numérique, renseigné sur chaque
   plat via le rattachement plat → pays (CL-06).
   ───────────────────────────────────────────────────────────────────────────── */

const WIDTH = 900
const HEIGHT = 460
const MIN_ZOOM = 1
const MAX_ZOOM = 6

type Geo = { id: string; name: string; d: string }

function useWorld() {
  return useMemo(() => {
    const topo = worldAtlas as unknown as Topology
    const fc = feature(topo, topo.objects.countries) as unknown as {
      features: Feature<Geometry, { name: string }>[]
    }
    const projection = geoNaturalEarth1().fitExtent(
      [
        [10, 10],
        [WIDTH - 10, HEIGHT - 10],
      ],
      { type: 'Sphere' },
    )
    const path = geoPath(projection)
    return {
      countries: fc.features.map((f) => ({
        id: String(f.id),
        name: f.properties?.name ?? '',
        d: path(f) ?? '',
      })) as Geo[],
      graticule: path(geoGraticule10()) ?? '',
      outline: path({ type: 'Sphere' }) ?? '',
      centroidOf: (id: string) => {
        const f = fc.features.find((x) => String(x.id) === id)
        return f ? path.centroid(f) : null
      },
    }
  }, [])
}

// ── Panneau d'accueil ───────────────────────────────────────────────────────

export default function CulinaryMap() {
  const [open, setOpen] = useState(false)
  const { data } = useCulinaryMap()
  const { countries: monde } = useWorld()
  const countries = useMemo(() => data?.explored ?? [], [data])
  const total = data?.total ?? 195
  const explored = countries.length
  const goutes = useMemo(() => new Set(countries.map((c) => c.iso)), [countries])

  return (
    <>
      <section className="panel overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
          <div className="flex flex-col p-5 lg:p-6">
            <h2 className="panel-title">Ma carte culinaire</h2>
            {explored === 0 ? (
              <p className="mt-2 text-sm leading-relaxed text-ink-mid">
                Elle se colore pays par pays, dès qu’un plat entre dans votre frigo.
              </p>
            ) : (
              <>
                <p className="mt-3 flex items-baseline gap-2">
                  <span className="font-display text-4xl font-bold leading-none tabular-nums text-navy">
                    {explored}
                  </span>
                  <span className="text-sm text-ink-mid">
                    pays goûté{explored > 1 ? 's' : ''} sur {total}
                  </span>
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink-mid">
                  {countries
                    .slice(0, 5)
                    .map((c) => c.name)
                    .join(', ')}
                  {explored > 5 ? ` et ${explored - 5} autres` : ''}.
                </p>
              </>
            )}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="btn btn-outline mt-5 self-start sm:mt-auto"
            >
              <Maximize2 className="h-4 w-4" aria-hidden />
              Explorer la carte
            </button>
          </div>

          {/* La carte elle-même, pas un pictogramme : on voit où l'on a mangé. */}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={() => setOpen(true)}
            className="block cursor-zoom-in border-t border-[var(--line)] bg-cream-soft p-3 sm:border-l sm:border-t-0"
          >
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-full w-full">
              {monde.map((c) => (
                <path
                  key={c.id}
                  d={c.d}
                  fill={goutes.has(c.id) ? 'var(--amber)' : '#CFD9E2'}
                  stroke={goutes.has(c.id) ? 'var(--amber-deep)' : 'var(--cream-soft)'}
                  strokeWidth={0.5}
                />
              ))}
            </svg>
          </button>
        </div>
      </section>

      <MapDialog open={open} onOpenChange={setOpen} countries={countries} total={total} />
    </>
  )
}

// ── Carte plein écran ───────────────────────────────────────────────────────

function MapDialog({
  open,
  onOpenChange,
  countries: exploredList,
  total,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  countries: ExploredCountry[]
  total: number
}) {
  const { countries, graticule, outline, centroidOf } = useWorld()
  const [selected, setSelected] = useState<ExploredCountry | null>(null)
  const [hover, setHover] = useState<{ name: string; explored?: ExploredCountry; x: number; y: number } | null>(null)
  const [view, setView] = useState({ k: 1, x: 0, y: 0 })
  // Le curseur dépend de l'état du glisser : il doit donc être un état, pas un ref.
  const [isDragging, setIsDragging] = useState(false)
  const dragging = useRef<{ x: number; y: number } | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)

  const exploredByIso = useMemo(() => new Map(exploredList.map((c) => [c.iso, c])), [exploredList])
  const explored = exploredList.length

  const clampZoom = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k))
  const reset = () => setView({ k: 1, x: 0, y: 0 })

  /** Centre la vue sur un pays et l'agrandit : « aller voir » un pays exploré. */
  const focus = (c: ExploredCountry) => {
    setSelected(c)
    const centroid = centroidOf(c.iso)
    if (!centroid) return
    const k = 2.6
    setView({ k, x: WIDTH / 2 - centroid[0] * k, y: HEIGHT / 2 - centroid[1] * k })
  }

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = { x: e.clientX - view.x, y: e.clientY - view.y }
    setIsDragging(true)
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    setView((v) => ({ ...v, x: e.clientX - dragging.current!.x, y: e.clientY - dragging.current!.y }))
  }
  const onPointerUp = () => {
    dragging.current = null
    setIsDragging(false)
  }

  const onWheel = (e: React.WheelEvent) => {
    const k = clampZoom(view.k * (e.deltaY < 0 ? 1.15 : 0.87))
    setView((v) => ({ ...v, k }))
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) {
          setSelected(null)
          setHover(null)
          reset()
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-deep/80 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:[animation-duration:120ms]" />
        <Dialog.Content className="fixed inset-3 z-50 flex flex-col overflow-hidden rounded-3xl bg-navy text-white shadow-[0_40px_90px_-30px_rgba(0,0,0,0.6)] focus:outline-none sm:inset-6 lg:inset-10 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.98] data-[state=closed]:[animation-duration:120ms]">
          <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
            <div>
              <Dialog.Title className="font-display text-xl font-bold leading-tight">Ma carte culinaire</Dialog.Title>
              <Dialog.Description className="text-xs text-white/55">
                {explored} pays sur {total} · survolez, cliquez, zoomez
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Fermer la carte"
              className="hit flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px]">
            {/* Carte */}
            <div
              ref={frameRef}
              className="relative min-h-0 overflow-hidden bg-[radial-gradient(120%_120%_at_50%_0%,#24384d_0%,#1F2D3D_60%,#16222e_100%)]"
              onWheel={onWheel}
            >
              <svg
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                className="h-full w-full touch-none select-none"
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={() => {
                  onPointerUp()
                  setHover(null)
                }}
                role="img"
                aria-label={`Carte du monde, ${explored} pays explorés sur ${total}`}
              >
                <defs>
                  <linearGradient id="exploredFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FBBF4A" />
                    <stop offset="100%" stopColor="#E08D0C" />
                  </linearGradient>
                </defs>

                <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
                  <path d={outline} fill="rgba(255,255,255,0.03)" />
                  <path d={graticule} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={0.4 / view.k} />

                  {countries.map((c) => {
                    const found = exploredByIso.get(c.id)
                    const isSelected = selected?.iso === c.id
                    const isHovered = hover?.name === c.name
                    return (
                      <path
                        key={c.id}
                        d={c.d}
                        fill={found ? 'url(#exploredFill)' : isHovered ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)'}
                        stroke={isSelected ? '#FFFFFF' : found ? 'rgba(31,45,61,0.9)' : 'rgba(255,255,255,0.12)'}
                        strokeWidth={(isSelected ? 1.4 : found ? 0.6 : 0.35) / view.k}
                        className="transition-[fill] duration-150"
                        style={{ cursor: found ? 'pointer' : 'default' }}
                        onMouseMove={(e) => {
                          const box = frameRef.current?.getBoundingClientRect()
                          const x = e.clientX - (box?.left ?? 0)
                          const y = e.clientY - (box?.top ?? 0)
                          setHover({
                            name: c.name,
                            explored: found,
                            x: Math.min(x + 14, (box?.width ?? 0) - 230),
                            y: Math.max(y - 10, 8),
                          })
                        }}
                        onClick={() => found && focus(found)}
                      />
                    )
                  })}
                </g>
              </svg>

              {/* Infobulle : elle suit le curseur, donc pas de clic pour savoir où on est. */}
              {hover && (
                <div
                  className="pointer-events-none absolute z-10 max-w-[220px] rounded-xl bg-navy-deep/95 px-3 py-2 text-xs shadow-lg ring-1 ring-white/10"
                  style={{ left: hover.x, top: hover.y }}
                >
                  <p className="font-semibold text-white">{hover.explored?.name ?? hover.name}</p>
                  {hover.explored ? (
                    <p className="mt-0.5 text-amber">
                      {hover.explored.dishes.length} plat{hover.explored.dishes.length > 1 ? 's' : ''} goûté
                      {hover.explored.dishes.length > 1 ? 's' : ''}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-white/50">Pas encore exploré</p>
                  )}
                </div>
              )}

              {/* Commandes de vue */}
              <div className="absolute bottom-4 right-4 flex flex-col gap-1.5">
                <ZoomButton label="Zoomer" onClick={() => setView((v) => ({ ...v, k: clampZoom(v.k * 1.4) }))}>
                  <Plus className="h-4 w-4" />
                </ZoomButton>
                <ZoomButton label="Dézoomer" onClick={() => setView((v) => ({ ...v, k: clampZoom(v.k / 1.4) }))}>
                  <Minus className="h-4 w-4" />
                </ZoomButton>
                <ZoomButton label="Recadrer" onClick={reset}>
                  <RotateCcw className="h-4 w-4" />
                </ZoomButton>
              </div>
            </div>

            {/* Pays explorés */}
            <aside className="min-h-0 overflow-y-auto border-t border-white/10 p-4 lg:border-l lg:border-t-0 lg:p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/50">
                Pays explorés
              </p>
              {exploredList.length === 0 && (
                <p className="text-sm text-white/60">
                  Aucun pays pour l&apos;instant : la carte se colore une fois votre première prestation terminée.
                </p>
              )}
              <ul className="space-y-1.5">
                {exploredList.map((c) => {
                  const on = selected?.code === c.code
                  return (
                    <li key={c.code}>
                      <button
                        onClick={() => focus(c)}
                        aria-pressed={on}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                          on ? 'bg-amber text-navy' : 'text-white/80 hover:bg-white/10'
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`h-2 w-2 shrink-0 rounded-full ${on ? 'bg-navy' : 'bg-amber'}`}
                        />
                        <span className="min-w-0 flex-1 truncate font-semibold">{c.name}</span>
                        <span className={`text-xs ${on ? 'text-navy/70' : 'text-white/45'}`}>
                          {c.dishes.length}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              {selected && (
                <motion.div
                  // fondu : le détail du pays apparaît en 180 ms
                  {...fade}
                  className="mt-4 rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10"
                >
                  <p className="font-display text-base font-bold">{selected.name}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-white/45">Plats découverts</p>
                  <ul className="mt-1.5 space-y-1">
                    {selected.dishes.map((d) => (
                      <li key={d} className="rounded-lg bg-white/5 px-2.5 py-1.5 text-[13px] text-white/85">
                        {d}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              <p className="mt-4 text-xs leading-relaxed text-white/40">
                Un pays se colore dès qu&apos;un de ses plats entre dans votre frigo. Il reste{' '}
                {total - explored} pays à goûter.
              </p>
            </aside>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ZoomButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="hit flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
    >
      {children}
    </button>
  )
}
