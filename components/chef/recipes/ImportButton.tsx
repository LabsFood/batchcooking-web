'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import RecipeImportDialog from './RecipeImportDialog'
import { useImportAvailability } from '@/lib/api/recipe-imports'

/**
 * « Importer une recette », seulement si la console l'a ouvert à ce cuisinier.
 * `card` : une carte d'une ligne au-dessus du formulaire, le bouton à droite.
 */
export default function ImportButton({
  className = 'btn btn-outline text-xs',
  card = false,
}: {
  className?: string
  card?: boolean
}) {
  const availability = useImportAvailability()
  const [open, setOpen] = useState(false)
  if (!availability.data?.enabled) return null
  const button = (
    <button type="button" className={card ? 'btn btn-outline shrink-0 text-xs' : className} onClick={() => setOpen(true)}>
      <Sparkles className="h-3.5 w-3.5" aria-hidden /> Importer une recette
    </button>
  )
  return (
    <>
      {card ? (
        <div className="mx-auto mb-5 flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-3xl bg-cream-soft px-5 py-4">
          <p className="flex min-w-0 flex-1 items-center gap-2 text-sm text-ink-mid">
            <Sparkles className="h-4 w-4 shrink-0 text-navy" aria-hidden />
            Partir d’une recette existante : photo, PDF, texte, lien ou simple titre.
          </p>
          {button}
        </div>
      ) : (
        button
      )}
      <RecipeImportDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}
