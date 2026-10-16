# FLOW-05 — Le déroulé d'une prestation, de l'arrivée au compte rendu

> **Document v1 du 11/10/2026, largement livré le 16/10.**
>
> Implémenté depuis : le pointage d'arrivée (§ 2, sous la forme d'une
> transition vers `cooking` qui écrit `arrivedAt`), les photos de session
> (§ 4), la part nette et la commission (§ 6.2), et **l'adresse de la
> prestation** — la ligne la plus gênante du § 7.
>
> Restent à faire, et les deux attendent un cadrage plutôt que du code : la
> **checklist d'hygiène** (§ 3), dont le contenu doit être arrêté par Lab's
> Food, et le **mandat de débours** (§ 5), dont les quatre questions
> juridiques sont toujours ouvertes. Le compte rendu au client (§ 6.1) n'a pas
> de route dédiée, mais tout ce qu'il contient est désormais lisible.

Écrans concernés : `/espace-chef/prestations` (branché sur ce qui existe depuis
le 11/10) et `/espace-client/commandes/:id`.

---

## 1. Ce qui a été retiré, et pourquoi

Jusqu'au 11/10, l'écran des prestations simulait cinq choses sur des maquettes :
pointage d'arrivée, checklist d'hygiène, photos de session, mandat de débours,
part nette du batch cooker. Elles ont été **supprimées plutôt que gardées**, et
nommées à l'écran comme indisponibles.

La raison est la même pour les cinq : un bouton « Je suis arrivé(e) » qui
n'écrit nulle part est pire qu'un bouton absent. Le batch cooker croit avoir
pointé, et le jour d'un litige il n'y a rien. Les composants correspondants
(`RecipeSheet`, `ShoppingList`, `ExpenseMandate`) sont dans l'historique Git du
dépôt `batchcooking-web`, commit précédant `feat(prestations)` du 11/10 : ils
seront repris quand les routes existeront.

---

## 2. Le pointage d'arrivée

**La règle métier :** l'heure d'arrivée est enregistrée côté serveur et fait
foi. Ce n'est pas un confort d'interface, c'est la preuve en cas de
contestation sur la durée d'une prestation.

```
POST /chef-missions/{id}/arrival        → 201 { arrivedAt, source }
POST /chef-missions/{id}/completion     → 201 { completedAt }
```

Deux points :

1. **L'heure vient du serveur**, pas du navigateur. Un `arrivedAt` envoyé par
   le client est modifiable par le client.
2. **Idempotent.** Pointer deux fois rend le premier horodatage, sans erreur :
   un double tap sur un téléphone ne doit pas créer deux arrivées, ni afficher
   un échec.

Refus attendus : `409 TOO_EARLY` (bien avant le créneau — à quelle marge ?),
`409 ALREADY_COMPLETED`, `404` si la prestation n'est pas celle du batch cooker.

La prestation devrait porter ces deux horodatages en lecture, pour le batch
cooker **et** pour le client : « arrivé à 9 h 05, terminé à 12 h 20 » est ce
que le client veut lire sur sa commande.

---

## 3. La checklist d'hygiène

**Statut : à écrire avec Lab's Food avant toute implémentation.** La maquette
en portait une, avec la mention « contenu provisoire ». Une checklist d'hygiène
qui n'a pas été validée par le métier n'est pas un détail d'interface : c'est un
document opposable.

Ce qu'il faut décider d'abord : la liste exacte, qui l'arrête, si elle est
bloquante pour clôturer la prestation, et si elle est versionnée (une checklist
signée il y a six mois ne doit pas changer rétroactivement).

Forme probable, une fois la liste arrêtée :

```
GET  /referentials/hygiene-checklist    → [{ code, label, blocking, version }]
PUT  /chef-missions/{id}/checklist      → { items: [{ code, checked }] }
```

Le référentiel côté API, pas en dur dans le front : c'est le seul moyen de la
faire évoluer sans redéployer, et de savoir quelle version a été cochée.

---

## 4. Les photos de session

Plats dressés, contenants étiquetés, cuisine rendue. Elles accompagnent le
compte rendu lu par le client — et protègent le batch cooker autant que le
client.

Même trio que partout ailleurs dans cette API (pièces justificatives, photos de
plat, pièces jointes de messagerie) :

```
POST   /chef-missions/{id}/photos/upload-url   { mimeType, sizeBytes } → { uploadId, url, headers, expiresAt }
POST   /chef-missions/{id}/photos/confirm      { uploadId, caption? }  → { id, url, caption, createdAt }
DELETE /chef-missions/{id}/photos/{photoId}
GET    /chef-missions/{id}/photos              → [ … ]
```

Contraintes à aligner sur l'existant : JPEG, PNG ou WebP, 10 Mo par fichier.
Nombre maximum par prestation à fixer — la messagerie plafonne à 3 pièces par
message, ici il en faudra davantage (une dizaine ?).

Deux questions : **qui peut les supprimer, et jusqu'à quand ?** Une photo
retirée après un litige ouvert, c'est une preuve qui disparaît. Et **le client
les voit-il avant la clôture**, ou seulement dans le compte rendu ?

---

## 5. Le mandat de débours

**C'est la partie qui a des conséquences juridiques, et la moins avancée.**

La règle : quand les courses sont à la charge du batch cooker, il avance
l'argent pour le compte du client. Le mandat de débours est ce qui rend cette
avance remboursable sans être un achat-revente — avec un plafond, et des
justificatifs.

Ce que le front avait en maquette : un plafond (`expenseCap`), une signature du
batch cooker, une signature du client, un document imprimable.

Ce qu'il faut décider avant d'écrire une ligne :

1. **Qui signe, quand, et avec quelle valeur ?** Une case cochée dans une
   application n'est pas une signature électronique au sens du règlement eIDAS.
   Le besoin réel est peut-être plus simple (acceptation horodatée des CGV) —
   mais c'est au métier et au juriste de le dire, pas au front.
2. **Le plafond** est-il par prestation, par formule, négocié ?
3. **Les justificatifs** : le batch cooker photographie ses tickets ? Qui
   contrôle l'écart entre le plafond et le réel ? Que se passe-t-il au-dessus ?
4. **Le remboursement** passe-t-il par Lab's Food ou directement entre le
   client et le batch cooker ? La réponse change tout le reste, y compris la
   TVA.

Forme minimale, sous réserve de ces réponses :

```
GET  /chef-missions/{id}/expense-mandate   → { capCents, acceptedByChefAt, acceptedByClientAt, documentUrl }
POST /chef-missions/{id}/expense-mandate/accept
POST /chef-missions/{id}/expenses          { amountCents, receiptUploadId }
```

Tant que les quatre questions sont ouvertes, **le front n'affiche rien** : un
mandat simulé est pire qu'un mandat absent.

---

## 6. Le compte rendu, et la part du batch cooker

### 6.1 Compte rendu

Une fois la prestation clôturée, le client reçoit un récapitulatif : ce qui a
été cuisiné, les portions, les photos, le réchauffage et la conservation de
chaque plat. **Tout existe déjà** côté API — `bookingMeals`, les fiches recettes
par plat — sauf l'assemblage et son envoi. Deux possibilités : une route qui
rend le compte rendu, ou un email déclenché par la clôture. La première est
préférable : le client doit pouvoir le relire six mois plus tard.

### 6.2 La part du batch cooker

Une réservation porte `priceCents`, ce que paie le client. Elle ne porte **ni la
commission, ni la part nette** du batch cooker. Or c'est le premier chiffre
qu'il regarde sur une prestation.

```json
{ "priceCents": 9900, "commissionCents": 990, "netCents": 8910, "commissionRate": 0.1 }
```

Le taux de commission n'est pas arbitré à ce jour : le front affichait 10 % en
maquette, explicitement marqué comme valeur de démonstration. Voir aussi
[`FLOW-07`](FLOW-07-remuneration-batch-cooker.md) pour les versements.

---

## 7. Récapitulatif

| Besoin | Existe | Manque |
|---|---|---|
| Liste de courses, corrections, remise à zéro | ✅ `/chef-missions/{id}/shopping-list` | — |
| Fiches recettes, versions épinglées, bascule | ✅ `/chef-missions/{id}/…/recipe-sheet`, `/recipes/repin` | — |
| Pointage d'arrivée et clôture | ❌ | § 2 |
| Checklist d'hygiène | ❌ | § 3, **contenu à valider d'abord** |
| Photos de session | ❌ | § 4 |
| Mandat de débours et justificatifs | ❌ | § 5, **cadrage juridique d'abord** |
| Compte rendu au client | ❌ | § 6.1 |
| Part nette et commission | ❌ | § 6.2 |
| Adresse de la prestation | ❌ | Jamais rendue ; le batch cooker ne sait pas où aller |

La dernière ligne est la plus gênante des neuf : la prestation se déroule chez
le client, et aucune route ne dit où.
