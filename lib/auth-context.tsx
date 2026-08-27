'use client'

import { useCallback, useMemo } from 'react'
import { useClerk, useUser } from '@clerk/nextjs'

/**
 * Adaptateur au-dessus de Clerk.
 *
 * Conserve volontairement la signature de l'ancien contexte mock pour que les
 * consommateurs (ReserveButton, DashboardSidebar/Topbar, layout espace-client,
 * profil, paramètres, réservation) n'aient pas à changer.
 */
export type AppUser = {
  id: string
  name: string
  email: string
  username: string | null
  avatar?: string
  joinedAt: string
}

type AuthValue = {
  user: AppUser | null
  isAuthenticated: boolean
  isReady: boolean
  signOut: () => void
}

export function useAuth(): AuthValue {
  const { user, isLoaded, isSignedIn } = useUser()
  const clerk = useClerk()

  const signOut = useCallback(() => {
    void clerk.signOut({ redirectUrl: '/' })
  }, [clerk])

  return useMemo<AuthValue>(() => {
    const email = user?.primaryEmailAddress?.emailAddress ?? ''

    return {
      user: user
        ? {
            id: user.id,
            // Aucun de ces champs n'est garanti par Clerk : selon la config de
            // l'instance, un compte peut n'avoir qu'un username, ou qu'un
            // email. On descend la chaîne jusqu'à un libellé affichable.
            name:
              user.fullName?.trim() ||
              user.firstName?.trim() ||
              user.username?.trim() ||
              email.split('@')[0] ||
              'Gourmand·e',
            email,
            username: user.username,
            avatar: user.hasImage ? user.imageUrl : undefined,
            joinedAt: (user.createdAt ?? new Date()).toISOString(),
          }
        : null,
      isAuthenticated: !!isSignedIn,
      isReady: isLoaded,
      signOut,
    }
  }, [user, isLoaded, isSignedIn, signOut])
}
