import { redirect } from 'next/navigation'

// Page avantage fiscal volontairement masquée pour le moment.
// La section reste visible sur la home, le détail s'affiche désormais
// dans la modal AvantageFiscalModal via TaxCreditBanner.
export default function AvantageFiscalRedirect() {
  redirect('/#tax-credit')
}
