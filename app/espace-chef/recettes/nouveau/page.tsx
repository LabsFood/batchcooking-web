'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ChefPage from '@/components/chef/ChefPage'
import DishForm from '@/components/chef/recipes/DishForm'
import { useToast } from '@/components/shared/Toaster'
import { useCreateDish, type DishInput } from '@/lib/api/chef-catalog'
import { apiMessage } from '@/lib/api/messages'
import { track } from '@/lib/analytics'

/**
 * Écrire un plat prend du temps : ça mérite une page, pas une fenêtre qui se
 * referme et emporte tout.
 *
 * Mesure du temps de saisie (`recipe_form_opened` puis `recipe_form_saved`,
 * `mode: 'manual'`) : la référence « avant » de l'import de recettes, qui
 * enverra le même événement avec `mode: 'import'`. Des nombres seulement.
 */
export default function NouveauPlatPage() {
  const router = useRouter()
  const toast = useToast()
  const create = useCreateDish()
  const openedAt = useRef<number | null>(null)

  useEffect(() => {
    if (openedAt.current !== null) return
    openedAt.current = Date.now()
    track('recipe_form_opened', { mode: 'manual' })
  }, [])

  function save(input: DishInput) {
    create.mutate(input, {
      onSuccess: (dish) => {
        const started = openedAt.current ?? Date.now()
        track('recipe_form_saved', {
          mode: 'manual',
          durationSeconds: Math.round((Date.now() - started) / 1000),
          ingredients: input.recipe?.ingredients?.length ?? 0,
          steps: input.recipe?.steps?.length ?? 0,
        })
        toast.success(`« ${dish.name} » enregistré`, 'En brouillon : rien n’est public tant que vous ne publiez pas.')
        router.push('/espace-chef/recettes')
      },
      onError: (e) => toast.error('Le plat n’a pas été enregistré', apiMessage(e)),
    })
  }

  return (
    <ChefPage title="Nouveau plat" subtitle="Le nom et le temps de préparation suffisent pour commencer.">
      <DishForm
        dish={null}
        onSave={save}
        saving={create.isPending}
        error={create.error ? apiMessage(create.error) : null}
        saveError={create.error}
        backHref="/espace-chef/recettes"
      />
    </ChefPage>
  )
}
