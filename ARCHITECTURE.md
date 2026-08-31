# Architecture Décisions

Document des décisions architecturales majeures pour ProfilsActifs.

## Sommaire

1. [Monorepo Turborepo](#monorepo-turborepo)
2. [Verticales Fonctionnelles](#verticales-fonctionnelles)
3. [Database Schema](#database-schema)
4. [Authentication & Authorization](#authentication--authorization)
5. [API Design](#api-design)
6. [Frontend Architecture](#frontend-architecture)
7. [Error Handling](#error-handling)
8. [Security](#security)

---

## Monorepo Turborepo

### Décision

Utiliser un **monorepo Turborepo** avec packages séparés (`api`, `web`, `shared`, `db`).

### Raison

- **Partage de types** : `@profils-actifs/shared` garantit consistency entre frontend et backend
- **Orchestration** : `turbo run dev` lance tous les services en parallèle
- **Build cache** : Turborepo met en cache les builds, accélère CI/CD
- **Scalabilité** : Facile d'ajouter des packages (webhooks, workers, CLI, etc)
- **Monocommandes** : `npm test`, `npm build` orchestre tout

### Alternatives Rejetées

- **Separate repos** : Découplage trop fort, sync difficile entre schémas DB et types frontend
- **Monolith unique** : Pas de réutilisabilité de code, tout dans une couche

---

## Verticales Fonctionnelles

### Décision

Organiser par **verticale fonctionnelle** (A, B, C, D) plutôt que par couche (frontend, backend).

Chaque équipe possède :
- Frontend React pour son domaine
- Backend Express + routes API correspondantes
- Intégration DB pour son contexte

### Raison

**Évite les blocages S2** : Au lieu d'attendre les routes API du backend, chaque verticale est autonome.

Exemple :
- Domain B (Profils) : route `POST /profiles/me` + composant React ProfileForm + table Profile schema
- Domain D (Recruteur) : route `GET /interactions` + composant RecruiterDashboard + tables Interaction

### Structure

```
packages/api/src/
├── routes/
│   ├── auth.ts         (Domain A)
│   ├── profiles.ts     (Domain B)
│   ├── certification.ts (Domain C)
│   └── recruiter.ts    (Domain D)
├── services/           (logique métier par domain)
├── controllers/        (handlers par domain)
└── middleware/         (partagé : auth, errors, etc)

packages/web/src/
├── pages/
│   ├── Auth/           (Domain A)
│   ├── Profile/        (Domain B)
│   ├── Certification/  (Domain C)
│   └── Recruiter/      (Domain D)
└── components/         (réutilisables ou par domain)
```

---

## Database Schema

### Décision

**PostgreSQL + Prisma** avec un schéma relationnel normalisé.

### Principes

1. **Relations explicites** : tout a un PK + FKs clairs
2. **Soft deletes** : colonnes `isModerated`, `isActive` plutôt que DELETE physique (audit trail)
3. **Timestamps** : `createdAt`, `updatedAt` partout
4. **Indexes** : sur colonnes fréquemment recherchées (role, email, sector, location, status)
5. **Enums** : PostgreSQL enums natifs (UserRole, CertificationStatus, etc)

### Tables Clés

```
User → (1:1) Profile (applicant)
     → (1:1) RecruiterProfile (recruiter)
     → (1:N) Video
     → (1:N) CertificationAttempt
     → (1:N) Answer
     → (1:N) Notification

Profile → (M:N) Skill via ProfileSkill
        → (M:N) Interaction (recipient)

CertificationQuestion → (1:N) CertificationOption
                     → (1:N) Answer
```

### Avoid

- Dénormalisation (résultats en colonnes JSON) sauf si vraiment nécessaire
- **No soft deletes si possible** : plutôt supprimer les relations cleanly
- Migrations complexes : préférer des migrations incrémentales

---

## Authentication & Authorization

### Décision

**JWT-based stateless authentication** avec 3 rôles :

- **APPLICANT** : accès profil personnel, questionnaire, notifications
- **RECRUITER** : catalogue, favoris, contacts
- **ADMIN** : modération, gestion questionnaire, dashboards

### Flow

1. **Register** : `POST /auth/register` → hash password + créer User → retourner JWT
2. **Login** : `POST /auth/login` → vérifier email + password → retourner JWT
3. **Protected routes** : middleware `requireAuth()` + `requireRole('ADMIN')`

### Implementation

```typescript
// middleware/auth.ts
export const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded;
  next();
};

export const requireRole = (role: UserRole) => (req, res, next) => {
  if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
  next();
};
```

### Tokens

- **Payload** : `{ id, email, role, iat, exp }`
- **Expiry** : 7 jours (env var `JWT_EXPIRY`)
- **Secret** : `JWT_SECRET` en env (changé en prod)

### Security

- Password stored as **bcrypt hash** (salt rounds: 12)
- **Never return password** en API
- JWT refresh tokens : non implémentés S1, envisager S2 si besoin

---

## API Design

### Décision

**RESTful API** avec spec **OpenAPI 3.0**.

### Principes

1. **Verbes HTTP corrects** :
   - GET : lecture (sans side effects)
   - POST : création
   - PATCH : modification partielle
   - DELETE : suppression

2. **Namespacing** :
   - `/api/auth/...` → Domain A
   - `/api/profiles/...` → Domain B
   - `/api/certification/...` → Domain C
   - `/api/recruiter/...` ou `/api/interactions/...` → Domain D

3. **Pagination** :
   - Query params : `?page=1&limit=20`
   - Response : `{ data: [...], pagination: { page, limit, total, pages } }`
   - **Default limit** : 20 (hardcoded pour feed profils)

4. **Erreurs** :
   ```json
   {
     "error": "validation_error",
     "message": "Email is required",
     "statusCode": 400
   }
   ```

5. **IDs** : UUIDs (Prisma `cuid()`) — unguessable, URL-safe

### Versioning

- **Single version** : no `/v1/` suffix pour S1-S2
- Si breaking change futur : `/api/v2/...` new routes alongside old

### Documentation

- OpenAPI spec : `packages/api/openapi.yaml`
- Swagger UI : `http://localhost:3000/api/docs` (à implémenter avec swagger-ui-express)
- Postman collection : auto-genérée depuis OpenAPI

---

## Frontend Architecture

### Décision

**React 18** avec TypeScript, organisé par features (Domain-based folder structure).

### Structure

```
packages/web/src/
├── main.tsx
├── App.tsx
├── services/
│   ├── api.ts        (Axios instance + interceptors)
│   └── auth.ts       (JWT management)
├── hooks/
│   ├── useAuth.ts
│   ├── useProfile.ts
│   └── useNotifications.ts
├── context/
│   ├── AuthContext.tsx
│   └── NotificationContext.tsx
├── pages/
│   ├── Login.tsx
│   ├── Profile/
│   │   ├── ProfileView.tsx
│   │   ├── ProfileEdit.tsx
│   │   └── VideoUpload.tsx
│   ├── Certification/
│   │   ├── QuestionnaireStart.tsx
│   │   ├── QuestionForm.tsx
│   │   └── Results.tsx
│   ├── RecruiterDashboard.tsx
│   └── 404.tsx
├── components/
│   ├── ProfileCard.tsx
│   ├── VideoPlayer.tsx
│   ├── Badge.tsx
│   └── (shared UI)
└── types/
    ├── index.ts  (imported from @profils-actifs/shared)
```

### State Management

- **No Redux S1** : Context API suffisant pour auth + notifications
- **React Query (optional)** : considérer S2 pour cache intelligent des profils

### API Integration

```typescript
// services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.VITE_API_URL || 'http://localhost:3000/api',
});

// Add JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

---

## Error Handling

### Backend

1. **Validation errors** (400) : Zod schemas
   ```typescript
   const RegisterSchema = z.object({
     email: z.string().email(),
     password: z.string().min(8),
   });
   ```

2. **Auth errors** (401, 403) : JWT parsing, permissions
3. **Not found** (404) : Resource doesn't exist
4. **Server errors** (500) : Unhandled exceptions logged

### Error Middleware

```typescript
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    error: err.name || 'internal_error',
    message: err.message || 'Internal server error',
    statusCode: err.statusCode || 500,
  });
});
```

### Frontend

- Global error boundary (React)
- Toast notifications pour UX
- Retry logic pour network errors

---

## Security

### CORS

```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### Helmet

```typescript
import helmet from 'helmet';

app.use(helmet()); // Security headers
```

### Input Validation

- **All endpoints** : Zod schema validation
- **Database** : Prisma prevents SQL injection
- **Frontend** : HTML entity encoding (React default)

### Sensitive Data

- ❌ Never return passwords
- ❌ Never log JWT tokens
- ❌ Never commit `.env` files
- ✓ Hash passwords (bcrypt)
- ✓ Use HTTPS in production
- ✓ Rotate JWT secrets regularly

---

## Deployment

### Not Scope S1-S2

Mais prévoir pour l'avenir :

- **Backend** : Node.js on Heroku, Railway, or self-hosted
- **Frontend** : Vercel, Netlify, or self-hosted
- **Database** : Managed PostgreSQL (Heroku Postgres, Supabase, Railway)
- **Migrations** : `prisma migrate deploy` in CI/CD

---

## Performance Considerations

### Database

- Indexes sur colonnes de filtrage (role, sector, location, status)
- Pagination obligatoire (max 20 items/page)
- Avoid N+1 : utiliser `include` / `select` dans Prisma

### API

- Rate limiting
- Gzip compression
- Cache headers sur ressources statiques (videos, badges)

### Frontend

- Code splitting par route (React.lazy)
- Lazy load videos (iframe)
- Minification + bundling (Vite)

---

## Testing Strategy

### Backend

- **Unit tests** : services, validators
- **Integration tests** : routes with DB (Jest + Supertest)
- **Coverage** : Aim for >80%

### Frontend

- **Component tests** : React Testing Library
- **Integration tests** : user flows
- **E2E** : optional S2 (Cypress / Playwright)

### CI/CD

- Run tests on every PR
- Block merge if coverage drops
- Deploy main to staging automatically

---

## Future Considerations (S2+)

- WebSocket pour notifications en temps réel
- File uploads directs (S3 / Cloud Storage)
- Email notifications
- Analytics dashboard
- Bulk operations (admin)
- Advanced search (Elasticsearch)

---

**Document versioning** : v1.0 — Initial architecture, 2026-08-31
