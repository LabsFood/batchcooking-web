import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { Note } from '@/components/chef/application/fields'
import { NO_SAP_CONTACT_LABEL, NO_SAP_CONTACT_SUFFIX, NO_SAP_MESSAGE } from '@/lib/chef/application'

/** Pas de déclaration SAP à son nom : pas d'embarquement, mais l'équipe accompagne. */
export function NoSapNote() {
  return (
    <Note tone="amber" icon={<AlertCircle className="h-4 w-4" />}>
      {NO_SAP_MESSAGE}{' '}
      <Link href="/contact" className="font-semibold underline underline-offset-2">
        {NO_SAP_CONTACT_LABEL}
      </Link>
      {NO_SAP_CONTACT_SUFFIX}
    </Note>
  )
}
