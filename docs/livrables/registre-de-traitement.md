# Registre des activités de traitement — ProfilsActifs

**Destinataire** Florine Pontaillac, conseillère juridique
**Référence** JEB/DNI/2026-003 §7.7.1 · **Échéance** vendredi 11 septembre, 12h00
**Tâche** EW-7 · **Rédacteur** Ewan — domaine D, contrat d'API
**Révision** 7 septembre 2026 — reprise après votre courriel du même jour ; le §4
a changé de sens (voir §4)
**État du modèle décrit** branche `fix/courriel-du-7-septembre` sur `ba68234`,
huit migrations appliquées (détail dans
`docs/livrables/schema-de-base-de-donnees.md`)

---

## Comment lire ce document

Chaque ligne nomme **la table et le champ réels** du modèle de données, comme
demandé. Le modèle de référence est `packages/db/prisma/schema.prisma`, et sa
conformité avec la base réellement en place est vérifiée par
`prisma migrate diff` — transcription dans `docs/preuves/EW-6-schema-conforme.txt`.

Trois avertissements à lire avant le tableau, parce qu'ils portent sur des
absences et qu'une absence ne se voit pas dans un tableau :

1. **Aucune durée de conservation n'est appliquée par le logiciel aujourd'hui.**
   Les durées de la colonne « conservation » sont des propositions à valider,
   pas une description de ce qui se passe. Aucune tâche de purge n'existe. Nous
   ne les présentons pas comme acquises — voir §3.
2. **Il n'y a pas de journal de connexion.** Votre liste en cite un ; il n'existe
   pas. L'authentification est un JWT sans état : aucune session n'est stockée,
   aucune connexion n'est horodatée. Le §2.9 explique ce qui existe à la place.
3. **Les deux traitements que vos exigences imposaient sont désormais au
   modèle** — la date de naissance (§7.3, §7.9.1) et le consentement vidéo
   journalisé (§7.1). Ils figurent aux §2.8 et §2.3 avec leurs vrais noms de
   champs. L'écart que la version du 4 septembre annonçait — la trace « qui a
   décidé et quand » sur une décision de modération **vidéo** — est refermé, et
   le §4 dit où le vérifier.

---

## 1. Vue d'ensemble

| #   | Traitement                     | Finalité                                               | Base légale                           | Tables                                                                                                 |
| --- | ------------------------------ | ------------------------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | Compte utilisateur             | Créer et authentifier un compte                        | Exécution du contrat (CGU)            | `User`                                                                                                 |
| 2   | Profil professionnel           | Publier une candidature consultable                    | Consentement                          | `Profile`, `ProfileSkill`, `Skill`                                                                     |
| 3   | Vidéo de présentation          | Diffuser une présentation filmée                       | Consentement explicite, révocable     | `Video`                                                                                                |
| 4   | Questionnaire de certification | Évaluer l'aptitude, délivrer le badge                  | Exécution du contrat                  | `CertificationAttempt`, `Answer`, `CertificationQuestion`, `CertificationOption`, `CertificationLevel` |
| 5   | Contact et suivi recruteur     | Mettre en relation, tracer les échanges                | Intérêt légitime du recruteur         | `Interaction`                                                                                          |
| 6   | Notification du candidat       | Informer d'un contact ou d'un badge                    | Exécution du contrat                  | `Notification`                                                                                         |
| 7   | Modération                     | Contrôler les contenus publiés                         | Obligation légale et intérêt légitime | `ModerationLog`, `Profile.moderationStatus`, `Video.moderationStatus`                                  |
| 8   | Vérification d'âge             | Refuser les moins de 16 ans, appliquer le régime 16-18 | Obligation légale                     | `User.birthDate`                                                                                       |
| —   | Journal de connexion           | **N'existe pas** — voir §2.9                           | —                                     | —                                                                                                      |

---

## 2. Le détail, traitement par traitement

### 2.1 Compte utilisateur

|                           |                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Finalité**              | Créer un compte, authentifier son titulaire, lui attribuer un rôle (candidat, recruteur, administrateur).                                                                                                                                                                                                                                                                                |
| **Base légale**           | Exécution du contrat — les CGU.                                                                                                                                                                                                                                                                                                                                                          |
| **Personnes concernées**  | Candidats, recruteurs, administrateurs.                                                                                                                                                                                                                                                                                                                                                  |
| **Catégories de données** | Identité et coordonnée de contact ; secret d'authentification ; rôle ; état d'activation.                                                                                                                                                                                                                                                                                                |
| **Champs réels**          | `User.email`, `User.firstName`, `User.lastName`, `User.passwordHash`, `User.role`, `User.isActive`, `User.createdAt`, `User.updatedAt`                                                                                                                                                                                                                                                   |
| **Conservation**          | _Proposition_ : durée du compte, puis 12 mois après sa désactivation. Non appliquée aujourd'hui.                                                                                                                                                                                                                                                                                         |
| **Destinataires**         | La personne elle-même (`GET /auth/me`) ; les administrateurs ; l'hébergeur. Le prénom et le nom d'un candidat sont visibles des recruteurs par le catalogue.                                                                                                                                                                                                                             |
| **Mesures particulières** | `passwordHash` est un bcrypt à 12 tours et **n'est jamais sélectionné dans une réponse d'API** — aucun contrôleur ne le projette. La désactivation passe par `isActive` plutôt que par une suppression, ce qui préserve les traces de modération ; une suppression réelle propage en cascade (`onDelete: Cascade`) sur le profil, les tentatives, les interactions et les notifications. |

### 2.2 Profil professionnel

|                           |                                                                                                                                                                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Finalité**              | Publier une candidature consultable par les recruteurs et, pour le fil public, sans authentification.                                                                                                                                                                      |
| **Base légale**           | Consentement — le candidat crée et renseigne son profil pour qu'il soit vu.                                                                                                                                                                                                |
| **Personnes concernées**  | Candidats.                                                                                                                                                                                                                                                                 |
| **Catégories de données** | Situation professionnelle déclarée ; localisation déclarée ; texte libre de présentation ; compétences ; résultat de certification.                                                                                                                                        |
| **Champs réels**          | `Profile.headline`, `Profile.bio`, `Profile.location`, `Profile.sector`, `Profile.certificationStatus`, `Profile.certificationScore`, `Profile.certificationBadge`, `Profile.createdAt`, `Profile.updatedAt` ; `ProfileSkill.skillId`, `ProfileSkill.level` ; `Skill.name` |
| **Conservation**          | _Proposition_ : identique au compte. Non appliquée aujourd'hui.                                                                                                                                                                                                            |
| **Destinataires**         | Recruteurs (catalogue) ; **le public**, le fil de profils et la page profil étant volontairement accessibles sans authentification ; administrateurs ; hébergeur.                                                                                                          |
| **À signaler**            | `Profile.bio` est un texte libre : son contenu est celui que le candidat y met, y compris, le cas échéant, des données qu'il n'était pas tenu de fournir. La CGU devrait le dire.                                                                                          |

### 2.3 Vidéo de présentation

|                              |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Finalité**                 | Diffuser une présentation filmée du candidat sur son profil et dans le fil.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Base légale**              | Consentement explicite, spécifique et révocable (§7.1).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Personnes concernées**     | Candidats, et toute personne apparaissant ou s'exprimant dans la vidéo.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Catégories de données**    | **Image et voix — donnée personnelle identifiante** ; titre et description ; adresse de la ressource.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Champs réels**             | `Video.title`, `Video.description`, `Video.type`, `Video.url`, `Video.captionsUrl`, `Video.duration`, `Video.fileSizeBytes`, `Video.moderationStatus`, `Video.createdAt`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Conservation**             | _Proposition_ : jusqu'à révocation du consentement ou suppression du profil. Non appliquée aujourd'hui.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Destinataires**            | Recruteurs ; **le public** ; administrateurs ; **et l'hébergeur de la plateforme vidéo tierce** — voir ci-dessous.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Point d'attention majeur** | La quasi-totalité des vidéos sont des **intégrations iframe** (`VideoType.EXTERNAL_LINK`) : `Video.url` pointe une ressource YouTube ou Vimeo. La vidéo n'est donc pas hébergée par la plateforme, et **c'est un transfert vers un tiers**, avec ce que cela implique côté RGPD, y compris hors Union européenne. Le §8.3 impose par ailleurs de dire quelles données quittent l'infrastructure : la note de déploiement le détaille. Nous appelons votre attention dessus explicitement.                                                                                                                                                                                                                                                                             |
| **Consentement**             | Journalisé, pas coché : `Video.acceptedAt` porte la date et l'heure, `Video.consentTextVersion` la version du texte accepté. Les deux colonnes sont `NOT NULL` — une vidéo ne peut pas exister sans son consentement, fixtures de démonstration comprises, qui ne bénéficient d'aucune exemption.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Révocation**               | `DELETE /videos/{id}` supprime la ligne **et les octets** : le fichier vidéo et sa piste de sous-titres quittent le répertoire de stockage. Il n'existe volontairement **pas** de colonne `revokedAt` — un champ qui ne pourrait s'écrire que sur la ligne qu'on efface resterait vide (colonne supprimée par la migration `20260907092851`). La démonstration « répertoire avant / fiche / répertoire après » que vous demandiez est produite : `docs/preuves/AD-7-sous-titres-et-revocation.txt`. Réserve qui subsiste : pour une vidéo **intégrée** (YouTube/Vimeo), il n'y a aucun fichier chez nous à supprimer, et la vidéo continue d'exister chez l'hébergeur tiers tant que le candidat ne l'y supprime pas — le texte de consentement le dit en ces termes. |

### 2.4 Questionnaire de certification

|                                 |                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Finalité**                    | Évaluer l'aptitude professionnelle, calculer un score, délivrer le badge « JEB Work Permit ».                                                                                                                                                                                                                                                                 |
| **Base légale**                 | Exécution du contrat — la certification est le service demandé.                                                                                                                                                                                                                                                                                               |
| **Personnes concernées**        | Candidats.                                                                                                                                                                                                                                                                                                                                                    |
| **Catégories de données**       | Réponses au questionnaire, dont des textes libres ; score ; horodatages de passation.                                                                                                                                                                                                                                                                         |
| **Champs réels**                | `CertificationAttempt.status`, `.score`, `.startedAt`, `.lastActivityAt`, `.expiresAt`, `.completedAt` ; `Answer.questionId`, `.optionId`, `.textAnswer`, `.numericAnswer`, `.pointsEarned`, `.createdAt`                                                                                                                                                     |
| **Référentiel (non personnel)** | `CertificationQuestion.*`, `CertificationOption.*`, `CertificationLevel.*` — contenu du questionnaire et barème, aucune donnée personnelle.                                                                                                                                                                                                                   |
| **Conservation**                | _Proposition_ : 24 mois après la dernière tentative achevée ; les tentatives abandonnées, 3 mois. Non appliquée aujourd'hui.                                                                                                                                                                                                                                  |
| **Destinataires**               | Le candidat ; les administrateurs. **Le score et le badge sont publics** via le profil ; **les réponses ne le sont jamais** — ni `Answer`, ni `pointsEarned` ne sortent par une route publique, et `pointsEarned` est explicitement retiré des réponses tant que la tentative est en cours.                                                                   |
| **Décision automatisée**        | Le score et la bande de badge sont calculés **côté serveur** à partir d'un barème identique pour tous, jamais reçus du client. Le résultat conditionne la visibilité auprès des recruteurs « premium » au sens du §2.1 : c'est une décision automatisée à effet sur la personne, et le candidat doit pouvoir en connaître les critères. À arbitrer avec vous. |

### 2.5 Contact et suivi recruteur

|                           |                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Finalité**              | Permettre à un recruteur de consulter, retenir et contacter un candidat, et lui en garder trace.                                                                                                                                                                                                                                                               |
| **Base légale**           | Intérêt légitime du recruteur à conduire un recrutement ; exécution du contrat côté candidat.                                                                                                                                                                                                                                                                  |
| **Personnes concernées**  | Candidats (destinataires), recruteurs (auteurs).                                                                                                                                                                                                                                                                                                               |
| **Catégories de données** | Type d'interaction ; contenu du message ; horodatage ; identité des deux parties.                                                                                                                                                                                                                                                                              |
| **Champs réels**          | `Interaction.recipientId`, `.createdById`, `.type` (`VIEW`, `CONTACT`, `FAVORITE`, `MESSAGE`), `.message`, `.isViewed`, `.isFavorite`, `.createdAt`                                                                                                                                                                                                            |
| **Conservation**          | _Proposition_ : 24 mois. Non appliquée aujourd'hui.                                                                                                                                                                                                                                                                                                            |
| **Destinataires**         | Le recruteur auteur ; le candidat destinataire ; les administrateurs (statistiques agrégées).                                                                                                                                                                                                                                                                  |
| **À signaler**            | `type = VIEW` enregistre **le fait qu'un recruteur a consulté un profil**. C'est une donnée de comportement, et elle est visible du candidat. Les consultations répétées d'un même profil sont regroupées, si bien que le compteur mesure des personnes et non des chargements de page. Nous le mentionnons parce que la CGU doit l'annoncer aux deux parties. |

### 2.6 Notification du candidat

|                           |                                                                                                                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Finalité**              | Informer un candidat qu'un recruteur l'a contacté, ou qu'un badge lui a été attribué.                                                                                                                          |
| **Base légale**           | Exécution du contrat.                                                                                                                                                                                          |
| **Personnes concernées**  | Candidats.                                                                                                                                                                                                     |
| **Catégories de données** | Type, titre, message, état de lecture, lien vers l'interaction d'origine.                                                                                                                                      |
| **Champs réels**          | `Notification.type`, `.title`, `.message`, `.isRead`, `.interactionId`, `.createdAt`                                                                                                                           |
| **Conservation**          | _Proposition_ : 12 mois. Non appliquée aujourd'hui.                                                                                                                                                            |
| **Destinataires**         | Le candidat seul.                                                                                                                                                                                              |
| **À signaler**            | Les notifications sont **internes à l'application**. Aucun courriel n'est envoyé, aucun prestataire d'envoi n'est utilisé — le §8.3 l'interdirait. Aucune donnée ne quitte l'infrastructure par ce traitement. |

### 2.7 Modération

|                           |                                                                                                                                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Finalité**              | Contrôler les profils et les vidéos publiés, et garder trace de chaque décision.                                                                                                                                                                       |
| **Base légale**           | Obligation légale (contenus illicites) et intérêt légitime de l'exploitant.                                                                                                                                                                            |
| **Personnes concernées**  | Candidats modérés ; administrateurs auteurs des décisions.                                                                                                                                                                                             |
| **Catégories de données** | Décision, motif, notes internes, auteur, horodatage, statut courant.                                                                                                                                                                                   |
| **Champs réels**          | `ModerationLog.action`, `.reason`, `.notes`, `.adminId`, `.profileId`, `.videoId`, `.createdAt` ; `Profile.moderationStatus` ; `Video.moderationStatus`                                                                                                |
| **Conservation**          | _Proposition_ : 36 mois, la trace ayant vocation probatoire. Non appliquée aujourd'hui.                                                                                                                                                                |
| **Destinataires**         | Administrateurs. Le candidat n'a pas accès à `ModerationLog.notes`.                                                                                                                                                                                    |
| **À signaler**            | `notes` est un champ libre renseigné par un administrateur **à propos d'une personne**, non visible d'elle, et pourtant couvert par son droit d'accès. C'est le champ le plus exposé du modèle sur ce point, et il mérite une consigne d'usage écrite. |

### 2.8 Vérification d'âge

|                           |                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Finalité**              | Refuser l'inscription aux moins de 16 ans et appliquer aux 16-18 ans le régime qui leur est propre (§7.9.1).                                                                                                                                                                                                                                                 |
| **Base légale**           | Obligation légale.                                                                                                                                                                                                                                                                                                                                           |
| **Personnes concernées**  | Toute personne s'inscrivant.                                                                                                                                                                                                                                                                                                                                 |
| **Catégories de données** | Date de naissance déclarative.                                                                                                                                                                                                                                                                                                                               |
| **Champs réels**          | `User.birthDate`                                                                                                                                                                                                                                                                                                                                             |
| **Conservation**          | _Proposition_ : identique au compte. Non appliquée aujourd'hui.                                                                                                                                                                                                                                                                                              |
| **Destinataires**         | La personne elle-même ; les administrateurs. **Jamais les recruteurs** : l'âge n'est exposé par aucune réponse d'API et n'est filtrable nulle part — voir `note-criteres-de-filtrage.md` §2.2.                                                                                                                                                               |
| **À signaler**            | La colonne est **nullable**, à dessein : les comptes créés avant la mesure n'ont pas de date, et le modèle doit pouvoir les représenter plutôt que de les rendre illisibles. Le refus des moins de 16 ans est appliqué à l'inscription, pas par une contrainte de la base. Le sort des comptes déjà créés sans date est traité par le domaine A (note AD-2). |
| **Déclarative**           | La date est saisie par la personne et n'est vérifiée contre aucune pièce. C'est ce que votre addendum demande — « date de naissance déclarative » — et cela vaut d'être écrit : le dispositif écarte une inscription de bonne foi, il n'empêche pas une fausse déclaration.                                                                                  |

### 2.9 Journal de connexion — ce qui existe à la place

Votre liste attend une ligne « journal de connexion ». Nous préférons écrire
qu'elle n'existe pas plutôt que de la remplir.

L'authentification est **un JWT sans état** : le jeton est signé, remis au
client, et vérifié à chaque requête sans être stocké. Il n'y a donc ni table de
sessions, ni horodatage de connexion, ni adresse IP conservée en base. Ce qui
existe :

- `User.updatedAt`, qui bouge à chaque modification du compte — **ce n'est pas
  une date de dernière connexion** et il ne faut pas la lire ainsi ;
- les journaux du processus (`console.error` sur erreur), écrits sur la sortie
  standard, non structurés, non conservés, jamais associés à un compte ;
- le compteur de limitation de débit, tenu **en mémoire vive** par IP ou par
  identifiant de compte, remis à zéro au redémarrage et jamais écrit sur disque.

Conséquence à assumer : la plateforme **ne peut pas** produire l'historique des
connexions d'un compte, ni pour un droit d'accès, ni en cas de contestation.
Si vous jugez ce journal nécessaire, c'est une table et un traitement de plus,
avec sa propre finalité et sa propre durée — à décider avant de l'écrire, pas
après.

---

## 3. Ce que ce registre ne décrit pas encore

Nous préférons vous le dire nous-mêmes plutôt que vous le laisser trouver.

**Aucune durée de conservation n'est appliquée.** Il n'existe ni tâche de purge,
ni date d'expiration, ni anonymisation différée. Les colonnes « conservation »
ci-dessus sont des propositions ; en l'état, une donnée entrée reste. C'est le
principal écart entre ce document et le comportement réel, et il vous revient
d'arbitrer les durées avant qu'on les implémente.

**La suppression d'un compte est une cascade, pas un effacement raisonné.** Les
clés étrangères sont en `onDelete: Cascade` : supprimer un `User` emporte son
profil, ses vidéos, ses tentatives, ses réponses, ses interactions et ses
notifications. C'est net pour le droit à l'effacement, mais cela emporte aussi
les interactions **côté recruteur**, qui perd la trace de ses propres démarches.
Le point n'est pas tranché.

**Les comptes de démonstration sont dans le même modèle.** Vous les citez
nommément : les quinze comptes du seed (`packages/db/src/seed.ts`) sont des
`User` ordinaires, avec un mot de passe commun publié dans le dépôt. Ils sont
fictifs, mais ils ne bénéficient d'aucune exemption technique — la note de la
tâche AD-2 traite leur cas.

---

## 4. L'écart annoncé le 4 septembre est refermé

La version de ce registre qui vous a été remise le 4 septembre déclarait une
lacune : `ModerationLog` était clé sur `profileId` seul et ne pouvait donc pas
porter la trace « qui a décidé et quand » sur une décision de modération
**vidéo**, que votre §7.9.2 exige. C'était la tâche VI-10.

**Elle est faite, et elle l'était déjà quand nous vous avons écrit** — nous
avons remis un document en retard sur son propre modèle, et nous préférons le
dire que le laisser passer. Le détail, vérifiable :

| Ce qui a changé                       | Où le lire                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| `ModerationLog.videoId` + la relation | `packages/db/prisma/schema.prisma`, modèle `ModerationLog`                             |
| La migration correspondante           | `packages/db/prisma/migrations/20260902095149_video_moderation_log/`                   |
| L'écriture de la décision             | `packages/api/src/services/moderation.service.ts:70`                                   |
| La restitution au candidat            | `packages/api/src/utils/mappers.ts` (`videoDecisionInclude`), champ `moderationReason` |

Une décision de modération vidéo écrit donc aujourd'hui une ligne portant
`adminId` (qui), `createdAt` (quand), `action`, `reason` et `notes` (quoi et
pourquoi), au même titre qu'une décision sur un profil. L'historique existe, il
est indexé sur `videoId`, et le motif d'un refus est rendu à son auteur sur sa
propre fiche.

`Video.moderationStatus` continue de porter l'**état** courant — et depuis le
2 septembre une vidéo en attente n'est servie nulle part
(`docs/preuves/SOIR-2-video-en-attente.txt`). Ce qui manquait était
l'**historique** ; il est là.

Aucun écart ne subsiste entre ce registre et le modèle. Ce qui reste ouvert
n'est pas un écart de description mais un arbitrage qui vous revient, et tout
est au §3 et au §5 : les durées de conservation, qu'aucun code n'applique ; la
suppression en cascade ; et le journal de connexion, qui n'existe pas (§2.9).

Le texte de consentement v1.0 et le projet de CGU sont rédigés par le domaine A
(tâche AD-8). Vous annoncez lire le registre et la CGU côte à côte : la relecture
croisée entre les deux documents est planifiée **vendredi entre 11h00 et 11h30**,
avant l'envoi.

---

## 5. Ce que nous vous demandons de trancher

1. **Les durées de conservation** du §1, à valider ou corriger, avant qu'on
   écrive la purge qui les appliquera.
2. **Le journal de connexion** (§2.9) : le créer, ou acter par écrit qu'il n'y
   en a pas.
3. **L'intégration vidéo par iframe** (§2.3), qui fait sortir de l'image et de
   la voix vers un hébergeur tiers, possiblement hors UE.
4. **La décision automatisée liée au badge** (§2.4), qui conditionne la
   visibilité du candidat auprès des recruteurs.
5. **Le mécanisme d'allocation adossé aux « likes »** décrit au §3 du cahier des
   charges. Il n'est pas dans ce registre parce qu'il n'est pas implémenté, et
   il ne le sera pas sans votre avis écrit. Le détail de notre position :
   `docs/remontees/01-allocation-et-likes.md`.
