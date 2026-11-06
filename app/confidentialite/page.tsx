import CookieSettings from '@/components/shared/CookieSettings'
import LegalLayout from '@/components/shared/LegalLayout'

export const metadata = {
  title: 'Politique de confidentialité',
  description:
    "Politique de confidentialité Lab's Food — collecte, usage et protection de vos données.",
}

export default function ConfidentialitePage() {
  return (
    <LegalLayout
      eyebrow="Vos données"
      title="Politique de confidentialité"
      subtitle="Comment Lab’s Food collecte, utilise et protège vos données personnelles."
      updatedAt="Mai 2026"
    >
      <p>
        Lab’s Food accorde une importance particulière à la protection de vos données
        personnelles. Cette politique a pour objet de vous informer en toute transparence
        sur les données collectées, leurs finalités, leur durée de conservation et les
        droits dont vous disposez.
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement des données collectées via le site labsfood.fr est{' '}
        <strong>Lab’s Food</strong>, entreprise individuelle de Ivy Siyaptze.
        <br />
        Email : contact@labsfood.fr
      </p>

      <h2>2. Données collectées</h2>
      <p>Nous collectons et traitons les données suivantes :</p>
      <ul>
        <li>Données d’identification : nom, prénom, email, téléphone.</li>
        <li>Données de réservation : adresse de la session, date, créneau, plats sélectionnés, allergies et préférences alimentaires.</li>
        <li>Données de facturation : montant, date et référence des prestations.</li>
        <li>Données techniques (logs serveur, type d’appareil) à des fins de sécurité et de bon fonctionnement.</li>
      </ul>

      <h2>3. Finalités</h2>
      <ul>
        <li>Gérer votre compte client et vos réservations.</li>
        <li>Adapter les recettes à vos goûts, allergies et restrictions alimentaires.</li>
        <li>Établir et conserver les factures à des fins comptables et légales.</li>
        <li>Communiquer avec vous (confirmations, rappels, support).</li>
        <li>Détecter et corriger les erreurs techniques du site.</li>
        <li>
          Avec votre consentement, mesurer l’audience du site pour améliorer le parcours
          de réservation.
        </li>
        <li>
          Avec votre consentement explicite, vous envoyer des informations marketing
          (newsletter hebdomadaire, offres saisonnières).
        </li>
      </ul>

      <h2>4. Base légale</h2>
      <p>
        Le traitement repose sur l’exécution du contrat (réservations, facturation), sur
        votre consentement (newsletter, mesure d’audience), sur nos obligations légales
        (conservation des factures), ou sur notre intérêt légitime à assurer le bon
        fonctionnement du site (diagnostic des erreurs techniques).
      </p>

      <h2>5. Durée de conservation</h2>
      <ul>
        <li>Données de compte : pendant toute la durée de la relation contractuelle, puis 3 ans après le dernier contact.</li>
        <li>Données de facturation : 10 ans (obligation comptable).</li>
        <li>Cookies : 13 mois maximum.</li>
      </ul>

      <h2>6. Destinataires</h2>
      <p>
        Vos données ne sont jamais revendues. Elles sont accessibles uniquement à Ivy
        Siyaptze et aux prestataires techniques strictement nécessaires : hébergement,
        paiement, diagnostic des erreurs (Sentry) et, si vous l’acceptez, mesure
        d’audience (PostHog). Sentry et PostHog hébergent ces données dans l’Union
        européenne. Tous nos partenaires sont contractuellement tenus à la confidentialité.
      </p>

      <h2>7. Vos droits</h2>
      <p>Conformément au RGPD, vous disposez à tout moment des droits suivants :</p>
      <ul>
        <li>Droit d’accès, de rectification et d’effacement de vos données.</li>
        <li>Droit à la limitation et à l’opposition du traitement.</li>
        <li>Droit à la portabilité de vos données.</li>
        <li>Droit de définir des directives sur le sort de vos données après votre décès.</li>
      </ul>
      <p>
        Pour exercer ces droits, écrivez-nous à <a href="mailto:contact@labsfood.fr">contact@labsfood.fr</a>{' '}
        en justifiant de votre identité. Nous répondons sous 30 jours. Vous pouvez également
        introduire une réclamation auprès de la <a href="https://www.cnil.fr" target="_blank" rel="noreferrer">CNIL</a>.
      </p>

      <h2 id="cookies">8. Cookies</h2>
      <p>
        Notre site utilise un nombre minimal de cookies. Aucun cookie publicitaire n’est
        déposé. Les seuls cookies déposés sans consentement sont strictement nécessaires au
        fonctionnement du site (préférences d’affichage, panier, authentification).
      </p>
      <p>
        Lors de votre première visite, un bandeau vous permet d’accepter ou de refuser la
        mesure d’audience. Elle utilise PostHog, hébergé dans l’Union européenne : pages
        vues et clics, sans le texte des pages ni ce que vous saisissez, rattachés à votre
        identifiant de compte si vous êtes connecté. Aucun cookie ni identifiant n’est
        déposé, et rien n’est envoyé, tant que vous n’avez pas accepté. Vous pouvez
        modifier votre choix à tout moment ci-dessous.
      </p>
      <CookieSettings />
      <p>
        Les erreurs techniques du site sont transmises à Sentry, hébergé dans l’Union
        européenne, pour être corrigées : le message d’erreur, la page concernée et votre
        identifiant de compte, sans nom, adresse ni e-mail. Ce diagnostic ne dépose aucun
        cookie.
      </p>

      <h2>9. Sécurité</h2>
      <p>
        Les données sont stockées sur des serveurs sécurisés (hébergement européen),
        chiffrement TLS sur le site, mots de passe hachés. Nous mettons en œuvre les
        mesures techniques et organisationnelles raisonnables pour empêcher tout accès non
        autorisé.
      </p>
    </LegalLayout>
  )
}
