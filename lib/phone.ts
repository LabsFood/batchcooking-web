/**
 * Les numéros de téléphone, sans supposer que tout le monde est français.
 *
 * L'API ne demande qu'un format E.164 — `+` suivi de 7 à 15 chiffres — et
 * revalide derrière. C'est le front qui imposait un numéro français, et c'était
 * faux : un batch cooker peut être joignable sur un numéro espagnol, américain
 * ou camerounais. Seule l'**adresse** doit être en France métropolitaine, parce
 * que c'est là qu'il travaille.
 *
 * Vérifié le 06/10 : une candidature avec `+34`, `+1` ou `+237` ne se fait
 * reprocher que son code postal.
 */

export interface DialCountry {
  /** ISO 3166-1 alpha-2. */
  code: string
  label: string
  /** Indicatif, sans le `+`. */
  dial: string
  /**
   * `true` quand le numéro national s'écrit d'ordinaire avec un 0 initial
   * qu'on retire au passage en E.164. L'Italie fait exception : son 0 fait
   * partie du numéro.
   */
  trunk0?: boolean
}

/**
 * La France d'abord, puis les pays d'où viennent nos batch cookers et leurs
 * clients. La liste s'allonge sans rien casser : un indicatif absent se saisit
 * toujours à la main en commençant par `+`.
 */
export const DIAL_COUNTRIES: DialCountry[] = [
  { code: 'FR', label: 'France', dial: '33', trunk0: true },
  { code: 'BE', label: 'Belgique', dial: '32', trunk0: true },
  { code: 'CH', label: 'Suisse', dial: '41', trunk0: true },
  { code: 'LU', label: 'Luxembourg', dial: '352' },
  { code: 'MC', label: 'Monaco', dial: '377' },
  { code: 'ES', label: 'Espagne', dial: '34' },
  { code: 'PT', label: 'Portugal', dial: '351' },
  { code: 'IT', label: 'Italie', dial: '39' },
  { code: 'DE', label: 'Allemagne', dial: '49', trunk0: true },
  { code: 'NL', label: 'Pays-Bas', dial: '31', trunk0: true },
  { code: 'GB', label: 'Royaume-Uni', dial: '44', trunk0: true },
  { code: 'IE', label: 'Irlande', dial: '353', trunk0: true },
  { code: 'PL', label: 'Pologne', dial: '48' },
  { code: 'RO', label: 'Roumanie', dial: '40', trunk0: true },
  { code: 'GR', label: 'Grèce', dial: '30' },
  { code: 'TR', label: 'Turquie', dial: '90', trunk0: true },
  { code: 'MA', label: 'Maroc', dial: '212', trunk0: true },
  { code: 'DZ', label: 'Algérie', dial: '213', trunk0: true },
  { code: 'TN', label: 'Tunisie', dial: '216' },
  { code: 'EG', label: 'Égypte', dial: '20', trunk0: true },
  { code: 'SN', label: 'Sénégal', dial: '221' },
  { code: 'CI', label: "Côte d'Ivoire", dial: '225' },
  { code: 'ML', label: 'Mali', dial: '223' },
  { code: 'CM', label: 'Cameroun', dial: '237' },
  { code: 'CD', label: 'Congo (RDC)', dial: '243', trunk0: true },
  { code: 'CG', label: 'Congo', dial: '242' },
  { code: 'GA', label: 'Gabon', dial: '241' },
  { code: 'TG', label: 'Togo', dial: '228' },
  { code: 'BJ', label: 'Bénin', dial: '229' },
  { code: 'BF', label: 'Burkina Faso', dial: '226' },
  { code: 'GN', label: 'Guinée', dial: '224' },
  { code: 'NG', label: 'Nigeria', dial: '234', trunk0: true },
  { code: 'GH', label: 'Ghana', dial: '233', trunk0: true },
  { code: 'MG', label: 'Madagascar', dial: '261', trunk0: true },
  { code: 'MU', label: 'Maurice', dial: '230' },
  { code: 'LB', label: 'Liban', dial: '961', trunk0: true },
  { code: 'SY', label: 'Syrie', dial: '963', trunk0: true },
  { code: 'IL', label: 'Israël', dial: '972', trunk0: true },
  { code: 'IR', label: 'Iran', dial: '98', trunk0: true },
  { code: 'IN', label: 'Inde', dial: '91' },
  { code: 'PK', label: 'Pakistan', dial: '92', trunk0: true },
  { code: 'TH', label: 'Thaïlande', dial: '66', trunk0: true },
  { code: 'VN', label: 'Vietnam', dial: '84', trunk0: true },
  { code: 'CN', label: 'Chine', dial: '86' },
  { code: 'JP', label: 'Japon', dial: '81', trunk0: true },
  { code: 'KR', label: 'Corée du Sud', dial: '82', trunk0: true },
  { code: 'US', label: 'États-Unis', dial: '1' },
  { code: 'CA', label: 'Canada', dial: '1' },
  { code: 'MX', label: 'Mexique', dial: '52' },
  { code: 'BR', label: 'Brésil', dial: '55' },
  { code: 'AR', label: 'Argentine', dial: '54' },
  { code: 'PE', label: 'Pérou', dial: '51' },
]

export const DEFAULT_DIAL = 'FR'

export const dialOf = (code: string) =>
  DIAL_COUNTRIES.find((c) => c.code === code) ?? DIAL_COUNTRIES[0]

/** Un numéro E.164 : `+` et 7 à 15 chiffres. C'est la limite de l'UIT. */
export function isValidE164(value: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(value)
}

/**
 * Compose le E.164 à partir du pays et du numéro tel qu'il a été tapé.
 *
 * Le 0 initial du numéro national disparaît pour les pays qui en mettent un —
 * « 06 12 34 56 78 » devient « +33612345678 ». L'Italie garde le sien.
 */
export function toE164(countryCode: string, national: string): string {
  // Un numéro collé déjà complet — « +34 612… » ou « 0034 612… » — porte son
  // propre indicatif : le préfixer une seconde fois donnait « +3334612… ».
  if (estInternational(national)) {
    const chiffres = national.trim().replace(/^(?:\+|00)/, '').replace(/\D/g, '')
    return chiffres ? `+${chiffres}` : ''
  }
  const pays = dialOf(countryCode)
  let chiffres = national.replace(/\D/g, '')
  if (pays.trunk0) chiffres = chiffres.replace(/^0+/, '')
  return chiffres ? `+${pays.dial}${chiffres}` : ''
}

/** Ce qui a été tapé porte-t-il déjà son indicatif ? */
export function estInternational(saisie: string): boolean {
  const t = saisie.trim()
  return t.startsWith('+') || t.startsWith('00')
}

/**
 * Sépare un E.164 stocké en pays + numéro national, pour réafficher le champ.
 *
 * On retient l'indicatif le plus long qui corresponde : `+1` ne doit pas
 * l'emporter sur rien, mais `+33` doit l'emporter sur `+3`. À indicatif égal
 * (`+1` pour les États-Unis et le Canada), le premier de la liste gagne — on
 * ne peut pas deviner, et ça ne change rien au numéro envoyé.
 */
export function parseE164(value?: string | null): {
  country: string
  national: string
} {
  const brut = (value ?? '').trim()
  if (!brut.startsWith('+')) {
    return { country: DEFAULT_DIAL, national: brut.replace(/\D/g, '') }
  }
  const chiffres = brut.slice(1).replace(/\D/g, '')
  const candidats = [...DIAL_COUNTRIES]
    .filter((c) => chiffres.startsWith(c.dial))
    .sort((a, b) => b.dial.length - a.dial.length)
  const pays = candidats[0]
  if (!pays) return { country: DEFAULT_DIAL, national: chiffres }
  return { country: pays.code, national: chiffres.slice(pays.dial.length) }
}

/** « +33612345678 » → « +33 6 12 34 56 78 » pour la lecture. */
export function formatE164(value?: string | null): string {
  const brut = (value ?? '').trim()
  if (!isValidE164(brut)) return brut
  const { country, national } = parseE164(brut)
  const pays = dialOf(country)
  const groupes =
    pays.code === 'FR' && national.length === 9
      ? [national.slice(0, 1), ...(national.slice(1).match(/.{1,2}/g) ?? [])]
      : (national.match(/.{1,3}/g) ?? [national])
  return `+${pays.dial} ${groupes.join(' ')}`
}

/** Le reproche à faire au numéro saisi, ou `null` s'il tient debout. */
export function phoneProblem(countryCode: string, national: string): string | null {
  const chiffres = national.replace(/\D/g, '')
  if (!chiffres) return null
  const e164 = toE164(countryCode, national)
  if (!isValidE164(e164)) {
    return 'Ce numéro ne semble pas complet.'
  }
  return null
}
