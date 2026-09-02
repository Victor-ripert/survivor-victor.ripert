# 01 — Où s'arrête le 400 et où commence le 422

**Tâche** EW-2 · **Référence** CdC §8.1 · **Date** 2 septembre 2026 · **Statut** tranché, implémenté

---

## Ce qui posait problème

Le §8.1 demande que les routes principales documentent leurs réponses d'erreur
**400, 401, 403, 404 et 422**, avec le corps réellement renvoyé.

Quatre de ces cinq codes existaient déjà. Le 422 n'existait nulle part : ni dans
`middleware/error-handler.ts`, ni dans l'union `ApiErrorCode` de
`@profils-actifs/shared`, ni dans `openapi.yaml`. Toute validation, quelle qu'en
soit la nature, sortait en `400 validation_error`.

Deux façons de répondre à la demande, et une seule qui vaille :

- **Renommer arbitrairement des 400 existants en 422** pour cocher la case.
  Le contrat gagnerait un code, l'API n'y gagnerait aucune information.
- **Faire porter au 422 une distinction que l'API fait déjà**, et qu'elle
  écrasait jusqu'ici. C'est ce qui a été retenu.

## La règle

> **400 `validation_error`** — la requête n'a pas pu être interprétée. La
> décision se prend en lisant la requête seule : JSON malformé, champ absent,
> mauvais type, valeur hors bornes.
>
> **422 `unprocessable_entity`** — la requête a été comprise, mais elle
> contredit la ressource qu'elle vise. La détecter suppose d'aller lire l'état
> en base.

Ce n'est pas une nuance de vocabulaire : c'est la seule frontière qui se teste
sans discuter. « Ai-je besoin de la base de données pour dire non ? » a toujours
une réponse, et elle range chaque cas d'un côté ou de l'autre.

Elle dit aussi quelque chose d'utile au client. Un 400 est un bug du client :
la même requête échouera toujours. Un 422 ne l'est pas nécessairement : la
même requête aurait pu passer sur une autre ressource, ou sur celle-ci avant
qu'elle ne change. L'interface n'en fait pas le même usage.

## Ce que ça change dans le code

| Endroit                                                                                                                                             | Avant | Après         |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------- |
| `POST /certification/attempt/{id}/answer` — `questionId` absent, `numericAnswer` hors de 1..5                                                       | 400   | 400, inchangé |
| `POST /certification/attempt/{id}/answer` — champ requis absent **pour le type réel de la question**, `optionId` appartenant à une autre question   | 400   | **422**       |
| `PATCH /admin/certification/questions/{id}` — le patch laisserait une question à choix avec moins de 2 options, vérifié contre le type déjà en base | 400   | **422**       |
| `POST /admin/certification/questions` — même règle, mais vérifiée par Zod sur le corps seul                                                         | 400   | 400, inchangé |

Les deux dernières lignes sont la démonstration de la règle : c'est la **même
règle métier**, et elle sort en 400 à la création (le corps porte le type, Zod
tranche seul) et en 422 à la modification (le type peut être absent du patch,
il faut lire la question en base pour connaître le type effectif).

Fichiers touchés :

- `packages/shared/src/types/api.ts` — `unprocessable_entity` ajouté à `ApiErrorCode`
- `packages/api/src/utils/http-error.ts` — `unprocessableEntity()`
- `packages/api/src/services/certification/answers.ts` — six levées reclassées
- `packages/api/src/services/certification/questions.ts` — `invalidOptions()`
- `packages/api/openapi.yaml` — réponse réutilisable `UnprocessableEntity`,
  `error` devient un `enum` fermé, 422 documenté sur les deux routes qui l'émettent

Aucun chemin d'erreur parallèle n'a été introduit : `unprocessableEntity()` est
une fabrique de `HttpError` comme les autres, et `middleware/error-handler.ts`
n'a pas bougé d'une ligne.

## Ce qui n'a pas basculé, et pourquoi

`interaction.service.ts` lève un `badRequest` quand un `CONTACT` arrive sans
message. Il reste en 400 : `createInteractionSchema` refuse déjà ce corps par
un `superRefine`, donc la ligne du service est une ceinture de sécurité que le
HTTP n'atteint pas. La reclasser documenterait un code que l'API n'émet jamais.

## Ce que ça coûte au frontend

`ApiErrorCode` est l'union sur laquelle le frontend branche. Un code de plus
peut rendre un `switch` non exhaustif là où TypeScript l'exigeait — c'est
voulu, c'est le compilateur qui signale les endroits à traiter. Le repli
raisonnable est de traiter `unprocessable_entity` comme `validation_error` :
même intention côté utilisateur, message renvoyé par l'API.

## Preuve

`docs/preuves/EW-3-erreurs-http.txt` — les cinq codes rejoués en `curl -i`
contre l'API démarrée, sorties brutes.
