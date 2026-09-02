# Schéma de base de données — ProfilsActifs

**Destinataire** Thomas Vignal, conseiller au numérique
**Référence** JEB/DNI/2026-003 §8.2 · **Échéance** vendredi 4 septembre, 17h00
**Tâche** EW-6 · **Rédacteur** Ewan — domaine D, contrat d'API et intégration

**État décrit** commit `1d44bad` · PostgreSQL 16 · cinq migrations appliquées :

| Migration                                 | Ce qu'elle apporte                                             |
| ----------------------------------------- | -------------------------------------------------------------- |
| `20260831150606_init`                     | le modèle initial                                              |
| `20260902093737_catalogue_search_indexes` | les index de recherche du catalogue (§2)                       |
| `20260902093932_add_user_birth_date`      | `User.birthDate` — vérification d'âge (§7.3, §7.9.1)           |
| `20260902133533_add_video_consent`        | `Video.acceptedAt`, `.consentTextVersion`, `.revokedAt` (§7.1) |
| `20260902142731_restore_video_created_at` | réintroduit `Video.createdAt` — voir §0.1                      |

> ⚠️ **Ce document sera régénéré après le gel de jeudi 18h00.** Les migrations
> juridiques sont passées, mais une reste attendue : `ModerationLog.videoId`
> (tâche VI-10), sans laquelle une décision de modération portant sur une vidéo
> ne peut pas être tracée. Le §6 la détaille.

---

## 0. Conformité — ce qui est décrit est ce qui tourne

Le §8.2 demande que le schéma **corresponde aux migrations réelles, et pas à
l'intention**. Deux contrôles l'établissent, tous deux verts, transcription
dans `docs/preuves/EW-6-schema-conforme.txt` :

| Contrôle                                          | Commande                                                               | Résultat                 |
| ------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------ |
| Le schéma décrit-il la base en place ?            | `prisma migrate diff --from-schema --to-config-datasource --exit-code` | _No difference detected_ |
| Rejouer les migrations reconstruit-il ce schéma ? | `prisma migrate diff --from-migrations --to-schema --exit-code`        | _No difference detected_ |

Le second est celui qui manque le plus souvent, et c'est le plus utile : il
rejoue le dossier de migrations dans une base vide et compare le résultat au
schéma. Un `db push` passé en catimini rend le premier contrôle vert alors que
le dossier de migrations ne reconstruit plus rien ; le second l'attrape.

Il s'exécute avec `./scripts/preuves/schema-conforme.sh`, qui crée et supprime
lui-même la base jetable dont il a besoin.

### 0.1 Une anomalie visible dans l'historique, et son explication

Un relecteur qui interroge `_prisma_migrations` verra **deux lignes** pour
`20260902133533_add_video_consent` : une en échec, sans date de fin, et une
marquée appliquée. Ce n'est pas une corruption, et nous préférons l'expliquer
que de laisser la question ouverte.

Cette migration ajoute `Video.acceptedAt` et `Video.consentTextVersion` en
`NOT NULL` **sans valeur par défaut**. Sur une base vide — celle de
l'intégration continue — elle passe. Sur une base qui contient déjà des vidéos,
PostgreSQL la refuse :

```
ERROR: column "acceptedAt" of relation "Video" contains null values
```

Et une migration en échec bloque toutes les suivantes. La réparation employée
n'a pas été de vider la base : `scripts/reparer-migration-consentement.sh`
applique ce que la migration aurait fait si elle avait été écrite pour une
table non vide — colonnes en nullable, remplissage depuis `createdAt`, puis
pose de la contrainte — avant de marquer la migration comme appliquée. Aucun
horodatage n'a été perdu : `20260902142731_restore_video_created_at` reprend
la valeur depuis `acceptedAt`.

La ligne en échec est la trace de cette histoire. Elle est conservée plutôt
qu'effacée, parce qu'un historique de migrations qu'on retouche ne vaut plus
rien.

---

## 1. Modèle logique

Quatre ensembles, reliés par `User`.

```
                              ┌──────────────┐
                              │     User     │
                              │  role: 3     │
                              └──────┬───────┘
              ┌──────────────┬───────┴───────┬──────────────────┐
              │ 1..1         │ 1..n          │ 1..n             │ 1..n
        ┌─────▼─────┐  ┌─────▼──────────┐  ┌─▼────────────┐  ┌──▼──────────┐
        │  Profile  │  │ Certification  │  │ Interaction  │  │Notification │
        │           │  │    Attempt     │  │              │  │             │
        └─┬───┬───┬─┘  └───────┬────────┘  └──────┬───────┘  └──────▲──────┘
   1..n   │   │   │ 1..n       │ 1..n             │ 0..n            │
    ┌─────▼─┐ │ ┌─▼──────┐  ┌──▼─────┐            └─────────────────┘
    │Profile│ │ │ Video  │  │ Answer │
    │ Skill │ │ └────────┘  └──┬──┬──┘
    └───┬───┘ │                │  │
   n..1 │     │ 1..n      n..1 │  │ n..1
    ┌───▼───┐ │ ┌──────────────▼┐ │ ┌────────────────────┐
    │ Skill │ │ │ Certification │ └─► CertificationOption│
    └───────┘ │ │   Question    │   └─────────▲──────────┘
              │ └───────┬───────┘             │ 1..n
              │         └─────────────────────┘
              │ 1..n
        ┌─────▼─────────┐        ┌────────────────────┐
        │ ModerationLog │        │ CertificationLevel │
        │  (admin: n..1 │        │  (table de bandes, │
        │      → User)  │        │   sans relation)   │
        └───────────────┘        └────────────────────┘
```

### Cardinalités, en toutes lettres

| Relation                                        | Cardinalité             | Suppression            | Remarque                                                                                                                                                                                                                              |
| ----------------------------------------------- | ----------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User` → `Profile`                              | 1 → 0..1                | cascade                | `Profile.userId` est unique. Seuls les candidats en ont un.                                                                                                                                                                           |
| `Profile` → `ProfileSkill` → `Skill`            | n ↔ n                   | cascade des deux côtés | Table d'association portant `level`. Unique sur `(profileId, skillId)`.                                                                                                                                                               |
| `Profile` → `Video`                             | 1 → 0..n                | cascade                |                                                                                                                                                                                                                                       |
| `Profile` → `ModerationLog`                     | 1 → 0..n                | cascade                |                                                                                                                                                                                                                                       |
| `User` (admin) → `ModerationLog`                | 1 → 0..n                | **restreinte**         | Volontaire : supprimer un administrateur ne doit pas effacer les décisions qu'il a prises.                                                                                                                                            |
| `User` → `CertificationAttempt`                 | 1 → 0..n                | cascade                | **Au plus une** en statut `IN_PROGRESS` — voir §4.                                                                                                                                                                                    |
| `CertificationAttempt` → `Answer`               | 1 → 0..n                | cascade                |                                                                                                                                                                                                                                       |
| `CertificationQuestion` → `CertificationOption` | 1 → 0..n                | cascade                |                                                                                                                                                                                                                                       |
| `Answer` → `CertificationQuestion`              | n → 1                   | restreinte             |                                                                                                                                                                                                                                       |
| `Answer` → `CertificationOption`                | n → 0..1                | restreinte             | Nul pour `SHORT_TEXT` et `LIKERT_SCALE`.                                                                                                                                                                                              |
| `User` → `Interaction`                          | 1 → 0..n, **deux fois** | cascade                | Deux relations distinctes : `recipientId` (le candidat) et `createdById` (le recruteur).                                                                                                                                              |
| `User` → `Notification`                         | 1 → 0..n                | cascade                |                                                                                                                                                                                                                                       |
| `Interaction` → `Notification`                  | 1 → 0..n                | `SetNull`              | Une notification survit à l'interaction qui l'a déclenchée, sans lien mort.                                                                                                                                                           |
| `CertificationLevel`                            | —                       | —                      | Table de correspondance score → badge. Aucune clé étrangère : le badge est **copié** dans `Profile.certificationBadge` au moment du calcul, pour qu'un changement de barème ne réécrive pas rétroactivement les badges déjà délivrés. |

### Les champs ajoutés par les exigences juridiques

Ils ne changent aucune cardinalité, mais ils changent ce que la base contient.

| Champ                      | Type        | Ce qu'il porte                                                                                                                                                                                                                                                     |
| -------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `User.birthDate`           | `DateTime?` | Date de naissance déclarée. **Nullable à dessein** : les comptes créés avant la mesure n'en ont pas, et le modèle doit pouvoir les représenter plutôt que de les rendre illisibles. Le refus des moins de 16 ans est appliqué à l'inscription, pas par la colonne. |
| `Video.acceptedAt`         | `DateTime`  | Date et heure du consentement à la publication.                                                                                                                                                                                                                    |
| `Video.consentTextVersion` | `String`    | Version du texte accepté — c'est ce qui distingue un consentement journalisé d'une case cochée.                                                                                                                                                                    |
| `Video.revokedAt`          | `DateTime?` | Date de révocation, nulle tant que le consentement tient.                                                                                                                                                                                                          |
| `Video.createdAt`          | `DateTime`  | Date de dépôt. Voir §0.1 pour son aller-retour.                                                                                                                                                                                                                    |

### Énumérations

| Type                  | Valeurs                                                     |
| --------------------- | ----------------------------------------------------------- |
| `UserRole`            | `APPLICANT`, `RECRUITER`, `ADMIN`                           |
| `CertificationStatus` | `PENDING`, `IN_PROGRESS`, `COMPLETED`, `REJECTED`           |
| `AttemptStatus`       | `IN_PROGRESS`, `COMPLETED`, `ABANDONED`, `EXPIRED`          |
| `QuestionType`        | `MULTIPLE_CHOICE`, `SHORT_TEXT`, `CHECKBOX`, `LIKERT_SCALE` |
| `ModerationStatus`    | `PENDING`, `APPROVED`, `REJECTED`                           |
| `ModerationAction`    | `APPROVE`, `REJECT`, `FLAG`, `REQUIRE_CHANGES`              |
| `SkillLevel`          | `BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `EXPERT`            |
| `VideoType`           | `EXTERNAL_LINK`, `UPLOAD`                                   |
| `InteractionType`     | `VIEW`, `CONTACT`, `FAVORITE`, `MESSAGE`                    |
| `NotificationType`    | `NEW_INTERACTION_RECEIVED`, `CERTIFICATION_BADGE_EARNED`    |

`InteractionType` **n'a pas de valeur `LIKE`**. C'est un choix de périmètre, pas
un oubli — voir `docs/remontees/02-les-likes.md`.

---

## 2. Index

Relevés sur la base en place, pas sur le schéma
(`docs/preuves/EW-6-schema-conforme.txt`). Les clés primaires sont des index
uniques btree sur `id` (cuid) pour chacune des quatorze tables et ne sont pas
répétées ligne à ligne.

### Contraintes d'unicité

| Table                | Colonnes             | Ce qu'elle garantit                                 |
| -------------------- | -------------------- | --------------------------------------------------- |
| `User`               | `email`              | Une adresse, un compte.                             |
| `Profile`            | `userId`             | Un profil par utilisateur au plus.                  |
| `Skill`              | `name`               | Référentiel sans doublon.                           |
| `ProfileSkill`       | `profileId, skillId` | Une compétence n'est portée qu'une fois par profil. |
| `CertificationLevel` | `name`               | Une bande de badge par nom.                         |

### Index de recherche

| Table                   | Index                          | Type              | Ce qu'il sert                                  |
| ----------------------- | ------------------------------ | ----------------- | ---------------------------------------------- |
| `Profile`               | `sector`                       | **GIN trigramme** | filtre secteur (`ILIKE`), recherche libre      |
| `Profile`               | `location`                     | **GIN trigramme** | filtre localisation (`ILIKE`), recherche libre |
| `Profile`               | `certificationScore`           | btree             | `sort=score`                                   |
| `Profile`               | `updatedAt`                    | btree             | `sort=recent` — tri par défaut du catalogue    |
| `Profile`               | `certificationStatus`          | btree             | filtre `certifiedOnly`                         |
| `Profile`               | `moderationStatus`             | btree             | file de modération                             |
| `Skill`                 | `name`                         | **GIN trigramme** | filtre compétences (`ILIKE`)                   |
| `ProfileSkill`          | `skillId, profileId`           | btree             | facette compétences, en parcours d'index seul  |
| `Video`                 | `profileId`                    | btree             | vidéos d'un profil                             |
| `User`                  | `role`                         | btree             | dénombrements par rôle des tableaux de bord    |
| `Interaction`           | `recipientId, type`            | btree             | interactions reçues par un candidat            |
| `Interaction`           | `createdById, type, createdAt` | btree             | tableau de bord recruteur, séries temporelles  |
| `Notification`          | `userId, isRead`               | btree             | badge « non lues »                             |
| `CertificationAttempt`  | `userId, status`               | btree             | reprise de la tentative en cours               |
| `CertificationQuestion` | `isActive, order`              | btree             | questionnaire public dans l'ordre              |
| `CertificationOption`   | `questionId`                   | btree             | options d'une question                         |
| `Answer`                | `attemptId, questionId`        | btree             | réponses d'une tentative                       |
| `CertificationLevel`    | `minScore, maxScore`           | btree             | résolution de la bande de badge                |
| `ModerationLog`         | `profileId` / `adminId`        | btree             | historique par profil et par administrateur    |

**Les trois index GIN trigrammes méritent une explication**, parce qu'un btree
serait le choix attendu. Les filtres du catalogue sont écrits en
`mode: 'insensitive'`, que Prisma traduit en `ILIKE` — un btree n'y répond pas,
et les index btree présents avant la migration sur `sector` et `location`
n'étaient donc jamais choisis. L'extension `pg_trgm` est créée par la migration
(elle est livrée avec les contribs PostgreSQL et est _trusted_ depuis la 13 :
aucun droit superutilisateur, rien d'extérieur). Le raisonnement complet, les
options écartées et les mesures avant/après :
`docs/decisions/02-index-du-catalogue.md`.

### Mesures

Sur 50 000 profils, requêtes émises par Prisma et non réécrites
(`docs/preuves/EW-5-index-catalogue.txt`) :

| Critère         |    Avant |       Après |
| --------------- | -------: | ----------: |
| secteur         |  23,8 ms | **1,56 ms** |
| localisation    |  24,0 ms | **2,76 ms** |
| compétences     |  6,16 ms | **4,99 ms** |
| recherche libre | 444,9 ms | **4,38 ms** |

Les temps absolus varient d'une exécution à l'autre ; la transcription porte les
plans d'exécution, qui sont la partie stable de la mesure.

Les temps absolus varient d'une exécution à l'autre ; la transcription porte les
plans d'exécution, qui sont la partie stable de la mesure.

---

## 3. Deux écarts assumés entre le modèle et le contrat

Le §8.2 demande que le schéma corresponde au réel. Il correspond, y compris là
où il dépasse ce que le contrat expose. Les deux cas sont commentés dans
`schema.prisma` :

- **`Profile.moderationStatus` et `Video.moderationStatus`** existent parce que
  les routes d'administration doivent agir sur quelque chose, mais le schéma
  `Profile` d'`openapi.yaml` ne les expose pas. L'écart se résout en publiant le
  champ au contrat, pas en le retirant du modèle.
- **`Video.fileSizeBytes`** n'a de sens que pour `VideoType.UPLOAD`, et le
  téléversement direct n'est pas implémenté — la colonne est là pour porter le
  plafond de 100 Mo du §8.5 le jour où il le sera.

---

## 4. Trois règles que la base ne sait pas dire

Elles sont tenues par la couche applicative, délibérément. Un relecteur qui
cherche la contrainte SQL correspondante ne la trouvera pas, et c'est voulu :
mieux vaut l'écrire ici que de le laisser passer pour un oubli.

1. **Au plus une tentative `IN_PROGRESS` par candidat.** C'est ce qui fait
   fonctionner la reprise. Il n'y a pas d'index unique partiel : la règle est
   tenue par `services/certification/attempts.ts`, dans une transaction
   `SERIALIZABLE` avec reprise sur erreur `P2034`. Deux onglets ouverts en même
   temps liraient tous deux « aucune tentative en cours » sous une isolation
   plus faible et en créeraient deux ; sous `SERIALIZABLE`, PostgreSQL détecte
   l'anomalie et fait échouer l'une des deux, qu'on rejoue.
2. **`Answer` n'est pas unique sur `(attemptId, questionId)`.** Une question
   `CHECKBOX` produit une ligne par option cochée. L'index sur ce couple est un
   index de recherche, pas une contrainte.
3. **Le score est calculé côté serveur.** `CertificationAttempt.score` et
   `Profile.certificationScore` ne sont jamais reçus du client, et `pointsEarned`
   n'est pas renvoyé tant que la tentative est en cours.

---

## 5. Cycle de vie des données

- **Suppression douce** pour les profils : `moderationStatus` porte l'état, la
  ligne reste. Tout changement de statut écrit une ligne `ModerationLog`.
- **Cascade** sur les clés étrangères, à une exception près :
  `ModerationLog.adminId` est restreinte, pour que la trace survive au départ de
  l'administrateur qui l'a écrite.
- **La révocation d'un consentement est datée, pas silencieuse.** `Video.revokedAt`
  porte la date ; en intégration par lien, supprimer la ligne retire l'adresse
  de chez nous mais laisse le contenu chez l'hébergeur — limite déclarée par
  écrit dans `docs/remontees/05-lien-externe-inaccessibilite.md`.
- **Aucune purge, aucune expiration.** `CertificationAttempt.expiresAt` existe
  et n'est alimenté par rien. Aucune donnée n'est effacée par le temps. Les
  durées de conservation proposées au dossier juridique
  (`docs/livrables/registre-de-traitement.md`) ne sont pas appliquées : c'est
  l'écart le plus important entre les documents et le comportement réel, et il
  est signalé aux deux destinataires.

---

## 6. Ce que le gel de jeudi ajoutera

Les deux migrations juridiques sont passées et sont décrites ci-dessus. Une
seule reste attendue.

| Migration                 | Ce qu'elle ajoute                                                                                                                                    | Tâche | Échéance    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------- |
| Trace de modération vidéo | `ModerationLog.videoId` — le journal est aujourd'hui clé sur `profileId` seul et ne peut donc pas tracer une décision portant sur une vidéo (§7.9.2) | VI-10 | jeudi matin |

C'est le dernier écart entre le modèle et ce que l'addendum du 2 septembre
exige : la modération _a priori_ des vidéos suppose de savoir **qui a décidé et
quand**, et cette trace n'a pas encore de colonne où s'écrire.

**Après le gel :** rejouer `./scripts/preuves/schema-conforme.sh`, vérifier que
les deux diffs restent vides, et régénérer l'en-tête, le §1, le §2 et le §6 de
ce document. La version envoyée vendredi 17h00 est celle-là, pas celle-ci.
