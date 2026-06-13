# Backend Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Railway API suitable for a cautious public beta.

**Architecture:** Keep the initial deployment single-replica and add bounded
Fastify request controls, PostgreSQL-serialized storage quotas, an authenticated
account deletion service, structured redacted logs, and an idempotent
maintenance command. Preserve direct S3 transfers and the existing sync
contract.

**Tech Stack:** TypeScript, Fastify, PostgreSQL 16, Drizzle ORM, Railway Storage
Buckets, Zod, Vitest, GitHub Actions.

---

### Task 1: Server and route abuse controls

**Files:**
- Create: `services/api/src/security/rateLimiter.ts`
- Modify: `services/api/src/app.ts`
- Modify: `services/api/src/server.ts`
- Modify: `services/api/src/routes/auth.ts`
- Modify: `services/api/src/routes/files.ts`
- Modify: `services/api/src/routes/sync.ts`
- Test: `services/api/test/security.test.ts`

- [ ] Write failing tests for body limits, security headers, anonymous IP
  limits, authenticated user limits, and bounded limiter storage.
- [ ] Run the focused tests and confirm they fail for missing controls.
- [ ] Implement fixed-window policies and Fastify server settings.
- [ ] Run focused and complete API tests.
- [ ] Commit only the security-control files.

### Task 2: Transactional storage quotas

**Files:**
- Modify: `services/api/src/files/fileService.ts`
- Modify: `services/api/src/files/postgresFileRepository.ts`
- Modify: `services/api/src/config.ts`
- Modify: `services/api/src/server.ts`
- Test: `services/api/test/fileService.test.ts`
- Test: `services/api/test/files.integration.test.ts`

- [ ] Write failing tests for the 250 MiB file ceiling, 2 GiB user quota, and
  two simultaneous reservations near the quota.
- [ ] Run focused tests and confirm quota behavior is absent.
- [ ] Enforce quota inside the reservation transaction under a user advisory
  lock.
- [ ] Run file, migration, type, and complete API checks.
- [ ] Commit quota behavior separately.

### Task 3: Account deletion

**Files:**
- Create: `services/api/src/account/accountService.ts`
- Create: `services/api/src/account/postgresAccountRepository.ts`
- Create: `services/api/src/routes/account.ts`
- Modify: `services/api/src/app.ts`
- Modify: `services/api/src/server.ts`
- Modify: `packages/sync-contract/src/openapi.ts`
- Test: `services/api/test/account.test.ts`
- Test: `services/api/test/account.integration.test.ts`

- [ ] Write failing route and PostgreSQL integration tests proving bearer
  authentication, object deletion, user cascade deletion, and retry safety.
- [ ] Run focused tests and confirm the route does not exist.
- [ ] Implement bucket-first deletion followed by the cascading user delete.
- [ ] Add the route to the generated OpenAPI document and regenerate it.
- [ ] Run contract and API verification, then commit.

### Task 4: Maintenance and observability

**Files:**
- Create: `services/api/src/maintenance/maintenanceService.ts`
- Create: `services/api/src/maintenance.ts`
- Modify: `services/api/src/auth/authRepository.ts`
- Modify: `services/api/src/auth/postgresAuthRepository.ts`
- Modify: `services/api/package.json`
- Modify: `services/api/src/app.ts`
- Test: `services/api/test/maintenance.integration.test.ts`
- Test: `services/api/test/logging.test.ts`

- [ ] Write failing tests for expired auth cleanup and redacted structured
  logging configuration.
- [ ] Implement an idempotent `npm run maintenance` command.
- [ ] Enable request IDs and JSON logs while redacting authorization, tokens,
  and email-login bodies.
- [ ] Run focused and complete tests, then commit.

### Task 5: Railway operations and final proof

**Files:**
- Modify: `infra/railway/README.md`
- Modify: `infra/railway/railway.json`
- Modify: `.github/workflows/phase-0.yml`
- Modify: `docs/spikes/phase-1-results.md`
- Test: `services/api/test/load.test.ts`

- [ ] Add a deterministic sustained-request test and prove limits return 429
  without crashing or bypassing authentication.
- [ ] Document spend caps, metrics, alerts, PITR/manual backup restore,
  maintenance, quota variables, and launch verification.
- [ ] Run generation, typechecks, all tests, builds, migration checks, and
  `git diff --check`.
- [ ] Push and wait for the PostgreSQL CI job.
- [ ] Exercise deployed liveness, readiness, authentication, and one signed
  file transfer when Railway credentials are available; otherwise record
  Railway project creation as the sole external action.
