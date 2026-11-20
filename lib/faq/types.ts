/* ─────────────────────────────────────────────────────────────────────────────
   Le type des sources citées par les réponses du FAQ.

   Les catégories et le type `FAQItem` d'origine ont disparu avec la liste
   plate : la FAQ se range désormais par sections, et le type d'une question
   vit dans `sections.ts`, auprès des données. Une section sans question se
   voit tout de suite, là où une catégorie sans question affichait une liste
   vide — le problème que les catégories cherchaient à résoudre n'existe plus.
   ───────────────────────────────────────────────────────────────────────────── */

/** Un texte de loi ou une page officielle, affiché en lien sous la réponse. */
export interface FAQSource {
  label: string
  href: string
}
