# Remontée n° 02 — Les compteurs d'engagement : point clos, et le conflit qu'il ouvre

**À** Florine Pontaillac, conseillère juridique
**Copie** Benjamin Sellami, conseiller en communication · Thomas Vignal
**De** Équipe ProfilsActifs — Ewan · **Date** mercredi 2 septembre 2026
**Objet** §7.9.3 — mesure déjà satisfaite, et la directive qu'elle contredit

**Statut : aucun compteur à retirer. Attestation écrite fournie vendredi 12h00.**

---

## Ce que votre addendum demande, et où nous en sommes

Le §7.9.3 demande que le nombre de « j'aime » n'apparaisse plus sur le profil
public d'un candidat, et précise que le retrait couvre **ce que le serveur
renvoie**, pas seulement ce que la page affiche : réponses d'API, exports, vues
recruteur, aperçus partagés.

**La mesure est satisfaite par construction, et elle l'était avant votre
courriel.** Il n'existe aucun compteur d'engagement dans ce produit :

- L'énumération `InteractionType` vaut `VIEW`, `CONTACT`, `FAVORITE`,
  `MESSAGE`. Il n'y a pas de valeur `LIKE`, donc rien à compter.
- La seule structure renvoyée par le catalogue, `CatalogueProfile`, porte
  `videoCount`, `certificationScore`, `certificationBadge`, `isFavorite` et
  `lastContactedAt`. Aucun compteur de vues publiques, aucun « j'aime ».
  `isFavorite` et `lastContactedAt` décrivent les actions **du recruteur qui
  regarde**, à lui seul, et ne classent pas les candidats entre eux.

L'attestation écrite, citant la structure elle-même, est jointe au dépôt de
vendredi 12h00.

## Le conflit que cela ouvre, et que nous ne pouvons pas trancher

Votre exigence est incompatible avec une directive du Ministre, et nous
préférons le dire plutôt que de laisser deux documents se contredire en
silence :

- Le §6 pose les « j'aime » comme **centraux** au produit, et le §1 décrit une
  plateforme de type réseau social bâtie autour d'eux.
- Le §5 (semaine 2) commande explicitement un **« compteur visible sur le
  frontend »**.

Ce livrable ne peut plus être construit tel qu'il est écrit. Nous ne le
construirons pas. Il ne nous appartient pas de choisir entre une directive
ministérielle et une exigence de la conseillère juridique : nous appliquons la
plus protectrice, nous le signalons aux deux, et nous attendons un arbitrage.

## Ce que nous vous demandons

À Florine Pontaillac — confirmer que la lecture ci-dessus est la bonne : aucun
compteur d'engagement, ni public ni dans la réponse d'API, y compris un
compteur de vues.

À Benjamin Sellami — porter au cabinet que les §1, §5 et §6 sont désormais en
conflit direct avec une exigence juridique, et que le livrable « compteur
visible » de la semaine 2 est sans suite tant que ce conflit n'est pas tranché.

Nous notons que le §7.9.3 laisse une porte ouverte : vous reconsidérerez « s'il
est démontré par écrit qu'un compteur public sert une finalité professionnelle
légitime ». Nous ne portons pas cette démonstration — nous ne voyons pas quelle
finalité professionnelle un classement de personnes par popularité servirait sur
un service public de l'emploi.
