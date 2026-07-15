# KeyNest Combined Progress

Last updated: July 8, 2026

Purpose: This file is a compact source document for ChatGPT or another assistant to understand the current state of the KeyNest project without reading every file first.

## Project Summary

KeyNest is an educational full-stack password manager project. It is being built as both an interview portfolio project and a long-term architecture learning lab.

The short-term goal is an interview-ready fullstack TypeScript MVP. The long-term goal is to use the project for practical growth toward senior fullstack engineering and hands-on software architecture.

## Current Positioning

KeyNest should present the developer as a frontend-heavy fullstack TypeScript engineer who can own realistic product features end to end.

The project should demonstrate:

- React and Next.js frontend ownership
- NestJS backend API design
- Secure authentication and authorization decisions
- Client-side encryption design
- MongoDB data modeling first, with PostgreSQL comparison later
- Validation, error handling, tests, Docker, and architecture documentation

## Current Stack

Frontend:

- Next.js
- React
- TypeScript
- Tailwind CSS
- React Hook Form
- Zod
- TanStack Query
- Zustand

Backend:

- NestJS
- TypeScript
- MongoDB planned first
- PostgreSQL comparison planned later
- Argon2 planned for password hashing
- JWT access tokens and refresh/session strategy still being decided
- OpenAPI / Swagger planned

Security:

- Client-side encryption
- Web Crypto API
- AES-GCM
- Key derivation
- Secure HttpOnly cookies
- Rate limiting
- Audit logging

DevOps:

- Docker and Docker Compose planned
- GitHub Actions planned

## Implemented Or Scaffolded

As of June 29, 2026:

- Nx monorepo scaffold exists.
- `apps/web` contains the initial Next.js app shell.
- `apps/api` contains the initial NestJS app shell.
- Shared libraries exist under `libs/types`, `libs/validation`, `libs/crypto`, and `libs/ui`.
- TypeScript strict mode, ESLint, and Prettier are configured.
- Backend module skeletons exist for auth, users, vault, credentials, sessions, and audit logs.
- Controllers, services, and DTO placeholder files exist for the backend modules.
- Project direction and 3-month roadmap are documented.
- Client-side encryption has an accepted ADR.
- Database design notes exist with core security constraints and open questions.
- Auth design learning notes exist from the first Q&A session.
- `POST /api/auth/register` is implemented.
- `POST /api/auth/login` is implemented.
- API global validation is enabled with DTO whitelisting.
- MongoDB/Mongoose is configured for the API using `MONGODB_URI` or a local default.
- The `User` schema exists with normalized unique email and `passwordHash`.
- Registration hashes passwords with Argon2 and returns only a safe user profile.
- Login verifies passwords with Argon2, uses generic unauthorized errors, and returns only a safe user profile.
- Focused API service tests exist for registration, user creation, and login behavior.
- Session strategy discussion has started. Current learning preference is Redis-backed server-side sessions. MongoDB sessions remain simpler for MVP, but Redis is accepted as a deliberate learning goal.
- RabbitMQ is explicitly deferred until there is a real async/event-driven use case. It should not be used for synchronous login/session validation.
- First Redis session slice is implemented: login creates a Redis-backed session, stores it under a hashed session key with a 7-day TTL, and sets an HttpOnly `keynest.sid` cookie.

## Not Implemented Yet

The following are not implemented yet:

- Persistent database models beyond the initial `User` model
- Logout
- `GET /auth/me`
- Auth guard / protected backend route
- Frontend login and register pages
- Frontend protected route
- Vault item persistence
- Vault CRUD APIs
- Client-side encryption implementation
- Search, filtering, tags, and pagination
- Audit-log persistence
- Rate limiting
- Docker Compose
- Unit, integration, and E2E tests
- CI pipeline

## Current Architecture Direction

The intended high-level architecture is:

```txt
Browser / Next.js Client
        |
        | HTTPS
        v
NestJS API
        |
        |---- Auth Module
        |---- Vault Module
        |---- Credential Module
        |---- Session Module
        |---- Audit Log Module
        |
        v
MongoDB first
        |
        v
PostgreSQL comparison later
```

Note: `docs/architecture.md` currently mentions PostgreSQL and Redis, but the project direction and README currently prioritize MongoDB first with PostgreSQL comparison later. This should be reconciled before database implementation.

## Security Decisions

Accepted:

- Sensitive vault data must be encrypted in the browser before being sent to the backend.
- The backend must not receive plaintext credential secrets, plaintext notes, the master password, or the vault encryption key.
- The backend stores encrypted payloads and safe metadata only.

Open:

- Whether credential titles should be encrypted or stored as searchable metadata.
- Which metadata is safe enough for server-side filtering and sorting.
- Whether folders/tags are MVP or Version 2.
- Refresh token rotation versus server-side sessions.
- Exact CSRF protection approach for cookie-based sessions.
- Logout behavior and Redis session deletion.
- `GET /auth/me` behavior and Redis session validation.
- Whether session IP and user-agent should be stored.
- Whether deleted credentials should be soft deleted.

Current database-model decisions:

- User emails are plaintext and queryable; passwords are stored only as password hashes.
- Session `userId` is plaintext because the backend must query and revoke sessions by user.
- Refresh tokens are stored as hashes, not encrypted values.
- Credential usernames are encrypted by default.
- Full credential URLs should usually be encrypted; optional plaintext domain metadata can support filtering.
- Audit-log metadata must be allowlisted per action and must never include secrets, tokens, plaintext credential data, or request bodies.

## Current MVP Scope

Interview-critical MVP features:

- User registration
- User login
- Authentication/session handling
- Protected routes
- Create vault item
- Edit vault item
- Delete vault item
- List vault items
- Search/filter vault items
- Category/grouping support
- Client-side encryption model
- Backend stores encrypted vault data only
- Basic audit logs
- Validation
- Error handling
- Pagination
- Basic tests
- Docker/docker-compose setup
- README
- Architecture explanation

Avoid for MVP:

- Browser extension
- Mobile app
- Team vaults
- Enterprise sharing
- Payment system
- Complex account recovery
- Microservices
- Kubernetes
- Event-driven architecture
- Unnecessary AI features

## Current Next Steps

Resume here next session:

1. Registration and login now work as basic credential-verification flows.
2. Implement `GET /auth/me` and logout using the Redis session cookie.
3. Challenge Redis lookup by hashed session id, cookie clearing, CSRF protection, and fail-closed behavior.
4. Explain logout, `GET /auth/me`, session storage, revocation, and tests.
5. Do not add RabbitMQ until a real async/event-driven use case is identified.
6. After the design, implement the smallest Redis session slice.

## Key Source Files

- Project overview: `README.md`
- Roadmap: `docs/project-direction.md`
- Timeline: `docs/3-month-timeline.md`
- Mentorship rules: `docs/mentorship-guidelines.md`
- Architecture overview: `docs/architecture.md`
- Database notes: `docs/database-design.md`
- Database model Q&A: `docs/learning-notes/database-model-q-and-a.md`
- Encryption ADR: `docs/adr/001-client-side-encryption.md`
- Auth learning notes: `docs/learning-notes/auth-design-q-and-a.md`
- Interview questions: `docs/interview-questions/`
