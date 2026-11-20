'use client'

import RouteError from '@/components/shared/RouteError'

// Une page de l'espace casse : le layout (barre latérale) reste en place.
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return (
    <RouteError error={error} retry={retry} homeHref="/espace-chef" homeLabel="Retour à l’accueil" />
  )
}
