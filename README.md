# Lab's Food — Batch Cooking 🍳

Site vitrine + espaces connectés du service de batch cooking à domicile de
Lab's Food : un batch cooker se déplace chez le client et cuisine une semaine
de repas en une seule session.

Le repo couvre trois surfaces :

- **la vitrine publique** (landing, menu, recettes, chefs, pages légales) ;
- **l'espace client** (`/espace-client`) — sessions, liste de courses, menus,
  messagerie, compte ;
- **l'espace batch cooker** (`/espace-chef`) — pilotage, offre, revenus,
  conformité, relation client.

## Stack technique

| Couche | Choix |
|--------|-------|
| Runtime | Node.js 20 (voir [.nvmrc](.nvmrc)) |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Style | Tailwind CSS + shadcn/ui (Radix) |
| Auth | Clerk (`@clerk/nextjs`, localisation `frFR`) |
| Données serveur | TanStack Query + client HTTP typé maison ([lib/api/](lib/api/)) |
| État local | Zustand |
| Formulaires | React Hook Form + Zod |
| Animations | Framer Motion, Lottie |
| Cartographie | d3-geo + topojson (carte culinaire de l'espace client) |
| PWA | Service worker + manifest ([components/shared/PWARegister.tsx](components/shared/PWARegister.tsx)) |
| Build / déploiement | `output: 'standalone'` + image Docker multi-stage |

## Démarrage rapide

```bash
nvm use            # Node 20
npm install        # installe aussi les hooks Husky (scripts.prepare)
cp .env.example .env.local
# renseigner au minimum les clés Clerk et NEXT_PUBLIC_API_URL
npm run dev
```

L'app écoute sur **http://localhost:3005** (port fixé dans `package.json`).

### Scripts

| Commande | Effet |
|----------|-------|
| `npm run dev` | Serveur de développement (port 3005) |
| `npm run build` | Build de production (fait aussi le typecheck) |
| `npm start` | Sert le build de production |
| `npm run lint` | ESLint sur tout le repo |
| `npm run typecheck` | `tsc --noEmit` |

### Variables d'environnement

Voir [.env.example](.env.example). Les seules réellement consommées par le code
aujourd'hui :

| Variable | Rôle |
|----------|------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Authentification Clerk |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `..._SIGN_UP_URL` | Routes de connexion / inscription |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` / `..._SIGN_UP_...` | Redirection post-auth |
| `NEXT_PUBLIC_API_URL` | Base URL de l'API `LF-BackEnd` (appelée directement depuis le navigateur) |

Les blocs `DATABASE_URL`, SMTP, Stripe et OpenAI présents dans `.env.example`
sont des reliquats de starter : aucun code ne les lit.

> ⚠️ L'API étant appelée depuis le navigateur, l'origine du front doit être
> autorisée côté backend (`CORS_ORIGINS`, qui alimente aussi
> `authorizedParties` Clerk).

## Authentification & rôles

- [middleware.ts](middleware.ts) monte `clerkMiddleware` et **protège
  `/espace-client/*`**. Le reste du site (vitrine, menu, réservation publique)
  reste ouvert : la *reservation gate* côté client invite à se connecter au bon
  moment ([lib/reservation-gate-context.tsx](lib/reservation-gate-context.tsx)).
- `/espace-chef/*` n'est **pas** protégé par le middleware : la garde vit côté
  client dans [app/espace-chef/layout.tsx](app/espace-chef/layout.tsx), et son
  `DEMO_MODE = true` laisse entrer tout compte authentifié tant que `/me` n'est
  pas exploitable. À repasser à `false` (et à ajouter au matcher du middleware)
  une fois le backend prêt.
- [lib/auth-context.tsx](lib/auth-context.tsx) est un **adaptateur au-dessus de
  Clerk** : il conserve la signature de l'ancien contexte mock (`useAuth()`) et
  expose le rôle applicatif (`client` / `chef` / `admin`) issu de `GET /me`.

## État du projet

UI **livrée en données simulées**, branchement API en cours.

**Déjà branché sur l'API** (TanStack Query, [lib/api/](lib/api/)) :
`GET /me`, `GET|PATCH /me/profile`, `GET|PATCH /me/chef-profile`.

**Encore mocké** — tout le reste des dashboards :
[lib/mock-data.ts](lib/mock-data.ts), [lib/dashboard-mock.ts](lib/dashboard-mock.ts),
[lib/chef/mock.ts](lib/chef/mock.ts), [lib/client/mock.ts](lib/client/mock.ts).

Le détail écran par écran (livré / partiel / à faire) et le découpage des tâches
frontend-backend sont dans [docs/RECAP-v1-vs-v2-et-taches.md](docs/RECAP-v1-vs-v2-et-taches.md).
L'audit d'écart et le séquencement sont dans [docs/PLAN-dashboards-v2.md](docs/PLAN-dashboards-v2.md).

## Routes

### Public

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/menu` | Menu hebdomadaire interactif |
| `/recettes` | Catalogue Recettes du Monde |
| `/chefs` | Vitrine des batch cookers |
| `/devenir-chef` | Onboarding batch cooker (6 étapes reprenables) |
| `/reservation` | Tunnel de réservation public |
| `/avantage-fiscal` | Guide crédit d'impôt |
| `/a-propos`, `/faq` | Pages informationnelles |
| `/cgv`, `/mentions-legales`, `/confidentialite` | Pages légales |
| `/brand` | Charte graphique (documentation interne) |
| `/auth/login`, `/auth/register` | Connexion / inscription (Clerk) |

### Espace client — `/espace-client`

`(accueil)` · `reservation` · `chefs` · `commandes` (+ `commandes/[id]`) ·
`menus` · `courses` · `conservation` · `personnalisation` · `messages` ·
`statistiques` · `profil` · `compte` · `parametres`

### Espace batch cooker — `/espace-chef`

`(accueil)` · `demandes` · `offres` · `prestations` · `agenda` · `recettes` ·
`tarifs` · `vitrine` · `revenus` · `remuneration` · `dossier` · `profil` ·
`parametres` · `messagerie` · `avis` · `litiges`

## Structure

```
labs-food/
├── app/
│   ├── (pages publiques)/     # landing, menu, recettes, légal…
│   ├── auth/                  # login + register (routes catch-all Clerk)
│   ├── espace-client/         # dashboard client (13 écrans)
│   └── espace-chef/           # dashboard batch cooker (16 écrans)
├── components/
│   ├── home/                  # sections de la landing
│   ├── layout/                # Navbar, Footer, Providers, PublicChrome
│   ├── dashboard/             # sidebar/topbar client + carte culinaire
│   ├── chef/                  # navigation et briques de l'espace chef
│   └── shared/                # modales, loader, logo, PWA, animations
├── lib/
│   ├── api/                   # client HTTP typé + hooks React Query
│   ├── chef/                  # machines à états + mocks du module chef
│   ├── client/                # mocks du module client
│   ├── auth-context.tsx       # adaptateur Clerk (useAuth)
│   └── reservation-gate-context.tsx
├── docs/                      # plan v2 + récap des tâches
└── types/index.ts
```

## Design system

**Typographie** — Fraunces (titres ; variable font servie en local depuis
`public/fraunces-font-family/`), Montserrat (corps), DM Mono (labels et
références).

**Charte de marque** — trois branches, documentées sur `/brand`
([components/shared/BrandGuidelines.tsx](components/shared/BrandGuidelines.tsx)) :

| Branche | Principale | Secondaire | Clair |
|---------|-----------|-----------|-------|
| Corporate (Lab's Food) | `#00234B` | `#2C3E50` | `#F4F6F7` |
| Batch Cooking | `#D96941` | `#F39C12` | `#FAD7A0` |
| Kossam (produits) | `#193C40` | `#D1F2EB` | `#D4AF37` |

**Tokens Tailwind** — ce qu'on manipule dans le code au quotidien
([tailwind.config.ts](tailwind.config.ts)). Attention : les valeurs ne
recouvrent pas exactement la charte ci-dessus.

`navy` · `terra` · `amber` · `mint` · `peach` · `cream` · `ink`, chacun avec ses
variantes (`DEFAULT`, `deep`, `soft`, `mid`…).

## Qualité

Hooks Husky, installés automatiquement par `npm install` :

- **pre-commit** — `lint-staged` → `eslint --fix` sur les fichiers stagés ;
- **pre-push** — `npm run build` complet (build + typecheck). Le push est refusé
  si le build casse. Contournement ponctuel : `git push --no-verify`.

## Déploiement

Image Docker multi-stage ([Dockerfile](Dockerfile)) basée sur `node:20-alpine`,
exploitant la sortie `standalone` de Next.js, exécutée par un utilisateur non
root et exposant le **port 3000**.

```bash
docker build -t labs-food .
docker run -p 3000:3000 --env-file .env.local labs-food
```

Cible de déploiement : Railway (conteneur). Voir [AGENTS.md](./AGENTS.md) pour
le contexte projet destiné aux agents.
