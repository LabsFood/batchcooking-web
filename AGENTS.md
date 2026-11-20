# AGENTS.md

## Ce que c'est

Site public + espace client du service de batch cooking a domicile ("Batch Cooking",
sous l'ombrelle Lab's Food). Next.js App Router : landing marketing (`/`, `/menu`,
`/recettes`, `/chefs`, `/avantage-fiscal`, `/faq`, pages legales) + zone authentifiee
`/espace-client/*` (commandes, menus, messages, reservation, statistiques...).

## Etat actuel (important)

> Cette section est en retard sur le code : les donnees passent desormais par
> TanStack Query (`lib/api/`) et l'auth par Clerk (`lib/auth-context.tsx`). Les
> mocks (`lib/mock-data.ts`, `lib/dashboard-mock.ts`) ne servent plus qu'a quelques
> ecrans (temoignages, preferences par defaut). A reecrire.

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
| Framework | Next.js 16 (App Router) + React 19 |
| Data-fetching | TanStack Query (`lib/api/*.ts`, client dans `lib/api/query-client.ts`) |
| Package manager | npm (migre depuis yarn — un seul lockfile desormais) |
| Style | Tailwind CSS 3 + shadcn/ui (Radix) |
| Animations | Framer Motion, Lottie |
| PWA | Service worker + manifest (`components/shared/PWARegister.tsx`) |

## Guidelines UI/UX

Toute modification d'ecran suit [`docs/ui-ux-guidelines.md`](docs/ui-ux-guidelines.md) :
budget de mouvement par frequence d'usage, lois d'UX, interdits anti-slop,
contraste et rayons, etats de chargement (squelettes), tokens et checklist de
revue. La charte de marque reste sur `/brand`. La console (`admin-dashboard`) a
sa propre palette et son propre document : ne pas melanger les valeurs.

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

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
