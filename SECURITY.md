# Security Policy

## Project status

KeyNest is a work-in-progress educational password-vault project. It has not
undergone an independent security audit, has no supported production release,
and is not appropriate for storing real passwords or other secrets. Use
synthetic data in demonstrations and bug reports.

## Reporting a vulnerability

Use GitHub's
[private vulnerability reporting](https://github.com/sujithgnth/keynest/security/advisories/new)
to report a suspected vulnerability. Do not open a public issue containing
exploit details, credentials, decrypted vault data, or other sensitive
information.

Include only the information needed to reproduce the problem:

- affected commit or branch;
- impacted component and security boundary;
- reproduction steps using synthetic data;
- expected and observed behavior; and
- potential impact, if known.

Reports are reviewed on a best-effort basis. There is currently no response or
remediation service-level agreement.

## Security scope

High-priority areas include browser-side encryption and key handling, account
authentication and sessions, CSRF and authorization controls, cross-vault data
isolation, audit/outbox consistency, RabbitMQ redelivery behavior, and secret
leakage through logs, metrics, fixtures, or external requests.

GitHub security automation and passing tests are useful evidence, but neither
constitutes a security certification.
