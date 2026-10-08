/**
 * Pays d'origine d'un plat, en code ISO 3166-1 alpha-2.
 *
 * L'API attend ce code, et la carte culinaire du client s'en sert pour colorer
 * un pays : écrire « Sénégal » ne suffit pas, il faut `SN`. La liste couvre les
 * cuisines du catalogue ; elle s'allonge sans rien casser.
 */
export const COUNTRIES: { code: string; label: string }[] = [
  { code: 'FR', label: 'France' },
  { code: 'IT', label: 'Italie' },
  { code: 'ES', label: 'Espagne' },
  { code: 'PT', label: 'Portugal' },
  { code: 'GR', label: 'Grèce' },
  { code: 'GB', label: 'Royaume-Uni' },
  { code: 'DE', label: 'Allemagne' },
  { code: 'BE', label: 'Belgique' },
  { code: 'NL', label: 'Pays-Bas' },
  { code: 'PL', label: 'Pologne' },
  { code: 'RU', label: 'Russie' },
  { code: 'TR', label: 'Turquie' },
  { code: 'LB', label: 'Liban' },
  { code: 'SY', label: 'Syrie' },
  { code: 'IL', label: 'Israël' },
  { code: 'IR', label: 'Iran' },
  { code: 'MA', label: 'Maroc' },
  { code: 'DZ', label: 'Algérie' },
  { code: 'TN', label: 'Tunisie' },
  { code: 'EG', label: 'Égypte' },
  { code: 'ET', label: 'Éthiopie' },
  { code: 'SN', label: 'Sénégal' },
  { code: 'ML', label: 'Mali' },
  { code: 'CI', label: "Côte d'Ivoire" },
  { code: 'CM', label: 'Cameroun' },
  { code: 'CD', label: 'Congo (RDC)' },
  { code: 'MG', label: 'Madagascar' },
  { code: 'NG', label: 'Nigeria' },
  { code: 'IN', label: 'Inde' },
  { code: 'PK', label: 'Pakistan' },
  { code: 'TH', label: 'Thaïlande' },
  { code: 'VN', label: 'Vietnam' },
  { code: 'KH', label: 'Cambodge' },
  { code: 'CN', label: 'Chine' },
  { code: 'JP', label: 'Japon' },
  { code: 'KR', label: 'Corée du Sud' },
  { code: 'ID', label: 'Indonésie' },
  { code: 'PH', label: 'Philippines' },
  { code: 'MX', label: 'Mexique' },
  { code: 'PE', label: 'Pérou' },
  { code: 'BR', label: 'Brésil' },
  { code: 'AR', label: 'Argentine' },
  { code: 'US', label: 'États-Unis' },
  { code: 'CA', label: 'Canada' },
]

export const countryLabel = (code?: string | null) =>
  COUNTRIES.find((c) => c.code === code)?.label ?? code ?? ''
