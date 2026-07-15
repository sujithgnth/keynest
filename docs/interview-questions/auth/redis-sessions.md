# Redis Sessions Interview Questions

Last updated: July 8, 2026

Scope: First Redis-backed server-side session slice.

Status: First slice implemented: login creates a Redis session and sets a secure cookie.

## Implementation Reason

Registration and login prove credentials. Redis sessions let the API remember that a user is authenticated across later requests without storing auth tokens in localStorage.

This slice intentionally does not implement logout, `GET /auth/me`, guards, or CSRF tokens yet. It only creates the session and sets the cookie after login.

## Current Session Design

```txt
Cookie name: keynest.sid
Session id: random high-entropy value
Redis key: sess:<sha256(sessionId)>
TTL: 7 days
Cookie options: HttpOnly, SameSite=Lax, Secure in production, Path=/
```

Stored Redis value:

```txt
userId
createdAt
expiresAt
lastUsedAt
```

## Core Questions

### Why use a 7-day TTL?

Answer: There is no universal rule. A 7-day TTL is a product/security tradeoff: convenient enough for an MVP while still expiring sessions. More sensitive applications may choose shorter TTLs or idle timeouts.

Implementation reason: `SESSION_TTL_SECONDS` is set to 7 days for the first MVP slice.

### Why store a hash of the session id in Redis?

Answer: If Redis data leaks, raw session ids would let attackers impersonate users. Hashing the session id before storage means the leaked Redis key is not directly usable as the browser cookie.

Implementation reason: Redis keys use `sess:<sha256(sessionId)>`.

### Why does login return a cookie now?

Answer: The cookie lets the browser authenticate future requests without exposing the session id to JavaScript.

Implementation reason: `AuthController.login()` sets an HttpOnly cookie and returns only the safe user profile.

### Why keep cookie setting in the controller instead of the service?

Answer: Cookies are HTTP transport details. `AuthService` should handle auth workflow; the controller should handle HTTP response concerns.

Implementation reason: `AuthService.login()` returns `sessionId`; `AuthController.login()` sets the cookie.

### Why is Redis a good fit for sessions?

Answer: Sessions are ephemeral and need quick lookup, TTL expiry, and revocation. Redis supports those patterns directly.

Implementation reason: `SessionsService.createSession()` stores a session record with Redis `EX` TTL.

## Security Questions

### Does HttpOnly fully protect the session?

Answer: No. HttpOnly prevents JavaScript from reading the cookie, but the browser can still automatically send the cookie on requests. CSRF still needs consideration.

### Why not store the session id in localStorage?

Answer: localStorage is readable by JavaScript. If XSS happens, an attacker can steal the session id. HttpOnly cookies reduce that risk.

### What should happen if Redis is unavailable?

Answer: Auth should fail closed. If the server cannot verify the session, it should not treat the request as authenticated.

## Tricky Follow-Ups

### Is Redis now a required infrastructure dependency?

Answer: Yes. Choosing Redis means local development and deployment need Redis available. That is acceptable here because Redis is now a deliberate learning goal.

### Why not use RabbitMQ here too?

Answer: Session validation is synchronous. RabbitMQ is for asynchronous work. It can be added later for audit events, emails, security alerts, or background jobs.

### Why does this slice not include logout or `GET /auth/me`?

Answer: This is incremental implementation. First prove session creation and cookie issuance. Then add validation and invalidation in separate slices with focused tests.

## Strong Interview Summary

After login succeeds, KeyNest creates a high-entropy session id, stores only its SHA-256 hash in Redis with a 7-day TTL, and sends the raw session id to the browser in an HttpOnly cookie. The response body contains only the safe user profile. Redis is a good fit because sessions are ephemeral and need fast lookup and expiry. RabbitMQ is not used because session validation is synchronous.
