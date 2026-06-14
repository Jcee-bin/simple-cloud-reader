# Contributing

Simple Cloud Reader combines imported upstream applications with original
backend and integration code. Please discuss substantial changes in an issue
before investing in a large implementation.

## Before You Start

1. Read `README.md`, `CLAUDE.md`, and `LICENSES.md`.
2. Check `git status`; never discard work you did not create.
3. Keep changes focused on one behavior or documentation goal.
4. Preserve KOReader and Thorium attribution and license notices.
5. Never include secrets, personal book files, tokens, or signed URLs.

## Development

Install Node.js 22+, npm 11+, and dependencies:

```powershell
npm ci
```

Backend and contract verification:

```powershell
npm run test --workspace=@simple-cloud-reader/sync-contract
npm run typecheck --workspace=@simple-cloud-reader/sync-contract
npm run build --workspace=@simple-cloud-reader/sync-contract
npm run test --workspace=@simple-cloud-reader/api
npm run typecheck --workspace=@simple-cloud-reader/api
npm run build --workspace=@simple-cloud-reader/api
npm run db:check --workspace=@simple-cloud-reader/api
```

PostgreSQL integration tests require `TEST_DATABASE_URL`. GitHub Actions
provides a PostgreSQL 16 service for the authoritative CI run.

For Windows work, use the targeted commands in `CLAUDE.md` and the active
Windows phase plan. Broad upstream checks may include unrelated failures, so
state exactly which checks were run.

## Pull Requests

- Add tests for changed behavior.
- Update OpenAPI and human documentation when an API contract changes.
- Explain user-visible behavior, design decisions, and known limitations.
- Include screenshots for UI changes, with secrets and personal books removed.
- Keep generated files reproducible.
- Do not combine upstream cleanup, dependency churn, and product behavior in
  one pull request without a strong reason.

By submitting a contribution, you confirm that you have the right to submit
it. A license for original project code has not yet been selected, so external
code contributions should wait for maintainer confirmation if licensing terms
are material.
