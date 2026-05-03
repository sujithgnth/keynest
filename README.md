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
- PostgreSQL data modeling
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
- PostgreSQL
- Prisma
- Redis
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
