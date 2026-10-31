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
  /**
   * Code INSEE de la commune. **Obligatoire** : l'API refuse une zone dont une
   * ville n'en porte pas. Les villes de référence le portent en dur (résolu
   * depuis geo.api.gouv.fr), celles de la recherche l'apportent avec elles.
   */
  insee: string
}

export interface Region {
  /** Code INSEE de la région. */
  code: string
  label: string
  cities: City[]
}

const c = (name: string, dept: string, insee: string): City => ({ name, dept, insee })

export const REGIONS: Region[] = [
  {
    code: '84',
    label: 'Auvergne-Rhône-Alpes',
    cities: [
      c('Lyon', '69', '69123'), c('Villeurbanne', '69', '69266'), c('Grenoble', '38', '38185'), c('Saint-Étienne', '42', '42218'),
      c('Clermont-Ferrand', '63', '63113'), c('Annecy', '74', '74010'), c('Chambéry', '73', '73065'), c('Valence', '26', '26362'),
      c('Bourg-en-Bresse', '01', '01053'), c('Moulins', '03', '03190'), c('Privas', '07', '07186'), c('Aurillac', '15', '15014'),
      c('Le Puy-en-Velay', '43', '43157'),
    ],
  },
  {
    code: '27',
    label: 'Bourgogne-Franche-Comté',
    cities: [
      c('Dijon', '21', '21231'), c('Besançon', '25', '25056'), c('Belfort', '90', '90010'), c('Montbéliard', '25', '25388'),
      c('Chalon-sur-Saône', '71', '71076'), c('Mâcon', '71', '71270'), c('Auxerre', '89', '89024'), c('Nevers', '58', '58194'),
      c('Vesoul', '70', '70550'), c('Lons-le-Saunier', '39', '39300'),
    ],
  },
  {
    code: '53',
    label: 'Bretagne',
    cities: [
      c('Rennes', '35', '35238'), c('Brest', '29', '29019'), c('Quimper', '29', '29232'), c('Lorient', '56', '56121'),
      c('Vannes', '56', '56260'), c('Saint-Malo', '35', '35288'), c('Saint-Brieuc', '22', '22278'),
    ],
  },
  {
    code: '24',
    label: 'Centre-Val de Loire',
    cities: [
      c('Tours', '37', '37261'), c('Orléans', '45', '45234'), c('Bourges', '18', '18033'), c('Blois', '41', '41018'),
      c('Chartres', '28', '28085'), c('Châteauroux', '36', '36044'),
    ],
  },
  {
    code: '94',
    label: 'Corse',
    cities: [
      c('Ajaccio', '2A', '2A004'), c('Bastia', '2B', '2B033'), c('Porto-Vecchio', '2A', '2A247'), c('Calvi', '2B', '2B050'),
      c('Corte', '2B', '2B096'),
    ],
  },
  {
    code: '44',
    label: 'Grand Est',
    cities: [
      c('Strasbourg', '67', '67482'), c('Reims', '51', '51454'), c('Metz', '57', '57463'), c('Nancy', '54', '54395'),
      c('Mulhouse', '68', '68224'), c('Colmar', '68', '68066'), c('Troyes', '10', '10387'), c('Charleville-Mézières', '08', '08105'),
      c('Châlons-en-Champagne', '51', '51108'), c('Épinal', '88', '88160'), c('Chaumont', '52', '52121'), c('Bar-le-Duc', '55', '55029'),
    ],
  },
  {
    code: '32',
    label: 'Hauts-de-France',
    cities: [
      c('Lille', '59', '59350'), c('Amiens', '80', '80021'), c('Roubaix', '59', '59512'), c('Tourcoing', '59', '59599'),
      c('Dunkerque', '59', '59183'), c('Valenciennes', '59', '59606'), c('Calais', '62', '62193'), c('Boulogne-sur-Mer', '62', '62160'),
      c('Arras', '62', '62041'), c('Beauvais', '60', '60057'), c('Saint-Quentin', '02', '02691'), c('Laon', '02', '02408'),
    ],
  },
  {
    code: '11',
    label: 'Île-de-France',
    cities: [
      c('Paris', '75', '75056'), c('Boulogne-Billancourt', '92', '92012'), c('Nanterre', '92', '92050'), c('Neuilly-sur-Seine', '92', '92051'),
      c('Saint-Denis', '93', '93066'), c('Montreuil', '93', '93048'), c('Bobigny', '93', '93008'), c('Créteil', '94', '94028'),
      c('Vitry-sur-Seine', '94', '94081'), c('Versailles', '78', '78646'), c('Argenteuil', '95', '95018'), c('Cergy', '95', '95127'),
      c('Évry-Courcouronnes', '91', '91228'), c('Melun', '77', '77288'),
    ],
  },
  {
    code: '28',
    label: 'Normandie',
    cities: [
      c('Rouen', '76', '76540'), c('Le Havre', '76', '76351'), c('Caen', '14', '14118'), c('Cherbourg-en-Cotentin', '50', '50129'),
      c('Évreux', '27', '27229'), c('Dieppe', '76', '76217'), c('Alençon', '61', '61001'), c('Saint-Lô', '50', '50502'),
    ],
  },
  {
    code: '75',
    label: 'Nouvelle-Aquitaine',
    cities: [
      c('Bordeaux', '33', '33063'), c('Mérignac', '33', '33281'), c('Limoges', '87', '87085'), c('Poitiers', '86', '86194'),
      c('Pau', '64', '64445'), c('Bayonne', '64', '64102'), c('Biarritz', '64', '64122'), c('La Rochelle', '17', '17300'),
      c('Angoulême', '16', '16015'), c('Niort', '79', '79191'), c('Périgueux', '24', '24322'), c('Agen', '47', '47001'),
      c('Mont-de-Marsan', '40', '40192'), c('Tulle', '19', '19272'), c('Guéret', '23', '23096'),
    ],
  },
  {
    code: '76',
    label: 'Occitanie',
    cities: [
      c('Toulouse', '31', '31555'), c('Montpellier', '34', '34172'), c('Nîmes', '30', '30189'), c('Perpignan', '66', '66136'),
      c('Béziers', '34', '34032'), c('Sète', '34', '34301'), c('Narbonne', '11', '11262'), c('Carcassonne', '11', '11069'),
      c('Albi', '81', '81004'), c('Montauban', '82', '82121'), c('Tarbes', '65', '65440'), c('Rodez', '12', '12202'),
      c('Cahors', '46', '46042'), c('Auch', '32', '32013'), c('Foix', '09', '09122'), c('Mende', '48', '48095'),
    ],
  },
  {
    code: '52',
    label: 'Pays de la Loire',
    cities: [
      c('Nantes', '44', '44109'), c('Saint-Nazaire', '44', '44184'), c('Angers', '49', '49007'), c('Cholet', '49', '49099'),
      c('Le Mans', '72', '72181'), c('La Roche-sur-Yon', '85', '85191'), c("Les Sables-d'Olonne", '85', '85194'), c('Laval', '53', '53130'),
    ],
  },
  {
    code: '93',
    label: "Provence-Alpes-Côte d'Azur",
    cities: [
      c('Marseille', '13', '13055'), c('Aix-en-Provence', '13', '13001'), c('Arles', '13', '13004'), c('Nice', '06', '06088'),
      c('Cannes', '06', '06029'), c('Antibes', '06', '06004'), c('Menton', '06', '06083'), c('Toulon', '83', '83137'),
      c('Fréjus', '83', '83061'), c('Avignon', '84', '84007'), c('Gap', '05', '05061'), c('Digne-les-Bains', '04', '04070'),
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
