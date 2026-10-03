'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import ChefPage from '@/components/chef/ChefPage'
import DishForm from '@/components/chef/recipes/DishForm'
import { useToast } from '@/components/shared/Toaster'
import { useCreateDish, type DishInput } from '@/lib/api/chef-catalog'

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
      onError: (e) =>
        toast.error(
          'Le plat n’a pas été enregistré',
          e instanceof Error ? e.message : 'Réessayez dans un instant.',
        ),
    })
  }

  return (
    <ChefPage title="Nouveau plat" subtitle="Le nom et le temps de préparation suffisent pour commencer.">
      <Link
        href="/espace-chef/recettes"
        className="mb-5 inline-flex items-center gap-2 text-xs text-ink-mid hover:text-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Mes plats
      </Link>

      <DishForm
        dish={null}
        onSave={save}
        saving={create.isPending}
        error={create.error instanceof Error ? create.error.message : null}
        backHref="/espace-chef/recettes"
      />
    </ChefPage>
  )
}
