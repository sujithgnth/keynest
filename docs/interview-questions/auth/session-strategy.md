# Auth Session Strategy Interview Questions

Last updated: July 8, 2026

Scope: Choosing how KeyNest keeps users authenticated after `POST /api/auth/login`.

Status: Design discussion in progress. Not implemented yet.

## Current Leaning

The developer currently prefers server-side sessions stored in Redis because sessions can be revoked quickly, auth state stays server-side, and Redis is a useful architecture-learning goal.

Mentor critique:

- Redis is a strong long-term session store for fast expiry and revocation.
- MongoDB-backed sessions are simpler for the current MVP because MongoDB is already in the stack.
- Redis is acceptable for this project if the explicit goal is learning infrastructure and session storage tradeoffs.
- RabbitMQ should not be added to the auth session path just to learn it. Add it later only for a real async/event-driven use case such as audit events, email jobs, or breach-monitoring workflows.
- Cookie-based sessions still need CSRF thinking because browsers automatically attach cookies.
- JWT can be simple at first, but revocation becomes harder unless the server checks a denylist or session record.
- Access token plus refresh token rotation is stronger for long-lived sessions and multi-device flows, but it adds more moving parts.

## Current Review Notes

Good answers:

- Revocation is easier with server-side sessions because the server owns the source of truth.
- JWTs are harder to revoke because the server normally verifies signature and expiry without checking central state.
- Auth should fail closed if Redis/session storage is unavailable.
- Logout this device versus logout all devices maps to revoking one session versus all sessions for a user.
- MongoDB sessions can be acceptable for MVP because Redis adds infrastructure.

Corrections:

- The server does need to know the presented session id briefly so it can hash it and look up the session. The important rule is: do not store raw session ids.
- A session document needs more than `userId` and `name`. It should include lookup, expiry, revocation, and audit-friendly metadata.
- `GET /api/auth/me` should validate the session cookie, look up the session, ensure it is not expired or revoked, then return the safe user profile.
- HttpOnly does not solve CSRF because the browser can still automatically attach cookies to cross-site requests.

## Key Concept: Auth State

Auth state means the server-side or client-side information that answers:

```txt
Who is this request from, and is that login still valid?
```

Examples:

- Server-side session: auth state is stored on the server, keyed by a session id in a cookie.
- JWT access token: auth state is mostly inside the signed token until it expires.
- Refresh-token flow: short-lived auth state is in the access token, longer-lived session continuity is in refresh token storage.

## CSRF Explanation

CSRF means Cross-Site Request Forgery.

If the browser automatically sends your auth cookie to `keynest.com`, a malicious site may try to trick the browser into making a request to `keynest.com` while the user is logged in.

Example:

```txt
User is logged in to KeyNest.
User visits attacker.com.
attacker.com triggers a POST request to keynest.com/api/vault/delete.
Browser automatically includes KeyNest cookies.
If KeyNest does not defend against CSRF, the request may look authenticated.
```

Important correction:

- Server-side sessions do not remove CSRF risk if the session id is stored in a cookie.
- `HttpOnly` protects cookies from JavaScript theft, but does not stop CSRF by itself.
- `SameSite=Lax` or `SameSite=Strict` helps.
- State-changing requests may also need CSRF tokens or strict origin checks.

## Core Questions

### Why choose server-side sessions?

Answer: Server-side sessions are easy to revoke because the server owns the session record. The browser only has an opaque session id, not the actual auth state.

Implementation reason: Logout can delete or revoke the session record.

### Why use Redis for sessions?

Answer: Redis is fast, supports TTL expiry naturally, and is commonly used for ephemeral session data.

Tradeoff: Redis adds another infrastructure dependency. For the MVP, MongoDB sessions may be simpler because MongoDB is already configured.

### Why might MongoDB be acceptable for MVP sessions?

Answer: MongoDB is already in the project, can store session records, supports TTL indexes, and keeps the first implementation smaller.

Tradeoff: Redis is usually better for high-throughput ephemeral sessions, but MongoDB is acceptable while learning the core auth flow.

### What should the backend send after login succeeds?

Answer: A secure cookie containing an opaque session id, plus a safe user profile in the response body.

Implementation reason: The cookie authenticates future requests; the response body lets the UI update immediately.

### Where is the auth state stored?

Answer: With server-side sessions, auth state is stored in the server database or cache. The browser stores only the session id cookie.

Implementation reason: `GET /api/auth/me` uses the cookie session id to look up the session and user.

### How does logout work?

Answer: Logout revokes or deletes the server-side session and clears the browser cookie.

Implementation reason: Clearing only the cookie is not enough if the server-side session remains valid.

### If a session id is stolen, how do we revoke it?

Answer: Delete or mark that session as revoked. For account-wide compromise, revoke all sessions for that user.

Implementation reason: Store sessions with `userId`, `expiresAt`, and `revokedAt` or delete them from Redis/MongoDB.

## Senior-Level Questions

### Why is session revocation easier with server-side sessions than stateless JWTs?

Answer: Server-side sessions require a server lookup, so the server can reject a revoked session immediately. Stateless JWTs remain valid until expiry unless the server adds a denylist or session lookup, which makes them less stateless.

### How would you design multi-device logout?

Answer: Store one session per device/browser. A normal logout revokes only the current session. A "logout all devices" action revokes all active sessions for the user.

### What is the tradeoff between `SameSite=Lax` and `SameSite=Strict`?

Answer: `Strict` gives stronger CSRF protection but may break legitimate cross-site navigation flows. `Lax` is more usable and blocks many cross-site POST cases, but it is not a complete substitute for CSRF protection in every app.

### Why is `HttpOnly` necessary but insufficient?

Answer: `HttpOnly` prevents JavaScript from reading the cookie, reducing XSS token theft. It does not stop the browser from automatically sending the cookie on requests, so CSRF still needs separate consideration.

### How would you test session logout?

Answer: Test that logout clears the cookie and makes the server-side session invalid. Then call `GET /api/auth/me` with the old cookie and expect unauthorized.

### How would you model sessions in MongoDB?

Answer: Use fields such as `userId`, `sessionTokenHash`, `expiresAt`, `revokedAt`, `createdAt`, `lastUsedAt`, optional `ipHash`, and optional `userAgent`. Add indexes for lookup, user revocation, and TTL expiry.

### Should the raw session id be stored in the database?

Answer: Prefer storing a hash of the session id. If the session database leaks, raw session ids would let attackers impersonate users until expiry.

### What happens if Redis goes down?

Answer: If Redis is the only session store, users may be logged out or auth checks may fail. A production design needs a clear fail-closed behavior, Redis persistence/replication decisions, and monitoring.

Senior answer: Auth should fail closed. If the system cannot verify a session, it should not treat the request as authenticated. This may temporarily log users out or return `401`, but it avoids default-allow behavior.

### Why might access plus refresh token rotation be stronger long term?

Answer: It supports short-lived access tokens, long-lived refresh continuity, token theft detection, multi-device sessions, and rotation. The tradeoff is higher implementation complexity.

## Current MVP Recommendation

Use server-side sessions.

Two acceptable implementation paths:

```txt
Option A: MongoDB sessions first
- Smaller MVP
- Fewer moving parts
- Still supports TTL indexes and revocation

Option B: Redis sessions now
- Better architecture-learning value
- Natural TTL and fast revocation
- Requires Docker Compose and Redis client setup earlier
```

Current leaning: use Redis now because the developer explicitly wants to learn it, but keep RabbitMQ out of this slice.

## RabbitMQ Boundary

Do not use RabbitMQ for synchronous login/session validation.

Reason:

- Login must synchronously verify credentials and create a session.
- `GET /auth/me` must synchronously validate the current session.
- A message broker adds async delivery and operational complexity, but does not help the critical request path.

Good future RabbitMQ use cases:

- Publish audit events after login/logout.
- Queue email notifications.
- Process background security alerts.
- Run breach-monitoring or vault-health jobs.

Learning decision:

```txt
Redis is allowed in the next auth slice because it directly supports the
session problem we are solving.

RabbitMQ is deferred because it solves a different class of problem:
asynchronous event delivery, not synchronous authentication.
```

### Why should RabbitMQ not be used for login/session validation?

Answer: Login and session validation are request/response decisions. The API must know immediately whether credentials are valid or whether a session is active. RabbitMQ is asynchronous, so it is a poor fit for the critical authentication path.

### When would RabbitMQ make sense in KeyNest?

Answer: RabbitMQ makes sense when something can happen after the main request succeeds, such as writing audit events, sending email notifications, processing security alerts, or running background breach checks.

### What is the senior-level rule for adding infrastructure?

Answer: Add infrastructure when it directly solves the current problem or teaches a deliberate architecture concept without damaging delivery. Do not add Redis, RabbitMQ, Kafka, or other tools just because they are impressive.

## Strong Interview Summary

For KeyNest, I prefer server-side sessions because revocation is straightforward and auth state stays server-side. A secure cookie stores only an opaque session id. The server stores a hashed session id and can revoke one session or all sessions for a user. Redis is a strong store for this because sessions are ephemeral and need TTL. MongoDB would be simpler for MVP, but Redis is acceptable here because the project is also an architecture learning lab. Cookie sessions still need CSRF protection because browsers automatically send cookies.
