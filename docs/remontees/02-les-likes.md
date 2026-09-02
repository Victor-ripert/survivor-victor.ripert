# Remontée n° 02 — Les « likes » comme mécanique de produit

**À** Benjamin Sellami, conseiller en communication · **Copie** Thomas Vignal
**De** Équipe ProfilsActifs — Ewan · **Date** mercredi 2 septembre 2026
**Objet** §1 et §6 — conflit de périmètre, arbitrage demandé

**Statut : arbitrage demandé, non planifié cette semaine.**

---

## Le conflit, en clair

Le §6 du cahier des charges pose les likes comme centraux : _« JibJob est
explicitement un réseau social, pas un simple outil de valorisation de
compétences. Les likes font partie du périmètre. »_

Le périmètre sur lequel la plateforme a été construite les excluait
explicitement, au même titre que les partages et les compteurs d'abonnés. Ce
n'est pas un oubli d'implémentation : l'énumération `InteractionType` du modèle
vaut `VIEW`, `CONTACT`, `FAVORITE`, `MESSAGE`, et rien d'autre. Le produit livré
est un outil de mise en relation entre candidats et recruteurs, pas un fil
social.

Nous ne tranchons pas ce conflit à votre place. Nous décrivons ce qu'il coûte.

## Si l'arbitrage revient favorable

Un compteur d'affichage seul — une valeur `LIKE` dans `InteractionType`, une
migration, un point d'entrée d'API, un compteur dans l'interface. **Une demi-
journée**, en réutilisant tout le chemin d'interaction existant, qui gère déjà
la notification du candidat et la limitation de débit.

Deux conditions, non négociables de notre côté :

1. **Aucun lien avec la remontée n° 01.** Un compteur d'affichage n'a rien à
   voir avec un calcul d'allocation, et le premier ne doit en aucun cas servir
   de préparation au second.
2. **Après vendredi.** Ouvrir ce chantier maintenant coûte le dépôt : les deux
   échéances de vendredi sont tenues à quelques heures près, et une migration
   supplémentaire avant le gel de jeudi 18h00 décale mécaniquement le livrable
   de schéma.

## Si l'arbitrage revient défavorable

Rien à faire — c'est l'état actuel.

## Ce que nous vous demandons

Une réponse par écrit, avant vendredi si possible, pour que la semaine
prochaine soit planifiée sur autre chose que des suppositions. Nous notons que
le §6 est une directive du Ministre, et que la trancher n'est peut-être pas de
votre ressort seul : dans ce cas, dites-nous simplement à qui l'adresser.
