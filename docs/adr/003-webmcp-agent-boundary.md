# ADR 003: Expose Only Privacy-Preserving Browser Tools Through WebMCP

## Status

Accepted on August 29, 2026

## Context

KeyNest's strongest security property is that decrypted credential fields, the
vault master password, and the unwrapped vault key remain inside the browser.
WebMCP can make a live web application expose structured tools to a browser
agent, but every tool input, description, and result becomes a new agent-facing
data path.

WebMCP is currently a proposed web standard and experimental browser feature.
It is not a replacement for a remotely available Model Context Protocol server.
Its tools exist only for the lifetime and state of the open document.

## Decision

1. Add WebMCP as a progressive enhancement through `document.modelContext`.
   Browsers without the API continue to use the ordinary KeyNest UI.
2. Expose two narrowly scoped tools:
   - `keynest_get_vault_status` returns sign-in state, lock state, and an
     aggregate item count only while the vault is unlocked.
   - `keynest_lock_vault` calls the existing in-memory lock behavior and returns
     no vault content.
3. Construct tools from a reduced state object containing only `screen` and
   `itemCount`. The WebMCP module does not receive users, vault metadata,
   decrypted items, encryption keys, cookies, CSRF tokens, or API clients.
4. Use no-input JSON Schemas and ignore unexpected input defensively. Do not set
   `exposedTo`; cross-origin documents are not explicitly allowed. Set the
   document headers to an origin-keyed agent cluster and `tools=(self)`.
5. Bind registrations to an `AbortController`. A React state change or unmount
   unregisters stale tools. If any registration fails, abort the whole group so
   a partial tool set is not left active.
6. Do not expose unlock, authentication, credential search/read/reveal/copy,
   password generation, credential mutation, session revocation, or deletion
   through WebMCP in this slice.

## Consequences

- A browser agent can reliably inspect safe aggregate state and lock the vault
  without scraping the UI.
- The agent learns limited metadata: whether the user is signed in, whether the
  vault is configured/locked, and the unlocked item count. This is intentional,
  bounded, and must remain documented.
- Locking is a state-changing operation, but it reduces exposure and reuses the
  same application action available to the user. Re-unlocking still requires
  the vault master password in the human-facing form.
- WebMCP absence, permission denial, or registration failure does not block the
  password-manager workflow.
- Compatibility is experimental and requires browser-specific enablement or an
  origin trial. KeyNest does not load a polyfill or remote agent script.

## Alternatives considered

- **Expose credential CRUD as tools:** rejected because tool parameters or
  results could place plaintext credentials into an external agent context.
- **Expose vault unlock:** rejected because it would require the master password
  to cross the agent boundary.
- **Add a server-side MCP server first:** deferred. The server deliberately has
  no plaintext vault knowledge. A future server should focus on authorized,
  read-only operational or documentation resources rather than vault secrets.
- **Load a compatibility polyfill:** rejected for this slice to avoid expanding
  the frontend supply-chain and agent-transport boundary for an experimental
  feature.

## References

- [WebMCP draft specification](https://webmachinelearning.github.io/webmcp/)
- [Chrome WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp)
