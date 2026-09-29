import { redirect } from 'next/navigation'

// La reservation commence par le choix d'un batch cooker, comme sur /menu.
export default function PublicReservationRedirect() {
  redirect('/espace-client/reservation')
}
