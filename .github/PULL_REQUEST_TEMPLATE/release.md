<!--
Release develop → main de le site batch cooking.
Ouvrir avec : https://github.com/LabsFood/batchcooking-web/compare/main...develop?expand=1&template=release.md

Titre (Conventional Commits, il fixe la version calculée par semantic-release) :
  feat: release develop → main (<2-3 sujets>)   → version mineure
  fix: release develop → main (<sujet>)          → correctif
  feat!: ...  ou « BREAKING CHANGE: » ci-dessous → version majeure

CHANGELOG.md, le tag et package.json sont écrits par semantic-release après la
fusion : ne pas les modifier à la main. Le journal ci-dessous sert à la relecture
et à la note de version GitHub.
-->

## Version
- En prod : `vX.Y.Z`
- Attendue après fusion : `vX.Y.Z`
- Commits depuis `main` : N (`git log --oneline origin/main..origin/develop`)

## Journal des changements

### Ajouts
- **Écran ou parcours** : ce qui change pour l'utilisateur (#PR)

### Corrections
- Ce qui était cassé et ce qui marche maintenant (#PR ou sha)

### Changements techniques
- Dépendances, refactor, CI (supprimer si vide)

### Changements cassants
- Aucun (sinon : ce qui casse et comment migrer)

## Captures avant / après
<!-- Une capture par écran modifié, ou lien vers les maquettes déjà validées. -->

## Dépend de l'API
- Version minimale de LF-BackEnd : `vX.Y.Z` (LF-BackEnd #__), à déployer avant cette PR
- Aucune (supprimer si la release ne dépend d'aucun nouvel endpoint)

## Variables d'environnement (prod)
| Variable | Valeur / défaut | Si absente |
|---|---|---|
| `NOM` | | |

Les `NEXT_PUBLIC_*` sont figées au build : les poser avant que l'image de prod se construise.

## Avant fusion
- [ ] CI verte (lint, typecheck, image Docker, titre de PR)
- [ ] Fusion sans conflit avec `main` (version de `package.json` = celle de `main`)
- [ ] API requise déjà en prod
- [ ] Testé sur develop

## Après fusion
- [ ] Release `vX.Y.Z` publiée et CHANGELOG.md recommité sur `main`
- [ ] Déploiement Railway prod terminé, pages clés vérifiées, pas de nouvelle erreur Sentry
- [ ] `main` refusionnée dans `develop` si besoin

🚫 Ne pas fusionner sans l'accord explicite de MajorD.
