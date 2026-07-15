# Auth Registration Interview Questions

Last updated: July 6, 2026

Scope: First backend implementation slice for `POST /api/auth/register`.

Status: Implemented on June 29, 2026.

## Implementation Reason

Registration is the first safe persistence slice because it connects API design, DTO validation, MongoDB user storage, password hashing, duplicate-email handling, and safe response shaping.

The goal is not just to create a user. The goal is to prove that sensitive authentication data is handled correctly at the boundary.

## Core Questions

### Why should the backend store `passwordHash` instead of `password`?

Answer: A password is a reusable secret. If the database is leaked, plaintext passwords would immediately compromise users. A password hash lets the server verify future login attempts without storing the original password.

Implementation reason: The `User` document should contain `passwordHash`, never `password`.

### Why use Argon2 for password hashing?

Answer: Argon2 is designed for password hashing and can be configured to be memory-hard, which makes large-scale brute-force attacks more expensive than fast general-purpose hashes.

Implementation reason: Registration hashes the submitted password with Argon2 before writing the user record.

### Why not use SHA-256 for passwords?

Answer: SHA-256 is fast, and fast hashing is bad for passwords because attackers can try many guesses quickly. Password hashing needs a slow, salted, work-factor-based algorithm such as Argon2, bcrypt, or scrypt.

Implementation reason: Use a password hashing library, not a general cryptographic hash function.

### Why should registration return a safe user object?

Answer: API responses should not expose internal or sensitive fields. Returning only `id`, `name`, and `email` avoids leaking `passwordHash`, timestamps if not needed, or future auth/security fields.

Implementation reason: `AuthService.register` returns the safe user profile from `UsersService` instead of returning a raw database document.

### Why normalize email before storing or querying?

Answer: Email normalization prevents duplicate accounts like `User@Example.com` and `user@example.com` when the application treats them as the same identity.

Implementation reason: Store `emailNormalized` and enforce a unique index on it.

### Why add a global validation pipe?

Answer: A global validation pipe makes DTO validation run consistently at the API boundary. Whitelisting strips unexpected fields, and forbidding non-whitelisted fields rejects input the API did not explicitly accept.

Implementation reason: `main.ts` enables `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, and `transform`.

### Why use DTO classes instead of accepting raw request bodies?

Answer: DTO classes document the API contract and give NestJS/class-validator a clear place to enforce request shape, length, and format rules.

Implementation reason: `RegisterDto` defines `name`, `email`, and `password` validation rules.

## Service Boundary Questions

### Should password hashing live in `AuthService` or `UsersService`?

Answer: Prefer `AuthService`. Password hashing is authentication behavior. `UsersService` should focus on user persistence and should receive `passwordHash`, not plaintext passwords.

Implementation reason: This keeps plaintext password handling inside the auth workflow and makes the service boundary clearer.

### Why not put all registration logic in `UsersService`?

Answer: Registration is partly user creation, but it is also an authentication flow. Mixing auth decisions into `UsersService` makes the persistence service know too much about credential handling.

Implementation reason: `AuthService` orchestrates registration; `UsersService` persists the already-prepared user record.

### What should `UsersService` be responsible for?

Answer: Creating users, finding users by email or id, enforcing database-level uniqueness, and converting user documents into safe public profiles.

Implementation reason: Persistence responsibilities stay in one place, while auth workflows stay in `AuthService`.

## Security Questions

### Why not hash the password in the browser and send the hash to the backend?

Answer: The backend must treat anything from the client as untrusted. If the browser sends a reusable hash, that hash effectively becomes the password. Server-side password hashing is still required.

Implementation reason: The API accepts a plaintext password over HTTPS, then hashes it server-side with Argon2.

### Is it safe for the backend to briefly receive the plaintext password?

Answer: Yes, for a normal password-based login system, as long as the password is sent over HTTPS, never logged, never stored, and only used immediately for hashing or verification.

Implementation reason: Avoid logging request bodies and avoid passing plaintext passwords outside the auth path.

### What happens if two requests register the same email at the same time?

Answer: An application-level pre-check is not enough because of race conditions. The database must enforce a unique index, and the service must handle duplicate-key errors.

Implementation reason: Use a unique index on `emailNormalized` and map duplicate-key errors to a conflict response.

### Why should duplicate registration return a generic conflict instead of detailed internals?

Answer: The API should not expose database error details. A clean conflict response is enough for the client and avoids leaking implementation details.

Implementation reason: Catch duplicate-key errors and return a controlled `409 Conflict`.

## Tricky Follow-Ups

### If the password is hashed, is it safe to return `passwordHash` to the frontend?

Answer: No. A password hash is still sensitive because it can be attacked offline if exposed. It should never leave the backend.

Implementation reason: Exclude `passwordHash` from query results where possible and from all API responses.

### If MongoDB has a unique index, do we still need validation?

Answer: Yes. Validation and indexes solve different problems. DTO validation checks request shape and basic rules before business logic. The unique index protects data integrity under concurrency.

Implementation reason: Use DTO validation for input and MongoDB indexes for persistence guarantees.

### Does `select: false` on `passwordHash` mean the app can never leak it?

Answer: No. It reduces accidental exposure in normal queries, but code can still explicitly select or return it. Safe response shaping is still required.

Implementation reason: The service returns a public user shape instead of returning raw Mongoose documents.

### Should the backend reveal whether an email already exists?

Answer: For registration, returning a normal conflict is usually acceptable for usability. For login or password reset, responses should be more careful to avoid account enumeration.

Implementation reason: Keep registration errors clean and avoid overly detailed messages.

### Should password strength be enforced on the frontend, backend, or both?

Answer: Both can help, but the backend is the real enforcement point. Frontend validation improves UX; backend validation protects the system.

Implementation reason: Add backend DTO rules first, then add frontend validation later.

### Does registration need to create a vault immediately?

Answer: Not necessarily. For MVP, registration can create only the user. Vault creation can happen lazily when the user first sets up encryption or creates a credential.

Implementation reason: Keep the first slice small and avoid mixing auth with vault encryption setup.

## Strong Interview Summary

I split registration into `AuthService` and `UsersService`. `AuthService` owns the authentication workflow, including password hashing with Argon2. `UsersService` owns persistence and receives only `passwordHash`, not the plaintext password. MongoDB enforces a unique normalized email index, and the API returns a safe user profile without `passwordHash`. This keeps the first slice small while practicing validation, secure storage, service boundaries, and safe response shaping.
