import LegalLayout from '@/components/shared/LegalLayout'

export const metadata = {
  title: 'Mentions légales',
  description: "Mentions légales du site Lab's Food.",
}

export default function MentionsLegalesPage() {
  return (
    <LegalLayout
      eyebrow="Informations"
      title="Mentions légales"
      subtitle="Identification de l’éditeur du site, hébergement et propriété intellectuelle."
      updatedAt="Mai 2026"
    >
      <h2>1. Éditeur du site</h2>
      <p>
        Le site labsfood.fr est édité par <strong>Lab’s Food</strong>, entreprise
        individuelle de <strong>SIYAPTZE Ivy</strong>.
      </p>
      <ul>
        <li>SIRET : <em>en cours d’immatriculation</em></li>
        <li>Adresse postale : <em>communiquée sur demande</em></li>
        <li>Email : contact@labsfood.fr</li>
        <li>Code APE : 56.21Z</li>
        <li>Directrice de la publication : Ivy Siyaptze</li>
      </ul>

      <h2>2. Hébergement</h2>
      <p>
        Le site est hébergé par <strong>Vercel Inc.</strong>, 340 S Lemon Ave #4133, Walnut,
        CA 91789, USA — <a href="https://vercel.com" target="_blank" rel="noreferrer">vercel.com</a>.
      </p>

      <h2>3. Propriété intellectuelle</h2>
      <p>
        L’ensemble des contenus du site (textes, photographies, illustrations, logos,
        marques) sont la propriété de Lab’s Food ou de ses partenaires. Toute reproduction,
        représentation, modification ou exploitation, totale ou partielle, sans autorisation
        écrite préalable est interdite.
      </p>

      <h2>4. Crédits</h2>
      <ul>
        <li>Photographies d’illustration : Unsplash et Lab’s Food.</li>
        <li>Icônes : Lucide.</li>
        <li>Polices : Fraunces, Montserrat, DM Mono (Google Fonts).</li>
      </ul>

      <h2>5. Liens externes</h2>
      <p>
        Le site peut contenir des liens vers des sites tiers. Lab’s Food n’exerce aucun
        contrôle sur le contenu de ces sites et ne saurait être tenue pour responsable de
        leur contenu.
      </p>

      <h2>6. Contact</h2>
      <p>
        Pour toute question relative aux présentes mentions, écrivez-nous à{' '}
        <a href="mailto:contact@labsfood.fr">contact@labsfood.fr</a>.
      </p>
    </LegalLayout>
  )
}
