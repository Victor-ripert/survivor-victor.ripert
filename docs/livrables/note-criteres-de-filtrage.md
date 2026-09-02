# Note — critères de filtrage exposés dans le catalogue recruteur

**Destinataire** Florine Pontaillac, conseillère juridique
**Référence** JEB/DNI/2026-003 §7.2 · Code du travail, art. L1132-1
**Échéance** vendredi 4 septembre, 12h00 · **Tâche** EW-8
**Rédacteur** Ewan — domaine D (espace recruteur), contrat d'API

---

## Méthode

La liste ci-dessous n'est pas une liste d'intentions. Elle est relevée sur le
code qui tourne : `packages/api/src/validators/recruiter.ts` définit ce que
l'API accepte, `packages/api/src/services/catalogue.filters.ts` définit ce
qu'elle en fait, et `packages/api/openapi.yaml` définit ce qui est publié. Les
trois disent la même chose, sans quoi le contrat serait faux — c'est vérifié
par les tests unitaires du fichier de filtres.

**Aucun critère de filtrage n'est exposé ailleurs.** Le fil public de profils
et la page profil sont accessibles sans authentification mais ne portent aucun
filtre ; l'espace d'administration ne filtre que sur le statut de modération,
qui n'est pas un critère de sélection de candidats.

---

## 1. Critères conservés

Un critère par ligne, une phrase de justification professionnelle chacune,
comme demandé.

| Paramètre       | Ce qu'il filtre                                                                                 | Justification professionnelle                                                                                                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `q`             | Recherche libre sur l'intitulé, la présentation, le secteur, la localisation et les compétences | Permet de retrouver une compétence ou un métier exprimé avec d'autres mots que ceux du référentiel, sans ajouter de critère de sélection nouveau : chaque champ couvert est déjà filtrable séparément.    |
| `sector`        | Secteur d'activité visé, déclaré par le candidat                                                | Le secteur est l'objet même du rapprochement entre une offre et une candidature, et il est renseigné par le candidat pour être vu.                                                                        |
| `location`      | Localisation déclarée par le candidat                                                           | Le lieu de travail est une condition d'exécution du contrat de travail, et le candidat le renseigne pour indiquer où il est disponible.                                                                   |
| `skills`        | Compétences du référentiel portées par le profil                                                | Une compétence professionnelle est le critère de sélection le plus directement lié à l'aptitude à tenir le poste.                                                                                         |
| `certifiedOnly` | Restreint aux profils dont la certification JEB est achevée                                     | La certification atteste d'une évaluation d'aptitude passée dans les mêmes conditions par tous les candidats, sans intervention du recruteur.                                                             |
| `minScore`      | Score de certification minimal                                                                  | Même justification, exprimée en seuil plutôt qu'en tout ou rien ; le score est calculé côté serveur à partir d'un barème identique pour tous.                                                             |
| `hasVideo`      | Restreint aux profils portant au moins une vidéo **validée par la modération**                  | Filtre sur la complétude du dossier — la présence d'une pièce validée, pas son contenu — et non sur ce que la vidéo montre. Une vidéo en attente n'y ouvre pas droit (§7.9.2). **Voir la réserve au §3.** |
| `favoritesOnly` | Restreint à la liste retenue par le recruteur lui-même                                          | Ne porte sur aucune caractéristique du candidat : c'est le recruteur qui filtre sur ses propres actions passées.                                                                                          |
| `sort`          | Ordre d'affichage : `recent`, `score`, `name`                                                   | Un ordre d'affichage ne retire aucun profil du résultat ; les trois valeurs portent sur la fraîcheur du profil, le score de certification et l'ordre alphabétique.                                        |
| `page`, `limit` | Pagination, plafonnée à 20 par page côté serveur                                                | Contrainte technique du §8.6, sans effet de sélection.                                                                                                                                                    |

---

## 2. Critères retirés

Comme demandé, la liste écrite de ce qui a été retiré.

### 2.1 Le nom et le prénom du candidat, retirés de la recherche libre `q`

**Retiré le 2 septembre 2026.** Jusqu'à cette date, `q` cherchait aussi dans
`User.firstName` et `User.lastName` : saisir une chaîne dans la barre de
recherche du catalogue restreignait la population affichée aux candidats dont
le nom la contenait.

Nous ne trouvons pas de phrase qui justifie ce critère, et la règle du §7.2 est
alors qu'il se retire. Le raisonnement, en clair : un patronyme est un
indicateur reconnu d'origine, et un catalogue qui laisse restreindre la
population par le nom met à disposition, sans le nommer, un filtre sur
l'origine. Que l'intention du recruteur soit ou non discriminatoire ne change
rien à ce que l'outil rend possible, ni à ce qu'en dirait l'article L1132-1.

Retrouver un candidat déjà connu par son nom est un besoin réel — mais c'est
une autre fonctionnalité que parcourir un catalogue, et elle ne justifie pas
d'exposer le filtre ici. Si elle est demandée, elle se traite par une recherche
nominative explicite, tracée, et distincte du parcours de catalogue.

Effet dans le code : `searchFilter` dans `catalogue.filters.ts` ne porte plus
les deux branches ; un test unitaire échoue désormais si elles reviennent ; la
description du paramètre dans `openapi.yaml` a été corrigée dans le même
commit. Effet secondaire mesurable : la requête `q` émettait trois
auto-jointures sur `User`, elle n'en émet plus qu'une.

### 2.2 Ce qui n'a jamais été exposé, et ne le sera pas

Pour que la lecture soit complète, ces données existent en base ou sont
envisagées par le cahier des charges, et **ne sont exposées à aucun filtre**
côté API ni côté interface :

| Donnée                                       | Où elle est                        | Pourquoi elle n'est pas filtrable                                                                                                                                                                          |
| -------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date de naissance / âge                      | à venir, migration AD-1 (§7.3)     | Recueillie pour la seule vérification du régime des 16-18 ans ; l'âge n'est pas un critère de sélection (L1132-1).                                                                                         |
| Sexe, origine, situation de famille          | nulle part                         | Non collectées. Le modèle ne porte pas ces colonnes, et ce n'est pas un oubli.                                                                                                                             |
| Photographie, apparence                      | nulle part                         | Non collectées hors du contenu de la vidéo, que le recruteur regarde mais ne filtre pas.                                                                                                                   |
| Contenu de la vidéo                          | `Video.url`, `Video.title`         | Aucun filtre ne porte sur ce que la vidéo montre ou dit.                                                                                                                                                   |
| Nombre de « likes », compteur de vues public | nulle part                         | Le modèle n'a pas de type d'interaction `LIKE`, et aucune structure renvoyée par l'API ne porte de compteur d'engagement — votre §7.9.3 est satisfait par construction. Voir les remontées n° 01 et n° 02. |
| Vidéo en attente de validation               | `Video.moderationStatus = PENDING` | Depuis le 2 septembre, une vidéo non validée n'est ni comptée, ni prévisualisée, ni retenue par `hasVideo` (§7.9.2). Preuve : `docs/preuves/SOIR-2-video-en-attente.txt`.                                  |

---

## 3. Trois réserves que nous portons à votre appréciation

**`minScore` et `sort=score` au regard de votre §7.9.3.** C'est la réserve la
plus sérieuse, et elle naît de votre propre raisonnement. Vous écrivez qu'un
compteur public « constitue un classement de personnes fondé sur la popularité,
ce qui, sur un service de l'emploi, expose votre cabinet à une difficulté ».
`minScore` filtre les candidats par un seuil de score, `sort=score` les ordonne
par ce score, et le score comme le badge sont affichés publiquement sur le
profil. C'est donc bien, littéralement, un classement de personnes.

Nous pensons que la distinction tient, et voici sur quoi elle repose : ce score
n'est pas un signal social. Il est produit par un questionnaire identique pour
tous, calculé côté serveur sur un barème fixe, sans intervention du recruteur ni
du candidat, et il mesure une aptitude professionnelle — exactement ce que
l'article L1132-1 autorise comme critère de sélection. Un compteur de « j'aime »
mesure l'audience d'une vidéo ; un score de certification mesure ce que le
dispositif prétend mesurer. Le premier classe par popularité, le second par
évaluation.

Nous ajoutons ce qui affaiblit notre propre position, pour que vous en
disposiez : le §2.1 du cahier des charges rend le badge **obligatoire pour être
visible des recruteurs premium**, ce qui fait du score une condition d'accès à
une partie du marché, et non un simple élément d'information. À ce titre, le
classement produit des effets réels sur les personnes. Nous ne tranchons pas ce
point à votre place — nous le maintenons en l'état et nous vous demandons de
confirmer, ou d'infirmer, que le raisonnement du §7.9.3 ne s'y applique pas.

**`hasVideo`.** Nous le justifions comme un filtre de complétude de dossier, et
nous pensons cette lecture juste. Elle mérite néanmoins d'être signalée plutôt
que présentée comme acquise : sur une plateforme dont la vidéo est le cœur, un
filtre « avec vidéo » écarte en pratique les candidats qui ne souhaitent pas
diffuser leur image, ou ne le peuvent pas. Le consentement à la diffusion étant
révocable (§7.1), un candidat qui exerce ce droit sort du résultat filtré.
Nous le maintenons parce que le dossier sans vidéo reste visible dans le
catalogue non filtré, mais l'arbitrage vous revient.

**La recherche libre sur la présentation (`bio`).** Le texte est écrit par le
candidat lui-même et peut contenir ce qu'il a choisi d'y mettre, y compris des
éléments personnels. Le filtre porte sur un texte que le candidat publie
volontairement ; nous ne le retirons pas, mais il n'est pas neutre et nous
préférons l'écrire.

---

## 4. Ce qu'il resterait à faire

- **Journaliser les recherches.** Aujourd'hui, aucune trace n'est conservée des
  critères qu'un recruteur a employés. Une plateforme publique exposée à un
  contentieux de discrimination ne peut pas démontrer ce qui a été filtré, ni
  le contraire. Ce n'est pas un manquement au §7.2 tel qu'il est rédigé, mais
  c'est ce qui manquerait le jour où la question se pose. Non planifié cette
  semaine — à arbitrer.
- **Ré-examiner cette liste à chaque ajout de filtre.** Le tableau du §1 se
  relit à côté de `catalogue.filters.ts` ; s'ils divergent, c'est le tableau
  qui a tort.
