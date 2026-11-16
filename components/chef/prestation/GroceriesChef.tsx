'use client'

import { useMemo, useState } from 'react'
import { Clock, Plus, Receipt, Send, ShieldCheck, Trash2, Wallet } from 'lucide-react'
import { InfoPopover } from '@/components/shared/InfoPopover'
import { apiMessage } from '@/lib/api/messages'
import {
  euros,
  type Groceries,
  useGroceries,
  useGroceryReceiptUrl,
  useSendGroceriesNotice,
  useSubmitGroceryReceipts,
} from '@/lib/api/groceries'

/* ─────────────────────────────────────────────────────────────────────────────
   Les courses payées à part, côté batch cooker (Recettes, lot 6).

   Le client a réservé son Budget Courses sur sa carte : « Budget garanti ».
   1. Message avant les courses : la date des courses et l'heure limite
      d'annulation, jamais plus tôt que le délai minimum de Lab's Food.
   2. Ne faire les courses qu'une fois confirmées (« en attente du client »
      sinon).
   3. Déposer les tickets dans les 24 h : photo et lignes, total plafonné au
      Budget ; au-delà, l'écart reste à votre charge.
   ───────────────────────────────────────────────────────────────────────────── */

const when = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

/** La valeur d'un <input type="datetime-local"> pour une date. */
const localInput = (date: Date) => {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return shifted.toISOString().slice(0, 16)
}

const toCents = (text: string) => {
  const value = Number(text.trim().replace(',', '.'))
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : null
}

export default function GroceriesChef({ missionId }: { missionId: string }) {
  const query = useGroceries(missionId, 'chef')
  const g = query.data
  if (!g || !g.applies || !g.status) return null

  return (
    <div className="mb-4 rounded-2xl border border-[rgba(31,42,55,0.08)] bg-cream-soft/60 p-4">
      <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-navy">
        <Wallet className="h-4 w-4 text-amber" aria-hidden />
        {g.guaranteed ? `Budget garanti : ${euros(g.budgetCents)}` : `Budget Courses : ${euros(g.budgetCents)}`}
        <InfoPopover label="Qu’est-ce que le Budget garanti ?">
          Le client a réservé ce montant sur sa carte. Vos tickets vous sont remboursés dans cette
          limite ; au-delà, l’écart reste à votre charge. Aucune commission sur les courses.
        </InfoPopover>
      </p>
      <Step g={g} missionId={missionId} />
    </div>
  )
}

function Step({ g, missionId }: { g: Groceries; missionId: string }) {
  switch (g.status) {
    case 'awaiting_card':
    case 'card_saved':
      return (
        <p className="mt-1 text-[13px] text-ink-mid">
          Le Budget sera réservé sur la carte du client le {when(g.opensAt)} (Verrouillage). Les courses
          ouvrent à ce moment-là.
        </p>
      )
    case 'hold_failed':
      return (
        <p className="mt-1 text-[13px] text-amber-deep">
          La carte du client a refusé l’empreinte : il est invité à la changer. Ne faites pas les
          courses pour l’instant.
        </p>
      )
    case 'hold_placed':
      return <NoticeForm g={g} missionId={missionId} />
    case 'notice_sent':
      return (
        <p className="mt-1 flex items-start gap-1.5 text-[13px] text-ink-mid">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden />
          Message envoyé : courses le {when(g.notice?.shoppingAt)}, annulables jusqu’au{' '}
          {when(g.notice?.cancelDeadline)}.
          {g.notice?.email?.deliveredAt
            ? ' E-mail remis.'
            : g.notice?.email?.bouncedAt
              ? ' E-mail non remis : le client devra confirmer dans l’application.'
              : ''}
        </p>
      )
    case 'awaiting_client':
      return (
        <p className="mt-1 text-[13px] font-semibold text-amber-deep">
          En attente du client : il n’a pas confirmé avant l’heure limite. Ne faites pas les courses.
        </p>
      )
    case 'confirmed':
      return <ReceiptsForm g={g} missionId={missionId} />
    case 'cancelled':
      return (
        <p className="mt-1 text-[13px] text-ink-mid">
          Courses annulées : le client achète lui-même les ingrédients. La prestation est maintenue.
        </p>
      )
    default:
      return <Reimbursement g={g} missionId={missionId} />
  }
}

function NoticeForm({ g, missionId }: { g: Groceries; missionId: string }) {
  const send = useSendGroceriesNotice()
  // L'heure d'ouverture du formulaire : l'API revérifie avec son horloge à l'envoi.
  const [openedAt] = useState(() => Date.now())
  const earliest = useMemo(
    () => new Date(openedAt + g.minNoticeMinutes * 60_000),
    [openedAt, g.minNoticeMinutes],
  )
  const [shoppingAt, setShoppingAt] = useState(() =>
    localInput(new Date(Math.max(new Date(g.opensAt).getTime(), earliest.getTime() + 3_600_000))),
  )
  const [deadline, setDeadline] = useState(() => localInput(new Date(earliest.getTime() + 15 * 60_000)))
  const minutes = g.minNoticeMinutes
  return (
    <form
      className="mt-2 space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        send.mutate({
          bookingId: missionId,
          shoppingAt: new Date(shoppingAt).toISOString(),
          cancelDeadline: new Date(deadline).toISOString(),
        })
      }}
    >
      <p className="text-[13px] text-ink-mid">
        Prévenez le client avant de faire les courses : il peut les annuler jusqu’à l’heure limite
        que vous choisissez.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-[12px] text-ink-mid">
          Je fais les courses le
          <input type="datetime-local" value={shoppingAt} min={localInput(new Date(g.opensAt))} onChange={(e) => setShoppingAt(e.target.value)} className="input-base mt-1 text-sm" required />
        </label>
        <label className="text-[12px] text-ink-mid">
          <span className="inline-flex items-center gap-1">
            Annulable jusqu’au
            <InfoPopover label="Pourquoi un délai minimum ?">
              Le client doit avoir le temps de lire le message : l’heure limite est au moins{' '}
              {minutes >= 60 ? `${Math.round(minutes / 60)} h` : `${minutes} min`} après l’envoi. L’horloge
              de Lab’s Food fait foi.
            </InfoPopover>
          </span>
          <input type="datetime-local" value={deadline} min={localInput(earliest)} max={shoppingAt} onChange={(e) => setDeadline(e.target.value)} className="input-base mt-1 text-sm" required />
        </label>
      </div>
      <button type="submit" disabled={send.isPending} className="btn btn-primary text-xs disabled:opacity-50">
        <Send className="h-3.5 w-3.5" aria-hidden /> Envoyer le message avant les courses
      </button>
      {send.isError && (
        <p role="alert" className="text-[12px] text-red-700">
          {apiMessage(send.error, 'Le message n’est pas parti.')}
        </p>
      )}
    </form>
  )
}

interface DraftLine {
  label: string
  amount: string
  receipt: number | null
}

function ReceiptsForm({ g, missionId }: { g: Groceries; missionId: string }) {
  const submit = useSubmitGroceryReceipts()
  const [files, setFiles] = useState<{ file: File; purchasedAt: string }[]>([])
  const [lines, setLines] = useState<DraftLine[]>([{ label: '', amount: '', receipt: 0 }])
  const [instant, setInstant] = useState(false)
  const total = lines.reduce((sum, l) => sum + (toCents(l.amount) ?? 0), 0)
  const above = total > g.budgetCents
  const ready =
    files.length > 0 &&
    lines.length > 0 &&
    lines.every((l) => l.label.trim() && toCents(l.amount) !== null) &&
    !above
  const fee = g.instantPayoutFee
    ? Math.min(total, Math.max(g.instantPayoutFee.minCents, Math.round((total * g.instantPayoutFee.bps) / 10_000)))
    : 0

  return (
    <div className="mt-2 space-y-3">
      <p className="flex items-center gap-1.5 text-[13px] text-mint-ink">
        <ShieldCheck className="h-4 w-4" aria-hidden /> Le client a confirmé : vous pouvez faire les
        courses. Déposez les tickets dans les 24 h.
      </p>
      <div>
        <p className="mb-1 text-[12px] font-semibold text-navy">Tickets (photo ou PDF)</p>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          onChange={(e) =>
            setFiles(
              Array.from(e.target.files ?? []).map((file) => ({
                file,
                purchasedAt: localInput(new Date()),
              })),
            )
          }
          className="text-[12px]"
        />
        {files.map((f, i) => (
          <label key={f.file.name + i} className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-ink-mid">
            Ticket {i + 1} ({f.file.name}) payé le
            <input
              type="datetime-local"
              value={f.purchasedAt}
              onChange={(e) => setFiles(files.map((x, j) => (j === i ? { ...x, purchasedAt: e.target.value } : x)))}
              className="input-base py-1 text-xs"
            />
          </label>
        ))}
      </div>
      <div>
        <p className="mb-1 text-[12px] font-semibold text-navy">Lignes</p>
        <ul className="space-y-1.5">
          {lines.map((l, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <input value={l.label} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Produit" maxLength={160} aria-label={`Produit ${i + 1}`} className="input-base min-w-32 flex-1 py-1.5 text-sm" />
              <input value={l.amount} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} placeholder="0,00" inputMode="decimal" aria-label={`Prix ${i + 1}`} className="input-base w-24 py-1.5 text-sm" />
              <select
                value={l.receipt === null ? '' : String(l.receipt)}
                onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, receipt: e.target.value === '' ? null : Number(e.target.value) } : x)))}
                aria-label={`Ticket de la ligne ${i + 1}`}
                className="input-base w-36 py-1.5 text-xs"
              >
                {files.map((_, k) => (
                  <option key={k} value={k}>
                    Ticket {k + 1}
                  </option>
                ))}
                <option value="">Sans ticket</option>
              </select>
              <button type="button" onClick={() => setLines(lines.filter((_, j) => j !== i))} aria-label="Retirer la ligne" className="rounded-full p-1 text-ink-soft hover:text-red-700">
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setLines([...lines, { label: '', amount: '', receipt: files.length ? 0 : null }])} className="btn btn-outline mt-2 text-xs">
          <Plus className="h-3.5 w-3.5" aria-hidden /> Ajouter une ligne
        </button>
        <p className={`mt-2 text-[13px] font-semibold ${above ? 'text-red-700' : 'text-navy'}`}>
          Total : {euros(total)} / Budget {euros(g.budgetCents)}
          {above && ' — au-dessus du Budget : réduisez les lignes, l’écart reste à votre charge.'}
        </p>
        <p className="text-[11px] text-ink-soft">Une ligne sans ticket n’est remboursée que si le client l’accepte.</p>
      </div>
      <label className="flex items-start gap-2 text-[12px] text-ink-mid">
        <input type="checkbox" checked={instant} onChange={(e) => setInstant(e.target.checked)} className="mt-0.5 h-4 w-4 accent-amber-deep" />
        <span>
          Versement instantané{total > 0 && fee > 0 ? ` (frais ${euros(fee)}, à votre charge)` : ' (frais à votre charge)'}
          <InfoPopover label="Quels délais de versement ?">
            Standard, sans frais : prélevé 24 h après le dépôt de vos tickets, puis versé sur votre
            compte bancaire environ 3 jours ouvrés plus tard. Instantané, en option : versé en
            quelques minutes après le prélèvement, contre des frais de{' '}
            {g.instantPayoutFee ? `${(g.instantPayoutFee.bps / 100).toLocaleString('fr-FR')} % (${euros(g.instantPayoutFee.minCents)} minimum)` : 'quelques euros'}
            . Si votre banque ne le permet pas, le versement standard s’applique et les frais vous
            sont rendus.
          </InfoPopover>
        </span>
      </label>
      <button
        type="button"
        disabled={!ready || submit.isPending}
        onClick={() =>
          submit.mutate({
            bookingId: missionId,
            receipts: files.map((f) => ({ file: f.file, purchasedAt: new Date(f.purchasedAt).toISOString() })),
            lines: lines.map((l) => ({ label: l.label.trim(), amountCents: toCents(l.amount)!, receipt: l.receipt })),
            instantPayout: instant,
          })
        }
        className="btn btn-primary text-xs disabled:opacity-50"
      >
        <Receipt className="h-3.5 w-3.5" aria-hidden /> Déposer les tickets
      </button>
      {submit.isError && (
        <p role="alert" className="text-[12px] text-red-700">
          {apiMessage(submit.error, 'Les tickets n’ont pas été déposés.')}
        </p>
      )}
    </div>
  )
}

function Reimbursement({ g, missionId }: { g: Groceries; missionId: string }) {
  const receiptUrl = useGroceryReceiptUrl('chef')
  const contested = g.lines.filter((l) => l.contestedAt && !l.decision)
  return (
    <div className="mt-1 space-y-1 text-[13px] text-ink-mid">
      <p>
        Tickets déposés : {euros(g.receiptsTotalCents ?? 0)}.{' '}
        {g.capture
          ? `${euros(g.capture.cents ?? 0)} prélevés le ${when(g.capture.at)} ; versés sur votre compte ${g.instantPayout?.chosen && g.instantPayout.status !== 'failed' ? 'en versement instantané' : 'environ 3 jours ouvrés plus tard'}.`
          : `Prélèvement le ${when(g.captureDueAt)}.`}
        <InfoPopover label="Quand suis-je remboursé ?">
          Prélevé 24 h après le dépôt de vos tickets, puis versé sur votre compte bancaire environ 3
          jours ouvrés plus tard (en quelques minutes en versement instantané).
        </InfoPopover>
      </p>
      {g.instantPayout?.status === 'failed' && (
        <p className="text-[12px] text-amber-deep">Le versement instantané n’a pas pu se faire : versement standard, frais rendus.</p>
      )}
      {contested.length > 0 && (
        <p className="text-[12px] font-semibold text-amber-deep">
          {contested.length} ligne{contested.length > 1 ? 's' : ''} contestée{contested.length > 1 ? 's' : ''} par le client : Lab’s Food tranche.
        </p>
      )}
      {g.refundedCents > 0 && <p className="text-[12px]">{euros(g.refundedCents)} rendus au client sur contestation fondée.</p>}
      <div className="flex flex-wrap gap-2 pt-1">
        {g.receipts.map((r, i) => (
          <button key={r.id} type="button" onClick={() => receiptUrl.mutate({ bookingId: missionId, receiptId: r.id }, { onSuccess: ({ url }) => window.open(url, '_blank', 'noopener') })} className="btn btn-outline text-[11px]">
            Ticket {i + 1}
          </button>
        ))}
      </div>
    </div>
  )
}
