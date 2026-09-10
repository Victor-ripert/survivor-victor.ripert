# Note — algorithme de classement du catalogue recruteur

**Destinataire** recette technique — courriel du 8 septembre 2026
**Copie** Florine Pontaillac, conseillère juridique — pour son avis
**Référence** JEB/DNI/2026-003 · Code du travail, art. L1132-1 · **Tâche** EW-9
**Rédacteur** Ewan — domaine D (espace recruteur), contrat d'API

Cette note dit dans quel ordre le catalogue rend les profils, pourquoi cet
ordre-là, et ce qu'il garantit. Les critères de filtrage disponibles sont
listés un par un dans la note jointe `note-criteres-de-filtrage.md` ; le §5
ci-dessous en donne le sommaire pour que la lecture soit d'un seul tenant.

Tout ce qui suit est relevé sur le code qui tourne. La démonstration demandée
est en pièce jointe et re-jouable :

| Pièce                                   | Ce qu'elle contient                                                                                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/preuves/EW-9-tri-passe-1.txt`     | Le catalogue parcouru de la première à la dernière page, identifiants dans l'ordre obtenu                                                             |
| `docs/preuves/EW-9-tri-passe-2.txt`     | Le même parcours, recommencé                                                                                                                          |
| `docs/preuves/EW-9-tri-comparaison.txt` | Leur comparaison, les comptes lus en base, le cas de la modification concurrente, et le §5 qui reprend les deux parcours pour **chacun** des six tris |
| `scripts/preuves/tri-deterministe.sh`   | Le script qui produit les trois, re-jouable                                                                                                           |

---

## 1. L'ordre par défaut

```sql
ORDER BY "updatedAt" DESC, "id" ASC
```

**Deux colonnes, jamais une seule.** La seconde est la clé primaire : unique,
jamais réattribuée. L'ordre est donc _total_ — aucune paire de lignes n'est à
égalité — et la séquence rendue est une fonction des données seules, pas du
plan d'exécution que PostgreSQL a retenu ce jour-là.

Ce n'est pas une précaution prise « là où des ex æquo semblent probables ».
Sur `certificationScore`, entier sur une centaine de valeurs, et sur `sector`,
tiré d'une courte liste, les ex æquo sont la règle ; mais même `updatedAt`
entre en collision dès que deux profils sont écrits dans la même milliseconde.
D'où la règle sans exception : **toute valeur de `sort` se termine sur `id`.**

Où cela vit :

- `buildCatalogueOrderBy()` — `packages/api/src/services/catalogue.filters.ts`
- Défaut appliqué par `catalogueQuerySchema` — `packages/api/src/validators/recruiter.ts`,
  à partir de la constante unique `CATALOGUE_DEFAULT_SORT` partagée avec l'interface
- Publié dans `packages/api/openapi.yaml`
- Index correspondant colonne pour colonne — `Profile_updatedAt_id_idx`,
  `("updatedAt" DESC, id)` : les deux colonnes, dans le bon sens

Deux tests unitaires tiennent la règle plutôt qu'un commentaire : ils itèrent
sur `CATALOGUE_SORTS`, de sorte qu'un tri ajouté au vocabulaire sans clé de
départage fait échouer la suite au lieu d'être livré.

## 2. Les tris proposés au recruteur

Six — un par critère professionnel que votre courriel énumère — et une phrase
de justification chacun.

| `sort`          | Ordre                                                                                | Justification professionnelle                                                                                                                                                                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `recent`        | `updatedAt DESC, id ASC` — **défaut**                                                | La fraîcheur du profil est le meilleur indice disponible qu'un candidat est effectivement en recherche ; elle dépend de son seul geste, et elle est à la portée de tous de la même manière.                                                                                                                  |
| `certification` | `certificationBadge ASC NULLS LAST, certificationStatus ASC, updatedAt DESC, id ASC` | Le **statut** de certification, que votre liste nomme, et qui n'est pas la même question que le score. `certificationBadge` n'est écrit qu'à l'issue d'une passation réussie : trier dessus en plaçant les vides en dernier met les profils certifiés devant les autres, ce qui est le regroupement demandé. |
| `score`         | `certificationScore DESC NULLS LAST, updatedAt DESC, id ASC`                         | Le score de certification mesure une aptitude professionnelle, évaluée pour tous au même barème et calculée côté serveur. **Voir la réserve au §3 de la note sur les critères de filtrage, toujours ouverte.**                                                                                               |
| `sector`        | `sector ASC, updatedAt DESC, id ASC`                                                 | Le secteur est l'objet même du rapprochement entre une offre et une candidature ; il est déclaré par le candidat pour être vu.                                                                                                                                                                               |
| `location`      | `location ASC, updatedAt DESC, id ASC`                                               | Le lieu de travail est une condition d'exécution du contrat ; le candidat le renseigne pour indiquer où il est disponible.                                                                                                                                                                                   |
| `availability`  | `availability ASC NULLS LAST, updatedAt DESC, id ASC`                                | La disponibilité déclarée par le candidat. Elle décrit une condition d'exécution du contrat, elle est déclarée pour être vue, et elle est à la portée de tous de la même manière.                                                                                                                            |

Les profils sans score sont rangés en dernier (`NULLS LAST`) et non en premier :
l'absence de certification n'est pas un score parfait.

**Deux réserves nommées plutôt que laissées à la lecture.** Au sein des profils
certifiés, `sort=certification` ordonne sur le _libellé_ du badge, qui est le
nom du niveau et non son rang : l'ordre y est alphabétique, et nous le disons
plutôt que de le faire passer pour une hiérarchie. Qui veut la hiérarchie
prend `sort=score`, qui ordonne sur la valeur numérique. Et sur
`sort=availability`, un profil qui n'a rien déclaré est rangé en dernier, jamais
traité comme disponible aujourd'hui : `NULLS LAST` est ici une règle métier, pas
un détail de SQL.

### 2.1 Retiré — le tri par nom

**`sort=name` a été retiré le 8 septembre 2026.** Il ordonnait le catalogue par
`lastName`, puis `firstName`.

Il ne figure pas parmi les critères professionnels énumérés dans votre
courriel, et nous ne trouvons pas de phrase qui le justifie. Le raisonnement
est déjà écrit ailleurs dans le dossier, et il s'applique ici : un patronyme
est un indicateur reconnu d'origine. Nous avions retiré le nom de la recherche
libre le 2 septembre pour cette raison (`note-criteres-de-filtrage.md` §2.1) ;
laisser dans l'interface un bouton « trier par nom » revenait à garder par
l'ordre d'affichage ce que nous avions retiré du filtre.

L'objection tient en une phrase — un tri ne retire personne du résultat, il ne
fait que le réordonner — et nous l'avions nous-mêmes retenue jusqu'ici. Elle ne
survit pas à la pagination : un recruteur qui ne regarde que la première page
voit systématiquement la même tranche alphabétique de patronymes. L'ordre
d'affichage produit alors une sélection de fait, sans qu'aucun filtre n'ait été
posé.

Effet dans le code : `CATALOGUE_SORTS` ne porte plus la valeur, l'énumération
d'`openapi.yaml` non plus, le sélecteur de `CataloguePage.tsx` ne l'offre plus,
et un test échoue désormais si `firstName` ou `lastName` réapparaît dans un
`ORDER BY`.

Ce que devient un lien déjà partagé qui porte `?sort=name`, vérifié plutôt que
supposé : l'interface l'ouvre normalement — son analyseur d'URL ne reconnaît
pas la valeur et retombe sur l'ordre par défaut, si bien que le navigateur
n'émet jamais la requête. Un appel direct à l'API, lui, reçoit un
`400 validation_error` nommant les quatre valeurs admises, comme pour tout
paramètre de requête hors domaine. Nous n'avons pas fait d'exception tolérante
pour cette valeur-là : il n'y a qu'une façon d'échouer dans cette API.

### 2.2 La disponibilité — ajoutée au modèle le 10 septembre

Cette section disait, jusqu'au 10 septembre, que la disponibilité n'existait pas
au modèle et qu'il n'était pas de notre ressort de l'inventer. Elle a été
arbitrée depuis, et ajoutée : `Profile.availability`, énumération
`AvailabilityStatus` à quatre valeurs — `IMMEDIATE`, `WITHIN_ONE_MONTH`,
`WITHIN_THREE_MONTHS`, `LATER` — migration
`20260910123717_add_profile_availability`.

Trois choix méritent d'être écrits :

- **La colonne est nullable, et le reste.** Un profil créé avant cette
  migration n'a rien déclaré ; lui attribuer une valeur par défaut mettrait une
  affirmation dans la bouche du candidat. Le formulaire porte donc une option
  « Non renseignée », et c'est elle qui est retenue tant que le candidat ne
  choisit pas.
- **L'ordre de l'énumération _est_ le classement.** PostgreSQL range une
  énumération par ordre de déclaration ; les quatre valeurs sont déclarées du
  plus tôt au plus tard, si bien que `ORDER BY availability ASC` est l'ordre
  professionnel sans expression `CASE` ni colonne de rang à tenir en cohérence.
  Un test unitaire tient l'ordre côté `@profils-actifs/shared`, où le même
  tableau est recopié pour l'interface.
- **Le filtre est un égal, pas un « au plus tard ».** `availability=IMMEDIATE`
  rend les profils qui ont déclaré cette valeur-là, et aucun profil sans
  déclaration — quelle que soit la valeur demandée. La liste déroulante est
  alimentée par `GET /recruiter/catalogue/facets`, qui rend les
  disponibilités **dans l'ordre de l'énumération et non par effectif** : c'est
  une échelle, et la classer par popularité la ferait lire comme un palmarès.

Index correspondant, colonne pour colonne :
`Profile_availability_updatedAt_id_idx` sur `(availability, "updatedAt" DESC, id)`.

## 3. Aucun critère de popularité, ni dérivé, ni indirect

Vérifiable, et pas seulement affirmé :

- **`InteractionType` ne comporte pas de variante `LIKE`** — le modèle ne peut
  pas compter ce qu'il n'enregistre pas (`packages/db/prisma/schema.prisma`).
- **Aucune structure rendue par l'API ne porte de compteur d'audience** : ni
  vues, ni favoris agrégés, ni contacts reçus. `CatalogueProfile` ne les
  expose pas parce qu'ils n'existent nulle part.
- **Aucun `ORDER BY` du catalogue ne référence une table d'interactions.** Les
  quatre tris du §2 ne touchent que `Profile`.
- **`favoritesOnly` porte sur les seules actions du recruteur appelant**, jamais
  sur un cumul entre recruteurs. Un candidat n'est jamais classé selon le nombre
  de recruteurs qui l'ont retenu — ce serait précisément une mesure de
  popularité.

Un point mérite d'être nommé plutôt que laissé à une lecture attentive de
« même indirect » : `GET /recruiter/catalogue/facets` ordonne bien par un
compte décroissant. Ce compte range **le contenu d'une liste déroulante** —
secteurs, villes, compétences — par le nombre de profils qui les portent, pour
que le recruteur voie d'abord les filtres qui rendent des résultats. Il classe
des catégories, jamais des personnes, et il n'intervient pas dans l'ordre du
catalogue. Même remarque pour `topSectorsReached` des tableaux de bord, qui
agrège par secteur.

## 4. Un profil modifié pendant qu'un recruteur pagine

**Ce que nous garantissons.** L'ordre est total : deux parcours complets du
catalogue sur des données inchangées rendent la même séquence, sans doublon,
sans manquant, et d'un effectif égal au nombre de profils que les règles de
visibilité autorisent. C'est ce que démontrent les deux fichiers joints.

**Ce que nous ne garantissons pas.** Un instantané qui traverse les pages. Une
écriture survenue entre deux requêtes de page déplace le profil concerné dans
l'ordre : avec un tri par date de mise à jour il remonte en tête, les lignes
suivantes glissent d'un rang, et le recruteur voit un profil deux fois pendant
qu'un autre lui échappe.

**Ce que nous en faisons.** Nous ne l'empêchons pas : une pagination par
`OFFSET` ne peut pas le promettre, et le remède — une pagination par curseur —
change la forme du contrat d'API que trois domaines consomment déjà. Nous le
documentons ici, et le §4 de `EW-9-tri-comparaison.txt` le provoque exprès pour
montrer exactement ce que le recruteur voit. Le jour où ce sera arbitré, le
travail sera court : `("updatedAt", "id")` est déjà une clé unique, donc déjà un
curseur valide.

À la démonstration, une phrase suffit : l'ordre est stable, la fenêtre ne l'est
pas, et c'est une propriété de la pagination par décalage, pas un défaut du
tri.

## 5. Les critères de filtrage disponibles — sommaire

Le détail, avec la justification de chacun et la liste de ce qui a été retiré,
est dans `note-criteres-de-filtrage.md`. En bref, dix paramètres :
`q` (recherche libre, hors nom et prénom), `sector`, `location`, `skills`,
`certifiedOnly`, `minScore`, `hasVideo`, `availability`, `favoritesOnly`, plus
`page`/`limit` plafonnés à 20 profils par page côté serveur.

Le fil public de profils ne porte **aucun** filtre. L'espace d'administration
ne filtre que sur le statut de modération, qui n'est pas un critère de
sélection de candidats.

## 6. Ce qui reste ouvert

- **`minScore` et `sort=score`** au regard du §7.9.3 — question posée à Florine
  Pontaillac le 4 septembre, sans réponse à ce jour. Elle porte autant sur le
  filtre que sur le tri, et nous la reposons ici.
- **La journalisation des recherches** — aucune trace n'est conservée des
  critères ni des ordres employés. Hors échéance, mais c'est ce qui manquerait
  le jour où la question se pose.
