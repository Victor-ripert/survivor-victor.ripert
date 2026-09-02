# Remontée n° 04 — Les vidéos déjà consultées par un recruteur

**À** Florine Pontaillac, conseillère juridique
**De** Équipe ProfilsActifs — Ewan · **Date** mercredi 2 septembre 2026
**Objet** §7.9.2 — le choix que vous demandez, et celui que nous proposons

**Statut : décision prise, soumise à votre validation. Écrite dans la note vidéo du vendredi.**

---

## Ce que vous demandez

Le §7.9.2 exige que les vidéos déjà déposées basculent en attente de
validation. Pour celles **déjà consultées par un recruteur**, vous écrivez
explicitement que vous n'imposez pas la réponse — retirer, laisser, signaler —
mais que l'une des trois doit être **choisie**.

La voici, en trois lignes, comme demandé.

## Notre choix

**Les vidéos déjà consultées basculent en attente comme toutes les autres, et
l'historique d'interaction n'est pas touché.** Le recruteur qui avait vu la
vidéo voit désormais la fiche sans elle ; sa trace de consultation reste
intacte dans son tableau de bord.

Deux raisons, et elles tirent dans le même sens :

**Laisser la vidéo visible viderait la mesure de son sens.** Une modération
_a priori_ qui exempte le déjà-vu ne modère rien : il suffirait qu'un recruteur
ouvre une fiche pour figer son contenu hors contrôle.

**Retirer les `Interaction` déjà écrites falsifierait une trace d'audit.** Ces
lignes disent qu'à telle date, tel recruteur a consulté tel profil. C'est vrai,
c'est arrivé, et l'unique valeur d'un journal d'audit est d'être fidèle. Le
réécrire pour qu'il décrive un passé plus confortable serait pire que le
problème qu'on croirait résoudre — et ce serait, accessoirement, effacer une
donnée dont le candidat lui-même est destinataire.

## Ce que cela produit concrètement

|                                    | Avant la bascule        | Après                       |
| ---------------------------------- | ----------------------- | --------------------------- |
| La vidéo dans le catalogue         | visible                 | absente, jusqu'à validation |
| `videoCount` du profil             | la compte               | ne la compte plus           |
| Filtre `hasVideo`                  | fait remonter le profil | ne le fait plus remonter    |
| Trace de consultation du recruteur | présente                | **présente, inchangée**     |
| Tableau de bord du recruteur       | affiche la consultation | affiche la consultation     |

Le premier point est déjà en place : la preuve avant/après sur une vidéo
réellement en attente est dans `docs/preuves/SOIR-2-video-en-attente.txt`.

## Ce que nous vous demandons

Un accord, même d'une ligne. En son absence nous tenons ce choix, qui est écrit
et daté ; nous préférons qu'il soit validé plutôt que simplement constaté.
