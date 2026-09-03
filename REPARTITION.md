# Répartition jusqu'au dépôt

**Référence** : JEB/DNI/2026-003 (version 1.1) · **Révisé le** : jeudi 3 septembre 2026, 9h00
**Base** : état de `feat/demo-ready` au commit `5214fb2`, courriels de Jean-Eudes Berlier (3 sept.
7h15) et de Benjamin Sellami (3 sept. 8h05), par-dessus le courriel de Thomas Vignal et l'addendum de
Florine Pontaillac du 2 septembre 15h40 (CdC §7.9).

| Échéance       | Contenu                                                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Jeu. 12h00** | Remise au Ministre : artefact de build récupérable sur `main`, données de démonstration tenables, prototype documenté, guide, vidéo, plan B.         |
| **Jeu. 12h30** | Deck de huit slides en PDF chez Benjamin, six captures de l'application telle qu'elle tourne ce matin.                                               |
| **Jeu. 13h00** | Journal télévisé, en direct. Nous ne sommes pas sur le plateau ; la vidéo et le plan B y vont à notre place.                                         |
| **Ven. matin** | Présentation devant le cabinet, six minutes, deux voix, répétée une fois.                                                                            |
| **Ven. 12h00** | Dépôt légal (§7.7 + §7.9) : registre, déclaration d'accessibilité, CGU, note critères de filtrage, comptes existants, retrait complet des compteurs. |
| **Ven. 17h00** | Dépôt technique (§8) : schéma et index, Swagger UI, preuves curl, sondes de santé, notes écrites.                                                    |
| **+ 14,25 h**  | Charge ajoutée ce matin par les deux courriels, sur une capacité de 14 h avant 12h30. Détail et arbitrage en section 0.                              |

**État de la recette au moment de cette révision**, vérifié et non déclaré :
build, lint et format verts ; 275 tests API, 95 tests web, 18 tests partagés, tous
passants. La CI construit et teste, mais **ne publie aucun artefact de build** — c'est
la tâche JT-0, et le seul blocage réel de la matinée.

---

## 0. Jeudi 3 septembre — la remise de midi

Deux courriels sont arrivés ce matin. Ils ne modifient pas le produit ; ils
ajoutent une remise à 12h00, une autre à 12h30, et un passage télévisé à 13h00.

**Ce que demande le Ministre (7h15), pour 12h00** : le prototype récupérable par
Thomas depuis la branche par défaut, avec un workflow vert qui publie un
artefact de build et des comptes de démonstration remplis ; des données de
démonstration qui tiennent debout sur **chaque** écran ; un prototype documenté
de deux pages ; un guide d'utilisation numéroté avec une capture par étape ; une
vidéo de moins de trois minutes, sous-titrée et sans musique ; un plan B écrit.

**Ce que demande Benjamin (8h05), pour 12h30** : un deck de huit slides en PDF,
six captures issues de l'application telle qu'elle tourne ce matin, un
recensement chiffré pour la slide 6, et une répétition chronométrée à deux voix
avant la présentation de vendredi.

### L'arithmétique, posée une fois

Le Ministre écrit « une heure de travail, deux au maximum si vous êtes lents ».
Le relevé poste par poste ci-dessous donne **14,25 heures**. Nous sommes quatre,
il est 9h00, la première remise est à 12h00 et la seconde à 12h30 : la capacité
disponible est de **14 heures**.

Cela ne tient que pour deux raisons, et il faut les dire :

1. **Trois pièces sont déjà écrites** — le recensement, le prototype documenté
   et le plan B — ce qui libère 1,75 h.
2. **Rien d'autre ne se fait aujourd'hui.** Tout ce qui était prévu ce jeudi
   pour le dépôt légal de vendredi 12h00 bascule à vendredi matin. C'est écrit
   au §7, et c'est remonté par écrit dans `remontees/03-echeances.md`.

### Les tâches

| ID    | Qui    | Tâche                                                                                                                                                                                                                                                                                                                                            | Échéance  | Preuve à joindre                                                                     | h    |
| ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------ | ---- |
| JT-0  | Ewan   | **Le seul blocage réel.** Fusionner `feat/demo-ready` sur `main`, et ajouter au workflow la publication d'un artefact de build — aujourd'hui la CI construit et teste, mais ne publie que la couverture. Sans cet artefact, la procédure de Thomas n'a rien à récupérer.                                                                         | 10h30     | Exécution verte sur le dernier commit de `main`, artefact téléchargé et décompressé. | 1,5  |
| JT-1  | Ewan   | Recensement chiffré, compté ce matin, en deux colonnes : build propre et machine de développement. Source de la slide 6.                                                                                                                                                                                                                         | 9h30      | `livrables/recensement-du-3-septembre.md` — **fait**.                                | 1    |
| JT-2  | Victor | Remplacer les dix URL de vidéos de démonstration. Elles pointent vers de vrais clips musicaux connus ; `dQw4w9WgXcQ`, intitulé « Présentation en 90 secondes », est le « rickroll ». Sur un plateau, le journaliste clique et une chanson démarre.                                                                                               | 11h00     | Les dix identifiants relus un par un, et la mention de la licence de chacun.         | 1    |
| JT-3  | Marin  | Remplir les écrans que le recensement a trouvés vides : deux décisions de modération journalisées (une validation, un refus motivé), une passation de questionnaire réellement à mi-parcours, un historique pour le second recruteur — ou son retrait des comptes livrés. Masquer le lien « Notifications » aux rôles qui n'en reçoivent aucune. | 11h00     | Les quatorze écrans du §2 du recensement, parcourus un par un.                       | 1,5  |
| JT-4  | Ewan   | Prototype documenté, deux pages, sans jargon : ce qui est fait, ce qui ne l'est pas, ce qui arrive.                                                                                                                                                                                                                                              | 9h30      | `livrables/prototype-documente.md` — **fait**.                                       | 0,5  |
| JT-5  | Adrien | Guide d'utilisation, douze étapes numérotées, **une capture par étape**, prises ce matin sur la version qui part à midi. Si un libellé diffère, corriger le texte, pas la capture.                                                                                                                                                               | 11h30     | Les douze fichiers dans `preuves/guide/`.                                            | 1,5  |
| JT-6  | Ewan   | Plan B d'une demi-page : cinq pannes probables, la conduite à tenir et la phrase à dire.                                                                                                                                                                                                                                                         | 9h30      | `livrables/plan-b-direct.md` — **fait**.                                             | 0,25 |
| JT-7  | Victor | Vidéo de démonstration : tournage, voix, sous-titres, export 1080p horizontal, sans musique, sous les trois minutes. Le script et le fichier `.srt` sont écrits ; il reste la prise. **Ne se tourne qu'après JT-2.**                                                                                                                             | 11h45     | Durée du fichier exporté, et sous-titres lus son coupé.                              | 2    |
| JT-8  | Marin  | Deck de huit slides, PDF, 16:9, trente mots par slide. Slides 3, 6 et 7 en premier — ce sont celles sur lesquelles Benjamin ne transige pas. Six captures dans `preuves/deck/`.                                                                                                                                                                  | 12h30     | Le PDF, et le compte de mots slide par slide.                                        | 2,5  |
| JT-9  | Tous   | Répétition chronométrée, six minutes, deux voix. Une, pas zéro.                                                                                                                                                                                                                                                                                  | jeu. soir | Le chronomètre, et la slide qui a débordé.                                           | 1    |
| JT-10 | Ewan   | Les trois remontées parties **avant 11h00** : les échéances (03), la charte jamais reçue (07), l'artefact qui ne tourne pas sur une tablette (09).                                                                                                                                                                                               | 11h00     | Mails partis, horodatés.                                                             | 0,5  |
| JT-11 | Tous   | Rejouer la procédure de Thomas **depuis un dossier vide** : récupérer l'artefact, installer, migrer, semer, ouvrir les quatorze écrans. Le Ministre l'exige nommément, et c'est la seule vérification qui distingue « ça marche » de « ça marche chez nous ».                                                                                    | 12h00     | Transcription de la session, du `git clone` au premier écran.                        | 1    |

### L'ordre dans lequel ça se fait

`JT-0` d'abord et seul : tant que l'artefact n'existe pas, les dix autres
tâches produisent des pièces qui accompagnent un livrable manquant. Puis `JT-2`
avant `JT-7` — tourner la vidéo sur les mauvaises données obligerait à la
retourner. Puis `JT-3` avant `JT-5` et `JT-8`, pour la même raison : on ne
capture pas un écran qu'on va remplir dans l'heure.

`JT-11` ferme la matinée. S'il échoue, c'est lui qui décide de ce qu'on envoie à
12h00, pas l'horloge.

### Ce que nous ne ferons pas, même pour tenir midi

Trois refus, énoncés maintenant pour ne pas avoir à les improviser à 11h50 :

- **pas de capture retouchée** pour montrer une charte graphique que nous
  n'avons jamais reçue ;
- **pas de chiffre inventé** sur la slide 1 : il sera projeté devant un cabinet
  puis peut-être répété à l'antenne, il lui faut une source publique et datée ;
- **pas de conformité déclarée** sans mesure, y compris sur l'accessibilité.

Chacun de ces trois points est remonté par écrit ce matin, avec la question qui
va avec. Un livrable manquant s'explique ; un livrable faux se découvre en
direct.

---

## 1. Ce que les courriels du 2 septembre ont changé

**Thomas Vignal (matin).** L'arbitrage sur le questionnaire est accepté : c'est un engagement à
implémenter. Les index catalogue et l'authenticité des sorties curl deviennent des critères de recette.

**Florine Pontaillac (15h40).** Trois mesures avant toute démonstration publique, dont **deux qu'elle
qualifie elle-même de bloquantes pour demain** : le blocage des moins de 16 ans et l'état d'attente des
vidéos. Le reste — comptes existants, parcours 16-18, retrait complet des compteurs côté serveur —
tient au vendredi 12h00.

Conséquence de planning : il y a désormais une échéance ce soir, et une démonstration demain que le plan
d'origine ne connaissait pas. Le gel du schéma reste jeudi 18h00, donc **après** la démo.

### Ce que le code fait déjà, et qu'il ne faut pas rouvrir

- **Auth trois rôles**, JWT, `requireRole`, bcrypt 12 tours, rate-limit, Helmet, CORS piloté par variable.
- **`/api/health`** interroge déjà la base et répond 503 quand elle tombe.
- **Questionnaire back** : reprise concurrente sûre (transaction `Serializable`, retry P2034), réponses, scoring pondéré, badge, notification.
- **Espace recruteur** : catalogue, facettes, favoris, interactions, tableaux de bord recruteur et admin.
- **`Video.moderationStatus` vaut déjà `PENDING` par défaut** — l'état d'attente exigé existe en base, il n'y a rien à migrer pour le créer.
- **Aucun compteur d'engagement n'est exposé nulle part.** `CatalogueProfile` renvoie `videoCount`, `certificationScore`, `isFavorite` et `lastContactedAt` — aucune mention « j'aime », aucun compteur de vues public. Le point 3 de Florine est satisfait par construction ; il reste à l'écrire.

### Les trous, dont trois découverts cet après-midi

- **Une vidéo `PENDING` est servie aujourd'hui.** `publishedVideoFilter` vaut `{ not: REJECTED }` : le catalogue renvoie son `previewVideo.url` et la compte dans `videoCount`. C'est exactement ce que l'addendum interdit, et c'est une ligne à changer.
- **Aucun endpoint de modération n'existe**, ni profils ni vidéos : `adminRouter` ne monte que `/dashboard`, alors que `openapi.yaml` documente `/admin/moderation/profiles` et `/admin/profiles/{profileId}/moderate`.
- **`ModerationLog` n'a pas de `videoId`** — il est clé sur `profileId` seul. La trace « qui a décidé et quand » sur une vidéo demande une migration.
- **Tout le domaine B** : aucun contrôleur profils monté dans `app.ts`, alors que le contrat spécifie déjà `/profiles`, `/profiles/me`, `/profiles/{id}/videos` et `/videos/{videoId}`.
- **Pas de page d'inscription** : `App.tsx` n'expose que `/connexion` et l'espace recruteur.
- **Aucune UI de questionnaire**, et **15 questions seedées sur les 100** annoncées.
- **Swagger UI non servi**, et le code **422 n'existe nulle part** — ni dans le code, ni dans le contrat.
- **Ni date de naissance ni consentement en base.**

---

## 2. Mercredi soir — bloquant pour la démonstration _(fait)_

Quatre lignes, trois personnes. **Les quatre sont passées** : elles sont sur
`feat/demo-ready`, avec leurs preuves dans `docs/preuves/`. La section reste ici
parce que le dépôt de vendredi s'appuie sur ces preuves, et qu'une preuve produite
contre un commit qui n'est plus dans `main` se rejoue.

| ID     | Qui    | Tâche                                                                                                                                                                                                                            | Réf    | Preuve à joindre                                                   | h   |
| ------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------ | --- |
| SOIR-1 | Adrien | `User.birthDate`, migration, blocage strict sous 16 ans à l'inscription. Version minimale ce soir : la date et le refus. Le parcours distinct 16-18 suit demain (AD-9).                                                          | §7.9.1 | Inscription refusée à 15 ans, avec le message affiché au candidat. | 2,5 |
| SOIR-2 | Ewan   | `publishedVideoFilter` passe de `{ not: REJECTED }` à `APPROVED`, dans `catalogue.filters.ts`. Une vidéo en attente disparaît alors de `previewVideo`, de `videoCount` et du filtre `hasVideo`. Le défaut `PENDING` existe déjà. | §7.9.2 | Réponse du catalogue avant et après, sur une vidéo en attente.     | 1   |
| SOIR-3 | Ewan   | Preuve d'inaccessibilité telle qu'elle la demande : ouvrir l'adresse directe d'une vidéo en attente en navigation privée. Voir le point 08 de la section 6 — la preuve ne vaut que pour ce que notre serveur expose.             | §7.9.2 | Capture de la fenêtre de navigation privée.                        | 1   |
| SOIR-4 | Victor | Rebase de `origin/7-profils-vidéo-b` sur `main`. Déjà prévu, devient bloquant : aucune route vidéo ne peut naître sans lui, et VI-2/VI-4 doivent naître filtrées sur `APPROVED`, pas être corrigées après.                       | —      | Diff qui n'enlève rien de `main`.                                  | 1,5 |

Marin n'a pas de ligne bloquante ce soir : il avance MA-2, qui est sur le chemin critique de jeudi.

---

## 3. Qui tient quoi

Chaque ligne porte la preuve à joindre, parce que c'est sur les preuves que la recette se fait : une
fonctionnalité sans capture ne compte pas vendredi.

### Ewan — domaine D, contrat d'API, intégration (19,5 h)

| ID     | Tâche                                                                                                                                                                                                                                                                                                                                                                                                 | Réf          | Échéance       | Preuve à joindre                                                 | h   |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------- | ---------------------------------------------------------------- | --- |
| SOIR-2 | Filtre vidéo sur `APPROVED` — voir section 2.                                                                                                                                                                                                                                                                                                                                                         | §7.9.2       | **ce soir**    | Catalogue avant et après.                                        | 1   |
| SOIR-3 | Preuve d'inaccessibilité en navigation privée — voir section 2.                                                                                                                                                                                                                                                                                                                                       | §7.9.2       | **ce soir**    | Capture de la fenêtre privée.                                    | 1   |
| EW-13  | Écran d'administration de modération vidéo : file d'attente, validation, refus avec motif obligatoire, et l'auteur de la décision affiché. Le back est côté Victor (VI-10) ; l'écran vit dans l'espace admin, qui est le domaine D.                                                                                                                                                                   | §7.9.2       | **jeu. matin** | Une vidéo validée et une refusée, avec l'auteur et l'horodatage. | 2,5 |
| EW-1   | Servir Swagger UI sur `/api/docs` à partir de `openapi.yaml`, assets `swagger-ui-dist` embarqués — pas de CDN, la souveraineté vaut aussi pour la doc.                                                                                                                                                                                                                                                | §8.1, §8.3   | jeu. 18h00     | Capture de la page chargée machine déconnectée du réseau.        | 1,5 |
| EW-2   | Trancher le 422. Toute validation sort aujourd'hui en `400 validation_error` ; 422 n'apparaît ni dans `error-handler.ts` ni dans le contrat. Recommandation : ajouter `unprocessable_entity` pour le corps bien formé mais métier-invalide, garder 400 pour le corps malformé.                                                                                                                        | §8.1         | ven. matin     | Contrat et union `ApiErrorCode` mis à jour dans le même commit.  | 2   |
| EW-5   | Index du catalogue : ajouter `certificationScore` et `updatedAt` sur `Profile`, le composite `ProfileSkill(skillId, profileId)`. Surtout, `sector`, `location` et les compétences sont filtrés en `mode: 'insensitive'`, que Prisma traduit en `ILIKE` — les btree `Profile_sector_idx` et `Profile_location_idx` ne servent donc pas. Index fonctionnels `lower(...)` ou normalisation à l'écriture. | mail Thomas  | jeu. 18h00     | `EXPLAIN ANALYZE` avant et après sur les trois critères du mail. | 2   |
| EW-6   | Livrable « schéma de base » : modèle logique, cardinalités, index — produit après les migrations d'Adrien et de Victor, vérifié conforme au SQL réellement appliqué.                                                                                                                                                                                                                                  | §8.2 + mail  | ven. 17h00     | `prisma migrate diff` vide entre schéma et base.                 | 2   |
| EW-7   | Registre de traitement : une ligne par traitement (compte, vidéo, questionnaire, contact recruteur, journal de connexion) avec finalité, base légale, catégories, durée, destinataires et le vrai nom de table et de champ. Ajouter les traitements nés aujourd'hui : date de naissance, consentement, décisions de modération.                                                                       | §7.7.1       | **ven. 12h00** | Chaque ligne pointe une table qui existe dans `schema.prisma`.   | 2,5 |
| EW-8   | Note d'une page sur les critères de filtrage réellement exposés — `q`, `sector`, `location`, `skills`, `certifiedOnly`, `minScore`, `hasVideo`, `sort` — une phrase de justification chacun, et la liste écrite de ceux retirés. Le raisonnement de Florine sur le classement de personnes s'applique directement à `minScore` et à `sort=score`.                                                     | §7.2, §7.9.3 | **ven. 12h00** | Liste alignée sur `catalogue.filters.ts`, pas sur l'intention.   | 1   |
| EW-3   | Rejouer les cinq erreurs 400/401/403/404/422 en `curl -i` contre l'API réellement démarrée, commandes et sorties brutes versionnées dans `docs/preuves/`.                                                                                                                                                                                                                                             | §8.1 + mail  | ven. 17h00     | Sorties in extenso, horodatées, aucune recomposée à la main.     | 1,5 |
| EW-4   | Capturer `/api/health` en 200 puis en 503 après `docker compose stop postgres`.                                                                                                                                                                                                                                                                                                                       | §8.2         | ven. 17h00     | Les deux réponses plus la commande d'arrêt.                      | 0,5 |
| EW-10  | Remontées écrites (section 6), ordre de merge des cinq branches, CI verte avant la démo et avant chaque dépôt.                                                                                                                                                                                                                                                                                        | —            | **ce soir**    | Mails partis ce soir — une réponse met vingt-quatre heures.      | 2   |

### Victor — domaine B, profils et vidéo (19,5 h)

| ID     | Tâche                                                                                                                                                                                                                                                         | Réf     | Échéance       | Preuve à joindre                                         | h   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------------- | -------------------------------------------------------- | --- |
| SOIR-4 | Rebase du domaine B — voir section 2.                                                                                                                                                                                                                         | —       | **ce soir**    | Diff qui n'enlève rien de `main`.                        | 1,5 |
| VI-10  | API de modération vidéo : `GET /admin/moderation/videos`, `POST /admin/videos/{id}/moderate` avec motif obligatoire, et `ModerationLog.videoId` en migration — le journal est aujourd'hui clé sur `profileId` seul, il ne peut pas tracer une décision vidéo. | §7.9.2  | **jeu. matin** | Ligne de journal avec l'admin, l'action et l'horodatage. | 3   |
| VI-2   | Contrôleur et routes profils, montés dans `app.ts` : `GET /profiles` et `GET /profiles/{id}` publics, `GET` et `PATCH /profiles/me` authentifiés. Contrat déjà écrit, lignes 780 à 898. Vidéos filtrées sur `APPROVED` dès la première version.               | contrat | jeu. 12h00     | Réponses conformes au contrat, sans champ en trop.       | 4   |
| VI-9   | Exclusion des profils de mineurs du feed public et de la fiche publique — la mesure vise le catalogue consultable sans compte recruteur, donc `GET /profiles`, pas `/recruiter/catalogue` qui est déjà gardé par rôle. Dépend de SOIR-1.                      | §7.9.1  | jeu. 18h00     | Profil de test de 17 ans absent du feed public.          | 1   |
| VI-3   | Pagination serveur à 20 par page via `resolvePageRequest`, page hors bornes rendue en résultat vide propre, réponse portant total, page et taille.                                                                                                            | §8.6    | jeu. 12h00     | `curl "/api/profiles?page=9999"` → 200 et `data: []`.    | 1   |
| VI-4   | Vidéos : `POST /profiles/{id}/videos` et `DELETE /videos/{id}`, embed iframe YouTube et Vimeo — `utils/embed.ts` existe déjà côté web et est testé. Toute vidéo créée naît en `PENDING`.                                                                      | §4.2    | jeu. 18h00     | Aperçu rendu sans quitter la page profil.                | 2,5 |
| VI-5   | Feed web : un seul flux actif à la fois, l'autoplay ne vaut que pour la vidéo focalisée.                                                                                                                                                                      | §8.6    | ven. 12h00     | Deux cartes visibles, une seule qui joue.                | 3   |
| VI-6   | Page profil public — l'un des trois écrans audités, donc livrée au clavier et avec un focus visible dès le premier jet.                                                                                                                                       | §7.4    | ven. 12h00     | Parcours clavier complet sans souris.                    | 2,5 |
| VI-7   | Sous-titres : au moins une vidéo de démonstration dont la piste est réellement rendue par le lecteur, pas seulement présente comme fichier.                                                                                                                   | §7.5    | ven. 12h00     | Capture du sous-titre affiché à l'écran.                 | 1   |

### Marin — domaine C, questionnaire, et les notes écrites (17,5 h)

| ID    | Tâche                                                                                                                                                                                                                                                           | Réf          | Échéance   | Preuve à joindre                                                                                            | h   |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------- | ----------------------------------------------------------------------------------------------------------- | --- |
| MA-2  | Modifier une question active invalide les tentatives `IN_PROGRESS`, purge leurs `Answer`, passe la tentative en `ABANDONED` et notifie le candidat via `services/notifications.ts` — jamais un `prisma.notification.create` en direct.                          | §8.4 + mail  | jeu. 18h00 | Test d'intégration : réponse enregistrée, question modifiée, tentative invalidée et zéro `Answer` restante. | 3   |
| MA-4  | Écran de passation : une question à la fois, enregistrement à chaque réponse, réouverture sur la question suivante. Rien en `localStorage` — la reprise vit en base.                                                                                            | §8.4         | ven. 12h00 | —                                                                                                           | 5   |
| MA-11 | Motif de refus d'une vidéo visible par le candidat dans son espace. « Une vidéo qui disparaît sans explication est un contentieux qui commence » — l'écran fait partie de la mesure, pas de son habillage.                                                      | §7.9.2       | jeu. 18h00 | Motif affiché côté candidat, pas seulement en base.                                                         | 1,5 |
| MA-1  | Porter le seed de 15 à 100 questions actives. Coupé à la version générée : 85 items produits par script sur les trois aptitudes existantes, puis relus. Identifiants déterministes pour que l'upsert reste idempotent.                                          | §2.2, §5     | jeu. 18h00 | `count(*)` sur `CertificationQuestion` active = 100.                                                        | 1,5 |
| MA-12 | Dates de naissance dans le seed. Florine cite nommément les comptes de démonstration : un blocage à l'inscription qui laisse passer les profils déjà en base ne protège personne. Inclure un compte de 17 ans pour démontrer VI-9.                              | §7.9.1       | jeu. 18h00 | Seed rejoué, aucun compte sans date.                                                                        | 1   |
| MA-10 | Note vidéo unique : embed iframe sans upload direct (plafond 100 Mo, vérification de type par contenu, répertoire de stockage, upload interrompu — même quand la réponse est « sans objet ») **et** la limite d'inaccessibilité des liens externes du point 08. | §8.5, §7.9.2 | ven. 12h00 | Décision datée, pas un silence.                                                                             | 1,5 |
| MA-9  | Note écrite sur les compteurs d'engagement : aucun n'est exposé, ni « j'aime » ni vues, ni dans la page ni dans la réponse d'API. Joindre la liste des champs de `CatalogueProfile` comme preuve. C'est aussi la réponse au point 02.                           | §7.9.3       | ven. 12h00 | La DTO elle-même, citée.                                                                                    | 0,5 |
| MA-8  | Note de déploiement d'une page : hébergement cible, ressources, données sortantes et vers qui.                                                                                                                                                                  | §8.3         | ven. 17h00 | —                                                                                                           | 1   |
| MA-5  | Preuve de reprise : répondre, `docker compose restart api`, rouvrir — même tentative, mêmes réponses.                                                                                                                                                           | §8.4         | ven. 17h00 | Captures avant et après redémarrage serveur.                                                                | 1   |
| MA-3  | Justification écrite en trois lignes de l'invalidation de session.                                                                                                                                                                                              | §8.4         | ven. 17h00 | —                                                                                                           | 0,5 |
| MA-7  | Message candidat pour la session invalidée. Le mail de Thomas conditionne l'arbitrage à un candidat « proprement informé ».                                                                                                                                     | mail Thomas  | ven. 12h00 | Écran visible pendant la démo.                                                                              | 1   |

### Adrien — domaine A, auth, mineurs, consentement, accessibilité (20 h)

| ID     | Tâche                                                                                                                                                                                                                                                    | Réf          | Échéance       | Preuve à joindre                                            | h   |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------- | ----------------------------------------------------------- | --- |
| SOIR-1 | Date de naissance et blocage sous 16 ans — voir section 2.                                                                                                                                                                                               | §7.9.1       | **ce soir**    | Inscription refusée à 15 ans, message compris.              | 2,5 |
| AD-3   | Modèle de consentement vidéo : `acceptedAt`, `consentTextVersion`, `revokedAt`, écrit à la publication d'une vidéo. Un consentement journalisé, pas une case cochée. Migration à passer avec celle de Victor pour ne pas fragmenter le gel.              | §7.1         | **jeu. 12h00** | Ligne en base avec la version du texte acceptée.            | 3   |
| AD-9   | Parcours distinct 16-18 ans : mention d'information adaptée, et **pas de vidéo publique par défaut** — la vidéo d'un mineur reste privée même une fois la modération passée, sauf action explicite.                                                      | §7.9.1       | jeu. 18h00     | Compte de 17 ans : vidéo validée, profil non public.        | 2   |
| AD-5   | Page d'inscription web. Elle n'existe pas aujourd'hui, et c'est l'un des trois écrans audités : elle porte la date de naissance, la mention 16-18 et le consentement.                                                                                    | §7.3, §7.4   | jeu. 18h00     | —                                                           | 3   |
| AD-4   | Révocation à effet réel. En embed iframe il n'y a aucun fichier à supprimer : la preuve « répertoire avant et après » ne s'applique pas telle quelle. Supprimer la ligne `Video`, horodater `revokedAt`, et l'écrire plutôt que de laisser un trou.      | §7.1         | **ven. 12h00** | État de la base avant et après, plus la note d'explication. | 2   |
| AD-6   | RGAA AA sur les trois écrans imposés — inscription, profil public, catalogue recruteur : navigation clavier complète, focus visible en permanence, ratios de contraste mesurés paire par paire. Chaque propriétaire corrige son écran, Adrien consolide. | §7.4         | **ven. 12h00** | Tableau des ratios mesurés, pas estimés.                    | 3,5 |
| AD-8   | Texte de consentement v1.0 et projet de CGU, cohérents avec le registre d'EW-7 — Florine annonce qu'elle lira les deux côte à côte et demandera lequel se trompe s'ils divergent. Y intégrer la mention 16-18 et la modération a priori.                 | §7.6, §7.7.3 | **ven. 12h00** | Relecture croisée avec EW-7 avant envoi.                    | 2,5 |
| AD-7   | Déclaration d'accessibilité, partielle et exacte. Annoncer un niveau que la vérification ne soutient pas engage Florine personnellement : on déclare ce qui a été testé, et rien de plus.                                                                | §7.4         | **ven. 12h00** | —                                                           | 1   |
| AD-2   | Note sur les comptes déjà créés sans date de naissance. Le seed est traité par MA-12 ; la note dit ce qu'il advient d'un compte réel — recommandation : blocage à la prochaine connexion tant que la date n'est pas fournie.                             | §7.9.1       | **ven. 12h00** | —                                                           | 0,5 |

---

## 4. Séquence

**Jeudi 3 septembre, 9h00 – 12h30 — la remise de midi.**
La matinée entière y passe, dans l'ordre du §0 : l'artefact d'abord (JT-0), les données
ensuite (JT-2, JT-3), les pièces écrites et les captures par-dessus, la recette depuis un
dossier vide en dernier (JT-11). Les remontées partent avant 11h00. **Rien d'autre ne se
fait aujourd'hui** — voir §7.

**Jeudi 3 septembre, 13h00 — journal télévisé.** Hors de notre main. Ce qui y va, c'est
l'artefact, le guide, la vidéo et le plan B.

**Jeudi 3 septembre, 18h00 — GEL du schéma.** Inchangé, et tenable : les deux migrations
attendues (consentement, `ModerationLog.videoId`) sont passées. Le gel ne dépend plus de
la matinée.

**Mercredi 2 septembre, ce soir — les deux bloquants** _(fait)_**.**
SOIR-1 à SOIR-4 dans `main` avant la fin de soirée. Ewan envoie les remontées écrites ce soir : une
réponse de Florine met vingt-quatre heures, et deux des huit points de la section 6 conditionnent ce
qu'on montre demain.

**Jeudi 3 septembre, matin — démonstration, puis modération.**
La démo passe sur ce qui a été mergé cette nuit. Dans la foulée : VI-10 et EW-13, l'API et l'écran de
modération — Florine les attend « avant toute démonstration publique », l'état d'attente suffit pour
celle de demain mais pas pour la suivante.

**Jeudi 3 septembre, midi — les migrations mergées.**
Consentement (AD-3) et `ModerationLog.videoId` (VI-10) dans `main`, avec la date de naissance déjà
passée hier soir. En parallèle, les routes profils répondent et la pagination est vérifiée hors bornes.

**Jeudi 3 septembre, 18h00 — GEL. Plus aucune migration après ce point.**
Ce que la base contient à 18h00 est ce que le document de vendredi décrira. Ewan pose les index et
mesure l'`EXPLAIN ANALYZE` juste après le gel.

**Vendredi 4 septembre, matin — front et pièces légales.**
Feed, profil public, passation, motif de refus côté candidat. Le dossier de Florine se relit à quatre
yeux entre 11h00 et 11h30 — registre et CGU côte à côte, comme elle les lira.

**Vendredi 4 septembre, 12h00 — DÉPÔT LÉGAL.**
Registre, déclaration d'accessibilité, CGU, note critères de filtrage, note comptes existants, note
compteurs d'engagement, note vidéo.

**Vendredi 4 septembre, après-midi — campagne de preuves.**
Les curl, les deux réponses de la sonde de santé, la reprise après redémarrage, le sous-titre affiché.
Rien n'est reconstitué : Thomas insiste sur des sorties issues de requêtes réellement exécutées.

**Vendredi 4 septembre, 17h00 — DÉPÔT TECHNIQUE.**
Schéma et index avec `EXPLAIN`, Swagger UI, preuves d'erreurs, sondes, notes déploiement et
questionnaire.

---

## 5. Chemin critique

```
JT-0                 →   JT-2 · JT-3       →   JT-5 · JT-7 · JT-8   →   JT-11
artefact publié          données de             guide, vidéo, deck       recette depuis
et `main` verte          démonstration          — on ne capture pas      un dossier vide
                         tenables               un écran qu'on va
                                                remplir dans l'heure

SOIR-1               →   VI-9              →   démo jeu. matin
date de naissance        mineurs hors           blocage <16 ans démontrable
et blocage <16           feed public

SOIR-2 · SOIR-3      →   VI-10 · EW-13     →   MA-11
vidéos en attente        API et écran           motif visible par
invisibles               de modération          le candidat

AD-3 · VI-10         →   EW-5              →   gel jeu. 18h00   →   EW-6
migrations               index et EXPLAIN       base figée           livrable schéma
consentement et
journal vidéo

SOIR-4               →   VI-2 · VI-3       →   VI-5 · VI-6      →   AD-6
rebase domaine B         routes profils         feed et profil       audit RGAA
                                                public
```

L'audit d'accessibilité ne peut pas auditer un écran qui n'existe pas : deux des trois écrans imposés
sont produits jeudi et vendredi matin. C'est pourquoi VI-6 et AD-5 sortent avec le clavier et le focus
déjà traités, plutôt qu'en repasse.

---

## 6. À faire trancher par écrit

### 01 — Le calcul d'allocation à partir des likes (§3) n'est pas planifié

Conditionner le montant d'une allocation chômage au nombre de likes reçus, en le tenant hors de
l'interface et de la documentation publique, c'est une décision automatisée qui affecte des droits
sociaux, prise sans que la personne concernée puisse la connaître ni la contester. Le cahier des charges
reconnaît lui-même que Florine ne l'a pas validée.

**L'addendum du 2 septembre n'en dit rien.** Ce silence n'est pas un accord : elle écrit sur l'affichage
public des compteurs, pas sur l'usage du compte dans un calcul d'allocation, qu'elle ignore
probablement. La question se pose telle quelle, ce soir, en copie Thomas : sur quelle base juridique, et
avec quelle information des candidats.

> **Bloqué en attente d'un écrit de Florine Pontaillac.**

### 02 — L'affichage des compteurs — tranché par Florine

Le point est clos côté produit : aucun compteur d'engagement n'est exposé aujourd'hui, ni dans la page
ni dans la réponse d'API, et il n'en sera pas ajouté. Cela annule le livrable de semaine 2 « compteur
visible sur le frontend » (§5) et contraint §2.1, §2.3 et §6. Ce qui reste : l'écrire (MA-9), et
prévenir le cabinet que la directive du Ministre sur les likes centraux est désormais en conflit direct
avec une exigence de la conseillère juridique.

> **Aucun compteur à retirer, attestation écrite à fournir vendredi 12h00.**

### 03 — Les échéances

Trois horaires cohabitent : la démonstration de demain, dont **l'heure n'est pas confirmée** — l'annotation
du Ministre dans §5 dit « jeudi matin », on planifie là-dessus ; le dépôt légal de vendredi 12h00 ; le
dépôt technique de vendredi 17h00. Le courriel de Thomas annonçait « l'ensemble des livrables » à 17h00,
ce qui ne peut pas valoir pour les pièces de Florine.

> **Heure de la démo à confirmer ce soir. Dépôt légal tenu à 12h00.**

### 04 — Les vidéos déjà consultées par un recruteur

Florine demande explicitement qu'on choisisse, sans imposer la réponse. **Recommandation : les basculer
en attente comme les autres, sans toucher à l'historique d'interaction.** Retirer les `Interaction`
déjà écrites falsifierait une trace d'audit dont le seul intérêt est d'être fidèle ; laisser la vidéo
visible viderait la mesure de son sens. Le recruteur qui l'avait consultée voit la fiche sans la vidéo,
et rien ne lui est retiré de son historique.

> **À écrire en trois lignes dans la note MA-10.**

### 05 — Une vidéo en lien externe ne peut pas être rendue inaccessible

C'est le point le plus délicat de l'addendum. Florine demande qu'une vidéo en attente ne soit
« accessible par aucun moyen », preuve en navigation privée à l'appui. Pour un `EXTERNAL_LINK`
YouTube ou Vimeo, la vidéo est déjà publique chez l'hébergeur : **nous maîtrisons la divulgation de
l'adresse, pas l'existence du contenu.** SOIR-2 et SOIR-3 prouvent que notre API ne renvoie plus l'URL
et qu'aucune de nos routes ne la sert — c'est tout ce qu'un embed permet de garantir.

Le dire par écrit, plutôt que de produire une capture qui laisserait croire à davantage. Si elle exige
l'inaccessibilité réelle, il faut soit n'accepter que des liens non répertoriés, soit passer à l'upload
local — ce qui rouvre §8.5 en entier et ne tient pas dans la semaine.

> **Limite à déclarer par écrit ce soir, avant la démo.**

### 06 — Le renommage en JibJob

Le dépôt, les paquets `@profils-actifs/*`, la base et les comptes de démonstration portent
ProfilsActifs. Renommer avant vendredi casse les imports pour un gain nul en recette. Proposition :
nom technique inchangé, affichage produit renommé, alignement complet la semaine prochaine.

> **Renommage d'affichage seulement.**

### 07 — La charte de la Direction de la communication (§4.3)

Annoncée obligatoire et prioritaire sur la direction TikTok, jamais reçue. À relancer auprès de Benjamin
Sellami. Sans elle, l'interface reste sobre : partir sur un clone TikTok maintenant, c'est le refaire à
la réception.

> **Relance à envoyer, interface sobre par défaut.**

### 08 — Les tests de charge (§8.7)

Annoncés pour la revue technique de la semaine prochaine, périmètre non fourni. On demande le périmètre
plutôt que d'improviser un chiffre qu'il faudrait défendre.

> **Périmètre à demander, hors dépôt de vendredi.**

---

## 7. Ce qui est coupé

Les mesures de l'addendum ajoutent quatorze heures à un plan qui en comptait soixante-quatre. Les coupes
ci-dessous ne sont plus conditionnelles : elles sont appliquées dans les charges de la section 3.

1. **Les 85 questions manquantes passent en génération scriptée puis relecture** — 1,5 h au lieu de 4. Les cent questions sont une exigence du Ministre sans portée juridique ; les mesures de Florine bloquent une démonstration publique. L'arbitrage se fait tout seul.
2. **L'écran de résultat dédié du questionnaire est abandonné.** Le badge s'affiche sur le profil, ce qui suffit à démontrer le scoring.
3. **L'édition du profil côté candidat reste une API sans écran.** `PATCH /profiles/me` répond, le seed alimente la démo.
4. **Les tris secondaires du feed sautent.** `sort=name` et les affinages d'ordre ; le tri par défaut suffit à démontrer la pagination serveur.

5. **Toute la journée de jeudi bascule à vendredi matin.** EW-13, MA-11, AD-9, AD-5 et AD-6 étaient
   prévus aujourd'hui ; ils se font vendredi entre 8h00 et 12h00, ou pas. C'est le coût direct de la
   remise de midi, et il est chiffré : 14,25 h ajoutées sur une capacité de 14 h.
6. **La répétition du deck se fait jeudi soir, pas vendredi matin.** Vendredi matin est déjà pris par
   les pièces de Florine, et Benjamin demande une répétition, pas zéro.
7. **Le guide d'utilisation s'arrête à douze étapes.** Douze captures cohérentes valent mieux que
   vingt prises à la hâte : le Ministre lira ces phrases à l'antenne, et une étape fausse lui coûte
   plus qu'une étape absente.

**Ne se coupent pas** : les pièces du vendredi 12h00, qui engagent juridiquement le ministère ; tout
ce qui porte une preuve ; et les trois refus du §0 — pas de capture retouchée, pas de chiffre inventé,
pas de conformité déclarée sans mesure. Une preuve manquante se voit ; une fonctionnalité manquante
s'explique ; un livrable faux se découvre en direct à 13h00.
