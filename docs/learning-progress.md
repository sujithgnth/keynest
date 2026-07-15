# KeyNest Learning Progress

Last updated: July 8, 2026

Purpose: This file tracks the developer's learning progress while building KeyNest. It is written as a source document for ChatGPT or another assistant to continue mentorship without losing context.

## Learning Goal

Use KeyNest to become stronger at frontend-heavy fullstack engineering, secure application design, and practical software architecture.

Short-term target:

- Senior Frontend Engineer and Fullstack TypeScript interview readiness.

Long-term target:

- Strong senior fullstack engineer and hands-on software architect by the end of 2028.

## Working Method

This project should not become passive code generation.

For each meaningful feature, the developer should first explain:

1. What problem is being solved.
2. The proposed design.
3. The data model.
4. The API endpoints.
5. The security risks.
6. The testing approach.
7. How the decision would be explained in an interview.

The assistant or mentor should critique the explanation, correct weak assumptions, and help improve the design before implementation.

Current pairing preference:

- Use a 50/50 learning workflow.
- The mentor can implement or scaffold the first version of a new pattern.
- The developer should implement the next similar piece to prove understanding.
- Each step should include the reason for the implementation, possible interview questions with answers, and the next developer-owned task.
- Interview questions should be stored in feature-specific files under `docs/interview-questions/<domain>/` and updated after each meaningful feature.

## Current Learning Focus

Current learning question:

```txt
How should KeyNest validate and revoke Redis-backed server-side sessions after
login now creates a session cookie?
```

The next learning milestone is to implement `GET /auth/me` and logout using the Redis session cookie.

## Resume Point

Latest completed slice:

```txt
POST /api/auth/login creates a Redis-backed session and sets keynest.sid.
```

Resume here next session:

- Implement `GET /api/auth/me` and logout as the next session slices.
- The mentor implemented the first Redis pattern: create session and set cookie after login.
- The developer should own one of the next similar slices, likely logout.
- Continue to keep RabbitMQ out of the auth path.

## Topics Already Started

### Project Scoping

Progress:

- Defined KeyNest as an interview portfolio project and long-term architecture lab.
- Split the roadmap into an interview-ready MVP and later architecture upgrades.
- Identified low-priority distractions that should not block the MVP.

Learning gained:

- Scope control matters because overbuilding weakens delivery.
- Interview-critical work should come before architecture experiments.

Source:

- `docs/project-direction.md`
- `docs/3-month-timeline.md`
- `docs/mentorship-guidelines.md`

### Authentication Design

Progress:

- Started the first auth design Q&A.
- Clarified that authentication is not just "allowing users to log in."
- Improved the definition: authentication verifies identity, creates a trusted session, and lets the backend authorize future requests.
- Compared JWT and server-side sessions at a beginner-to-intermediate level.
- Chose cookie-based JWT auth as the current preferred MVP direction, while leaving refresh/session strategy open.
- Clarified that the frontend should not store JWTs in localStorage.
- Drafted basic auth endpoints.
- Implemented `POST /api/auth/register` in NestJS.
- Implemented `POST /api/auth/login` in NestJS.
- Added global DTO validation with whitelisting and non-whitelisted-field rejection.
- Added MongoDB/Mongoose user persistence with normalized unique email.
- Added Argon2 password hashing in `AuthService`.
- Added Argon2 password verification in `AuthService`.
- Kept `UsersService` responsible for persistence and safe public user shaping.
- Added focused tests for password hashing, password verification, safe response shape, email normalization, duplicate-email handling, unknown email, and wrong password.
- Started session strategy discussion.
- Current preference is server-side sessions, with Redis as a strong long-term store and MongoDB as a simpler MVP store.
- Clarified that cookie-based sessions still require CSRF protection.
- Developer chose Redis-backed server-side sessions as a learning-oriented implementation path.
- Clarified that RabbitMQ should be deferred until there is a real async/event-driven use case.
- Captured the rule that Redis fits the next auth slice because it directly supports session storage, while RabbitMQ does not belong in synchronous login/session validation.
- Implemented the first Redis-backed session slice: login creates a high-entropy session id, stores a hashed session key in Redis with a 7-day TTL, and sets an HttpOnly `keynest.sid` cookie.

Current auth endpoint draft:

```txt
POST /auth/register - implemented
POST /auth/login - implemented, creates Redis session cookie
POST /auth/logout
GET /auth/me
```

Learning gained:

- JWTs do not remove all database checks.
- The backend still needs database access for ownership checks, account status, revocation/session state, and user data changes.
- User models should store `passwordHash`, never `password`.
- Login/register responses must return only a safe user profile.
- Password reset is not part of the first MVP auth slice.

Open questions:

- Final refresh token rotation versus server-side session design.
- Cookie settings and CSRF implications.
- Exact auth guard behavior.
- Exact Redis session schema and TTL strategy.
- Exact cookie settings.
- Whether CSRF protection uses SameSite only, origin checks, or a CSRF token.
- How logout should delete the Redis session and clear the cookie.
- How `GET /auth/me` should read, hash, validate, and refresh session state.

Source:

- `docs/learning-notes/auth-design-q-and-a.md`
- `docs/interview-questions/auth/registration.md`
- `docs/interview-questions/auth/login.md`
- `docs/interview-questions/auth/session-strategy.md`
- `docs/interview-questions/auth/redis-sessions.md`

### Client-Side Encryption

Progress:

- Accepted ADR 001: sensitive vault data will be encrypted in the browser before being sent to the backend.
- Rejected plaintext database storage.
- Rejected server-side encryption for the MVP because the server would still have key or plaintext access during processing.

Learning gained:

- Client-side encryption reduces backend blast radius.
- It makes account recovery harder.
- It makes frontend security more important.
- XSS becomes a major risk because the browser handles plaintext and keys.
- Server-side search over encrypted data is limited unless safe metadata is stored separately.

Source:

- `docs/adr/001-client-side-encryption.md`

### Database Modeling

Progress:

- Identified required database areas: users, vault metadata, encrypted credential storage, sessions/refresh tokens, audit logs, and optional folders/tags.
- Captured the rule that sensitive credential data must not be stored as plaintext.
- Started a review checklist for future schema work.
- Reviewed the first MongoDB model for `User`, `Vault`, `CredentialItem`, `Session`, and `AuditLog`.
- Corrected session modeling: `userId` should be plaintext for backend queries and revocation.
- Corrected refresh token storage: refresh tokens should be stored as hashes, not encrypted values.
- Decided that credential `username` should be encrypted by default.
- Decided that full URLs may be sensitive and should usually be encrypted, with optional plaintext domain metadata for filtering.
- Decided that audit log metadata must be allowlisted per action, not arbitrary request JSON.

Learning gained:

- A password manager database model is mainly a security-boundary problem, not just a CRUD schema problem.
- User-owned resources must be scoped by `userId`.
- Refresh tokens should be stored as hashes, not plaintext.
- Audit logs must avoid sensitive values.
- Indexes should support real query patterns without leaking unnecessary secret metadata.
- MongoDB references are appropriate for credentials, sessions, and audit logs because those collections grow independently and should not become unbounded arrays inside a user or vault document.

Open questions:

- Should credential titles be encrypted?
- Should categories or tags be plaintext metadata?
- Should folders/tags be included in MVP?
- Should deleted credentials use soft delete?
- Should session IP and user agent be stored?

Source:

- `docs/database-design.md`
- `docs/learning-notes/database-model-q-and-a.md`

## Practical Skills To Build Next

Immediate:

- `GET /auth/me` design and implementation.
- Logout design.
 - Redis session validation.
- `GET /auth/me` design.

Soon:

- Protected routes.
- Vault CRUD.
- Client-side encryption implementation.
- Error handling and validation.
- Search/filter limitations with encrypted data.

Later:

- Docker Compose.
- CI.
- Frontend tests.
- Playwright E2E tests.
- PostgreSQL comparison.
- Observability notes.

## Interview Explanation Practice

The developer should be able to explain:

- Why KeyNest uses client-side encryption.
- What the backend must never store.
- Why `passwordHash` is stored instead of `password`.
- Why localStorage is a bad place for JWTs.
- What JWTs solve and what they do not solve.
- How encrypted data affects search, sorting, and filtering.
- Why audit logs must avoid sensitive values.
- How MongoDB indexes should be chosen from query patterns.
- Why password reset is intentionally excluded from the first auth slice.
- Why password hashing belongs in the auth/register flow instead of accepting password hashes from the client.
- How service responsibility is split between `AuthService` and `UsersService`.
- Why login uses a generic failure message.
- Why login must explicitly select `passwordHash` but never return it.
- What CSRF is and why cookie-based sessions must consider it.
- Why Redis is good for sessions, and why MongoDB may still be chosen for MVP simplicity.
- Why RabbitMQ does not belong in the synchronous auth validation path.
- Where RabbitMQ could fit later: audit events, email notifications, security alerts, and background jobs.
- Why session ids are hashed before Redis storage.
- Why cookie setting belongs in the controller while session creation belongs in services.

Question bank:

- `docs/interview-questions/README.md`
- `docs/interview-questions/auth/registration.md`
- `docs/interview-questions/auth/login.md`
- `docs/interview-questions/auth/session-strategy.md`
- `docs/interview-questions/auth/redis-sessions.md`

## Next Recommended Mentor Prompt

Use this prompt to continue:

```txt
Help me implement the next Redis session slice for KeyNest. The login endpoint
already creates a Redis-backed session and sets keynest.sid. Challenge me on
GET /auth/me behavior, logout, cookie clearing, Redis lookup by hashed session
id, fail-closed behavior, CSRF implications, and tests. Keep RabbitMQ out of
the auth path.
```
