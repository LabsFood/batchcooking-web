/**
 * La version PDF d'un document légal V1 : copie à l'identique de
 * `LF-BackEnd/apps/src/assets/legal`, qui fait foi (c'est elle que portent les
 * e-mails de contrat). À chaque nouvelle version, les deux fichiers changent ensemble.
 */
export default function LegalPdfLink({ file }: { file: string }) {
  return (
    <p>
      <a href={`/legal/${file}`} target="_blank" rel="noreferrer" download>
        Télécharger en PDF
      </a>
    </p>
  )
}
