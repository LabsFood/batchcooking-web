# Lab's Food — Batch Cooking 🍳

Site web du service de batch cooking à domicile de Lab's Food.

## Stack technique

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** — Design system Lab's Food
- **Framer Motion** — Animations
- **shadcn/ui** + Radix UI — Composants
- **Fraunces** (titres) + **Montserrat** (corps) — Typographie officielle

## Palette couleurs officielle

| Branche | Principale | Secondaire | Clair |
|---------|-----------|-----------|-------|
| Corporate (Lab's Food) | `#00234B` | `#2C3E50` | `#F4F6F7` |
| Batch Cooking | `#D96941` | `#F39C12` | `#FAD7A0` |
| Kossam (produits) | `#193C40` | `#D1F2EB` | `#D4AF37` |

## Démarrage rapide

```bash
npm install
cp .env.example .env.local
# Remplir les variables dans .env.local
npm run dev
```

## Pages MVP

| Route | Description |
|-------|-------------|
| `/` | Landing page complète |
| `/menu` | Menu hebdomadaire interactif |
| `/recettes` | Catalogue Recettes du Monde |
| `/chefs` | Profils des chefs |
| `/reservation` | Tunnel de réservation |
| `/avantage-fiscal` | Guide crédit d'impôt |
| `/faq` | Questions fréquentes |
| `/auth/login` | Connexion client |
| `/auth/register` | Inscription client |
| `/espace-client` | Dashboard client |
| `/brand` | Charte graphique officielle |

## Structure

```
labs-food/
├── app/              # Pages (App Router)
├── components/
│   ├── home/         # Sections page d'accueil
│   ├── layout/       # Navbar + Footer
│   └── shared/       # ChatWidget + BrandGuidelines
├── lib/
│   ├── utils.ts      # Fonctions utilitaires
│   └── mock-data.ts  # Données de test
└── types/index.ts    # Types TypeScript
```

## État du projet

Données et authentification **mockées** (`lib/mock-data.ts`, `lib/dashboard-mock.ts`,
`lib/auth-context.tsx`) — pas encore connecté à l'API `LF-BackEnd`. Voir
[AGENTS.md](./AGENTS.md) pour le détail du stack, des variables d'environnement et
de la cible de déploiement.
