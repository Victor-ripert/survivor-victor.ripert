# Vidéo de démonstration — script, plan de tournage et sous-titres

**Pour** Jean-Eudes Berlier (sécurité en cas de coupure) · **Le** jeudi 3 septembre 2026 · **Tâche** JT-7
**Contraintes imposées** : moins de 3 minutes, horizontal, 1080p, sous-titrée, **sans musique**.

---

## Ce que ce document est, et ce qu'il n'est pas

C'est le script minuté, le plan de tournage et le fichier de sous-titres prêt à
charger. **L'enregistrement lui-même reste à faire** : il demande une capture
d'écran vidéo et une voix. Comptez trente minutes pour tourner, quinze pour
caler les sous-titres sur la voix réelle.

Le fichier de sous-titres est `video-demonstration.srt`, dans ce même dossier.
Ses horodatages correspondent au script ci-dessous et sont à réajuster sur la
prise réellement retenue.

---

## Réglages de capture

| Réglage     | Valeur                                               | Pourquoi                                                         |
| ----------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| Résolution  | 1920 × 1080, horizontal                              | Exigé par la régie                                               |
| Cadence     | 30 images/seconde                                    | Suffisant pour une capture d'écran, fichier deux fois plus léger |
| Durée cible | 2 min 45 s                                           | Une marge de 15 s sous le plafond de 3 minutes                   |
| Son         | Voix seule, aucune musique                           | La chaîne refuse tout ce qui porte des droits                    |
| Sous-titres | Fichier `.srt` incrusté                              | La régie diffuse son coupé                                       |
| Navigateur  | Fenêtre en 1920 × 1080, sans barre d'onglets visible | Aucune donnée personnelle à l'écran                              |

**Avant de tourner** : rejouer `npm run db:seed` pour repartir d'une base propre,
et vérifier que les vidéos de démonstration ont bien été remplacées (voir
`recensement-du-3-septembre.md` §3.1).

---

## Script minuté

| Temps       | À l'écran                                             | Voix                                                                                                                                                                 |
| ----------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00 – 0:12 | Titre sur fond uni                                    | ProfilsActifs. Une plateforme où un demandeur d'emploi se présente en vidéo, et où sa capacité à tenir un poste est évaluée de la même façon pour tous.              |
| 0:12 – 0:32 | Fil public, défilement lent                           | Voici le fil public. Dix profils, visibles sans créer de compte. Un recruteur n'a pas besoin de s'inscrire pour découvrir un candidat.                               |
| 0:32 – 0:52 | Page profil, clic sur la vidéo                        | Chaque profil porte une présentation, des compétences, un badge, et une vidéo. Rien ne se lance tout seul : la vidéo ne charge qu'au clic.                           |
| 0:52 – 1:17 | Questionnaire, trois réponses, rechargement           | La certification, c'est cent questions sur dix aptitudes. Chaque réponse est enregistrée aussitôt. Je recharge la page : on reprend exactement où on s'était arrêté. |
| 1:17 – 1:40 | Catalogue recruteur, application d'un filtre          | Côté recruteur : un catalogue, des filtres par métier, par ville, par compétence. L'adresse de la page suit la recherche, elle se partage telle quelle.              |
| 1:40 – 2:00 | Prise de contact, puis notification côté candidat     | Le recruteur prend contact sans jamais voir l'adresse du candidat. Le message passe par la plateforme, et le candidat en est averti.                                 |
| 2:00 – 2:25 | Modération d'une vidéo, saisie du motif, vue candidat | Rien n'est publié avant d'avoir été validé. Un refus exige un motif écrit, et le candidat lit ce motif dans son espace.                                              |
| 2:25 – 2:45 | Retour au fil public, plan fixe                       | Le dépôt direct des vidéos et le parcours des seize-dix-huit ans arrivent la semaine prochaine. Tout ce que vous venez de voir fonctionne aujourd'hui.               |

**Durée totale : 2 min 45 s.**

---

## Ce que la vidéo ne montre pas, et pourquoi

- **Le dépôt direct d'une vidéo** : il répond « pas encore disponible ». Le
  montrer prendrait vingt secondes pour illustrer une absence.
- **Le profil du candidat mineur** : il est hors du fil public, c'est le
  comportement attendu. Le filmer reviendrait à filmer une absence.
- **La police Marianne** : la charte l'impose pour les titres, mais ses
  fichiers ne nous ont pas été transmis et sa licence nous interdit de les
  verser dans le dépôt. L'interface filmée porte le reste de la charte — le
  bleu `#1B3A6B`, le bloc-marque — avec une linéale système sur les titres.

Ces trois points sont dits dans le prototype documenté. La vidéo ne les cache
pas, elle ne les met pas en scène.
