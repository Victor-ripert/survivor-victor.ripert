# Dossier de recette — ProfilsActifs

**Référence** JEB/DNI/2026-003 · **Domaine D** — espace recruteur, contrat d'API, intégration
**Tenu par** Ewan · **Dernière mise à jour** jeudi 10 septembre 2026, avant la revue technique

Ce dossier rassemble les livrables des deux dépôts de vendredi et les preuves
qui les appuient. Chaque document nomme la tâche du plan de répartition dont il
sort.

---

## État vérifié le 10 septembre, avant la revue

Mesuré sur `main` (`bc5f86d`), pas déclaré :

| Vérification              | Résultat                                                                        |
| ------------------------- | ------------------------------------------------------------------------------- |
| `npm run build`           | **était rouge depuis `f7873ec` (8 septembre, 11h28)** — réparé, voir ci-dessous |
| `npm run lint`            | vert                                                                            |
| `npm run format:check`    | `VideoPlayer.tsx` non formaté — reformaté                                       |
| `npm run test`            | 299 API + 102 web + 18 partagés = **419 tests verts**                           |
| Parcours des quatre rôles | visiteur, candidat, recruteur, administrateur — vérifiés bout en bout           |

**Ce que la construction cassée cachait.** `utils/mappers.ts` portait un import
dupliqué (`Video`, `Profile` importés deux fois) et `profile.service.ts`
utilisait `ProfileWithRelations` sans l'importer. C'est le même défaut que FP-19
sur le paquet `db`, cette fois sur `api`. `npm run dev` ne le voyait pas : `tsx`
n'effectue aucun contrôle de types. Une troisième erreur du même compilateur
était un vrai défaut d'exécution : `profile.videos.map(toVideoDto)` passait
l'**indice du tableau** en second argument, si bien que le flux public et la
fiche publique renvoyaient `providerStatus: 0, 1, 2…` au lieu de `"ready"` —
en violation de `openapi.yaml`, qui déclare une énumération de chaînes.

**Conséquence à ne pas laisser passer** : la CI construit l'artefact de build
_après_ `npm run build`. Tant que la construction était rouge, **aucun artefact
n'a été publié pour `main` depuis le 8 septembre** — c'est la pièce JT-0 que
Thomas Vignal réclame. Elle se republie à la première CI verte.

**Le jeu de tests exige une base semée.** `npm run test` sur une base migrée
mais vide échoue (17 tests sur 299). C'est la CI qui le cache : elle sème avant
de tester. À dire avant qu'un examinateur ne lance la commande sur un clone.

---

## Ce matin — la remise de midi

Deux courriels du 3 septembre ajoutent deux remises avant le journal télévisé de
13h00. Le plan de la matinée, son arithmétique et son arbitrage sont dans
[`../REPARTITION.md`](../REPARTITION.md) §0.

### Jeudi 12h00 — remise au Ministre (Jean-Eudes Berlier)

| Pièce                          | Document                                                                        | Tâche      |
| ------------------------------ | ------------------------------------------------------------------------------- | ---------- |
| Prototype documenté, 2 pages   | [`livrables/prototype-documente.md`](livrables/prototype-documente.md)          | JT-4       |
| Guide d'utilisation, 12 étapes | [`livrables/guide-d-utilisation.md`](livrables/guide-d-utilisation.md)          | JT-5       |
| Plan B, une demi-page          | [`livrables/plan-b-direct.md`](livrables/plan-b-direct.md)                      | JT-6       |
| Vidéo de moins de 3 minutes    | [`livrables/video-demonstration.md`](livrables/video-demonstration.md) + `.srt` | JT-7       |
| Artefact de build récupérable  | _à faire_ — la CI ne publie aujourd'hui que la couverture                       | JT-0       |
| Données de démonstration       | _à faire_ — cinq écarts relevés au recensement §3                               | JT-2, JT-3 |

### Jeudi 12h30 — deck du cabinet (Benjamin Sellami)

| Pièce                        | Document                                                                             | Tâche |
| ---------------------------- | ------------------------------------------------------------------------------------ | ----- |
| Deck de 8 slides, PDF, 16:9  | [`livrables/pitch-deck.md`](livrables/pitch-deck.md)                                 | JT-8  |
| Recensement chiffré, slide 6 | [`livrables/recensement-du-3-septembre.md`](livrables/recensement-du-3-septembre.md) | JT-1  |
| Six captures                 | `preuves/deck/` — à prendre ce matin sur la version qui part à midi                  | JT-8  |

**Trois points bloquent et sont remontés par écrit avant 11h00** : la charte
graphique jamais reçue (07), l'artefact qui ne s'exécute pas sur une tablette
(09), et l'arbitrage entre la remise de midi et le dépôt légal de vendredi (03).

---

## Hier soir — bloquant pour la démonstration _(fait)_

L'addendum de Florine Pontaillac du 2 septembre 15h40 impose trois mesures avant
toute démonstration publique. Deux relèvent du domaine D.

| Mesure                                              | Preuve                                                                                                                             | Tâche  |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Une vidéo en attente n'apparaît plus nulle part     | [`preuves/SOIR-2-video-en-attente.txt`](preuves/SOIR-2-video-en-attente.txt)                                                       | SOIR-2 |
| Aucune route ne divulgue son adresse — et la limite | [`preuves/SOIR-3-video-inaccessible.txt`](preuves/SOIR-3-video-inaccessible.txt) + [capture](preuves/SOIR-3-navigation-privee.png) | SOIR-3 |
| File de modération vidéo, motif obligatoire         | Écran, routes `/admin/moderation/videos` et `/admin/videos/{id}/moderate`, et `ModerationLog.videoId` — **passés depuis** (VI-10)  | EW-13  |

**La limite à ne pas cacher** : une vidéo en lien externe est déjà publique chez
son hébergeur. Nous maîtrisons la divulgation de l'adresse, pas l'existence du
contenu. C'est déclaré par écrit dans
[`remontees/05-lien-externe-inaccessibilite.md`](remontees/05-lien-externe-inaccessibilite.md)
plutôt que masqué derrière une capture cadrée pour rassurer.

---

## Les deux dépôts

### Vendredi 12h00 — dossier juridique (Florine Pontaillac, §7.7)

| Pièce                                | Document                                                                           | Tâche |
| ------------------------------------ | ---------------------------------------------------------------------------------- | ----- |
| Registre des activités de traitement | [`livrables/registre-de-traitement.md`](livrables/registre-de-traitement.md)       | EW-7  |
| Note sur les critères de filtrage    | [`livrables/note-criteres-de-filtrage.md`](livrables/note-criteres-de-filtrage.md) | EW-8  |
| Déclaration d'accessibilité          | _domaine A_                                                                        | AD-7  |
| Projet de CGU                        | _domaine A_                                                                        | AD-8  |

### Vendredi 17h00 — dossier technique (Thomas Vignal, §8)

| Pièce                            | Document                                                                                                                | Tâche            |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Schéma de base de données        | [`livrables/schema-de-base-de-donnees.md`](livrables/schema-de-base-de-donnees.md)                                      | EW-6             |
| Note de déploiement              | [`livrables/note-de-deploiement.md`](livrables/note-de-deploiement.md) — rédigée ici, désormais portée par le domaine C | MA-8             |
| Swagger UI                       | servi sur `/api/docs` — preuve ci-dessous                                                                               | EW-1             |
| Preuves d'erreurs, sondes, index | `preuves/`                                                                                                              | EW-3, EW-4, EW-5 |

---

## Preuves

Aucune n'est recomposée à la main : chacune est produite par un script
rejouable, porte sa date et le commit contre lequel elle a été produite. **Si le
commit en tête d'une transcription n'est pas celui de `main`, la preuve est
périmée et se rejoue.**

**Relevé du 10 septembre : 18 transcriptions sur 19 sont périmées par cette
règle** — elles portent des commits allant de `f29c7a6` à `dc14b0c`, quand
`main` est à `bc5f86d`. Seule `EW-3-erreurs-http.txt` a été rejouée. Les rejouer
toutes contre le commit qui part en revue est la dernière étape avant le gel :
c'est mécanique, mais une preuve périmée est une preuve qui ne prouve rien, et
la règle ci-dessus est la nôtre.

| Preuve                                            | Fichier                                                                                              | Produite par                                     |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Swagger UI, machine sans accès réseau             | [`preuves/EW-1-swagger-ui.png`](preuves/EW-1-swagger-ui.png)                                         | navigateur sans résolution DNS hors `localhost`  |
| Les cinq codes 400/401/403/404/422                | [`preuves/EW-3-erreurs-http.txt`](preuves/EW-3-erreurs-http.txt)                                     | `scripts/preuves/erreurs-http.sh`                |
| Sonde de santé 200 → 503 → 200                    | [`preuves/EW-4-sonde-sante.txt`](preuves/EW-4-sonde-sante.txt)                                       | `scripts/preuves/sonde-sante.sh`                 |
| Index du catalogue, `EXPLAIN ANALYZE` avant/après | [`preuves/EW-5-index-catalogue.txt`](preuves/EW-5-index-catalogue.txt)                               | `scripts/preuves/index-catalogue.sh`             |
| Conformité schéma / migrations / base             | [`preuves/EW-6-schema-conforme.txt`](preuves/EW-6-schema-conforme.txt)                               | `scripts/preuves/schema-conforme.sh`             |
| Vidéo en attente, avant / après                   | [`preuves/SOIR-2-video-en-attente.txt`](preuves/SOIR-2-video-en-attente.txt)                         | `scripts/preuves/video-en-attente.sh`            |
| Inaccessibilité et sa limite                      | [`preuves/SOIR-3-video-inaccessible.txt`](preuves/SOIR-3-video-inaccessible.txt)                     | `scripts/preuves/video-inaccessible.sh`          |
| Tri déterministe du catalogue, deux parcours      | [`preuves/EW-9-tri-comparaison.txt`](preuves/EW-9-tri-comparaison.txt)                               | `scripts/preuves/tri-deterministe.sh`            |
| Contrôleur profils conforme au contrat            | [`preuves/VI-2-profils-contrat.txt`](preuves/VI-2-profils-contrat.txt)                               | `scripts/preuves/profils-contrat.sh`             |
| Pagination hors bornes                            | [`preuves/VI-3-pagination-hors-bornes.txt`](preuves/VI-3-pagination-hors-bornes.txt)                 | `scripts/preuves/pagination-hors-bornes.sh`      |
| Ajout d'une vidéo, embed sans navigation          | [`preuves/VI-4-ajout-video-embed.txt`](preuves/VI-4-ajout-video-embed.txt)                           | `scripts/preuves/video-embed-capture.mts`        |
| Flux public, un seul lecteur actif                | [`preuves/VI-5-feed-un-seul-lecteur-actif.txt`](preuves/VI-5-feed-un-seul-lecteur-actif.txt)         | `scripts/preuves/feed-single-player-capture.mts` |
| Clavier et contrastes, profil public              | [`preuves/VI-6-clavier-profil-public.txt`](preuves/VI-6-clavier-profil-public.txt)                   | `scripts/preuves/clavier-profil-public.mts`      |
| Clavier sur les trois écrans imposés              | [`preuves/AD-6-clavier-trois-ecrans.txt`](preuves/AD-6-clavier-trois-ecrans.txt)                     | `scripts/preuves/clavier-trois-ecrans.mts`       |
| Sous-titres réels et révocation à effet réel      | [`preuves/AD-7-sous-titres-et-revocation.txt`](preuves/AD-7-sous-titres-et-revocation.txt)           | `scripts/preuves/sous-titres-et-revocation.mts`  |
| Non-régression du témoin après migration vidéo    | [`preuves/V6-regression-temoin-post-migration.txt`](preuves/V6-regression-temoin-post-migration.txt) | `scripts/preuves/regression-migration-video.mts` |

### Comment tout rejouer

```bash
docker compose up -d postgres
npm run db:migrate && npm run db:seed
npm run build && npm start -w @profils-actifs/api   # dans un autre terminal

./scripts/preuves/erreurs-http.sh
./scripts/preuves/schema-conforme.sh
./scripts/preuves/index-catalogue.sh
./scripts/preuves/video-inaccessible.sh
./scripts/preuves/sonde-sante.sh                    # arrête et relance PostgreSQL
```

`video-en-attente.sh` se joue en deux temps, autour d'un changement de code :
`./scripts/preuves/video-en-attente.sh AVANT`, puis `APRÈS`. Il refuse d'écrire
si la source et le comportement du serveur divergent — c'est-à-dire si l'API
tourne encore sur l'ancien binaire.

**Si `npm run db:migrate` refuse de passer**, c'est la migration de consentement
sur une base contenant déjà des vidéos : `./scripts/reparer-migration-consentement.sh`
répare sans vider la base. Voir `ORDRE-DE-MERGE.md` §2.3.

`scripts/preuves/capturer-sql-catalogue.mts` imprime le SQL que Prisma émet
réellement pour les filtres du catalogue. C'est lui qui alimente le banc
d'index, pour que la mesure porte sur la requête de l'application et non sur
une paraphrase.

---

## Produit depuis le 3 septembre

Ce sommaire datait du 3 septembre : ces pièces existaient sans y figurer.

| Pièce                                          | Document                                                                                         | Domaine |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------- |
| Relevé d'écarts du courriel du 7 septembre     | [`COURRIEL-DU-7-SEPTEMBRE.md`](COURRIEL-DU-7-SEPTEMBRE.md)                                       | tous    |
| Algorithme de classement du catalogue          | [`livrables/note-algorithme-de-classement.md`](livrables/note-algorithme-de-classement.md)       | D       |
| Rapport de tests de charge (+ PDF)             | [`livrables/rapport-tests-de-charge.md`](livrables/rapport-tests-de-charge.md)                   | D       |
| Mesures brutes des tests de charge             | [`../load-test/results/`](../load-test/results/) — `findings-` et `pool-fix-2026-09-08.md`       | D       |
| Vidéo : lien seulement, pas de dépôt direct    | [`livrables/note-upload-video.md`](livrables/note-upload-video.md)                               | B       |
| Le questionnaire comme fichier versionné       | [`certification/questionnaire-json-versionne.md`](certification/questionnaire-json-versionne.md) | C       |
| Justification de l'invalidation des tentatives | [`certification/invalidation-justification.md`](certification/invalidation-justification.md)     | C       |
| Profil témoin de la migration vidéo            | [`decisions/03-profil-temoin-migration-video.md`](decisions/03-profil-temoin-migration-video.md) | B       |
| Audit RGAA AA, trois écrans imposés            | [`legal/rgaa-audit.md`](legal/rgaa-audit.md)                                                     | A       |
| Déclaration d'accessibilité                    | [`legal/accessibility-declaration.md`](legal/accessibility-declaration.md)                       | A       |
| Projet de CGU                                  | [`legal/cgu-draft.md`](legal/cgu-draft.md)                                                       | A       |
| Révocation du consentement vidéo               | [`legal/video-consent-revocation.md`](legal/video-consent-revocation.md)                         | A/B     |
| Texte de consentement v1.0                     | [`legal/consent-text-v1.md`](legal/consent-text-v1.md)                                           | A       |
| Comptes sans date de naissance                 | [`legal/accounts-without-birthdate.md`](legal/accounts-without-birthdate.md)                     | A       |

---

## Décisions

| Décision                                                              | Document                                                                   | Tâche |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----- |
| Où s'arrête le 400, où commence le 422                                | [`decisions/01-codes-erreur-http.md`](decisions/01-codes-erreur-http.md)   | EW-2  |
| Les index du catalogue, et pourquoi pas la normalisation à l'écriture | [`decisions/02-index-du-catalogue.md`](decisions/02-index-du-catalogue.md) | EW-5  |

## Remontées écrites

Les neuf points du plan de répartition à faire trancher, rédigés pour envoi.

| N°                                                 | Objet                                                      | Destinataire       | Statut                        |
| -------------------------------------------------- | ---------------------------------------------------------- | ------------------ | ----------------------------- |
| [01](remontees/01-allocation-et-likes.md)          | Allocation calculée à partir des « likes » (§3)            | Florine Pontaillac | **bloqué — avis écrit exigé** |
| [02](remontees/02-compteurs-d-engagement.md)       | Compteurs d'engagement : mesure satisfaite, conflit ouvert | Florine Pontaillac | attestation vendredi          |
| [03](remontees/03-echeances.md)                    | Six horaires, et l'arbitrage de la matinée                 | Thomas Vignal      | **arbitrage demandé, 11h00**  |
| [04](remontees/04-videos-deja-consultees.md)       | Vidéos déjà consultées par un recruteur                    | Florine Pontaillac | choix fait, à valider         |
| [05](remontees/05-lien-externe-inaccessibilite.md) | Un lien externe ne peut pas être rendu inaccessible        | Florine Pontaillac | limite déclarée               |
| [06](remontees/06-renommage-jibjob.md)             | Renommage en « JibJob »                                    | Benjamin Sellami   | affichage seulement           |
| [07](remontees/07-charte-graphique.md)             | Charte de la Direction de la communication (§4.3)          | Benjamin Sellami   | **bloque les 6 captures**     |
| [08](remontees/08-tests-de-charge.md)              | Périmètre des tests de charge (§8.7)                       | Thomas Vignal      | périmètre demandé             |
| [09](remontees/09-artefact-et-tablette.md)         | L'artefact de build ne tourne pas sur une tablette         | Thomas Vignal      | **réponse demandée, 11h00**   |

## Coordination

| Document                                                   | Objet                                                                                          |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [`ORDRE-DE-MERGE.md`](ORDRE-DE-MERGE.md)                   | Ordre des quatre branches, points durs du domaine B, listes de vérification avant chaque dépôt |
| [`BESOINS-AUTRES-DOMAINES.md`](BESOINS-AUTRES-DOMAINES.md) | Ce que le domaine D attend des autres, et ce qu'il a modifié chez eux                          |

---

## À refaire avant le gel de la revue technique

`ModerationLog.videoId` (VI-10) est passée : la section qui l'attendait est
close. Ce qui reste tient en cinq points, dans cet ordre.

1. **Fusionner les correctifs de construction** — l'import dupliqué de
   `mappers.ts`, l'import manquant de `profile.service.ts`, le
   `map(toVideoDto)` qui passait un indice, et `VideoPlayer.tsx` reformaté. Sans
   eux la CI reste rouge et n'émet aucun artefact.
2. **Vérifier que la CI est verte sur `main`** et récupérer l'artefact de build
   qu'elle publie — c'est la pièce JT-0.
3. **Rejouer les 18 transcriptions périmées** contre le commit gelé
   (`schema-conforme.sh`, `index-catalogue.sh`, `video-inaccessible.sh`,
   `sonde-sante.sh`, `tri-deterministe.sh`, `profils-contrat.sh`,
   `pagination-hors-bornes.sh`, puis les captures `.mts` qui demandent un
   navigateur).
4. **Refaire la capture Swagger UI** si le contrat a bougé.

**FP-4 est refermée le 10 septembre.** Les dix fixtures nommées portent
désormais une vidéo que nous hébergeons, sous-titrée, dont le contenu nomme la
personne dont c'est la fiche ; aucun identifiant de clip commercial ne subsiste
en base. `scripts/generer-videos-de-demonstration.mts` les produit, la vidéo de
Leïla Sassi reste l'enregistrement d'origine. Le chemin d'intégration par lien
externe reste exercé par les 487 profils générés et par l'ajout en direct de
l'étape 3 de la démonstration.

Hors gel, toujours dû et toujours non tranché : FP-5, FP-7, FP-9, FP-10, FP-12,
FP-15, FP-16 (voir [`COURRIEL-DU-7-SEPTEMBRE.md`](COURRIEL-DU-7-SEPTEMBRE.md)),
et l'arbitrage sur l'allocation adossée aux « likes »
([`remontees/01-allocation-et-likes.md`](remontees/01-allocation-et-likes.md)),
qui reste refusé et écrit.
