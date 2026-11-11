'use client'

import { useQuery } from '@tanstack/react-query'

/* ─────────────────────────────────────────────────────────────────────────────
   Référentiels de l'API — publics, sans jeton.

   Ils remplacent les listes en dur du front : régions d'intervention, régimes,
   allergènes, catégories de plat. Les codes qu'ils portent sont ceux que l'API
   attend en retour, donc les garder en double de notre côté, c'est se préparer
   une divergence silencieuse.

   Le repli sur la liste locale n'est pas un cache : c'est ce qui évite qu'un
   référentiel injoignable rende la candidature impossible.
   ───────────────────────────────────────────────────────────────────────────── */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export interface RefItem {
  code: string
  label: string
}

async function fetchRef<K extends string>(path: string, key: K): Promise<RefItem[]> {
  if (!API_URL) throw new Error("L'API n'est pas configurée.")
  const res = await fetch(`${API_URL}/referentials/${path}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Référentiel ${path} indisponible (${res.status}).`)
  const body = (await res.json()) as Record<K, RefItem[]>
  return body[key] ?? []
}

/** Ces référentiels changent de loin en loin : une heure de fraîcheur suffit. */
const HOUR = 60 * 60 * 1000

/**
 * Par ordre alphabétique français.
 *
 * L'API rend ces listes dans l'ordre où elles ont été saisies, ce qui n'est
 * un ordre pour personne : dans une liste déroulante de cent communes ou de
 * vingt-quatre langues, on cherche un nom, pas un rang. `localeCompare` en
 * `fr` range Égypte avec les E et Île-de-France avec les I, ce qu'un tri brut
 * sur les points de code ne fait pas.
 *
 * À ne pas appliquer aux référentiels dont l'ordre porte un sens — les types
 * d'étape vont de la préparation à la mise en boîte, pas de C à R.
 */
const COLLATEUR = new Intl.Collator('fr', { sensitivity: 'base', numeric: true })

function parNom<T>(items: T[], nom: (item: T) => string): T[] {
  return [...items].sort((a, b) => COLLATEUR.compare(nom(a), nom(b)))
}

const alphabetique = (items: RefItem[]) => parNom(items, (i) => i.label)

export function useRegions(fallback: RefItem[]) {
  const q = useQuery({
    queryKey: ['referentials', 'regions'],
    queryFn: () => fetchRef('regions', 'regions'),
    staleTime: HOUR,
  })
  return {
    regions: alphabetique(q.data ?? fallback),
    fromApi: q.isSuccess,
    isPending: q.isPending,
  }
}

/** Communes correspondant à un code postal, selon la base officielle. */
export function useCommunes(postcode: string) {
  return useQuery({
    queryKey: ['communes', postcode],
    enabled: /^\d{5}$/.test(postcode),
    staleTime: Infinity,
    retry: 1,
    queryFn: async ({ signal }) => {
      const res = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${postcode}&fields=nom`, { signal })
      if (!res.ok) throw new Error(`geo.api.gouv.fr ${res.status}`)
      const noms = ((await res.json()) as { nom: string }[]).map((c) => c.nom)
      return parNom(noms, (n) => n)
    },
  })
}

/** Une commune d'une région, telle que `interventionZones[].cities` l'attend. */
export interface RegionCommune {
  name: string
  insee: string
  department: string
}

/**
 * Toutes les communes d'une région, par ordre alphabétique (l'API trie).
 *
 * `GET /referentials/regions/{code}/communes` : la base officielle, relayée et
 * gardée 24 h par l'API. Jusqu'au 10/11 on n'avait que quelques villes de
 * référence par région, et le reste à chercher : une candidate de Mérignac ne
 * trouvait pas sa ville en dépliant sa région. N'appeler qu'à l'ouverture
 * d'une région : la plus grande pèse plusieurs milliers de lignes.
 */
export function useRegionCommunes(regionCode: string, enabled = true) {
  return useQuery({
    queryKey: ['referentials', 'communes', regionCode],
    enabled: enabled && !!API_URL,
    staleTime: Infinity,
    retry: 1,
    queryFn: async ({ signal }) => {
      const res = await fetch(`${API_URL}/referentials/regions/${regionCode}/communes`, {
        headers: { Accept: 'application/json' },
        signal,
      })
      if (!res.ok) throw new Error(`Communes de la région ${regionCode} indisponibles (${res.status}).`)
      return ((await res.json()) as { communes: RegionCommune[] }).communes ?? []
    },
  })
}

export function useDiets(fallback: RefItem[] = []) {
  const q = useQuery({
    queryKey: ['referentials', 'diets'],
    queryFn: () => fetchRef('diets', 'diets'),
    staleTime: HOUR,
  })
  return q.data ?? fallback
}

/**
 * Les langues qu'un batch cooker peut déclarer parler avec ses clients.
 *
 * Référentiel fermé côté API — toutes les langues ISO 639-1 (184 depuis le
 * 10/11), nommées en français. Un champ libre aurait donné « Anglais »,
 * « anglais », « EN » et « English » dans la même liste, et aucun filtre
 * possible.
 */
export function useLanguages(fallback: RefItem[] = []) {
  const q = useQuery({
    queryKey: ['referentials', 'languages'],
    queryFn: () => fetchRef('languages', 'languages'),
    staleTime: HOUR,
  })
  return alphabetique(q.data ?? fallback)
}

export function useAllergens(fallback: RefItem[] = []) {
  const q = useQuery({
    queryKey: ['referentials', 'allergens'],
    queryFn: () => fetchRef('allergens', 'allergens'),
    staleTime: HOUR,
  })
  return q.data ?? fallback
}

/**
 * Le libellé d'un code, ou le code lui-même.
 *
 * Les plats stockent des codes (`gluten_free`), et plusieurs écrans les
 * affichaient tels quels. Tant que le référentiel n'est pas arrivé — ou qu'il
 * ne connaît pas un code — montrer le code reste préférable à montrer un vide,
 * mais ce n'est pas ce qu'on veut lire : la fonction sert à ne plus avoir à
 * choisir au cas par cas.
 */
export function refLabel(list: RefItem[], code: string): string {
  return list.find((x) => x.code === code)?.label ?? code
}

export function useDishCategories(fallback: RefItem[] = []) {
  const q = useQuery({
    queryKey: ['referentials', 'dish-categories'],
    queryFn: () => fetchRef('dish-categories', 'categories'),
    staleTime: HOUR,
  })
  return q.data ?? fallback
}

/** §4.5 : ce qu'est une étape. Sans type, la fiche n'est pas « Prête ». */
export function useStepTypes() {
  const q = useQuery({
    queryKey: ['referentials', 'step-types'],
    queryFn: () => fetchRef('step-types', 'stepTypes'),
    staleTime: HOUR,
  })
  return q.data ?? STEP_TYPES
}

/** Le repli si l'API ne répond pas : la liste figée du plan (§4.5). */
const STEP_TYPES: RefItem[] = [
  { code: 'preparation', label: 'Préparation' },
  { code: 'cuisson', label: 'Cuisson' },
  { code: 'refroidissement', label: 'Refroidissement' },
  { code: 'mise_en_boite', label: 'Mise en boîte' },
]

/** §4.6 : les modes de réchauffage, réglés dans la console. */
export function useReheatModes(fallback: RefItem[] = []) {
  const q = useQuery({
    queryKey: ['referentials', 'reheat-modes'],
    queryFn: () => fetchRef('reheat-modes', 'modes'),
    // Une liste que la console modifie : pas d'une heure ici.
    staleTime: 5 * 60 * 1000,
  })
  return q.data ?? fallback
}

/** §4.8 : les profils d'une recette, réglés dans la console. */
export function useRecipeProfiles() {
  const q = useQuery({
    queryKey: ['referentials', 'recipe-profiles'],
    queryFn: () => fetchRef('recipe-profiles', 'profiles'),
    staleTime: 5 * 60 * 1000,
  })
  return q.data ?? []
}

/** §4.8 : les régimes que calcule la liste commune. */
export function useComputedDiets() {
  const q = useQuery({
    queryKey: ['referentials', 'computed-diets'],
    queryFn: () => fetchRef('computed-diets', 'diets'),
    staleTime: HOUR,
  })
  return q.data ?? COMPUTED_DIETS
}

const COMPUTED_DIETS: RefItem[] = [
  { code: 'vegetarian', label: 'Végétarien' },
  { code: 'vegan', label: 'Végétalien' },
  { code: 'no-pork', label: 'Sans porc' },
  { code: 'pescetarian', label: 'Pescétarien' },
  { code: 'gluten-free', label: 'Sans gluten' },
  { code: 'lactose-free', label: 'Sans lactose' },
]

/** Les régimes qu'on déclare : aucun ingrédient ne les prouve (§4.8). */
export const DECLARED_DIETS: RefItem[] = [
  { code: 'halal', label: 'Halal' },
  { code: 'kosher', label: 'Casher' },
]
