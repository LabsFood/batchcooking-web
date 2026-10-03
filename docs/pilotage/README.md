# Pilotage Lab's Food

Le suivi du développement des quatre surfaces — site public, espace client,
espace batch cooker, console d'administration — et des demandes adressées au
backend.

**La source de vérité, ce sont les CSV de ce dossier.** Le Google Sheet partagé
avec l'équipe en est l'affichage : on le rafraîchit depuis ces fichiers, jamais
l'inverse.

## Les fichiers

| Fichier | Onglet | Grain |
|---|---|---|
| `00-lisez-moi.csv` | Lisez-moi | les conventions, à lire une fois |
| `01-backlog.csv` | Backlog | **1 ligne = 1 action × 1 type de travail** |
| `02-modules.csv` | Modules | 1 ligne = 1 module, pour la vue d'ensemble |
| `03-bugs-blocages.csv` | Bugs | 1 ligne = 1 fiche `BUG`, `DEM` ou `BLK` |
| `04-commentaires.csv` | Commentaires | 1 ligne = 1 commentaire daté |
| `05-equipe.csv` | Equipe | qui fait quoi |
| `06-referentiels.csv` | Referentiels | les listes des menus déroulants |
| *(calculé)* | Tableau de bord | compteurs, retards, charge par personne |

Le grain du backlog est ce qui fait tout le reste : « lister les plats » donne
**deux** lignes, le design et l'intégration, chacune avec son statut. C'est
comme ça qu'on voit qu'un écran est dessiné mais pas branché.

## Les statuts

| Statut | Ce que ça veut dire |
|---|---|
| `À faire` | rien n'est commencé |
| `En cours` | quelqu'un travaille dessus |
| `À tester` | le code est écrit et poussé, **personne ne l'a vu fonctionner** contre l'API réelle |
| `Terminé` | vérifié en situation, avec de vraies données |
| `Bloqué` | attend quelqu'un d'autre — la colonne `Bug / blocage` dit lequel |

`À tester` n'est pas `Terminé`. La distinction porte tout le classeur : au
03/10/2026, 36 tâches sont écrites et poussées sans qu'aucune session admin
réelle ait pu les exercer (voir `BLK-08`).

## Fabriquer le classeur

```bash
pip install openpyxl
python docs/pilotage/build-xlsx.py
```

Produit `pilotage-labs-food.xlsx` : les sept onglets des CSV, plus le tableau de
bord calculé, avec les listes déroulantes, la couleur des statuts, les
deadlines dépassées en rouge, l'en-tête figée et un filtre par colonne.

Le `.xlsx` versionné ici est le résultat de ce script. En cas de doute sur sa
fraîcheur, relancez la commande plutôt que de l'ouvrir.

## Le cycle de mise à jour

**La première fois** — déposer `pilotage-labs-food.xlsx` dans Google Drive. Le
glisser-déposer le convertit en Google Sheet avec ses huit onglets, ses
déroulants et ses couleurs. Partager ce document avec l'équipe : c'est l'URL
définitive, elle ne changera plus.

**Ensuite** — on modifie les CSV ici, puis dans le Sheet :

> Fichier → Importer → choisir le CSV → **Remplacer les données de la feuille
> sélectionnée** → décocher « Convertir le texte en nombres et en dates ».

L'URL, les partages, les commentaires Google et le tableau de bord sont
conservés : seules les cellules de la feuille choisie sont remplacées. Compter
une vingtaine de secondes par onglet touché.

Ne jamais réimporter le `.xlsx` entier dans un document existant : il créerait
des feuilles en double. Le `.xlsx` sert à la création, les CSV au
rafraîchissement.

**Un commentaire Google suit sa cellule, pas sa valeur.** Après un import qui
change l'ordre des lignes, vérifier que les commentaires sont toujours en face
du bon ID. C'est aussi pourquoi l'onglet `Commentaires` existe : ce qui doit
survivre s'écrit là, dans le CSV.

## Les identifiants

- `LF-xxxx` — une ligne du backlog. Numérotation stable : on n'en réutilise pas
  un libéré.
- `BUG-xx` — un défaut de l'API constaté et reproduit. Les neuf premiers
  viennent de [`../api/BUGS-BACKEND.md`](../api/BUGS-BACKEND.md).
- `DEM-xx` — une demande fonctionnelle : pas un défaut, un manque qui bloque un
  écran. Viennent de [`../api/DEMANDES-BACKEND.md`](../api/DEMANDES-BACKEND.md).
- `BLK-xx` — un blocage qui n'est ni l'un ni l'autre : un module absent, un
  accès manquant, une décision à prendre.

Chaque fiche de l'onglet `Bugs` liste les tâches qu'elle touche, et chaque
tâche bloquée porte le code de ce qui la bloque. Les deux sens sont tenus à
jour ensemble, sinon ils divergent.

## Conventions d'écriture

- Les dates sont en ISO (`2026-10-14`) dans les CSV. Le script les formate en
  `JJ/MM/AAAA` à l'affichage.
- Le séparateur est le point-virgule, l'encodage UTF-8 avec BOM : Excel et
  Google Sheets ouvrent les deux correctement, sans réglage.
- Une valeur de colonne à liste doit exister dans `06-referentiels.csv`.
  Ajouter la valeur là d'abord, sinon le déroulant la refuse.
- La colonne `Dernier commentaire` contient une phrase, pas un historique.
  L'historique va dans `04-commentaires.csv`.
