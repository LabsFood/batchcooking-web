# Les erreurs « CORS » sur l'environnement dev — diagnostic et correctif

Relevé du 29/10/2026, mesuré depuis l'extérieur sur les domaines déployés.

**En un mot : ce n'est pas CORS, et ce n'est pas l'API.** C'est Clerk, qui
refuse d'authentifier le navigateur parce que l'instance utilisée est une
instance de **développement** posée sur un vrai domaine.

---

## 1. Ce qui n'est pas en cause : l'API

Testé depuis `https://batchcooking-dev.labsfood.fr` vers
`https://lf-api-develop.up.railway.app` :

| Requête | Statut | `access-control-allow-origin` |
|---|---|---|
| `OPTIONS /me` (préflight, avec `authorization`) | **204** | l'origine, et `allow-headers: authorization` |
| `GET /referentials/regions` | 200 | l'origine |
| `GET /me` sans jeton valable | 401 | **l'origine** |
| Route inexistante | 404 | **l'origine** |
| Depuis une origine inconnue | 200 | *(absent, comme il se doit)* |

`access-control-allow-credentials: true` est présent partout, et `vary: Origin`
aussi.

Les en-têtes sont là **jusque sur les chemins d'erreur**, ce qui est
précisément ce qui manque dans une mauvaise configuration CORS. Rien à changer
côté API.

À reproduire en une commande :

```bash
curl -i -X OPTIONS https://lf-api-develop.up.railway.app/me \
  -H "Origin: https://batchcooking-dev.labsfood.fr" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization"
```

---

## 2. La cause réelle : une instance Clerk de développement

Le bundle JavaScript servi par `batchcooking-dev.labsfood.fr` contient une clé
**`pk_test_…`**, dont le domaine Frontend API est
`dashing-tetra-46.clerk.accounts.dev`. Appelée depuis ce domaine, elle répond :

```
401 Unauthorized
{"errors":[{"message":"Browser unauthenticated",
 "long_message":"Unable to authenticate this browser for your development
 instance. Check your Clerk cookies and try again…"}]}
```

Une instance Clerk de développement s'appuie sur un mécanisme de « dev
browser » qui ne fonctionne que sur `localhost` et sur ses propres URL
`*.accounts.dev`. Sur un vrai domaine, le handshake échoue.

**La chaîne de conséquences**, et pourquoi ça ressemble à du CORS :

1. Clerk refuse d'authentifier le navigateur ;
2. aucun jeton n'est délivré ;
3. les appels à l'API partent sans `Authorization`, ou n'aboutissent pas ;
4. le navigateur affiche des erreurs réseau que Chrome habille en messages
   CORS — alors que l'API, elle, répond correctement.

---

## 3. Pourquoi ça marche en local

**En local, il n'y a aucun appel cross-origin.** Le site tourne avec
`NEXT_PUBLIC_API_URL=/lf-api`, et Next relaie côté serveur vers l'API via
`API_PROXY_TARGET`. Le navigateur ne parle qu'à `localhost` — CORS n'entre
jamais en jeu. Et Clerk, en développement, est sur `localhost` : son handshake
fonctionne.

**En ligne, l'appel est direct.** Le bundle déployé contient
`https://lf-api-develop.up.railway.app` en dur, et
`https://batchcooking-dev.labsfood.fr/lf-api/…` répond **404** — le relais
n'est pas configuré sur ce service.

Ce n'est donc pas une variable « cachée en local » : c'est que les deux
environnements empruntent **deux chemins différents**. Personne n'a tort ; il
manquait juste cette information.

---

## 4. Ce qu'il faut faire sur Clerk

### Le point qui surprend

Clerk donne **une instance de développement et une instance de production par
application**. L'instance de développement ne fonctionne que sur `localhost`.

Pour que `*-dev.labsfood.fr` fonctionne — ce sont de vrais domaines —, il faut
une instance **de type production** pointée dessus. Donc :

| Clerk | Domaine | Clés |
|---|---|---|
| Application « Lab's Food » → instance de développement | `localhost` | `pk_test_` (celle d'aujourd'hui) |
| Application « Lab's Food » → instance de production | `labsfood.fr` | `pk_live_` |
| **Seconde application** « Lab's Food — Dev » → instance de production | `*-dev.labsfood.fr` | `pk_live_` distinctes |

Sans cette seconde application, l'environnement de dev n'aura jamais d'autre
choix que des clés de test sur un vrai domaine — c'est-à-dire le problème
actuel.

### Les étapes, par instance de production

1. Tableau de bord Clerk : passer de **Development** à **Create production
   instance** (possibilité de cloner les réglages de dev).
2. **Ajouter les enregistrements DNS** listés sur la page Domains, dont le
   CNAME de la Frontend API. Propagation jusqu'à 48 h. Sur Cloudflare, mettre
   ce CNAME en **DNS only**, sans proxy.
3. **Déployer les certificats** une fois les prérequis verts. Si l'émission
   bloque, vérifier qu'aucun enregistrement CAA n'interdit Let's Encrypt.
4. **Mettre les clés dans Railway**, service par service — jamais dans un
   `.env` local : `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_…` et
   `CLERK_SECRET_KEY=sk_live_…`. Redéployer.
5. **Refaire ce qui ne se copie pas** : connexions SSO, intégrations, chemins.
6. **Identifiants OAuth propres** : le développement utilise des identifiants
   partagés, que Clerk qualifie lui-même de non sûrs en production.
7. **Webhooks** : nouvelle URL, nouveau secret de signature.

### Deux décisions à prendre en même temps

**Domaine racine ou sous-domaines ?** Déclarer `labsfood.fr` comme domaine
racine partage la session entre tous les sous-domaines. C'est pratique — mais
c'est aussi ce qui empêche d'être connecté en admin sur `admin…` et en batch
cooker sur `batchcooking…` dans le même navigateur. Une **allowlist de
sous-domaines** restreint qui peut s'en servir.

**`authorizedParties`** dans le middleware : limiter explicitement les origines
autorisées à présenter un jeton. À faire pour les deux environnements.

---

## 5. Côté API : rien, ou une ceinture en plus

La configuration CORS est correcte. L'appel direct est viable.

Si vous voulez quand même supprimer le sujet, ajoutez sur chaque service de
front dans Railway :

```
NEXT_PUBLIC_API_URL=/lf-api
API_PROXY_TARGET=https://lf-api-develop.up.railway.app   # ou l'API de prod
```

Next relaiera côté serveur et plus aucun appel ne sera cross-origin, comme en
local.

> Pour mémoire : ce relais avait été introduit parce que l'API n'annonçait que
> `GET`, `HEAD` et `POST`. Elle annonce aujourd'hui `PATCH` et `DELETE` : le
> contournement n'est donc plus indispensable.

---

## 6. État des six domaines au 29/10

| Domaine | Ce qu'il sert | Constat |
|---|---|---|
| `batchcooking-dev` | site batch cooking | 200 · API directe · pas de relais (`/lf-api` → 404) · **clé `pk_test_`** |
| `app-dev` | site principal | page de maintenance (`/bientot`) |
| `admin-dev` | console | 200 → `/login` · API `lf-api-develop` |
| `batchcooking` *(prod)* | — | **404 : rien n'est déployé** |
| `app` *(prod)* | site principal | page de maintenance |
| `admin` *(prod)* | console | 200 |
| `www.labsfood.fr` | site principal | **page de maintenance** |
| `labsfood.fr` *(apex)* | — | **ne résout pas** (ENOTFOUND) |

Trois points à trancher en dehors de Clerk :

- **`batchcooking.labsfood.fr` ne sert rien** : service non déployé ou
  mal aiguillé.
- **L'apex `labsfood.fr` ne résout pas.** Seul `www` répond. À corriger, ne
  serait-ce que pour le référencement et les liens déjà partagés.
- **La page de maintenance est en production** sur `www` et sur `app`. Si ce
  n'était pas l'intention, changer la branche déployée.

Les clés Clerk des autres domaines n'ont pas pu être lues depuis l'extérieur :
seule celle de `batchcooking-dev` était repérable dans les bundles. **À
vérifier service par service dans Railway** — une `pk_test_` en production
produirait exactement la même panne, en pire.
