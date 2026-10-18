'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import { Card } from './ChefPage'
import { useChefApplication } from '@/lib/api/chef-documents'
import { useMeProfile } from '@/lib/api/me-profile'
import type { ChefProfile } from '@/lib/api/types'

/* ─────────────────────────────────────────────────────────────────────────────
   Lecture seule avant approbation.

   L'API l'a documenté le 17/10 : **49 opérations répondent
   `403 CHEF_NOT_VERIFIED`** tant que le dossier n'est pas approuvé — tout
   `/chef/bookings`, l'agenda et les disponibilités, les offres de service, les
   devis, `PATCH /me/chef-profile`, et tout ce qui écrit un plat ou un menu.
   Les lectures, elles, restent ouvertes.

   Jusqu'ici l'écran le découvrait au clic. Le batch cooker remplissait un
   formulaire pour recevoir un 403 : le travail était perdu, et la raison
   illisible. Cette bannière le dit **avant**, et les boutons concernés se
   désactivent.

   La vérité vient de deux endroits qui disent la même chose : `isVerified` sur
   le profil, et le statut de la candidature. On attend les deux avant de
   conclure — annoncer « pas encore approuvé » à quelqu'un qui vient de l'être
   serait la pire des erreurs.
   ───────────────────────────────────────────────────────────────────────────── */

export function useChefApproved(): { approved: boolean; known: boolean } {
  const profil = useMeProfile()
  const application = useChefApplication()

  const moi =
    profil.data?.profileType === 'chef' ? (profil.data.profile as ChefProfile | null) : null
  const known = !profil.isPending || !application.isPending
  const approved = moi?.isVerified === true || application.data?.status === 'approved'

  return { approved, known }
}

/**
 * La bannière. Elle ne s'affiche que lorsqu'on **sait** que le dossier n'est
 * pas approuvé : pendant le chargement, l'écran reste muet plutôt que de
 * clignoter entre deux états.
 */
export default function ApprovalGate({ quoi }: { quoi: string }) {
  const { approved, known } = useChefApproved()
  if (approved || !known) return null

  return (
    <Card className="!border-amber/40 !bg-amber-soft/50">
      <p className="flex items-start gap-2 font-display text-base font-bold text-navy">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-deep" aria-hidden />
        {quoi} après validation de votre dossier
      </p>
      <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-ink-mid">
        Vous pouvez tout consulter, mais rien enregistrer tant que l’équipe n’a
        pas validé vos pièces. C’est une règle de l’API, pas un réglage de cet
        écran : elle refuserait l’enregistrement.
      </p>
      <Link href="/espace-chef/dossier" className="btn btn-outline mt-3 text-xs">
        Voir où en est mon dossier
      </Link>
    </Card>
  )
}
