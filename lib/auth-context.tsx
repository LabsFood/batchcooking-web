'use client'

import { useCallback, useMemo } from 'react'
import { useClerk, useUser } from '@clerk/nextjs'
import { useMe } from './api/me'
import type { Role } from './api/types'

/** Libellés des rôles applicatifs, affichés dans les dashboards. */
export const ROLE_LABEL: Record<Role, string> = {
  client: 'Client',
  chef: 'Batch cooker',
  admin: 'Administrateur',
}

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
  /** Rôle applicatif issu de `GET /me` — `null` tant qu'il n'est pas résolu. */
  role: Role | null
  /** Libellé français du rôle, prêt à afficher. */
  roleLabel: string | null
  signOut: () => void
}

export function useAuth(): AuthValue {
  const { user, isLoaded, isSignedIn } = useUser()
  const clerk = useClerk()
  const me = useMe()
  const role = me.data?.role ?? null

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
      role,
      roleLabel: role ? ROLE_LABEL[role] : null,
      signOut,
    }
  }, [user, isLoaded, isSignedIn, role, signOut])
}
