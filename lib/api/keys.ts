'use client'

import { useAuth } from '@clerk/nextjs'

/**
 * Racine des clés react-query rattachées au compte connecté.
 *
 * Le `userId` Clerk fait partie de la clé, et ce n'est pas cosmétique : le
 * QueryClient vit dans `Providers`, au-dessus du routeur. Une déconnexion est
 * une navigation client — l'arbre React n'est jamais remonté, donc le cache
 * survit. Avec une clé fixe `['me']`, la réponse du compte précédent était
 * resservie au suivant (et `staleTime` empêchait même le refetch) : un client
 * héritait du rôle `chef` et repartait vers /espace-chef. Scoper par compte
 * rend le mélange impossible ; déconnecté, `userId` est `null` et la clé est
 * distincte, donc plus de rôle fantôme dans la navbar.
 */
export function useMeKey() {
  const { userId } = useAuth()
  return ['me', userId ?? 'anonymous'] as const
}
