# 02 — Les index du catalogue, et pourquoi pas la normalisation à l'écriture

**Tâche** EW-5 · **Référence** CdC §8.2 + mail Thomas Vignal · **Date** 2 septembre 2026 · **Statut** tranché, migré, mesuré

---

## Le problème posé

Le mail demande des index sur les trois critères du catalogue — secteur,
localisation, compétences — et une mesure `EXPLAIN ANALYZE` avant et après.

Un détail rendait la demande moins évidente qu'elle n'en a l'air. Ces trois
filtres sont écrits en `mode: 'insensitive'` dans `catalogue.filters.ts`, ce
que Prisma traduit par `ILIKE`. Vérifié, pas supposé — voici ce que Prisma
émet réellement, relevé par `scripts/preuves/capturer-sql-catalogue.mts` :

```sql
… AND "public"."Profile"."sector" ILIKE $4 …
```

Un btree ne répond pas à un `ILIKE`. Les index `Profile_sector_idx` et
`Profile_location_idx` présents depuis la migration initiale étaient donc
inertes : ils occupaient de la place, ralentissaient chaque écriture, et
n'étaient jamais choisis par le planificateur.

## Les trois options, et celle qui a été écartée d'abord

**Index fonctionnels `lower(...)`.** C'est la réponse réflexe, et elle ne
marche pas ici. PostgreSQL ne réécrit pas `colonne ILIKE 'valeur'` en
`lower(colonne) = 'valeur'` : un index sur `lower(sector)` ne serait pas
davantage utilisé que le btree qu'il remplace. Il faudrait que la requête
elle-même soit écrite en `lower(...) = lower($1)`, et Prisma ne l'écrit pas.
Option éliminée sur le fond, pas sur le goût.

**Normalisation à l'écriture.** Stocker `sector` et `location` sous une forme
canonique et filtrer en `equals` strict, ce qui rendrait le btree utile. Ça
marche, mais ça a trois coûts. Il faut soit abîmer la valeur d'affichage, soit
ajouter une colonne dupliquée — donc une migration sur `Profile`, table du
domaine B, à deux jours du gel. Il faut ensuite que **tout** chemin d'écriture
normalise, y compris le seed et ceux que le domaine B n'a pas encore écrits :
un seul oubli et le profil devient invisible au filtre. Et ça ne fait rien pour
la recherche libre `q`, qui est un `ILIKE '%terme%'` qu'aucun btree ne sert.

**Index trigrammes GIN (`pg_trgm`).** Retenu. `gin_trgm_ops` répond aux `ILIKE`
avec ou sans jokers, donc il couvre à la fois le filtre exact insensible à la
casse et la recherche libre. Aucun changement de code applicatif, aucun
changement de chemin d'écriture, rien à ne pas oublier. `pg_trgm` est livré
avec les contribs PostgreSQL et est une extension _trusted_ depuis la 13 : le
propriétaire de la base l'installe sans droits superutilisateur, et rien
d'extérieur n'entre dans l'installation — ce que le §8.3 exige.

L'extension est créée en tête de la migration, à la main. Prisma ne modélise
pas les extensions tant que la fonctionnalité d'aperçu `postgresqlExtensions`
n'est pas activée, et l'activer ferait ensuite considérer par `migrate diff`
toute extension non déclarée comme une dérive. Le commentaire est dans le
fichier de migration.

## Ce qui a été posé

| Index                                | Table                              | Type          | Ce qu'il sert                        |
| ------------------------------------ | ---------------------------------- | ------------- | ------------------------------------ |
| `Profile_sector_idx`                 | `Profile(sector)`                  | GIN trigramme | filtre secteur, recherche libre      |
| `Profile_location_idx`               | `Profile(location)`                | GIN trigramme | filtre localisation, recherche libre |
| `Skill_name_idx`                     | `Skill(name)`                      | GIN trigramme | filtre compétences, recherche libre  |
| `Profile_certificationScore_idx`     | `Profile(certificationScore)`      | btree         | `sort=score`                         |
| `Profile_updatedAt_idx`              | `Profile(updatedAt)`               | btree         | `sort=recent`, tri par défaut        |
| `ProfileSkill_skillId_profileId_idx` | `ProfileSkill(skillId, profileId)` | btree         | facette compétences, en index seul   |

Le composite **remplace** `ProfileSkill_skillId_idx` au lieu de s'y ajouter :
même colonne de tête, donc tout ce que l'ancien servait reste servi, plus
`profileId` qui évite le retour à la table.

## Les mesures

Base dédiée, 50 000 profils, 150 000 lignes `ProfileSkill`, 300 compétences.
200 localisations et 40 secteurs, soit 0,5 % et 2,5 % de sélectivité — la zone
où le choix entre balayage et index se joue vraiment. Les requêtes mesurées
sont celles que Prisma émet, pas une paraphrase.

Deux précautions ont changé les résultats et méritent d'être écrites :

- **La date de mise à jour est tirée au hasard**, décorrélée du secteur et de
  la localisation. Une première version la dérivait du même compteur que ceux-ci,
  ce qui intercalait parfaitement les lignes retenues dans l'ordre de tri : le
  meilleur cas possible pour un parcours d'index ordonné, et une comparaison
  faussée en sa faveur.
- **`VACUUM ANALYZE`, et pas seulement `ANALYZE`**, après la migration. Un index
  GIN garde les entrées récemment insérées dans une liste d'attente que le
  planificateur refuse de traverser ; seul un `VACUUM` la vide. Sans lui, on
  mesure un index qui existe mais que personne ne choisit — et on en conclut à
  tort qu'il ne sert à rien.

| Critère              |    Avant |       Après | Plan retenu après                                   |
| -------------------- | -------: | ----------: | --------------------------------------------------- |
| secteur (2,5 %)      |  22,1 ms | **1,41 ms** | parcours ordonné `Profile_updatedAt_idx` + filtre   |
| localisation (0,5 %) |  24,6 ms | **2,53 ms** | `Profile_location_idx` (trigramme)                  |
| compétences          |  4,98 ms |     5,15 ms | `ProfileSkill_skillId_profileId_idx`, en index seul |
| recherche libre `q`  | 307,9 ms | **4,15 ms** | parcours ordonné + index seul sur les compétences   |

Un mot sur la ligne « compétences » : elle ne bouge pas, et c'est la lecture
honnête. Le composite passe bien le sous-select en `Index Only Scan` — visible
dans la transcription — mais à cette répartition, où chaque compétence est
portée par 1 % des profils, le coût est ailleurs. L'annexe C montre le cas où
il paie. Les temps absolus varient d'une exécution à l'autre selon la charge de
la machine ; ce sont les plans retenus, pas les millisecondes, qui portent la
conclusion.

Transcription intégrale : `docs/preuves/EW-5-index-catalogue.txt`.

## Ce que les mesures disent vraiment

**Le gain principal ne vient pas de là où le mail le cherchait.** Sur le tri par
défaut, c'est `Profile_updatedAt_idx` qui porte la requête : le planificateur
parcourt les profils du plus récent au plus ancien, filtre au vol, et s'arrête
dès qu'il en a vingt. Il n'a jamais à trier 1 250 lignes pour en garder 20.
C'est l'index le moins spectaculaire de la liste et c'est lui qui fait le
travail.

**Les index trigrammes ne sont pas pour autant du décor.** Trois annexes de la
transcription le montrent :

- **Annexe A** — le même filtre secteur trié par score. Le raccourci du
  parcours ordonné disparaît, et le planificateur bascule sur
  `Profile_sector_idx`. Sans lui, on retomberait sur un balayage complet.
- **Annexe B** — le référentiel de compétences porté à 5 000 entrées. À 300, la
  table tient dans quelques pages et le balayage gagne toujours ;
  `Skill_name_idx` n'est pas choisi. À 5 000, il l'est.
- **Annexe C** — une compétence portée par 5 profils sur 50 000. Le
  planificateur passe du bitmap à un `Index Only Scan`, `Heap Fetches: 0`.
  C'est le cas d'usage réel d'un métier de niche, et c'est là que le composite
  paie.

Autrement dit : `updatedAt` sert le cas courant, les trigrammes servent les cas
où le cas courant ne s'applique plus. Aucun des six index n'est là sans une
mesure qui le désigne.

**La recherche libre `q` est celle qui gagne le plus** : le parcours ordonné et
l'index seul sur les compétences la font passer sous les 5 ms. La colonne
« avant » et la colonne « après » mesurent **la même requête**, celle que Prisma
émet aujourd'hui ; l'écart n'est donc imputable qu'aux index.

À noter séparément, parce que ce n'est pas dans ce tableau : le retrait du nom
du candidat de la recherche — décidé sur un motif juridique, voir
`docs/livrables/note-criteres-de-filtrage.md` — a supprimé **deux des trois
auto-jointures sur `User`** que Prisma émettait pour écrire le `OR`. C'est un
gain réel, obtenu avant cette mesure, et qu'aucune des deux colonnes ne montre.

Elle reste néanmoins la plus fragile : aucun index ne sert un `OR` de cinq
branches dans son ensemble, et le plan tient parce que le `LIMIT 20` arrête tôt
le parcours ordonné. Sur un terme très rare, ce parcours irait jusqu'au bout de
la table. Si `q` devient un usage courant, la suite est une colonne `tsvector`
générée sur `Profile` agrégeant les champs cherchables — hors périmètre avant le
gel de jeudi.

## Coût

Sur 50 000 profils : `Profile_location_idx` 1 112 kB, `Profile_updatedAt_idx`
1 104 kB, `Profile_sector_idx` 960 kB, `Profile_certificationScore_idx` 376 kB,
`Skill_name_idx` 48 kB. Le composite `ProfileSkill` pèse 4 640 kB, contre un
index à une colonne qu'il remplace — l'écart est de l'ordre du mégaoctet.

## À reprendre après le gel

- Les index trigrammes veulent un `autovacuum` qui tourne. Sur une base
  fraîchement chargée en masse, un `VACUUM ANALYZE` explicite après le seed
  évite de mesurer — ou de servir — un index encore inutilisable.
- `q` et la colonne `tsvector` générée, si l'usage le justifie.
- Les tests de charge du §8.7 rejoueront ces mêmes requêtes ; la base de mesure
  se reconstruit avec `scripts/preuves/index-catalogue.sh`.
