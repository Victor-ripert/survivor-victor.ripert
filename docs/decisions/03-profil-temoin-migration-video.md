# 03 — Le profil témoin de la migration providerRef/providerName

**Tâche** V5 · **Référence** mail de Thomas Vignal (revue de sécurité) · **Date** 8 septembre 2026
**Statut** proposé par Victor — **en attente de confirmation par Adrien avant d'être considéré tranché**

---

## Ce que ce document répond

Le mail de Thomas demande un profil témoin choisi **avant** de lancer V3 (le script de backfill
`providerRef`/`providerName`), pour vérifier après coup, sans ambiguïté, qu'une fiche qui
fonctionnait avant la migration fonctionne encore après (V6). Dans l'ordre d'exécution réel de ce
chantier, V3 a tourné avant que ce document existe — l'écart est assumé, pas caché : voir
« Ce que cet écart change » plus bas.

## Rendu caduc le 10 septembre par FP-4 — le témoin doit être re-choisi

**Ce document décrit un état du jeu de données qui n'existe plus.** Le 10 septembre, la fermeture
de FP-4 (les clips musicaux commerciaux du jeu de démonstration) a converti les neuf vidéos
`EXTERNAL_LINK` des fixtures nommées en vidéos hébergées par nous — Bastien Colin compris. Son
« Ma manière de gérer un litige » est désormais une vidéo `UPLOAD`, ce qui retire au témoin
exactement la propriété pour laquelle il avait été choisi (voir « `EXTERNAL_LINK`, pas `UPLOAD`,
et c'est délibéré » plus bas).

**Ce que cela ne casse pas.** Le chemin `EXTERNAL_LINK` du backfill reste exercé, et plus largement
qu'avant : les 487 profils générés par `generated-applicants.ts` sont tous des liens externes, et
c'est sur eux que `db:migrate-video-providers` a le plus de lignes à reprendre.

**Ce qu'il reste à faire**, avant de rejouer V6 : re-choisir un témoin `EXTERNAL_LINK` parmi les
profils générés, ou assumer un témoin `UPLOAD` et le dire — et refaire la preuve
`docs/preuves/V6-regression-temoin-post-migration.txt`, qui est de toute façon à rejouer contre le
commit gelé. **Arbitrage domaine B.**

**Les deux identifiants du tableau ci-dessous ne sont pas stables non plus** : ce sont des `cuid`
produits par la base, relevés le 8 septembre sur une instance locale. Tout `db:seed` sur une base
vide en produit d'autres. L'adresse électronique est la seule référence durable, et le tableau le
disait déjà.

---

## Le profil retenu

**Bastien Colin** — `bastien.colin@example.fr`

| Champ                      | Valeur                                                                    |
| -------------------------- | ------------------------------------------------------------------------- |
| Email (référence durable)  | `bastien.colin@example.fr`                                                |
| `User.id`                  | `cmtrbflzy001v98ocjefbdpdx`                                               |
| `Profile.id`               | `cmtrbfm02001w98ocnqz3oedp`                                               |
| Vidéo                      | 1, `EXTERNAL_LINK`, « Ma manière de gérer un litige »                     |
| `Profile.moderationStatus` | `APPROVED` — la fiche est publique, pas seulement visible du propriétaire |

Relevé le 8 septembre 2026 sur la base de développement locale, après le premier passage de V3.

## Pourquoi celui-ci et pas un autre

- **Un profil `APPROVED` avec vidéo, sans être déjà réservé pour autre chose.** Trois comptes de
  démonstration sont déjà le sujet fixe d'un autre script de preuve : `amina.berthier@example.fr`
  (`scripts/preuves/profils-contrat.sh`, `video-embed-capture.mts`), `yanis.oubrahim@example.fr`
  (`scripts/preuves/erreurs-http.sh`) et **Leïla Sassi**, dont la vidéo est celle que
  `scripts/preuves/sous-titres-et-revocation.mts` supprime pour démontrer la révocation — c'est
  aussi la seule vidéo `UPLOAD` du jeu de données. Choisir l'un d'eux comme témoin aurait mélangé
  deux preuves indépendantes : un témoin dont la vidéo disparaît régulièrement pour une raison sans
  rapport avec V3 rend un désaccord entre les deux preuves illisible.
- **Fiche publique (`moderationStatus: APPROVED`)**, pas seulement propriétaire : la vérification
  V6 porte explicitement sur « fiche encore affichée » — un profil `PENDING` (Idriss Kamara, seul
  autre profil avec vidéo dans cet état) ne répond pas à cette question, parce qu'il n'est déjà pas
  affiché publiquement avant la migration.
- **`EXTERNAL_LINK`, pas `UPLOAD`, et c'est délibéré.** Le seul fixture `UPLOAD` (Leïla Sassi) est
  déjà pris. `EXTERNAL_LINK` reste une vérification valable pour V6 : la ligne `Video` porte
  `providerRef`/`providerName` comme toute autre, et `deleteVideo` (V4) la fait passer par
  `getVideoProviderByName('external-link')` exactement comme n'importe quelle ligne migrée. Ce
  n'est pas un test du fournisseur local spécifiquement — ce test-là existe déjà en isolation dans
  `packages/api/test/services/video.service.test.ts`. V6 vérifie l'intégration bout en bout sur une
  fiche réelle, pas une deuxième fois le fournisseur local.

## Ce que cet écart change

V3 a tourné (deux fois — voir V3) avant que ce document existe, contre l'ensemble des lignes
`Video` de la base de développement, témoin compris. Concrètement, pour Bastien Colin : sa ligne
`Video` a déjà `providerName: 'external-link'` et `providerRef` égal à l'URL d'intégration, comme
relevé dans le tableau ci-dessus. La vérification que V6 doit produire — la preuve qu'une
migration déjà arrivée n'a rien cassé pour ce profil précisément — reste possible et reste la
preuve demandée : rien n'oblige à revenir en arrière et à rejouer V3 pour que ce document ait un
sens, seulement à noter que l'ordre « choisir, puis migrer » n'a pas été respecté cette fois.

## À faire

**Relayer ce choix à Adrien pour confirmation** — ce document propose un candidat, il ne le
tranche pas seul (le mail dit « avec Adrien »). Une fois confirmé, retirer la mention « en attente »
du statut ci-dessus.
