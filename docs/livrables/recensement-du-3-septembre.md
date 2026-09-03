# Recensement du 3 septembre 2026 — ce que contient réellement le produit

**Destinataires** Benjamin Sellami (source de la slide 6) · Jean-Eudes Berlier (données de démonstration)
**Référence** JEB/DNI/2026-003 · courriels du 3 septembre 7h15 et 8h05 · **Tâche** JT-1
**Rédacteur** Ewan — domaine D · **Compté le** jeudi 3 septembre 2026 au matin

---

## Méthode

Benjamin demande des chiffres « comptés ce matin ». Ils le sont, et par deux
fois, parce que les deux comptages ne donnent pas le même résultat.

- **Build propre** : ce que produit `prisma migrate deploy` puis `npm run db:seed`
  sur une base vide — c'est ce que Thomas récupérera dans l'artefact, et donc ce
  qui tournera sur la tablette. Relevé sur les fixtures de `packages/db/src/seed-data/`.
- **Machine de développement** : la base sur laquelle nous travaillons, interrogée
  ce matin via le client Prisma.

L'écart entre les deux colonnes n'est pas du bruit : c'est exactement le
« chez nous ça marche » contre lequel le Ministre nous met en garde. **Les
chiffres à citer en public sont ceux de la colonne « build propre ».**

---

## 1. Le comptage

| Mesure                                     | Build propre               | Machine de dév ce matin |
| ------------------------------------------ | -------------------------- | ----------------------- |
| Comptes                                    | 16                         | 17                      |
| — candidats                                | 13                         | 13                      |
| — recruteurs                               | 2                          | 3                       |
| — administrateurs                          | 1                          | 1                       |
| Comptes sans date de naissance             | 3 (les comptes de service) | 4                       |
| Comptes mineurs                            | 1 (17 ans)                 | 1                       |
| Profils                                    | 13                         | 13                      |
| — validés par la modération                | 11                         | 11                      |
| — en attente                               | 1                          | 1                       |
| — refusés                                  | 1                          | 1                       |
| **Profils visibles sur le fil public**     | **10**                     | 10                      |
| Profils visibles au catalogue recruteur    | 12                         | 12                      |
| Vidéos                                     | 10                         | 10                      |
| — validées                                 | 9                          | 9                       |
| — en attente                               | 1                          | 1                       |
| — refusées                                 | 0                          | 0                       |
| — déposées directement sur le serveur      | 0                          | 0                       |
| **Vidéos réellement lisibles sans compte** | **8**                      | 8                       |
| **Questions du questionnaire, actives**    | **100**                    | 100                     |
| Options de réponse                         | 240                        | 240                     |
| Paliers de badge                           | 4                          | 4                       |
| Passations enregistrées                    | 0                          | 2 (portant 0 réponse)   |
| Réponses enregistrées                      | 0                          | 0                       |
| Compétences au référentiel                 | 15                         | 15                      |
| Compétences portées par un profil          | 26                         | 26                      |
| Interactions recruteur                     | 13, étalées sur 30 jours   | 17                      |
| Notifications                              | 4                          | 7                       |
| **Décisions de modération journalisées**   | **0**                      | **0**                   |

Trois écarts expliqués : un compte recruteur créé à la main en test, ses quatre
interactions et les trois notifications qui vont avec, et deux passations de
questionnaire ouvertes puis abandonnées sans réponse. Rien de tout cela
n'existe dans le build propre.

**Pourquoi 10 profils publics et non 13.** Le profil refusé et le profil en
attente ne sont pas publiés ; le profil du candidat de 17 ans est tenu hors de
toute surface consultable sans compte (§7.9.1). Les trois exclusions sont des
règles, pas des trous — c'est la démonstration de la slide 7.

**Pourquoi 8 vidéos lisibles et non 10.** Une vidéo est en attente de
modération et n'est servie nulle part ; une autre est validée mais portée par
le profil du mineur, donc invisible sans compte recruteur.

---

## 2. Les espaces ouverts, et ceux qui ne le sont pas

Quinze routes sont montées et atteignables, regroupées ici en quatorze lignes —
l'inscription et la connexion partagent la leur. Colonne de droite : ce qu'y
trouve le journaliste s'il clique, sur un build propre.

| Écran                          | Route                        | Ce qu'il contient              |
| ------------------------------ | ---------------------------- | ------------------------------ |
| Fil public                     | `/`                          | 10 profils, 8 vidéos           |
| Profil public                  | `/profils/:id`               | bio, compétences, badge, vidéo |
| Inscription / connexion        | `/inscription`, `/connexion` | formulaires complets           |
| Mon profil                     | `/mon-profil`                | rempli par le seed             |
| Questionnaire                  | `/certification`             | 100 questions                  |
| Notifications                  | `/notifications`             | 2 pour Amina Berthier          |
| Tableau de bord recruteur      | `/recruteur`                 | 13 interactions sur 30 jours   |
| Catalogue                      | `/recruteur/catalogue`       | 12 profils, facettes actives   |
| Ma sélection                   | `/recruteur/favoris`         | 3 profils                      |
| Historique des interactions    | `/recruteur/interactions`    | 13 lignes                      |
| Tableau de bord administrateur | `/admin`                     | statistiques plateforme        |
| Modération des profils         | `/admin/moderation-profils`  | **1 ligne**                    |
| Modération des vidéos          | `/admin/moderation-videos`   | **1 ligne**                    |
| Barème du questionnaire        | `/admin/questionnaire`       | 100 questions et leurs poids   |

---

## 3. Ce que le recensement a fait apparaître

Benjamin annonçait « deux ou trois choses » découvertes. Il y en a cinq, toutes
vérifiées, toutes réparables avant midi. Elles sont ouvertes en tâches dans
`REPARTITION.md` §0.

### 3.1 Les dix vidéos de démonstration ne sont pas des présentations de candidats

Les dix URL du seed pointent vers de vraies vidéos YouTube publiques, et
connues : des clips musicaux à succès et des vidéos virales. `dQw4w9WgXcQ`,
intitulé chez nous « Présentation en 90 secondes », est le classique du
« rickroll ».

Deux conséquences, l'une gênante et l'autre coûteuse :

- Sur le plateau, le journaliste clique sur la vidéo d'une candidate et une
  chanson démarre. C'est le plan de la démonstration qui s'effondre.
- Benjamin écrit « sans musique parce que la chaîne refuse tout ce qui a des
  droits ». La consigne vise notre vidéo de démonstration, mais elle s'applique
  d'autant plus à ce que la tablette affiche en direct.

**À faire** : vérifier les dix identifiants un par un et les remplacer par des
vidéos libres de droits, ou par des vidéos hébergées par nous. Aucun ne peut
rester tel quel.

### 3.2 Un recruteur ou un administrateur qui ouvre ses notifications voit un écran vide

Les sept notifications de la base vont toutes à des candidats — c'est le sens
même de la fonctionnalité : le candidat est prévenu qu'un recruteur s'intéresse
à lui. Mais le lien « Notifications » est affiché aux trois rôles, et il mène à
une page vide pour deux d'entre eux.

**À faire** : ne pas afficher le lien aux rôles qui n'en reçoivent pas, ou
semer de quoi le remplir. La première option est plus juste et plus rapide.

### 3.3 Le second compte recruteur est entièrement vide

`recruteur2@profils-actifs.fr` n'a aucune interaction, aucun favori. Son tableau
de bord et sa sélection sont vides. Le Ministre demande explicitement un compte
par type d'utilisateur, déjà rempli : si c'est celui-là qu'on lui donne, la
démonstration est vide.

**À faire** : lui donner un historique, ou ne pas le livrer dans les comptes de
démonstration. Le compte à citer est `recruteur@profils-actifs.fr`.

### 3.4 Aucune décision de modération n'est journalisée

`ModerationLog` est vide. La table existe, la colonne `videoId` est en place, les
routes écrivent dedans — mais rien n'a encore été décidé sur une base neuve. La
file de modération affiche donc « dernière décision : aucune » partout, et
l'écran qui doit démontrer la traçabilité ne démontre rien.

C'est la slide 7, celle que Florine lira.

**À faire** : semer deux décisions passées, une validation et un refus motivé,
avec leur horodatage et leur auteur.

### 3.5 Deux candidats sont annoncés « en cours de certification » sans passation

Deux profils portent `certificationStatus: IN_PROGRESS`, mais le seed ne crée
aucune `CertificationAttempt`. Si on se connecte avec l'un d'eux pour montrer la
reprise, il n'y a rien à reprendre : le questionnaire démarre à la question 1.

C'est la démonstration de la slide 5 — la plus difficile du lot selon Benjamin —
qui repose sur un état incohérent.

**À faire** : soit semer une passation réelle à mi-parcours, soit démontrer la
reprise en direct en répondant à trois questions et en rechargeant la page. La
seconde option ne coûte rien et se montre mieux.

---

## 4. Ce qui est mesuré, et ce qui ne l'est pas

Ce recensement compte des lignes en base et des routes montées. Il ne mesure
pas :

- **la lecture effective des vidéos**, qui dépend d'un accès réseau à YouTube —
  voir `remontees/09-artefact-et-tablette.md` ;
- **la conformité à la charte graphique**, qui relève d'un contrôle distinct :
  les quatre règles reçues le 3 septembre sont appliquées et vérifiées route par
  route, à l'exception de la police Marianne dont les fichiers manquent — voir
  `remontees/07-charte-graphique.md` ;
- **la tenue en charge**, dont le périmètre n'a pas été fourni (§8.7).

Ces trois points sont déclarés, pas estimés.
