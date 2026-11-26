import type { Dish } from '@/lib/api/chef-catalog'

/* ─────────────────────────────────────────────────────────────────────────────
   Retrouver un plat dans « Mes plats » (retour de recette du 26/11).

   La recherche ignore les accents, la casse et les espaces en trop : on tape
   « vegetarien » et on trouve « Couscous végétarien ». Elle cherche dans le
   nom, la description et le pays. Le texte tapé est cherché tel quel, jamais
   compilé en expression régulière : « ( » ou « * » ne cassent rien.

   Aucun import à l'exécution : le module se vérifie seul, hors de Next.
   ───────────────────────────────────────────────────────────────────────────── */

export type FiltreStatut = 'tous' | 'brouillons' | 'publies' | 'a-completer'

export const FILTRES: readonly { id: FiltreStatut; label: string }[] = [
  { id: 'tous', label: 'Tous' },
  { id: 'brouillons', label: 'Brouillons' },
  { id: 'publies', label: 'Publiés' },
  { id: 'a-completer', label: 'À compléter' },
]

/**
 * « Couscous VÉGÉTARIEN » → « couscous vegetarien ». Les ligatures et
 * l'apostrophe typographique se tapent autrement au clavier : « boeuf » trouve
 * « Bœuf bourguignon », « pain d'epices » trouve « Pain d’épices ».
 */
export function plie(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[’‘ʼ]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Il manque quelque chose pour publier le plat, ou pour qu'il reste réservable
 * (un plat publié dont les allergènes sont à reconfirmer). Même règle que
 * `publishBlockers(d).length > 0`. Un plat archivé n'est plus à compléter.
 */
export function aCompleter(dish: Pick<Dish, 'status' | 'readiness'>): boolean {
  if (dish.status === 'archived' || !dish.readiness) return false
  return dish.readiness.problems.length + dish.readiness.toPublish.length > 0
}

function dansFiltre(dish: Dish, statut: FiltreStatut): boolean {
  switch (statut) {
    case 'brouillons':
      return dish.status === 'draft'
    case 'publies':
      return dish.status === 'published'
    case 'a-completer':
      return aCompleter(dish)
    case 'tous':
      return true
  }
}

export function filtrerPlats(
  dishes: readonly Dish[],
  recherche: string,
  statut: FiltreStatut,
  pays: (code: string | null) => string,
): Dish[] {
  const q = plie(recherche)
  return dishes.filter(
    (d) =>
      dansFiltre(d, statut) &&
      (!q ||
        plie(d.name).includes(q) ||
        plie(d.description ?? '').includes(q) ||
        plie(pays(d.country)).includes(q)),
  )
}

/** Le nombre de plats derrière chaque filtre, pour les onglets. */
export function compterParFiltre(dishes: readonly Dish[]): Record<FiltreStatut, number> {
  const compte: Record<FiltreStatut, number> = {
    tous: 0,
    brouillons: 0,
    publies: 0,
    'a-completer': 0,
  }
  for (const d of dishes) {
    for (const { id } of FILTRES) if (dansFiltre(d, id)) compte[id]++
  }
  return compte
}
