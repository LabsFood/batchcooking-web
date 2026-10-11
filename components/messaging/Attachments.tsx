'use client'

import { useState } from 'react'
import { FileText, ImageOff, Loader2 } from 'lucide-react'
import {
  useAttachmentUrl,
  useOpenAttachment,
  type Attachment,
} from '@/lib/api/messaging'
import { cn } from '@/lib/utils'
import ImageLightbox from './ImageLightbox'
import { fileSize } from './format'

/**
 * Les pièces jointes d'un message : les images en vignette, cliquables pour un
 * aperçu plein écran ; les autres fichiers (PDF) en ligne, ouverts dans un onglet.
 */
export default function Attachments({
  conversationId,
  attachments,
  mine,
  pending,
  className,
}: {
  conversationId: string
  attachments: Attachment[]
  /** Message de la personne connectée : la bulle est sombre. */
  mine: boolean
  /** Message pas encore confirmé par le serveur : rien n'est encore lisible. */
  pending?: boolean
  className?: string
}) {
  if (attachments.length === 0) return null
  return (
    <ul className={cn('space-y-1.5', className)}>
      {attachments.map((attachment) => (
        <li key={attachment.id}>
          {attachment.mimeType.startsWith('image/') && !pending ? (
            <ImageAttachment
              conversationId={conversationId}
              attachment={attachment}
              mine={mine}
            />
          ) : (
            <FileAttachment
              conversationId={conversationId}
              attachment={attachment}
              mine={mine}
              disabled={pending}
            />
          )}
        </li>
      ))}
    </ul>
  )
}

function ImageAttachment({
  conversationId,
  attachment,
  mine,
}: {
  conversationId: string
  attachment: Attachment
  mine: boolean
}) {
  const link = useAttachmentUrl(conversationId, attachment.id)
  const [open, setOpen] = useState(false)
  // Le lien signé a pu expirer entre son obtention et l'affichage.
  const [broken, setBroken] = useState(false)

  if (link.isError || broken) {
    return (
      <p
        className={cn(
          'flex items-center gap-2 rounded-xl px-3 py-2 text-xs',
          mine ? 'bg-white/10' : 'bg-paper',
        )}
      >
        <ImageOff className="h-4 w-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{attachment.fileName}</span>
        <button
          type="button"
          onClick={() => {
            setBroken(false)
            void link.refetch()
          }}
          className="shrink-0 font-semibold underline"
        >
          Réessayer
        </button>
      </p>
    )
  }

  if (!link.data) {
    return (
      <div
        className={cn(
          'flex h-36 w-52 max-w-full items-center justify-center rounded-xl',
          mine ? 'bg-white/10' : 'bg-paper',
        )}
        aria-label={`Chargement de ${attachment.fileName}`}
      >
        <Loader2 className="h-4 w-4 animate-spin opacity-60" aria-hidden />
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Agrandir ${attachment.fileName}`}
        className="block overflow-hidden rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber"
      >
        {/* Lien signé vers le stockage privé : `next/image` ne sait pas l'optimiser. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={link.data}
          alt={attachment.fileName}
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-36 w-52 max-w-full object-cover transition-transform hover:scale-[1.02]"
        />
      </button>
      {open && (
        <ImageLightbox
          url={link.data}
          fileName={attachment.fileName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

function FileAttachment({
  conversationId,
  attachment,
  mine,
  disabled,
}: {
  conversationId: string
  attachment: Attachment
  mine: boolean
  disabled?: boolean
}) {
  const openAttachment = useOpenAttachment(conversationId)
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void openAttachment(attachment.id).catch(() => undefined)}
      className={cn(
        'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs',
        mine ? 'bg-white/10 hover:bg-white/20' : 'bg-paper hover:bg-cream-deep',
      )}
    >
      <FileText className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate font-medium">{attachment.fileName}</span>
      <span className="shrink-0 opacity-70">{fileSize(attachment.sizeBytes)}</span>
    </button>
  )
}
