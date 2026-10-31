# Mandat de débours — ce qu'il faut trancher avant de construire

Après lecture du cahier des charges V2 (`6.Mandat de débours.pdf`) et du modèle
de mandat, croisés avec ce que la plateforme fait aujourd'hui.

Trois conflits existent **indépendamment de toute décision** : ils opposent le
mandat à ce qui est déjà en production. Viennent ensuite quinze questions, dont
deux bloquent le démarrage.

---

# Partie 1 — Les trois conflits

## Conflit 1 — Le forfait courses contredit le mandat

**Aujourd'hui**, les courses se facturent au forfait : chaque batch cooker fixe
un montant dans ses tarifs, et ce montant s'ajoute au prix de la prestation.

**Le mandat dit l'inverse**, deux fois :

> **RG-31** — refacturés **au centime près, sans marge**.
>
> **§10** — au moindre écart avec la somme réellement avancée, ce n'est plus un
> débours mais une vente, ce qui change le traitement fiscal.

Un forfait **est** un écart : il tombe toujours au-dessus ou au-dessous de la
dépense réelle. Les deux modèles ne peuvent pas coexister sur la même ligne de
facture.

Ce n'est pas un détail d'affichage : si les ingrédients sont vendus au lieu
d'être avancés, ils entrent dans le chiffre d'affaires du batch cooker — avec
le plafond micro-entrepreneur, et peut-être la TVA, au bout.

→ **Question A1.**

## Conflit 2 — L'attestation fiscale serait fausse

Prenons un cas concret. Marie réserve : **150 € de prestation**, et le batch
cooker avance **80 € d'ingrédients**. Elle paie **230 €**.

Le crédit d'impôt « service à la personne » ne porte **que sur le service** :

| | Montant | Crédit d'impôt |
|---|---|---|
| Prestation | 150 € | **75 €** |
| Ingrédients | 80 € | 0 € |
| Ce que Marie doit déclarer | | **75 €** |

**Or l'attestation fiscale que nous émettons ne lit pas la facture : elle lit
les paiements encaissés.** Et le paiement, c'est une ligne de 230 €.

L'attestation dirait donc « 230 € », Marie déclarerait ça, et obtiendrait
**115 € au lieu de 75 €**. En cas de contrôle, c'est elle qui rembourse — sur
la foi d'un document que Lab's Food a signé.

**Afficher deux lignes sur la facture ne suffit pas.** Il faut que le paiement
lui-même sache que, sur ces 230 €, 80 ne sont pas du service.

→ **Questions A2 et D1.**

## Conflit 3 — La commission prendrait une marge sur les courses

Si la commission Lab's Food se calcule sur le total :

| Assiette | Commission à 15 % |
|---|---|
| Sur le total (230 €) | **34,50 €** |
| Sur le service seul (150 €) | **22,50 €** |

Les **12 € d'écart** sont prélevés sur les courses de Marie.

Le mandat promet que les ingrédients sont refacturés à l'identique et que
personne ne gagne rien dessus. Si la plateforme en prélève 15 %, quelqu'un
gagne bien quelque chose : ce n'est plus le cuisinier, c'est nous. Le débours
n'en est plus un.

→ **Question A3.**

---

# Partie 2 — Les questions

## Pour l'expert-comptable

**A1 — Le forfait courses devient-il un service, ou disparaît-il ?** 🔴

C'est la question qui commande tout le reste. Trois lectures possibles :

- il devient le prix du **temps passé** à faire les courses — il reste alors
  éligible au crédit d'impôt, et les ingrédients forment une seconde ligne,
  facturée au réel ;
- il disparaît — seuls les tickets sont refacturés, et le batch cooker n'est
  plus payé pour ce temps ;
- on garde les deux selon la formule — deux modèles de facturation et deux
  calculs d'attestation à maintenir.

*Sans réponse : rien ne peut être construit.*

**A2 — L'attestation fiscale doit-elle mentionner les débours, ne serait-ce que
pour mémoire ?** Ou les taire entièrement ?

**A3 — Sur quelle assiette la commission se calcule-t-elle ?** Voir conflit 3.

**A4 — Quelle durée de conservation pour les mandats et les tickets ?**
Le §12 dit « aucune durée imposée par la plateforme ». La note de prudence du
même paragraphe dit l'inverse : les tickets prouvent les débours, les
supprimer fragiliserait le dispositif. Les deux affirmations se contredisent
dans le même document.

**A5 — Quelle tolérance de dépassement du budget ?**
Budget 100 €, il paie 103 € parce qu'un prix a changé. Un avenant signé pour
3 € ne se fera jamais ; une tolérance non écrite est un risque fiscal.

## Pour le juridique

**B1 — Quel niveau de signature électronique ?**
Simple, avancée ou qualifiée. Le cahier des charges demande horodatage,
identification des signataires et archivage, sans préciser le niveau. Le coût
du prestataire va du simple au triple selon la réponse.

**B2 — Le silence de 30 minutes vaut-il engagement ?** 🔴

RG-38 fait naître une dette parce que quelqu'un **n'a rien fait**. Le cas
arrivera : notifications coupées, mail en spam, client au travail. Il est
engagé sur un message qu'il n'a jamais vu.

Si la règle est maintenue, il faut pouvoir prouver que la notification a été
**remise**, et non seulement envoyée — ce qui change ce qu'on doit enregistrer.

**B3 — Qui porte l'impayé ?**
RG-40 : le batch cooker avance, et la plateforme ne détient pas l'argent au
moment du litige. Si le client ne rembourse pas, le cuisinier est seul face à
lui, pour une somme trop faible pour justifier une procédure.

## Pour le produit

**C1 — Le mandat est-il annuel ou par prestation ?**

Les deux documents ne disent pas la même chose. Le modèle Word écrit « sur
toute l'année 2026 » avec un budget hebdomadaire ; le §3 du cahier des charges
rattache les mêmes champs à « prestation / formule ».

Une signature par an ou une par réservation : ce n'est pas le même produit, ni
la même charge pour le client.

**C2 — Que devient la prestation si le client refuse les courses après
T−48h ?** 🔴

Point ouvert n° 7 de votre spec. Le client garde-t-il la prestation en
fournissant lui-même les ingrédients ? Est-elle reportée ? Annulée ?

*Sans réponse, le parcours ne peut pas être dessiné : on ne sait pas dans quel
état tombe la réservation.*

**C3 — Blocage strict ou simple avertissement** si le batch cooker déclenche
les courses avant T−48h ? *(Point ouvert n° 6.)*

**C4 — Politique de substitution** d'un ingrédient dans la limite du budget ?
*(Point ouvert n° 9.)* Rupture de stock, il prend autre chose : a-t-il le droit
sans redemander ?

**C5 — Impose-t-on un ticket séparé ?**
Le batch cooker fera souvent ses propres courses en même temps. Un ticket
mixte — ses achats et ceux du client — ne prouve aucun débours. C'est le cas le
plus courant et le plus dangereux fiscalement.

**C6 — Le plafond de budget ne peut rien bloquer.**
Le §11.2 parle de « blocage de l'achat au-delà du plafond ». La plateforme ne
peut rien bloquer : le batch cooker est dans un magasin, avec sa carte. Ce
qu'on peut faire, c'est **refuser la prise en charge** — ce qui est très
différent pour celui qui a avancé l'argent, et doit lui être dit **avant**
qu'il parte.

**C7 — Le module de litiges.**
Ce mandat fabrique des litiges par construction : montant contesté, ticket
mixte, produit non demandé, dépassement, refus tardif, impayé. Il n'existe
aujourd'hui **aucun module de litiges** — ni route côté API, ni écran utilisable.

Faut-il le construire avant d'ouvrir le mandat ? Nous pensons que oui.

## Pour le backend

**D1 — Séparer service et débours jusqu'au paiement**, et exclure les débours
du calcul du montant éligible de l'attestation fiscale. Voir conflit 2. C'est
un changement de modèle, pas un champ de plus.

**D2 — Deux données d'identité manquent au mandat :**

- la **date et le lieu de naissance** du client, exigés par le modèle, et qui
  n'existent nulle part dans l'API ;
- l'**adresse du client**, qui est acceptée en écriture mais jamais rendue en
  lecture — c'est notre demande n° 1, déjà ouverte. **Le mandat ne peut pas se
  générer tant qu'elle n'est pas lisible.**

**D3 — Une file de tâches différées.** Trois échéances par réservation : le
verrouillage à T−48h, l'expiration des 30 minutes, la fin de validité du
mandat. Chacune doit survivre à un redémarrage et ne jamais s'exécuter deux
fois. Ce ne sont pas des traitements par lot comme la facturation mensuelle.

**D4 — Le rendu PDF et l'archivage.** Le mandat signé doit être archivé en PDF.
C'est exactement le besoin que votre documentation des factures de commission
renvoie « à une phase ultérieure ». Aucun des deux n'existe : autant les
traiter ensemble.

**D5 — Les préférences de notification.** Le §8 demande un centre de
préférences côté client (push, e-mail, SMS). Aucune route ne porte ces
préférences — c'est notre demande n° 4, déjà ouverte. Le §8 en dépend
entièrement.

**D6 — Une demande qui ne figure pas dans votre spec.** Le §13 énumère ce qu'il
faut horodater. Il faut y ajouter **l'accusé de remise de chaque
notification**, par canal — pas seulement son envoi.

Sans cela, le litige « je n'ai jamais vu le message » est indécidable, et c'est
celui qui arrivera le plus souvent.

---

# Partie 3 — Récapitulatif

| # | Question | Qui répond | Bloque |
|---|---|---|---|
| A1 | Forfait courses : service ou suppression | Expert-comptable | **Tout** |
| A2 | Débours sur l'attestation | Expert-comptable | Facturation |
| A3 | Assiette de la commission | Expert-comptable | Facturation |
| A4 | Durée de conservation | Expert-comptable | Archivage |
| A5 | Tolérance de dépassement | Expert-comptable | Budget |
| B1 | Niveau de signature | Juridique | Le mandat |
| B2 | Valeur du silence de 30 min | Juridique | **Le run** |
| B3 | Qui porte l'impayé | Juridique | Modèle économique |
| C1 | Mandat annuel ou par prestation | Produit | **Tout le parcours** |
| C2 | Refus des courses après T−48h | Produit | **Le run** |
| C3 | Avant T−48h : blocage ou alerte | Produit | Le run |
| C4 | Substitution d'ingrédient | Produit | Le run |
| C5 | Ticket séparé imposé | Produit | Justificatifs |
| C6 | Plafond : blocage ou non-prise en charge | Produit | Budget |
| C7 | Module de litiges avant ou après | Produit | Lancement |
| D1 | Séparation jusqu'au paiement | Backend | Facturation |
| D2 | Naissance + adresse du client | Backend | **Le mandat** |
| D3 | File de tâches différées | Backend | Le run |
| D4 | PDF et archivage | Backend | Le mandat |
| D5 | Préférences de notification | Backend | Les alertes |
| D6 | Accusé de remise des notifications | Backend | Les litiges |

**Trois réponses débloquent le démarrage : A1, C1 et C2.**

---

## Une chose qui peut avancer sans attendre

Le §6 donne au client le dernier mot sur sa liste de courses : il retire ce
qu'il possède, modifie des ingrédients, puis confirme la liste finale.

Aujourd'hui, le client reçoit une liste qu'il ne peut **ni amender ni
confirmer** — elle est en lecture seule. C'est utile immédiatement, même si le
mandat n'arrivait jamais, et cela ne dépend d'aucune des questions ci-dessus.

Nous pouvons commencer par là.
