'use client'

import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RotateCw } from 'lucide-react'
import ChefPage from '@/components/chef/ChefPage'
import DishForm from '@/components/chef/recipes/DishForm'
import { useToast } from '@/components/shared/Toaster'
import { Skeleton, SkeletonCard, SkeletonGroup } from '@/components/shared/Skeleton'
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
  // À part : un enregistrement automatique ne doit ni bloquer le bouton ni
  // afficher l'erreur d'un enregistrement voulu.
  const autosave = useUpdateDish()

  const dish = dishes.data?.find((d) => d.id === id)

  /**
   * La fiche enregistrée revient au formulaire : il en reprend la version avant
   * que la liste relue n'arrive, sans quoi elle lui ferait croire à un conflit
   * pendant que la page part vers la liste.
   */
  function save(input: DishInput) {
    return update.mutateAsync({ id, patch: input }).then(
      (saved) => {
        toast.success(`« ${saved.name} » enregistré`)
        router.push('/espace-chef/recettes')
        return saved
      },
      (e: unknown) => {
        toast.error('Les modifications n’ont pas été enregistrées', apiMessage(e))
        throw e
      },
    )
  }

  if (dishes.isPending) {
    return (
      <ChefPage title="Modifier un plat">
        <SkeletonGroup className="mx-auto max-w-2xl">
          <SkeletonCard className="h-96 space-y-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
            <Skeleton className="h-24" />
          </SkeletonCard>
        </SkeletonGroup>
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
    <ChefPage
      title={dish.name}
      subtitle={
        dish.readiness?.ready || dish.status !== 'draft'
          ? 'Les modifications sont enregistrées quand vous validez.'
          : 'Le brouillon s’enregistre tout seul.'
      }
    >
      <DishForm
        dish={dish}
        variantOfName={dishes.data?.find((x) => x.id === dish.variantOfId)?.name ?? null}
        onSave={save}
        onAutosave={(input) => autosave.mutateAsync({ id, patch: input })}
        onReload={async () => {
          // La liste à jour fait foi : on repart de ce que l’API sert maintenant.
          const fresh = await dishes.refetch({ throwOnError: true })
          return fresh.data?.find((x) => x.id === id) ?? null
        }}
        saving={update.isPending}
        error={update.error ? apiMessage(update.error) : null}
        saveError={update.error}
        backHref="/espace-chef/recettes"
      />
    </ChefPage>
  )
}
