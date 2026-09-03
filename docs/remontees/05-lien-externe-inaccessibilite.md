# Remontée n° 05 — Une vidéo en lien externe ne peut pas être rendue inaccessible

**À** Florine Pontaillac, conseillère juridique
**Copie** Thomas Vignal, conseiller au numérique
**De** Équipe ProfilsActifs — Ewan · **Date** mercredi 2 septembre 2026
**Objet** §7.9.2 — la limite du mécanisme, déclarée avant la démonstration

**Statut : limite déclarée. Mesure appliquée à hauteur de ce qu'elle permet.**

---

## Pourquoi cette lettre plutôt qu'une capture

Vous écrivez que vous surveillerez ce point de près : une vidéo en attente ne
doit être **accessible par aucun moyen**, preuve en navigation privée à
l'appui, et — vos mots — « si la vidéo se lit, la mesure n'existe pas ».

Nous pouvons vous fournir une capture qui a l'air de répondre à cette exigence.
Nous préférons vous dire d'abord ce qu'elle prouve et ce qu'elle ne prouve pas,
parce qu'une capture cadrée pour rassurer serait exactement le genre de pièce
qui se retourne contre vous en contentieux.

## Ce qui est fait, et qui est vérifiable

Depuis ce soir, une vidéo en attente n'est plus servie par aucune de nos
routes. Ce n'est pas une affirmation : `docs/preuves/SOIR-3-video-inaccessible.txt`
balaie **toutes** les routes montées de l'API — catalogue, facettes, favoris,
tableaux de bord recruteur et administrateur, interactions, notifications — dans
les trois postures d'appel possibles (anonyme, recruteur, administrateur), et
vérifie pour chacune si l'adresse de la vidéo apparaît dans le corps renvoyé.
Trente lignes, trente fois « non ».

L'adresse de la ressource sur notre plateforme répond 404, et la capture en
navigation privée le montre.

## Ce qui n'est pas fait, et ne peut pas l'être avec ce mécanisme

La vidéo est un lien externe — YouTube, Vimeo ou Dailymotion, conformément au
§4.2 et au §8.5 qui recommandent l'intégration plutôt que le téléversement.
**Le contenu est déjà public chez l'hébergeur, indépendamment de nous.** Le
candidat l'y a déposé ; nous n'en détenons que l'adresse.

La transcription mesure ce point aussi, à la même seconde : interrogée
directement, l'adresse chez l'hébergeur répond 200.

Dit simplement : **nous maîtrisons la divulgation de l'adresse, pas l'existence
du contenu.** Quiconque connaît déjà le lien — le candidat, une personne à qui
il l'a envoyé, un moteur de recherche qui l'a indexé — peut lire la vidéo, et
aucune modification de notre code n'y changera quoi que ce soit.

## Ce que coûterait l'inaccessibilité réelle

Deux voies, et aucune ne tient dans la semaine :

**N'accepter que des liens non répertoriés.** Techniquement immédiat,
juridiquement faible : une adresse non répertoriée n'est pas protégée, elle est
seulement difficile à deviner. Cela déplace le problème sans le traiter, et
nous ne vous recommandons pas de fonder un avis dessus.

**Passer au téléversement local.** C'est la seule voie qui donne un contrôle
réel : le fichier est chez nous, nous le servons ou non. Elle rouvre
l'intégralité du §8.5 — plafond de 100 Mo appliqué côté serveur, vérification
du type par le contenu, stockage hors du répertoire applicatif, comportement en
cas de téléversement interrompu — plus le stockage, la bande passante et le
lecteur. C'est un chantier, pas un correctif.

## Ce que nous vous demandons

Nous appliquons la mesure à hauteur de ce que le mécanisme permet, et nous vous
le déclarons plutôt que de laisser croire à davantage. Deux questions :

1. Cette garantie — **aucune divulgation par la plateforme**, sans maîtrise de
   l'existence du contenu chez le tiers — vous suffit-elle pour la
   démonstration de demain et pour votre avis ?
2. Si non, laquelle des deux voies ci-dessus engageons-nous, sachant qu'aucune
   n'est disponible avant la démonstration ?

Nous notons enfin que le même raisonnement vaut pour la révocation du
consentement du §7.1 : supprimer la ligne `Video` retire le lien de chez nous,
la vidéo continue d'exister chez l'hébergeur. La preuve « répertoire de
stockage avant et après » que vous demandez ne s'applique pas telle quelle à
une intégration par lien, et ce point est traité dans le registre de traitement
comme dans la note vidéo.
