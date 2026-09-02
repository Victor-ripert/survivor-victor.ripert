# Ordre de merge et garde-fous CI

**Tâche** EW-10 · **Révisé le** mercredi 2 septembre 2026, soir · **Tenu par** Ewan (intégration)
**État constaté** `origin/main` au commit `aa24507`

Cinq branches ont circulé aujourd'hui. Trois sont déjà fusionnées, deux restent
à faire atterrir, et `main` était rouge quand je l'ai récupéré. Ce document dit
dans quel ordre, ce qui a été réparé, et ce qu'on vérifie entre chaque.

---

## 1. Où en est chaque branche

| Branche                                 | Domaine                    | vs `origin/main`          | État                                    |
| --------------------------------------- | -------------------------- | ------------------------- | --------------------------------------- |
| `origin/feat/auth-age-verification`     | A — date de naissance      | fusionnée                 | ✅ SOIR-1 dans `main`                   |
| `origin/feat/auth-video-consent`        | A — consentement vidéo     | fusionnée                 | ✅ AD-3 dans `main`                     |
| `origin/feat/auth-legacy-accounts-note` | A — note comptes existants | fusionnée                 | ✅ AD-2 dans `main`                     |
| `feat/api-contract-and-deliverables`    | D — contrat, index, dépôts | **13 devant**             | prête, contient la réparation de `main` |
| `origin/feat/certif-improvment`         | C — questionnaire          | 3 devant, 14 derrière     | à rebaser, sans difficulté prévue       |
| `origin/7-profils-vidéo-b`              | B — profils et vidéo       | 9 devant, **34 derrière** | ⚠️ à rebaser, conflits certains         |

---

## 2. `main` était rouge — ce qui a été réparé

Les trois branches du domaine A ont été fusionnées dans la journée. Le résultat
ne compilait pas, ne se semait pas, et bloquait toute base de développement
existante. Constaté, reproduit, réparé sur la branche du domaine D ; le détail
est là pour que personne ne le redécouvre.

### 2.1 Le seed échouait — la CI ne pouvait pas passer

`20260902133533_add_video_consent` ajoute `Video.acceptedAt` et
`Video.consentTextVersion` en `NOT NULL`. Le seed créait toujours ses vidéos
sans eux. La CI enchaîne migrations → seed → build → tests : elle s'arrêtait à
la deuxième étape.

**Réparé** : le seed renseigne les deux champs, avec `CONSENT_TEXT_VERSION`
importé de `@profils-actifs/shared` plutôt qu'une chaîne recopiée.

### 2.2 L'API ne compilait plus

La même migration **supprime `Video.createdAt`**. Son en-tête généré l'annonce
lui-même — _« All the data in the column will be lost »_ — ce qui se lit comme
un effet de bord, pas une intention : toutes les autres tables portent un
`createdAt`, et le catalogue s'en sert pour choisir la vidéo d'aperçu d'un
profil.

`npm run build` passait quand même, par le cache de Turbo. Le compilateur
appelé directement, lui, sortait quatre erreurs.

**Réparé** : `20260902142731_restore_video_created_at` réintroduit la colonne et
reprend sa valeur depuis `acceptedAt`, donc aucun horodatage n'est perdu.

### 2.3 Toute base contenant déjà des vidéos était bloquée

`ADD COLUMN ... NOT NULL` sans valeur par défaut passe sur une table vide —
celle de la CI — et échoue sur toute autre :

```bash
ERROR: column "acceptedAt" of relation "Video" contains null values
```

Une migration en échec bloque toutes les suivantes. **Si `npm run db:migrate`
vous refuse quelque chose, c'est ça.**

**Réparé sans vider les bases** : `./scripts/reparer-migration-consentement.sh`
applique ce que la migration aurait fait si elle avait été écrite pour une table
non vide — colonnes en nullable, remplissage depuis `createdAt`, puis pose de la
contrainte — avant de marquer la migration comme appliquée. `prisma migrate
reset` marche aussi, au prix de vos données de développement.

### 2.4 Un fichier non formaté

`docs/legal/accounts-without-birthdate.md` faisait échouer `format:check`, donc
la CI. Reformaté, sans changement de contenu.

---

## 3. Le point dur : le domaine B

`origin/7-profils-vidéo-b` est **34 commits derrière** `origin/main`. Elle a été
écrite avant la refonte du chemin d'erreur, avant celle de la pagination, et
avant l'addendum du 2 septembre. Fusionnée telle quelle, elle ne se contente pas
d'ajouter : elle réintroduit des mécanismes que `main` a remplacés depuis.
Quatre collisions, relevées sur le diff.

### 3.1 Un second chemin d'erreur

La branche apporte `packages/api/src/utils/errors.ts` et sa classe
`ServiceError`, dont le commentaire invite les contrôleurs à la rattraper en
`try/catch` pour construire le corps d'erreur à la main.

`main` a une seule voie : les services lèvent un `HttpError` par les fabriques
d'`utils/http-error.ts`, `middleware/error-handler.ts` est seul à fabriquer un
corps, et Express 5 lui transmet les promesses rejetées tout seul. Deux voies
parallèles, c'est deux formats d'erreur en production.

| `ServiceError(...)`                                        | devient                                                                           |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `new ServiceError(400, 'validation_error', m)`             | `badRequest(m)`                                                                   |
| `new ServiceError(403, 'forbidden', m)`                    | `forbidden(m)`                                                                    |
| `new ServiceError(404, 'not_found', m)`                    | `notFound(m)`                                                                     |
| `new ServiceError(409, 'conflict', m)`                     | `conflict(m)`                                                                     |
| corps bien formé mais incompatible avec la ressource visée | `unprocessableEntity(m)` — nouveau, voir `docs/decisions/01-codes-erreur-http.md` |

### 3.2 Trois paginations pour un seul plafond

La branche apporte `api/src/utils/pagination.ts`, `api/src/validators/pagination.ts`
et `shared/src/types/pagination.ts`. `main` a déjà tout cela : `resolvePageRequest`
et `buildPaginationMeta` dans `@profils-actifs/shared`, `paginationQuerySchema`
dans `validators/common.ts`.

`resolvePageRequest` est ce qui applique le plafond de 20 du §8.6. Deux
implémentations, c'est un plafond qu'on oubliera de mettre à jour d'un côté.
**Garder celle de `main`.**

### 3.3 Le contrat de modération vidéo a divergé

La branche définit déjà `/admin/moderation/videos` et
`/admin/videos/{videoId}/moderate` dans son `openapi.yaml`. Elle a été écrite
**avant l'addendum du 2 septembre**, et l'addendum change ce que ces routes
doivent faire. En tant qu'arbitre du contrat, je tranche ainsi — la version de
`main` prime, et la voici :

| Point           | Version domaine B                        | Version retenue                                                  | Pourquoi                                                                                                                  |
| --------------- | ---------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `reason`        | **facultatif** (`required: [action]`)    | **obligatoire**, 10 à 500 caractères                             | §7.9.2 : le motif est montré au candidat. « Une vidéo qui disparaît sans explication est un contentieux qui commence. »   |
| Réponse         | `{ message: string }`                    | `VideoModerationItem`, avec `lastDecision`                       | §7.9.2 exige la trace « qui a décidé et quand ». Un message ne la porte pas.                                              |
| Élément de file | schéma `Video`                           | `VideoModerationItem` : vidéo **+ candidat + dernière décision** | Un administrateur ne décide pas sur un titre : il lui faut savoir de qui vient la vidéo.                                  |
| Actions         | `APPROVE, REJECT, FLAG, REQUIRE_CHANGES` | `APPROVE, REJECT`                                                | L'addendum décrit valider ou refuser. `FLAG` et `REQUIRE_CHANGES` restent sur la route **profils**, où ils existent déjà. |
| Filtre de file  | aucun                                    | `status`, par défaut `PENDING`                                   | La file, c'est l'attente ; le reste est de la consultation.                                                               |

Les types partagés correspondants sont dans
`packages/shared/src/types/moderation.ts`, et l'écran qui les consomme existe
(`VideoModerationPage`). **Côté domaine B, il reste le service et les routes**
(tâche VI-10), plus `ModerationLog.videoId` sans lequel la trace n'a pas de
colonne où s'écrire.

### 3.4 `packages/shared/src/index.ts` et `app.ts`

Modifiés des deux côtés. Conflits garantis, résolutions triviales : garder les
exports et les montages de `main`, ajouter ceux du domaine B.

---

## 4. L'ordre

### Étape 1 — `feat/api-contract-and-deliverables` (Ewan) — **ce soir**

En premier, pour trois raisons : elle porte la réparation de `main` (§2), les
deux mesures bloquantes du soir (SOIR-2, SOIR-3), et le contrat que les deux
autres branches doivent adopter.

**Vérification** : `npx turbo run build lint test --force`, `npm run format:check`,
puis `./scripts/preuves/schema-conforme.sh` — les deux diffs vides.

### Étape 2 — `feat/certif-improvment` (Marin) — **jeudi matin**

Rebase simple, 3 commits, aucun fichier partagé avec le domaine D sauf
`services/certification/questions.ts` — où ma seule modification est la fabrique
`invalidOptions()` en tête de fichier, pas `updateQuestion`. Git devrait
fusionner seul ; en cas de conflit, garder `unprocessableEntity`.

Porte une migration (`20260902111528_add_attempt_invalidated_notification_type`)
et le seed à 100 questions.

### Étape 3 — `7-profils-vidéo-b` (Victor) — **jeudi, avant 18h00**

Après le rebase et les quatre corrections du §3. La règle de recette qui
décide : **le diff ne doit rien retirer de `main`.**

```bash
git diff --stat origin/main...7-profils-vidéo-b
```

Toute ligne supprimée dans `catalogue.*`, `interaction.service.ts`,
`utils/http-error.ts`, `middleware/error-handler.ts`, `shared/utils/pagination.ts`
ou `shared/types/moderation.ts` signale que le rebase a écrasé du travail
existant. On ne fusionne pas.

**Deux vérifications propres à l'addendum**, en plus des tests :

- `curl "/api/profiles?page=9999"` → 200 avec `data: []`
- toute vidéo créée naît en `PENDING`, et le feed public comme la fiche publique
  filtrent sur `APPROVED` — le catalogue recruteur le fait déjà

### Étape 4 — jeudi 18h00 : **GEL**

Plus aucune migration après ce point. Ce que la base contient à 18h00 est ce que
décrit le livrable de schéma de vendredi.

---

## 5. Ce qu'on vérifie avant la démo et avant chaque dépôt

La CI (`.github/workflows/ci.yml`) enchaîne, sur PostgreSQL 16 : migrations,
seed, build, lint, format, tests avec couverture. Une CI rouge n'est pas un
détail de style — `format:check` bloque sur un fichier non formaté, et le seed
bloque sur une colonne obligatoire oubliée. Les deux se sont produits
aujourd'hui.

**Avant la démonstration de jeudi matin**

- [ ] CI verte sur `main`
- [ ] Inscription refusée à 15 ans, message compris (SOIR-1)
- [ ] Une vidéo en attente n'apparaît nulle part — `docs/preuves/SOIR-2-video-en-attente.txt`
- [ ] Preuve d'inaccessibilité et sa limite déclarée — `docs/preuves/SOIR-3-video-inaccessible.txt`

**Avant le dépôt de vendredi 12h00 (juridique)**

- [ ] CI verte sur `main`
- [ ] Registre et projet de CGU relus **côte à côte** entre 11h00 et 11h30 — Florine annonce les lire ainsi
- [ ] Note critères de filtrage alignée sur `catalogue.filters.ts`, pas sur l'intention
- [ ] Déclaration d'accessibilité limitée à ce qui a été mesuré
- [ ] Note compteurs d'engagement (MA-9) et note vidéo (MA-10) parties

**Avant le dépôt de vendredi 17h00 (technique)**

- [ ] CI verte sur `main`
- [ ] `./scripts/preuves/schema-conforme.sh` — les deux diffs vides
- [ ] `./scripts/preuves/erreurs-http.sh` — rejoué contre `main`, pas contre une branche
- [ ] `./scripts/preuves/sonde-sante.sh` — 200, 503, 200
- [ ] `./scripts/preuves/index-catalogue.sh` — rejoué après le gel
- [ ] `docs/livrables/schema-de-base-de-donnees.md` **régénéré après le gel**
- [ ] Capture Swagger UI refaite si le contrat a bougé

Chaque transcription porte sa date et le commit contre lequel elle a été
produite. Une preuve produite contre un commit qui n'est plus dans `main` se
rejoue — c'est ce qui empêche de déposer une sortie recomposée.

Un garde-fou vaut d'être signalé : `video-en-attente.sh` compare ce que le
fichier source déclare et ce que le serveur fait réellement, et refuse d'écrire
quoi que ce soit s'ils divergent. Il a servi le jour même — une capture avait
été produite contre un serveur resté sur l'ancien binaire, et elle aurait été
déposée comme preuve du contraire de ce qu'elle montrait.
