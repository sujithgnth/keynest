# ADR 001: Use Client-Side Encryption for Vault Data

## Status

Accepted

## Context

KeyNest stores sensitive credential data such as usernames, passwords, and notes.

If the backend stored plaintext credential data, a database breach or backend compromise could expose user secrets.

The project goal is to demonstrate a zero-knowledge-inspired vault model where the backend cannot read plaintext vault data.

## Decision

Sensitive vault data will be encrypted in the browser before being sent to the backend.

The backend will store encrypted payloads, initialization vectors, salts, and metadata.

The backend must not receive:

- Plaintext passwords
- Plaintext notes
- Plaintext usernames
- Master password
- Vault encryption key

## Consequences

### Benefits

- Backend cannot read user vault contents
- Database leak exposes encrypted blobs instead of plaintext credentials
- Strong interview discussion around security boundaries and threat modeling

### Tradeoffs

- Account recovery becomes harder
- Frontend security becomes more critical
- XSS risk becomes severe
- Client-side search is simpler than encrypted server-side search
- Key lifecycle management must be handled carefully

## Alternatives Considered

### Server-side encryption

Rejected for MVP because the server would still have access to encryption keys or plaintext during processing.

### Plain database storage

Rejected because it does not satisfy the security goal of the project.

## Interview Talking Point

I chose client-side encryption so that the backend stores only encrypted credential blobs. This reduces server-side blast radius, but it increases the importance of frontend security, especially XSS prevention and key lifecycle management.
