import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './client'

/** Fabrique le QueryClient partagé. Un client par cycle de vie de l'app. */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        // Ne pas réessayer les erreurs d'auth/permission.
        retry: (failureCount, error) => {
          if (
            error instanceof ApiError &&
            [400, 401, 403, 404].includes(error.status)
          ) {
            return false
          }
          return failureCount < 2
        },
      },
    },
  })
}
