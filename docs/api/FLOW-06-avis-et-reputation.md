# FLOW-06 — Avis et réputation

> **Document v1**, rédigé le 11/10/2026. Aucune route n'existe.
> Particularité : l'API **réserve déjà la place** — `GET /menus/week` et
> `GET /chefs/{id}` renvoient `rating` et `reviewCount`, toujours à `null`.
> Il ne manque donc pas un modèle, il manque le module.

Écrans concernés : `/espace-chef/avis`, `/admin/avis` (tous deux sur maquette),
la carte publique d'un batch cooker (`/menu`), et sa page (`GET /chefs/{id}`).

---

## 1. Les règles qui viennent du métier

**1.1 On n'écrit un avis que sur une prestation qu'on a vécue.** Pas d'avis
libre sur un batch cooker : un avis est attaché à une réservation terminée, et
une réservation ne peut en porter qu'un. C'est ce qui sépare un avis d'un
commentaire de forum, et c'est la seule défense sérieuse contre les faux.

**1.2 Une note sans texte reste un avis.** Beaucoup de clients mettront cinq
étoiles sans un mot. Le texte est facultatif, la note non.

**1.3 Le batch cooker peut répondre, une fois.** Une réponse publique sous
l'avis, pas un échange : la conversation a sa place dans la messagerie.

**1.4 Un avis ne se supprime pas sur demande.** Ni par le batch cooker, ni par
le client après coup. Il se **signale**, et la modération tranche avec un motif
— exactement comme un plat suspendu dans
[`FLOW-02`](FLOW-02-plats-et-menus.md). Sans cette règle, la note ne vaut rien.

**1.5 La note publique est calculée par l'API.** Jamais par le front : deux
écrans qui moyennent eux-mêmes finissent par afficher deux notes différentes
pour le même batch cooker.

---

## 2. Écrire un avis

```
POST /me/bookings/{id}/review     { rating, comment? }   → 201
GET  /me/reviews                                          → les avis que j'ai écrits
```

| Champ | Règle |
|---|---|
| `rating` | Entier 1–5. Pas de demi-étoile : personne ne sait ce que vaut 3,5 |
| `comment` | Facultatif, 10 à 2000 caractères quand il est là |

Refus attendus :

| Code | Cas |
|---|---|
| `409 BOOKING_NOT_COMPLETED` | La prestation n'a pas eu lieu |
| `409 ALREADY_REVIEWED` | Un avis existe déjà pour cette réservation |
| `403` | Ce n'est pas la réservation de l'appelant |
| `409 REVIEW_WINDOW_CLOSED` | Au-delà du délai (§ 5, question 1) |

Une invitation à noter, par email ou par notification, après la clôture : à
prévoir, mais c'est un autre sujet que celui-ci.

---

## 3. Lire les avis

### 3.1 Publiquement

```
GET /chefs/{id}/reviews?page=&limit=     → { data: [ … ], meta: { … } }
```

```json
{
  "id": "…",
  "rating": 5,
  "comment": "Trois plats, zéro vaisselle, et le frigo plein pour la semaine.",
  "authorFirstName": "Sophie",
  "createdAt": "2026-10-02T18:30:00.000Z",
  "bookingReference": "LF-2026-0142",
  "reply": { "body": "Merci Sophie !", "createdAt": "2026-10-03T09:00:00.000Z" }
}
```

**Le prénom seul.** Pas de nom de famille, pas d'email, pas de ville : un avis
public ne doit pas permettre d'identifier le client. `bookingReference` sert au
support, et peut rester hors de la réponse publique si le métier préfère.

Et les deux champs déjà réservés, enfin remplis :

```json
{ "rating": 4.8, "reviewCount": 23 }
```

`rating` à `null` et `reviewCount` à `0` pour un batch cooker sans avis — c'est
déjà le comportement actuel, et le front l'affiche correctement (« Pas encore
d'avis »).

### 3.2 Par le batch cooker

```
GET  /me/reviews-received?page=&limit=   → ses avis, le plus récent d'abord
POST /me/reviews/{id}/reply              { body }
POST /me/reviews/{id}/report             { reason }
```

L'écran `/espace-chef/avis` existe déjà en maquette : il attend ces trois
routes, plus la note moyenne et la répartition par étoile.

### 3.3 Par la console

```
GET   /admin/reviews?status=reported&page=&limit=
PATCH /admin/reviews/{id}/moderation     { status, reason, reasonCode }
```

Mêmes statuts et même exigence de motif que la modération de contenu :
`published`, `hidden`. Et la même conséquence : **masquer un avis le retire du
calcul de la note**, sinon la modération ne sert à rien. Toute décision est
journalisée.

---

## 4. Ce que ça change ailleurs

| Écran | Aujourd'hui | Avec le module |
|---|---|---|
| Carte de la semaine | « Pas encore d'avis » pour tout le monde | La note et le nombre d'avis |
| Page publique d'un chef | Aucun avis | La liste, paginée |
| `/espace-chef/avis` | Maquette | Ses avis, ses réponses |
| `/espace-chef/vitrine` | « Pas encore d'avis », en dur | Sa note réelle |
| `/admin/avis` | Maquette | La file des avis signalés |
| Classement des cartes | Rotation mensuelle | La note pourrait y entrer — **décision métier** |

La dernière ligne mérite un arbitrage explicite : aujourd'hui l'ordre des cartes
tourne une fois par mois, pour que les mêmes ne soient pas toujours en tête. Si
la note se met à peser, un batch cooker qui démarre ne sera jamais vu. C'est un
choix de produit, pas un détail d'algorithme.

---

## 5. Questions ouvertes

1. **Quel délai pour noter ?** Sept jours après la prestation, trente, sans
   limite ?
2. **Un avis se modifie-t-il ?** Si oui, pendant combien de temps, et
   l'historique est-il gardé ?
3. **Combien d'avis avant d'afficher une note ?** Une seule note de 5 ★ donne
   « 5,0 » et c'est trompeur. Un plancher (trois avis ?) est courant.
4. **Les avis survivent-ils au départ d'un batch cooker ?** Et à la suppression
   d'un compte client — l'avis devient-il anonyme ?
5. **Le batch cooker note-t-il le client ?** Rien ne le prévoit aujourd'hui.
   Utile pour la confiance côté chef, mais c'est un module de plus.
