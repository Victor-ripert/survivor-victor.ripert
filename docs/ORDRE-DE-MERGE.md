# Ordre de merge et garde-fous CI

**Tâche** EW-10 · **Date** mercredi 2 septembre 2026 · **Tenu par** Ewan (intégration)
**État constaté** `main` au commit `372d146`

Quatre branches doivent atterrir sur `main` avant vendredi. Elles ne se
touchent pas au hasard : l'une d'elles supprime du travail déjà en place si on
la fusionne telle quelle. Ce document dit dans quel ordre, et ce qu'on vérifie
entre chaque.

---

## 1. Ce que l'on constate aujourd'hui

| Branche                              | Domaine                   | Écart avec `main`         | État                            |
| ------------------------------------ | ------------------------- | ------------------------- | ------------------------------- |
| `origin/7-profils-vidéo-b`           | B — profils et vidéo      | 4 devant, **20 derrière** | ⚠️ à rebaser, conflits certains |
| `feat/api-contract-and-deliverables` | contrat, index, livrables | 6 devant                  | prête                           |
| `origin/feat/auth-age-verification`  | A — âge et consentement   | rien                      | branche vide, travail à venir   |
| `origin/feat/certification-quiz`     | C — questionnaire         | déjà fusionnée            | rien à faire                    |

---

## 2. Le point dur : le domaine B

`origin/7-profils-vidéo-b` a été écrite **avant** la refonte du chemin d'erreur
et de la pagination. Fusionnée telle quelle, elle ne se contente pas d'ajouter :
elle réintroduit des mécanismes que `main` a depuis remplacés. Trois collisions,
repérées sur le diff, pas supposées.

### 2.1 Un second chemin d'erreur

La branche apporte `packages/api/src/utils/errors.ts`, qui définit une classe
`ServiceError` et dont le commentaire d'en-tête invite les contrôleurs à la
rattraper en `try/catch` pour construire le corps d'erreur à la main.

`main` a une seule voie : les services lèvent un `HttpError` par les fabriques
d'`utils/http-error.ts`, et `middleware/error-handler.ts` est le seul endroit
qui fabrique un corps d'erreur. Express 5 lui transmet les promesses rejetées
tout seul, donc aucun handler n'a de `try/catch`.

Deux voies parallèles, c'est deux formats d'erreur en production et un frontend
qui doit deviner lequel il reçoit. **`ServiceError` ne doit pas atterrir.** La
conversion est mécanique :

| `ServiceError(...)`                                        | devient                                                                           |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `new ServiceError(400, 'validation_error', m)`             | `badRequest(m)`                                                                   |
| `new ServiceError(403, 'forbidden', m)`                    | `forbidden(m)`                                                                    |
| `new ServiceError(404, 'not_found', m)`                    | `notFound(m)`                                                                     |
| `new ServiceError(409, 'conflict', m)`                     | `conflict(m)`                                                                     |
| corps bien formé mais incompatible avec la ressource visée | `unprocessableEntity(m)` — nouveau, voir `docs/decisions/01-codes-erreur-http.md` |

Les `try/catch` des contrôleurs disparaissent avec elle.

### 2.2 Trois paginations pour un seul plafond

La branche apporte `packages/api/src/validators/pagination.ts`,
`packages/shared/src/constants/pagination.ts` et
`packages/shared/src/types/pagination.ts`. `main` a déjà tout cela, sous une
forme convenue entre les domaines : `resolvePageRequest` et
`buildPaginationMeta` dans `@profils-actifs/shared`, et
`paginationQuerySchema` dans `validators/common.ts`.

`resolvePageRequest` est ce qui applique le plafond de 20 profils par page du
§8.6. Une deuxième implémentation, c'est un plafond qu'on peut oublier de
mettre à jour des deux côtés. **Garder celle de `main`.**

### 2.3 `packages/shared/src/index.ts`

Modifié des deux côtés. Conflit garanti, résolution triviale : garder les
exports de `main` et ajouter ceux des DTO profil et vidéo.

---

## 3. L'ordre

### Étape 1 — `feat/api-contract-and-deliverables` (Ewan) — _mercredi_

À fusionner en premier, parce qu'elle porte le contrat, le code 422 et les
index, et que les trois autres branches doivent partir de là. Contient une
migration (`20260902093737_catalogue_search_indexes`) : elle doit passer avant
celles du domaine A, pour que le gel de jeudi 18h00 n'ait à trancher qu'une
suite de migrations linéaire.

**Vérification :** `npm run build && npm run lint && npm run format:check && npm run test`
puis `./scripts/preuves/schema-conforme.sh` — les deux diffs vides.

### Étape 2 — domaine A, âge et consentement (Adrien) — _jeudi 12h00_

Deux migrations (`User.birthDate`, modèle de consentement). Elles passent
**avant** le domaine B, parce que le domaine B écrit des vidéos et que le
consentement se journalise à la publication d'une vidéo : dans l'autre ordre,
le domaine B livre un chemin de publication qu'il faut rouvrir aussitôt.

**Vérification :** migration appliquée, inscription refusée sans date de
naissance, `schema-conforme.sh` toujours vert.

### Étape 3 — domaine B, profils et vidéo (Victor) — _jeudi 12h00 → 18h00_

Après le rebase et les trois corrections du §2. La règle de recette qui décide :
**le diff ne doit rien retirer de `main`.**

```bash
git diff --stat main...7-profils-vidéo-b
```

Toute ligne supprimée dans `catalogue.*`, `interaction.service.ts`,
`utils/http-error.ts`, `middleware/error-handler.ts` ou `shared/utils/pagination.ts`
est le signe que le rebase a écrasé du travail existant. On ne fusionne pas.

**Vérification :** `curl "/api/profiles?page=9999"` répond 200 avec `data: []`,
et la suite complète passe.

### Étape 4 — front des domaines C et D — _jeudi 18h00 → vendredi matin_

Aucune migration après le gel de jeudi 18h00. Ce que la base contient à cette
heure est ce que décrit le livrable de schéma de vendredi.

---

## 4. Ce qu'on vérifie avant chaque dépôt

La CI (`.github/workflows/ci.yml`) enchaîne, sur PostgreSQL 16 : migrations,
build, lint, vérification du format, tests avec couverture. Une CI rouge n'est
pas un détail de style — `format:check` échoue sur un fichier non formaté et
bloque le merge.

**Avant le dépôt de vendredi 12h00 (juridique)**

- [ ] CI verte sur `main`
- [ ] Registre de traitement et projet de CGU relus **côte à côte** entre 11h00
      et 11h30 — Florine annonce les lire ainsi et demander lequel se trompe
      s'ils divergent
- [ ] Note sur les critères de filtrage alignée sur `catalogue.filters.ts`, pas
      sur l'intention
- [ ] Déclaration d'accessibilité limitée à ce qui a été mesuré

**Avant le dépôt de vendredi 17h00 (technique)**

- [ ] CI verte sur `main`
- [ ] `./scripts/preuves/schema-conforme.sh` — les deux diffs vides
- [ ] `./scripts/preuves/erreurs-http.sh` — rejoué contre `main`, pas contre une
      branche
- [ ] `./scripts/preuves/sonde-sante.sh` — 200, 503, 200
- [ ] `docs/livrables/schema-de-base-de-donnees.md` **régénéré après le gel**
- [ ] Capture Swagger UI refaite si le contrat a bougé

Les quatre scripts sont rejouables et écrivent dans `docs/preuves/`. Chaque
transcription porte sa date et le commit contre lequel elle a été produite :
si le commit en tête d'une preuve n'est pas celui de `main`, la preuve est
périmée et se rejoue. C'est ce qui empêche de déposer une sortie recomposée.
