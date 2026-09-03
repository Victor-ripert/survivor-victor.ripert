# Guide d'utilisation — faire la démonstration soi-même

**Pour** Jean-Eudes Berlier · **Le** jeudi 3 septembre 2026 · **Tâche** JT-5
**Douze étapes, dans l'ordre. Une capture par étape.**

---

## Avant de commencer

L'adresse à ouvrir est **http://localhost:5173**. Elle suppose que la
plateforme tourne sur la machine — voir la note remise à Thomas Vignal si
l'écran reste blanc.

Tous les comptes de démonstration utilisent le même mot de passe :
**`Password123!`**

| Rôle            | Compte à utiliser             |
| --------------- | ----------------------------- |
| Candidate       | `amina.berthier@example.fr`   |
| Recruteuse      | `recruteur@profils-actifs.fr` |
| Administratrice | `admin@profils-actifs.fr`     |

> **N'utilisez pas `recruteur2@profils-actifs.fr`** : ce compte n'a aucun
> historique, ses écrans sont vides.

**Les profils sont fictifs.** Treize personnages inventés. Aucune donnée réelle.

---

## Les douze étapes

### 1 — Le fil public, sans être connecté

Ouvrez `http://localhost:5173`. Dix profils s'affichent, sans avoir à créer de
compte. C'est le cœur du produit : un demandeur d'emploi est visible sans que le
recruteur ait à s'inscrire pour le trouver.

> _Capture_ : `docs/preuves/guide/01-fil-public.png`

### 2 — Ouvrir un profil

Cliquez sur **Amina Berthier**. Vous arrivez sur sa page publique : sa
présentation, ses compétences, son badge de certification et sa vidéo.

> _Capture_ : `docs/preuves/guide/02-profil-public.png`

### 3 — Lancer la vidéo

Cliquez sur l'aperçu de la vidéo. **Rien ne démarre tout seul** : c'est un choix,
la page ne charge rien chez YouTube tant que le visiteur ne l'a pas demandé. Une
seule vidéo joue à la fois.

> _Capture_ : `docs/preuves/guide/03-video-lancee.png`
> Si la vidéo ne démarre pas, voir le plan B, ligne 1.

### 4 — Se connecter comme candidate

Allez sur **Connexion**, entrez `amina.berthier@example.fr` et le mot de passe.

> _Capture_ : `docs/preuves/guide/04-connexion.png`

### 5 — L'espace de la candidate

Allez sur **Mon profil**. C'est ce que la candidate maîtrise : sa présentation,
ses compétences, ses vidéos et l'état de chacune — publiée, en attente, refusée.

> _Capture_ : `docs/preuves/guide/05-mon-profil.png`

### 6 — Le questionnaire, et la reprise

Allez sur **Certification**. Cent questions, une à la fois. Répondez à trois
questions, puis **rechargez la page** : vous repartez de la quatrième. Rien
n'est perdu, et rien n'est stocké dans le navigateur — la reprise vit sur le
serveur.

C'est la démonstration la plus convaincante du produit. Prenez-y trente
secondes.

> _Capture_ : `docs/preuves/guide/06-questionnaire-reprise.png`

### 7 — Se connecter comme recruteuse

Déconnectez-vous, reconnectez-vous avec `recruteur@profils-actifs.fr`.

> _Capture_ : `docs/preuves/guide/07-connexion-recruteur.png`

### 8 — Le catalogue et ses filtres

Allez sur **Catalogue des profils**. Filtrez par compétence ou par secteur : le
nombre de résultats change, et **l'adresse de la page change avec lui** — une
recherche se partage par simple copier-coller.

> _Capture_ : `docs/preuves/guide/08-catalogue-filtre.png`

### 9 — Mettre de côté, puis prendre contact

Mettez un profil en favori, puis prenez contact avec le candidat. Vous ne verrez
jamais son adresse e-mail : le message passe par la plateforme, et le candidat
est prévenu.

> _Capture_ : `docs/preuves/guide/09-prise-de-contact.png`

### 10 — Le tableau de bord de la recruteuse

Allez sur **Tableau de bord recruteur**. Trente jours d'activité. Les
consultations comptent des personnes, pas des chargements de page.

> _Capture_ : `docs/preuves/guide/10-tableau-recruteur.png`

### 11 — La modération, côté administration

Reconnectez-vous avec `admin@profils-actifs.fr`, allez sur **Modération des
vidéos**. Refusez une vidéo : le motif est obligatoire. C'est la garantie
centrale du produit — **rien n'est publié avant d'avoir été validé, et rien
n'est refusé sans explication écrite.**

> _Capture_ : `docs/preuves/guide/11-moderation-video.png`

### 12 — Le candidat lit le motif

Reconnectez-vous comme la candidate, allez sur **Mon profil** : le motif du
refus y est affiché. La boucle est fermée.

> _Capture_ : `docs/preuves/guide/12-motif-cote-candidat.png`

---

## Pour la personne qui prend les captures

Les captures se prennent **ce matin, sur la version qui tournera à midi**, et
jamais sur une version antérieure.

1. Base propre : `npm run db:seed` avant la première capture.
2. Fenêtre en 1280 × 800, une seule fois pour les douze — un guide dont les
   captures changent de taille se lit mal.
3. **Si un libellé à l'écran ne correspond pas au texte de l'étape, corrigez le
   texte de l'étape, pas la capture.** C'est le Ministre qui lira ces phrases à
   l'antenne.
4. Aucune donnée personnelle réelle ne doit apparaître, y compris dans la barre
   d'adresse ou un onglet ouvert à côté.
