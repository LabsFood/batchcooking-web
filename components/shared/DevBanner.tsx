import { TriangleAlert } from 'lucide-react'

/* ─────────────────────────────────────────────────────────────────────────────
   Le bandeau « site en construction ».

   Trois batch cookers ont déposé une vraie candidature et ouvert leur espace,
   des clients se sont inscrits : le site a l'air fini, donc on s'y inscrit.
   Tant que l'ouverture n'est pas prononcée, il faut le dire là où la décision
   se prend — en haut de chaque page, espaces connectés compris, et pas dans
   une page « mentions » que personne n'ouvre.

   Le ton compte autant que le message : annoncer un chantier sans prévenir
   que les comptes peuvent disparaître laisserait quelqu'un bâtir son dossier
   pour rien. On dit les deux, en une phrase, et on donne où écrire.

   Il tient par une seule variable, `--lf-dev-banner` dans `globals.css` : la
   mettre à `0px` fait disparaître le bandeau **et** rend leur place aux
   en-têtes, sans toucher à un seul composant.
   ───────────────────────────────────────────────────────────────────────────── */

export default function DevBanner() {
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[60] flex h-[var(--lf-dev-banner)] items-center justify-center bg-navy px-4 text-white"
    >
      <p className="flex items-center gap-2 text-center text-[12px] leading-tight sm:text-[13px]">
        <TriangleAlert
          className="hidden h-3.5 w-3.5 shrink-0 text-amber sm:block"
          aria-hidden
        />
        <span>
          <span className="font-semibold text-amber">Site en construction.</span>{' '}
          <span className="text-white/75">
            {/* Deux lignes tiennent sur un téléphone ; la phrase entière, non. */}
            <span className="sm:hidden">Comptes d’essai, supprimables sans préavis.</span>
            <span className="hidden sm:inline">
              Les comptes créés ici sont des comptes d’essai et peuvent être
              supprimés sans préavis.
            </span>
          </span>{' '}
          <a
            href="mailto:contact@labsfood.fr"
            className="hidden underline decoration-white/40 underline-offset-2 transition-colors hover:text-amber hover:decoration-amber sm:inline"
          >
            Nous écrire
          </a>
        </span>
      </p>
    </div>
  )
}
