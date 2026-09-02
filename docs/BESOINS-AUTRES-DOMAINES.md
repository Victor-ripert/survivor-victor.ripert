# Ce que le domaine D attend des autres domaines

**De** Ewan — domaine D (espace recruteur, tableaux de bord), contrat d'API, intégration
**Date** mercredi 2 septembre 2026 · **Branche** `feat/api-contract-and-deliverables`

Ce document a deux moitiés. La première liste ce dont **mes** livrables ont
besoin et que je ne peux pas produire moi-même. La seconde liste ce que **j'ai
changé chez vous**, parce qu'un changement dans vos fichiers annoncé après coup
est un conflit de merge, et annoncé avant, une ligne à relire.

Aucune de mes tâches n'attend : tout ce qui pouvait être fait sans vous l'a été,
et ce qui vous attend est isolé dans des sections clairement marquées des
documents concernés.

---

## Partie 1 — Ce dont j'ai besoin

### A1 · Adrien (domaine A) — les deux migrations, avant jeudi 12h00

**Bloque :** la version définitive de `docs/livrables/schema-de-base-de-donnees.md`
(EW-6) et de `docs/livrables/registre-de-traitement.md` (EW-7).

Les deux documents sont écrits et complets **pour le modèle actuel**. Ce qui
manque est nommément identifié :

- Registre, §4 : deux lignes « traitements attendus, non encore au modèle »
- Livrable de schéma, §6 : le tableau des migrations attendues, plus un
  avertissement en tête du document

Ce dont j'ai besoin, exactement :

|      | Champs attendus                                                                          | Où ça atterrit chez moi        |
| ---- | ---------------------------------------------------------------------------------------- | ------------------------------ |
| AD-1 | `User.birthDate`                                                                         | registre §4, schéma §1 et §2   |
| AD-3 | `acceptedAt`, `consentTextVersion`, `revokedAt`, **et le nom de la table qui les porte** | registre §4 et §2.3, schéma §1 |

Le nom de table du modèle de consentement est le point que je ne peux pas
deviner : le registre doit citer _« le vrai nom de table et de champ »_, et
Florine annonce qu'une fiche qui ne correspond pas au modèle réel ne compte pas.
Dis-le moi dès que la migration est écrite, même avant qu'elle soit appliquée.

Une fois les migrations sur `main` : je rejoue `./scripts/preuves/schema-conforme.sh`
et je régénère les deux documents. Compter trente minutes après le gel.

### A2 · Adrien — relecture croisée registre ↔ CGU, vendredi 11h00

Florine écrit qu'elle lira le registre de traitement et le projet de CGU **côte
à côte** et qu'elle demandera lequel se trompe s'ils divergent. Le créneau est
bloqué vendredi 11h00–11h30, avant le dépôt de 12h00.

Quatre points de mon registre que ta CGU doit couvrir, sans quoi ils divergeront :

1. **Les vidéos sont chez un tiers** (YouTube, Vimeo, Dailymotion). Révoquer le
   consentement supprime la ligne `Video` et le lien de notre côté ; la vidéo
   **continue d'exister chez l'hébergeur** tant que le candidat ne l'y supprime
   pas. La preuve « répertoire de stockage avant et après » du §7.1 ne
   s'applique pas telle quelle, et la CGU doit le dire au candidat.
2. **Aucune durée de conservation n'est appliquée.** Mon registre propose des
   durées en les marquant comme propositions. Si ta CGU en annonce, ce sont les
   mêmes, et elles doivent porter la même réserve.
3. **`type = VIEW` enregistre qu'un recruteur a consulté un profil**, et le
   candidat le voit. Une donnée de comportement, à annoncer aux deux parties.
4. **Il n'y a pas de journal de connexion.** Mon registre §2.8 l'écrit
   explicitement. Si ta CGU en mentionne un, l'un des deux documents ment.

### B1 · Victor (domaine B) — trois corrections avant de fusionner

Détail complet dans `docs/ORDRE-DE-MERGE.md` §2. En résumé : `origin/7-profils-vidéo-b`
est 4 commits devant `main` et **20 derrière**, et son diff supprime du travail
en place.

1. **`packages/api/src/utils/errors.ts` (`ServiceError`) ne doit pas atterrir.**
   `main` a une voie d'erreur unique : les services lèvent un `HttpError` par
   les fabriques d'`utils/http-error.ts`, `middleware/error-handler.ts` est seul
   à construire un corps, et Express 5 lui transmet les promesses rejetées sans
   `try/catch`. Le tableau de conversion est dans l'ordre de merge. **Nouveau
   depuis ta branche :** `unprocessableEntity()` pour un corps bien formé mais
   incompatible avec la ressource visée — voir `docs/decisions/01-codes-erreur-http.md`.
2. **Garder la pagination de `main`.** `resolvePageRequest` et
   `buildPaginationMeta` dans `@profils-actifs/shared` ; ta branche apporte
   `validators/pagination.ts`, `shared/constants/pagination.ts` et
   `shared/types/pagination.ts` qui font double emploi. `resolvePageRequest` est
   ce qui applique le plafond de 20 du §8.6 : deux implémentations, c'est un
   plafond qu'on oubliera de mettre à jour d'un côté.
3. **`packages/shared/src/index.ts`** est modifié des deux côtés. Garder les
   exports de `main`, ajouter les DTO profil et vidéo.

### B2 · Victor — `/profiles` et `/videos` ne sont pas couverts par mes preuves

`docs/preuves/EW-3-erreurs-http.txt` rejoue les cinq codes du §8.1 sur les
routes **montées** : authentification, certification, catalogue recruteur.
Les chemins `/profiles*` et `/videos/*` sont documentés au contrat mais
n'atteignent aucune route Express, donc ils répondent 404 pour cause d'absence
et non par la logique métier.

Dès que tes routes sont montées, dis-le moi : je rejoue le script et j'ajoute
un bloc sur `/profiles`. C'est une commande, pas une rédaction.

### B3 · Victor — le filtre `hasVideo`, réserve à lever

`docs/livrables/note-criteres-de-filtrage.md` §3 signale à Florine que le filtre
`hasVideo` écarte en pratique les candidats qui ne diffusent pas leur image — y
compris ceux qui ont révoqué leur consentement. Je le maintiens et je le
justifie, mais je l'ai signalé plutôt que présenté comme acquis.

Si Florine demande son retrait, c'est une ligne dans `catalogue.filters.ts`
(chez moi) **et** le comportement du fil (chez toi). Autant le savoir tous les
deux avant vendredi.

### C1 · Marin (domaine C) — le seed à 100 questions

Sans impact sur mes livrables, une seule conséquence pratique :
`scripts/preuves/erreurs-http.sh` cherche la première question
`MULTIPLE_CHOICE` du seed pour produire le 422. Tant qu'il en reste au moins
une, le script marche quel que soit le nombre de questions. Rien à faire de ton
côté.

---

## Partie 2 — Ce que j'ai changé chez vous

Trois endroits hors du domaine D. Tous minimes, tous délibérés, tous liés à une
tâche qui m'était assignée.

### → Marin · `services/certification/answers.ts` — six levées reclassées en 422

**Pourquoi c'est chez moi :** EW-2 (« trancher le 422 ») nomme explicitement ce
cas, et EW-3 exige de rejouer un vrai 422 en `curl` contre l'API démarrée. Sans
ce changement, l'API n'émet aucun 422 et la preuve du §8.1 est impossible.

**Ce qui change :** les six `badRequest` du `switch` sur `question.type`
deviennent des `unprocessableEntity`. Les messages passent au français, comme
partout ailleurs dans l'API. La logique est intacte, ligne pour ligne.

**Ce qui ne change pas :** le 400 sur `questionId` manquant ou `numericAnswer`
hors de 1..5 — Zod décide sur le corps seul, c'est un 400.

`packages/api/test/certification-answer.test.ts` est mis à jour : quatre
assertions passent de 400 à 422, et chacune vérifie désormais aussi le code
`error`, ce qu'elles ne faisaient pas.

### → Marin · `services/certification/questions.ts` — une levée reclassée

`invalidOptions()` passe de `badRequest` à `unprocessableEntity`. C'est le seul
autre endroit de l'API qui vérifie une règle contre l'état en base plutôt que
contre le corps de la requête, et le laisser en 400 rendrait la règle
incohérente d'une route à l'autre.

**Attention au merge :** MA-2 (l'invalidation des tentatives quand une question
active est modifiée) touche `updateQuestion` dans ce même fichier. Ma
modification porte sur la fabrique `invalidOptions()` en tête de fichier et sur
la ligne d'`import` — pas sur `updateQuestion`. Git devrait fusionner seul ; si
tu vois un conflit, garde `unprocessableEntity`.

### → Tout le monde · `packages/shared/src/types/api.ts` — un code de plus

`ApiErrorCode` gagne `'unprocessable_entity'`. C'est l'union sur laquelle le
frontend branche : un `switch` exhaustif sur ce type ne compilera plus tant
qu'il n'est pas traité. C'est voulu — le compilateur désigne les endroits à
regarder.

**Repli raisonnable :** traiter `unprocessable_entity` comme
`validation_error`. Même intention côté utilisateur, et le message renvoyé par
l'API est déjà rédigé en français pour être affiché tel quel.

### → Personne, mais à connaître · la recherche libre ne cherche plus dans les noms

`catalogue.filters.ts` est un fichier du domaine D, donc le changement est chez
moi — mais son effet est visible par tous. `q` ne cherche plus dans
`User.firstName` ni `User.lastName`.

Le motif est juridique et il est écrit :
`docs/livrables/note-criteres-de-filtrage.md` §2.1. En deux lignes — un
patronyme est un indicateur reconnu d'origine, et un catalogue qui laisse
restreindre la population par le nom offre un filtre sur l'origine que
l'article L1132-1 du Code du travail n'autorise pas. Le §7.2 demande une
justification en une phrase par critère, et le retrait de ceux qui n'en ont pas.

**Vérifié côté interface :** le champ de recherche du catalogue affiche déjà
« Métier, compétence, ville… » (`CatalogueFilters.tsx`). Rien à corriger. Si
quelqu'un ajoute une aide contextuelle mentionnant le nom, elle sera fausse.

**Effet secondaire mesurable :** la requête `q` émettait trois auto-jointures
sur `User`, elle n'en émet plus qu'une.

---

## Partie 3 — Ce qui est bloqué et n'attend personne dans l'équipe

`docs/remontees/01-allocation-et-likes.md` — le mécanisme du §3 qui adosse le
montant d'une allocation chômage au nombre de « likes », en le tenant hors de
l'interface et de la documentation publique.

**Rien n'est implémenté, rien n'est planifié, et rien ne le sera sans avis écrit
de Florine Pontaillac.** Si quelqu'un vous le demande directement, la réponse
est dans ce document : c'est une décision automatisée affectant des droits
sociaux, l'instruction de la dissimuler contredit l'obligation d'information,
et le cahier des charges reconnaît lui-même que le service juridique ne l'a pas
validée.

Le registre de traitement remis vendredi ne comporte pas ce traitement, et le
signale à Florine pour que l'absence ne se lise pas comme un oubli.
