import PageSkeleton from '@/components/shared/PageSkeleton'

/**
 * Le chargement d'un écran chef. Le layout n'y met aucune marge : c'est
 * `ChefPage` qui pose la barre du haut puis le `<main>`. On reprend donc les
 * deux (mêmes hauteurs, mêmes marges), pour que la page n'ait pas à sauter
 * quand l'écran réel remplace celui-ci.
 */
export default function ChefPageSkeleton() {
  return (
    <>
      <header
        aria-hidden
        className="sticky top-[var(--lf-dev-banner)] z-20 h-16 border-b border-[rgba(31,42,55,0.06)] bg-shell/85 backdrop-blur-md sm:h-[4.5rem]"
      />
      <main className="flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
        <PageSkeleton />
      </main>
    </>
  )
}
