'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApiFetch } from './client'
import { optimizePhoto } from './optimize-photo'

/* ─────────────────────────────────────────────────────────────────────────────
   Import de recettes par IA.

   Le cuisinier envoie un PDF, une ou plusieurs photos, un texte, un lien ou un
   simple titre. L'API répond tout de suite (`pending`) et lit la recette ensuite :
   on suit l'import toutes les 2 secondes jusqu'à `done` (le brouillon est prêt),
   `review` (plusieurs recettes, ou un plat du même nom : le cuisinier choisit) ou
   `failed` (le message dit pourquoi, en français).

   Les fichiers partent directement vers un stockage privé (URL signée), comme les
   documents du dossier : ils ne transitent pas par l'API. Une photo est allégée
   avant l'envoi, mais moins qu'une photo de plat : il faut pouvoir lire le texte.
   ───────────────────────────────────────────────────────────────────────────── */

export type ImportSourceType = 'file' | 'text' | 'url' | 'title'
export type ImportStatus = 'pending' | 'processing' | 'review' | 'done' | 'failed'

export interface RecipeImport {
  id: string
  sourceType: ImportSourceType
  status: ImportStatus
  error: { code: string; message: string } | null
  meals: { id: string; name: string }[]
  estimatedFields: string[]
  warnings: string[]
  allergenGaps: string[]
  linked: number | null
  toVerify: number | null
  duplicateOf: { id: string; name: string } | null
  candidates: { index: number; name: string; ingredients: number }[]
  createdAt: string
  finishedAt: string | null
}

export const IMPORT_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
export const IMPORT_MAX_MB = 10
export const IMPORT_MAX_FILES = 4
/** Assez pour lire une page de livre photographiée. */
const READABLE_MAX_SIDE = 2400

/** Ce que l'API refuse, dit avant l'envoi. */
export function checkImportFiles(files: File[]): string | null {
  if (files.length === 0) return 'Choisissez un fichier ou prenez une photo.'
  if (files.length > IMPORT_MAX_FILES) return `${IMPORT_MAX_FILES} fichiers au plus.`
  const pdfs = files.filter((f) => f.type === 'application/pdf')
  if (pdfs.length > 1 || (pdfs.length === 1 && files.length > 1)) {
    return 'Un seul PDF par import, ou plusieurs photos d’une même recette.'
  }
  for (const f of files) {
    if (/hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name)) {
      return 'Photo au format HEIC : réglez l’appareil photo sur « Le plus compatible », ou faites une capture d’écran.'
    }
    if (!IMPORT_MIME.includes(f.type)) return 'Formats acceptés : PDF, JPEG, PNG, WebP.'
    if (f.size === 0) return 'Un des fichiers est vide.'
  }
  return null
}

const key = (id: string) => ['me', 'recipe-imports', id] as const

export function useImportAvailability() {
  const apiFetch = useApiFetch()
  return useQuery({
    queryKey: ['me', 'recipe-imports', 'availability'],
    queryFn: () => apiFetch<{ enabled: boolean }>('/me/recipe-imports/availability'),
    staleTime: 5 * 60_000,
    retry: false,
  })
}

/** Suit un import tant qu'il est en cours. */
export function useRecipeImport(id: string | null) {
  const apiFetch = useApiFetch()
  return useQuery({
    queryKey: key(id ?? 'none'),
    queryFn: () => apiFetch<RecipeImport>(`/me/recipe-imports/${id}`),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'pending' || status === 'processing' ? 2000 : false
    },
  })
}

interface Ticket {
  uploadId: string
  method?: string
  url: string
  headers?: Record<string, string>
}

export type StartImport =
  | { sourceType: 'file'; files: File[] }
  | { sourceType: 'text'; text: string }
  | { sourceType: 'url'; url: string }
  | { sourceType: 'title'; title: string }

export function useStartImport() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: StartImport) => {
      if (input.sourceType !== 'file') {
        return apiFetch<RecipeImport>('/me/recipe-imports', { method: 'POST', body: input })
      }
      const problem = checkImportFiles(input.files)
      if (problem) throw new Error(problem)
      const uploadIds: string[] = []
      for (const chosen of input.files) {
        const file = chosen.type.startsWith('image/') ? await optimizePhoto(chosen, READABLE_MAX_SIDE) : chosen
        if (file.size > IMPORT_MAX_MB * 1024 * 1024) {
          throw new Error(`Fichier trop lourd : ${IMPORT_MAX_MB} Mo au plus.`)
        }
        const ticket = await apiFetch<Ticket>('/me/recipe-imports/upload-url', {
          method: 'POST',
          body: { mimeType: file.type, sizeBytes: file.size },
        })
        let res: Response
        try {
          res = await fetch(ticket.url, {
            method: ticket.method || 'PUT',
            headers: ticket.headers ?? { 'Content-Type': file.type },
            body: file,
          })
        } catch {
          throw new Error('Le transfert s’est interrompu. Réessayez.')
        }
        if (!res.ok) throw new Error(`Le transfert du fichier a échoué (${res.status}).`)
        uploadIds.push(ticket.uploadId)
      }
      return apiFetch<RecipeImport>('/me/recipe-imports', {
        method: 'POST',
        body: { sourceType: 'file', uploadIds },
      })
    },
    onSuccess: (data) => qc.setQueryData(key(data.id), data),
  })
}

export function useChooseImport() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, index }: { id: string; index: number }) =>
      apiFetch<RecipeImport>(`/me/recipe-imports/${id}/choose`, { method: 'POST', body: { index } }),
    onSuccess: (data) => {
      qc.setQueryData(key(data.id), data)
      qc.invalidateQueries({ queryKey: ['me', 'dishes'] })
    },
  })
}

/** Les champs que l'IA a estimés, dits comme dans le formulaire. */
export const ESTIMATED_LABEL: Record<string, string> = {
  portions: 'les portions',
  prepMinutes: 'le temps de préparation',
  cookMinutes: 'le temps de cuisson',
  storageDays: 'la durée de conservation',
  category: 'le type de plat',
  difficulty: 'la difficulté',
}
