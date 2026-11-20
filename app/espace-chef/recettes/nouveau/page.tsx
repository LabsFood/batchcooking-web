'use client'

import { useRouter } from 'next/navigation'
import ChefPage from '@/components/chef/ChefPage'
import DishForm from '@/components/chef/recipes/DishForm'
import { useToast } from '@/components/shared/Toaster'
import { useCreateDish, type DishInput } from '@/lib/api/chef-catalog'
import { apiMessage } from '@/lib/api/messages'

/**
 * Écrire un plat prend du temps : ça mérite une page, pas une fenêtre qui se
 * referme et emporte tout.
 */
export default function NouveauPlatPage() {
  const router = useRouter()
  const toast = useToast()
  const create = useCreateDish()

  function save(input: DishInput) {
    create.mutate(input, {
      onSuccess: (dish) => {
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
