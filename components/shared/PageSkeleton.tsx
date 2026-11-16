import { Skeleton, SkeletonCard, SkeletonGroup } from './Skeleton'

/**
 * Le chargement générique d'une page connectée : un titre, une rangée de
 * quatre chiffres, puis des cartes. C'est la forme commune des écrans, pour
 * les `loading.tsx` de route ; un écran qui a sa forme propre garde son
 * squelette.
 *
 * Pas de marge de page ici : le `<main>` du layout (client) ou de `ChefPage`
 * (chef) la pose déjà. Le titre est en blanc, car un bloc crème ne se voit pas
 * sur le fond `--shell`.
 */
export default function PageSkeleton() {
  return (
    <SkeletonGroup className="space-y-6">
      <Skeleton className="h-9 w-64 bg-paper" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} className="h-32 rounded-3xl">
            <Skeleton className="mb-4 h-10 w-10 rounded-xl" />
            <Skeleton className="h-8 w-20" />
          </SkeletonCard>
        ))}
      </div>

      {[0, 1, 2].map((i) => (
        <SkeletonCard key={i} className="space-y-3 rounded-3xl p-5 lg:p-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </SkeletonCard>
      ))}
    </SkeletonGroup>
  )
}
