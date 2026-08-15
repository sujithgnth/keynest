# Authentication and Session Design

Last updated: August 15, 2026

## Separate passwords

The account password authenticates to the API and is hashed with Argon2id. The
vault master password derives a browser-only wrapping key and is never sent to
the API. Reusing one value for both is discouraged in the UI and architecture.

## Login flow

1. A per-IP Redis guard permits 10 login attempts per 60 seconds (registration
   permits 5). It fails open and logs if Redis becomes unavailable; a
   production edge rate limit is still required.
2. Email lookup uses a normalized address and returns the same failure message
   for an unknown email or wrong password.
3. Argon2id verifies the account password.
4. The API creates independent random 256-bit session and CSRF tokens.
5. SHA-256 token hashes are stored in PostgreSQL. The raw session token is sent
   only as an HttpOnly, SameSite=Lax cookie; the raw CSRF token is returned in
   the response body for in-memory client use.

## Session validation and revocation

Redis caches the non-secret session record by a hash of the cookie. PostgreSQL
remains authoritative and stores expiry, last use, and revocation. A cache miss
or Redis outage falls back to PostgreSQL. Sign-out revokes the current session;
the sessions endpoint can revoke all active sessions and sets a Redis revocation
watermark so cached records are rejected deterministically.

`GET /auth/me` validates the cookie and rotates the CSRF token so a browser
reload can recover authenticated state without persisting the token in local
storage.

## Cookie deployment requirements

Production sets `Secure`; all cookies are scoped to `/api`. The UI and API
should be served over HTTPS with a same-site origin strategy. If a trusted
reverse proxy is used, configure `TRUST_PROXY=true` only when the network path
actually prevents untrusted clients from spoofing forwarding headers.

## Not implemented

Email verification, password reset, 2FA, passkeys, suspicious-login detection,
and account recovery are outside this MVP.
