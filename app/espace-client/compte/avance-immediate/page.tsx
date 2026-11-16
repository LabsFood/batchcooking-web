'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import DossierUrssaf from '@/components/client/DossierUrssaf'

/** Le dossier URSSAF, en page à part : la liste « Bien démarrer » et le paiement y renvoient. */
export default function AvanceImmediatePage() {
  return (
    <div className="space-y-5">
      <Link
        href="/espace-client/compte"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Mon compte
      </Link>
      <DossierUrssaf />
    </div>
  )
}
