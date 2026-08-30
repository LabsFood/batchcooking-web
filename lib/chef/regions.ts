/**
 * Régions françaises — référentiel d'intervention du batch cooker.
 *
 * Provisoire : à remplacer par `GET /referentials/regions` une fois l'endpoint
 * exposé (le référentiel doit être éditable sans redéploiement, cf. S-01/AD-07).
 */
export interface Region {
  id: string
  label: string
  /** Regroupement utilisé pour l'affichage en colonnes. */
  group: 'Métropole' | 'Outre-mer'
}

export const REGIONS: Region[] = [
  { id: 'ara', label: 'Auvergne-Rhône-Alpes', group: 'Métropole' },
  { id: 'bfc', label: 'Bourgogne-Franche-Comté', group: 'Métropole' },
  { id: 'bre', label: 'Bretagne', group: 'Métropole' },
  { id: 'cvl', label: 'Centre-Val de Loire', group: 'Métropole' },
  { id: 'cor', label: 'Corse', group: 'Métropole' },
  { id: 'ges', label: 'Grand Est', group: 'Métropole' },
  { id: 'hdf', label: 'Hauts-de-France', group: 'Métropole' },
  { id: 'idf', label: 'Île-de-France', group: 'Métropole' },
  { id: 'nor', label: 'Normandie', group: 'Métropole' },
  { id: 'naq', label: 'Nouvelle-Aquitaine', group: 'Métropole' },
  { id: 'occ', label: 'Occitanie', group: 'Métropole' },
  { id: 'pdl', label: 'Pays de la Loire', group: 'Métropole' },
  { id: 'pac', label: "Provence-Alpes-Côte d'Azur", group: 'Métropole' },
  { id: 'gua', label: 'Guadeloupe', group: 'Outre-mer' },
  { id: 'guy', label: 'Guyane', group: 'Outre-mer' },
  { id: 'mar', label: 'Martinique', group: 'Outre-mer' },
  { id: 'may', label: 'Mayotte', group: 'Outre-mer' },
  { id: 'reu', label: 'La Réunion', group: 'Outre-mer' },
]

export const regionLabel = (id: string) =>
  REGIONS.find((r) => r.id === id)?.label ?? id
