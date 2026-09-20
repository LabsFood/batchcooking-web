'use client'

import { useId, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Eye, ExternalLink, FileText, RefreshCw, Trash2, UploadCloud, X } from 'lucide-react'
import {
  ACCEPTED_EXT,
  MAX_FILE_MB,
  checkFile,
  formatSize,
  type DocRequirement,
  type UploadedDoc,
} from '@/lib/chef/application'
import { FieldError } from './fields'

/* Emplacement d'une pièce : glisser-déposer ou parcourir, contrôle du format et
   du poids au dépôt, miniature, aperçu plein écran (image ou PDF), remplacer,
   retirer. Le fichier reste dans le navigateur jusqu'à l'envoi. */

export default function DocumentSlot({
  doc,
  value,
  onChange,
}: {
  doc: DocRequirement
  value?: UploadedDoc
  onChange: (file: File | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState(false)
  const id = useId()

  const accept = (file: File | undefined) => {
    if (!file) return
    const problem = checkFile(file)
    setError(problem)
    if (!problem) onChange(file)
  }

  const browse = () => inputRef.current?.click()
  const isImage = value?.file.type.startsWith('image/')

  return (
    <li
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        accept(e.dataTransfer.files[0])
      }}
      className={`rounded-xl border-[1.5px] p-4 transition-colors duration-150 ${
        dragging
          ? 'border-amber bg-amber-soft/30'
          : value
            ? 'border-[rgba(31,42,55,0.1)] bg-paper'
            : 'border-dashed border-[rgba(31,42,55,0.2)] bg-paper'
      }`}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ACCEPTED_EXT}
        className="sr-only"
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => {
          accept(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Miniature ou pictogramme */}
        {value ? (
          <button
            type="button"
            onClick={() => setPreview(true)}
            aria-label={`Aperçu de ${value.file.name}`}
            className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-cream-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
          >
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value.url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center text-navy">
                <FileText className="h-5 w-5" aria-hidden />
                <span className="mt-0.5 text-[9px] font-bold tracking-wide">PDF</span>
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-navy/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Eye className="h-4 w-4" aria-hidden />
            </span>
          </button>
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-cream-soft text-ink-soft" aria-hidden>
            <UploadCloud className="h-5 w-5" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-navy">{doc.label}</p>
          {value ? (
            <p className="mt-0.5 truncate text-[13px] text-ink-mid">
              {value.file.name}
              <span className="text-ink-soft"> · {formatSize(value.file.size)}</span>
            </p>
          ) : (
            <p className="mt-0.5 text-[13px] leading-snug text-ink-mid">{doc.hint}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {value ? (
            <>
              <IconAction label="Aperçu" onClick={() => setPreview(true)}>
                <Eye className="h-4 w-4" />
              </IconAction>
              <IconAction label="Remplacer le fichier" onClick={browse}>
                <RefreshCw className="h-4 w-4" />
              </IconAction>
              <IconAction
                label="Retirer le fichier"
                onClick={() => {
                  setError(null)
                  onChange(null)
                }}
                danger
              >
                <Trash2 className="h-4 w-4" />
              </IconAction>
            </>
          ) : (
            <button
              type="button"
              onClick={browse}
              className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-navy px-4 py-2 text-xs font-semibold text-navy transition-colors hover:bg-navy hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
            >
              <UploadCloud className="h-3.5 w-3.5" aria-hidden />
              Choisir un fichier
            </button>
          )}
        </div>
      </div>

      {!value && !error && (
        <p className="mt-2 hidden text-xs text-ink-soft sm:block sm:pl-[68px]">
          Ou glissez-le ici. PDF, JPG, PNG ou WebP, {MAX_FILE_MB} Mo maximum.
        </p>
      )}
      <div className="sm:pl-[68px]">
        <FieldError id={`${id}-error`} message={error ?? undefined} />
      </div>

      {/* Aperçu plein écran */}
      <Dialog.Root open={preview && !!value} onOpenChange={setPreview}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-deep/70 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed inset-3 z-50 flex flex-col overflow-hidden rounded-2xl bg-paper shadow-[0_30px_80px_-20px_rgba(15,23,32,0.55)] focus:outline-none sm:inset-8 lg:inset-x-[12%] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98]">
            <div className="flex items-center gap-3 border-b border-[rgba(31,42,55,0.08)] px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <Dialog.Title className="truncate text-sm font-semibold text-navy">{doc.label}</Dialog.Title>
                <Dialog.Description className="truncate text-xs text-ink-soft">
                  {value?.file.name} · {value && formatSize(value.file.size)}
                </Dialog.Description>
              </div>
              {value && (
                <a
                  href={value.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-navy hover:bg-cream-soft sm:inline-flex"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Ouvrir dans un onglet
                </a>
              )}
              <Dialog.Close
                aria-label="Fermer l’aperçu"
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-mid hover:bg-cream-soft hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
              >
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
            <div className="min-h-0 flex-1 bg-cream-deep">
              {value &&
                (isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={value.url} alt={`Aperçu : ${doc.label}`} className="h-full w-full object-contain p-4" />
                ) : (
                  <iframe src={value.url} title={`Aperçu : ${doc.label}`} className="h-full w-full border-0" />
                ))}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </li>
  )
}

function IconAction({
  label,
  onClick,
  danger,
  children,
}: {
  label: string
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber ${
        danger ? 'text-ink-mid hover:bg-red-50 hover:text-red-700' : 'text-ink-mid hover:bg-cream-soft hover:text-navy'
      }`}
    >
      {children}
    </button>
  )
}
