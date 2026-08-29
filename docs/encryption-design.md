# Vault Encryption Design

Last updated: August 15, 2026

## Key hierarchy

```text
vault master password (browser only)
  + 16-byte random salt + 600,000 PBKDF2-SHA256 iterations
  -> non-extractable AES-256-GCM wrapping key

32-byte random vault key
  -> wrapped by the wrapping key with a fresh 12-byte nonce
  -> wrapped key + KDF metadata stored by the API

credential JSON
  -> encrypted by the vault key with a fresh 12-byte nonce
  -> ciphertext envelope stored by the API
```

The account password and vault master password serve different purposes. The
account password is verified by the server; the vault master password never
crosses the browser boundary.

## Authenticated envelopes

Vault-key wrapping uses AAD `keynest:vault-key:v1`. Credential encryption uses
AAD containing the envelope version, vault ID, item ID, item type, and revision.
Changing any bound identity field or the GCM tag causes decryption to fail.

The API validates algorithm names, envelope versions, iteration minimums,
nonce/ciphertext encodings, and size limits, but it cannot determine whether an
encrypted payload contains a valid credential.

## Browser lifecycle

The imported vault key is non-extractable. Decrypted items and the key exist in
React state only while unlocked and are cleared on manual lock, sign-out, or a
15-minute idle timeout. Temporary byte arrays are overwritten where practical,
but JavaScript garbage collection prevents a guarantee of complete memory
zeroization.

## KDF trade-off and migration

Native Web Crypto PBKDF2 avoids a third-party WASM cryptographic runtime and is
widely available, but it is CPU-hard rather than memory-hard. Argon2id would
offer stronger resistance to GPU/password-cracking economics. Adopting it
requires browser/device benchmarks, an audited implementation, a new envelope
version, and a rewrap flow after successful unlock.

## Recovery and compromise limits

There is no server-held recovery key. A lost master password makes the vault
unrecoverable. Client-side encryption reduces damage from a database-only leak;
it does not protect an unlocked vault from XSS, a malicious extension,
compromised shipped JavaScript, OS malware, clipboard capture, or screen
recording.
