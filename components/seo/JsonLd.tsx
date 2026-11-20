/**
 * Injecte un bloc `application/ld+json`.
 *
 * `JSON.stringify` suffit à produire du JSON valide, mais pas à le rendre sûr
 * dans du HTML : une chaîne contenant `</script>` fermerait la balise. Le
 * remplacement ci-dessous échappe ce seul cas, sans toucher au contenu.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}
