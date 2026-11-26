# Retours de tests du 26/11 — plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** corriger les quatre retours de la recette du 26/11 : recherche, filtre et vue en liste dans « Mes plats » ; plus de mois de saison côté client ; nouvelle phrase sous les formules ; ingrédients lisibles dans le PDF de la fiche recette.

**Architecture :** côté site, la logique de recherche et de filtre vit dans un module pur (`lib/chef/plats-filtre.ts`). La page « Mes plats » l'utilise, avec une préférence d'affichage retenue par compte (même mécanique que `lib/onboarding/reduit.ts`). Les gestes d'un plat (publier, dupliquer, supprimer) sortent de `DishCard` dans un hook partagé par la carte et la nouvelle ligne. Côté API, `recipe-document.ts` découpe les ingrédients en blocs (fonction pure, testée), puis dessine chaque bloc : un titre en gras, et des lignes à puce avec retrait suspendu.

**Tech stack :** site Next.js 16 + React 19, TanStack Query, Tailwind, Radix (`@radix-ui/react-dropdown-menu`, déjà installé), lucide-react. API NestJS + PDFKit, Jest (ts-jest).

**Spec :** `docs/superpowers/specs/2026-11-26-retours-tests-plats-design.md` (ce dépôt). La lire avant chaque tâche.

**Espaces de travail :**
- Site : `C:\Users\duval\Desktop\Project\LabsFood\batchcooking-web-retours`, branche `feat/retours-tests-plats` (tâches 1 à 5).
- API : `C:\Users\duval\Desktop\Project\LabsFood\LF-BackEnd-retours`, branche `fix/fiche-recette-ingredients`, commandes depuis `apps/` (tâches 6 et 7).
- Fichiers jetables (scripts de vérification, PDF d'essai) : `C:\Users\duval\AppData\Local\Temp\claude\4031c64607ef9c23\d9d176d9-4e84-4389-887f-fe13a00498b4\scratchpad\` (noté `$SCRATCH`).

## Global Constraints

- Textes en français, vouvoiement, apostrophe typographique `’` comme le code existant.
- Site : suivre `docs/ui-ux-guidelines.md`. Toute bascule de vue passe par `Onglets` (§ 8) : pas de pastille ni de bouton écrits à la main. On utilise `.btn`, `.input-base`, `.panel` et `.row-link`, et les icônes lucide en 16 px. Les cibles font au moins 40 px, les compteurs sont en `tabular-nums`, et aucun texte porteur de sens ne descend sous 12 px.
- Un seul bouton plein par vue : « Nouveau plat ». Dans la vue Liste, « Publier » est donc `btn-outline`.
- Aucun changement de contrat d'API ni de base, et aucune nouvelle dépendance dans les deux dépôts.
- batchcooking-web n'a pas de lanceur de tests. La logique pure se vérifie par un script jetable dans `$SCRATCH`, lancé avec `node --experimental-strip-types`, jamais commité.
- Un commit par tâche, sur la branche locale, sans push. Chaque message finit par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Une recherche tapée sans accents, en majuscules ou avec des espaces en trop doit trouver le plat (« VEGETARIEN » trouve « Couscous végétarien »). Tâche 1.
2. Une recherche avec `(`, `*`, `[` ou 80 caractères ne doit ni planter ni lever d'erreur : elle ne renvoie simplement rien. Tâche 1.
3. Un plat publié dont les allergènes sont à reconfirmer compte dans « À compléter ». Un plat archivé, jamais. Tâche 1.
4. Un nom de groupe avec des espaces autour (« Velouté » / « Velouté ») ne donne qu'un seul groupe. Un groupe vide compte comme « sans groupe ». Un groupe que le chef a lui-même appelé « Autres » reçoit les lignes sans groupe, sans second titre. Tâche 6.
5. Un titre de groupe ne reste jamais seul en bas de page, et une ligne longue revient à la ligne sous le texte, pas sous la puce. Tâche 7 (PDF d'essai regardé).

---

### Task 1: recherche et filtre, logique pure (site)

**Files :**
- Create : `lib/chef/plats-filtre.ts`
- Test (jetable) : `$SCRATCH/verif-plats-filtre.ts`

**Interfaces :**
- Produces :
  - `type FiltreStatut = 'tous' | 'brouillons' | 'publies' | 'a-completer'`
  - `const FILTRES: readonly { id: FiltreStatut; label: string }[]`, libellés `Tous`, `Brouillons`, `Publiés`, `À compléter`
  - `function plie(texte: string): string` : NFD, sans `\p{Diacritic}`, minuscules, espaces réduits à un seul, `trim`
  - `function aCompleter(dish: Pick<Dish, 'status' | 'readiness'>): boolean` : vrai si `status !== 'archived'` et `readiness.problems.length + readiness.toPublish.length > 0` (même règle que `publishBlockers(d).length > 0`) ; faux sans `readiness`
  - `function filtrerPlats(dishes: readonly Dish[], recherche: string, statut: FiltreStatut, pays: (code: string | null) => string): Dish[]` : `plie(recherche)` contenu (`includes`, jamais de RegExp) dans `plie` du nom, de la description ou de `pays(country)` ; `brouillons` = `draft`, `publies` = `published`, `a-completer` = `aCompleter`, `tous` = tout
  - `function compterParFiltre(dishes: readonly Dish[]): Record<FiltreStatut, number>`
- Le module n'importe que des types (`import type { Dish } from '@/lib/api/chef-catalog'`) : aucun import à l'exécution.

- [ ] **Étape 0 : installer** à la racine du site : `npm ci`.

- [ ] **Étape 1 : écrire le script de vérification qui échoue**

`$SCRATCH/verif-plats-filtre.ts` importe le module par son chemin absolu (`.../batchcooking-web-retours/lib/chef/plats-filtre.ts`) et utilise `node:assert/strict`. Il contient six plats fixes (`as never`) :
- `Couscous végétarien` (draft, problèmes `ALLERGENS_UNVERIFIED`, pays `DZ`) ;
- `Tajine de poulet aux citrons confits` (draft, description « Poulet fondant… citrons confits », pays `MA`, `toPublish` non vide) ;
- `Colombo de poulet` (published, `problems` = `[ALLERGENS_UNVERIFIED]`) ;
- `Velouté de butternut` (published, prête, rien à faire) ;
- `Rougail saucisse` (suspended, prête) ;
- `Ancien plat` (archived, `problems` non vide).

La fonction `pays` vaut `{ DZ: 'Algérie', MA: 'Maroc' }[code] ?? ''`. Assertions :

```ts
assert.equal(plie('  Couscous   VÉGÉTARIEN '), 'couscous vegetarien')
assert.deepEqual(noms(filtrerPlats(plats, 'VEGETARIEN', 'tous', pays)), ['Couscous végétarien'])
assert.deepEqual(noms(filtrerPlats(plats, 'citrons confits', 'tous', pays)), ['Tajine de poulet aux citrons confits'])
assert.deepEqual(noms(filtrerPlats(plats, 'maroc', 'tous', pays)), ['Tajine de poulet aux citrons confits'])
assert.equal(filtrerPlats(plats, '   ', 'tous', pays).length, 6)
assert.deepEqual(noms(filtrerPlats(plats, 'poulet', 'publies', pays)), ['Colombo de poulet'])
assert.deepEqual(noms(filtrerPlats(plats, '', 'brouillons', pays)), ['Couscous végétarien', 'Tajine de poulet aux citrons confits'])
assert.deepEqual(noms(filtrerPlats(plats, '', 'a-completer', pays)), ['Couscous végétarien', 'Tajine de poulet aux citrons confits', 'Colombo de poulet'])
for (const q of ['(', '*', '[', 'x'.repeat(80)]) assert.deepEqual(filtrerPlats(plats, q, 'tous', pays), [])
assert.equal(aCompleter({ status: 'draft' } as never), false)
assert.deepEqual(compterParFiltre(plats), { tous: 6, brouillons: 2, publies: 2, 'a-completer': 3 })
console.log('OK')
```

- [ ] **Étape 2 : lancer le script, il échoue**

Run : `node --experimental-strip-types "$SCRATCH/verif-plats-filtre.ts"`
Expected : échec à l'import (module absent). Si Node refuse la syntaxe du module, lancez plutôt `npx --yes tsx "$SCRATCH/verif-plats-filtre.ts"`.

- [ ] **Étape 3 : écrire `lib/chef/plats-filtre.ts`** selon les signatures ci-dessus, avec un en-tête de commentaire en français dans le style du dépôt (le pourquoi : retour de recette du 26/11).

- [ ] **Étape 4 : relancer le script**

Expected : `OK`. Puis `npx tsc --noEmit` (depuis la racine du site) : 0 erreur.

- [ ] **Étape 5 : commit**

```bash
git add lib/chef/plats-filtre.ts
git commit -m "feat(recettes): la recherche et le filtre de « Mes plats », sans accents ni majuscules"
```

### Task 2: barre de recherche et filtre dans « Mes plats » (site)

**Files :**
- Modify : `app/espace-chef/recettes/page.tsx` (`DishesTab`, vers les lignes 148-195)

**Interfaces :**
- Consumes : `FILTRES`, `FiltreStatut`, `filtrerPlats`, `compterParFiltre` (tâche 1) ; `countryLabel` (`@/lib/chef/countries`) comme fonction `pays` ; `Onglets` ; `Empty` (même fichier).

- [ ] **Étape 1 : ajouter l'état et la barre d'outils**

Dans `DishesTab`, ajoutez deux états, `recherche` (chaîne) et `statut` (`FiltreStatut`, `'tous'` par défaut). La barre d'outils se place sous la ligne d'en-tête, seulement si `dishes.length > 0` :
- `<input type="search" className="input-base">` avec `placeholder="Rechercher un plat…"`, `aria-label="Rechercher dans vos plats"` et `maxLength={80}`. Une icône `Search` de 16 px est posée à gauche. Le champ fait `w-full sm:w-64`.
- `<Onglets label="Filtrer vos plats" items={FILTRES avec count = compterParFiltre(dishes)[id]} value={statut} onChange={setStatut} />`.
- Sur mobile, la barre passe à la ligne : `flex flex-wrap gap-3`.

- [ ] **Étape 2 : brancher la liste**

La liste affiche `filtrerPlats(dishes, recherche, statut, countryLabel)` au lieu de `dishes`. Si la recherche n'est pas vide (après `trim`) ou si le statut n'est pas `tous`, la ligne d'en-tête ajoute ` · N plat(s) trouvé(s)` (accord au pluriel, `tabular-nums`). Si le filtre ne renvoie rien, on affiche `Empty`, avec l'icône `Search`, le titre « Aucun plat ne correspond » et le texte « Vérifiez l’orthographe ou choisissez un autre filtre. ». Son bouton `btn btn-outline text-xs` « Tout afficher » vide la recherche et remet `tous`. L'état vide d'origine (« Commencez par un plat ») ne change pas.

- [ ] **Étape 3 : vérifier**

Run : `npx tsc --noEmit` puis `npx eslint app/espace-chef/recettes/page.tsx lib/chef/plats-filtre.ts`
Expected : 0 erreur.

- [ ] **Étape 4 : commit**

```bash
git add app/espace-chef/recettes/page.tsx
git commit -m "feat(recettes): « Mes plats » se cherche et se filtre par statut"
```

### Task 3: vue en liste (site)

**Files :**
- Create : `lib/chef/vue-plats.ts`
- Modify : `app/espace-chef/recettes/page.tsx` (`DishesTab`, `DishCard` vers les lignes 197-477, nouvelle `DishRow`)

**Interfaces :**
- Produces :
  - `type VuePlats = 'cartes' | 'liste'`
  - `function useVuePlats(): [VuePlats, (vue: VuePlats) => void]`, calqué sur `useReduit` (`lib/onboarding/reduit.ts`). La clé est `vue-plats:${userId ?? 'anonyme'}` et l'événement `labsfood:vue-plats`. Seul `'liste'` est stocké (on retire la clé pour `'cartes'`). Toute autre valeur lue donne `'cartes'`. Côté serveur, on rend `'cartes'`. En navigation privée, la préférence est gardée en mémoire.
  - Dans `page.tsx`, `function useDishGestures(dish: Dish)` renvoie `{ blockers: string[]; busy: boolean; publishing: boolean; duplicating: boolean; publish(): void; unpublish(): void; duplicate(): void; askDelete(): void; deleteDialog: React.ReactNode }`. Les toasts, les messages et le `ConfirmDialog` sont repris mot pour mot de `DishCard`.
  - `function ReadinessPills({ dish }: { dish: Dish })` : les pastilles « Prête · version N » ou « Pas encore Prête », « Allergènes à confirmer », et l'`InfoPopover`, extraites de `DishCard` (lignes 267-288).

- [ ] **Étape 1 : écrire `lib/chef/vue-plats.ts`**

- [ ] **Étape 2 : extraire `useDishGestures` et `ReadinessPills`, puis faire utiliser les deux par `DishCard`**

`DishCard` doit rendre exactement la même chose qu'avant : mêmes textes, mêmes classes, mêmes états désactivés. Le changement de photo reste dans `DishCard`.

- [ ] **Étape 3 : écrire `DishRow({ dish, variantOfName })`**

Un `<li className="row-link flex-wrap">` contient, dans l'ordre :
- une miniature de 48 × 48 px en `rounded-lg` : la photo, ou une `ImageIcon`. On ne change pas la photo depuis la liste.
- le nom en `Link` vers `/espace-chef/recettes/{id}` (`font-display font-bold text-navy`), suivi du statut (point + libellé, `STATUS_STYLE`), puis de `ReadinessPills` ;
- si le plat n'est pas publié et que `blockers` n'est pas vide, une ligne `text-xs text-ink-soft line-clamp-1` avec une `AlertTriangle` de 16 px : « Pour publier, il manque … » ;
- à droite (en dessous sur mobile : `w-full sm:w-auto justify-end`) :
  - `Modifier` (`btn btn-outline text-xs`) ;
  - `Publier`, ou `Dépublier` pour un plat publié (`btn btn-outline text-xs`, désactivé comme dans la carte) ;
  - un menu Radix `DropdownMenu`. Son déclencheur fait 40 × 40 px, avec une icône `MoreHorizontal` et `aria-label="Plus d’actions pour {nom}"`. Il contient « Dupliquer » (`Copy`) et « Supprimer » (`Trash2`, `text-red-700`), qui ouvre la confirmation. Le style du `DropdownMenu.Content` est repris de `components/shared/MultiSelect.tsx`.
- `deleteDialog` est rendu dans le `li`.

- [ ] **Étape 4 : bascule Cartes / Liste**

Dans la barre d'outils de la tâche 2, à droite, ajoutez `<Onglets label="Affichage de vos plats" items={[{ id: 'cartes', label: 'Cartes', Icon: LayoutGrid }, { id: 'liste', label: 'Liste', Icon: List }]} value={vue} onChange={setVue} />`. En vue `liste`, les plats s'affichent dans `<ul className="panel mt-4 divide-y divide-[var(--line)]">` sous forme de `DishRow`. En vue `cartes`, la grille actuelle ne change pas.

- [ ] **Étape 5 : vérifier**

Run : `npx tsc --noEmit` puis `npx eslint app/espace-chef/recettes/page.tsx lib/chef/vue-plats.ts`
Expected : 0 erreur.

- [ ] **Étape 6 : commit**

```bash
git add lib/chef/vue-plats.ts app/espace-chef/recettes/page.tsx
git commit -m "feat(recettes): « Mes plats » s'affiche aussi en liste, et le choix est retenu"
```

### Task 4: côté client, plus de mois de saison, nouvelle phrase (site)

**Files :**
- Modify : `components/menu/ChefMenuBrowser.tsx` (lignes 2123-2127 et import ligne 51)
- Modify : `components/menu/FormulePicker.tsx` (vers les lignes 103-112)

- [ ] **Étape 1 : retirer la pastille des mois** (le bloc `seasonsLine(dish.seasonMonths …)`) et `seasonsLine` de l'import s'il ne sert plus. Juste au-dessus, ajoutez un commentaire d'une ligne : « Retour de recette du 26/11 : le client ne voit pas la saisonnalité d'un plat. »

- [ ] **Étape 2 : remplacer la phrase** par ce texte exact, avec le lien inchangé sur « demande sur-mesure » :

```tsx
Envie d’autres plats, ou de plus de plats ? Proposez vos repas dans une{' '}
<Link …>demande sur-mesure</Link>
.
```

- [ ] **Étape 3 : vérifier**

Run : `grep -rn "seasonsLine\|seasonMonths" components/menu app/menu app/espace-client` → plus aucune occurrence affichée (`lib/api/menus.ts` garde le champ de type). Puis `npx tsc --noEmit` et `npx eslint components/menu/ChefMenuBrowser.tsx components/menu/FormulePicker.tsx` : 0 erreur.

- [ ] **Étape 4 : commit**

```bash
git add components/menu/ChefMenuBrowser.tsx components/menu/FormulePicker.tsx
git commit -m "fix(reservation): le client ne voit plus les mois de saison, et peut proposer ses repas"
```

### Task 5: vérification du site

- [ ] **Étape 1 : préparer et construire.** Copiez `../batchcooking-web/.env.local` s'il existe ; sinon, demandez les deux variables `NEXT_PUBLIC_API_URL` (API DEV `https://lf-api-develop.up.railway.app`) et `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`. Puis lancez `npm run typecheck`, `npm run lint` et `npm run build`. Expected : les trois réussissent.
- [ ] **Étape 2 : à l'écran.** `npm run dev` (port 3005), connexion avec un compte batch cooker de DEV (à demander à l'utilisateur). Dans « Mes plats », à 1280 px puis à 375 px, et au clavier :
  - « vegetarien » trouve le couscous ; « zzz » affiche « Aucun plat ne correspond », et « Tout afficher » remet tout ;
  - chaque filtre a le bon nombre ;
  - en Liste, les actions marchent depuis une ligne : Publier (refusé tant qu'il manque quelque chose), Dupliquer, Supprimer (confirmation) ;
  - après rechargement, on est toujours en Liste. Après `localStorage.setItem('vue-plats:<id>', 'n-importe')` et un rechargement, on revient en Cartes.
- [ ] **Étape 3 : côté client.** Dans la réservation d'un batch cooker qui a un plat saisonnier : la carte du plat n'a plus de mois, et la nouvelle phrase apparaît sous les formules.
- [ ] **Étape 4 :** noter les écarts. Les corriger dans la tâche concernée, avec un commit de correction.

### Task 6: ingrédients du PDF en blocs titrés et à puces (API)

**Files :**
- Modify : `apps/src/modules/dishes/recipe-document.ts` (lignes 79-97 et 142)
- Test : `apps/src/modules/dishes/recipe-document.spec.ts`

**Interfaces :**
- Produces :
  - `interface IngredientBlock { title: string | null; lines: string[] }`
  - `export function ingredientBlocks(lines: Ingredient[]): IngredientBlock[]` remplace `ingredientText`. Les groupes viennent dans leur ordre d'apparition, sous le nom de groupe épuré par `trim`. Les lignes sans groupe (groupe `null` ou vide après `trim`) vont dans un dernier bloc `Autres`. Si un groupe s'appelle déjà « Autres » (casse et accents ignorés), elles s'ajoutent à la fin de ce groupe, à sa place. Une recette sans aucun groupe donne un seul bloc `{ title: null }`. Aucune ligne donne `[]`. Le texte de chaque ligne vient de `ingredientLine`, inchangé.
  - `function writeIngredients(doc: PDFKit.PDFDocument, blocks: IngredientBlock[]): void`, non exportée, remplace `section(doc, 'Ingrédients', …)`.

- [ ] **Étape 1 : installer** (depuis `apps/`) : `npm ci --ignore-scripts`, puis `SUPABASE_DB_URL=postgresql://u:p@localhost:5432/db npx prisma generate` (la génération ne se connecte pas). Ensuite `npx jest src/modules/dishes/recipe-document.spec.ts`. Expected : PASS avant toute modification.

- [ ] **Étape 2 : écrire les tests qui échouent**

Avec `const l = (name: string, group: string | null = null) => ({ name, qty: 200, unit: 'g', fixedQuantity: false, optional: false, precision: null, preparation: null, group })`, ajoutez un `describe('ingredientBlocks (retour du 26/11)')` :

```ts
expect(ingredientBlocks([l('Epice plein sud'), l('Butternut', 'Velouté'), l('Lait de coco', 'Finition'), l('Oignon', 'Velouté')])).toEqual([
  { title: 'Velouté', lines: ['200 g Butternut', '200 g Oignon'] },
  { title: 'Finition', lines: ['200 g Lait de coco'] },
  { title: 'Autres', lines: ['200 g Epice plein sud'] },
]);
expect(ingredientBlocks([l('A'), l('B')])).toEqual([{ title: null, lines: ['200 g A', '200 g B'] }]);
expect(ingredientBlocks([l('A', ' Velouté '), l('B', 'Velouté'), l('C', '   ')])).toEqual([
  { title: 'Velouté', lines: ['200 g A', '200 g B'] },
  { title: 'Autres', lines: ['200 g C'] },
]);
expect(ingredientBlocks([l('A', 'autres'), l('B', 'Sauce'), l('C')])).toEqual([
  { title: 'autres', lines: ['200 g A', '200 g C'] },
  { title: 'Sauce', lines: ['200 g B'] },
]);
expect(ingredientBlocks([])).toEqual([]);
```

Dans le test existant `prints each line … by group`, remplacez les trois assertions d'ordre par celles-ci (texte normalisé `\s+` → espace) :

```ts
expect(text).toMatch(/•\s*2 gousses Ail, haché \(bio\) \(facultatif\)/);
expect(text.indexOf('Sauce')).toBeLessThan(text.indexOf('2 gousses Ail'));
expect(text.indexOf('Pâte')).toBeGreaterThan(text.indexOf('(facultatif)'));
expect(text.indexOf('Autres')).toBeGreaterThan(text.indexOf('200 g Farine'));
expect(text.indexOf('selon le goût Sel')).toBeGreaterThan(text.indexOf('Autres'));
```

Ajoutez aussi un test PDF : avec `INPUT` (aucun groupe), le texte ne contient pas `Autres` et correspond à `/•\s*1,4 kg Poulet fermier/`.

- [ ] **Étape 3 : lancer les tests, ils échouent**

Run : `npx jest src/modules/dishes/recipe-document.spec.ts`
Expected : FAIL (`ingredientBlocks` absent, ordre et puces).

- [ ] **Étape 4 : implémenter `ingredientBlocks` et `writeIngredients`**

`writeIngredients` :
- `doc.y += 20`, puis `label(doc, 'Ingrédients', COLOR.terra)`, puis `doc.y += 5` (comme `section`).
- Pour chaque bloc titré : `doc.y += 8` sauf pour le premier. Le titre est en `FONT.strong`, 10 pt, `COLOR.navy`, à `PAGE.left`, puis `doc.y += 3`.
- Pour chaque ligne : `FONT.text`, 9,5 pt, `COLOR.ink`. On dessine `•` à `PAGE.left + 2` sans retour à la ligne, puis le texte à `PAGE.left + 12`, avec `width: PAGE.width - 12`, `lineGap: 2` et `...TEXT`, sur le même `y`.
- Bas de page : `doc.page.height - doc.page.margins.bottom`. Avant un titre, s'il manque la place pour le titre, l'écart de 3 pt et la hauteur (`heightOfString`) de la première ligne du bloc, on appelle `doc.addPage()`. Avant une ligne, s'il manque la place pour une ligne de texte, on appelle aussi `doc.addPage()`.

Remplacez le commentaire « Lines without a group first… » par la nouvelle règle.

- [ ] **Étape 5 : relancer les tests**

Run : `npx jest src/modules/dishes`
Expected : PASS, y compris les autres specs du module.

- [ ] **Étape 6 : commit**

```bash
git add apps/src/modules/dishes/recipe-document.ts apps/src/modules/dishes/recipe-document.spec.ts
git commit -m "fix(recettes): la fiche PDF titre chaque groupe d'ingrédients et met une puce à chaque ligne"
```

### Task 7: vérification de l'API et PDF regardé

- [ ] **Étape 1 :** depuis `apps/`, lancez `npx eslint src/modules/dishes/recipe-document.ts src/modules/dishes/recipe-document.spec.ts` et `npx tsc --noEmit -p tsconfig.json`. Expected : 0 erreur.
- [ ] **Étape 2 : PDF d'essai.** Créez un spec jetable, `src/modules/dishes/zz-essai.spec.ts`, **jamais commité et supprimé après usage**. Il écrit deux PDF dans `$SCRATCH` avec `renderRecipePdf` :
  - `essai-veloute.pdf` reprend la fiche « Velouté de butternut » de la capture : « 20 g Epice plein sud » sans groupe, quatre lignes « Velouté », deux lignes « Finition », plus une ligne dont la préparation fait environ 200 caractères ;
  - `essai-saut.pdf` contient 52 lignes du groupe « Base », puis le groupe « Sauce » avec deux lignes, de sorte que « Sauce » tombe en bas de la page 1.
- [ ] **Étape 3 : regarder** les deux PDF (outil Read, `pages: "1-2"`). Il faut voir : des titres en gras marine, les puces, « Autres » en dernier, une ligne longue qui revient à la ligne sous le texte, et « Sauce » jamais seul en bas de page. Supprimez ensuite `zz-essai.spec.ts`, puis vérifiez avec `git status` qu'il ne reste que les deux fichiers de la tâche 6.
