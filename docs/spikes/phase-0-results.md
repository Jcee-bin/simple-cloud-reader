# Phase 0 Spike Results

**Branch:** `phase-0-technical-foundation`  
**Updated:** 2026-06-12

| Proof | Status | Evidence |
|---|---|---|
| Upstream imports | PASS | KOReader `5598a6e` and Thorium `c19a45f` imported as squashed subtrees; `apps/android/COPYING` and `apps/windows/LICENSE` verified. |
| Railway-compatible object storage | PARTIAL | Four API tests pass, including AWS Signature V4 upload/download URL generation and user-scoped object keys. Live MinIO verification requires Docker Desktop. |
| Cursor sync and idempotency | PASS | `services/api/test/sync.test.ts` proves retry deduplication and cursor pull; full API suite and strict typecheck pass. |
| Readium locator round trip | PASS | Focused Thorium Jest test preserves normalized progression and restores the exact engine locator; focused ESLint and the Electron main-process webpack build pass. |
| KOReader locator round trip | PENDING | Busted test and Lua adapter are present; WSL/Linux runtime is required to execute `./kodev test front simplecloud_canonicallocator`. |
| Android local book open | PENDING | Requires WSL/Linux Android build toolchain and an Android phone/tablet or emulator. |
| Windows local book open | PENDING | Requires running the Thorium development application and manually importing the non-DRM EPUB fixture. |

## Automated Evidence

From the repository root:

```text
npm test
  sync-contract: 2 files, 6 tests passed
  API: 5 files, 5 tests passed

npm run typecheck
  sync-contract: passed
  API: passed
```

From `apps/windows` with npm 11.17.0:

```text
corepack npm@11.17.0 run testFile -- test/simpleCloud/canonicalLocator.test.ts
  1 suite, 2 tests passed

ESLINT_USE_FLAT_CONFIG=false eslint \
  src/common/simpleCloud/canonicalLocator.ts \
  test/simpleCloud/canonicalLocator.test.ts
  passed

corepack npm@11.17.0 run build:dev:main
  webpack compiled successfully
```

## Host Prerequisites Still Required

This machine currently lacks Docker Desktop and WSL. Install and verify:

```powershell
wsl --install -d Ubuntu
winget install --exact --id Docker.DockerDesktop
wsl --status
docker version
docker compose version
```

Thorium requires npm `>=11.15.0`; this run used Corepack with npm `11.17.0`:

```powershell
corepack npm@11.17.0 --version
```

## Known Upstream Risk

Installing Thorium's pinned dependency tree reports 23 npm audit findings:
19 moderate, 2 high, and 2 critical. No automatic audit fix was applied because
that could introduce unreviewed breaking changes in the upstream reader. A
dependency and exploitability review is required before distribution.

## Scope Boundary

The in-memory sync store proves protocol shape only. PostgreSQL durability,
authorization middleware, authentication, tombstones, batching, and conflict
history belong to Phase 1. The in-memory implementation must not be used in
production.

Phase 0 is not complete until every `PARTIAL` and `PENDING` row is replaced by
`PASS` or a documented architectural revision.
