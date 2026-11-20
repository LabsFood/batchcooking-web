import Logo from './Logo'
import { Skeleton, SkeletonCard, SkeletonGroup } from './Skeleton'

/**
 * Ce qu'on voit pendant que la page de connexion / d'inscription se prépare :
 * la même grille, le logo, le titre, puis la carte du formulaire (trois champs
 * et un bouton). Le logo est statique : seul le contenu qui attend pulse.
 */
export default function AuthSkeleton() {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-cream lg:grid-cols-2">
      <div className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:py-8">
        <Logo size="sm" />
        <div className="flex flex-1 items-center justify-center py-10">
          <SkeletonGroup className="w-full max-w-[26rem]">
            <Skeleton className="h-10 w-64 max-w-full" />
            <Skeleton className="mb-8 mt-3 h-6 w-full" />
            <SkeletonCard className="space-y-4 sm:p-6">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-11 rounded-xl" />
              ))}
              <Skeleton className="h-11 rounded-full" />
            </SkeletonCard>
          </SkeletonGroup>
        </div>
      </div>
      <div aria-hidden className="hidden bg-navy lg:block" />
    </div>
  )
}
