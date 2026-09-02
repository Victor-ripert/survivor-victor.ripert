# Registre des activités de traitement — ProfilsActifs

**Destinataire** Florine Pontaillac, conseillère juridique
**Référence** JEB/DNI/2026-003 §7.7.1 · **Échéance** vendredi 4 septembre, 12h00
**Tâche** EW-7 · **Rédacteur** Ewan — domaine D, contrat d'API
**État du modèle décrit** commit `75ccee1`, migrations `20260831150606_init` et
`20260902093737_catalogue_search_indexes`

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
   aucune connexion n'est horodatée. Le §2.8 explique ce qui existe à la place.
3. **Deux traitements que vos exigences imposent ne sont pas encore au modèle** —
   la date de naissance (§7.3) et le consentement vidéo journalisé (§7.1). Ils
   sont en cours (tâches AD-1 et AD-3, migrations attendues jeudi midi) et
   figurent au §4 avec les noms de champs convenus, clairement séparés de ce qui
   existe. Ce registre n'est **pas définitif** tant que ces deux migrations ne
   sont pas passées.

---

## 1. Vue d'ensemble

| #   | Traitement                     | Finalité                                | Base légale                           | Tables                                                                                                 |
| --- | ------------------------------ | --------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | Compte utilisateur             | Créer et authentifier un compte         | Exécution du contrat (CGU)            | `User`                                                                                                 |
| 2   | Profil professionnel           | Publier une candidature consultable     | Consentement                          | `Profile`, `ProfileSkill`, `Skill`                                                                     |
| 3   | Vidéo de présentation          | Diffuser une présentation filmée        | Consentement explicite, révocable     | `Video`                                                                                                |
| 4   | Questionnaire de certification | Évaluer l'aptitude, délivrer le badge   | Exécution du contrat                  | `CertificationAttempt`, `Answer`, `CertificationQuestion`, `CertificationOption`, `CertificationLevel` |
| 5   | Contact et suivi recruteur     | Mettre en relation, tracer les échanges | Intérêt légitime du recruteur         | `Interaction`                                                                                          |
| 6   | Notification du candidat       | Informer d'un contact ou d'un badge     | Exécution du contrat                  | `Notification`                                                                                         |
| 7   | Modération                     | Contrôler les contenus publiés          | Obligation légale et intérêt légitime | `ModerationLog`, `Profile.moderationStatus`, `Video.moderationStatus`                                  |
| —   | Journal de connexion           | **N'existe pas** — voir §2.8            | —                                     | —                                                                                                      |

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

|                              |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Finalité**                 | Diffuser une présentation filmée du candidat sur son profil et dans le fil.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Base légale**              | Consentement explicite, spécifique et révocable (§7.1).                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Personnes concernées**     | Candidats, et toute personne apparaissant ou s'exprimant dans la vidéo.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Catégories de données**    | **Image et voix — donnée personnelle identifiante** ; titre et description ; adresse de la ressource.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Champs réels**             | `Video.title`, `Video.description`, `Video.type`, `Video.url`, `Video.duration`, `Video.fileSizeBytes`, `Video.moderationStatus`, `Video.createdAt`                                                                                                                                                                                                                                                                                                                                                                        |
| **Conservation**             | _Proposition_ : jusqu'à révocation du consentement ou suppression du profil. Non appliquée aujourd'hui.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Destinataires**            | Recruteurs ; **le public** ; administrateurs ; **et l'hébergeur de la plateforme vidéo tierce** — voir ci-dessous.                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Point d'attention majeur** | Les vidéos sont des **intégrations iframe** (`VideoType.EXTERNAL_LINK`) : `Video.url` pointe une ressource YouTube ou Vimeo. La vidéo n'est donc pas hébergée par la plateforme, et **c'est un transfert vers un tiers**, avec ce que cela implique côté RGPD, y compris hors Union européenne. Le §8.3 impose par ailleurs de dire quelles données quittent l'infrastructure : la note de déploiement le détaille. Nous appelons votre attention dessus explicitement.                                                    |
| **Révocation**               | La journalisation du consentement et l'effet réel de la révocation sont la tâche AD-3/AD-4, non encore au modèle — §4. En intégration iframe, il n'y a **aucun fichier à supprimer côté plateforme** : la révocation supprime la ligne `Video` et le lien, mais la vidéo continue d'exister chez l'hébergeur tiers tant que le candidat ne l'y supprime pas. La preuve « répertoire de stockage avant et après » que vous demandez ne s'applique pas telle quelle, et ce point doit être écrit noir sur blanc dans la CGU. |

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
| **Champs réels**          | `ModerationLog.action`, `.reason`, `.notes`, `.adminId`, `.profileId`, `.createdAt` ; `Profile.moderationStatus` ; `Video.moderationStatus`                                                                                                            |
| **Conservation**          | _Proposition_ : 36 mois, la trace ayant vocation probatoire. Non appliquée aujourd'hui.                                                                                                                                                                |
| **Destinataires**         | Administrateurs. Le candidat n'a pas accès à `ModerationLog.notes`.                                                                                                                                                                                    |
| **À signaler**            | `notes` est un champ libre renseigné par un administrateur **à propos d'une personne**, non visible d'elle, et pourtant couvert par son droit d'accès. C'est le champ le plus exposé du modèle sur ce point, et il mérite une consigne d'usage écrite. |

### 2.8 Journal de connexion — ce qui existe à la place

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

## 4. Traitements attendus, non encore au modèle

Ces deux lignes complètent le registre dès que les migrations correspondantes
sont passées. Elles figurent ici avec les noms de champs convenus pour que vous
puissiez lire la CGU en face dès maintenant, mais **elles décrivent un modèle
qui n'existe pas encore au moment où ce document est écrit**.

| Traitement                        | Finalité                                                                | Base légale       | Champs prévus                                   | Tâche      |
| --------------------------------- | ----------------------------------------------------------------------- | ----------------- | ----------------------------------------------- | ---------- |
| Vérification d'âge                | Identifier le régime applicable aux 16-18 ans (§7.3)                    | Obligation légale | `User.birthDate`                                | AD-1       |
| Consentement à la diffusion vidéo | Recueillir, journaliser et permettre de révoquer le consentement (§7.1) | Consentement      | `acceptedAt`, `consentTextVersion`, `revokedAt` | AD-3, AD-4 |

Le texte de consentement v1.0 et le projet de CGU sont rédigés par le domaine A
(tâche AD-8). Vous annoncez lire le registre et la CGU côte à côte : la relecture
croisée entre les deux documents est planifiée **vendredi entre 11h00 et 11h30**,
avant l'envoi.

---

## 5. Ce que nous vous demandons de trancher

1. **Les durées de conservation** du §1, à valider ou corriger, avant qu'on
   écrive la purge qui les appliquera.
2. **Le journal de connexion** (§2.8) : le créer, ou acter par écrit qu'il n'y
   en a pas.
3. **L'intégration vidéo par iframe** (§2.3), qui fait sortir de l'image et de
   la voix vers un hébergeur tiers, possiblement hors UE.
4. **La décision automatisée liée au badge** (§2.4), qui conditionne la
   visibilité du candidat auprès des recruteurs.
5. **Le mécanisme d'allocation adossé aux « likes »** décrit au §3 du cahier des
   charges. Il n'est pas dans ce registre parce qu'il n'est pas implémenté, et
   il ne le sera pas sans votre avis écrit. Le détail de notre position :
   `docs/remontees/01-allocation-et-likes.md`.
