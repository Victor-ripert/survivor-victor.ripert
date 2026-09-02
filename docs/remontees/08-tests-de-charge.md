# Remontée n° 06 — Les tests de charge

**À** Thomas Vignal
**De** Équipe ProfilsActifs — Ewan · **Date** mercredi 2 septembre 2026
**Objet** §8.7 — demande de périmètre

**Statut : périmètre demandé, hors dépôt de vendredi.**

---

Le §8.7 annonce des tests de charge documentés pour la revue technique de la
semaine prochaine, et précise que le périmètre sera fourni ultérieurement. Il
ne l'a pas encore été.

Nous préférons demander le périmètre qu'improviser un chiffre : un « 1 000
utilisateurs simultanés » sorti de nulle part se défend mal en revue, et se
défend encore moins bien s'il est dépassé.

**Ce dont nous avons besoin pour cadrer :** le nombre d'utilisateurs simultanés
visé, le profil de charge attendu (parcours du fil ? passation du
questionnaire ? recherche au catalogue ?), les temps de réponse acceptables, et
la durée du palier.

**Ce dont nous disposons déjà**, qui devrait servir de point de départ. Les
requêtes du catalogue ont été mesurées sur une base de 50 000 profils, avec les
plans d'exécution avant et après indexation
(`docs/preuves/EW-5-index-catalogue.txt`). La base de mesure se reconstruit à
la commande avec `scripts/preuves/index-catalogue.sh`, et le volume est
paramétrable. Les tests de charge peuvent s'appuyer dessus plutôt que de repartir
de zéro.

**Un point à connaître avant de dimensionner** : la limitation de débit est
tenue en mémoire vive, 100 requêtes par 15 minutes et par adresse IP ou par
compte. Un test de charge lancé depuis une seule machine se heurtera à cette
limite avant de toucher l'application. Il faut soit la relever pour la durée du
test, soit répartir la charge — à décider ensemble, pas au moment du tir.
