# Mandat de débours — ce qu'il faut construire

Plan de mise en œuvre, backend et frontend, à partir du cahier des charges V2
(`6.Mandat de débours.pdf`). Les points durs sont analysés à part dans
[MANDAT-DE-DEBOURS-ANALYSE.md](MANDAT-DE-DEBOURS-ANALYSE.md) ; ce document-ci
dit **quoi écrire**.

> Rien de tout cela ne peut commencer avant la réponse à la question A1 : le
> forfait courses devient-il un service, ou disparaît-il ? Tout le modèle de
> facturation en dépend.

---

## Le découpage proposé

Quatre lots, dans cet ordre. Le premier a une valeur immédiate même si le
mandat n'arrive jamais.

| Lot | Contenu | Dépend de |
|---|---|---|
| **1. La liste de courses vivante** | Le client amende et confirme sa liste | Rien |
| **2. Le mandat** | Génération, signature, versions, révocation | A1, B1 (signature) |
| **3. Le run de courses** | T−48h, signal, 30 minutes, tickets | Lot 1 et 2, file de tâches |
| **4. La facturation séparée** | Deux lignes jusqu'en base, attestation juste | A1, A2 |

---

## Côté backend

### Nouvelles tables

**`disbursement_mandates`** — le mandat lui-même.

```
id · chefProfileId · clientId · status · version · parentMandateId
budgetCapCents · budgetPeriod (weekly|monthly) · mealsCount
validFrom · validTo
signedByClientAt · signedByChefAt · documentKey
createdAt · revokedAt · revokedBy
```

`status` : `draft` · `pending_signature` · `active` · `amendment_pending` ·
`revoked` · `expired` (§5 de la spec).

Un avenant **ne modifie pas** la ligne : il en crée une nouvelle avec
`parentMandateId` et `version + 1`, l'ancienne passant à `expired`. C'est ce
qu'exige le §4, et c'est la seule façon de pouvoir dire plus tard « au moment
de ce run, le mandat en vigueur disait ceci ».

**`mandate_signatures`** — une ligne par partie.

```
mandateId · party (client|chef) · signedAt · mention · ip · userAgent
providerRef (si prestataire externe)
```

**`shopping_runs`** — une session d'achats.

```
id · mandateId · bookingId · status
listConfirmedAt · signalledAt · refusalDeadlineAt · refusedAt
startedAt · completedAt · totalCents
```

`status` : les neuf états du §7.3, de `list_to_confirm` à `done`.

**`shopping_run_receipts`** — les tickets.

```
runId · fileKey · contentType · sizeBytes · amountCents · uploadedAt
```

**`shopping_list_lines`** — la liste cesse d'être calculée à la volée.

Aujourd'hui `GET /chef-missions/{id}/shopping-list` recalcule depuis les
recettes à chaque appel, et `ShoppingLineDto` ne porte que `name`, `qty`,
`unit`, `aisle`. Il faut persister l'état de chaque ligne :

```
ownedByClient · removedByClient · removedByChef · chefNote
```

### Champs à ajouter à l'existant

| Où | Champ | Pourquoi |
|---|---|---|
| Profil client | `birthDate`, `birthPlace` | Exigés par le mandat (§3) ; n'existent nulle part |
| Profil client | rendre l'adresse **en lecture** | Écrite mais jamais rendue — demande n° 1, déjà ouverte |
| Réservation | `serviceAmountCents`, `disbursementAmountCents` | Sans quoi l'attestation fiscale reste fausse |
| Paiement | la même séparation | L'attestation se calcule sur les paiements, pas sur les factures |

### Routes

**Client**

```
GET    /me/mandates                        la liste des siens
GET    /me/mandates/{id}                   le détail + le PDF
POST   /me/mandates/{id}/sign              « Bon pour mandat »
POST   /me/mandates/{id}/revoke            §7.4
PATCH  /me/shopping-lists/{id}/lines       « je l'ai déjà » / « je retire »
POST   /me/shopping-lists/{id}/confirm     la liste finale — RG-33
POST   /me/shopping-runs/{id}/refuse       dans les 30 minutes — RG-37
GET    /me/shopping-runs/{id}/receipts     consulter les tickets
```

**Batch cooker**

```
POST   /me/chef/mandates                   proposer un mandat
POST   /me/chef/mandates/{id}/sign         « Bon pour acceptation »
POST   /me/chef/mandates/{id}/amend        avenant → nouvelle version
POST   /me/chef/shopping-runs/{id}/signal  ≥ 3 h avant — RG-37
POST   /me/chef/shopping-runs/{id}/receipts/upload-url
POST   /me/chef/shopping-runs/{id}/receipts
POST   /me/chef/shopping-runs/{id}/complete   montant total constaté
PATCH  /me/chef/shopping-lists/{id}/lines     retirer un intrus — RG-34
```

**Admin**

```
GET    /admin/mandates                     liste, filtres par état
GET    /admin/mandates/{id}                + signatures + avenants
GET    /admin/shopping-runs                suivi, litiges
GET    /admin/shopping-runs/{id}/receipts/{rid}/url   lien signé
```

Le trio d'envoi des tickets se copie sur `cesu-proof` : même formats (PDF,
JPEG, PNG, WebP), même limite de 10 Mo, même stockage privé avec lien signé
5 minutes. Précédent exact, rien à inventer.

### Tâches différées

Trois réveils **par réservation**, pas un lot mensuel :

| Quand | Ce qui se passe |
|---|---|
| T − 48 h | L'annulation se verrouille ; les deux parties sont alertées (RG-35, RG-36) |
| Signal + 30 min | Le run passe à validé si personne n'a refusé (RG-38) |
| `validTo` du mandat | Le mandat passe à `expired` |

Chacun doit survivre à un redémarrage et ne jamais s'exécuter deux fois. Le
verrou consultatif Postgres de `commission-invoices/run-due` est le bon
précédent, mais il faut une vraie file, pas un `setTimeout`.

### Journal

Le §13 énumère ce qu'il faut horodater. **J'ajoute un élément qui n'y est
pas** : l'accusé de remise de chaque notification, par canal. Sans lui, le
litige « je n'ai jamais vu le message » est indécidable, et c'est celui qui
arrivera le plus souvent.

---

## Côté frontend

### Espace client

| Écran | Ce qu'il faut |
|---|---|
| **Ma liste de courses** | Chaque ligne devient cochable : « je l'ai déjà », « je retire ». Un bouton **Confirmer ma liste** qui ferme l'étape. Aujourd'hui l'écran est en lecture seule — c'est le lot 1, utile tout de suite. |
| **Mon mandat** | Lecture du mandat, signature avec la mention « Bon pour mandat », téléchargement du PDF, révocation. Nouvel écran. |
| **Le signal** | « {chef} va faire les courses — il vous reste 27 min pour refuser », avec le compte à rebours et le bouton. À placer sur la commande **et** dans le mail : le client ne sera pas forcément sur le site. |
| **Ma commande** | La facture en deux lignes, service et débours, avec les tickets consultables et le rappel que seul le service ouvre droit au crédit d'impôt. |
| **Mes paramètres** | Le centre de préférences de notification (§8) — n'existe pas, et aucune route ne le porte. |

### Espace batch cooker

| Écran | Ce qu'il faut |
|---|---|
| **Mes prestations** | Le budget restant, l'état du run, et le bouton **Je vais faire les courses** — grisé avant T−48h, avec la raison écrite. |
| **Mon mandat** | Proposer, signer, faire un avenant, voir les versions. |
| **Après les courses** | Déposer les tickets, saisir le montant constaté, suivre le remboursement. |
| **Un garde-fou** | Avant T−48h, l'écran doit dire que les débours **resteront à sa charge** s'il achète quand même (RG-35). Le bouton seul ne suffit pas. |

### Console admin

| Écran | Ce qu'il faut |
|---|---|
| **Mandats** | Liste par état, détail, signatures, avenants, PDF. |
| **Runs de courses** | Suivi, tickets, et l'instruction d'un litige. |
| **Transactions** | La ligne débours à part de la ligne service. |
| **Formules** | Le forfait courses change de nature — l'écran doit le dire (cf. A1). |

---

## Ce qui change dans l'existant

Trois endroits déjà construits sont touchés :

**`/espace-chef/tarifs`** — `shoppingFeeCents` ne peut plus désigner les
ingrédients. Selon A1 : il devient le prix du **temps** de courses, ou il
disparaît.

**L'attestation fiscale** — le calcul doit exclure les débours. L'écran de la
console que j'ai branché le 24/10 affichera des montants faux tant que ce n'est
pas fait.

**Les factures de commission** — l'assiette doit exclure les débours (cf. A3).

---

## Les questions

### A — Pour l'expert-comptable

**A1. Le forfait courses devient-il un service, ou disparaît-il ?**
C'est la question qui bloque tout. Un forfait est un écart par construction, et
§10 dit qu'au moindre écart ce n'est plus un débours. S'il devient le prix du
temps passé à faire les courses, il reste éligible au crédit d'impôt et les
ingrédients forment une seconde ligne au réel.

**A2. L'attestation fiscale doit-elle mentionner les débours, ne serait-ce que
pour mémoire ?** Ou les taire entièrement ?

**A3. Sur quelle assiette la commission Lab's Food se calcule-t-elle ?** Si
c'est le total, la plateforme prend une marge sur les courses — ce que le
mandat interdit au cuisinier.

**A4. Quelle durée de conservation pour les mandats et les tickets ?** Le §12
dit « aucune imposée par la plateforme », et la note de prudence du même
paragraphe dit l'inverse. À trancher.

**A5. Quelle tolérance de dépassement ?** Un avenant pour 3 € ne se fera
jamais ; une tolérance non écrite est un risque.

### B — Pour le juridique

**B1. Quel niveau de signature électronique ?** Simple, avancée, qualifiée. Le
coût du prestataire va du simple au triple.

**B2. Le silence de 30 minutes vaut-il engagement ?** Et si oui, quelle preuve
de remise faut-il garder ? C'est le cœur du litige le plus probable.

**B3. Qui porte l'impayé ?** RG-40 : le batch cooker avance, la plateforme ne
détient pas l'argent. Si le client ne rembourse pas, le cuisinier est seul.

### C — Pour le produit

**C1. Le mandat est-il annuel ou par prestation ?** Le modèle Word dit « sur
toute l'année 2026 » avec un budget hebdomadaire ; le §3 rattache les mêmes
champs à « Prestation / formule ». Les deux lectures sont possibles et elles ne
donnent pas le même produit : une signature par an, ou une par réservation.

**C2. Que devient la prestation si le client refuse le run après T−48h ?**
Point ouvert n° 7 de la spec. **Sans réponse, la machine à états ne peut pas
être dessinée.**

**C3. Blocage strict ou avertissement** si le batch cooker déclenche les
courses avant T−48h ? Point ouvert n° 6.

**C4. Politique de substitution** d'un ingrédient dans la limite du budget ?
Point ouvert n° 9.

**C5. Impose-t-on un ticket séparé ?** Un ticket mixte — ses courses et celles
du client — ne prouve aucun débours.

### D — Pour le backend

**D1.** Séparer service et débours jusqu'au paiement, et exclure les débours du
calcul de `eligibleAmountCents`.

**D2.** Ajouter `birthDate` et `birthPlace` au profil client, et rendre
l'adresse en lecture (demande n° 1, déjà ouverte).

**D3.** Une file de tâches différées avec garantie d'exécution unique.

**D4.** Le rendu PDF et l'archivage — le même besoin que les factures de
commission, dont la documentation dit qu'il appartient « à une phase
ultérieure ». Aucune des deux n'existe.

**D5.** Les préférences de notification (demande n° 4, déjà ouverte) : le §8 en
dépend entièrement.

---

## Ce que je ferais en attendant les réponses

Le **lot 1** ne dépend d'aucune décision et sert dès aujourd'hui : le client
reçoit une liste de courses qu'il ne peut ni amender ni confirmer, alors que la
spec lui en donne le dernier mot. C'est deux routes côté API et un écran déjà
écrit à compléter.

Tout le reste attend A1, B2 et C2.
