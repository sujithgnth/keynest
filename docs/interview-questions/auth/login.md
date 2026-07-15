# Auth Login Interview Questions

Last updated: July 7, 2026

Scope: `POST /api/auth/login`.

Status: Implemented on July 7, 2026.

## Implementation Reason

Login proves that the backend can authenticate an existing user without exposing account existence or leaking password hashes.

This slice intentionally does not create JWTs, cookies, sessions, refresh tokens, or `GET /auth/me`. It only verifies credentials and returns a safe user profile.

## Core Questions

### Why should login use a generic failure message?

Answer: A generic message like `Invalid email or password` prevents attackers from learning whether an email is registered.

Implementation reason: Unknown email and wrong password both throw the same `UnauthorizedException`.

### Why does login need `select('+passwordHash')`?

Answer: The user schema excludes `passwordHash` by default to avoid accidental leaks. Login is one of the few flows that needs the hash for password verification, so it must explicitly opt in.

Implementation reason: `UsersService.findByEmailWithPasswordHash()` selects `+passwordHash`.

### Why use `argon2.verify()` instead of hashing again and comparing strings?

Answer: Argon2 hashes include salt and parameters. The same password will not produce a simple repeatable string for direct comparison. `argon2.verify()` reads the stored hash metadata and performs the correct verification.

Implementation reason: `AuthService.login()` verifies the submitted password against the stored Argon2 hash.

### Why return a safe user profile after login?

Answer: The login query includes `passwordHash`, so returning the raw user would leak sensitive data. The response should include only public fields.

Implementation reason: `AuthService.login()` returns `{ user: this.usersService.toPublicUser(user) }`.

## Security Questions

### Why not reveal `email not found`?

Answer: That creates an account enumeration risk. Attackers could test emails and build a list of registered accounts.

Implementation reason: Unknown email and wrong password share the same error message.

### Why not return a token in this slice?

Answer: Token/session design has separate security decisions: cookie flags, refresh token hashing, rotation, logout, CSRF, and revocation. Keeping login verification separate makes the first slice easier to test and explain.

Implementation reason: This slice returns only a safe user object.

### Why is backend validation still needed if the frontend will validate login fields?

Answer: Frontend validation is only UX. Attackers can call the API directly. The backend must validate all external input.

Implementation reason: `LoginDto` validates email format and password length.

## Tricky Follow-Ups

### Does selecting `passwordHash` make the whole login flow unsafe?

Answer: No, if the selected hash stays inside the auth flow and the response is shaped safely. It would be unsafe to return the raw user document.

Implementation reason: The selected user is converted to a public profile before returning.

### Should login use email or username?

Answer: For KeyNest MVP, email is the login identifier because the user model already enforces normalized unique email. Username login would require a separate unique username policy.

Implementation reason: `LoginDto` accepts `email` and `password`.

### Should unknown email and wrong password take the exact same amount of time?

Answer: Ideally, sensitive auth systems reduce timing differences too. For this MVP, generic errors are the first step. Later, rate limiting and consistent timing can be considered.

Implementation reason: Current MVP focuses on correctness, safe messages, and password-hash handling.

## Strong Interview Summary

Login looks up the user by normalized email and explicitly selects `passwordHash` because that field is excluded by default. If the user is missing or `argon2.verify()` fails, the API returns the same generic unauthorized error. If verification succeeds, the service returns only a safe user profile. This avoids account enumeration and prevents password-hash leakage while keeping the slice small before adding sessions or tokens.
