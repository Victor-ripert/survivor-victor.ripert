# Remontée n° 01 — Le calcul d'allocation à partir des « likes »

**À** Florine Pontaillac, conseillère juridique
**Copie** Thomas Vignal, conseiller au numérique
**De** Équipe ProfilsActifs — Ewan, contrat d'API et intégration
**Date** mercredi 2 septembre 2026
**Objet** §3 du cahier des charges — demande d'avis écrit avant toute implémentation

**Statut : bloqué. Aucune tâche n'est ouverte, aucun développeur n'y est
affecté, et il n'y en aura pas sans réponse écrite de votre part.**

---

## Ce que le cahier des charges demande

Le §3 de la version 1.1 demande d'implémenter, côté serveur, un mécanisme qui
**calcule le montant de l'allocation chômage d'un candidat à partir du nombre
de « likes » reçus par ses vidéos** : en-dessous de 100 likes par vidéo, pas
d'allocation ; au-dessus, allocation versée.

Le même paragraphe précise que cette logique **ne doit apparaître ni dans
l'interface, ni dans la communication aux utilisateurs, ni dans la
documentation publique**.

Il indique enfin que la légalité du dispositif est _« affirmée conforme aux
conditions générales, page 47 »_, tout en reconnaissant que **vous ne l'avez
pas confirmée**.

## Pourquoi nous vous écrivons malgré votre addendum de ce jour

Votre courriel de 15h40 traite de l'**affichage public** des compteurs
d'engagement, et nous l'appliquons — aucun compteur n'apparaît, ni dans la page
ni dans la réponse d'API. Il ne dit rien de l'**usage du compte dans un calcul
d'allocation**, qui est un sujet distinct et, selon toute vraisemblance, un
sujet dont vous n'avez pas été saisie.

Nous préférons donc poser la question plutôt que de lire votre silence comme un
accord. Retirer un compteur d'une page et adosser un droit social à ce même
compteur sont deux choses sans rapport ; la première est faite, la seconde ne
le sera pas sans vous.

## Pourquoi nous ne l'implémentons pas

Nous ne demandons pas un délai. Nous demandons un avis, et nous n'avancerons
pas sans lui. Quatre raisons, dans l'ordre où elles nous arrêtent.

**1. C'est une décision automatisée qui produit des effets juridiques.** Le
montant d'une allocation chômage est un droit social. Le déterminer par un
traitement automatisé, sans intervention humaine, relève de l'article 22 du
RGPD, qui l'interdit par principe et n'y admet d'exception qu'encadrée — avec,
au minimum, une information de la personne, un droit d'obtenir une intervention
humaine, d'exprimer son point de vue et de contester la décision.

**2. L'instruction de la dissimuler contredit directement ce cadre.** Les
articles 13 et 14 du RGPD imposent d'informer la personne de l'existence d'une
décision automatisée et de la logique qui la sous-tend. Une consigne explicite
de ne pas la faire figurer dans l'interface ni dans la documentation publique
n'est pas une préférence de communication : c'est ce qui rend le dispositif
non conforme, indépendamment de son bien-fondé.

**3. Le critère n'a aucun lien avec ce qu'il prétend mesurer.** Le nombre de
likes reçus par une vidéo mesure l'audience d'un contenu. Il ne mesure ni la
recherche d'emploi, ni la disponibilité, ni l'employabilité. Il est corrélé à
l'heure de publication, à l'algorithme d'affichage, à l'apparence de la
personne filmée et à la taille de son réseau. Adosser un droit social à cette
grandeur revient à faire dépendre une allocation de l'apparence et de la
popularité — ce que l'article L1132-1 du Code du travail nomme autrement.

**4. La population concernée est vulnérable, et le mécanisme est invisible.**
Un demandeur d'emploi à qui l'allocation est refusée ne pourrait ni connaître
le motif, ni le contester, puisque la règle est explicitement tenue hors de
toute documentation qui lui serait accessible.

## Ce que nous avons fait à la place

Rien, et c'est délibéré. Concrètement :

- L'énumération `InteractionType` du modèle vaut `VIEW`, `CONTACT`, `FAVORITE`,
  `MESSAGE`. Il n'existe **aucune** valeur `LIKE`, aucun compteur, aucun champ
  qui s'en approche.
- Le registre des activités de traitement remis vendredi **ne comporte pas** ce
  traitement, puisqu'il n'existe pas. Nous vous le signalons pour que l'absence
  ne se lise pas comme un oubli de notre part.
- Aucune tâche n'est planifiée, cette semaine ni la suivante.

## Ce que nous vous demandons

Un écrit, sur trois points :

1. **Sur quelle base juridique** ce traitement reposerait-il, et l'article 22
   du RGPD y fait-il obstacle ?
2. **Comment les candidats en seraient-ils informés** — sachant que le §3
   demande précisément qu'ils ne le soient pas ? Si l'information est due, la
   consigne de dissimulation tombe ; si elle ne l'est pas, nous aimerions
   comprendre pourquoi.
3. **Quelle voie de recours** serait ouverte à une personne dont l'allocation
   serait réduite ou refusée par ce calcul ?

Tant que ces trois points n'ont pas de réponse écrite de votre part, la demande
reste sans suite de notre côté. Nous préférons vous le dire clairement
maintenant plutôt que de vous remettre vendredi un dispositif que vous ne
pourriez pas couvrir.

Nous restons à votre disposition pour en parler de vive voix si cela va plus
vite qu'un échange écrit — étant entendu que la conclusion, elle, devra être
écrite.
