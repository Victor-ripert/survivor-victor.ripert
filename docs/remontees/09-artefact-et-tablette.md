# Remontée n° 09 — L'artefact de build ne s'exécute pas sur une tablette

**À** Thomas Vignal, conseiller au numérique
**Copie** Jean-Eudes Berlier, Ministre · **De** Équipe ProfilsActifs — Ewan
**Date** jeudi 3 septembre 2026, matin
**Objet** Procédure de récupération avant le journal de 13h00

**Statut : réponse demandée avant 11h00. Sans arbitrage, nous préparons l'option B.**

---

Votre procédure est claire et nous la mettons en place : tout sur la branche par
défaut, un workflow qui construit l'application de bout en bout, l'artefact
publié, et le vert exigé sur le dernier commit. Rien là-dedans ne nous pose de
difficulté.

**Une phrase du courriel du Ministre en pose une**, et elle n'est pas de votre
fait : « je veux avoir votre travail sur ma tablette en arrivant au studio ».

## 1. Ce qu'un artefact contient, et ce qu'il ne contient pas

L'artefact contient du code compilé : le serveur, l'interface construite, le
schéma de base et son jeu de données de départ. Pour qu'il **tourne**, il faut
Node 20, un PostgreSQL, les migrations appliquées et le seed exécuté.

Une tablette ne fait rien de tout cela. Elle sait afficher une page web servie
par une machine ; elle ne sait pas héberger le service.

Ce n'est pas une lacune de notre livraison : c'est la différence entre un
artefact de build et un déploiement. Le cahier des charges nous interdit par
ailleurs de dépendre d'un hébergeur payant (§8.3), donc il n'y a pas d'adresse
publique à ouvrir depuis le studio.

## 2. Les deux options qui marchent réellement

**Option A — un ordinateur fait tourner le service, la tablette le consulte.**
Un portable exécute la procédure, se connecte au même réseau que la tablette, et
la tablette ouvre l'adresse du portable. Cela demande trois choses : que le
réseau du studio autorise deux appareils à se voir, que le portable reste
allumé, et **que quelqu'un de l'équipe soit sur place**. Nous le pouvons si on
nous le demande avant 11h00.

**Option B — la vidéo de démonstration.** Moins de trois minutes, sous-titrée,
sans musique, elle fonctionne sans réseau et sur n'importe quel appareil. C'est
ce que nous préparons par défaut.

Nous ne recommandons pas de tenter l'option A sans répétition sur place.

## 3. Deux limites à connaître même en option A

- **Les vidéos des profils sont hébergées chez YouTube.** Sans accès internet, ou
  si le réseau du studio filtre les plateformes vidéo, les profils s'affichent et
  les vidéos non. C'est la première ligne de notre plan B.
- **La plateforme limite les requêtes à cent par quart d'heure et par adresse.**
  C'est une protection contre les sollicitations automatiques. Un journaliste qui
  clique vite l'atteint en quelques minutes, et tout devient lent. Nous pouvons
  relever ce plafond pour la démonstration, mais il faut le décider avant, pas
  pendant.

## 4. Ce que nous vous demandons

1. **Confirmez l'option retenue avant 11h00**, A ou B.
2. Si c'est A, dites-nous **qui est sur place** et si le réseau du studio
   autorise deux appareils à communiquer.
3. Confirmez que **le contenu de l'artefact** vous convient : serveur compilé,
   interface construite, migrations, jeu de données de démonstration, et une
   procédure d'installation d'une page.

Nous préférons vous écrire cela à 9h qu'à 12h55.
