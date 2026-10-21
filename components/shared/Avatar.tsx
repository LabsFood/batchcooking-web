'use client'

import { useId, useRef, useState } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMe } from '@/lib/api/me'
import {
  AVATAR_MUTATION,
  PHOTO_MAX_MB,
  checkPhoto,
  photoMessage,
  useRemoveAvatar,
  useUploadAvatar,
} from '@/lib/api/photos'

/* ─────────────────────────────────────────────────────────────────────────────
   La photo de profil.

   Elle s'affiche partout où l'on affichait des initiales, et se change depuis
   le menu du compte — là où l'on va déjà pour se déconnecter, pas dans un
   réglage qu'il faudrait trouver.

   Pour un batch cooker, cette photo devient publique une fois son compte
   approuvé et en ligne : l'éditeur le dit, parce que c'est une différence qui
   compte au moment de choisir la photo.
   ───────────────────────────────────────────────────────────────────────────── */

export function initials(nom?: string | null): string {
  return (
    (nom ?? '')
      .split(/\s+/)
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  )
}

/** La pastille : la photo si elle existe, les initiales sinon. */
export function Avatar({
  url,
  name,
  className,
  textClassName,
}: {
  url?: string | null
  name?: string | null
  className?: string
  textClassName?: string
}) {
  if (url) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={url}
        alt=""
        className={cn('shrink-0 rounded-full object-cover', className)}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-navy font-bold text-amber',
        className,
        textClassName,
      )}
    >
      {initials(name)}
    </span>
  )
}

/* ── Changer sa photo ──────────────────────────────────────────────────────── */

/** Un envoi ou un retrait de photo est en cours, lancé d'où qu'il soit. */
export function useAvatarBusy(): boolean {
  return useIsMutating({ mutationKey: AVATAR_MUTATION }) > 0
}

/** La pastille avec son voile d'attente : la même partout où l'on peut changer. */
export function AvatarPending({
  url,
  name,
  className,
}: {
  url?: string | null
  name?: string | null
  className?: string
}) {
  const pending = useAvatarBusy()
  return (
    <span className="relative inline-flex">
      <Avatar url={url} name={name} className={className} />
      {pending && (
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-navy/60">
          <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden />
        </span>
      )}
    </span>
  )
}

/**
 * Les deux gestes — changer, retirer — et la phrase qui dit ce qui est accepté.
 *
 * Ils vivent dans le menu du compte **et** sur la page profil : le même état,
 * les mêmes refus, une seule implémentation. Seul le fond change, et avec lui
 * le contraste des libellés : `tone="dark"` pour la carte marine du profil.
 */
export function AvatarButtons({
  tone = 'light',
  publicHint,
}: {
  tone?: 'light' | 'dark'
  publicHint?: boolean
}) {
  const me = useMe()
  const envoi = useUploadAvatar()
  const retrait = useRemoveAvatar()
  const champ = useRef<HTMLInputElement>(null)
  const champId = useId()
  const [erreur, setErreur] = useState<string | null>(null)

  const url = me.data?.avatarUrl ?? null
  const occupe = envoi.isPending || retrait.isPending
  const sombre = tone === 'dark'

  function choisir(file: File | null) {
    setErreur(null)
    if (!file) return
    const probleme = checkPhoto(file)
    if (probleme) {
      setErreur(probleme)
      return
    }
    envoi.mutate(file, {
      onSuccess: () => {
        if (champ.current) champ.current.value = ''
      },
      onError: (e) => setErreur(photoMessage(e)),
    })
  }

  return (
    <>
      <input
        ref={champ}
        id={champId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => choisir(e.target.files?.[0] ?? null)}
      />

      <div className={cn('flex items-center gap-1.5', sombre && 'justify-center')}>
        <label
          htmlFor={champId}
          className={cn(
            'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
            sombre
              ? 'bg-white/12 text-white hover:bg-white/20'
              : 'bg-cream-soft text-navy hover:bg-cream-deep',
            occupe && 'pointer-events-none opacity-50',
          )}
        >
          <Camera className="h-3 w-3" aria-hidden />
          {url ? 'Changer' : 'Ajouter une photo'}
        </label>

        {url && (
          <button
            type="button"
            onClick={() =>
              retrait.mutate(undefined, {
                onError: (e) => setErreur(photoMessage(e)),
              })
            }
            disabled={occupe}
            title="Retirer la photo"
            aria-label="Retirer la photo"
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full transition-colors disabled:opacity-40',
              sombre
                ? 'text-white/70 hover:bg-white/12 hover:text-white'
                : 'text-ink-soft hover:bg-red-50 hover:text-red-700',
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {erreur ? (
        <p
          role="alert"
          className={cn(
            'mt-1.5 text-[11px] leading-relaxed',
            sombre ? 'text-amber' : 'text-red-700',
          )}
        >
          {erreur}
        </p>
      ) : (
        <p
          className={cn(
            'mt-1.5 text-[11px] leading-relaxed',
            sombre ? 'text-white/70' : 'text-ink-soft',
          )}
        >
          JPG, PNG ou WebP, {PHOTO_MAX_MB} Mo au plus.
          {publicHint && ' Elle sera visible par les clients une fois votre vitrine en ligne.'}
        </p>
      )}
    </>
  )
}

/**
 * Le bloc qui se pose dans le menu du compte : la photo en grand, le nom, et
 * les deux gestes dessous.
 */
export function AvatarEditor({ publicHint }: { publicHint?: boolean }) {
  const me = useMe()

  return (
    <div className="px-3 pb-3 pt-2">
      <div className="mb-2.5 flex items-center gap-3">
        <AvatarPending
          url={me.data?.avatarUrl ?? null}
          name={me.data?.fullName}
          className="h-12 w-12 text-sm"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-navy">
            {me.data?.fullName || 'Mon compte'}
          </p>
          <p className="truncate text-xs text-ink-soft">{me.data?.email}</p>
        </div>
      </div>

      <AvatarButtons publicHint={publicHint} />
    </div>
  )
}
