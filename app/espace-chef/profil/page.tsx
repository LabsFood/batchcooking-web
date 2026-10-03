import { redirect } from 'next/navigation'

// Le profil et les pièces ne font plus qu'un écran : ce sont les réponses de
// la candidature qui décident des pièces demandées.
export default function ProfilRedirect() {
  redirect('/espace-chef/dossier')
}
