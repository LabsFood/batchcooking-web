'use client'

import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RotateCw } from 'lucide-react'
import ChefPage from '@/components/chef/ChefPage'
import DishForm from '@/components/chef/recipes/DishForm'
import { useToast } from '@/components/shared/Toaster'
import { useDishes, useUpdateDish, type DishInput } from '@/lib/api/chef-catalog'
import { apiMessage } from '@/lib/api/messages'

/**
 * Modifier un plat. La liste est déjà en cache après un passage par
 * `/espace-chef/recettes` : on y lit le plat plutôt que de redemander à l'API
 * ce qu'elle vient de donner.
 */
export default function ModifierPlatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const toast = useToast()
  const dishes = useDishes()
  const update = useUpdateDish()

  const dish = dishes.data?.find((d) => d.id === id)

  function save(input: DishInput) {
    update.mutate(
      { id, patch: input },
      {
        onSuccess: (saved) => {
          toast.success(`« ${saved.name} » enregistré`)
          router.push('/espace-chef/recettes')
        },
        onError: (e) =>
          toast.error('Les modifications n’ont pas été enregistrées', apiMessage(e)),
      },
    )
  }

  if (dishes.isPending) {
    return (
      <ChefPage title="Modifier un plat">
        <div className="mx-auto h-96 max-w-2xl animate-pulse rounded-2xl bg-paper" />
      </ChefPage>
    )
  }

  if (!dish) {
    return (
      <ChefPage title="Plat introuvable">
        <div className="mx-auto max-w-lg rounded-2xl bg-paper p-6 text-center">
          <p className="font-display text-lg font-bold text-navy">Ce plat n’existe plus</p>
          <p className="mt-1.5 text-sm text-ink-mid">
            Il a peut-être été supprimé depuis un autre onglet.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button onClick={() => dishes.refetch()} className="btn btn-outline text-xs">
              <RotateCw className="h-3.5 w-3.5" aria-hidden /> Recharger
            </button>
            <Link href="/espace-chef/recettes" className="btn btn-primary text-xs">
              Mes plats
            </Link>
          </div>
        </div>
      </ChefPage>
    )
  }

  return (
    <ChefPage title={dish.name} subtitle="Les modifications sont enregistrées quand vous validez.">
      <Link
        href="/espace-chef/recettes"
        className="mb-5 inline-flex items-center gap-2 text-xs text-ink-mid hover:text-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Mes plats
      </Link>

      <DishForm
        dish={dish}
        onSave={save}
        saving={update.isPending}
        error={update.error ? apiMessage(update.error) : null}
        backHref="/espace-chef/recettes"
      />
    </ChefPage>
  )
}
