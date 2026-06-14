# Claude Code Guide

## Mission

Continue Simple Cloud Reader as one calm, offline-first reading product for:

- Android phones and tablets through one responsive Android app.
- Windows desktop through one Windows app.

There is no iOS, macOS, Linux, web, Kindle, or Kobo client in scope.

## Read Before Editing

Read these in order:

1. `HANDOFF.md`
2. `FRONTEND_HANDOFF.md`
3. `docs/superpowers/specs/2026-06-12-simple-cloud-reader-design.md`
4. `NEXT_STEPS.md`
5. `docs/superpowers/plans/2026-06-12-phase-2-windows-vertical-slice.md`
6. `docs/BACKEND.md`
7. `packages/sync-contract/openapi/simple-cloud-reader-v1.json`

The checked-in OpenAPI document is the client/backend contract. Do not invent
routes from prose when the schema can answer the question.

## Current State

- Working branch: `phase-0-technical-foundation`
- Pull request: `https://github.com/Jcee-bin/simple-cloud-reader/pull/1`
- Live API: `https://simple-cloud-reader-production.up.railway.app`
- Windows work comes before Android work.
- The visible reader UI is not complete.

The worktree may contain unfinished Windows API-code-generation changes:

```text
apps/windows/src/common/simpleCloud/api.types.ts
apps/windows/test/simpleCloud/apiContract.test.ts
tools/openapi-codegen/
apps/windows/package.json
package.json
package-lock.json
.github/workflows/phase-0.yml
```

Inspect `git status` before editing. Do not revert, replace, or silently format
those changes. Finish them coherently as Windows Phase 2 Task 1.

## Architecture Rules

- Android remains based on KOReader.
- Windows remains based on Thorium Reader / Readium Desktop.
- Do not rewrite rendering engines.
- Keep product-specific Windows additions behind `simpleCloud` modules and
  adapters where practical.
- Keep Android phone and tablet in one responsive application.
- Store imported books in app-managed local storage, not as fragile references
  to arbitrary original paths.
- Separate local device state from synchronized server state.
- Preserve the backend's operation IDs, entity versions, cursors, conflicts,
  and tombstones instead of reducing sync to naive record replacement.

## Product Rules

- Open into a cover-first library, not an advanced file browser.
- Keep navigation shallow and quiet.
- Use four highlight roles: yellow important, blue question, pink quote, green
  review.
- Do not copy ReadEra branding, source, icons, screenshots, or assets.
- Essential actions must not depend on hover.
- Use visible keyboard focus on Windows.
- Before implementing visual screens, create or update `PRODUCT.md` and
  `DESIGN.md` using the approved Impeccable/design workflow.

## Engineering Rules

- Make focused changes that follow existing upstream patterns.
- Add or update a failing test before behavior changes when practical.
- Prefer targeted verification because broad upstream Thorium checks currently
  include unrelated TypeScript 6 and ESM noise.
- Never expose Railway, Resend, JWT, cursor, database, or bucket credentials.
- Never commit `.env` files, tokens, signed URLs, or screenshots containing
  secrets.
- Do not claim that clients are complete without a fresh build and manual
  verification.

## Meaningful Verification

Backend and shared contract:

```powershell
npm run test --workspace=@simple-cloud-reader/sync-contract
npm run typecheck --workspace=@simple-cloud-reader/sync-contract
npm run build --workspace=@simple-cloud-reader/sync-contract
npm run test --workspace=@simple-cloud-reader/api
npm run typecheck --workspace=@simple-cloud-reader/api
npm run build --workspace=@simple-cloud-reader/api
npm run db:check --workspace=@simple-cloud-reader/api
```

Windows Task 1:

```powershell
npm run generate:simple-cloud-api --workspace=apps/windows
npm run testFile --workspace=apps/windows -- test/simpleCloud/apiContract.test.ts
npm run build:dev:main --workspace=apps/windows
```

Confirm actual script names against the current worktree before running them.
Do not substitute a broad repository typecheck as proof of the targeted
Windows integration.

## Licensing

- `apps/android`: KOReader derivative, AGPL-3.0 obligations apply.
- `apps/windows`: Thorium derivative, preserve BSD-3-Clause notices.
- Original project code has no single root license yet.

Read `LICENSES.md` and `UPSTREAMS.md` before moving, publishing, or relicensing
code.
