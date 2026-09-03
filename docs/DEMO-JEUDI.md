# Démonstration du jeudi 3 septembre — déroulé

**Branche** `feat/demo-ready` (main + `feat/api-contract-and-deliverables` + `feat/certif-improvment`,
puis durcissement et refonte de l'interface). Tout est vert, vérifié le 3 septembre au matin : build,
lint, Prettier, **275 tests API, 95 tests web, 18 tests partagés**.

> **Ce document décrit la démonstration interne de quinze minutes.** Pour la remise de midi au
> Ministre et le journal de 13h00, la démonstration se fait en douze étapes numérotées :
> [`livrables/guide-d-utilisation.md`](livrables/guide-d-utilisation.md). Les pannes probables et
> la phrase à dire sont dans [`livrables/plan-b-direct.md`](livrables/plan-b-direct.md).
>
> **Avant toute démonstration publique, rejouer le seed** : cinq écarts sur les données de
> démonstration sont relevés au §3 de
> [`livrables/recensement-du-3-septembre.md`](livrables/recensement-du-3-septembre.md), dont dix URL
> de vidéos qui pointent vers des clips musicaux et non vers des présentations de candidats.

## Démarrer

```bash
docker compose up -d postgres
npm install
npm run db:migrate && npm run db:seed        # migrate deploy suffit sur une base déjà migrée
npm run dev                                  # API :3000, web :5173
```

Avant une démonstration depuis une seule machine, monter `RATE_LIMIT_MAX_REQUESTS` dans
`.env.local` (100 requêtes par quart d'heure et par IP se consomment vite avec plusieurs onglets).

## Comptes

| Rôle                 | Compte                        | Mot de passe   |
| -------------------- | ----------------------------- | -------------- |
| Administratrice      | `admin@profils-actifs.fr`     | `Password123!` |
| Recruteuse           | `recruteur@profils-actifs.fr` | `Password123!` |
| Candidate certifiée  | `amina.berthier@example.fr`   | `Password123!` |
| Candidat mineur (17) | `lucas.morel@example.fr`      | `Password123!` |

`recruteur2@profils-actifs.fr` existe aussi, mais **ne le donnez à personne** : il n'a ni
interaction ni favori, son tableau de bord et sa sélection sont vides.

## Scénario (quinze minutes)

1. **Fil public, sans compte** — `http://localhost:5173/` : 20 profils par page côté serveur, aucun
   filtre, vidéos chargées au clic et une seule lecture à la fois. Lucas Morel (17 ans) n'y figure
   pas ; il est dans le catalogue recruteur, et `/api/profiles/<son id>` répond 404.
2. **Inscription** — `/inscription` : une date de naissance à 15 ans est refusée avant tout envoi,
   puis par l'API. Un recruteur n'a pas de champ date de naissance.
3. **Espace candidat** — créer le profil, ajouter une compétence, puis une vidéo YouTube : la case
   de consentement est obligatoire (texte v1.0 journalisé avec la vidéo), la vidéo naît « en
   attente de validation ». Le profil public reste en 404 pour un visiteur.
4. **Modération** — connexion administratrice, `/admin/moderation-videos` : refuser la vidéo avec un
   motif (obligatoire, dix caractères) ; le candidat lit le motif dans son espace. Valider le profil
   sur `/admin/moderation-profils` : il apparaît sur le fil.
5. **Certification** — `/certification` : 100 questions, chaque réponse enregistrée au fil de l'eau ;
   fermer l'onglet, revenir, la reprise se fait à la première question sans réponse. Depuis
   `/admin/questionnaire`, modifier le poids d'une question active : la passation en cours est
   annulée et le candidat en est informé (notification et bandeau).
6. **Recruteur** — catalogue filtré par compétences, favoris, prise de contact (notifiée au
   candidat), tableau de bord.
7. **Preuves techniques** — `/api/health` (200, puis 503 après `docker compose stop postgres`),
   `/api/docs/` (Swagger UI sans CDN), `curl /api/profiles?page=9999` → 200 et `data: []`.

## Ce qui reste volontairement hors de la démonstration

- Le dépôt direct de vidéo répond `501 not_implemented` : la démonstration passe par l'intégration
  YouTube/Vimeo, comme le prévoit la note vidéo (MA-10).
- Le parcours 16-18 (AD-9) s'arrête à l'exclusion du fil public ; la vidéo d'un mineur validée par la
  modération est visible des recruteurs connectés.
- Aucune condition générale n'est publiée : relecture juridique en cours (§7.6).
