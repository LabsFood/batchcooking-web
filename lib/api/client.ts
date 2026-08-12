'use client'

/* ─────────────────────────────────────────────────────────────────────────────
   Client bas niveau vers l'API Labs Food (NestJS).

   Les routes protégées attendent `Authorization: Bearer <token Clerk>`. Le
   backend valide le token de session Clerk via JWKS et détermine le rôle
   applicatif depuis Postgres (`users.role`).
   ───────────────────────────────────────────────────────────────────────────── */

import { useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

/** Erreur typée levée sur réponse non-2xx. `status` reflète le code HTTP. */
export class ApiError extends Error {
  status: number
  body: unknown
  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

interface ApiFetchOptions {
  token: string | null
  method?: Method
  body?: unknown
  signal?: AbortSignal
}

/**
 * Appel HTTP bas niveau. Injecte le Bearer token et le Content-Type, parse le
 * JSON, et lève une `ApiError` sur échec.
 */
export async function apiFetch<T>(
  path: string,
  { token, method = 'GET', body, signal }: ApiFetchOptions,
): Promise<T> {
  if (!BASE_URL) {
    throw new ApiError(0, "NEXT_PUBLIC_API_URL n'est pas configurée.")
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (cause) {
    throw new ApiError(0, "Impossible de joindre l'API.", cause)
  }

  const text = await res.text()
  const data = text ? safeJson(text) : null

  if (!res.ok) {
    const message =
      (data as { message?: string } | null)?.message ??
      `Requête ${path} échouée (${res.status}).`
    throw new ApiError(res.status, message, data)
  }

  return data as T
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/**
 * Retourne un `fetcher` lié au token de session Clerk courant, à utiliser dans
 * les `queryFn` / `mutationFn` de react-query.
 *
 * Hypothèse : le backend accepte le token de session Clerk par défaut. S'il
 * exige un JWT template nommé, remplacer `getToken()` par
 * `getToken({ template: '<nom>' })`.
 */
export function useApiFetch() {
  const { getToken } = useAuth()

  return useCallback(
    async <T>(
      path: string,
      options: Omit<ApiFetchOptions, 'token'> = {},
    ): Promise<T> => {
      const token = await getToken()
      return apiFetch<T>(path, { ...options, token })
    },
    [getToken],
  )
}
