# FLOW-04 — Agenda du batch cooker et disponibilités vues par le client

> **Livré le 16/10/2026.** Ce document a été écrit le 11/10 comme une demande ;
> le backend l'a suivi, et les routes existent : `GET/PUT /chef/availability`,
> `GET /chef/agenda`, `/chef/agenda/summary`, `/chef/agenda/blocks`,
> `GET /chefs/{id}/availability`. Il est gardé tel quel parce qu'il explique le
> **pourquoi** — ce que l'OpenAPI ne dit pas.
>
> Trois écarts, tous en mieux : l'implémentation ajoute un `version` qui refuse
> une sauvegarde venue d'un onglet périmé (§ 3.2 ne le demandait pas), des
> **blocs** horaires distincts des journées fermées, et la durée d'un créneau
> vient de l'**offre de service** réservée — ce qui répond à la question 1 du
> § 7. Reste ouvert : les offres de service elles-mêmes n'ont aucune route
> (BLK-23), donc un batch cooker sans offre n'est pas réservable.

Écrans concernés :

| Écran | Ce qu'il fait aujourd'hui |
|---|---|
| `/espace-chef/agenda` | Quatre échelles — jour, semaine, mois, année — sur des données simulées (`lib/chef/mock.ts`, `lib/chef/schedule.ts`) |
| `/espace-client/reservation`, étape « infos » | Un `<input type="date">` libre et une liste de créneaux **en dur** : le client peut demander un horaire où le batch cooker ne travaille pas |
| `/menu` et `/espace-client/menus`, carte d'un chef | Aucun signal de disponibilité |

---

## 1. Les règles qui viennent du métier, pas du front

**1.1 Deux niveaux, pas un.** Un batch cooker travaille « les mardis et jeudis
matin » : c'est une trame qui se répète. Et il ferme « le jeudi 12 novembre » :
c'est une exception sur une date. Une seule liste de dates obligerait à ressaisir
la même semaine indéfiniment ; une seule trame interdirait de poser des vacances.
Les deux niveaux existent déjà dans le front (`lib/chef/schedule.ts`) et la
fusion y est écrite : **l'exception gagne sur la trame**.

**1.2 Une prestation acceptée n'est jamais effacée par un changement
d'horaires.** Si le batch cooker réduit ses mardis après avoir accepté une
session un mardi, la session reste. L'API ne doit pas la supprimer, et l'agenda
doit pouvoir montrer le conflit — c'est au batch cooker de prévenir son client,
pas au système de trancher dans son dos.

**1.3 Ce que voit le client n'est pas l'agenda du batch cooker.** Le client ne
doit jamais apprendre qu'une autre session est prévue, ni lire le motif d'une
fermeture (« rendez-vous médical »). Il voit des **créneaux réservables**, et
rien d'autre : disponibilité déclarée, moins les prestations déjà prises, moins
les tampons. C'est une projection, pas une fuite de calendrier.

**1.4 La durée d'une session dépend de ce qui est commandé.** Sept plats pour
six personnes ne prennent pas le temps de trois plats pour deux. Les créneaux
réservables se calculent donc **pour une durée donnée** : l'API doit les
renvoyer en fonction de la demande, sinon le front devra dupliquer la règle de
durée, et elle divergera.

**1.5 On ne réserve pas pour dans une heure.** Il faut un préavis minimum
(`minNoticeHours`) — le batch cooker doit pouvoir faire les courses — et un
horizon maximum (`maxHorizonDays`), au-delà duquel on ne prend pas d'engagement.
Les deux sont des réglages du batch cooker, avec une valeur par défaut posée par
Lab's Food.

**1.6 Un batch cooker hors ligne n'a pas de disponibilités.** `isActive: false`
doit vider les créneaux réservables, sans toucher à sa trame : il la retrouve
telle quelle quand il revient.

---

## 2. Le modèle

Celui du front, qui a déjà servi à construire l'écran. Les heures sont des
**minutes depuis minuit** (0 à 1440) : comparables et additionnables, ce que
« 9h30 » n'est pas.

```json
{
  "timezone": "Europe/Paris",
  "minNoticeHours": 48,
  "maxHorizonDays": 60,
  "weekly": [
    { "id": "w1", "weekday": 1, "start": 540, "end": 780 },
    { "id": "w2", "weekday": 1, "start": 840, "end": 1080 },
    { "id": "w3", "weekday": 3, "start": 540, "end": 780 }
  ],
  "exceptions": [
    { "id": "x1", "date": "2026-11-12", "kind": "closed", "reason": "Vacances" },
    { "id": "x2", "date": "2026-11-15", "kind": "extra", "start": 600, "end": 900 }
  ]
}
```

- `weekday` : **0 = lundi**, 6 = dimanche. À écrire noir sur blanc dans la doc
  de l'API : `Date.getDay()` met dimanche à 0, et c'est une source d'erreurs
  silencieuses à un jour près.
- `date` : jour de calendrier en `YYYY-MM-DD`, **sans fuseau**. Une fermeture
  n'est pas un intervalle UTC : le 12 novembre est le 12 novembre.
- `kind` : `closed` ferme la journée entière et gagne sur tout le reste ;
  `extra` ajoute un créneau ce jour-là.
- `timezone` : celui du batch cooker. Tout le reste de l'API est en UTC, mais
  des horaires de travail n'ont de sens que dans un fuseau — et il changera le
  jour où un batch cooker travaillera hors de France métropolitaine.

---

## 3. Côté batch cooker

### 3.1 `GET /me/availability`

Rend l'objet du § 2. Jamais `404` : un batch cooker sans disponibilités rend
`weekly: []`, ce qui veut dire « aucun créneau déclaré », pas « introuvable ».

### 3.2 `PUT /me/availability`

La trame entière, telle qu'on la veut — même convention que
`PUT /me/showcase/weeks` et que les sections de `PATCH /me/chef-application` :
on envoie le tout, l'API remplace. C'est ce qui évite de bricoler des
diff côté front sur une liste que deux onglets peuvent modifier.

```json
{
  "minNoticeHours": 48,
  "maxHorizonDays": 60,
  "weekly": [{ "weekday": 1, "start": 540, "end": 780 }]
}
```

Refus attendus :

| Code | Cas |
|---|---|
| `422 SLOT_INVALID` | `start >= end`, ou hors de 0–1440 |
| `422 SLOT_OVERLAP` | deux créneaux du même jour se chevauchent — l'écran l'empêche déjà, l'API doit le garantir |
| `422 SLOT_TOO_SHORT` | créneau plus court que la durée minimale d'une session |
| `403 CHEF_NOT_VERIFIED` | compte non approuvé, comme pour `PATCH /me/chef-profile` |

**Réduire ses horaires là où une prestation est déjà prise ne doit pas être
refusé** : la règle 1.2 l'exige. La réponse signale le conflit sans bloquer.

```json
{
  "weekly": [],
  "conflicts": [
    { "bookingId": "…", "reference": "LF-2026-0142", "startsAt": "2026-11-17T08:00:00.000Z" }
  ]
}
```

### 3.3 Les exceptions

```
POST   /me/availability/exceptions      { date, kind, start?, end?, reason? }
DELETE /me/availability/exceptions/{id}
```

Une exception se pose et se retire à l'unité : c'est un geste ponctuel, pas une
trame. `reason` est **privé** — il ne sort jamais vers un client.

Pour des vacances, poser trente exceptions `closed` est absurde côté client
comme côté base. Deux options, à arbitrer : accepter `{ from, to }` sur une
exception `closed`, ou un objet `absences` distinct. Le front préfère la
première : une absence est une fermeture qui dure.

### 3.4 `GET /me/agenda?from=&to=`

L'écran lit quatre échelles sur les mêmes données. Il lui faut **un** appel qui
rende la fusion déjà faite, par journée — parce que la règle de fusion
(« l'exception gagne sur la trame ») ne doit pas vivre en double.

```json
{
  "from": "2026-11-01",
  "to": "2026-11-30",
  "timezone": "Europe/Paris",
  "days": [
    {
      "date": "2026-11-17",
      "closed": false,
      "working": [{ "start": 540, "end": 780 }],
      "bookings": [
        {
          "id": "…",
          "reference": "LF-2026-0142",
          "status": "confirmed",
          "start": 540,
          "end": 720,
          "clientName": "Sophie M.",
          "portions": 12,
          "outsideWorkingHours": false
        }
      ],
      "requests": [
        { "id": "…", "start": 840, "end": 1020, "clientName": "Lucas M.", "expiresAt": "2026-11-12T18:00:00.000Z" }
      ]
    }
  ]
}
```

- `start` / `end` en minutes **locales** : c'est une grille horaire qu'on
  dessine, pas un instant qu'on compare. Les `startsAt` UTC restent disponibles
  sur la réservation elle-même.
- `outsideWorkingHours` matérialise la règle 1.2 sans que le front recalcule.
- `requests` n'existe que si les demandes à confirmer existent (§ 7, question 3).
- `from`/`to` bornés — un an au plus par appel, pour la vue année.

---

## 4. Côté client : les créneaux réservables

### 4.1 `GET /chefs/{id}/availability`

C'est la route qui manque le plus : aujourd'hui l'étape « infos » de la
réservation propose un champ date libre et une liste d'horaires en dur. Un
client peut donc demander un créneau où le batch cooker ne travaille pas, et ne
l'apprendre qu'après.

| Paramètre | Rôle |
|---|---|
| `from`, `to` | Fenêtre demandée, bornée par `maxHorizonDays` |
| `durationMinutes` | Durée souhaitée. Par défaut : celle calculée pour `portions` et `dishes` |
| `dishes`, `portions` | De quoi laisser l'API calculer la durée (règle 1.4) |

```json
{
  "chefId": "…",
  "timezone": "Europe/Paris",
  "durationMinutes": 180,
  "days": [
    {
      "date": "2026-11-17",
      "slots": [
        { "start": "2026-11-17T08:00:00.000Z", "end": "2026-11-17T11:00:00.000Z" },
        { "start": "2026-11-17T12:00:00.000Z", "end": "2026-11-17T15:00:00.000Z" }
      ]
    },
    { "date": "2026-11-18", "slots": [] }
  ]
}
```

Trois points qui comptent :

1. **Les créneaux sont déjà nets.** Disponibilité déclarée, moins les
   prestations prises, moins les tampons, moins le préavis. Le front n'a aucune
   soustraction à faire — et donc aucune occasion de proposer un créneau qui
   sera refusé.
2. **Un jour sans créneau est rendu avec `slots: []`**, pas omis. Le calendrier
   doit pouvoir dire « rien ce jour-là » plutôt que « pas de réponse ».
3. **Aucune information privée.** Ni le motif d'une fermeture, ni l'existence
   d'une autre réservation. Un jour entièrement pris ressemble à un jour fermé :
   c'est voulu.

Cette route est **publique**, comme `GET /chefs/{id}` : le client compare les
batch cookers avant de se connecter.

### 4.2 Un signal sur la carte de la semaine

`GET /menus/week` rend déjà une carte par batch cooker. Deux champs y éviteraient
autant d'appels que de cartes affichées :

```json
{ "nextAvailableAt": "2026-11-17T08:00:00.000Z", "openSlotsNextDays": 4 }
```

« Libre dès mardi » sur une carte vaut mieux que « disponible sur demande », qui
est ce que l'écran affiche aujourd'hui faute de mieux. `slotsLeft`, déjà présent,
compte des places de menu — pas des créneaux : ne pas les confondre.

### 4.3 La réservation elle-même

Une liste de créneaux est une **photographie**. Entre l'affichage et le clic,
un autre client peut avoir pris le même. L'API tient la vérité :

| Code | Cas |
|---|---|
| `409 SLOT_TAKEN` | Le créneau vient d'être pris. Le front recharge et le dit |
| `409 SLOT_CLOSED` | Le batch cooker a fermé ce créneau entre-temps |
| `422 NOTICE_TOO_SHORT` | En dessous de `minNoticeHours` |
| `422 OUTSIDE_HORIZON` | Au-delà de `maxHorizonDays` |

Rappel : `POST /bookings` répond `501` aujourd'hui. Tant qu'il n'est pas ouvert,
cette route de disponibilités n'a personne à servir — les deux vont ensemble, et
`POST /bookings` passe d'abord.

---

## 5. Ce que le front sait déjà faire

Pour que le backend n'ait pas à deviner la forme attendue :

| Front | Rôle |
|---|---|
| `lib/chef/schedule.ts` | Le modèle du § 2, la fusion trame + exceptions (`workingRanges`), les conversions minutes ↔ `HH:MM`, le total d'heures |
| `app/espace-chef/agenda/page.tsx` | Les quatre échelles, l'édition de la trame, les exceptions |
| `app/espace-client/reservation/page.tsx` | L'étape à brancher sur le § 4.1, en remplaçant le champ date libre |

Le front garde ces fonctions : elles serviront à l'affichage. Ce qu'il doit
cesser de faire, c'est **décider** — quels créneaux sont réservables, et à
partir de quand.

---

## 6. Autorisations

| Route | Accès |
|---|---|
| `GET`, `PUT /me/availability`, `…/exceptions` | Chef approuvé (`403 CHEF_NOT_VERIFIED` sinon) |
| `GET /me/agenda` | Chef, ses données seulement |
| `GET /chefs/{id}/availability` | **Public** |
| Lecture de l'agenda d'un chef par un admin | `GET /admin/chefs/{id}/agenda`, et **journalisée** — comme l'ouverture d'un fil client ↔ chef |

---

## 7. Questions ouvertes

1. **Qui calcule la durée d'une session ?** Le front ne doit pas. Faut-il une
   règle (« 30 min par plat, plancher 2 h, plafond 5 h »), une valeur par
   formule, ou un réglage par batch cooker ? Sans réponse, `durationMinutes`
   reste obligatoire côté appelant, et la règle 1.4 n'est pas tenue.
2. **Un tampon entre deux sessions ?** Trajet, courses, nettoyage. Fixe, par
   batch cooker, ou calculé sur la distance entre deux adresses ?
3. **La réservation est-elle instantanée ou soumise à acceptation ?** L'agenda
   affiche aujourd'hui des « demandes à confirmer », donc le front suppose une
   acceptation. Si la réservation est instantanée, `requests` disparaît du § 3.4
   — et il faut le décider avant de brancher l'écran.
4. **Combien de sessions par jour au maximum ?** Deux créneaux de trois heures
   le même jour sont possibles sur la trame ; est-ce souhaitable ?
5. **Les absences longues** : exception `closed` avec `{ from, to }`, ou objet
   dédié ? (§ 3.3)
6. **Les jours fériés** sont-ils fermés par défaut, ou au batch cooker de les
   poser ?
7. **Que devient une prestation acceptée quand un batch cooker est retiré du
   public** (`isActive: false`) ? Elle tient, a priori — mais il faut l'écrire.
