'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Check, Eye, Loader2, Save } from 'lucide-react'
import { useToast } from '@/components/shared/Toaster'
import { apiMessage } from '@/lib/api/messages'
import { Skeleton, SkeletonGroup } from '@/components/shared/Skeleton'
import { useMenus, useSetShowcaseWeeks, useShowcaseWeeks } from '@/lib/api/chef-catalog'
import { useChefShowcase } from '@/lib/api/menus'

/* ─────────────────────────────────────────────────────────────────────────────
   La vitrine du mois : quel menu est montré, semaine par semaine.

   Les deux routes existaient depuis le début sans qu'aucun écran ne les
   appelle. Un batch cooker ne pouvait donc pas choisir ce que sa page publique
   montre — c'était décidé pour lui, ou rien.

   Deux lectures côte à côte, et c'est tout l'intérêt de l'écran :

   - `GET /me/showcase/weeks` dit ce qu'il a **affecté** ;
   - `GET /chefs/{id}/showcase` dit ce qu'un client **voit**.

   Elles diffèrent dès qu'un menu programmé n'est pas publié : la semaine vaut
   `null` côté public. Un batch cooker qui a programmé un brouillon croit avoir
   une vitrine et n'en a pas. On le lui dit, semaine par semaine, plutôt que de
   lui laisser découvrir le vide.
   ───────────────────────────────────────────────────────────────────────────── */

const lundi = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

export default function VitrineDuMois({
  chefProfileId,
  enLigne,
}: {
  chefProfileId: string
  /** Sans vitrine publique, la colonne « ce que voit un client » n'a pas de sens. */
  enLigne: boolean
}) {
  const toast = useToast()
  const semaines = useShowcaseWeeks()
  const menus = useMenus()
  const publique = useChefShowcase(enLigne ? chefProfileId : undefined)
  const enregistrer = useSetShowcaseWeeks()

  /** Les changements en attente : `weekStart` → `menuId` ou `null`. */
  const [brouillon, setBrouillon] = useState<Record<string, string | null>>({})

  const lignes = semaines.data?.weeks ?? []
  const catalogue = menus.data ?? []

  const vuPublic = useMemo(() => {
    const m = new Map<string, string | null>()
    for (const w of publique.data?.weeks ?? []) m.set(w.weekStart, w.menu?.id ?? null)
    return m
  }, [publique.data])

  const choisi = (w: string, actuel: string | null) =>
    w in brouillon ? brouillon[w] : actuel

  const modifie = Object.keys(brouillon).length > 0

  function sauver() {
    const assignments = Object.entries(brouillon).map(([weekStart, menuId]) => ({
      weekStart,
      menuId,
    }))
    enregistrer.mutate(assignments, {
      onSuccess: () => {
        setBrouillon({})
        toast.success(
          'Vitrine mise à jour',
          'Les clients voient ces menus sur votre page.',
        )
      },
      onError: (e) =>
        toast.error('Vitrine inchangée', apiMessage(e, 'L’enregistrement a été refusé.')),
    })
  }

  if (semaines.isPending) {
    return (
      <SkeletonGroup>
        <Skeleton className="h-40 rounded-2xl" />
      </SkeletonGroup>
    )
  }

  if (semaines.isError) {
    return (
      <p className="text-sm text-ink-mid">
        {apiMessage(semaines.error, 'Vos semaines n’ont pas pu être chargées.')}
      </p>
    )
  }

  return (
    <div>
      <p className="text-[13px] leading-relaxed text-ink-soft">
        Le menu que votre page publique met en avant, semaine par semaine. Seul
        un menu <strong className="font-semibold text-navy">publié</strong> est
        visible d’un client.
      </p>

      <ul className="mt-4 divide-y divide-[rgba(31,42,55,0.06)]">
        {lignes.map((w) => {
          const valeur = choisi(w.weekStart, w.menu?.id ?? null)
          const menu = catalogue.find((m) => m.id === valeur)
          const brouillonProgramme = menu != null && menu.status !== 'published'
          const vide = enLigne && vuPublic.get(w.weekStart) === null && valeur !== null

          return (
            <li
              key={w.weekStart}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-navy">
                  Semaine du {lundi(w.weekStart)}
                </p>
                {(brouillonProgramme || vide) && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#8A6212]">
                    <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                    Ce menu n’est pas publié : vos clients ne verront rien cette
                    semaine-là.
                  </p>
                )}
              </div>

              <select
                value={valeur ?? ''}
                onChange={(e) =>
                  setBrouillon((b) => ({
                    ...b,
                    [w.weekStart]: e.target.value || null,
                  }))
                }
                className="input-base w-full max-w-[18rem] text-sm"
                aria-label={`Menu de la semaine du ${lundi(w.weekStart)}`}
              >
                <option value="">Aucun menu</option>
                {catalogue.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                    {m.status !== 'published' ? ' — brouillon' : ''}
                  </option>
                ))}
              </select>
            </li>
          )
        })}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={sauver}
          disabled={!modifie || enregistrer.isPending}
          className="btn btn-primary text-sm disabled:opacity-50"
        >
          {enregistrer.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Save className="h-4 w-4" aria-hidden />
          )}
          Enregistrer ma vitrine
        </button>

        {!modifie && !enregistrer.isPending && (
          <span className="flex items-center gap-1.5 text-[13px] text-ink-soft">
            <Check className="h-3.5 w-3.5 text-mint-ink" aria-hidden />
            À jour
          </span>
        )}
      </div>

      {enLigne && publique.isError && (
        <p className="mt-3 flex items-start gap-2 text-[13px] leading-relaxed text-ink-soft">
          <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Votre page publique n’est pas encore accessible : nous ne pouvons pas
          vous montrer ce qu’un client en voit.
        </p>
      )}
    </div>
  )
}
