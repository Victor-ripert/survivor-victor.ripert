# Remontée n° 04 — Le renommage en « JibJob »

**À** Benjamin Sellami · **Copie** Thomas Vignal
**De** Équipe ProfilsActifs — Ewan · **Date** mercredi 2 septembre 2026
**Objet** §1 — proposition de mise en œuvre en deux temps

**Statut : proposition à valider — renommage d'affichage seulement avant vendredi.**

---

## Ce que le renommage touche réellement

Le nom « ProfilsActifs » n'est pas seulement affiché. Il est dans le nom du
dépôt, dans les quatre paquets `@profils-actifs/*` et toutes leurs importations,
dans le nom de la base de données, dans les comptes de démonstration
(`admin@profils-actifs.fr`, `recruteur@profils-actifs.fr`), et dans les chaînes
de connexion des fichiers d'environnement.

Renommer l'ensemble avant vendredi, c'est toucher chaque fichier source du
dépôt, à deux jours d'un dépôt dont la recette porte sur des preuves
d'exécution. Le risque est réel et le gain en recette est nul : aucun critère
d'acceptation ne porte sur le nom technique.

## Ce que nous proposons

**Avant vendredi** — le nom de produit affiché devient « JibJob » : titre de
page, en-tête de l'interface, textes visibles par l'utilisateur. C'est ce qu'un
relecteur voit, et c'est fait en une heure sans toucher au code technique.

**La semaine prochaine** — alignement complet : dépôt, paquets, base, comptes
de démonstration, en une seule opération, avec la CI en garde-fou.

Nous notons que le titre du contrat d'API (`openapi.yaml`) est aussi un texte
visible : dites-nous s'il doit basculer dès vendredi ou attendre l'alignement.

## Ce que nous vous demandons

Une validation de ce découpage, ou une instruction contraire assumée. Si le nom
technique doit changer avant vendredi, nous le ferons — mais nous vous
signalerons alors quel livrable saute en échange, parce qu'il y en aura un.
