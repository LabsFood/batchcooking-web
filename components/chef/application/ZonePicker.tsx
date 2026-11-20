'use client'

import { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRegionCommunes, useRegions } from '@/lib/api/referentials'
import { ChevronDown, Loader2, MapPin, Plus, Search, X } from 'lucide-react'
import {
  METRO_REGION_CODES,
  REGIONS,
  type Region,
  cityKey,
  normalize,
  regionLabel,
  type City,
} from '@/lib/chef/regions'
import type { Zone } from '@/lib/chef/application'
import { CheckBox } from './fields'

/* ─────────────────────────────────────────────────────────────────────────────
   Sélecteur de zones d'intervention.

   Les 13 régions métropolitaines en liste, chacune dépliable sur toutes ses
   communes (`GET /referentials/regions/{code}/communes`, par ordre
   alphabétique). On coche une région entière, ou des villes précises. La
   recherche du haut filtre la liste et interroge geo.api.gouv.fr pour
   retrouver une commune sans savoir dans quelle région elle est : seul le
   texte saisi est transmis, rien d'autre.
   ───────────────────────────────────────────────────────────────────────────── */

interface CommuneResult {
  nom: string
  code: string
  codeDepartement: string
  codeRegion: string
}

async function searchCommunes(q: string, signal?: AbortSignal): Promise<CommuneResult[]> {
  const url = `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&fields=nom,code,codeDepartement,codeRegion&boost=population&limit=12`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`geo.api.gouv.fr ${res.status}`)
  return res.json()
}

export default function ZonePicker({
  value,
  onChange,
  invalid,
  describedBy,
}: {
  value: Zone[]
  onChange: (zones: Zone[]) => void
  invalid?: boolean
  describedBy?: string
}) {
  const [query, setQuery] = useState('')
  const [remoteQuery, setRemoteQuery] = useState('')
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onQuery = (q: string) => {
    setQuery(q)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => setRemoteQuery(q.trim()), 280)
  }

  // Codes et libellés viennent de `GET /referentials/regions` : ce sont eux
  // que l'API attend en retour. Les villes de référence restent locales, elle
  // n'en fournit pas. Si le référentiel est injoignable, la liste en dur prend
  // le relais plutôt que de bloquer la candidature.
  const localCities = useMemo(() => new Map(REGIONS.map((r) => [r.code, r.cities])), [])
  const { regions: refRegions } = useRegions(
    useMemo(() => REGIONS.map((r) => ({ code: r.code, label: r.label })), []),
  )
  const catalogue: Region[] = useMemo(
    () =>
      refRegions.map((r) => ({
        code: r.code,
        label: r.label,
        cities: localCities.get(r.code) ?? [],
      })),
    [refRegions, localCities],
  )

  const zoneOf = (code: string) => value.find((z) => z.regionCode === code)

  // ── Mises à jour de la sélection ──────────────────────────────────────────
  const setZone = (code: string, next: Zone | null) => {
    const rest = value.filter((z) => z.regionCode !== code)
    const merged = next ? [...rest, next] : rest
    // Ordre stable : celui du référentiel.
    const order = catalogue.map((r) => r.code)
    onChange(merged.sort((a, b) => order.indexOf(a.regionCode) - order.indexOf(b.regionCode)))
  }

  const toggleRegion = (code: string) => {
    const zone = zoneOf(code)
    setZone(code, zone?.wholeRegion ? null : { regionCode: code, wholeRegion: true, cities: [] })
  }

  const toggleCity = (code: string, city: City) => {
    const zone = zoneOf(code)
    if (zone?.wholeRegion) return
    const cities = zone?.cities ?? []
    const has = cities.some((c) => cityKey(c) === cityKey(city))
    const next = has ? cities.filter((c) => cityKey(c) !== cityKey(city)) : [...cities, city]
    setZone(code, next.length ? { regionCode: code, wholeRegion: false, cities: next } : null)
  }

  const toggleOpen = (code: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })

  // ── Filtrage local ────────────────────────────────────────────────────────
  const q = normalize(query)
  const filtered = useMemo(() => {
    return catalogue.map((r) => {
      // Les communes ajoutées par la recherche s'affichent avec les villes de référence.
      const extra = (value.find((z) => z.regionCode === r.code)?.cities ?? []).filter(
        (c) => !r.cities.some((rc) => cityKey(rc) === cityKey(c)),
      )
      const all = [...r.cities, ...extra]
      if (!q) return { region: r, cities: all, match: true }
      const regionHit = normalize(r.label).includes(q)
      const cities = regionHit ? all : all.filter((c) => normalize(c.name).includes(q))
      return { region: r, cities, match: regionHit || cities.length > 0 }
    }).filter((x) => x.match)
  }, [q, value, catalogue])

  // ── Recherche distante (toutes les communes) ──────────────────────────────
  const remote = useQuery({
    queryKey: ['geo-communes', normalize(remoteQuery)],
    queryFn: ({ signal }) => searchCommunes(remoteQuery, signal),
    enabled: remoteQuery.length >= 2,
    staleTime: 5 * 60_000,
    retry: 0,
  })

  const listed = new Set(
    filtered.flatMap((f) => f.cities.map((c) => normalize(`${c.dept}:${c.name}`))),
  )
  const others = (remote.data ?? [])
    .filter((r) => METRO_REGION_CODES.has(r.codeRegion))
    .filter((r) => !listed.has(normalize(`${r.codeDepartement}:${r.nom}`)))
    .slice(0, 8)

  const selectedCount = value.reduce((n, z) => n + (z.wholeRegion ? 1 : z.cities.length), 0)
  const searching = q.length > 0

  return (
    <div>
      {/* Sélection courante */}
      <div className="mb-3 min-h-[34px]" aria-live="polite">
        {value.length === 0 ? (
          <p className="py-1.5 text-[13px] text-ink-soft">Aucune zone choisie pour l’instant.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5" aria-label="Zones choisies">
            {value.flatMap((z) =>
              z.wholeRegion
                ? [
                    <li key={z.regionCode}>
                      <Chip
                        label={`${regionLabel(z.regionCode)}`}
                        detail="toute la région"
                        onRemove={() => setZone(z.regionCode, null)}
                      />
                    </li>,
                  ]
                : z.cities.map((c) => (
                    <li key={`${z.regionCode}-${cityKey(c)}`}>
                      <Chip label={c.name} detail={c.dept} onRemove={() => toggleCity(z.regionCode, c)} />
                    </li>
                  )),
            )}
          </ul>
        )}
      </div>

      <div
        className={`overflow-hidden rounded-xl border-[1.5px] bg-paper transition-colors ${
          invalid ? 'border-red-600' : 'border-[rgba(31,42,55,0.12)]'
        }`}
      >
        {/* Recherche */}
        <div className="relative border-b border-[rgba(31,42,55,0.08)]">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Région ou ville"
            aria-label="Rechercher une région ou une ville"
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className="w-full bg-transparent py-3.5 pl-11 pr-11 text-sm text-ink outline-none placeholder:text-ink-soft/80 focus-visible:bg-cream-soft/60"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQuery('')}
              aria-label="Effacer la recherche"
              className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-ink-soft hover:bg-cream-soft hover:text-navy"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Liste des régions */}
        <ul className="max-h-[440px] overflow-y-auto overscroll-contain [scrollbar-color:rgba(31,42,55,0.2)_transparent] [scrollbar-width:thin]">
          {filtered.map(({ region, cities }) => {
            const zone = zoneOf(region.code)
            const whole = !!zone?.wholeRegion
            const partial = !whole && (zone?.cities.length ?? 0) > 0
            const expanded = searching || open.has(region.code)
            const panelId = `zone-${region.code}`
            return (
              <li key={region.code} className="border-b border-[rgba(31,42,55,0.06)] last:border-b-0">
                <div className="flex items-center gap-3 px-4 py-3">
                  <CheckBox
                    label={`Toute la région ${region.label}`}
                    checked={whole}
                    indeterminate={partial}
                    onChange={() => toggleRegion(region.code)}
                  />
                  <button
                    type="button"
                    onClick={() => toggleOpen(region.code)}
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    disabled={searching}
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left disabled:cursor-default"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-navy">{region.label}</span>
                      <span className="block text-xs text-ink-soft">
                        {whole
                          ? 'Toute la région'
                          : partial
                            ? `${zone!.cities.length} ville${zone!.cities.length > 1 ? 's' : ''} choisie${zone!.cities.length > 1 ? 's' : ''}`
                            : 'Toute la région, ou des villes précises'}
                      </span>
                    </span>
                    {!searching && (
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-ink-soft transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                        aria-hidden
                      />
                    )}
                  </button>
                </div>

                {expanded && (
                  <div id={panelId} className="bg-cream-soft/60 px-4 pb-3 pt-1">
                    {whole && (
                      <p className="mb-2 pl-[30px] text-xs text-ink-mid">
                        Toute la région est couverte. Décochez-la pour choisir des villes précises.
                      </p>
                    )}
                    {searching ? (
                      <CityGrid
                        cities={cities}
                        zone={zone}
                        whole={whole}
                        onToggle={(city) => toggleCity(region.code, city)}
                      />
                    ) : (
                      <RegionCommunes
                        regionCode={region.code}
                        regionLabel={region.label}
                        fallback={cities}
                        zone={zone}
                        whole={whole}
                        onToggle={(city) => toggleCity(region.code, city)}
                      />
                    )}
                  </div>
                )}
              </li>
            )
          })}

          {/* Autres communes, via la recherche nationale */}
          {searching && (
            <li className="px-4 py-3">
              <p className="mb-2 text-xs font-semibold text-ink-mid">Autres communes</p>
              {remoteQuery.length < 2 || remote.isFetching ? (
                <p className="flex items-center gap-2 text-[13px] text-ink-soft">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Recherche en cours…
                </p>
              ) : remote.isError ? (
                <p className="text-[13px] text-ink-soft">
                  Recherche indisponible pour le moment. Choisissez dans la liste ou toute la région.
                </p>
              ) : others.length === 0 ? (
                <p className="text-[13px] text-ink-soft">
                  {filtered.length === 0
                    ? 'Aucune commune de France métropolitaine ne correspond.'
                    : 'Rien d’autre à proposer.'}
                </p>
              ) : (
                <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {others.map((r) => {
                    const zone = zoneOf(r.codeRegion)
                    return (
                      <li key={r.code}>
                        <button
                          type="button"
                          disabled={!!zone?.wholeRegion}
                          onClick={() =>
                            toggleCity(r.codeRegion, { name: r.nom, dept: r.codeDepartement, insee: r.code })
                          }
                          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm hover:bg-cream-soft disabled:cursor-default disabled:opacity-50"
                        >
                          <Plus className="h-3.5 w-3.5 shrink-0 text-amber-ink" aria-hidden />
                          <span className="min-w-0 truncate text-ink">{r.nom}</span>
                          <span className="ml-auto shrink-0 text-xs text-ink-soft">
                            {r.codeDepartement} · {regionLabel(r.codeRegion)}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )}
        </ul>
      </div>

      <p className="mt-2 text-xs text-ink-soft tabular-nums">
        {selectedCount === 0
          ? '13 régions de France métropolitaine'
          : `${value.length} région${value.length > 1 ? 's' : ''} concernée${value.length > 1 ? 's' : ''}`}
      </p>
    </div>
  )
}

/** Une tranche suffit à l'œil ; les milliers de communes d'une région, non. */
const TRANCHE = 200

/**
 * Toutes les communes d'une région dépliée, par ordre alphabétique.
 *
 * Chargées à l'ouverture seulement, filtrables sur place, et montrées par
 * tranches : la Nouvelle-Aquitaine en compte plus de quatre mille. Si l'API ne
 * répond pas, les villes de référence et la recherche du haut prennent le
 * relais, comme avant.
 */
function RegionCommunes({
  regionCode,
  regionLabel,
  fallback,
  zone,
  whole,
  onToggle,
}: {
  regionCode: string
  regionLabel: string
  fallback: City[]
  zone: Zone | undefined
  whole: boolean
  onToggle: (city: City) => void
}) {
  const communes = useRegionCommunes(regionCode)
  const [filtre, setFiltre] = useState('')
  const [montrees, setMontrees] = useState(TRANCHE)

  const toutes: City[] = useMemo(
    () =>
      communes.data
        ? communes.data.map((c) => ({ name: c.name, dept: c.department, insee: c.insee }))
        : fallback,
    [communes.data, fallback],
  )
  const f = normalize(filtre)
  const liste = f ? toutes.filter((c) => normalize(c.name).includes(f)) : toutes

  // `isLoading` et pas `isPending` : sans API configurée, la requête ne part
  // jamais et resterait « en attente » pour toujours.
  if (communes.isLoading) {
    return (
      <p className="flex items-center gap-2 py-2 pl-[30px] text-[13px] text-ink-soft">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Chargement des communes…
      </p>
    )
  }

  return (
    <div className="pl-[30px]">
      {communes.isError && (
        <p className="mb-2 text-xs text-ink-mid">
          La liste complète est indisponible pour le moment : voici les villes principales.
          Les autres se trouvent avec la recherche du haut.
        </p>
      )}
      {toutes.length > 12 && (
        <input
          type="search"
          value={filtre}
          onChange={(e) => {
            setFiltre(e.target.value)
            setMontrees(TRANCHE)
          }}
          // Entrée ne doit pas envoyer la candidature.
          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
          placeholder={`Filtrer les ${toutes.length.toLocaleString('fr-FR')} communes`}
          aria-label={`Filtrer les communes de ${regionLabel}`}
          className="mb-2 w-full rounded-lg border border-[rgba(31,42,55,0.12)] bg-paper px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-soft/80 focus-visible:border-[rgba(31,42,55,0.35)]"
        />
      )}
      {liste.length === 0 ? (
        <p className="py-1.5 text-[13px] text-ink-soft">Aucune commune de la région ne correspond.</p>
      ) : (
        <CityGrid
          cities={liste.slice(0, montrees)}
          zone={zone}
          whole={whole}
          onToggle={onToggle}
          indent={false}
        />
      )}
      {liste.length > montrees && (
        <button
          type="button"
          onClick={() => setMontrees((n) => n + TRANCHE)}
          className="hit mt-2 text-xs font-semibold text-amber-ink hover:underline"
        >
          Afficher plus ({(liste.length - montrees).toLocaleString('fr-FR')} restantes)
        </button>
      )}
    </div>
  )
}

function CityGrid({
  cities,
  zone,
  whole,
  onToggle,
  indent = true,
}: {
  cities: City[]
  zone: Zone | undefined
  whole: boolean
  onToggle: (city: City) => void
  indent?: boolean
}) {
  return (
    <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
      {cities.map((city) => {
        const on = whole || !!zone?.cities.some((c) => cityKey(c) === cityKey(city))
        return (
          <li key={city.insee || cityKey(city)}>
            <label
              className={`flex items-center gap-3 rounded-lg py-1.5 pr-2 text-sm ${indent ? 'pl-[30px]' : 'pl-0'} ${
                whole ? 'text-ink-soft' : 'cursor-pointer text-ink hover:bg-paper'
              }`}
            >
              <CheckBox
                label={`${city.name} (${city.dept})`}
                checked={on}
                disabled={whole}
                onChange={() => onToggle(city)}
              />
              <span className="min-w-0 truncate">{city.name}</span>
              <span className="ml-auto text-xs tabular-nums text-ink-soft">{city.dept}</span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}

function Chip({ label, detail, onRemove }: { label: string; detail?: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-navy py-1 pl-3 pr-1 text-xs font-semibold text-white">
      <MapPin className="h-3 w-3 text-amber" aria-hidden />
      {label}
      {detail && <span className="font-normal text-white/65">{detail}</span>}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Retirer ${label}`}
        className="hit ml-0.5 flex h-5 w-5 items-center justify-center rounded-full text-white/70 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}
