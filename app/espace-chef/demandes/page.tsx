'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Check,
  Clock,
  Info,
  MapPin,
  MessageCircle,
  Send,
  ShoppingBasket,
  UtensilsCrossed,
  Users,
  X,
} from 'lucide-react'
import ChefPage, { Card, Empty } from '@/components/chef/ChefPage'
import StatusBadge from '@/components/chef/StatusBadge'
import {
  CHEF_REQUESTS,
  CHEF_REQUEST_STATUS_LABEL,
  type ChefRequest,
  type ChefRequestStatus,
} from '@/lib/chef/mock'

const euros = (n: number) => `${n.toLocaleString('fr-FR')} €`
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
const hoursLeft = (iso: string) =>
  Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000))

const STATUS_TONE: Record<ChefRequestStatus, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> =
  {
    new: 'warning',
    accepted: 'success',
    declined: 'neutral',
    'counter-offered': 'info',
    cancelled: 'neutral',
  }

type Tab = 'new' | 'history'

export default function ChefRequestsPage() {
  const [tab, setTab] = useState<Tab>('new')
  const [decided, setDecided] = useState<Partial<Record<string, ChefRequestStatus>>>({})
  const [openId, setOpenId] = useState<string | null>(null)

  const requests: ChefRequest[] = CHEF_REQUESTS.map((r) => ({
    ...r,
    status: decided[r.id] ?? r.status,
  }))

  const decide = (id: string, status: ChefRequestStatus) =>
    setDecided((prev) => ({ ...prev, [id]: status }))

  const open = openId ? requests.find((r) => r.id === openId) : null

  // ── Vue détail ─────────────────────────────────────────────────────────
  if (open) {
    return (
      <ChefPage title="Détail de la demande" subtitle={`${open.client} · ${open.city}`}>
        <button
          onClick={() => setOpenId(null)}
          className="inline-flex items-center gap-2 text-xs text-ink-mid hover:text-navy mb-5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Toutes les demandes
        </button>
        <RequestDetail request={open} onDecide={(s) => decide(open.id, s)} />
      </ChefPage>
    )
  }

  // ── Liste ──────────────────────────────────────────────────────────────
  const list = requests.filter((r) => (tab === 'new' ? r.status === 'new' : r.status !== 'new'))

  return (
    <ChefPage title="Demandes" subtitle="Répondez avant l'échéance pour ne pas perdre la demande.">
      <div className="space-y-5">
        <div className="flex gap-2">
          {(
            [
              { id: 'new' as Tab, label: 'Nouvelles', n: requests.filter((r) => r.status === 'new').length },
              { id: 'history' as Tab, label: 'Historique', n: requests.filter((r) => r.status !== 'new').length },
            ]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                tab === t.id
                  ? 'bg-navy text-white'
                  : 'bg-paper text-ink-mid border border-[rgba(31,42,55,0.1)]'
              }`}
            >
              {t.label} ({t.n})
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <Card>
            <Empty text={tab === 'new' ? 'Aucune nouvelle demande.' : 'Aucune demande traitée.'} />
          </Card>
        ) : (
          <div className="space-y-4">
            {list.map((r) => (
              <RequestRow key={r.id} request={r} onOpen={() => setOpenId(r.id)} />
            ))}
          </div>
        )}
      </div>
    </ChefPage>
  )
}

/* ── Ligne de liste ─────────────────────────────────────────────────────── */

function RequestRow({ request: r, onOpen }: { request: ChefRequest; onOpen: () => void }) {
  const isNew = r.status === 'new'
  const left = hoursLeft(r.respondBefore)

  return (
    <Card>
      <div className="flex flex-col lg:flex-row lg:items-center gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-display text-lg font-bold text-navy">{r.client}</p>
            <StatusBadge tone={STATUS_TONE[r.status]}>
              {CHEF_REQUEST_STATUS_LABEL[r.status]}
            </StatusBadge>
            {isNew && left <= 24 && (
              <StatusBadge tone="danger">
                <Clock className="w-3 h-3" /> {left} h pour répondre
              </StatusBadge>
            )}
          </div>

          <p className="text-sm text-ink-mid capitalize">
            {longDate(r.date)} · {r.timeSlot}
          </p>
          <p className="text-xs text-ink-soft inline-flex items-center gap-1.5 mt-1">
            <MapPin className="w-3.5 h-3.5" /> {r.city}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Chip Icon={Users}>{r.persons} pers.</Chip>
            <Chip Icon={UtensilsCrossed}>{r.dishes.length} plats</Chip>
            {r.shoppingByChef && <Chip Icon={ShoppingBasket}>Courses incluses</Chip>}
            {r.allergies.map((a) => (
              <span key={a} className="text-[11px] px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                ⚠ {a}
              </span>
            ))}
          </div>
        </div>

        <div className="lg:w-56 shrink-0 flex lg:flex-col items-center lg:items-end justify-between gap-3">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-ink-soft">Net perçu</p>
            <p className="font-display text-2xl font-bold text-navy">{euros(r.net)}</p>
          </div>
          <button onClick={onOpen} className="btn btn-primary text-xs px-4 py-2.5">
            Voir le détail
          </button>
        </div>
      </div>
    </Card>
  )
}

/* ── Vue détail ─────────────────────────────────────────────────────────── */

function RequestDetail({
  request: r,
  onDecide,
}: {
  request: ChefRequest
  onDecide: (s: ChefRequestStatus) => void
}) {
  const [counter, setCounter] = useState(false)
  const [counterNet, setCounterNet] = useState(r.net)
  const [message, setMessage] = useState('')
  const isNew = r.status === 'new'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
      <div className="space-y-5">
        <Card>
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <h2 className="font-display text-xl font-bold text-navy">{r.client}</h2>
            <StatusBadge tone={STATUS_TONE[r.status]}>
              {CHEF_REQUEST_STATUS_LABEL[r.status]}
            </StatusBadge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Date" value={longDate(r.date)} />
            <Field label="Créneau" value={r.timeSlot} />
            <Field label="Convives" value={`${r.persons} personnes`} />
            <Field label="Courses" value={r.shoppingByChef ? 'À ma charge' : 'Par le client'} />
          </div>

          <div className="mt-4 pt-4 border-t border-[rgba(31,42,55,0.08)]">
            <p className="text-[10px] uppercase tracking-wide text-ink-soft mb-1">Adresse</p>
            <p className="text-sm text-navy inline-flex items-start gap-2">
              <MapPin className="w-4 h-4 text-terra mt-0.5 shrink-0" /> {r.address}
            </p>
          </div>
        </Card>

        <Card title={`Plats souhaités (${r.dishes.length})`}>
          <ul className="space-y-2">
            {r.dishes.map((d) => (
              <li
                key={d}
                className="flex items-center gap-3 rounded-2xl bg-cream-soft px-4 py-3"
              >
                <span className="w-8 h-8 rounded-xl bg-paper flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="w-4 h-4 text-terra" />
                </span>
                <span className="text-sm font-medium text-navy">{d}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Message du client">
          <p className="text-sm text-ink-mid leading-relaxed">{r.description}</p>
        </Card>

        <Card title="Contraintes alimentaires">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink-soft mb-1.5">Allergies</p>
              {r.allergies.length === 0 ? (
                <p className="text-xs text-ink-soft">Aucune signalée.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {r.allergies.map((a) => (
                    <span
                      key={a}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-medium"
                    >
                      ⚠ {a}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink-soft mb-1.5">Régimes</p>
              {r.diets.length === 0 ? (
                <p className="text-xs text-ink-soft">Aucun.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {r.diets.map((d) => (
                    <span key={d} className="text-[11px] px-2.5 py-1 rounded-full bg-mint text-mint-ink">
                      {d}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Colonne actions */}
      <aside className="space-y-4 lg:sticky lg:top-24 h-fit">
        <Card>
          <p className="eyebrow mb-3">Rémunération</p>
          <Line label="Montant client" value={euros(r.amountTTC)} />
          <Line label="Commission" value={`− ${euros(r.commission)}`} muted />
          <div className="my-2 border-t border-[rgba(31,42,55,0.08)]" />
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-ink-mid">Net perçu</span>
            <span className="font-display text-2xl font-bold text-navy">{euros(r.net)}</span>
          </div>

          {/* Le paiement intervient après la prestation : aucun moyen de
              paiement n'est affiché ici, le client choisira le sien à la fin. */}
          <div className="mt-4 rounded-xl bg-cream-soft px-3.5 py-3 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-ink-soft mt-0.5 shrink-0" />
            <p className="text-[11px] text-ink-mid leading-relaxed">
              Le client règle <strong>à l&apos;issue de la prestation</strong> et choisit
              son moyen de paiement à ce moment-là.
            </p>
          </div>
        </Card>

        <Card>
          <p className="eyebrow mb-3">Actions</p>

          {isNew ? (
            counter ? (
              <div className="space-y-3">
                <div>
                  <label className="label-muted block mb-2">Votre net proposé</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={counterNet}
                      onChange={(e) => setCounterNet(Math.max(0, Number(e.target.value)))}
                      className="input-base pr-8 font-semibold"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft text-sm">
                      €
                    </span>
                  </div>
                </div>
                <div>
                  <label className="label-muted block mb-2">Message</label>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Expliquez votre contre-proposition…"
                    className="input-base resize-none"
                  />
                </div>
                <button
                  onClick={() => onDecide('counter-offered')}
                  className="btn btn-primary w-full justify-center text-sm"
                >
                  <Send className="w-4 h-4" /> Envoyer la contre-proposition
                </button>
                <button
                  onClick={() => setCounter(false)}
                  className="w-full text-xs text-ink-soft hover:text-navy"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => onDecide('accepted')}
                  className="btn btn-primary w-full justify-center text-sm"
                >
                  <Check className="w-4 h-4" /> Accepter la demande
                </button>
                <button
                  onClick={() => setCounter(true)}
                  className="btn btn-outline w-full justify-center text-sm"
                >
                  <MessageCircle className="w-4 h-4" /> Contre-proposer
                </button>
                <button
                  onClick={() => onDecide('declined')}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors"
                >
                  <X className="w-4 h-4" /> Refuser
                </button>
              </div>
            )
          ) : (
            <div className="space-y-3">
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-cream-soft px-3.5 py-3"
              >
                <p className="text-xs text-ink-mid">
                  Statut actuel :{' '}
                  <strong className="text-navy">{CHEF_REQUEST_STATUS_LABEL[r.status]}</strong>
                </p>
              </motion.div>

              {/* Changement de statut a posteriori */}
              <div>
                <label className="label-muted block mb-2">Changer le statut</label>
                <div className="flex flex-col gap-2">
                  {(['accepted', 'declined', 'counter-offered', 'cancelled'] as ChefRequestStatus[])
                    .filter((s) => s !== r.status)
                    .map((s) => (
                      <button
                        key={s}
                        onClick={() => onDecide(s)}
                        className="btn btn-outline w-full justify-center text-xs py-2"
                      >
                        {CHEF_REQUEST_STATUS_LABEL[s]}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          <button className="w-full mt-3 text-xs text-terra font-semibold hover:underline inline-flex items-center justify-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" /> Ouvrir la messagerie
          </button>
        </Card>
      </aside>
    </div>
  )
}

/* ── Petits composants ──────────────────────────────────────────────────── */

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-ink-soft mb-1">{label}</p>
      <p className="text-sm font-medium text-navy capitalize">{value}</p>
    </div>
  )
}

function Line({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-0.5">
      <span className="text-xs text-ink-soft">{label}</span>
      <span className={`text-sm ${muted ? 'text-ink-soft' : 'font-semibold text-navy'}`}>
        {value}
      </span>
    </div>
  )
}

function Chip({ Icon, children }: { Icon: typeof Users; children: React.ReactNode }) {
  return (
    <span className="text-[11px] px-2.5 py-1 rounded-full bg-cream-soft text-navy inline-flex items-center gap-1">
      <Icon className="w-3 h-3" /> {children}
    </span>
  )
}
