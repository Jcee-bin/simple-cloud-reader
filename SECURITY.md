# Security Policy

## Reporting a Vulnerability

Do not open a public issue for a vulnerability or exposed credential.

Use GitHub's private security advisory feature for this repository. Include:

- Affected route, component, or commit.
- Reproduction steps.
- Expected and actual behavior.
- Potential impact.
- Any proposed mitigation.

Do not include real user book files, access tokens, refresh tokens, magic-link
tokens, database URLs, bucket credentials, or still-valid signed URLs.

## Supported State

The backend is an active pre-release service. The Windows and Android clients
are under development. Security fixes target the current
`phase-0-technical-foundation` implementation until it is merged.

## Secret Handling

- Store production secrets only in Railway service variables.
- Store local secrets only in ignored `.env` files.
- Never put permanent storage credentials in a client build.
- Rotate a secret immediately if it appears in source, logs, chat, screenshots,
  issue attachments, or build artifacts.
- Treat magic links, refresh tokens, and signed object URLs as credentials.

## Current Operational Limits

The rate limiter is process-local and is appropriate only for the current
single API replica. A shared Redis- or PostgreSQL-backed limiter is required
before horizontal API scaling.

Before onboarding public users:

1. Rotate any credentials exposed during setup.
2. Exercise real magic-link and authenticated file-transfer flows.
3. Verify account deletion removes database rows and owned bucket objects.
4. Configure spending alerts, backups, restore drills, and maintenance.
5. Review dependencies, imported assets, and release artifacts.

The threat model is documented in
[`docs/architecture/threat-model.md`](docs/architecture/threat-model.md).
