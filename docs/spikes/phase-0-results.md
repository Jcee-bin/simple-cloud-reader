# Phase 0 Spike Results

**Branch:** `phase-0-technical-foundation`  
**Updated:** 2026-06-12

| Proof | Status | Evidence |
|---|---|---|
| Upstream imports | PASS | KOReader `5598a6e` and Thorium `c19a45f` imported as squashed subtrees; `apps/android/COPYING` and `apps/windows/LICENSE` verified. |
| Railway-compatible object storage | PARTIAL | Managed upload, completion, download, deletion, readiness, and user-scoped object keys pass in API and PostgreSQL tests. A live Railway signed transfer is still required. |
| Cursor sync and idempotency | PASS | PostgreSQL-backed tests prove ordered cursor pull, signed user-scoped cursors, retry deduplication, conflicts, and tombstones. |
| Readium locator round trip | PASS | Focused Thorium Jest test preserves normalized progression and restores the exact engine locator; focused ESLint and the Electron main-process webpack build pass. |
| KOReader locator round trip | PASS | GitHub Actions builds the pinned KOReader base and passes `./kodev test front simplecloud_canonicallocator` on Ubuntu. |
| Android local book open | PENDING | Requires WSL/Linux Android build toolchain and an Android phone/tablet or emulator. |
| Windows local book open | PENDING | Requires running the Thorium development application and manually importing the non-DRM EPUB fixture. |

The checked-in `.github/workflows/phase-0.yml` passed all three jobs in
[GitHub Actions run 27390740580](https://github.com/Jcee-bin/simple-cloud-reader/actions/runs/27390740580):

- `contract-and-api`: strict typecheck, tests, and build.
- `windows-locator`: focused Jest and ESLint checks plus the Thorium
  main-process webpack build.
- `android-locator`: pinned KOReader dependency bootstrap, native base build,
  and the focused Busted locator test.

The workflow syntax also passes `@action-validator/cli`.

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

Automated installation was attempted on 2026-06-12. WSL could not enable its
optional Windows features without elevation. Docker Desktop downloaded, but
its elevated installer exited with code `4294967291`; no Docker package or
service was installed.

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

Phase 1 has replaced the in-memory proof with authenticated PostgreSQL-backed
sync and managed file metadata. The remaining Phase 0 gaps are live object
storage and manual Android/Windows book-opening checks.

Phase 0 is not complete until every `PARTIAL` and `PENDING` row is replaced by
`PASS` or a documented architectural revision.
