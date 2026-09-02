# Répartition jusqu'au dépôt

**Référence** : JEB/DNI/2026-003 (version 1.1) · **Émis le** : mercredi 2 septembre 2026
**Base** : état de `main` au commit `eb72ba6`, cahier des charges consolidé, courriel de Thomas Vignal du 2 septembre.

Deux jours et demi, quatre personnes, deux dépôts distincts le même vendredi. Chaque tâche pointe un
fichier qui existe ou un trou qui se voit.

| Échéance        | Contenu                                                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Ven. 12h00**  | Dépôt légal — Florine Pontaillac (§7.7) : registre de traitement, déclaration d'accessibilité, projet de CGU, note critères de filtrage. |
| **Ven. 17h00**  | Dépôt technique — Thomas Vignal (§8 + mail) : schéma et index, Swagger UI, preuves curl, sondes de santé, notes écrites.                 |
| **64 h / 80 h** | Charge planifiée pour heures ouvrées cumulées. La marge tient tant que les migrations passent jeudi midi.                                |

---

## 1. Ce que le mail change

L'arbitrage sur le questionnaire est accepté : c'est désormais un engagement à implémenter, pas une
hypothèse. Les index catalogue et l'authenticité des sorties curl deviennent des critères de recette
explicites. En revanche « l'ensemble de vos livrables vendredi à 17h00 » ne peut pas s'appliquer aux
quatre pièces de Florine, dues à 12h00 — on planifie sur 12h00 et on fait confirmer.

### Acquis, à ne pas rouvrir

- **Auth trois rôles**, JWT, `requireRole`, bcrypt 12 tours, rate-limit, Helmet, CORS piloté par variable.
- **`/api/health`** interroge déjà la base et répond 503 quand elle tombe.
- **Questionnaire back** : reprise concurrente sûre (transaction `Serializable`, retry P2034), réponses, scoring pondéré, badge, notification.
- **Espace recruteur** : catalogue, facettes, favoris, interactions, tableaux de bord recruteur et admin, front compris.
- **Chemin d'erreur unique** et pagination plafonnée à 20 dans `@profils-actifs/shared`.

### Trous ouverts au 2 septembre

- **Tout le domaine B** : aucun contrôleur profils, rien de monté dans `app.ts`, alors que `openapi.yaml` documente déjà `/profiles`, `/profiles/me`, `/profiles/{id}/videos` et `/videos/{videoId}`.
- **Pas de page d'inscription** : `App.tsx` n'expose que `/connexion` et l'espace recruteur.
- **Aucune UI de questionnaire**, et **15 questions seedées sur les 100** annoncées.
- **Swagger UI non servi**, et le code **422 n'existe nulle part** — ni dans le code, ni dans le contrat.
- **Ni date de naissance ni consentement en base** : deux exigences légales qui se paient en migration.

---

## 2. Qui tient quoi

Chaque ligne porte la preuve à joindre, parce que c'est sur les preuves que la recette se fait : une
fonctionnalité sans capture ne compte pas vendredi.

### Ewan — domaine D, contrat d'API, intégration (16 h)

| ID    | Tâche                                                                                                                                                                                                                                                                                                                                                                                                                                  | Réf         | Échéance       | Preuve à joindre                                                 | h   |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------- | ---------------------------------------------------------------- | --- |
| EW-1  | Servir Swagger UI sur `/api/docs` à partir de `packages/api/openapi.yaml`, avec les assets `swagger-ui-dist` embarqués — pas de CDN, la contrainte de souveraineté vaut aussi pour la doc.                                                                                                                                                                                                                                             | §8.1, §8.3  | jeu. 18h00     | Capture de la page chargée machine déconnectée du réseau.        | 1,5 |
| EW-2  | Trancher le 422. Aujourd'hui toute validation sort en `400 validation_error` ; 422 n'apparaît ni dans `error-handler.ts` ni dans le contrat. Recommandation : ajouter `unprocessable_entity` pour le corps bien formé mais métier-invalide (réponse envoyée sur une question hors tentative) et garder 400 pour le corps malformé.                                                                                                     | §8.1        | jeu. 18h00     | Contrat et union `ApiErrorCode` mis à jour dans le même commit.  | 2   |
| EW-3  | Rejouer les cinq erreurs 400/401/403/404/422 en `curl -i` contre l'API réellement démarrée, commandes et sorties brutes versionnées dans `docs/preuves/`.                                                                                                                                                                                                                                                                              | §8.1 + mail | ven. 17h00     | Sorties in extenso, horodatées, aucune recomposée à la main.     | 1,5 |
| EW-4  | Capturer `/api/health` en 200 puis en 503 après `docker compose stop postgres`.                                                                                                                                                                                                                                                                                                                                                        | §8.2        | ven. 17h00     | Les deux réponses plus la commande d'arrêt.                      | 0,5 |
| EW-5  | Index du catalogue. Ajouter `certificationScore` et `updatedAt` sur `Profile`, le composite `ProfileSkill(skillId, profileId)`. Surtout : `sector`, `location` et les compétences sont filtrés en `mode: 'insensitive'`, que Prisma traduit en `ILIKE` — les btree `Profile_sector_idx` et `Profile_location_idx` ne sont donc pas utilisés. Trancher entre index fonctionnels `lower(...)` en SQL brut et normalisation à l'écriture. | mail        | jeu. 18h00     | `EXPLAIN ANALYZE` avant et après sur les trois critères du mail. | 2   |
| EW-6  | Livrable « schéma de base » : modèle logique, cardinalités, liste des index — produit _après_ les migrations d'Adrien et vérifié conforme au SQL réellement appliqué.                                                                                                                                                                                                                                                                  | §8.2 + mail | ven. 17h00     | `prisma migrate diff` vide entre schéma et base.                 | 2   |
| EW-7  | Registre de traitement : une ligne par traitement (compte, vidéo, questionnaire, contact recruteur, journal de connexion) avec finalité, base légale, catégories, durée de conservation, destinataires et le vrai nom de table et de champ.                                                                                                                                                                                            | §7.7.1      | **ven. 12h00** | Chaque ligne pointe une table qui existe dans `schema.prisma`.   | 2,5 |
| EW-8  | Note d'une page sur les critères de filtrage réellement exposés — `q`, `sector`, `location`, `skills`, `certifiedOnly`, `minScore`, `hasVideo`, `sort` — une phrase de justification professionnelle chacun, et la liste écrite de ceux retirés.                                                                                                                                                                                       | §7.2        | **ven. 12h00** | Liste alignée sur `catalogue.filters.ts`, pas sur l'intention.   | 1   |
| EW-9  | Note de déploiement d'une page : hébergement cible, ressources nécessaires, données sortantes et vers qui.                                                                                                                                                                                                                                                                                                                             | §8.3        | ven. 17h00     | —                                                                | 1   |
| EW-10 | Remontées écrites (section 5), ordre de merge des quatre branches, CI verte avant chaque dépôt.                                                                                                                                                                                                                                                                                                                                        | —           | **mer. 18h00** | Mails partis aujourd'hui — une réponse met vingt-quatre heures.  | 2   |

### Victor — domaine B, profils et vidéo (16,5 h)

| ID   | Tâche                                                                                                                                                                                                                                                                               | Réf     | Échéance       | Preuve à joindre                                      | h   |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------------- | ----------------------------------------------------- | --- |
| VI-1 | Rebaser `origin/7-profils-vidéo-b` sur `main`. La branche porte déjà `profile.service.ts`, les validateurs et les DTO partagés, mais elle date d'avant la refonte des erreurs et de la pagination : fusionnée telle quelle, son diff supprime le catalogue et les tableaux de bord. | —       | **mer. 18h00** | Diff qui n'enlève rien de `main`.                     | 1,5 |
| VI-2 | Contrôleur et routes profils, montés dans `app.ts` : `GET /profiles` et `GET /profiles/{id}` publics, `GET` et `PATCH /profiles/me` authentifiés. Le contrat est déjà écrit, lignes 780 à 898.                                                                                      | contrat | jeu. 12h00     | Réponses conformes au contrat, sans champ en trop.    | 4   |
| VI-3 | Pagination serveur à 20 par page via `resolvePageRequest`, page hors bornes rendue en résultat vide propre, réponse portant total, page et taille.                                                                                                                                  | §8.6    | jeu. 12h00     | `curl "/api/profiles?page=9999"` → 200 et `data: []`. | 1   |
| VI-4 | Vidéos : `POST /profiles/{id}/videos` et `DELETE /videos/{id}`, embed iframe YouTube et Vimeo — `utils/embed.ts` existe déjà côté web et est testé.                                                                                                                                 | §4.2    | jeu. 18h00     | Aperçu rendu sans quitter la page profil.             | 2,5 |
| VI-5 | Feed web : un seul flux actif à la fois, l'autoplay ne vaut que pour la vidéo focalisée.                                                                                                                                                                                            | §8.6    | ven. 12h00     | Deux cartes visibles, une seule qui joue.             | 3   |
| VI-6 | Page profil public — l'un des trois écrans audités, donc livrée au clavier et avec un focus visible dès le premier jet.                                                                                                                                                             | §7.4    | ven. 12h00     | Parcours clavier complet sans souris.                 | 2,5 |
| VI-7 | Sous-titres : au moins une vidéo de démonstration dont la piste est réellement rendue par le lecteur, pas seulement présente comme fichier.                                                                                                                                         | §7.5    | ven. 12h00     | Capture du sous-titre affiché à l'écran.              | 1   |
| VI-8 | Note écrite « embed iframe uniquement, pas d'upload direct » : ce que ce choix vaut pour le plafond de 100 Mo, la vérification de type par contenu, le répertoire de stockage et l'upload interrompu. Les trois cas doivent être adressés même quand la réponse est « sans objet ». | §8.5    | ven. 17h00     | Décision datée, pas un silence.                       | 1   |

### Marin — domaine C, questionnaire (16 h)

| ID   | Tâche                                                                                                                                                                                                                                                                             | Réf         | Échéance   | Preuve à joindre                                                                                            | h   |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------- | ----------------------------------------------------------------------------------------------------------- | --- |
| MA-1 | Porter le seed de 15 à 100 questions actives — 85 à écrire, pondérations et `maxPoints` cohérents avec le barème déjà en place, identifiants déterministes pour que l'upsert reste idempotent.                                                                                    | §2.2, §5    | jeu. 18h00 | `count(*)` sur `CertificationQuestion` active = 100.                                                        | 4   |
| MA-2 | Implémenter l'arbitrage accepté par mail : modifier une question active invalide les tentatives `IN_PROGRESS`, purge leurs `Answer`, passe la tentative en `ABANDONED` et notifie le candidat via `services/notifications.ts` — jamais un `prisma.notification.create` en direct. | §8.4 + mail | jeu. 18h00 | Test d'intégration : réponse enregistrée, question modifiée, tentative invalidée et zéro `Answer` restante. | 3   |
| MA-3 | Justification écrite en trois lignes du choix ci-dessus, telle que demandée.                                                                                                                                                                                                      | §8.4        | ven. 17h00 | —                                                                                                           | 0,5 |
| MA-4 | Écran de passation : une question à la fois, enregistrement à chaque réponse, réouverture sur la question suivante. Rien en `localStorage` — la reprise vit en base.                                                                                                              | §8.4        | ven. 12h00 | —                                                                                                           | 5   |
| MA-5 | Preuve de reprise : répondre, `docker compose restart api`, rouvrir — même tentative, mêmes réponses.                                                                                                                                                                             | §8.4        | ven. 17h00 | Captures avant et après redémarrage serveur.                                                                | 1   |
| MA-6 | Écran de résultat et badge affiché sur le profil, à partir de la bande `CertificationLevel` résolue côté serveur.                                                                                                                                                                 | §2.1        | ven. 12h00 | Score jamais calculé côté client.                                                                           | 1,5 |
| MA-7 | Message candidat pour la session invalidée. Le mail conditionne l'arbitrage à un candidat « proprement informé » : sans cet écran, l'engagement n'est pas tenu.                                                                                                                   | mail        | ven. 12h00 | Écran visible pendant la démo.                                                                              | 1   |

### Adrien — domaine A, auth, consentement, accessibilité (18 h)

| ID   | Tâche                                                                                                                                                                                                                                                    | Réf          | Échéance       | Preuve à joindre                                            | h   |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------- | ----------------------------------------------------------- | --- |
| AD-1 | `User.birthDate`, migration, et vérification d'âge à l'inscription — le régime des 16-18 ans ne se traite pas après coup.                                                                                                                                | §7.3         | **jeu. 12h00** | Migration appliquée, inscription refusée sans date.         | 2,5 |
| AD-2 | Note de deux lignes sur les comptes déjà créés sans date de naissance, comptes de seed compris — Florine les cite nommément.                                                                                                                             | §7.3         | **ven. 12h00** | —                                                           | 0,5 |
| AD-3 | Modèle de consentement vidéo : `acceptedAt`, `consentTextVersion`, `revokedAt`, écrit à la publication d'une vidéo. Un consentement journalisé, pas une case cochée.                                                                                     | §7.1         | **jeu. 12h00** | Ligne visible en base avec la version du texte acceptée.    | 3   |
| AD-4 | Révocation à effet réel. En embed iframe il n'y a aucun fichier à supprimer : la preuve « répertoire de stockage avant et après » ne s'applique pas telle quelle. Supprimer la ligne `Video`, horodater `revokedAt`, et l'écrire noir sur blanc.         | §7.1         | **ven. 12h00** | État de la base avant et après, plus la note d'explication. | 2   |
| AD-5 | Page d'inscription web. Elle n'existe pas aujourd'hui — et c'est l'un des trois écrans audités, donc elle porte le contrôle d'âge et le consentement.                                                                                                    | §7.3, §7.4   | jeu. 18h00     | —                                                           | 3   |
| AD-6 | RGAA AA sur les trois écrans imposés — inscription, profil public, catalogue recruteur : navigation clavier complète, focus visible en permanence, ratios de contraste mesurés paire par paire. Chaque propriétaire corrige son écran, Adrien consolide. | §7.4         | **ven. 12h00** | Tableau des ratios mesurés, pas estimés.                    | 3,5 |
| AD-7 | Déclaration d'accessibilité, partielle et exacte. Annoncer un niveau que la vérification ne soutient pas engage Florine personnellement : on déclare ce qui a été testé, et rien de plus.                                                                | §7.4         | **ven. 12h00** | —                                                           | 1   |
| AD-8 | Texte de consentement v1.0 et projet de CGU, cohérents avec le registre d'EW-7 — Florine annonce qu'elle lira les deux côte à côte et demandera lequel se trompe s'ils divergent.                                                                        | §7.6, §7.7.3 | **ven. 12h00** | Relecture croisée avec EW-7 avant envoi.                    | 2,5 |

---

## 3. Séquence

**Mercredi 2 septembre, après-midi — débloquer, puis écrire.**
Victor rebase le domaine B ; tout le reste de sa file en dépend. Ewan envoie les remontées écrites
aujourd'hui : une réponse de Florine ou de Thomas met vingt-quatre heures, jeudi c'est déjà trop tard.
Adrien démarre les deux migrations.

**Jeudi 3 septembre, matin — les migrations mergées à midi.**
Date de naissance et consentement dans `main`, sinon le livrable schéma de vendredi glisse
mécaniquement. En parallèle, les routes profils répondent et la pagination est vérifiée hors bornes.

**Jeudi 3 septembre, 18h00 — GEL. Plus aucune migration après ce point.**
Ce que la base contient à 18h00 est ce que le document de vendredi décrira. Ewan pose les index et
mesure l'`EXPLAIN ANALYZE` juste après le gel ; Marin ferme le seed à 100 questions et l'invalidation
de session.

**Vendredi 4 septembre, matin — front et pièces légales.**
Feed, profil public, passation, badge. Le dossier de Florine se relit à quatre yeux entre 11h00 et
11h30 — registre et CGU côte à côte, comme elle les lira.

**Vendredi 4 septembre, 12h00 — DÉPÔT LÉGAL.**
Registre de traitement, déclaration d'accessibilité, projet de CGU, note critères de filtrage.

**Vendredi 4 septembre, après-midi — campagne de preuves.**
Les curl, les deux réponses de la sonde de santé, la reprise après redémarrage, le sous-titre affiché.
Rien n'est reconstitué : le mail insiste sur des sorties issues de requêtes réellement exécutées, et
une sortie recomposée se repère.

**Vendredi 4 septembre, 17h00 — DÉPÔT TECHNIQUE.**
Schéma et index avec `EXPLAIN`, Swagger UI, preuves d'erreurs, sondes, notes déploiement, vidéo et
questionnaire.

---

## 4. Chemin critique

```
AD-1 · AD-3          →   EW-5              →   gel jeu. 18h00   →   EW-6
migrations âge           index et EXPLAIN      base figée           livrable schéma
et consentement

VI-1                 →   VI-2 · VI-3       →   VI-5 · VI-6      →   AD-6
rebase domaine B         routes profils        feed et profil       audit RGAA
                                               public
```

L'audit d'accessibilité ne peut pas auditer un écran qui n'existe pas : deux des trois écrans imposés
sont produits jeudi et vendredi matin. C'est la raison pour laquelle VI-6 et AD-5 sortent avec le
clavier et le focus déjà traités, plutôt qu'en repasse.

---

## 5. À faire trancher par écrit

### 01 — Le calcul d'allocation à partir des likes (§3) n'est pas planifié

Conditionner le montant d'une allocation chômage au nombre de likes reçus, en le tenant hors de
l'interface et de la documentation publique, c'est une décision automatisée qui affecte des droits
sociaux, prise sans que la personne concernée puisse la connaître ni la contester. Le cahier des
charges reconnaît lui-même que Florine ne l'a pas validée.

Aucune tâche n'est ouverte dessus et aucun nom n'y est affecté. La demande se remonte à Florine, en
copie Thomas, avec la question posée telle quelle : sur quelle base juridique, et avec quelle
information des candidats.

> **Bloqué en attente d'un écrit de Florine Pontaillac.**

### 02 — Les likes tout court

Le Ministre les veut centraux (§6), notre périmètre les excluait, et le modèle livré n'en a pas —
`InteractionType` vaut `VIEW`, `CONTACT`, `FAVORITE`, `MESSAGE`. C'est un conflit de périmètre, pas un
oubli. Si l'arbitrage revient favorable : compteur d'affichage seul, sans aucun lien avec le point 01,
une migration et un endpoint. Après vendredi — l'ouvrir maintenant coûte le dépôt.

> **Arbitrage demandé, non planifié cette semaine.**

### 03 — 12h00 ou 17h00

Le mail annonce l'ensemble des livrables à 17h00, mais les quatre pièces de §7.7 sont dues à 12h00 chez
Florine. On tient 12h00 et on demande confirmation dans la réponse — l'inverse ne se rattrape pas.

> **Planifié sur 12h00, confirmation demandée.**

### 04 — Le renommage en JibJob

Le dépôt, les paquets `@profils-actifs/*`, la base et les comptes de démonstration portent
ProfilsActifs. Renommer avant vendredi casse les imports pour un gain nul en recette. Proposition à
valider : nom technique inchangé, affichage produit renommé, alignement complet la semaine prochaine.

> **Renommage d'affichage seulement.**

### 05 — La charte de la Direction de la communication (§4.3)

Annoncée comme obligatoire et prioritaire sur la direction TikTok, jamais reçue. À relancer auprès de
Benjamin Sellami. Sans elle, l'interface reste sobre : partir sur un clone TikTok maintenant, c'est le
refaire à la réception.

> **Relance à envoyer, interface sobre par défaut.**

### 06 — Les tests de charge (§8.7)

Annoncés pour la revue technique de la semaine prochaine, périmètre non fourni. On demande le périmètre
plutôt que d'improviser un chiffre qu'il faudrait défendre.

> **Périmètre à demander, hors dépôt de vendredi.**

---

## 6. Si ça glisse — ordre de sacrifice, décidé à froid

Décider maintenant ce qui saute évite de le décider vendredi 15h00, quand le jugement est mauvais.

1. **Édition du profil côté candidat.** Le seed alimente la démo. Les routes `PATCH /profiles/me` restent, l'écran attend.
2. **Tris secondaires du feed.** `sort=name` et les affinages d'ordre. Le tri par défaut suffit à montrer la pagination serveur.
3. **Finition de l'écran de résultat.** Le badge doit s'afficher ; il n'a pas besoin d'être beau vendredi.

**Jamais : tout ce qui porte une preuve**, et les quatre pièces de 12h00. Ce sont exactement les points
sur lesquels la recette se fait — une preuve manquante se voit, une fonctionnalité manquante s'explique.
