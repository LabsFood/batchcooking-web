'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import RecipeImportDialog from './RecipeImportDialog'
import { useImportAvailability } from '@/lib/api/recipe-imports'

/** « Importer une recette », seulement si la console l'a ouvert à ce cuisinier. */
export default function ImportButton({ className = 'btn btn-outline text-xs' }: { className?: string }) {
  const availability = useImportAvailability()
  const [open, setOpen] = useState(false)
  if (!availability.data?.enabled) return null
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <Sparkles className="h-3.5 w-3.5" aria-hidden /> Importer une recette
      </button>
      <RecipeImportDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}
