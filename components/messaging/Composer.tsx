'use client'

import { useRef, useState } from 'react'
import { FileText, Loader2, Paperclip, Send, X } from 'lucide-react'
import {
  MAX_ATTACHMENTS,
  MAX_BODY_LENGTH,
  attachmentError,
  messagingErrorText,
  useSendMessage,
  useUploadAttachment,
  type Attachment,
  type AttachmentRef,
  type Conversation,
} from '@/lib/api/messaging'
import { fileSize } from './format'
import { track } from '@/lib/analytics'

interface PendingFile {
  /** Identifiant local, le temps du dépôt. */
  key: string
  file: File
  ref?: AttachmentRef
}

/**
 * Zone de saisie. Les fichiers partent vers le stockage dès qu'ils sont
 * choisis ; ils ne sont rattachés à un message qu'à l'envoi.
 */
export default function Composer({
  conversation,
  placeholder,
  canned = [],
}: {
  conversation: Conversation
  placeholder: string
  canned?: string[]
}) {
  const [draft, setDraft] = useState('')
  const [files, setFiles] = useState<PendingFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)

  const send = useSendMessage(conversation)
  const upload = useUploadAttachment(conversation.id)

  const uploading = files.some((f) => !f.ref)
  const canSend = (draft.trim().length > 0 || files.length > 0) && !uploading

  const addFiles = async (picked: File[]) => {
    setError(null)
    const room = MAX_ATTACHMENTS - files.length
    if (picked.length > room) {
      setError(`${MAX_ATTACHMENTS} pièces jointes maximum par message.`)
    }
    for (const file of picked.slice(0, Math.max(0, room))) {
      const refused = attachmentError(file)
      if (refused) {
        setError(refused)
        continue
      }
      const key = `${file.name}-${file.size}-${Date.now()}`
      setFiles((current) => [...current, { key, file }])
      try {
        const ref = await upload(file)
        setFiles((current) => current.map((f) => (f.key === key ? { ...f, ref } : f)))
      } catch (cause) {
        setFiles((current) => current.filter((f) => f.key !== key))
        setError(messagingErrorText(cause))
      }
    }
  }

  const submit = () => {
    if (!canSend) return
    const body = draft.trim()
    const sent = files
    const previews: Attachment[] = sent.map((f) => ({
      id: f.key,
      fileName: f.file.name,
      mimeType: f.file.type,
      sizeBytes: f.file.size,
    }))
    setDraft('')
    setFiles([])
    setError(null)
    send.mutate(
      {
        body,
        attachments: sent.map((f) => f.ref!),
        attachmentPreviews: previews,
        clientMessageId: crypto.randomUUID(),
      },
      {
        onSuccess: () => {
          track('message_sent', {
            attachment_count: sent.length,
            has_text: Boolean(body),
          })
        },
        // Le message a été retiré du fil : on rend ce qui avait été écrit.
        onError: (cause) => {
          setDraft((current) => current || body)
          setFiles((current) => (current.length ? current : sent))
          setError(messagingErrorText(cause))
        },
      },
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="border-t border-[rgba(31,42,55,0.08)] pt-4"
    >
      {files.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {files.map((f) => (
            <li
              key={f.key}
              className="flex items-center gap-2 rounded-xl bg-cream-soft px-3 py-1.5 text-xs text-ink-mid"
            >
              {f.ref ? (
                <FileText className="h-3.5 w-3.5 text-ink-soft" aria-hidden />
              ) : (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-soft" aria-hidden />
              )}
              <span className="max-w-[160px] truncate">{f.file.name}</span>
              <span className="text-ink-soft">{fileSize(f.file.size)}</span>
              <button
                type="button"
                aria-label={`Retirer ${f.file.name}`}
                onClick={() => setFiles((current) => current.filter((x) => x.key !== f.key))}
                className="text-ink-soft hover:text-navy"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(e) => {
            void addFiles(Array.from(e.target.files ?? []))
            // Pour pouvoir rechoisir le même fichier après l'avoir retiré.
            e.target.value = ''
          }}
        />
        <button
          type="button"
          aria-label="Joindre un fichier"
          disabled={files.length >= MAX_ATTACHMENTS}
          onClick={() => fileInput.current?.click()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream-soft text-ink-soft hover:text-navy disabled:opacity-50"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Entrée envoie, Maj+Entrée va à la ligne.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          rows={1}
          maxLength={MAX_BODY_LENGTH}
          placeholder={placeholder}
          aria-label="Votre message"
          className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl bg-cream-soft px-4 py-2.5 text-sm outline-none transition focus:bg-paper focus:ring-2 focus:ring-amber/50"
        />
        <button
          type="submit"
          aria-label="Envoyer"
          disabled={!canSend}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber text-navy transition-colors hover:bg-amber-deep disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {canned.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {canned.map((text) => (
            <button
              type="button"
              key={text}
              onClick={() => setDraft(text)}
              className="rounded-full bg-cream-soft px-2.5 py-1 text-xs text-ink-mid transition-colors hover:bg-amber-soft hover:text-amber-ink"
            >
              {text}
            </button>
          ))}
        </div>
      )}
    </form>
  )
}
