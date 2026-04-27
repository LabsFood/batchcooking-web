import { redirect } from 'next/navigation'

export default function PublicReservationRedirect() {
  redirect('/espace-client/menus?reserve=1')
}
