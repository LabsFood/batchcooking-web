import type { Conversation, Message } from '@/lib/api/messaging'

export const dayKey = (iso: string) => new Date(iso).toDateString()

export function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export const hourLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

/** Dans la liste : l'heure pour aujourd'hui, la date sinon. */
export function shortWhen(iso: string): string {
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString()
    ? hourLabel(iso)
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export const dateTimeLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  )
}

export function fileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
}

/** La ligne sous le nom : la prestation concernée, ou le canal support. */
export function contextLine(conversation: Conversation): string {
  if (conversation.type === 'support') return 'Canal support'
  const reference = conversation.booking?.reference
  return reference ? `Prestation n° ${reference}` : 'Aucune prestation en cours'
}

/** L'aperçu dans la liste : le texte, ou à défaut ce qui a été joint. */
export function previewOf(message: Message | null): string {
  if (!message) return 'Aucun message pour le moment'
  if (message.body) return message.body
  const count = message.attachments.length
  return count > 1 ? `${count} pièces jointes` : 'Pièce jointe'
}

/** Groupement par jour : une séparation datée, comme dans une vraie conversation. */
export function groupByDay(messages: Message[]): { day: string; items: Message[] }[] {
  return messages.reduce<{ day: string; items: Message[] }[]>((groups, message) => {
    const last = groups[groups.length - 1]
    const day = dayKey(message.createdAt)
    if (last && last.day === day) last.items.push(message)
    else groups.push({ day, items: [message] })
    return groups
  }, [])
}
