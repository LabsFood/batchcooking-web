'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type MockUser = {
  id: string
  name: string
  email: string
  avatar?: string
  joinedAt: string
}

type AuthContextValue = {
  user: MockUser | null
  isAuthenticated: boolean
  isReady: boolean
  signIn: (email: string, name?: string) => MockUser
  signOut: () => void
}

const STORAGE_KEY = 'labsfood.user.v1'

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) setUser(JSON.parse(raw) as MockUser)
    } catch {
      // ignore corrupted storage
    } finally {
      setIsReady(true)
    }
  }, [])

  const signIn = useCallback((email: string, name?: string) => {
    const cleanEmail = email.trim().toLowerCase()
    const fallbackName =
      name?.trim() ||
      cleanEmail.split('@')[0]?.replace(/[._-]+/g, ' ') ||
      'Gourmand·e'
    const next: MockUser = {
      id: `usr_${Math.random().toString(36).slice(2, 10)}`,
      name: fallbackName.replace(/\b\w/g, (c) => c.toUpperCase()),
      email: cleanEmail,
      joinedAt: new Date().toISOString(),
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setUser(next)
    return next
  }, [])

  const signOut = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isReady,
      signIn,
      signOut,
    }),
    [user, isReady, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
