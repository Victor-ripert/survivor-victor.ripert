# Dossier de recette — ProfilsActifs

**Référence** JEB/DNI/2026-003 · **Domaine D** — espace recruteur, contrat d'API, intégration
**Tenu par** Ewan · **Dernière mise à jour** mercredi 2 septembre 2026, soir

Ce dossier rassemble les livrables des deux dépôts de vendredi et les preuves
qui les appuient. Chaque document nomme la tâche du plan de répartition dont il
sort.

---

## Ce soir — bloquant pour la démonstration de jeudi

L'addendum de Florine Pontaillac du 2 septembre 15h40 impose trois mesures avant
toute démonstration publique. Deux relèvent du domaine D.

| Mesure                                              | Preuve                                                                                                                             | Tâche  |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Une vidéo en attente n'apparaît plus nulle part     | [`preuves/SOIR-2-video-en-attente.txt`](preuves/SOIR-2-video-en-attente.txt)                                                       | SOIR-2 |
| Aucune route ne divulgue son adresse — et la limite | [`preuves/SOIR-3-video-inaccessible.txt`](preuves/SOIR-3-video-inaccessible.txt) + [capture](preuves/SOIR-3-navigation-privee.png) | SOIR-3 |
| File de modération vidéo, motif obligatoire         | `packages/web/src/pages/Admin/VideoModerationPage.tsx` — écran et contrat prêts, API attendue (VI-10)                              | EW-13  |

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

| Preuve                                            | Fichier                                                                          | Produite par                                    |
| ------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------- |
| Swagger UI, machine sans accès réseau             | [`preuves/EW-1-swagger-ui.png`](preuves/EW-1-swagger-ui.png)                     | navigateur sans résolution DNS hors `localhost` |
| Les cinq codes 400/401/403/404/422                | [`preuves/EW-3-erreurs-http.txt`](preuves/EW-3-erreurs-http.txt)                 | `scripts/preuves/erreurs-http.sh`               |
| Sonde de santé 200 → 503 → 200                    | [`preuves/EW-4-sonde-sante.txt`](preuves/EW-4-sonde-sante.txt)                   | `scripts/preuves/sonde-sante.sh`                |
| Index du catalogue, `EXPLAIN ANALYZE` avant/après | [`preuves/EW-5-index-catalogue.txt`](preuves/EW-5-index-catalogue.txt)           | `scripts/preuves/index-catalogue.sh`            |
| Conformité schéma / migrations / base             | [`preuves/EW-6-schema-conforme.txt`](preuves/EW-6-schema-conforme.txt)           | `scripts/preuves/schema-conforme.sh`            |
| Vidéo en attente, avant / après                   | [`preuves/SOIR-2-video-en-attente.txt`](preuves/SOIR-2-video-en-attente.txt)     | `scripts/preuves/video-en-attente.sh`           |
| Inaccessibilité et sa limite                      | [`preuves/SOIR-3-video-inaccessible.txt`](preuves/SOIR-3-video-inaccessible.txt) | `scripts/preuves/video-inaccessible.sh`         |

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

## Décisions

| Décision                                                              | Document                                                                   | Tâche |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----- |
| Où s'arrête le 400, où commence le 422                                | [`decisions/01-codes-erreur-http.md`](decisions/01-codes-erreur-http.md)   | EW-2  |
| Les index du catalogue, et pourquoi pas la normalisation à l'écriture | [`decisions/02-index-du-catalogue.md`](decisions/02-index-du-catalogue.md) | EW-5  |

## Remontées écrites

Les huit points du plan de répartition à faire trancher, rédigés pour envoi.

| N°                                                 | Objet                                                      | Destinataire       | Statut                        |
| -------------------------------------------------- | ---------------------------------------------------------- | ------------------ | ----------------------------- |
| [01](remontees/01-allocation-et-likes.md)          | Allocation calculée à partir des « likes » (§3)            | Florine Pontaillac | **bloqué — avis écrit exigé** |
| [02](remontees/02-compteurs-d-engagement.md)       | Compteurs d'engagement : mesure satisfaite, conflit ouvert | Florine Pontaillac | attestation vendredi          |
| [03](remontees/03-echeances.md)                    | Trois horaires, dont l'heure de la démo                    | Thomas Vignal      | à confirmer ce soir           |
| [04](remontees/04-videos-deja-consultees.md)       | Vidéos déjà consultées par un recruteur                    | Florine Pontaillac | choix fait, à valider         |
| [05](remontees/05-lien-externe-inaccessibilite.md) | Un lien externe ne peut pas être rendu inaccessible        | Florine Pontaillac | limite déclarée               |
| [06](remontees/06-renommage-jibjob.md)             | Renommage en « JibJob »                                    | Benjamin Sellami   | affichage seulement           |
| [07](remontees/07-charte-graphique.md)             | Charte de la Direction de la communication (§4.3)          | Benjamin Sellami   | relance                       |
| [08](remontees/08-tests-de-charge.md)              | Périmètre des tests de charge (§8.7)                       | Thomas Vignal      | périmètre demandé             |

## Coordination

| Document                                                   | Objet                                                                                          |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [`ORDRE-DE-MERGE.md`](ORDRE-DE-MERGE.md)                   | Ordre des quatre branches, points durs du domaine B, listes de vérification avant chaque dépôt |
| [`BESOINS-AUTRES-DOMAINES.md`](BESOINS-AUTRES-DOMAINES.md) | Ce que le domaine D attend des autres, et ce qu'il a modifié chez eux                          |

---

## À refaire après le gel de jeudi 18h00

Les migrations du domaine A sont passées et décrites. Il reste
`ModerationLog.videoId` (VI-10), sans laquelle une décision de modération vidéo
n'a pas de colonne où s'écrire. Une fois qu'elle est sur `main` :

1. `./scripts/preuves/schema-conforme.sh` — les deux diffs doivent rester vides
2. Régénérer l'en-tête, le §1, le §2 et le §6 de `livrables/schema-de-base-de-donnees.md`
3. Fermer le §4 de `livrables/registre-de-traitement.md`
4. Rejouer `erreurs-http.sh`, `sonde-sante.sh`, `index-catalogue.sh` et
   `video-inaccessible.sh` contre `main` — le dernier doit balayer `/profiles`
   et `/videos`, qui n'existaient pas au moment de cette transcription
5. Refaire la capture Swagger UI si le contrat a bougé
