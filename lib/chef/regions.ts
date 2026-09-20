/**
 * Zones d'intervention du batch cooker — France métropolitaine uniquement.
 *
 * Les régions portent leur code INSEE officiel (celui qu'attend l'API) et une
 * liste de villes de référence : préfectures et principales agglomérations.
 * Toute autre commune se trouve par la recherche (geo.api.gouv.fr), filtrée
 * sur ces mêmes codes de région.
 *
 * Provisoire : à remplacer par `GET /referentials/regions` une fois l'endpoint
 * exposé (le référentiel doit être éditable sans redéploiement, cf. S-01/AD-07).
 */

export interface City {
  name: string
  /** Code département (ex. « 69 », « 2A »). */
  dept: string
  /** Code INSEE de la commune, connu quand la ville vient de la recherche. */
  insee?: string
}

export interface Region {
  /** Code INSEE de la région. */
  code: string
  label: string
  cities: City[]
}

const c = (name: string, dept: string): City => ({ name, dept })

export const REGIONS: Region[] = [
  {
    code: '84',
    label: 'Auvergne-Rhône-Alpes',
    cities: [
      c('Lyon', '69'), c('Villeurbanne', '69'), c('Grenoble', '38'), c('Saint-Étienne', '42'),
      c('Clermont-Ferrand', '63'), c('Annecy', '74'), c('Chambéry', '73'), c('Valence', '26'),
      c('Bourg-en-Bresse', '01'), c('Moulins', '03'), c('Privas', '07'), c('Aurillac', '15'),
      c('Le Puy-en-Velay', '43'),
    ],
  },
  {
    code: '27',
    label: 'Bourgogne-Franche-Comté',
    cities: [
      c('Dijon', '21'), c('Besançon', '25'), c('Belfort', '90'), c('Montbéliard', '25'),
      c('Chalon-sur-Saône', '71'), c('Mâcon', '71'), c('Auxerre', '89'), c('Nevers', '58'),
      c('Vesoul', '70'), c('Lons-le-Saunier', '39'),
    ],
  },
  {
    code: '53',
    label: 'Bretagne',
    cities: [
      c('Rennes', '35'), c('Brest', '29'), c('Quimper', '29'), c('Lorient', '56'),
      c('Vannes', '56'), c('Saint-Malo', '35'), c('Saint-Brieuc', '22'),
    ],
  },
  {
    code: '24',
    label: 'Centre-Val de Loire',
    cities: [
      c('Tours', '37'), c('Orléans', '45'), c('Bourges', '18'), c('Blois', '41'),
      c('Chartres', '28'), c('Châteauroux', '36'),
    ],
  },
  {
    code: '94',
    label: 'Corse',
    cities: [
      c('Ajaccio', '2A'), c('Bastia', '2B'), c('Porto-Vecchio', '2A'), c('Calvi', '2B'),
      c('Corte', '2B'),
    ],
  },
  {
    code: '44',
    label: 'Grand Est',
    cities: [
      c('Strasbourg', '67'), c('Reims', '51'), c('Metz', '57'), c('Nancy', '54'),
      c('Mulhouse', '68'), c('Colmar', '68'), c('Troyes', '10'), c('Charleville-Mézières', '08'),
      c('Châlons-en-Champagne', '51'), c('Épinal', '88'), c('Chaumont', '52'), c('Bar-le-Duc', '55'),
    ],
  },
  {
    code: '32',
    label: 'Hauts-de-France',
    cities: [
      c('Lille', '59'), c('Amiens', '80'), c('Roubaix', '59'), c('Tourcoing', '59'),
      c('Dunkerque', '59'), c('Valenciennes', '59'), c('Calais', '62'), c('Boulogne-sur-Mer', '62'),
      c('Arras', '62'), c('Beauvais', '60'), c('Saint-Quentin', '02'), c('Laon', '02'),
    ],
  },
  {
    code: '11',
    label: 'Île-de-France',
    cities: [
      c('Paris', '75'), c('Boulogne-Billancourt', '92'), c('Nanterre', '92'), c('Neuilly-sur-Seine', '92'),
      c('Saint-Denis', '93'), c('Montreuil', '93'), c('Bobigny', '93'), c('Créteil', '94'),
      c('Vitry-sur-Seine', '94'), c('Versailles', '78'), c('Argenteuil', '95'), c('Cergy', '95'),
      c('Évry-Courcouronnes', '91'), c('Melun', '77'),
    ],
  },
  {
    code: '28',
    label: 'Normandie',
    cities: [
      c('Rouen', '76'), c('Le Havre', '76'), c('Caen', '14'), c('Cherbourg-en-Cotentin', '50'),
      c('Évreux', '27'), c('Dieppe', '76'), c('Alençon', '61'), c('Saint-Lô', '50'),
    ],
  },
  {
    code: '75',
    label: 'Nouvelle-Aquitaine',
    cities: [
      c('Bordeaux', '33'), c('Mérignac', '33'), c('Limoges', '87'), c('Poitiers', '86'),
      c('Pau', '64'), c('Bayonne', '64'), c('Biarritz', '64'), c('La Rochelle', '17'),
      c('Angoulême', '16'), c('Niort', '79'), c('Périgueux', '24'), c('Agen', '47'),
      c('Mont-de-Marsan', '40'), c('Tulle', '19'), c('Guéret', '23'),
    ],
  },
  {
    code: '76',
    label: 'Occitanie',
    cities: [
      c('Toulouse', '31'), c('Montpellier', '34'), c('Nîmes', '30'), c('Perpignan', '66'),
      c('Béziers', '34'), c('Sète', '34'), c('Narbonne', '11'), c('Carcassonne', '11'),
      c('Albi', '81'), c('Montauban', '82'), c('Tarbes', '65'), c('Rodez', '12'),
      c('Cahors', '46'), c('Auch', '32'), c('Foix', '09'), c('Mende', '48'),
    ],
  },
  {
    code: '52',
    label: 'Pays de la Loire',
    cities: [
      c('Nantes', '44'), c('Saint-Nazaire', '44'), c('Angers', '49'), c('Cholet', '49'),
      c('Le Mans', '72'), c('La Roche-sur-Yon', '85'), c("Les Sables-d'Olonne", '85'), c('Laval', '53'),
    ],
  },
  {
    code: '93',
    label: "Provence-Alpes-Côte d'Azur",
    cities: [
      c('Marseille', '13'), c('Aix-en-Provence', '13'), c('Arles', '13'), c('Nice', '06'),
      c('Cannes', '06'), c('Antibes', '06'), c('Menton', '06'), c('Toulon', '83'),
      c('Fréjus', '83'), c('Avignon', '84'), c('Gap', '05'), c('Digne-les-Bains', '04'),
    ],
  },
]

export const METRO_REGION_CODES = new Set(REGIONS.map((r) => r.code))

export const regionLabel = (code: string) =>
  REGIONS.find((r) => r.code === code)?.label ?? code

/** Clé stable d'une ville dans la sélection (nom + département). */
export const cityKey = (city: City) => `${city.dept}:${city.name}`

/** Recherche insensible à la casse et aux accents. */
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
