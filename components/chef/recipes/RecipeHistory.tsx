'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Eye, EyeOff, History, Loader2, RotateCcw } from 'lucide-react'
import { InfoPopover } from '@/components/shared/InfoPopover'
import { useToast } from '@/components/shared/Toaster'
import { ApiError } from '@/lib/api/client'
import { apiMessage } from '@/lib/api/messages'
import { useReheatModes, useStepTypes, useUnits, refLabel } from '@/lib/api/referentials'
import {
  useDishVersion,
  useDishVersions,
  useRestoreVersion,
  type Dish,
  type Step,
} from '@/lib/api/chef-catalog'
import { REHEAT_MODES, displayQuantity, reheatingLine, storageLine } from '@/lib/recipe-fields'

/* ─────────────────────────────────────────────────────────────────────────────
   L'historique d'une fiche (Recettes §9).

   Chaque version est la fiche telle qu'elle était quand une prestation a pu la
   réserver. On la lit sans rien changer, ou on la restaure : la fiche reprend
   son contenu, et les allergènes sont recalculés. L'API garde leur confirmation
   quand ils n'ont pas changé ; sinon, ils se confirment de nouveau.
   L'historique, lui, est conservé : restaurer ajoute une version, n'en efface
   aucune.

   Restaurer remplace le brouillon à l'écran, volontairement : le chef l'a
   demandé. Le formulaire s'en occupe (`onRestored`) ; ici on ne fait que
   demander, confirmer et dire les refus de l'API.
   ───────────────────────────────────────────────────────────────────────────── */

const dateLongue = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

export default function RecipeHistory({
  dish,
  lockVersion,
  dirty,
  disabled,
  onRestored,
  onConflict,
  onPending,
}: {
  dish: Dish
  /** La version lue de la fiche, renvoyée à la restauration. */
  lockVersion: number | undefined
  /** Des modifications non enregistrées seraient remplacées. */
  dirty: boolean
  /** Un conflit ou un enregistrement en cours : on ne restaure pas. */
  disabled: boolean
  /** La fiche rendue par la restauration, que le formulaire adopte. */
  onRestored: (restored: Dish) => void
  onConflict: () => void
  /** La restauration part (true) ou a répondu (false) : le formulaire se fige le temps de l'appel. */
  onPending: (pending: boolean) => void
}) {
  const versions = useDishVersions(dish.id)
  const restore = useRestoreVersion()
  const toast = useToast()
  const [viewing, setViewing] = useState<number | null>(null)
  const [confirming, setConfirming] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  /* La confirmation s'ouvre sous le bouton : le focus y va, pour qu'un lecteur d'écran
     l'annonce, et revient au bouton « Restaurer » si l'on renonce. */
  const panelRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (confirming !== null) panelRef.current?.focus()
  }, [confirming])
  const cancel = () => {
    setConfirming(null)
    const opener = openerRef.current
    if (opener?.isConnected) requestAnimationFrame(() => opener.focus())
  }

  function doRestore(version: number) {
    setError(null)
    onPending(true)
    restore.mutate(
      { id: dish.id, version, lockVersion },
      {
        onSettled: () => onPending(false),
        onSuccess: (res) => {
          setConfirming(null)
          onRestored(res)
          // L'API garde la confirmation quand les allergènes restaurés sont les mêmes.
          toast.success(
            `Version ${version} restaurée`,
            res.allergensVerifiedAt
              ? 'Les allergènes n’ont pas changé : leur confirmation est gardée.'
              : 'Les allergènes sont à confirmer de nouveau.',
          )
        },
        onError: (e) => {
          const code = e instanceof ApiError ? (e.body as { code?: unknown } | null)?.code : null
          if (e instanceof ApiError && e.status === 409 && code === 'RECIPE_CONFLICT') {
            setConfirming(null)
            onConflict()
            return
          }
          setError(apiMessage(e, 'La version n’a pas pu être restaurée.'))
        },
      },
    )
  }

  return (
    <section className="rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-5 lg:p-6">
      <h3 className="flex items-center gap-1 font-display text-base font-bold text-navy">
        <History className="h-4 w-4" aria-hidden />
        Historique
        <InfoPopover label="À quoi sert l’historique ?">
          Chaque version est la fiche telle qu’une prestation l’a cuisinée. Vous pouvez
          la relire, ou la restaurer : la fiche reprend son contenu, et les allergènes
          sont recalculés ; s’ils changent, ils sont à confirmer de nouveau. Rien n’est
          effacé de l’historique.
        </InfoPopover>
      </h3>

      {versions.isPending ? (
        <div className="mt-3 h-16 animate-pulse rounded-xl bg-cream-soft" />
      ) : versions.isError ? (
        <p role="alert" className="mt-3 text-[13px] leading-relaxed text-red-700">
          {apiMessage(versions.error, 'L’historique n’a pas pu être lu.')}
        </p>
      ) : versions.data.length === 0 ? (
        <p className="mt-2 text-[13px] leading-relaxed text-ink-mid">
          Pas encore de version : la première naît quand la fiche est Prête.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {versions.data.map((v) => (
            <li key={v.version} className="rounded-xl bg-cream-soft p-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
                <span className="font-semibold text-navy">Version {v.version}</span>
                {v.current && (
                  <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-semibold text-mint-ink">
                    en vigueur
                  </span>
                )}
                <span className="text-ink-mid">{dateLongue(v.createdAt)}</span>
                <span className="text-ink-soft">
                  {v.bookings === 0
                    ? 'aucune prestation'
                    : `${v.bookings} prestation${v.bookings > 1 ? 's' : ''}`}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setViewing(viewing === v.version ? null : v.version)}
                  aria-expanded={viewing === v.version}
                  className="btn btn-outline px-3 py-1.5 text-xs"
                >
                  {viewing === v.version ? (
                    <EyeOff className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {viewing === v.version ? 'Masquer' : 'Voir'}
                </button>
                {!v.current && (
                  <button
                    type="button"
                    onClick={(e) => {
                      setError(null)
                      openerRef.current = e.currentTarget
                      setConfirming(confirming === v.version ? null : v.version)
                    }}
                    disabled={disabled || restore.isPending}
                    className="btn btn-outline px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    Restaurer
                  </button>
                )}
              </div>

              {confirming === v.version && (
                <div
                  ref={panelRef}
                  role="alertdialog"
                  tabIndex={-1}
                  aria-label={`Restaurer la version ${v.version}`}
                  aria-describedby={`restore-${v.version}-text`}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' && !restore.isPending) {
                      e.preventDefault()
                      cancel()
                    }
                  }}
                  className="mt-2 rounded-xl border border-amber/40 bg-amber-soft/50 p-3 text-[13px] leading-relaxed text-[#6B4A00] outline-none focus-visible:ring-2 focus-visible:ring-amber"
                >
                  <p className="font-semibold">Restaurer la version {v.version} ?</p>
                  <p id={`restore-${v.version}-text`} className="mt-1">
                    La fiche prendra le contenu de cette version. Les allergènes seront
                    recalculés : s’ils changent, ils seront à confirmer de nouveau.
                    L’historique est conservé : rien n’est effacé.
                  </p>
                  {dirty && (
                    <p className="mt-1 font-semibold">
                      Vos modifications non enregistrées sur cette page seront remplacées.
                    </p>
                  )}
                  {error && (
                    <p role="alert" className="mt-1 flex items-start gap-1.5 font-semibold text-red-700">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      {error}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => doRestore(v.version)}
                      disabled={restore.isPending || disabled}
                      className="btn btn-primary px-3 py-1.5 text-xs disabled:opacity-55"
                    >
                      {restore.isPending && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      )}
                      Oui, restaurer
                    </button>
                    <button
                      type="button"
                      onClick={cancel}
                      disabled={restore.isPending}
                      className="btn btn-outline px-3 py-1.5 text-xs"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {viewing === v.version && <VersionContent dishId={dish.id} version={v.version} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Le contenu d'une version, en lecture seule, avec les mêmes quantités que la fiche. */
function VersionContent({ dishId, version }: { dishId: string; version: number }) {
  const q = useDishVersion(dishId, version)
  const units = useUnits()
  const stepTypes = useStepTypes()
  const reheatModes = useReheatModes(REHEAT_MODES)

  if (q.isPending) return <div className="mt-2 h-20 animate-pulse rounded-xl bg-paper" />
  if (q.isError) {
    return (
      <p role="alert" className="mt-2 text-[13px] text-red-700">
        {apiMessage(q.error, 'Cette version n’a pas pu être lue.')}
      </p>
    )
  }
  const v = q.data
  const reheat = reheatingLine(v.reheating, reheatModes)
  const storage = storageLine(v.storage)

  return (
    <div className="mt-2 space-y-3 rounded-xl bg-paper p-3 text-[13px] leading-relaxed text-ink-mid">
      <p className="text-xs text-ink-soft">
        Lecture seule · {v.portions} portion{v.portions > 1 ? 's' : ''}
      </p>

      <div>
        <p className="font-semibold text-navy">Ingrédients</p>
        {v.ingredients.length === 0 ? (
          <p>Aucun.</p>
        ) : (
          <ul className="mt-1 space-y-0.5">
            {v.ingredients.map((i, k) => (
              <li key={k}>
                <span className="tabular-nums">
                  {displayQuantity(i.qty ?? null, i.unit ?? null, units)}
                </span>{' '}
                {i.name}
                {i.preparation ? `, ${i.preparation}` : ''}
                {i.optional ? ' (facultatif)' : ''}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="font-semibold text-navy">Étapes</p>
        {v.steps.length === 0 ? (
          <p>Aucune.</p>
        ) : (
          <ol className="mt-1 list-decimal space-y-0.5 pl-5">
            {/* Une version d'avant le lot 2 peut porter des étapes en texte seul. */}
            {(v.steps as (Step | string)[]).map((raw, k) => {
              const s = typeof raw === 'string' ? { text: raw, type: null, durationMinutes: null } : raw
              return (
              <li key={k}>
                {s.text}
                {s.type && (
                  <span className="text-ink-soft"> · {refLabel(stepTypes, s.type)}</span>
                )}
                {s.durationMinutes != null && (
                  <span className="text-ink-soft"> · {s.durationMinutes} min</span>
                )}
              </li>
              )
            })}
          </ol>
        )}
      </div>

      {(reheat || v.reheating?.note) && (
        <p>
          <span className="font-semibold text-navy">Réchauffage</span> : {reheat ?? '—'}
          {v.reheating?.note ? ` — ${v.reheating.note}` : ''}
        </p>
      )}
      {(storage || v.storage?.freezable !== undefined) && (
        <p>
          <span className="font-semibold text-navy">Conservation</span> : {storage ?? '—'}
          {v.storage?.freezable === true &&
            ` · congelable${v.storage.freezerMonths ? ` ${v.storage.freezerMonths} mois` : ''}${v.storage.thawing ? ` (${v.storage.thawing})` : ''}`}
          {v.storage?.freezable === false && ' · non congelable'}
        </p>
      )}
    </div>
  )
}
