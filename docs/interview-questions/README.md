# Interview Questions

Last updated: July 6, 2026

Purpose: Store feature-by-feature interview questions for KeyNest. Each file should include practical questions, tricky follow-ups, concise answers, and the reason behind the implementation choice.

## Folder Pattern

Store questions by domain and feature:

```txt
docs/interview-questions/
  auth/
    registration.md
    login.md
    session-strategy.md
    redis-sessions.md
  vault/
    create-credential.md
  encryption/
    client-side-encryption.md
```

## Question Banks

- [Auth registration](auth/registration.md)
- [Auth login](auth/login.md)
- [Auth session strategy](auth/session-strategy.md)
- [Redis sessions](auth/redis-sessions.md)

## Update Rule

After each meaningful implementation step, add or revise questions for:

- What was implemented.
- Why it was implemented that way.
- What security, architecture, database, or frontend tradeoff was involved.
- What a senior interviewer might challenge.
- How to answer clearly without overclaiming.

Each question file should include:

- Implementation reason.
- Core questions.
- Security questions.
- Tricky follow-ups.
- A short interview summary.
