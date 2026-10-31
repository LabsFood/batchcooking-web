# Mandat de débours — ce qui sera difficile

Lecture du cahier des charges V2 (`6.Mandat de débours.pdf`, Drive équipe) croisée
avec l'API en ligne (`lf-api-develop`, v1.3.0, 195 chemins) et les deux fronts,
le 25/10/2026.

Ce document ne répète pas la spec : il dit où ça va coincer, et ce qu'il faut
trancher avant d'écrire la première ligne.

---

## Le point de départ : le modèle actuel contredit le mandat

Aujourd'hui, les courses se facturent **au forfait**. Une formule porte
`shoppingIncluded` et `shoppingFeeCents` — un montant fixe que le batch cooker
décide lui-même dans *Mes tarifs* — et `GET /service-offers/{id}/price` le
range dans `amountTtc` à côté de la prestation.

Le mandat dit l'inverse, et il le dit deux fois :

> **RG-31** — refacturés **au centime près, sans marge**, sur une ligne
> « débours » distincte.
>
> **§10** — au moindre écart avec la somme réellement avancée, ce n'est plus un
> débours mais une vente, ce qui change le traitement fiscal.

Un forfait **est** un écart, par construction : il tombe toujours au-dessus ou
au-dessous de la dépense réelle. Les deux modèles ne peuvent pas coexister sur
la même ligne de facture.

**Ce qu'il faut trancher, et c'est la décision structurante :**

| Option | Conséquence |
|---|---|
| Le forfait devient un **service** — le temps passé à faire les courses, pas les ingrédients | Il reste éligible au crédit d'impôt, et les ingrédients deviennent une seconde ligne, au réel. C'est à mon avis la bonne lecture, mais elle doit être validée par l'expert-comptable. |
| Le forfait disparaît | Seuls les tickets sont refacturés. Le batch cooker n'est plus payé pour le temps de courses, ce qui le pénalise. |
| On garde les deux circuits selon la formule | Deux modèles de facturation à maintenir, deux attestations fiscales à calculer. Coûteux, et source d'erreurs fiscales. |

Rien d'autre ne peut être conçu avant cette réponse.

---

## Les huit points complexes, du plus risqué au moins

### 1. L'engagement par le silence — risque juridique, pas technique

**RG-38** : sans refus dans les 30 minutes, le run est validé et les débours
sont dus.

Une somme devient donc exigible parce que quelqu'un **n'a rien fait**. Trois
conditions doivent être réunies pour que ça tienne devant une contestation :

- la notification doit être **réellement partie**, et on doit pouvoir le
  prouver — pas « envoyée », mais acceptée par le fournisseur, avec son
  identifiant de remise ;
- l'horloge doit être celle du **serveur**, jamais celle du téléphone ;
- les 30 minutes doivent courir à partir de la **remise**, pas de l'émission.

Et le cas qui arrivera : notifications coupées, e-mail en spam, client au
travail. Il est engagé sur un message qu'il n'a jamais vu. Une facture de
80 € de courses contestée, c'est un litige ; dix, c'est le dispositif qui
tombe.

**À prévoir :** au moins deux canaux simultanés pour ce signal précis, le
compteur visible dans l'espace client **et** dans le mail, et un journal qui
retient l'accusé de remise de chaque canal. Le §13 demande déjà cette
traçabilité ; c'est ici qu'elle est la plus nécessaire.

### 2. La séparation service / débours doit descendre jusqu'au paiement

Le §10 exige que l'attestation fiscale ne contienne **que** la part service.

Or aujourd'hui l'attestation se calcule depuis les **paiements encaissés**
(`eligibleAmountCents` dans `FiscalAttestationDto`). Si les débours transitent
par le même paiement, ils entrent mécaniquement dans l'assiette du crédit
d'impôt — et l'attestation devient fausse. Pas « imprécise » : fausse, avec un
client qui déclare un crédit d'impôt auquel il n'a pas droit.

Il ne suffit donc pas de séparer les deux lignes **à l'affichage**. Il faut que
la réservation porte deux montants distincts jusqu'en base, que le paiement
sache lequel il couvre, et que le calcul de l'attestation exclue le second.
**C'est un changement de modèle côté API**, pas un ajout de champ.

### 3. La commission

Si la commission Lab's Food se calcule sur le montant total, la plateforme
prend un pourcentage sur les courses du client. Économiquement discutable, et
surtout incompatible avec la promesse « sans marge » : il y aurait bien une
marge, prise par la plateforme au lieu du cuisinier.

**À confirmer avec le backend :** sur quelle assiette `rateBps` s'applique
aujourd'hui dans `commission-invoices`. Si c'est le total, c'est à corriger en
même temps que le point 2.

### 4. La liste de courses n'a ni prix, ni état, ni propriétaire

Le modèle actuel, `ShoppingLineDto`, c'est : `name`, `qty`, `unit`, `aisle`.
Rien d'autre.

Le §6 demande un parcours à cinq temps : liste générée → le client retire ce
qu'il possède → il modifie des ingrédients → le batch cooker peut signaler et
retirer un intrus → **le client confirme la liste finale**. Et `PUT
/chef-missions/{id}/shopping-list` est aujourd'hui une route **du batch
cooker** ; le client n'a qu'un accès en lecture.

Il manque donc, par ligne : « je l'ai déjà », « je la retire », « prix
constaté », et sur la liste : un état de confirmation horodaté, côté client.
C'est la brique la plus volumineuse du module, et la plus simple
conceptuellement.

### 5. Les minuteries

Trois échéances par prestation : l'alerte à T−48h, le signal du batch cooker,
l'expiration des 30 minutes. Ce ne sont pas des traitements par lot mensuels
comme `commission-invoices/run-due` : ce sont des réveils **par réservation**,
qui doivent survivre à un redémarrage et ne jamais se déclencher deux fois.

Le backend tourne sur Railway avec plusieurs instances — le verrou consultatif
Postgres utilisé pour les commissions est le bon précédent, mais il faudra une
vraie file de tâches différées, pas un `setTimeout`.

### 6. La signature électronique

Le §4 demande deux signatures, horodatage, identification des signataires,
archivage PDF et versionnage par avenant.

Ça ne s'écrit pas à la main. Soit un prestataire (Yousign, Universign,
Docusign), soit un flux maison documenté et assumé. Et la spec ne dit pas
**quel niveau** : simple, avancée ou qualifiée. Pour un mandat de cette nature
la signature simple suffit probablement, mais c'est un arbitrage juridique, pas
un choix technique — et il change le coût du prestataire du simple au triple.

Détail qui compte : le PDF du mandat et son archivage posent exactement le même
problème que la facture de commission, dont la documentation backend dit que
« le PDF rendu et l'archive S3 de 10 ans appartiennent à une phase ultérieure ».
**Aucune des deux n'existe.** Autant les traiter ensemble.

### 7. Des données d'identité que personne ne collecte

Le mandat exige, côté client : **nom, prénom, date et lieu de naissance,
adresse**. Côté batch cooker : **nom, statut, SIREN, adresse du siège**.

- La date et le lieu de naissance du client **n'existent nulle part** dans
  l'API. Nouveau champ, et donnée sensible au sens du §12 : à collecter au
  moment du mandat, pas à l'inscription.
- L'adresse du client est acceptée en écriture mais **jamais rendue en
  lecture** — c'est notre demande n° 1 au backend, déjà ouverte. Le mandat ne
  peut pas se générer tant qu'elle n'est pas lisible.
- Le SIREN et le siège existent dans la candidature (`company.siret`,
  `address`), mais la fiche ne les rend pas tous.

### 8. Le plafond de budget : on ne bloque pas une caisse de supermarché

Le §11.2 dit « blocage de l'achat au-delà du plafond ». La plateforme ne peut
rien bloquer : le batch cooker est dans un magasin, avec sa carte.

Ce qu'on peut faire, c'est **refuser la prise en charge** au-delà du plafond —
et c'est très différent pour celui qui a avancé l'argent. Il faut donc le lui
dire **avant** qu'il parte faire les courses, dans le signal lui-même :
« budget restant 42 € ; au-delà, le remboursement demande l'accord du client ».

Et prévoir le cas réel : il dépasse de 3 € parce qu'un produit a changé de
prix. Un avenant pour 3 € est absurde ; une tolérance non écrite est un
risque fiscal. À trancher (c'est le point ouvert n° 9 de la spec, sur la
substitution d'ingrédient — même sujet).

---

## Ce qui est déjà là et se réutilise

| Besoin | Ce qui existe |
|---|---|
| Joindre les tickets de caisse | Le trio d'envoi de `cesu-proof` : PDF ou image, 10 Mo, stockage privé, lien signé 5 minutes. Précédent exact, à copier. |
| Liste de courses par rayon | `GET /chef-missions/{id}/shopping-list`, déjà lisible par le client — branchée côté client le 24/10. |
| Journal d'audit | Le backend audite déjà plusieurs routes sensibles ; le §13 s'y raccroche. |
| Statut à deux signatures | Le mandat SEPA de la commission suit un schéma voisin (`setup-intent` puis statut). |
| Notifications | **Rien.** Aucune route de préférences — c'est notre demande n° 4, ouverte. Le §8 en dépend entièrement. |

---

## Ce qu'il faut trancher avant de coder

Par ordre de blocage :

1. **Le forfait courses devient-il un service, ou disparaît-il ?** Tout en
   découle. Question pour l'expert-comptable, pas pour l'équipe technique.
2. **L'assiette de la commission** — total ou service seul.
3. **Le niveau de signature électronique**, et le prestataire.
4. **Les quatre points ouverts de la spec** (§15) : blocage strict avant T−48h,
   sort de la prestation en cas de refus après T−48h, durée de conservation,
   politique de substitution. Le deuxième bloque la machine à états : sans lui,
   on ne sait pas quel statut prend une prestation dont les courses ont été
   refusées.

## Ce qu'il faut demander au backend

À ajouter au document des manques, sans attendre la décision ci-dessus :

- **Séparer service et débours jusqu'au paiement**, et exclure les débours du
  calcul de `eligibleAmountCents`.
- **Rendre l'adresse du client** (déjà demandé, n° 1) et **ajouter date et lieu
  de naissance**.
- **Confirmer l'assiette de la commission**.
- **Une file de tâches différées** pour les trois échéances, avec garantie
  d'exécution unique.
- **Préférences de notification** (déjà demandé, n° 4) — le §8 ne peut pas
  exister sans.

---

## Mon estimation honnête

Ce module est plus gros que tout ce qui a été branché cette semaine réuni. Les
écrans ne sont pas le sujet : le sujet est un modèle de facturation à deux
natures, une machine à états temporelle avec valeur juridique, et une
signature électronique.

Si la question n° 1 se tranche vite, je commencerais par la liste de courses
côté client (§6) : c'est la seule brique utile **immédiatement**, même sans
mandat — aujourd'hui le client reçoit une liste qu'il ne peut ni amender ni
confirmer. Le reste attend les arbitrages.
