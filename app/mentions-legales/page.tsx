import Link from 'next/link'

import LegalLayout from '@/components/shared/LegalLayout'
import LegalPdfLink from '@/components/shared/LegalPdfLink'

export const metadata = {
  title: 'Mentions légales',
  description: "Mentions légales de la plateforme Lab's Food.",
}

/* Version 1.0, en vigueur au 21/11/2026 (Drive « 3. Mentions légales_V1_FINALE »). */
export default function MentionsLegalesPage() {
  return (
    <LegalLayout
      eyebrow="Informations"
      title="Mentions légales"
      subtitle="Éditeur, hébergement, fonctionnement de la plateforme, médiation."
      updatedAt="Version 1.0 — en vigueur au 21 novembre 2026"
    >
      <LegalPdfLink file="mentions-legales-1.0.pdf" />
      <p>
        Conformément aux articles 1-1 et 19 de la loi n° 2004-575 du 21 juin 2004 pour la
        confiance dans l’économie numérique (LCEN), les informations suivantes sont portées
        à la connaissance des utilisateurs de la plateforme LAB’S FOOD.
      </p>

      <h2>1. Éditeur de la Plateforme</h2>
      <p>
        La plateforme accessible à l’adresse www.labsfood.fr et ses applications (la
        « Plateforme ») sont éditées par :
      </p>
      <ul>
        <li>Dénomination sociale : LAB’S FOOD - BATCHCOOKING</li>
        <li>Forme juridique : société par actions simplifiée unipersonnelle (SASU)</li>
        <li>Capital social : 8 000 euros</li>
        <li>Siège social : 200 rue de la Croix Nivert, 75015 Paris, France</li>
        <li>Immatriculation : RCS de Paris n° 131 895 203</li>
        <li>Numéro SIRET : 131 895 203 00019</li>
        <li>Code APE : 96.09Z</li>
        <li>Numéro de TVA intracommunautaire : FR20 131 895 203</li>
        <li>
          Adresse e-mail : <a href="mailto:contact@labsfood.fr">contact@labsfood.fr</a>
        </li>
        <li>
          Téléphone : <a href="tel:+33749755684">07 49 75 56 84</a>
        </li>
        <li>Réseaux sociaux : Instagram @labs_food</li>
      </ul>
      <p>
        Dans la suite du document, « LAB’S FOOD » désigne la société LAB’S FOOD -
        BATCHCOOKING.
      </p>

      <h2>2. Directrice de la publication</h2>
      <p>
        Ivy Lafortune SIYAPTZE NYANDA, en qualité de Présidente de LAB’S FOOD - BATCHCOOKING
        SAS.
      </p>

      <h2>3. Hébergement</h2>
      <p>
        La Plateforme est hébergée par Railway Corp., 2261 Market Street #4371, San
        Francisco, CA 94114, États-Unis (team@railway.com, +1 415 707 7675). Données
        localisées dans l’Union européenne (Pays-Bas, Amsterdam).
      </p>

      <h2>4. Activité de LAB’S FOOD</h2>
      <p>
        LAB’S FOOD exploite une plateforme en ligne de mise en relation entre des
        particuliers et des cuisiniers professionnels indépendants spécialisés dans le batch
        cooking à domicile (les « Batch Cookers »). Elle fournit également aux Batch Cookers
        des outils en ligne, dont un module de création de recettes assisté par
        intelligence artificielle.
      </p>
      <p>
        LAB’S FOOD est un opérateur de plateforme en ligne au sens de l’article L.111-7 du
        Code de la consommation. Elle n’est pas le prestataire des prestations de batch
        cooking, qui sont réalisées par les Batch Cookers en leur nom et pour leur propre
        compte, sauf pour les prestations que LAB’S FOOD propose elle-même et qui sont
        clairement identifiées comme telles.
      </p>
      <p>
        Les informations légales de chaque Batch Cooker (identité, statut, numéro SIREN,
        numéro de déclaration de services à la personne le cas échéant, assurance,
        médiateur) figurent sur sa page Vitrine.
      </p>

      <h2 id="fonctionnement">5. Comment fonctionne la Plateforme</h2>
      <p>
        Cette rubrique répond aux obligations d’information des articles L.111-7 et D.111-7
        et suivants du Code de la consommation.
      </p>
      <p>
        <strong>5.1 Qui réalise les prestations ?</strong> Les prestations sont réalisées
        par des Batch Cookers professionnels indépendants, vérifiés par LAB’S FOOD
        (immatriculation, assurance, attestation de vigilance URSSAF, formation à
        l’hygiène). Le contrat de prestation est conclu directement entre le client et le
        Batch Cooker. Le client bénéficie, à l’égard du Batch Cooker, des droits prévus par
        le Code de la consommation, notamment le droit de rétractation et la responsabilité
        de plein droit du professionnel.
      </p>
      <p>
        <strong>5.2 Rôle de LAB’S FOOD.</strong> LAB’S FOOD met en relation, conclut les
        réservations au nom des Batch Cookers, établit les factures pour leur compte et
        organise le paiement par un prestataire de paiement agréé. Lorsque le client choisit
        l’option Courses, LAB’S FOOD est son mandataire pour l’achat des courses, qui sont
        refacturées au coût exact, sans marge.
      </p>
      <p>
        <strong>5.3 Comment LAB’S FOOD est rémunérée.</strong> LAB’S FOOD est rémunérée par
        les Batch Cookers, soit par une commission sur chaque prestation, soit par un
        abonnement mensuel ou annuel. Les clients ne paient aucun frais de service à LAB’S
        FOOD à la date de mise à jour du présent document.
      </p>
      <p>
        <strong>5.4 Classement des Batch Cookers.</strong> Les résultats de recherche sont
        classés selon des critères objectifs décrits à l’article 10 des{' '}
        <Link href="/cgu">Conditions Générales d’Utilisation</Link> (zone, disponibilité,
        adéquation avec les préférences, avis, réactivité, complétude du profil). Aucun
        Batch Cooker ne paie pour être mieux classé. Il n’existe aucun lien capitalistique
        entre LAB’S FOOD et les Batch Cookers.
      </p>
      <p>
        <strong>5.5 Avis.</strong> Seuls les clients ayant réellement bénéficié d’une
        prestation réservée sur la Plateforme peuvent publier un avis. Les règles de
        contrôle, de publication et de classement des avis figurent à l’article 9 des
        Conditions Générales d’Utilisation.
      </p>
      <p>
        <strong>5.6 Obligations fiscales et sociales.</strong> Les sommes perçues par les
        Batch Cookers par l’intermédiaire de la Plateforme sont des revenus professionnels
        soumis à l’impôt et aux cotisations sociales. Informations :{' '}
        <a
          href="https://www.impots.gouv.fr/sites/default/files/media/1_metier/2_professionnel/procedure_en_ligne_professionnels.pdf"
          target="_blank"
          rel="noreferrer"
        >
          impots.gouv.fr
        </a>{' '}
        et{' '}
        <a
          href="https://www.urssaf.fr/accueil/services/economie-collaborative.html"
          target="_blank"
          rel="noreferrer"
        >
          urssaf.fr
        </a>
        .
      </p>

      <h2>6. Point de contact et signalement de contenus</h2>
      <p>
        <strong>6.1 Point de contact unique.</strong> Conformément aux articles 11 et 12 du
        règlement (UE) 2022/2065 sur les services numériques, LAB’S FOOD a désigné un point
        de contact unique pour les autorités et les utilisateurs :{' '}
        <a href="mailto:signalement@labsfood.fr">signalement@labsfood.fr</a>. Langues
        acceptées : français et anglais.
      </p>
      <p>
        <strong>6.2 Signaler un contenu illicite.</strong> Tout contenu que vous estimez
        illicite peut être signalé par le bouton « Signaler » présent sur chaque contenu ou
        par e-mail à signalement@labsfood.fr, en précisant le contenu concerné, son adresse
        (URL), les raisons du signalement et vos coordonnées. La procédure est décrite à
        l’article 8 des Conditions Générales d’Utilisation.
      </p>

      <h2>7. Propriété intellectuelle</h2>
      <p>
        La marque LAB’S FOOD, le logo, la Plateforme, son code, son design, ses textes, ses
        visuels, la bibliothèque de recettes et les recettes générées par son module
        d’intelligence artificielle sont la propriété de LAB’S FOOD. Ils sont protégés par
        le Code de la propriété intellectuelle et par le secret des affaires.
      </p>
      <p>
        Toute reproduction, représentation, adaptation, extraction ou réutilisation, totale
        ou partielle, sans autorisation écrite préalable de LAB’S FOOD est interdite et
        constitue une contrefaçon sanctionnée par les articles L.335-2 et suivants du Code
        de la propriété intellectuelle.
      </p>
      <p>
        Conformément à l’article L.122-5-3 du Code de la propriété intellectuelle, LAB’S
        FOOD s’oppose à toute fouille de textes et de données sur la Plateforme, notamment
        pour l’entraînement de systèmes d’intelligence artificielle.
      </p>

      <h2>8. Crédits</h2>
      <ul>
        <li>Photographies : Unsplash et Lab’s Food.</li>
        <li>
          Visuels générés par intelligence artificielle : signalés par la mention « Visuel
          généré par IA ».
        </li>
        <li>
          Polices de caractères : Fraunces, DM Mono et Montserrat, sous licence SIL Open
          Font License.
        </li>
        <li>Conception et développement : LAB’S FOOD.</li>
      </ul>

      <h2>9. Liens hypertextes</h2>
      <p>
        La Plateforme peut contenir des liens vers des sites tiers. LAB’S FOOD n’exerce
        aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu.
        La création d’un lien vers la Plateforme est libre, à condition de ne pas porter
        atteinte à l’image de LAB’S FOOD et de ne pas faire croire à un partenariat
        inexistant. LAB’S FOOD peut demander la suppression d’un lien à tout moment.
      </p>

      <h2>10. Données personnelles et cookies</h2>
      <p>
        LAB’S FOOD traite des données personnelles conformément au règlement (UE) 2016/679
        (RGPD) et à la loi Informatique et Libertés. Les informations sur les traitements,
        les cookies et vos droits figurent dans la{' '}
        <Link href="/confidentialite">Politique de confidentialité</Link>. Pour toute
        question ou pour exercer vos droits :{' '}
        <a href="mailto:dpo@labsfood.fr">dpo@labsfood.fr</a>. Vous pouvez introduire une
        réclamation auprès de la CNIL (www.cnil.fr).
      </p>

      <h2>11. Médiation de la consommation</h2>
      <p>
        Conformément aux articles L.612-1 et suivants du Code de la consommation, LAB’S FOOD
        adhère au service de médiation suivant : La Société Médiation Professionnelle,{' '}
        <a href="http://www.mediateur-consommation-smp.fr" target="_blank" rel="noreferrer">
          www.mediateur-consommation-smp.fr
        </a>
        , Alteritae, 5 rue Salvaing, 12000 Rodez.
      </p>
      <p>
        Pour un litige portant sur la Prestation : le médiateur du Batch Cooker, indiqué sur
        sa Vitrine et dans l’e-mail de confirmation, ou via une demande à l’équipe de
        support de LAB’S FOOD.
      </p>

      <h2>12. Accessibilité</h2>
      <p>
        LAB’S FOOD s’efforce de rendre la Plateforme accessible à tous, y compris aux
        personnes en situation de handicap. Pour signaler une difficulté d’accès :
        contact@labsfood.fr.
      </p>

      <h2>13. Droit applicable</h2>
      <p>
        Les présentes mentions légales sont soumises au droit français, sans préjudice des
        dispositions impératives de protection des consommateurs applicables dans l’État
        membre de résidence du Client lorsque celui-ci réside dans un autre État membre de
        l’Union européenne (article 6 du règlement (CE) n° 593/2008 dit « Rome I »).
      </p>
    </LegalLayout>
  )
}
