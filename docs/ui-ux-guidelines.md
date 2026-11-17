# Guidelines UI/UX — site public et espaces connectés

Règles à tenir pour tout écran de `batchcooking-web`. Elles servent à relire une
PR : chaque ligne se vérifie à l'œil ou avec un `grep`. La charte de marque
(couleurs de marque, typographie) vit sur `/brand`
([BrandGuidelines.tsx](../components/shared/BrandGuidelines.tsx)) : on n'y
revient pas ici. Ce document dit **comment on s'en sert à l'écran**.

La console d'administration (`admin-dashboard`) a son propre document et sa
propre palette, volontairement différente. Ne jamais copier des valeurs de l'un
à l'autre.

## 1. Le budget de mouvement dépend de la fréquence d'usage

| Surface | Fréquence | Budget |
|---|---|---|
| Pages publiques (accueil, menu, à propos) | une fois | expressif : une entrée soignée par section, rien en boucle |
| Réservation, paiement | rare, enjeu fort | un seul moment marqué (confirmation) + retours précis |
| Espaces client et batch cooker | tous les jours | quasi nul : fondu court, retours d'action, pas d'entrée décorative |

Si on hésite entre « joli » et « rapide », on prend rapide.

## 2. Mouvement

- **Durées** : 120–240 ms pour l'interface, 400 ms au plus pour une entrée de
  hero. Aucun délai devant un CTA (seuil de Doherty : l'écran répond en moins de
  400 ms).
- **Courbes** : tout vient de `lib/motion.ts`. Entrée = ralentit à l'arrivée
  (slow-out), sortie = accélère (slow-in), déplacement = les deux. Pas de
  `linear` hors loaders.
- **Appui** : un bouton ou une pastille enfoncée se comprime à `0.97` et revient
  (squash). Le survol ne fait pas décoller l'élément.
- **Anticipation** : seulement sur le paiement et les actions destructives.
- **Suite du geste et exagération** : seulement pour la réussite ou l'échec d'une
  action (coche de confirmation, champ invalide qui vibre une fois).
- **Une action secondaire par interaction** (la flèche du CTA qui avance de 2 px),
  jamais deux.
- **Mise en scène** : une seule chose bouge à la fois ; derrière un dialogue ou un
  tiroir, on assombrit.
- **Pas de boucle décorative** (`repeat: Infinity`) hors indicateurs de chargement.
- **`prefers-reduced-motion`** : `MotionConfig reducedMotion="user"` est posé dans
  `Providers`, et toute animation CSS porte `motion-reduce:animate-none`.
- **Commenter chaque bloc de mouvement** d'une ligne qui nomme le principe et la
  durée : `// slow-out : se pose en 180 ms`. Sans commentaire, on le supprime.
- Écartés volontairement : pose-to-pose, trajectoires en arc, dessin 3D.

## 3. Lois d'UX

- **Fitts** : toute cible fait au moins 40 × 40 px. On agrandit la zone
  cliquable (`.hit`, pseudo-élément) sans grossir le dessin.
- **Hick et Miller** : navigation en 4 à 5 groupes, 5 tuiles de chiffres au plus
  par rangée, étapes de réservation en 3.
- **Jacob** : on garde les conventions (panier, stepper, fil d'Ariane). On
  n'invente pas un schéma de plus.
- **Postel** : les champs téléphone, date et heure acceptent ce que les gens
  tapent (`06 12…`, `+33…`, `3/11`), puis normalisent.
- **Doherty** : tout ce qui dépasse 400 ms montre un squelette ou un état
  d'attente, jamais un écran figé.

## 4. Anti-slop : ce qu'on ne met pas

- Pas de pastille ou badge décoratif ; un badge dit un **statut**.
- Pas d'étiquette qui répète le titre qu'elle surmonte (eyebrow redondant).
- Pas de mot italique en couleur dans un titre.
- Pas de mono hors identifiants, références, numéros de facture et heures.
- Pas d'icône `Sparkles` ou « magie » décorative.
- Pas d'ornement : grille de points, feuille, ingrédients flottants, texte qui
  tourne, reflet qui balaie un bouton.
- On groupe avec l'**espacement**, pas avec des filets et des séparateurs.
- **Un seul CTA principal** par vue. Le secondaire est un lien texte.
- L'accent (ambre) sert au CTA et à **une** donnée à mettre en avant, pas aux
  puces, scrollbars et mots de titre.
- Icônes : `lucide-react` uniquement, deux tailles (16 et 20 px), un seul trait.
- Un titre est **précis** (chiffre, lieu, bénéfice) et se coupe proprement :
  `text-wrap: balance`, pas de `<br />` forcé.
- On montre le **vrai produit** (une vraie carte de menu, un vrai récap) et on
  agrandit la fonction principale de l'écran.
- On aligne à l'œil : flèches, icônes à côté de texte et triangles se corrigent
  de 1 px quand le calcul donne un faux équilibre.

## 5. Système visuel

- **Rayons concentriques** : rayon intérieur = rayon extérieur − padding. Une
  image dans une carte `rounded-2xl p-3` prend `rounded-xl`, pas `rounded-2xl`.
- **Pilules** (`rounded-full`) : avatars, statuts, interrupteurs. Pas les cartes,
  pas les boutons de formulaire.
- **Contraste** : texte courant ≥ 4,5:1, grand texte ≥ 3:1. Le texte ambre sur
  clair passe par `--amber-ink`, jamais `--amber`. Un bouton ambre porte du texte
  marine.
- **Chiffres** : `tabular-nums` sur tout ce qui se compare ou s'aligne
  (prix, totaux, dates, compteurs). Vérifier que la police sert bien `tnum`.
- **Tailles** : pas de texte porteur de sens sous 12 px.
- **Prix** : toujours via [Prix.tsx](../components/shared/Prix.tsx) (reste à
  charge d'abord, total dessous).

## 6. États : chargement, vide, erreur

Tout écran qui lit des données a ses trois états. Aucun n'est un spinner seul.

- **Chargement = squelette** de la forme finale, via
  [Skeleton.tsx](../components/shared/Skeleton.tsx). Même hauteur et même grille
  que le contenu : zéro décalage de mise en page.
- Fond du squelette : `cream-deep` (déjà dans `Skeleton`), qui se voit sur le
  blanc d'une carte. Les pages connectées reposent sur `--shell` : les blocs
  vont dans un `SkeletonCard` blanc, jamais nus. `cream-soft` ne se voit ni sur
  `paper` ni sur `--shell`.
- Chaque squelette est `aria-hidden` ; son conteneur porte `role="status"` et
  `aria-busy` avec un « Chargement » réservé aux lecteurs d'écran
  (`SkeletonGroup`).
- Statique en `prefers-reduced-motion`.
- Au-delà de 12 s, on propose une issue (`lib/use-too-long.ts`).
- **Routes** : `loading.tsx` et `error.tsx` à la racine de `espace-client/` et
  `espace-chef/`. Un `Suspense` n'a jamais `fallback={null}`.
- **Boutons d'action** : état « en cours » visible, désactivé, texte conservé.
- **Actions fréquentes** (message, disponibilité, statut) : mise à jour
  optimiste, retour arrière si l'API refuse.
- **Vide** et **erreur** disent quoi faire ensuite, avec un bouton.

## 7. Tokens de ce front

Source : `:root` dans [app/globals.css](../app/globals.css) et
[tailwind.config.ts](../tailwind.config.ts). Les classes `.text-*` / `.bg-*` de
`@layer utilities` (`globals.css`, vers la ligne 680) redéfinissent certaines
couleurs : un changement de valeur se fait aux deux endroits.

| Rôle | Token | Valeur |
|---|---|---|
| Texte | `--ink` | `#1F2A37` |
| Texte secondaire | `--ink-mid` | `#4B5867` |
| Texte discret (≥ 4,5:1) | `--ink-soft` | `#5F6B7A` |
| Titres | `--navy` | `#2C3E50` |
| Accent (fonds, CTA) | `--amber` (alias `--terra`) | `#F39C12` |
| Accent **texte** | `--amber-ink` | `#9A5B00` |
| Page | `--cream` | `#FBFCFD` |
| Espaces connectés | `--shell` | `#EDF2F7` |
| Carte | `--paper` | `#FFFFFF` |
| Rayon de base | `--radius` | `0.75rem` |
| Filet | `--line` | `rgba(31,42,55,0.08)` |
| Filet d'un contrôle | `--line-strong` | `rgba(31,42,55,0.16)` |
| Ombre d'une carte | `--shadow-card` | décalage 10 px, flou 28 px |
| Ombre de ce qui flotte | `--shadow-pop` | menus, dialogues |
| Rayon d'un contrôle | `--r-control` | `0.75rem` |
| Rayon d'une carte | `--r-card` | `1rem` |
| Rayon d'un panneau marine | `--r-panel` | `1.5rem` |
| État : bien | `--ok-soft` / `--ok-ink` | `#E3F6F1` / `#14695F` |
| État : à traiter | `--warn-soft` / `--warn-ink` | `#FDF0D5` / `#8A5200` |
| État : refus, erreur | `--bad-soft` / `--bad-ink` | `#FDECEC` / `#B42318` |

Les valeurs de la charte de marque (`#00234B`, `#D96941`…) ne sont **pas** les
tokens Tailwind : voir l'avertissement du README.

## 8. Le système des espaces connectés

Le site public vend : pilules, capitales, grandes marges. Les deux espaces
servent un geste quotidien : ils ont leur propre échelle, plus dense, sur les
mêmes couleurs. Elle se déclenche par la classe `.app-shell`, posée par
`app/espace-client/layout.tsx` et `app/espace-chef/layout.tsx`. Les règles sont
écrites `:where(body:has(.app-shell)) …` (fin de `globals.css`) : elles
atteignent aussi les dialogues rendus par un portail, et une utilitaire
Tailwind posée sur l'élément garde la main.

| Brique | Où | Règle |
|---|---|---|
| Coque | [EspaceShell.tsx](../components/espace/EspaceShell.tsx) | Une seule pour les deux espaces : colonne marine, barre haute, barre mobile à 4 destinations et « Plus ». Un espace ne fournit que sa configuration. |
| Bouton | `.btn .btn-amber` / `-outline` / `-navy` / `-outline-light` | 40 px, coins de contrôle, casse normale, le libellé passe à la ligne. Un seul plein par vue. |
| Champ | `.input-base` | Même hauteur que le bouton, filet d'un pixel. |
| Panneau | `.panel`, `.panel-head`, `.panel-title`, `.panel-link` | La surface d'un bloc. Pas de panneau dans un panneau. |
| Ligne de liste | `.row-link` | Dans un panneau, séparées par `divide-[var(--line)]`. |
| Étiquette d'état | `.status` + `.status-ok` / `-warn` / `-bad` / `-info` / `-on-dark` | Une forme, quatre familles. Le ton d'une prestation vient de `bookingStatusTone()` : jamais d'une table locale. |
| Onglets | [Onglets.tsx](../components/shared/Onglets.tsx) | Toute bascule entre vues d'un même écran. Le fond glisse en 180 ms. |
| Bloc marine | `rounded-3xl bg-navy` | Un par écran : ce qui arrive (prochaine session, prochaine prestation). |
| Date | `.cap-first` | « Samedi 21 novembre ». Jamais `capitalize`, qui met une capitale à chaque mot. |

Ordre d'un accueil : ce qui attend un geste, ce qui arrive, puis l'historique
et les chiffres. Les chiffres se lisent en relevé (libellé à gauche, valeur à
droite), pas en rangée de tuiles.

Vocabulaire : côté client, une **session** ; côté batch cooker, une
**prestation**. « Commande » ne désigne ni l'une ni l'autre. Le site vouvoie.

## 9. Checklist de revue

- [ ] Un seul CTA principal, texte marine sur ambre.
- [ ] Aucun mot italique, `Sparkles`, badge décoratif, ornement flottant.
- [ ] Mono seulement pour références et heures.
- [ ] Texte ≥ 4,5:1, rien sous 12 px qui porte du sens.
- [ ] Cibles ≥ 40 px.
- [ ] Chiffres en `tabular-nums`.
- [ ] Rayons concentriques.
- [ ] Espaces : briques du § 8, pas de bouton, d'onglet ou de pastille écrits à la main.
- [ ] « Vous » partout ; « session » côté client, « prestation » côté batch cooker.
- [ ] Squelette, vide et erreur présents ; pas de décalage.
- [ ] Mouvement ≤ 240 ms (hero ≤ 400 ms), commenté, coupé en reduced-motion.
- [ ] Testé à 375, 768 et 1280 px, au clavier, réseau lent.
