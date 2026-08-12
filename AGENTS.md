# AGENTS.md

## Ce que c'est

Site public + espace client du service de batch cooking a domicile ("Batch Cooking",
sous l'ombrelle Lab's Food). Next.js App Router : landing marketing (`/`, `/menu`,
`/recettes`, `/chefs`, `/avantage-fiscal`, `/faq`, pages legales) + zone authentifiee
`/espace-client/*` (commandes, menus, messages, reservation, statistiques...).

## Etat actuel (important)

Ce repo est actuellement une **maquette fonctionnelle, pas un client de l'API
reelle** : toutes les donnees viennent de `lib/mock-data.ts` et
`lib/dashboard-mock.ts`, et l'authentification (`lib/auth-context.tsx`) est une
session `localStorage` maison assumee comme "mode demo" sur la page de login.
`next-auth` est present dans les dependances mais n'est cable nulle part (aucune
route `app/api/auth/...`) — a supprimer plutot qu'a activer.

Prochaine etape fonctionnelle (hors perimetre de ce fichier) : remplacer
`lib/auth-context.tsx` par `@clerk/nextjs` en suivant le contrat documente dans
`LF-BackEnd/docs/auth/clerk-integration-contract.md`, puis remplacer les mocks par
des appels a l'API via un client type genere depuis `LF-BackEnd`'s `/openapi.json`.
Le modele mock (statuts de commande, demandes sur-mesure, messages) est deja
conceptuellement aligne avec les modules reels du backend (`bookings`, `quotes`,
`catalog`) : ce sera du cablage, pas une refonte.

## Stack

| Layer | Choix |
|-------|-------|
| Runtime | Node.js 20 (voir `.nvmrc`) |
| Framework | Next.js 14 (App Router) + React 18 |
| Package manager | npm (migre depuis yarn — un seul lockfile desormais) |
| Style | Tailwind CSS + shadcn/ui (Radix) |
| Animations | Framer Motion, Lottie |
| PWA | Service worker + manifest (`components/shared/PWARegister.tsx`) |

## Demarrage local

```bash
npm install
cp .env.example .env.local   # voir la section Variables d'environnement
npm run dev
```

Ouvre http://localhost:3005 (port fixe, voir `package.json`).

## Variables d'environnement

`.env.example` a l'historique contenait des variables NextAuth/SMTP/Stripe/OpenAI
qui ne sont utilisees nulle part dans le code (copie d'un starter generique) — a
ignorer si encore presentes le temps qu'elles soient nettoyees. Les seules qui
compteront reellement une fois le backend branche : `NEXT_PUBLIC_API_URL` (URL
publique de `LF-BackEnd`) et `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.

## Qualite / hooks

```bash
npm run lint     # next lint (eslint)
npm run build    # next build
```

Hook pre-commit (Husky + lint-staged) : `eslint --fix` sur les fichiers stages,
installe automatiquement via `npm install` (`scripts.prepare`).

## Deploiement

Actuellement sur Vercel (deploiement implicite, pas de config-as-code). Cible a
terme : Railway (conteneur Docker, `output: 'standalone'` a ajouter dans
`next.config.mjs`) — voir le plan de migration global.
