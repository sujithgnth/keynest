# KeyNest

KeyNest is an educational full-stack password manager project built to demonstrate secure vault architecture, client-side encryption, full-stack TypeScript development, and production-style engineering practices.

## Goal

The goal of this project is to build an encrypted credential management platform where sensitive vault data is encrypted before it is stored on the server.

The backend should never receive plaintext credentials, plaintext notes, the master password, or the vault encryption key.

## Core Engineering Topics

- Client-side encryption
- Authentication and session management
- Refresh token rotation
- Secure vault unlock flow
- MongoDB data modeling
- SQL comparison later
- Audit logging
- Rate limiting
- Frontend state separation
- Docker-based local development
- CI/CD
- Architecture Decision Records
- Threat modeling

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- React Hook Form
- Zod
- TanStack Query
- Zustand

### Backend

- NestJS
- TypeScript
- MongoDB
- SQL / PostgreSQL comparison later
- Argon2
- JWT access tokens
- Refresh token rotation
- OpenAPI / Swagger

### Security

- Web Crypto API
- AES-GCM
- Key derivation
- TOTP 2FA
- Secure HttpOnly cookies
- Rate limiting
- Audit logging

### DevOps

- Docker
- Docker Compose
- GitHub Actions

## Workspace Scripts

- `npm run dev:web` - start the Next.js app
- `npm run dev:api` - start the NestJS API
- `npm run build` - build all buildable projects
- `npm run lint` - lint all projects
- `npm run format` - format the workspace with Prettier
- `npm run format:check` - check Prettier formatting
- `npm run graph` - inspect the Nx project graph

## Current Progress

As of June 16, 2026:

- Nx monorepo scaffold is in place.
- `apps/web` contains the initial Next.js app shell.
- `apps/api` contains the initial NestJS app shell.
- Shared libraries are scaffolded under `libs/types`, `libs/validation`, `libs/crypto`, and `libs/ui`.
- TypeScript strict mode, ESLint, and Prettier are configured.
- Backend module skeletons are wired for auth, users, vault, credentials, sessions, and audit logs.
- Controllers, services, and DTO placeholder files exist for the backend modules.
- Project direction is updated for a 3-month interview-focused phase and long-term architecture growth through 2028.
- Auth, database model, encryption, session rotation, and audit-log persistence are not implemented yet.

## Learning Approach

This project is being built as a mentorship-driven interview portfolio project, not just a code-generation exercise. For the next 3 months, the priority is Senior Frontend Engineer / Fullstack TypeScript interview readiness. The longer-term path is hands-on software architecture growth through 2028.

- Working rules: [docs/mentorship-guidelines.md](docs/mentorship-guidelines.md)
- Combined progress source: [docs/combined-progress.md](docs/combined-progress.md)
- Learning progress source: [docs/learning-progress.md](docs/learning-progress.md)
- Two-layer roadmap: [docs/project-direction.md](docs/project-direction.md)
- 3-month timeline: [docs/3-month-timeline.md](docs/3-month-timeline.md)
- Learning notes: [docs/learning-notes](docs/learning-notes)

## Next TODO Steps

Before writing the database model, clarify the domain and security boundaries:

1. Define the core domain entities: `User`, `Vault`, `CredentialItem`, `Session`, and `AuditLog`.
2. Decide which fields are encrypted client-side and which fields remain plaintext metadata.
3. Document the encrypted/plaintext tradeoff for search, category filtering, sorting, pagination, and audit logs.
4. Use MongoDB initially, then document the SQL/PostgreSQL comparison later as an architecture learning exercise.
5. Draft the first MongoDB collection model only after the entity model and metadata policy are clear.
6. Review the database model for document boundaries, references, indexes, naming, session modeling, audit-log design, and security concerns.
7. Write an ADR for the database choice and another ADR for the encrypted metadata boundary.
8. Add Docker Compose for the selected database after the schema direction is stable.
9. Add focused tests for the first backend persistence flow once database persistence is introduced.

Current learning question:

```txt
How should User, Vault, CredentialItem, Session, and AuditLog be modeled,
and which fields must be encrypted versus queryable as plaintext metadata?
```

## Important Disclaimer

This project is an educational portfolio project. It has not undergone a professional security audit and should not be used to store real passwords.

## Planned Features

### MVP

- User registration
- User login/logout
- Master password setup
- Vault bootstrap flow
- Client-side encryption
- Add/edit/delete encrypted credentials
- Search credentials after vault unlock
- Password generator
- Auto-lock vault
- Docker Compose setup
- Basic README and architecture documentation

### Senior Upgrade

- Refresh token rotation
- Session management
- Audit logs
- Two-factor authentication
- Password health dashboard
- E2E tests
- CI pipeline
- Architecture Decision Records

### Architect Upgrade

- Threat model
- Encryption design document
- Auth design document
- Database design document
- Recovery tradeoff explanation
- Deployment diagram
- Observability notes

## License

**Proprietary — all rights reserved.** This repository is public for portfolio
review only. Copying, modification, redistribution, reuse, or incorporation into
another project is not permitted except for rights required by GitHub's Terms of
Service or with prior written permission. See [LICENSE](LICENSE).

The restriction applies prospectively and does not revoke permissions validly
granted with an earlier version.
