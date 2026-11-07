'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useToast } from '@/components/shared/Toaster'
import {
  blockingBookings,
  deletionMessage,
  useDeleteMyAccount,
  type BlockingBooking,
} from '@/lib/api/account'
import { track } from '@/lib/analytics'

/* ─────────────────────────────────────────────────────────────────────────────
   « Supprimer mon compte », du bouton jusqu'au bout.

   Jusqu'ici ce bouton ne faisait rien, et c'était le pire des deux mondes : il
   promettait un départ possible sans le permettre. Il appelle maintenant
   `DELETE /me`, et parce que rien ne ramènera le compte, il demande
   confirmation en nommant ce qui va se passer — pas après, avant.

   Trois issues à distinguer, parce qu'elles ne veulent pas dire la même chose :

   - le compte part entièrement ;
   - des prestations passées le référencent, il reste alors anonymisé — on le
     dit, sinon la personne croira que sa demande a échoué ;
   - une prestation est encore ouverte : l'API refuse et liste lesquelles.

   Après une suppression réussie, la session Clerk n'a plus d'objet : on la
   ferme et on repart à l'accueil. Sans ça, l'écran suivant appellerait `/me`
   avec un jeton dont le compte n'existe plus.
   ───────────────────────────────────────────────────────────────────────────── */

export default function DeleteMyAccount() {
  const toast = useToast()
  const router = useRouter()
  const { signOut } = useClerk()
  const supprimer = useDeleteMyAccount()
  const [ouvert, setOuvert] = useState(false)

  const refus = blockingBookings(supprimer.error)
  const autreRefus =
    supprimer.error && refus === null ? deletionMessage(supprimer.error) : null

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        disabled={supprimer.isPending}
        className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
      >
        {supprimer.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        )}
        Supprimer mon compte
      </button>

      {refus && refus.length > 0 && (
        <div className="mt-4 w-full rounded-2xl border border-red-300 bg-paper px-4 py-3.5">
          <p className="flex items-start gap-2 text-[13px] font-semibold text-red-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {refus.length} prestation{refus.length > 1 ? 's' : ''} encore ouverte
            {refus.length > 1 ? 's' : ''}
          </p>
          <ul className="mt-2 space-y-1 text-[12px] text-ink-mid">
            {refus.map((b, i) => (
              <li key={b.id ?? i}>{ligne(b)}</li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
            Annulez-les ou attendez qu’elles soient terminées, depuis Mes
            commandes, puis revenez ici.
          </p>
        </div>
      )}

      {autreRefus && (
        <p role="alert" className="mt-4 w-full text-[13px] leading-relaxed text-red-700">
          {autreRefus}
        </p>
      )}

      <ConfirmDialog
        open={ouvert}
        onClose={() => setOuvert(false)}
        onConfirm={() =>
          supprimer.mutate(undefined, {
            onSuccess: async (r) => {
              track('account_deletion_completed', { outcome: r.outcome })
              setOuvert(false)
              toast.success(
                r.outcome === 'anonymised'
                  ? 'Votre compte a été anonymisé'
                  : 'Votre compte a été supprimé',
                r.outcome === 'anonymised'
                  ? 'Des prestations passées le référençaient : la ligne reste, vidée de vos coordonnées.'
                  : 'Vous ne pouvez plus vous connecter avec cet email.',
              )
              await signOut()
              router.push('/')
            },
            onError: () => setOuvert(false),
          })
        }
        pending={supprimer.isPending}
        tone="danger"
        title="Supprimer votre compte ?"
        lead="Votre accès est supprimé : vous ne pourrez plus vous connecter avec cet email, et rien ne le ramènera."
        detail="Si des prestations passées vous référencent, votre ligne reste mais vidée de votre nom, de votre email et de votre téléphone. Tant qu’une prestation est en cours, la suppression est refusée et nous vous dirons laquelle."
        confirmLabel="Supprimer définitivement"
      />
    </>
  )
}

/** « BK-1042 · 3 novembre · confirmée · comme client » — ce qu'il faut pour la retrouver. */
function ligne(b: BlockingBooking): string {
  const bouts = [b.reference ?? b.id]
  if (b.startsAt) {
    bouts.push(
      new Date(b.startsAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
      }),
    )
  }
  if (b.status) bouts.push(STATUT[b.status] ?? b.status)
  if (b.role) bouts.push(b.role === 'chef' ? 'comme batch cooker' : 'comme client')
  return bouts.join(' · ')
}

const STATUT: Record<string, string> = {
  pending: 'à régler',
  confirmed: 'confirmée',
  shopping: 'courses en cours',
  cooking: 'en cuisine',
  delivered: 'livrée',
}
