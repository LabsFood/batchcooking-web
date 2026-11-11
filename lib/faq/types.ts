/**
 * Catégories du filtre du FAQ. Elles vivent ici, à côté du type des questions,
 * pour que le filtre et les données ne puissent plus se désynchroniser : une
 * catégorie sans question affichait une liste vide. « Toutes » n'est pas une
 * catégorie, c'est l'absence de filtre (ajoutée par le composant).
 */
export const FAQ_CATEGORIES = [
  { id: 'service', label: 'Service' },
  { id: 'tarifs', label: 'Tarifs' },
  { id: 'réservation', label: 'Réservation' },
  { id: 'recettes', label: 'Recettes' },
  { id: 'allergies', label: 'Allergies' },
  { id: 'fiscal', label: 'Avantage fiscal' },
  { id: 'cuisiniers', label: 'Batch cookers' },
] as const

export type FAQCategory = (typeof FAQ_CATEGORIES)[number]['id']

/** Un texte de loi ou une page officielle, affiché en lien sous la réponse. */
export interface FAQSource {
  label: string
  href: string
}

export interface FAQItem {
  id: string
  question: string
  answer: string
  category: FAQCategory
  sources?: readonly FAQSource[]
}
