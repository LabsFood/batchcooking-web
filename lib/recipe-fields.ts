/* ─────────────────────────────────────────────────────────────────────────────
   Le vocabulaire d'une recette, côté batch cooker.

   Les unités et les rayons sont définis ici, et `lib/chef/recipes.ts` s'en
   sert pour bâtir la liste de courses : deux listes finiraient par diverger,
   et un rayon écrit différemment casse le regroupement. Les listes en vigueur
   viennent de l'API (`useUnits`, `useAisles`) ; celles d'ici sont le repli.

   La console admin tient le même vocabulaire, aux mêmes valeurs
   (`admin-labsfood/lib/recipe-fields.ts`). C'est nécessaire : adopter un plat
   de la maison recopie sa recette telle quelle chez le batch cooker.

   Enfin, deux contraintes de l'API qu'aucun écran ne devinerait :
   `IngredientDto` exige ses quatre champs et `StorageDto` exige `method` **et**
   `days`. Un couple incomplet fait échouer l'enregistrement du plat entier —
   d'où les gardes ici, plutôt qu'un 422 opaque devant un formulaire rempli.
   Le réchauffage se dit par ses modes, cochés dans la liste de la console.
   ───────────────────────────────────────────────────────────────────────────── */

import type { Ingredient, Recipe, Step } from '@/lib/api/chef-catalog'

/* ── Les unités (§4.12) ────────────────────────────────────────────────────── */

export interface UnitItem {
  code: string
  /** Pour une unité. */
  label: string
  /** À partir de deux. */
  plural: string
}

const unit = (code: string, label: string, plural = label): UnitItem => ({ code, label, plural })

/**
 * Les 14 unités d'une ligne, telles que l'API les sert (`GET /referentials/units`).
 * Cette liste est le repli quand l'API ne répond pas, et la source des types.
 */
export const UNITS: UnitItem[] = [
  unit('g', 'g'),
  unit('kg', 'kg'),
  unit('ml', 'ml'),
  unit('cl', 'cl'),
  unit('l', 'l'),
  unit('tsp', 'c. à café'),
  unit('tbsp', 'c. à soupe'),
  unit('piece', 'pièce', 'pièces'),
  unit('clove', 'gousse', 'gousses'),
  unit('bunch', 'botte', 'bottes'),
  unit('slice', 'tranche', 'tranches'),
  unit('leaf', 'feuille', 'feuilles'),
  unit('pinch', 'pincée', 'pincées'),
  unit('to_taste', 'selon le goût'),
]

export const UNIT_CODES = UNITS.map((u) => u.code)

/**
 * Les unités qu'une ligne accepte : les 14 du repli, plus celles que l'API sert
 * (`useUnits` les ajoute dès qu'elles arrivent). C'est le jeu que la liste
 * déroulante propose : une unité qu'on peut y choisir rend la ligne prête.
 *
 * Il ne fait que grandir. Une ligne prête ne cesse donc jamais de l'être parce
 * que le référentiel est arrivé entre-temps : elle sortirait de l'envoi, et
 * l'enregistrement suivant l'effacerait.
 */
const acceptedUnits = new Set<string>(UNIT_CODES)

/** Ajoute les unités servies par l'API (`GET /referentials/units`). */
export function acceptUnits(codes: string[]): void {
  for (const code of codes) if (code) acceptedUnits.add(code)
}

/** Une unité qu'une ligne peut porter : celles de la liste déroulante. */
export const unitAccepted = (code: string) => acceptedUnits.has(code)

/** « selon le goût » : pas de quantité, pas de nombre à l'écran. */
export const TO_TASTE = 'to_taste'

/**
 * Les rayons, par identifiant.
 *
 * Ce ne sont pas des libellés : la liste de courses groupe **par la chaîne
 * stockée**. La liste en vigueur vient de `GET /referentials/aisles` (hook
 * `useAisles`), dans l'ordre d'un parcours en magasin, et un admin peut la
 * modifier. Celle-ci est le repli : les 13 rayons par défaut de l'API.
 */
export const AISLE_LABEL: Record<string, string> = {
  'fruits-legumes': 'Fruits et légumes (y compris herbes fraîches)',
  boulangerie: 'Boulangerie',
  boucherie: 'Boucherie et volaille',
  poissonnerie: 'Poissonnerie',
  cremerie: 'Crèmerie et œufs',
  fromages: 'Fromages',
  'epicerie-salee': 'Épicerie salée (pâtes, riz, légumineuses, sauces)',
  conserves: 'Conserves et bocaux',
  epices: 'Épices, herbes sèches et condiments',
  'epicerie-sucree': 'Épicerie sucrée',
  boissons: 'Boissons',
  'non-alimentaire': 'Non alimentaire (boîtes, papier cuisson…)',
  surgeles: 'Surgelés',
}

/** Dans l'ordre d'un parcours en magasin. */
export const AISLES = Object.keys(AISLE_LABEL)

/** Le repli de `useAisles`. */
export const AISLE_ITEMS: { code: string; label: string }[] = AISLES.map((code) => ({
  code,
  label: AISLE_LABEL[code],
}))

/**
 * Le libellé d'un rayon, ou la valeur telle quelle si elle nous est inconnue.
 * Avec la liste de l'API (`useAisles`), c'est elle qui fait foi.
 */
export const aisleLabel = (
  code?: string | null,
  list: { code: string; label: string }[] = AISLE_ITEMS,
) => (code ? (list.find((a) => a.code === code)?.label ?? AISLE_LABEL[code] ?? code) : null)

export const REHEAT_MODES: { code: string; label: string }[] = [
  { code: 'oven', label: 'Four' },
  { code: 'pan', label: 'Poêle' },
  { code: 'saucepan', label: 'Casserole' },
  { code: 'microwave', label: 'Micro-ondes' },
  { code: 'steam', label: 'Vapeur' },
  { code: 'bain-marie', label: 'Bain-marie' },
  { code: 'none', label: 'Tel quel, sans réchauffer' },
]

export const STORAGE_METHODS: { code: string; label: string }[] = [
  { code: 'fridge', label: 'Réfrigérateur' },
  { code: 'freezer', label: 'Congélateur' },
  { code: 'ambient', label: 'Température ambiante' },
]

/**
 * Le libellé d'un code, ou la valeur telle quelle.
 *
 * Les premières recettes ont pu stocker « Four » plutôt que `oven` : on affiche
 * ce qui est écrit au lieu d'afficher un vide.
 */
const labelOf = (liste: { code: string; label: string }[], valeur?: string | null) =>
  valeur ? (liste.find((x) => x.code === valeur)?.label ?? valeur) : null

export const reheatModeLabel = (mode?: string | null) => labelOf(REHEAT_MODES, mode)
export const storageMethodLabel = (m?: string | null) => labelOf(STORAGE_METHODS, m)

/** Les modes d'une fiche : la liste, ou le mode unique d'avant (§4.6). */
export const reheatModesOf = (r?: Recipe['reheating']): string[] =>
  r?.modes?.length ? r.modes : r?.mode ? [r.mode] : []

/** « Four ou Micro-ondes · 160 °C · 15 min », ou `null` s'il n'y a rien à dire. */
export function reheatingLine(
  r?: Recipe['reheating'],
  modes: { code: string; label: string }[] = REHEAT_MODES,
): string | null {
  const codes = reheatModesOf(r)
  if (codes.length === 0) return null
  return [
    codes.map((c) => labelOf(modes, c)).join(' ou '),
    r?.temperature != null ? `${r.temperature} °C` : null,
    r?.minutes != null ? `${r.minutes} min` : null,
    r?.container ? `dans ${r.container}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** « Réfrigérateur · 3 jours · Boîte hermétique ». */
export function storageLine(s?: Recipe['storage']): string | null {
  if (!s?.method) return null
  return [
    storageMethodLabel(s.method),
    s.days != null ? `${s.days} jour${s.days > 1 ? 's' : ''}` : null,
    s.container || null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/* ── Les allergènes (§4.9) ─────────────────────────────────────────────────── */

/**
 * Les quatorze allergènes réglementaires, dans l'ordre de l'annexe : la liste
 * de `GET /referentials/allergens`, qui sert de repli à `useAllergens`.
 *
 * C'est aussi le filtre de ce qu'un plat envoie comme « ajoutés » : l'API
 * refuse (400) tout autre code. Il est ici en dur, et non lu de l'API, parce
 * que le brouillon se bâtit avant que le référentiel arrive : un filtre vide
 * à ce moment-là retirerait un allergène au premier enregistrement.
 */
export const REGULATED_ALLERGENS: { code: string; label: string }[] = [
  { code: 'gluten', label: 'Céréales contenant du gluten' },
  { code: 'crustaceans', label: 'Crustacés' },
  { code: 'eggs', label: 'Œufs' },
  { code: 'fish', label: 'Poissons' },
  { code: 'peanuts', label: 'Arachides' },
  { code: 'soy', label: 'Soja' },
  { code: 'milk', label: 'Lait' },
  { code: 'nuts', label: 'Fruits à coque' },
  { code: 'celery', label: 'Céleri' },
  { code: 'mustard', label: 'Moutarde' },
  { code: 'sesame', label: 'Graines de sésame' },
  { code: 'sulphites', label: 'Anhydride sulfureux et sulfites' },
  { code: 'lupin', label: 'Lupin' },
  { code: 'molluscs', label: 'Mollusques' },
]

/** Un des quatorze. Un autre code est ancien : l'API le garde, seul Lab's Food le corrige. */
export const isRegulatedAllergen = (code: string) =>
  REGULATED_ALLERGENS.some((a) => a.code === code)

/* ── Les gardes avant envoi ────────────────────────────────────────────────── */

let lastKey = 0

/**
 * Une clé de ligne, propre à cet écran et jamais envoyée. React s'en sert pour
 * garder chaque champ, et le dialogue ouvert, attaché à sa ligne : avec le rang
 * pour clé, une ligne retirée ou ajoutée ferait glisser la suivante sous le
 * curseur, et la frappe irait sur la mauvaise ligne.
 */
export const rowKey = () => `row-${++lastKey}`

/**
 * Une ligne en cours de saisie.
 *
 * `qty` est une chaîne et non un nombre : un champ qu'on vide doit rester
 * vide, pas retomber sur zéro. La conversion se fait à l'envoi, une seule
 * fois, ici.
 */
export interface IngredientRow {
  /** La clé de la ligne à l'écran (`rowKey`). Jamais envoyée. */
  key: string
  name: string
  qty: string
  /** Un code d'unité ; vide tant qu'on n'a pas choisi (et sur une ligne à vérifier). */
  unit: string
  aisle: string
  link: string
  toVerify: boolean
  fixedQuantity: boolean
  catalogIngredientId: string | null
  /** « Si utilisé » : ses allergènes ne comptent que sous condition. */
  optional: boolean
  /** Précision d'achat : « bio », « fermier ». */
  precision: string
  /** Façon de préparer : « émincé », « en dés ». */
  preparation: string
  /** Un regroupement dans la fiche : « Pour la sauce ». */
  group: string
  /** Masquée au client (l'huile, le sel) : la ligne reste dans la liste de courses. */
  hiddenFromClient: boolean
  /** Le texte d'origine d'une ligne à vérifier, tel que le batch cooker l'avait écrit. */
  rawText: string
  /**
   * Les allergènes de l'ingrédient relié, tels que l'API les a écrits au dernier
   * enregistrement. Jamais envoyés ; null tant qu'on ne les connaît pas (ligne
   * nouvelle, ou reliée autrement depuis).
   */
  allergens: string[] | null
  /** L'ingrédient relié est incomplet dans la liste commune (écrit par l'API, jamais envoyé). */
  incomplete: boolean | null
}

/**
 * La ligne telle qu'elle existe déjà sur un plat, prête à être éditée.
 *
 * Elle est lue comme l'API lit ses lignes (`toLineInput`, R33) : une ligne que
 * ce formulaire ne saurait pas envoyer telle quelle passe « à vérifier », au
 * lieu d'être écartée de l'envoi. Écartée, le premier enregistrement de
 * n'importe quel champ l'effacerait de la fiche, sans que le chef y ait touché.
 * - Une unité inconnue (ancienne comme « pièce », ou vide) : l'unité se vide.
 * - Une quantité illisible, nulle, hors bornes ou à plus de 3 décimales : elle se vide.
 * - Une quantité absente (hors « selon le goût ») : la ligne est à vérifier.
 *
 * Ce qui se perd ainsi reste dans le texte d'origine (« 2 pièce Œuf »), s'il n'y
 * en avait pas déjà un. La fiche enregistrée se lit de la même façon (`saved`) :
 * ouvrir un plat ne le rend pas modifié.
 */
export function toRow(i: Ingredient): IngredientRow {
  const name = i.name ?? ''
  // Une ligne d'avant le lot 2 portait `amount` : l'API le lit aussi.
  const stored = i.qty ?? (i as { amount?: unknown }).amount
  const qtyText = stored == null ? '' : String(stored).trim()
  const unitText = typeof i.unit === 'string' ? i.unit.trim() : ''
  let toVerify = i.toVerify === true
  let unit = unitText
  let qty = qtyText
  let rawText = i.rawText ?? ''
  const keepOrigin = () => {
    if (rawText.trim()) return
    rawText = [qtyText, unitText, name.trim()]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .slice(0, INGREDIENT_MAX.rawText)
  }

  // Une ligne à vérifier sans unité est déjà ce qu'elle doit être.
  if (!unitAccepted(unitText) && !(toVerify && !unitText)) {
    toVerify = true
    unit = ''
    keepOrigin()
  }
  if (unit === TO_TASTE) {
    // « Selon le goût » n'a pas de quantité (les anciennes lignes portaient un zéro).
    qty = ''
  } else if (qty !== '' && !qtyValid(qty)) {
    toVerify = true
    qty = ''
    keepOrigin()
  } else if (qty === '') {
    toVerify = true
  }

  return {
    key: rowKey(),
    name,
    qty,
    unit,
    aisle: i.aisle ?? '',
    link: i.link ?? '',
    toVerify,
    fixedQuantity: i.fixedQuantity ?? false,
    catalogIngredientId: i.catalogIngredientId ?? null,
    optional: i.optional ?? false,
    precision: i.precision ?? '',
    preparation: i.preparation ?? '',
    group: i.group ?? '',
    hiddenFromClient: i.hiddenFromClient ?? false,
    rawText,
    allergens: Array.isArray(i.allergens) ? i.allergens : null,
    incomplete: typeof i.incomplete === 'boolean' ? i.incomplete : null,
  }
}

export const EMPTY_INGREDIENT: Omit<IngredientRow, 'aisle' | 'key'> = {
  name: '',
  qty: '',
  unit: 'g',
  link: '',
  toVerify: false,
  fixedQuantity: false,
  catalogIngredientId: null,
  optional: false,
  precision: '',
  preparation: '',
  group: '',
  hiddenFromClient: false,
  rawText: '',
  allergens: null,
  incomplete: null,
}

/** Une ligne vierge, avec sa propre clé. */
export const newIngredientRow = (): IngredientRow => ({ ...EMPTY_INGREDIENT, aisle: '', key: rowKey() })

/** Un nom de domaine complet (`exemple.fr`), ou une adresse IPv4. */
const fullHost = (host: string) =>
  /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
  (/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+([a-z]{2,}|xn--[a-z0-9-]+)$/i.test(host) &&
    host.split('.').every((label) => label.length <= 63))

/**
 * Une adresse que l'API acceptera, comme son `@IsUrl({ require_protocol: true })` :
 * `http` ou `https`, et un vrai nom de domaine, avec son point. « https://monsite »
 * ou « http://localhost:3000 » sont refusés par l'API (400 sur tout le plat).
 */
export function linkValid(link: string): boolean {
  const v = link.trim()
  if (!v) return true
  if (v.length > INGREDIENT_MAX.link || /\s/.test(v) || !/^https?:\/\//i.test(v)) return false
  try {
    // `URL` met le nom en minuscules et en punycode (« café.fr » → « xn--caf-dma.fr »).
    return fullHost(new URL(v).hostname)
  } catch {
    return false
  }
}

/** Le message d'un lien refusé, sous le champ. */
export const LINK_INVALID_TEXT =
  'Le lien doit être une adresse complète, qui commence par http:// ou https:// (par exemple https://exemple.fr/produit).'

/** Un nombre entier de `min` à `max`, tel que saisi. */
export function intIn(value: string, min: number, max: number): boolean {
  const v = value.trim()
  const n = Number(v)
  return v !== '' && Number.isInteger(n) && n >= min && n <= max
}

/** Les bornes des champs d'un plat, celles de l'API (`dish.dto.ts`, `RECIPE_LIMITS`). */
export const DISH_LIMITS = {
  name: 255,
  description: 2000,
  portions: { min: 1, max: 100 },
  /** Préparation, cuisson, durée d'une étape. */
  minutes: 1440,
  reheatTemperature: 300,
  reheatMinutes: 600,
  reheatNote: 300,
  container: 120,
  storageDays: 365,
  stepText: 2000,
  ingredients: 60,
  steps: 40,
  profiles: 10,
} as const

/** Les listes libres d'un plat : combien d'éléments, et combien de caractères chacun. */
export const FREE_LIST_LIMITS = {
  customDiets: { items: 10, length: 40 },
  customAllergens: { items: 10, length: 40 },
  equipment: { items: 20, length: 60 },
  personalTags: { items: 10, length: 30 },
} as const

/** La quantité de l'API : jusqu'à 100 000, au-dessus de zéro. */
export const QTY_MAX = 100_000

/** Les décimales que l'API garde sur une quantité. */
export const QTY_DECIMALS = 3

/** Les longueurs maximales d'une ligne, celles de l'API. */
export const INGREDIENT_MAX = {
  name: 120,
  precision: 60,
  preparation: 120,
  group: 60,
  link: 512,
  rawText: 200,
} as const

/** Une quantité saisie qui est un vrai nombre, dans les bornes de l'API (3 décimales au plus). */
export function qtyValid(qty: string): boolean {
  if (!qty.trim()) return false
  const n = Number(qty.replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0 || n > QTY_MAX) return false
  const scaled = n * 10 ** QTY_DECIMALS
  return Math.abs(scaled - Math.round(scaled)) < 1e-6
}

/**
 * Ce que l'API exige d'une ligne : un nom ; pour « selon le goût », rien de
 * plus ; sinon une quantité et une unité. Une ligne « à vérifier » peut les
 * laisser vides : c'est ce que le batch cooker verra à compléter.
 */
export function ingredientReady(i: IngredientRow): boolean {
  if (!i.name.trim()) return false
  if (i.toVerify) return i.qty.trim() === '' || qtyValid(i.qty)
  if (i.unit === TO_TASTE) return true
  return qtyValid(i.qty) && unitAccepted(i.unit)
}

/**
 * Une ligne complète, qu'on peut dire vérifiée : un nom (reliée ou non), une
 * quantité valide ou « selon le goût », et une unité. Retirer « à vérifier » à
 * une ligne incomplète la sortirait de l'envoi : la fiche la perdrait.
 */
export const lineComplete = (i: IngredientRow): boolean => ingredientReady({ ...i, toVerify: false })

/**
 * Vrai dès qu'une ligne a été commencée : une ligne vierge n'est pas un oubli.
 * L'unité par défaut d'une ligne ajoutée (`g`) ne compte pas : sans quoi une
 * ligne laissée vierge bloquerait la confirmation des allergènes et le vidage
 * d'une recette (R24).
 */
export const ingredientStarted = (i: IngredientRow): boolean =>
  Boolean(
    i.name.trim() || i.qty.trim() || (i.unit && i.unit !== EMPTY_INGREDIENT.unit) || i.aisle,
  )

const orNull = (v: string) => (v.trim() ? v.trim() : null)

/**
 * Les rangs (dans la liste affichée) des lignes que l'API recevra : celles qui
 * sont prêtes. C'est la seule définition de « la ligne n'est pas envoyée » :
 * `cleanIngredients` et la lecture des rapports de l'API (doublons, lignes non
 * reliées, points de « Prête ») s'appuient tous sur elle, pour ne jamais diverger.
 */
export const sentIndexes = (list: IngredientRow[]): number[] =>
  list.flatMap((row, i) => (ingredientReady(row) ? [i] : []))

/** Les rangs affichés des étapes que `cleanSteps` envoie : le rang de l'API est l'indice dans cette liste. */
export const sentStepIndexes = (list: StepRow[]): number[] =>
  list.flatMap((s, i) => (s.text.trim() ? [i] : []))

/**
 * Ramène des rangs de l'API (ceux des lignes envoyées) aux lignes affichées.
 * Un rang inconnu est écarté plutôt que de surligner la mauvaise ligne.
 */
export function shownRows(list: IngredientRow[], sent: number[]): number[] {
  const shown = sentIndexes(list)
  return sent.flatMap((k) => (shown[k] === undefined ? [] : [shown[k]]))
}

/** Les groupes de lignes (doublons) de l'API, en rangs affichés. */
export const shownGroups = (list: IngredientRow[], groups: number[][]): number[][] =>
  groups.map((g) => shownRows(list, g))

/**
 * Les lignes prêtes, au format d'écriture de l'API. Les nombres et les
 * booléens sont de vrais types JSON : l'API refuse `"3"` comme `"false"`.
 * `qty` vaut `null` pour « selon le goût », et sur une ligne à vérifier sans
 * quantité.
 */
export function cleanIngredients(list: IngredientRow[]): Ingredient[] {
  return sentIndexes(list).map((k) => cleanLine(list[k]))
}

/**
 * Arrondie aux 3 décimales que l'API garde : `qtyValid` tolère un reste
 * infime (1,0000000001), que `maxDecimalPlaces: 3` refuserait.
 */
const roundQty = (n: number) => Math.round(n * 10 ** QTY_DECIMALS) / 10 ** QTY_DECIMALS

/** Une ligne prête, au format d'écriture de l'API : la clé et ce que l'API écrit n'en sont pas. */
function cleanLine(i: IngredientRow): Ingredient {
  const toTaste = i.unit === TO_TASTE
  return {
    name: i.name.trim(),
    qty: toTaste || !i.qty.trim() ? null : roundQty(Number(i.qty.replace(',', '.'))),
    unit: i.unit.trim() || null,
    ...(i.aisle.trim() ? { aisle: i.aisle.trim() } : {}),
    link: linkValid(i.link) ? orNull(i.link) : null,
    toVerify: i.toVerify,
    fixedQuantity: i.fixedQuantity,
    optional: i.optional,
    hiddenFromClient: i.hiddenFromClient,
    catalogIngredientId: i.catalogIngredientId,
    precision: orNull(i.precision),
    preparation: orNull(i.preparation),
    group: orNull(i.group),
    rawText: orNull(i.rawText),
  }
}

/* ── Après un enregistrement : ce que l'API a normalisé (R23) ──────────────── */

/** Deux valeurs identiques une fois écrites en JSON (absent et `null` restent distincts). */
export const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/**
 * Les champs que l'API réécrit ensemble quand elle relie une ligne : le nom et
 * le rayon de l'ingrédient, l'identifiant après une fusion, et la mise « à
 * vérifier » d'une ligne dont l'ingrédient a disparu.
 */
const LINK_FIELDS = ['name', 'catalogIngredientId', 'aisle', 'toVerify', 'rawText'] as const

/** Les autres champs envoyés : l'API les garde, à la normalisation près (espaces, nombres). */
const LINE_FIELDS = [
  'qty',
  'unit',
  'link',
  'fixedQuantity',
  'optional',
  'hiddenFromClient',
  'precision',
  'preparation',
  'group',
] as const

/**
 * Reporte sur les lignes à l'écran ce que l'API a normalisé dans celles qu'on
 * lui a envoyées, sans jamais remplacer la liste.
 *
 * `sent` est la liste au moment de l'envoi ; `saved`, les lignes de la réponse,
 * dans l'ordre des lignes envoyées (`sentIndexes(sent)`). Chaque ligne envoyée
 * est retrouvée par sa clé, où qu'elle soit maintenant, et ne prend que :
 * - les champs dont la valeur envoyée diffère de celle que l'API a gardée ;
 * - et que le chef n'a pas retouchés depuis l'envoi ;
 * - pour l'estampille (nom, rayon, identifiant, allergènes), seulement si la
 *   ligne est toujours reliée comme à l'envoi.
 *
 * Une ligne qui n'est pas partie (incomplète, en cours de saisie) ou ajoutée
 * depuis ne bouge pas, et aucune ligne n'est ajoutée ni retirée. Une chaîne
 * que l'API rend telle qu'envoyée garde sa saisie (un espace en fin de mot).
 */
export function mergeSavedRows(
  current: IngredientRow[],
  sent: IngredientRow[],
  saved: Ingredient[],
): IngredientRow[] {
  const sentAt = sentIndexes(sent)
  // Le compte ne correspond pas : rien ne permet d'apparier les lignes, on n'y touche pas.
  if (saved.length !== sentAt.length) return current

  const patches = new Map<string, Partial<IngredientRow>>()
  sentAt.forEach((s, k) => {
    const before = sent[s]
    const now = current.find((r) => r.key === before.key)
    if (!now) return // retirée depuis
    const back = toRow(saved[k])
    const sentLine = cleanLine(before)
    const savedLine = cleanLine(back)
    const patch: Record<string, unknown> = {}
    const take = (f: (typeof LINK_FIELDS)[number] | (typeof LINE_FIELDS)[number]) => {
      if (!sameJson(sentLine[f], savedLine[f]) && now[f] === before[f]) patch[f] = back[f]
    }
    // Retapée ou reliée à autre chose depuis : l'estampille parlait de l'ancien ingrédient.
    const sameLink =
      now.name === before.name && now.catalogIngredientId === before.catalogIngredientId
    if (sameLink) {
      LINK_FIELDS.forEach(take)
      if (!sameJson(now.allergens, back.allergens)) patch.allergens = back.allergens
      if (now.incomplete !== back.incomplete) patch.incomplete = back.incomplete
    }
    LINE_FIELDS.forEach(take)
    if (Object.keys(patch).length > 0) patches.set(before.key, patch as Partial<IngredientRow>)
  })
  if (patches.size === 0) return current
  return current.map((r) => {
    const patch = patches.get(r.key)
    return patch ? { ...r, ...patch } : r
  })
}

/* ── Saisons (§4.8) ────────────────────────────────────────────────────────── */

export const MONTHS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
]

/** « Toute l'année », « juin à sept. », ou les mois un à un quand ils se suivent mal. */
export function seasonsLine(months: number[] | null): string | null {
  if (!months) return null
  if (months.length === 0) return 'Hors saison'
  if (months.length === 12) return 'Toute l’année'
  const sorted = [...months].sort((a, b) => a - b)
  const suivis = sorted.every((m, i) => i === 0 || m === sorted[i - 1] + 1)
  return suivis && sorted.length > 2
    ? `${MONTHS[sorted[0] - 1]} à ${MONTHS[sorted[sorted.length - 1] - 1]}`
    : sorted.map((m) => MONTHS[m - 1]).join(', ')
}

/** Une étape en cours de saisie : la durée reste une chaîne, comme une quantité. */
export interface StepRow {
  /** La clé de l'étape à l'écran (`rowKey`). Jamais envoyée. */
  key: string
  text: string
  type: string
  minutes: string
}

export const toStepRow = (s: Step | string): StepRow =>
  typeof s === 'string'
    ? { key: rowKey(), text: s, type: '', minutes: '' }
    : {
        key: rowKey(),
        text: s.text,
        type: s.type ?? '',
        minutes: s.durationMinutes?.toString() ?? '',
      }

/** Une étape vierge, avec sa propre clé. */
export const newStepRow = (): StepRow => ({ key: rowKey(), text: '', type: '', minutes: '' })

/** Une étape écrite, au format d'écriture de l'API. */
const cleanStep = (s: StepRow): Step => ({
  text: s.text.trim(),
  type: s.type || null,
  durationMinutes: s.minutes.trim() ? Number(s.minutes) : null,
})

/** Les étapes écrites, dans l'ordre ; l'API les numérote. */
export const cleanSteps = (list: StepRow[]): Step[] =>
  list.filter((s) => s.text.trim()).map(cleanStep)

/** Le champ d'une étape à l'écran, et son nom dans ce qui s'envoie. */
const STEP_FIELDS = [
  ['text', 'text'],
  ['type', 'type'],
  ['minutes', 'durationMinutes'],
] as const

/**
 * Comme `mergeSavedRows`, pour les étapes : chaque étape envoyée, retrouvée par
 * sa clé, ne prend que ce que l'API a changé et que le chef n'a pas retouché
 * depuis. Une étape vide ou en cours de saisie garde sa frappe, espace final
 * compris (l'API rend le texte tel qu'envoyé, sans ses blancs).
 */
export function mergeSavedSteps(current: StepRow[], sent: StepRow[], saved: Step[]): StepRow[] {
  const sentAt = sentStepIndexes(sent)
  if (saved.length !== sentAt.length) return current

  const patches = new Map<string, Partial<StepRow>>()
  sentAt.forEach((s, k) => {
    const before = sent[s]
    const now = current.find((r) => r.key === before.key)
    if (!now) return
    const back = toStepRow(saved[k])
    const sentStep = cleanStep(before)
    const savedStep = cleanStep(back)
    const patch: Partial<StepRow> = {}
    for (const [row, wire] of STEP_FIELDS) {
      if (!sameJson(sentStep[wire], savedStep[wire]) && now[row] === before[row]) patch[row] = back[row]
    }
    if (Object.keys(patch).length > 0) patches.set(before.key, patch)
  })
  if (patches.size === 0) return current
  return current.map((r) => {
    const patch = patches.get(r.key)
    return patch ? { ...r, ...patch } : r
  })
}

/** Le réchauffage s'enregistre dès qu'un mode est coché : le reste est facultatif. */
export function cleanReheating(r: {
  modes: string[]
  temperature: string
  minutes: string
  note: string
  container: string
}): NonNullable<Recipe['reheating']> | null {
  if (r.modes.length === 0) return null
  return {
    modes: r.modes,
    ...(r.minutes.trim() ? { minutes: Number(r.minutes) } : {}),
    ...(r.temperature.trim() ? { temperature: Number(r.temperature) } : {}),
    ...(r.note.trim() ? { note: r.note.trim() } : {}),
    ...(r.container.trim() ? { container: r.container.trim() } : {}),
  }
}

/* ── Adapter les quantités (§4.12) ─────────────────────────────────────────── */

/**
 * Une quantité pour `to` portions, d'une recette écrite pour `from`. Les
 * quantités fixes ne bougent pas ; rien n'est arrondi avant l'affichage.
 * `null` : une ligne sans quantité (« selon le goût », ou à vérifier).
 */
export function scaledQty(i: Ingredient, from: number, to: number): number | null {
  if (i.qty == null) return null
  return i.fixedQuantity ? i.qty : (i.qty * to) / (from || 1)
}

/** Les unités qui se comptent entières : toujours l'unité au-dessus. */
const WHOLE = new Set(['piece', 'clove', 'bunch', 'slice', 'leaf', 'pinch'])

/** EPSILON pour que 1,005 donne 1,01 et non 1. */
const roundTo = (qty: number, step: number) => Math.round((qty + Number.EPSILON) / step) * step

const decimals = (qty: number, places: number) => {
  const factor = 10 ** places
  return Math.round((qty + Number.EPSILON) * factor) / factor
}

/**
 * L'arrondi d'affichage, seul endroit où l'on arrondit : la table de l'API
 * (`roundForDisplay`, dans `dishes/domain/units.rules.ts`), à l'identique.
 *
 * Les valeurs de son test, à garder vraies (le front n'a pas de lanceur de tests) :
 *   piece 2.1 -> 3        clove 0.4 -> 1
 *   g 7.46 -> 7.5         g 46.4 -> 46        g 132.4 -> 130      g 133 -> 135
 *   ml 99.5 -> 100        kg 1.255 -> 1.26
 *   tsp 0.2 -> 0.5        tsp 1.3 -> 1.5      tbsp 1.2 -> 1
 *   gousse (unité inconnue) 1.234 -> 1.23
 * et pour `displayQuantity` :
 *   (1.5, 'kg') -> '1,5 kg'             (2, 'clove') -> '2 gousses'
 *   (1, 'clove') -> '1 gousse'          (null, 'to_taste') -> 'selon le goût'
 *   (1.234, 'gousse') -> '1,23 gousse'  (0.5, 'tbsp') -> '0,5 c. à soupe'
 */
export function roundForDisplay(qty: number, unitCode: string): number {
  if (WHOLE.has(unitCode)) return Math.ceil(qty - 1e-9)
  switch (unitCode) {
    case 'g':
    case 'ml':
      if (qty < 10) return decimals(qty, 1)
      if (qty <= 100) return Math.round(qty)
      return roundTo(qty, 5)
    case 'kg':
    case 'l':
    case 'cl':
      return decimals(qty, 2)
    case 'tsp':
    case 'tbsp':
      return Math.max(0.5, roundTo(qty, 0.5))
    case 'to_taste':
      return 0
    default:
      return decimals(qty, 2)
  }
}

/**
 * Le nombre affiché, à la française (virgule), ou `''` quand il n'y en a pas :
 * « selon le goût » ne porte aucun nombre. L'unité s'affiche à part, avec
 * `unitLabel`.
 */
export function displayQty(qty: number | null, unit: string | null): string {
  if (qty === null || unit === TO_TASTE) return ''
  return String(roundForDisplay(qty, unit ?? '')).replace('.', ',')
}

/** Le libellé d'une unité, au pluriel dès 2 une fois arrondi ; le code s'il est inconnu. */
export function unitLabel(code: string | null, qty: number | null, list: UnitItem[] = UNITS): string {
  if (!code) return ''
  const known = list.find((u) => u.code === code)
  if (!known) return code
  return qty !== null && roundForDisplay(qty, code) >= 2 ? known.plural : known.label
}

/** « 1,5 kg », « 2 gousses », « selon le goût » : la quantité entière, comme l'API l'écrit. */
export function displayQuantity(
  qty: number | null,
  unit: string | null,
  list: UnitItem[] = UNITS,
): string {
  if (unit === TO_TASTE) return list.find((u) => u.code === TO_TASTE)?.label ?? 'selon le goût'
  if (qty === null) return list.find((u) => u.code === unit)?.label ?? unit ?? ''
  const label = unitLabel(unit, qty, list)
  const number = displayQty(qty, unit)
  return label ? `${number} ${label}` : number
}

/** Les bornes de l'API pour la congélation. */
export const FREEZER_MONTHS = { min: 1, max: 24 } as const
export const THAWING_MAX = 300

/** Des mois de congélation saisis : un entier de 1 à 24. */
export const freezerMonthsValid = (v: string) => {
  const n = Number(v)
  return v.trim() !== '' && Number.isInteger(n) && n >= FREEZER_MONTHS.min && n <= FREEZER_MONTHS.max
}

export interface StorageDraft {
  method: string
  days: string
  container: string
  /** `yes`, `no`, ou vide : jamais choisi (une fiche ancienne). */
  freezable: '' | 'yes' | 'no'
  freezerMonths: string
  thawing: string
}

/**
 * La conservation à envoyer. Il faut un lieu et un nombre de jours (l'API
 * refuse un couple incomplet). « Congelable » part en vrai booléen ; mois et
 * décongélation ne partent que si c'est « oui » et qu'ils sont valides : une
 * valeur hors bornes serait un 400 sur tout le plat.
 */
export function cleanStorage(s: StorageDraft): NonNullable<Recipe['storage']> | null {
  if (!s.method || !s.days.trim()) return null
  const yes = s.freezable === 'yes'
  return {
    method: s.method,
    days: Number(s.days),
    ...(s.container.trim() ? { container: s.container.trim() } : {}),
    ...(s.freezable ? { freezable: yes } : {}),
    ...(yes && freezerMonthsValid(s.freezerMonths) ? { freezerMonths: Number(s.freezerMonths) } : {}),
    ...(yes && s.thawing.trim() && s.thawing.trim().length <= THAWING_MAX
      ? { thawing: s.thawing.trim() }
      : {}),
  }
}
