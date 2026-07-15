# Auth Design Q&A

Date: June 16, 2026

Task classification: Interview-critical

## Context

This note captures the first authentication design discussion for KeyNest. The purpose is to preserve the learning trail, including the initial answers, critique, and follow-up decisions that still need to be made.

## Mentor Questions

Before implementing authentication, answer:

1. What problem am I solving with authentication?
2. Would I choose JWT or server-side sessions for this MVP, and why?
3. What fields should the `User` model have?
4. What should `POST /auth/login` return?
5. Where should the frontend store the auth state/token/session?
6. What are the main security risks?
7. How would I test register/login?

## Initial Answers

### What problem am I solving with authentication?

Initial answer:

```txt
To allow authenticated users to login.
```

Mentor correction:

```txt
Authentication verifies a user's identity, creates a trusted session, and lets the backend authorize future requests so users can only access their own vault data.
```

### JWT or server-side sessions?

Initial answer:

```txt
I would choose JWT, as session would require lookup for user data on each and every API call. In JWT we just send the bearer token, so it will not increase latency or memory consumption.
```

Mentor correction:

```txt
JWT can reduce per-request session lookup for access-token validation, but it does not remove all database checks. The backend still needs database access for ownership checks, account status, refresh token/session revocation, and user data changes.
```

Current preferred MVP direction:

```txt
Cookie-based JWT auth for the MVP.
Use an HttpOnly cookie so the frontend does not store tokens in localStorage.
Refresh token/session strategy still needs a final decision.
```

### User model

Initial answer:

```txt
Name
email
password
createdAt
updatedAt
```

Mentor correction:

```txt
Use passwordHash, never password.
```

Current draft:

```txt
User
- id
- name
- email
- passwordHash
- createdAt
- updatedAt
```

Safe user response shape:

```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "Sujeith"
  }
}
```

### Auth endpoints

Initial draft:

```txt
/login
/register
/reset-pass
```

Mentor correction:

```txt
Use resource-oriented route names under /auth.
Do not add password reset to the MVP until core registration/login/protected routes work.
```

Current MVP endpoint draft:

```txt
POST /auth/register
POST /auth/login
POST /auth/logout
GET /auth/me
```

Later, not MVP:

```txt
POST /auth/request-password-reset
POST /auth/reset-password
```

### What each endpoint receives

Initial draft:

```txt
/login
/register
user name, or email
password
```

Mentor correction:

```txt
Register and login do not receive the same fields.
```

Current draft:

```txt
POST /auth/register
- name
- email
- password

POST /auth/login
- email
- password

POST /auth/logout
- no body

GET /auth/me
- no body
- requires auth cookie/session
```

### What each endpoint returns

Initial draft:

```txt
/login and /register both get user data.
/reset-pass returns link to reset password.
```

Mentor correction:

```txt
Register/login should return only a safe user profile. Never return passwordHash. Password reset should not be in the first MVP auth slice.
```

Current draft:

```txt
POST /auth/register
- Sets auth cookie if auto-login after registration is chosen
- Returns safe user profile

POST /auth/login
- Sets auth cookie
- Returns safe user profile

POST /auth/logout
- Clears auth cookie
- Returns success status

GET /auth/me
- Returns safe current user profile
```

### Cookie/token behavior

Initial draft:

```txt
Cookie/token behavior was not completed yet.
```

Current draft:

```txt
- Auth token/session should be stored in a Secure, HttpOnly, SameSite cookie.
- Frontend should not store JWTs in localStorage.
- Frontend may store safe user profile state in memory/query cache.
- Access token lifetime, refresh token strategy, CSRF handling, and logout revocation still need final decisions.
```

## Security Risks To Account For

- Storing plaintext passwords
- Weak password hashing
- Returning `passwordHash` from APIs
- Token theft through XSS
- CSRF if using cookie-based auth
- User enumeration through error messages
- Brute-force login attempts
- Missing route protection
- Broken ownership checks between users
- Overly long token lifetime
- Accidentally logging credentials or tokens

## Tests To Plan

Register:

- Creates user with hashed password
- Rejects duplicate email
- Rejects invalid email/password
- Never returns `passwordHash`

Login:

- Accepts valid credentials
- Rejects wrong password
- Rejects unknown email with a generic error
- Sets auth cookie or returns token depending on final strategy

Authenticated access:

- `GET /auth/me` returns current user when authenticated
- Protected route rejects unauthenticated requests
- Protected route does not allow access to another user's data

## Pending Decisions

- Access token lifetime
- Refresh token/session strategy
- Whether registration should automatically log the user in
- Cookie `SameSite` value
- CSRF mitigation approach
- Password policy for MVP
- Whether to use Argon2 or bcrypt for the first implementation
