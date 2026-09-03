# ProfilsActifs

Plateforme JEB de valorisation des compétences pour demandeurs d'emploi.

**Référence** : JEB/DNI/2026-003 | **Équipe** : 4 personnes

---

## 📋 Architecture

Monorepo Turborepo avec 4 packages :

```
profils-actifs/
├── packages/
│   ├── api/              - Backend Express + TypeScript
│   ├── web/               - Frontend React + Vite
│   ├── shared/             - Types, constantes et helpers partagés
│   └── db/                - Prisma schema, migrations, seed
├── docs/legal/            - Notes de conformité (âge, consentement)
├── package.json           (root workspace)
├── turbo.json              (orchestration)
└── README.md
```

**Approche** : chaque domaine fonctionnel possède son bout de code front _et_ back
(verticale, pas par couche) — voir la table ci-dessous. Ça évite les blocages entre
équipes sur un projet de deux semaines.

---

## 🎯 Domaines Verticaux

| Domaine | Propriétaire           | Responsabilité                                                                                                                                                                     |
| ------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A**   | Auth & Notifications   | 3 rôles, inscription/connexion, middleware de permissions, notification du candidat lors d'une interaction recruteur — arbitre le contrat d'API en cas de désaccord entre domaines |
| **B**   | Profils & Vidéo        | CRUD profil, vidéos en iframe, page profil publique, feed paginé, modération                                                                                                       |
| **C**   | Questionnaire          | Questions/options/pondérations, sauvegarde et reprise, scoring, badge — chemin critique du projet                                                                                  |
| **D**   | Recruteur & Dashboards | Catalogue + filtrage, favoris, prise de contact, tableaux de bord recruteur/admin                                                                                                  |

Chaque propriétaire livre ses routes Express _et_ les pages React qui les consomment.

---

## 🔧 Stack Technique

- **Runtime** : Node.js ≥ 20
- **Backend** : Express 5 + TypeScript
- **Frontend** : React 19 + Vite
- **Database** : PostgreSQL + Prisma 7 (via un driver adapter — voir `packages/db/prisma.config.ts`)
- **Testing** : Jest + Supertest (`api`), Jest + Testing Library (`web`)
- **Orchestration** : Turborepo 2
- **CI/CD** : GitHub Actions
- **Sécurité** : Helmet, bcrypt, JWT, rate-limiting, validation Zod

> **Deux compilateurs TypeScript cohabitent volontairement.** `typescript` est
> aliasé sur `@typescript/typescript6` (nécessaire pour ts-jest et
> typescript-eslint, qui n'ont pas encore rattrapé l'API programmatique de TS7),
> et le vrai compilateur natif 7.x est aliasé sur `typescript-native`. Un `tsc`
> nu est donc ambigu dans ce workspace : chaque `build` de package appelle
> `node ../../scripts/tsc-native.js`, jamais `tsc` directement.

---

## 📁 Structure de Chaque Package

### `packages/api/`

```
api/
├── src/
│   ├── app.ts                - Assemble l'app Express (middlewares, routers) — testable sans écouter
│   ├── index.ts               - Point d'entrée : importe app.ts et appelle app.listen
│   ├── config/                - env.ts (validation Zod des variables), prisma.ts, security.ts
│   ├── middleware/             - auth, rate-limit, gestion d'erreur uniforme
│   ├── routes/                 - montage des routers par domaine
│   ├── controllers/            - handlers de route, orchestration pure
│   ├── services/                - logique métier, seul endroit qui parle à Prisma
│   ├── validators/               - schémas Zod (validators/common.ts pour les primitives partagées)
│   ├── types/                    - extension globale de Request (req.user)
│   └── utils/                     - http-error.ts, current-user.ts, etc.
├── test/                       - tests d'intégration Supertest
├── openapi.yaml                 - le contrat d'API
├── package.json
└── tsconfig.json
```

### `packages/web/`

```
web/
├── src/
│   ├── main.tsx                - Point d'entrée
│   ├── App.tsx                  - Déclaration des routes (React Router)
│   ├── components/              - UI réutilisable
│   ├── pages/                    - Un dossier par domaine (Auth, Profile, Certification, Recruiter, Admin)
│   ├── context/                  - AuthContext (session, token, login/register/logout)
│   ├── hooks/                     - useAuth, useAsyncResource, etc.
│   ├── services/                   - client API (axios), stockage du token
│   ├── validators/                  - schémas Zod côté client
│   ├── types/                        - types partagés avec les réponses API
│   └── utils/
├── index.html
├── vite.config.ts
├── package.json
└── tsconfig.json
```

### `packages/shared/`

```
shared/
├── src/
│   ├── constants/           - MIN_APPLICANT_AGE, CONSENT_TEXT_VERSION, pagination, etc.
│   ├── types/                - interfaces partagées (User, Profile, API...)
│   ├── utils/                 - helpers purs (pagination, séries)
│   ├── node/                   - loadRepoEnv() et tout ce qui touche `node:` — voir encadré ci-dessous
│   └── index.ts                - point d'entrée principal (browser-safe)
├── package.json
└── tsconfig.json
```

> **`@profils-actifs/shared` reste 100% browser-safe** — aucun import `node:`, aucune
> dépendance à `@prisma/client` sur le point d'entrée principal. Les helpers qui ont
> besoin de Node (comme `loadRepoEnv`, utilisé par l'API, `prisma.config.ts`, le seed
> et Jest) vivent séparément sous `@profils-actifs/shared/node`, pour que le bundle
> web ne tire jamais accidentellement du code Node dans le navigateur.

### `packages/db/`

```
db/
├── prisma/
│   ├── schema.prisma         - Schéma de base
│   └── migrations/            - générées par Prisma, versionnées
├── src/
│   ├── client.ts               - instance PrismaClient dédiée aux scripts (seed, CLI)
│   └── seed.ts, seed-data/      - jeu de données de démo, upserts idempotents
├── prisma.config.ts             - config CLI Prisma 7 (schema path, DATABASE_URL) — charge l'env lui-même
└── package.json
```

---

## 🚀 Setup & Commandes

### Installation

```bash
npm install
```

`postinstall` compile automatiquement `@profils-actifs/shared` puis génère le client
Prisma — un clone frais a tout ce qu'il faut sans étape manuelle.

### Développement

```bash
# Démarrer API + Web en parallèle (watch mode)
npm run dev

# Un seul package
npm run dev -w @profils-actifs/api
npm run dev -w @profils-actifs/web
```

| Service        | URL                              |
| -------------- | -------------------------------- |
| Front          | http://localhost:5173            |
| API            | http://localhost:3000/api        |
| Sonde de santé | http://localhost:3000/api/health |
| pgAdmin        | http://localhost:5050            |

Prérequis : `docker compose up -d`, puis `npm run db:migrate && npm run db:seed`
(voir [Database](#database)). L'API refuse de démarrer sans `.env.local` — copiez
`.env.example` et adaptez si besoin. La validation se fait avec Zod au démarrage
(`config/env.ts`) : toute variable manquante ou mal formée liste précisément ce qui
cloche, plutôt qu'un plantage silencieux plus tard.

### Database

```bash
docker compose up -d       # Postgres :5432, pgAdmin :5050
npm run db:migrate          # prisma migrate dev, après toute modif de schema.prisma
npm run db:seed
npm run db:studio -w @profils-actifs/db   # GUI dans le navigateur
```

Le seed crée un jeu de démonstration (candidats, recruteurs, un admin, compétences,
vidéos, historique d'interactions) avec des upserts déterministes — rejouable sans
créer de doublons, et refuse de tourner avec `NODE_ENV=production`.

| Rôle           | Compte                                 | Mot de passe   |
| -------------- | -------------------------------------- | -------------- |
| Administrateur | `admin@profils-actifs.fr`              | `Password123!` |
| Recruteur      | `recruteur@profils-actifs.fr`          | `Password123!` |
| Candidat       | `amina.berthier@example.fr` (+ autres) | `Password123!` |

### Tests

```bash
npm run test                 # tout le monorepo (via Turborepo)
npm run test -- --coverage

# Un seul package
npm test -w @profils-actifs/api

# Un seul fichier / un seul test (Jest)
npm test -w @profils-actifs/api -- src/services/notifications.test.ts
npm test -w @profils-actifs/api -- -t "nom du test"
```

Une partie de la suite `api` fait des tests d'intégration contre une vraie base
partagée (`maxWorkers: 1` dans `jest.config.js`) — Postgres doit être up et migré
avant de lancer les tests.

### Linting & Formatting

```bash
npm run lint
npm run format          # prettier --write sur tout le repo
npm run format:check
```

---

## 🔐 Authentification & inscription (Domain A)

JWT stateless, bearer token (`Authorization: Bearer <token>`), expiration 7 jours.
Mots de passe hashés en bcrypt (12 tours de sel) — voir `packages/api/src/services/password.ts`.

| Méthode | Route                | Détail                                                                                                                                                            |
| ------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST    | `/api/auth/register` | `email`, `password` (8+ car.), `firstName`, `lastName`, `birthDate`, `role` (`APPLICANT` ou `RECRUITER` uniquement — un compte `ADMIN` n'est jamais auto-inscrit) |
| POST    | `/api/auth/login`    | `email`, `password`                                                                                                                                               |
| GET     | `/api/auth/me`       | Utilisateur courant (route protégée)                                                                                                                              |

**Vérification d'âge** : l'inscription est refusée sans `birthDate`, et si l'âge
calculé est inférieur à `MIN_APPLICANT_AGE` (16 ans, `@profils-actifs/shared`). Les
comptes créés avant cette vérification (jeux de démo compris) ne sont pas affectés
rétroactivement — voir `docs/legal/accounts-without-birthdate.md`.

Côté web : `/inscription` et `/connexion` (hors du layout applicatif authentifié),
gérées par `AuthContext` (`login`, `register`, `logout`).

### Consentement vidéo

La publication d'une vidéo journalise le consentement (`acceptedAt`,
`consentTextVersion` sur `Video`) plutôt qu'une simple case cochée — voir
`packages/api/src/services/video-consent.ts`. Les vidéos étant intégrées en iframe
(YouTube/Vimeo), il n'existe aucun fichier propre à la plateforme : la révocation
supprime directement la ligne `Video`, détaillé dans
`docs/legal/video-consent-revocation.md`.

---

## 🧑‍💼 Espace recruteur & tableaux de bord (Domain D)

### Parcours web

| Page                           | Route                     | Rôles            |
| ------------------------------ | ------------------------- | ---------------- |
| Tableau de bord recruteur      | `/recruteur`              | RECRUITER, ADMIN |
| Catalogue des profils          | `/recruteur/catalogue`    | RECRUITER, ADMIN |
| Ma sélection (favoris)         | `/recruteur/favoris`      | RECRUITER, ADMIN |
| Historique des interactions    | `/recruteur/interactions` | RECRUITER, ADMIN |
| Tableau de bord administrateur | `/admin`                  | ADMIN            |

Les filtres du catalogue vivent dans l'URL (`?sector=...&skills=React,SQL&sort=score`) :
une recherche est partageable, marquable et restaurée par le bouton retour.

### Endpoints

| Méthode    | Route                                    | Rôle métier                                       |
| ---------- | ---------------------------------------- | ------------------------------------------------- |
| GET        | `/api/recruiter/catalogue`               | Liste paginée et filtrée des profils              |
| GET        | `/api/recruiter/catalogue/facets`        | Valeurs de filtres réellement disponibles         |
| GET        | `/api/recruiter/favorites`               | Catalogue restreint à la sélection                |
| PUT/DELETE | `/api/recruiter/favorites/{applicantId}` | Ajout/retrait d'un favori (idempotent)            |
| GET        | `/api/recruiter/dashboard`               | Statistiques du recruteur connecté                |
| GET        | `/api/interactions`                      | Interactions envoyées ou reçues, paginées         |
| POST       | `/api/interactions`                      | Consultation, favori ou prise de contact          |
| PATCH      | `/api/interactions/{id}`                 | `isViewed` (destinataire) / `isFavorite` (auteur) |
| GET        | `/api/admin/dashboard`                   | Statistiques plateforme                           |

### Règles métier

- Un profil rejeté par la modération ou porté par un compte désactivé n'apparaît
  jamais dans le catalogue ; un profil en attente de modération reste visible.
- Pas d'adresse e-mail dans le catalogue : le recruteur passe par `POST /interactions`,
  ce qui trace le contact et notifie le candidat (5 messages max par candidat / 24h).
- Consultations dédupliquées sur 24h : les tableaux de bord comptent des personnes,
  pas des chargements de page.
- Les favoris ne sont pas supprimés : le retrait bascule `isFavorite`, l'historique
  reste auditable. `isViewed` appartient au destinataire, `isFavorite` à l'auteur.

---

## 📋 Contrat d'API

**Fichier** : `packages/api/openapi.yaml` — tous les endpoints, payloads et réponses
y sont écrits avant la première ligne de code métier, et mis à jour dans le même
changement que toute route/payload/code de retour qui bouge côté implémentation.
C'est la seule référence exhaustive des routes ; ce README ne duplique pas la liste
complète pour éviter qu'elle diverge du contrat réel.

Il n'y a pas de Swagger UI (`/api/docs`) — le contrat se lit directement dans le
fichier ou via n'importe quel client OpenAPI pointé dessus.

**Principes** : RESTful, stateless (JWT), pagination à 20 items/page (server-side,
`resolvePageRequest`/`buildPaginationMeta` dans `@profils-actifs/shared`), erreurs
structurées `{ error, message, statusCode }` avec un code `error` faisant partie de
l'union `ApiErrorCode` partagée — jamais inventé à la volée côté client ou serveur.

---

## 🗄️ Schéma Base de Données

**Fichier** : `packages/db/prisma/schema.prisma`

**Tables principales** : `User`, `Profile`, `Video`, `Skill`/`ProfileSkill`,
`CertificationQuestion`/`CertificationOption`/`CertificationAttempt`/`Answer`,
`Interaction`, `Notification`, `ModerationLog`.

**Particularités** :

- Soft deletes : `Profile.moderationStatus` / `User.isActive` plutôt qu'un `DELETE`
  — sauf les vidéos, supprimées pour de vrai à la révocation du consentement (voir
  plus haut).
- Certains champs existent en base avant que le contrat les expose (le schéma porte
  un commentaire expliquant pourquoi à chaque fois) — la préservation de cet écart
  documenté est volontaire, ne pas le faire disparaître silencieusement.
- Clés étrangères en `onDelete: Cascade`, `createdAt`/`updatedAt` sur toutes les tables.
- `ModerationLog` trace chaque changement de statut de modération — jamais un
  écrasement silencieux de `Profile.moderationStatus`.

---

## 🔐 Sécurité

- **Mots de passe** : bcrypt, 12 tours de sel
- **JWT** : signé avec `JWT_SECRET`, expiration 7 jours, `Authorization: Bearer <token>`
- **Permissions** : `requireAuth` + `requireRole(...roles)` (variadique) sur chaque
  route qui en a besoin — exemple : `requireRole('ADMIN')`
- **CORS** : piloté par `CORS_ORIGIN`, restrictif par défaut
- **Rate limiting** : 100 requêtes / 15 min par IP
- **Validation des entrées** : Zod sur tous les payloads, `Prisma` échappe les requêtes SQL
- **XSS** : headers Helmet + échappement par défaut de React
- **Auto-hébergé uniquement** : aucune dépendance à un service tiers payant ou à
  compte propriétaire (pas de stockage objet managé, pas de base hébergée, pas
  d'auth-as-a-service commercial) — l'app tourne entièrement en local depuis un
  clone + les instructions d'installation

---

## 📊 Séquencement Livrables

### Semaine 1 (revue de projet)

Socle commun (DB, contrat d'API, auth, CI/CD), domaine A (login/register), domaine B
(feed + profils fictifs), domaine C (questionnaire au moins présenté), démo + positionnement produit.

### Semaine 2 (revue technique puis keynote)

Domaine A complet (notifications), domaine B complet (modération), domaine C complet
(questionnaire + badge — renfort dès la fin de la semaine 1 sur ce domaine, chemin
critique du projet), domaine D complet (catalogue, dashboards), documentation.

> Le planning détaillé (répartition par personne, échéances précises, preuves
> attendues) vit dans le document de recette de l'équipe, pas dans ce README —
> demandez le dernier en date plutôt que de vous fier à des dates figées ici.

---

## 📝 Points d'Attention

- **Questionnaire = chemin critique.** Concentre la plus grande logique métier
  (sauvegarde/reprise, pondérations, scoring, badge). Renfort prévu en fin de
  semaine 1, pas d'isolement en semaine 2.
- **La démo pèse autant que le code.** Une présentation en semaine 1, une keynote
  en semaine 2 — désigner un responsable de présentation dès le départ.
- **Hors périmètre** : ce n'est pas un réseau social — pas de likes, partages,
  compteurs d'engagement, fil d'actualité, notifications temps réel (le polling
  est acceptable, pas les WebSockets).

---

## 🔍 Conventions de Code

### TypeScript

- Mode strict activé, pas de `any` (préférer `unknown`)
- Les types de domaine viennent de `@prisma/client` (`UserRole`, etc.), jamais
  redéclarés à la main
- Imports relatifs avec l'extension `.js` explicite (ESM) : `from '../services/jwt.js'`
- Paramètres et types de retour de fonction toujours explicites

### Nommage

- **Routes API** : kebab-case (`/auth/register`, `/profiles/{id}/videos`)
- **Variables/fonctions** : camelCase
- **Champs base de données** : snake_case (conversion automatique par Prisma)
- **Enums** : PascalCase, valeurs en ALL_CAPS

### Commits

```
<type>(<domain>): <description>
```

Types : `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
Domaines : `auth`, `profiles`, `videos`, `certification`, `recruiter`, `notifications`, `admin`, `db`

Exemple : `feat(auth): add age verification to registration`

---

## 🤝 Collaboration

- **Monorepo Turborepo** : `npm run dev` orchestre tous les services
- **Contrat d'API d'abord** : pas de surprise d'intégration entre front et back
- **Branche de feature** : `git checkout -b feat/domaine-description`
- **PRs** : 1 reviewer minimum avant merge

---

## 📞 Contacts Ministériels

- **Florine Pontaillac** — Conseillère juridique
- **Thomas Vignal** — Conseiller numérique
- **Benjamin Sellami** — Conseiller en communication

---

## 📚 Ressources

- [Prisma Docs](https://www.prisma.io/docs/)
- [Express Docs](https://expressjs.com/)
- [React Docs](https://react.dev)
- [OpenAPI 3.0 Spec](https://spec.openapis.org/oas/v3.0.3)
- [Turborepo](https://turbo.build)

---

Pour le détail des décisions d'architecture et les pièges connus du toolchain, voir
`.claude/CLAUDE.md` — ce README couvre l'onboarding, `CLAUDE.md` couvre le pourquoi.
