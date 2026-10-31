'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiFetch } from './client'

/* ─────────────────────────────────────────────────────────────────────────────
   L'envoi d'une photo, partout pareil.

   Trois appels, et le fichier ne passe jamais par l'API :

     1. `POST …/photo/upload-url` avec le type et la taille. Réponse : une `url`
        privée valable 15 minutes et un `uploadId`.
     2. `PUT` du fichier vers cette url, avec les en-têtes donnés. Sa longueur
        doit valoir **exactement** `sizeBytes` : le stockage refuse le reste
        par un 403, et c'est l'erreur qu'on lit le plus souvent.
     3. `POST …/photo/confirm` avec `uploadId` et le **même** `contentType`.

   Rien n'est enregistré avant l'étape 3 : un envoi abandonné ne laisse pas de
   trace. JPEG, PNG ou WebP, 5 Mo au plus.

   Le même trio sert aux plats et menus du batch cooker, à ceux de la maison,
   et à la photo de profil. D'où ce fichier : un seul endroit à corriger.
   ───────────────────────────────────────────────────────────────────────────── */

export const PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp']
export const PHOTO_MAX_MB = 5

/** Ce que l'API refuse, dit avant de tenter l'envoi. */
export function checkPhoto(file: File): string | null {
  if (!PHOTO_MIME.includes(file.type)) {
    return 'Format non accepté. Choisissez un JPG, un PNG ou un WebP.'
  }
  if (file.size > PHOTO_MAX_MB * 1024 * 1024) {
    return `Image trop lourde. La limite est de ${PHOTO_MAX_MB} Mo.`
  }
  if (file.size === 0) return 'Ce fichier est vide.'
  return null
}

export interface PhotoTicket {
  uploadId: string
  method?: string
  url: string
  headers?: Record<string, string>
  expiresAt?: string
}

/** L'étape qui a échoué : elle change ce qu'on peut dire à la personne. */
export type PhotoStep = 'ticket' | 'transfer' | 'confirm'

export class PhotoError extends Error {
  step: PhotoStep
  constructor(step: PhotoStep, message: string) {
    super(message)
    this.name = 'PhotoError'
    this.step = step
  }
}

/** Le refus de l'API ou du stockage, dit à la personne qui vient de cliquer. */
export function photoMessage(error: unknown): string {
  if (error instanceof PhotoError) return error.message
  const e = error as { status?: number; message?: string } | null
  if (e?.status === 503) {
    return 'Le stockage des photos n’est pas configuré sur ce serveur.'
  }
  return e?.message ?? 'La photo n’a pas été enregistrée.'
}

/**
 * Déroule les trois appels pour une ressource donnée.
 *
 * `base` est le préfixe de la ressource : `/me/dishes/{id}`, `/admin/meals/{id}`,
 * `/me/avatar`… Les trois routes s'en déduisent, parce que l'API les nomme
 * partout de la même façon.
 */
export async function uploadPhoto<T>(
  apiFetch: ReturnType<typeof useApiFetch>,
  base: string,
  file: File,
): Promise<T> {
  return pushPhoto<T>(apiFetch, file, {
    ticketPath: `${base}/photo/upload-url`,
    confirmPath: `${base}/photo/confirm`,
  })
}

/**
 * Le trio, avec les deux chemins donnés explicitement.
 *
 * Toutes les photos de l'API suivent le même trio, mais pas la même forme de
 * chemin : un plat confirme sur `…/photo/confirm`, une photo de prestation sur
 * `…/photos` tout court, et elle accepte une légende. Plutôt que de deviner
 * depuis une racine, on nomme les deux appels.
 */
export async function pushPhoto<T>(
  apiFetch: ReturnType<typeof useApiFetch>,
  file: File,
  {
    ticketPath,
    confirmPath,
    extra,
  }: { ticketPath: string; confirmPath: string; extra?: Record<string, unknown> },
): Promise<T> {
  const probleme = checkPhoto(file)
  if (probleme) throw new PhotoError('ticket', probleme)

  let ticket: PhotoTicket
  try {
    ticket = await apiFetch<PhotoTicket>(ticketPath, {
      method: 'POST',
      // `contentType` et `sizeBytes` : c'est tout ce que `PhotoUploadDto`
      // accepte. Le nom du fichier n'y figure pas.
      body: { contentType: file.type, sizeBytes: file.size },
    })
  } catch (e) {
    throw new PhotoError('ticket', photoMessage(e))
  }

  let res: Response
  try {
    res = await fetch(ticket.url, {
      method: ticket.method || 'PUT',
      headers: ticket.headers ?? { 'Content-Type': file.type },
      body: file,
    })
  } catch {
    throw new PhotoError(
      'transfer',
      'Le transfert s’est interrompu. Rien n’a été enregistré.',
    )
  }
  if (!res.ok) {
    throw new PhotoError(
      'transfer',
      res.status === 403
        ? 'Le stockage a refusé le fichier : sa taille ne correspond pas à celle annoncée.'
        : `Le transfert de l’image a échoué (${res.status}).`,
    )
  }

  try {
    return await apiFetch<T>(confirmPath, {
      method: 'POST',
      // Le même type qu'à l'étape 1, sinon l'API répond 422.
      body: { uploadId: ticket.uploadId, contentType: file.type, ...extra },
    })
  } catch (e) {
    throw new PhotoError('confirm', photoMessage(e))
  }
}

/** Retire la photo. La ressource n'est pas touchée autrement. */
export async function removePhoto<T>(
  apiFetch: ReturnType<typeof useApiFetch>,
  base: string,
): Promise<T> {
  return apiFetch<T>(`${base}/photo`, { method: 'DELETE' })
}

/* ── La photo de profil ────────────────────────────────────────────────────── */

/**
 * `/me/avatar` suit le même trio, sans le segment `/photo` : les routes sont
 * `/me/avatar/upload-url`, `/me/avatar/confirm` et `DELETE /me/avatar`.
 */
export interface AvatarResponse {
  avatarUrl?: string | null
}

/**
 * La clef commune aux deux mutations. Elle sert à `useIsMutating` : la photo
 * s'affiche à plusieurs endroits à la fois — le menu du compte et la page
 * profil — et chacun doit voir le voile d'attente, même si c'est l'autre qui
 * a lancé l'envoi.
 */
export const AVATAR_MUTATION = ['avatar'] as const

export function useUploadAvatar() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()

  return useMutation({
    mutationKey: AVATAR_MUTATION,
    mutationFn: async (file: File) => {
      const probleme = checkPhoto(file)
      if (probleme) throw new PhotoError('ticket', probleme)

      let ticket: PhotoTicket
      try {
        ticket = await apiFetch<PhotoTicket>('/me/avatar/upload-url', {
          method: 'POST',
          body: { contentType: file.type, sizeBytes: file.size },
        })
      } catch (e) {
        throw new PhotoError('ticket', photoMessage(e))
      }

      const res = await fetch(ticket.url, {
        method: ticket.method || 'PUT',
        headers: ticket.headers ?? { 'Content-Type': file.type },
        body: file,
      }).catch(() => {
        throw new PhotoError('transfer', 'Le transfert s’est interrompu.')
      })
      if (!res.ok) {
        throw new PhotoError(
          'transfer',
          res.status === 403
            ? 'Le stockage a refusé le fichier : sa taille ne correspond pas à celle annoncée.'
            : `Le transfert a échoué (${res.status}).`,
        )
      }

      return apiFetch<AvatarResponse>('/me/avatar/confirm', {
        method: 'POST',
        body: { uploadId: ticket.uploadId, contentType: file.type },
      })
    },
    // La photo vit sur `/me` : c'est toute la racine du compte qui change.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  })
}

export function useRemoveAvatar() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  return useMutation({
    mutationKey: AVATAR_MUTATION,
    mutationFn: () => apiFetch<AvatarResponse>('/me/avatar', { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  })
}
