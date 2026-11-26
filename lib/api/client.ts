'use client'

/* ─────────────────────────────────────────────────────────────────────────────
   Client bas niveau vers l'API Lab’s Food (NestJS).

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
  /** Délai au-delà duquel on cesse d'attendre. 0 pour ne pas limiter. */
  timeoutMs?: number
}

/**
 * Un appel sans délai maximum ne revient jamais quand le réseau se fige — et
 * un écran qui l'attend affiche son chargement pour toujours. C'est ce qui
 * bloquait un onglet resté longtemps inactif.
 */
const DEFAULT_TIMEOUT_MS = 15_000

/**
 * Appel HTTP bas niveau. Injecte le Bearer token et le Content-Type, parse le
 * JSON, et lève une `ApiError` sur échec.
 */
export async function apiFetch<T>(
  path: string,
  { token, method = 'GET', body, signal, timeoutMs = DEFAULT_TIMEOUT_MS }: ApiFetchOptions,
): Promise<T> {
  if (!BASE_URL) {
    throw new ApiError(0, "NEXT_PUBLIC_API_URL n'est pas configurée.")
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  // Le signal de l'appelant et notre minuterie, combinés : le premier des
  // deux qui se déclenche interrompt la requête.
  const minuterie = timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : null
  const abandon =
    signal && minuterie
      ? AbortSignal.any([signal, minuterie])
      : (signal ?? minuterie ?? undefined)

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: abandon,
    })
  } catch (cause) {
    const expire =
      cause instanceof DOMException &&
      (cause.name === 'TimeoutError' || minuterie?.aborted === true)
    throw new ApiError(
      0,
      expire ? "L'API n'a pas répondu à temps." : "Impossible de joindre l'API.",
      cause,
    )
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

/**
 * Un fichier binaire (un PDF) avec le jeton : `apiFetch` lit du texte, ce qui
 * abîmerait les octets. Lève une `ApiError` sur échec, comme lui.
 */
export function useApiBlob() {
  const { getToken } = useAuth()
  return useCallback(
    async (path: string): Promise<Blob> => {
      if (!BASE_URL) throw new ApiError(0, "NEXT_PUBLIC_API_URL n'est pas configurée.")
      const token = await getToken()
      let res: Response
      try {
        res = await fetch(`${BASE_URL}${path}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
        })
      } catch (cause) {
        throw new ApiError(0, "Impossible de joindre l'API.", cause)
      }
      if (!res.ok) {
        const data = safeJson(await res.text())
        throw new ApiError(res.status, `Requête ${path} échouée (${res.status}).`, data)
      }
      return res.blob()
    },
    [getToken],
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Le détail d'un refus de validation.

   Depuis le 17/10 un `400` porte, à côté du `message[]` historique, un tableau
   `errors: [{ field, code, message }]` : `field` est le chemin dans le corps
   envoyé (`meals.0.portions`), `code` le nom de la règle (`min`, `isUuid`,
   `whitelistValidation` pour un champ inconnu). Le `message` reste en anglais
   et ne s'affiche pas : c'est au formulaire de traduire depuis le `code`.

   Le statut reste 400, pas 422 : l'API a préféré ne casser aucun client.
   ───────────────────────────────────────────────────────────────────────────── */

export interface FieldError {
  field: string
  code: string
  message: string
}

export function fieldErrors(error: unknown): FieldError[] {
  if (!(error instanceof ApiError)) return []
  const body = error.body
  if (!body || typeof body !== 'object') return []
  const list = (body as { errors?: unknown }).errors
  if (!Array.isArray(list)) return []
  return list.flatMap((e) =>
    e && typeof e === 'object' && typeof (e as FieldError).field === 'string'
      ? [
          {
            field: String((e as FieldError).field),
            code: String((e as FieldError).code ?? ''),
            message: String((e as FieldError).message ?? ''),
          },
        ]
      : [],
  )
}

/** L'erreur qui vise un champ précis, s'il y en a une. */
export const errorFor = (error: unknown, field: string) =>
  fieldErrors(error).find((e) => e.field === field) ?? null
