'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion } from 'framer-motion'
import { fade } from '@/lib/motion'
import { Maximize2, Minus, Plus, RotateCcw, X } from 'lucide-react'
import { geoCentroid, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import type { Feature, Geometry } from 'geojson'
import worldAtlas from 'world-atlas/countries-110m.json'
import { useCulinaryMap, type ExploredCountry } from '@/lib/api/me-dashboard'

/* ─────────────────────────────────────────────────────────────────────────────
   Carte culinaire (CL-01) — un globe.

   La carte à plat disait « des pays » ; le globe dit « le monde », et c'est
   bien de cela qu'il s'agit : faire le tour de la Terre par l'assiette.

   - Sur l'accueil, un globe posé, tourné vers ce qu'on a déjà goûté, avec le
     compte à côté. Il ne bouge pas : c'est un repère, pas une animation.
   - En grand, il se manipule : on le fait tourner en le tirant, on zoome à la
     molette ou aux boutons, et choisir un pays dans la liste fait tourner le
     globe jusqu'à lui.

   Le relief vient de deux dégradés (l'océan éclairé d'en haut à gauche, une
   ombre vers le bord) : c'est une sphère dessinée, pas une scène 3D. Aucune
   bibliothèque de plus — `d3-geo` projette, et sa projection orthographique
   masque d'elle-même la face cachée.

   Frontières : `world-atlas` (TopoJSON 110m). Les pays sont identifiés par leur
   code ISO 3166-1 numérique, renseigné sur chaque plat via le rattachement
   plat → pays (CL-06).
   ───────────────────────────────────────────────────────────────────────────── */

/** Côté du repère dans lequel le globe est dessiné. */
const COTE = 520
/** Rayon du globe à zoom 1 : une marge pour le halo. */
const RAYON = 236
const MIN_ZOOM = 1
const MAX_ZOOM = 4
/** L'Europe et l'Afrique de face : là où l'on ouvre quand rien n'a été goûté. */
const VUE_PAR_DEFAUT: Rotation = [-12, -22]

/** `[longitude, latitude]` de la rotation, en degrés. */
type Rotation = [number, number]

type Pays = { cle: string; id: string; name: string; feature: Feature<Geometry, { name: string }> }

function usePays(): Pays[] {
  return useMemo(() => {
    const topo = worldAtlas as unknown as Topology
    const fc = feature(topo, topo.objects.countries) as unknown as {
      features: Feature<Geometry, { name: string }>[]
    }
    // Quelques territoires n'ont pas de code : l'index tient lieu de clé.
    return fc.features.map((f, i) => ({
      cle: `${f.id ?? 'sans-code'}-${i}`,
      id: String(f.id),
      name: f.properties?.name ?? '',
      feature: f,
    }))
  }, [])
}

/** La rotation qui met un pays face à nous. */
function versPays(pays: Pays | undefined): Rotation | null {
  if (!pays) return null
  const [lon, lat] = geoCentroid(pays.feature)
  return [-lon, -lat]
}

/** La vue d'ouverture : le premier pays goûté, sinon l'Europe. */
function vueInitiale(tous: Pays[], goutes: ExploredCountry[]): Rotation {
  const premier = goutes[0]
  return versPays(tous.find((p) => p.id === premier?.iso)) ?? VUE_PAR_DEFAUT
}

const PALETTE = {
  clair: {
    halo: 'rgba(44, 62, 80, 0.06)',
    ocean: ['#EAF0F5', '#D5E0E9', '#BFCEDB'],
    terre: '#FFFFFF',
    bord: 'rgba(44, 62, 80, 0.16)',
    grille: 'rgba(44, 62, 80, 0.08)',
    ombre: 'rgba(31, 45, 61, 0.22)',
    goute: 'var(--amber)',
    bordGoute: 'var(--amber-deep)',
  },
  sombre: {
    halo: 'rgba(255, 255, 255, 0.05)',
    ocean: ['#3B5269', '#27384B', '#182330'],
    terre: 'rgba(255, 255, 255, 0.13)',
    bord: 'rgba(255, 255, 255, 0.16)',
    grille: 'rgba(255, 255, 255, 0.07)',
    ombre: 'rgba(8, 14, 22, 0.55)',
    goute: 'var(--amber)',
    bordGoute: '#1F2D3D',
  },
} as const

/**
 * Le globe, dessiné pour une rotation et un zoom donnés. Il ne tient aucun
 * état : celui qui l'utilise décide s'il tourne.
 */
function Globe({
  pays,
  goutes,
  rotation,
  zoom = 1,
  ton,
  selection,
  survol,
  onSurvol,
  onChoix,
  className,
  label,
}: {
  pays: Pays[]
  /** Les pays goûtés, par code ISO numérique. */
  goutes: Map<string, ExploredCountry>
  rotation: Rotation
  zoom?: number
  ton: keyof typeof PALETTE
  selection?: string | null
  survol?: string | null
  onSurvol?: (p: Pays | null, e?: React.MouseEvent) => void
  onChoix?: (p: Pays) => void
  className?: string
  label: string
}) {
  const id = useId()
  const c = PALETTE[ton]
  const centre = COTE / 2

  const { traces, grille } = useMemo(() => {
    const projection = geoOrthographic()
      .translate([centre, centre])
      .scale(RAYON * zoom)
      .rotate([rotation[0], rotation[1]])
      .clipAngle(90)
    const path = geoPath(projection)
    return {
      traces: pays.map((p) => path(p.feature) ?? ''),
      grille: path(geoGraticule10()) ?? '',
    }
  }, [pays, rotation, zoom, centre])

  const rayon = RAYON * zoom

  return (
    <svg viewBox={`0 0 ${COTE} ${COTE}`} className={className} role="img" aria-label={label}>
      <defs>
        {/* L'océan, éclairé d'en haut à gauche : c'est ce qui donne le volume. */}
        <radialGradient id={`${id}-ocean`} cx="36%" cy="30%" r="78%">
          <stop offset="0%" stopColor={c.ocean[0]} />
          <stop offset="55%" stopColor={c.ocean[1]} />
          <stop offset="100%" stopColor={c.ocean[2]} />
        </radialGradient>
        {/* L'ombre propre : rien au centre, plus dense vers le bord opposé à la lumière. */}
        <radialGradient id={`${id}-ombre`} cx="40%" cy="34%" r="72%">
          <stop offset="62%" stopColor={c.ombre} stopOpacity="0" />
          <stop offset="100%" stopColor={c.ombre} stopOpacity="1" />
        </radialGradient>
        <clipPath id={`${id}-disque`}>
          <circle cx={centre} cy={centre} r={rayon} />
        </clipPath>
      </defs>

      <circle cx={centre} cy={centre} r={Math.min(rayon + 10, centre)} fill={c.halo} />
      <circle cx={centre} cy={centre} r={rayon} fill={`url(#${id}-ocean)`} />

      <g clipPath={`url(#${id}-disque)`}>
        <path d={grille} fill="none" stroke={c.grille} strokeWidth={0.6} />
        {pays.map((p, i) => {
          const d = traces[i]
          if (!d) return null
          const goute = goutes.has(p.id)
          const choisi = selection === p.id
          return (
            <path
              key={p.cle}
              d={d}
              fill={goute ? c.goute : c.terre}
              fillOpacity={!goute && survol === p.cle ? 0.6 : 1}
              stroke={choisi ? '#FFFFFF' : goute ? c.bordGoute : c.bord}
              strokeWidth={choisi ? 1.6 : goute ? 0.8 : 0.5}
              style={{ cursor: goute && onChoix ? 'pointer' : undefined }}
              onMouseMove={onSurvol ? (e) => onSurvol(p, e) : undefined}
              onClick={goute && onChoix ? () => onChoix(p) : undefined}
            />
          )
        })}
        <circle
          cx={centre}
          cy={centre}
          r={rayon}
          fill={`url(#${id}-ombre)`}
          pointerEvents="none"
        />
      </g>
    </svg>
  )
}

// ── Panneau d'accueil ───────────────────────────────────────────────────────

export default function CulinaryMap() {
  const [open, setOpen] = useState(false)
  const { data } = useCulinaryMap()
  const pays = usePays()
  const countries = useMemo(() => data?.explored ?? [], [data])
  const total = data?.total ?? 195
  const explored = countries.length
  const goutes = useMemo(() => new Map(countries.map((c) => [c.iso, c])), [countries])
  const vue = useMemo(() => vueInitiale(pays, countries), [pays, countries])

  return (
    <>
      <section className="panel overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="flex flex-col p-5 lg:p-6">
            <h2 className="panel-title">Ma carte culinaire</h2>
            {explored === 0 ? (
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-mid">
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
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-mid">
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
              Explorer le globe
            </button>
          </div>

          {/* Le globe posé : il montre où l'on en est, il s'ouvre au clic. */}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={() => setOpen(true)}
            className="flex cursor-zoom-in items-center justify-center border-t border-[var(--line)] bg-cream-soft p-4 sm:border-l sm:border-t-0"
          >
            <Globe
              pays={pays}
              goutes={goutes}
              rotation={vue}
              ton="clair"
              label=""
              className="h-44 w-44 sm:h-52 sm:w-52"
            />
          </button>
        </div>
      </section>

      <GlobeDialog
        open={open}
        onOpenChange={setOpen}
        pays={pays}
        goutes={goutes}
        liste={countries}
        total={total}
        depart={vue}
      />
    </>
  )
}

// ── Le globe en grand ───────────────────────────────────────────────────────

interface Scene {
  pays: Pays[]
  goutes: Map<string, ExploredCountry>
  liste: ExploredCountry[]
  total: number
  /** La vue de l'accueil : le globe s'ouvre dessus, et y revient au recadrage. */
  depart: Rotation
}

function GlobeDialog({
  open,
  onOpenChange,
  ...scene
}: Scene & { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-deep/80 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:[animation-duration:120ms]" />
        <Dialog.Content className="fixed inset-3 z-50 flex flex-col overflow-hidden rounded-3xl bg-navy text-white shadow-[0_40px_90px_-30px_rgba(0,0,0,0.6)] focus:outline-none sm:inset-6 lg:inset-10 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.98] data-[state=closed]:[animation-duration:120ms]">
          {/* Montée à l'ouverture, démontée à la fermeture : le globe repart
              chaque fois de la vue de l'accueil, sans rien avoir à remettre à zéro. */}
          <GlobeScene {...scene} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function GlobeScene({ pays, goutes, liste, total, depart }: Scene) {
  const [selected, setSelected] = useState<ExploredCountry | null>(null)
  const [hover, setHover] = useState<{ cle: string; name: string; x: number; y: number } | null>(null)
  const [rotation, setRotation] = useState<Rotation>(depart)
  const [zoom, setZoom] = useState(1)
  // Le curseur dépend de l'état du glisser : il doit donc être un état, pas un ref.
  const [isDragging, setIsDragging] = useState(false)
  const prise = useRef<{ x: number; y: number; rotation: Rotation } | null>(null)
  // Un glisser se termine par un « clic » sur le pays qu'on survole : on ne le compte pas.
  const aBouge = useRef(false)
  const cadre = useRef<HTMLDivElement>(null)
  const animation = useRef<number | null>(null)
  const enAttente = useRef<Rotation | null>(null)
  const image = useRef<number | null>(null)

  const explored = liste.length
  const clampZoom = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k))

  const stopper = () => {
    if (animation.current != null) cancelAnimationFrame(animation.current)
    animation.current = null
  }

  // Au démontage, plus aucune image en attente.
  useEffect(
    () => () => {
      if (animation.current != null) cancelAnimationFrame(animation.current)
      if (image.current != null) cancelAnimationFrame(image.current)
    },
    [],
  )

  /** Fait tourner le globe jusqu'à une vue. */
  const tournerVers = (cible: Rotation, depuis: Rotation) => {
    stopper()
    // Mouvement réduit : on y est tout de suite.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRotation(cible)
      return
    }
    // Le plus court chemin en longitude : jamais plus d'un demi-tour.
    const dLon = ((((cible[0] - depuis[0]) % 360) + 540) % 360) - 180
    const dLat = cible[1] - depuis[1]
    const t0 = performance.now()
    // déplacement : le globe tourne jusqu'au pays en 400 ms, ralentit à l'arrivée
    const DUREE = 400
    const pas = (t: number) => {
      const k = Math.min(1, (t - t0) / DUREE)
      const e = 1 - Math.pow(1 - k, 3)
      setRotation([depuis[0] + dLon * e, depuis[1] + dLat * e])
      animation.current = k < 1 ? requestAnimationFrame(pas) : null
    }
    animation.current = requestAnimationFrame(pas)
  }

  /** « Aller voir » un pays goûté : le globe tourne jusqu'à lui. */
  const focus = (c: ExploredCountry) => {
    setSelected(c)
    const cible = versPays(pays.find((p) => p.id === c.iso))
    if (cible) tournerVers(cible, rotation)
  }

  const reset = () => {
    setSelected(null)
    setZoom(1)
    tournerVers(depart, rotation)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    stopper()
    prise.current = { x: e.clientX, y: e.clientY, rotation }
    aBouge.current = false
    setIsDragging(true)
    setHover(null)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!prise.current) return
    if (Math.abs(e.clientX - prise.current.x) + Math.abs(e.clientY - prise.current.y) > 4) {
      aBouge.current = true
    }
    // Un tiers de degré par pixel à zoom 1, moins quand on est près : le geste reste précis.
    const k = 0.32 / zoom
    const lon = prise.current.rotation[0] + (e.clientX - prise.current.x) * k
    const lat = Math.max(-75, Math.min(75, prise.current.rotation[1] - (e.clientY - prise.current.y) * k))
    // Une image à la fois : le pointeur émet plus vite que l'écran ne dessine.
    enAttente.current = [lon, lat]
    if (image.current == null) {
      image.current = requestAnimationFrame(() => {
        image.current = null
        if (enAttente.current) setRotation(enAttente.current)
      })
    }
  }
  const onPointerUp = () => {
    prise.current = null
    setIsDragging(false)
  }

  const onWheel = (e: React.WheelEvent) => {
    setZoom((z) => clampZoom(z * (e.deltaY < 0 ? 1.12 : 0.89)))
  }

  return (
    <>
          <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
            <div>
              <Dialog.Title className="font-display text-xl font-bold leading-tight">
                Ma carte culinaire
              </Dialog.Title>
              <Dialog.Description className="text-xs tabular-nums text-white/60">
                {explored} pays sur {total}. Faites tourner le globe, zoomez, choisissez un pays.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Fermer la carte"
              className="hit flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px]">
            {/* Le globe */}
            <div
              ref={cadre}
              className="relative flex min-h-[18rem] items-center justify-center overflow-hidden bg-navy-deep"
              onWheel={onWheel}
            >
              <div
                className="h-full max-h-full w-full touch-none select-none"
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onPointerLeave={() => {
                  onPointerUp()
                  setHover(null)
                }}
              >
                <Globe
                  pays={pays}
                  goutes={goutes}
                  rotation={rotation}
                  zoom={zoom}
                  ton="sombre"
                  selection={selected?.iso ?? null}
                  survol={hover?.cle ?? null}
                  onSurvol={(p, e) => {
                    if (!p || !e || prise.current) return
                    const box = cadre.current?.getBoundingClientRect()
                    const x = e.clientX - (box?.left ?? 0)
                    const y = e.clientY - (box?.top ?? 0)
                    setHover({
                      cle: p.cle,
                      name: goutes.get(p.id)?.name ?? p.name,
                      x: Math.min(x + 14, (box?.width ?? 0) - 230),
                      y: Math.max(y - 10, 8),
                    })
                  }}
                  onChoix={(p) => {
                    const c = goutes.get(p.id)
                    if (c && !aBouge.current) focus(c)
                  }}
                  label={`Globe terrestre, ${explored} pays goûtés sur ${total}`}
                  className="mx-auto h-full max-h-full w-full"
                />
              </div>

              {/* Infobulle : elle suit le curseur, donc pas de clic pour savoir où on est. */}
              {hover && <Infobulle hover={hover} goutes={goutes} pays={pays} />}

              {/* Commandes de vue */}
              <div className="absolute bottom-4 right-4 flex flex-col gap-1.5">
                <ZoomButton label="Zoomer" onClick={() => setZoom((z) => clampZoom(z * 1.4))}>
                  <Plus className="h-4 w-4" />
                </ZoomButton>
                <ZoomButton label="Dézoomer" onClick={() => setZoom((z) => clampZoom(z / 1.4))}>
                  <Minus className="h-4 w-4" />
                </ZoomButton>
                <ZoomButton label="Revenir à la vue de départ" onClick={reset}>
                  <RotateCcw className="h-4 w-4" />
                </ZoomButton>
              </div>
            </div>

            {/* Pays goûtés */}
            <aside className="min-h-0 overflow-y-auto border-t border-white/10 p-4 lg:border-l lg:border-t-0 lg:p-5">
              <h3 className="mb-3 text-sm font-semibold text-white/70">Pays goûtés</h3>
              {liste.length === 0 && (
                <p className="text-sm leading-relaxed text-white/65">
                  Aucun pays pour l’instant : le globe se colore une fois votre première
                  session terminée.
                </p>
              )}
              <ul className="space-y-1">
                {liste.map((c) => {
                  const on = selected?.code === c.code
                  return (
                    <li key={c.code}>
                      <button
                        onClick={() => focus(c)}
                        aria-pressed={on}
                        className={`flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm transition-colors ${
                          on ? 'bg-paper text-navy' : 'text-white/85 hover:bg-white/10'
                        }`}
                      >
                        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-amber" />
                        <span className="min-w-0 flex-1 truncate font-semibold">{c.name}</span>
                        <span className={`text-xs tabular-nums ${on ? 'text-ink-mid' : 'text-white/55'}`}>
                          {c.dishes.length} plat{c.dishes.length > 1 ? 's' : ''}
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
                  className="mt-4 rounded-2xl bg-white/[0.07] p-4"
                >
                  <p className="font-display text-base font-bold">{selected.name}</p>
                  <p className="mt-2 text-xs text-white/60">Plats découverts</p>
                  <ul className="mt-1.5 space-y-1">
                    {selected.dishes.map((d) => (
                      <li key={d} className="text-[0.8125rem] leading-relaxed text-white/90">
                        {d}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              <p className="mt-4 text-xs leading-relaxed tabular-nums text-white/55">
                Un pays se colore dès qu’un de ses plats entre dans votre frigo. Il reste{' '}
                {total - explored} pays à goûter.
              </p>
            </aside>
          </div>
    </>
  )
}

function Infobulle({
  hover,
  goutes,
  pays,
}: {
  hover: { cle: string; name: string; x: number; y: number }
  goutes: Map<string, ExploredCountry>
  pays: Pays[]
}) {
  const goute = goutes.get(pays.find((p) => p.cle === hover.cle)?.id ?? '')
  return (
    <div
      className="pointer-events-none absolute z-10 max-w-[220px] rounded-xl border border-white/10 bg-navy-deep px-3 py-2 text-xs shadow-[0_12px_28px_-12px_rgba(0,0,0,0.6)]"
      style={{ left: Math.max(hover.x, 8), top: hover.y }}
    >
      <p className="font-semibold text-white">{hover.name}</p>
      {goute ? (
        <p className="mt-0.5 tabular-nums text-amber">
          {goute.dishes.length} plat{goute.dishes.length > 1 ? 's' : ''} goûté
          {goute.dishes.length > 1 ? 's' : ''}
        </p>
      ) : (
        <p className="mt-0.5 text-white/60">Pas encore goûté</p>
      )}
    </div>
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
      className="hit flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
    >
      {children}
    </button>
  )
}
