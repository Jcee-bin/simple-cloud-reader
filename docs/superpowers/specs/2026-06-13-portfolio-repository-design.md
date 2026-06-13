# Portfolio Repository Design

**Status:** Approved direction, pending written-spec review  
**Date:** 2026-06-13

## Goal

Turn the existing Simple Cloud Reader repository into a credible,
resume-friendly engineering portfolio without overstating the unfinished
Windows and Android clients.

The repository should let a recruiter or engineer understand within a few
minutes:

1. What problem the product solves.
2. Which parts are live and which are still under development.
3. How the backend works from authentication through synchronization.
4. What technical decisions and tradeoffs were made.
5. How to run, test, deploy, and continue the project.

## Truthful Project Positioning

Simple Cloud Reader is one cross-device reading product with:

- A live Railway backend.
- A PostgreSQL synchronization model.
- Private S3-compatible book storage.
- Imported KOReader and Thorium foundations.
- Android and Windows client applications still under development.

Public documentation must never imply that the final user-facing reader is
already complete. The strongest current portfolio claim is:

> Designed and deployed an offline-first synchronization backend for a
> cross-platform ebook reader, with authenticated file transfer, idempotent
> mutations, conflict recovery, tombstones, quotas, and production hardening.

## Public Repository Package

### Root README

Replace the minimal root `README.md` with a concise public landing page:

- One-paragraph product pitch.
- Honest status badge: backend live, clients in development.
- Supported targets: Android phone/tablet and Windows.
- Live readiness endpoint.
- Architecture diagram.
- Current backend capabilities.
- Technology stack.
- Repository map.
- Quick-start and verification commands.
- Security and privacy summary.
- Roadmap.
- Attribution and licensing.
- Links to detailed backend, portfolio, contribution, security, and handoff
  documents.

The README must be skimmable and avoid repeating every internal detail.

### Backend Guide

Create `docs/BACKEND.md` as the detailed human explanation. It will explain:

- Fastify request lifecycle.
- Configuration and startup validation.
- PostgreSQL and Drizzle.
- Every logical database group.
- Magic-link authentication.
- JWT and rotating refresh tokens.
- Device identity.
- Private signed file uploads/downloads.
- File completion verification.
- Idempotent sync mutation receipts.
- Change log and opaque cursors.
- Entity versions and conflicts.
- Note recovery history.
- Progress conflict detection.
- Tombstones and cascading deletion.
- Account deletion.
- Rate limiting, quotas, body limits, timeouts, and headers.
- Health checks, logging, maintenance, Railway deployment, and CI.

Each section will include why the subsystem exists, how data flows, and which
failure it prevents.

### Architecture and Schemas

Create `docs/architecture/backend-schema.md` with:

- A Mermaid deployment diagram.
- A Mermaid database ER diagram.
- A table-by-table data dictionary.
- Authentication sequence diagram.
- Signed upload sequence diagram.
- Sync push/pull sequence diagram.
- Deletion/tombstone sequence diagram.
- Trust boundaries and secret locations.

The checked-in OpenAPI document remains the machine-readable API schema:

```text
packages/sync-contract/openapi/simple-cloud-reader-v1.json
```

Create `docs/API.md` as the human-readable endpoint catalog. It will list
method, path, authentication requirement, purpose, important request/response
fields, rate policy, and common errors. It will link to the OpenAPI schema
rather than duplicate every generated type.

### Portfolio Guide

Create `docs/PORTFOLIO.md` with:

- A 30-second project explanation.
- Resume bullet variants.
- A longer portfolio description.
- Interview talking points.
- Major technical challenges and decisions.
- Honest current status.
- Claims that are supported by tests or a live endpoint.
- Claims to avoid until the clients are finished.

Resume bullets must focus on the user's engineering ownership and outcomes,
not imply large-scale production usage that has not occurred.

### Continuation Guides

Create `CLAUDE.md` at the repository root with:

- Product scope and platform constraints.
- Source-of-truth documents.
- Current branch and deployment facts.
- Repository conventions.
- Commands that produce meaningful verification.
- Upstream licensing constraints.
- Dirty-worktree warning.
- Rules against exposing secrets or rewriting renderer engines.
- Windows-first execution order.

Create `NEXT_STEPS.md` with:

- Immediate Windows Task 1 completion.
- Windows vertical-slice milestones.
- Required UI/design documents before visual implementation.
- Backend integration sequence.
- Acceptance criteria for each milestone.
- Android work explicitly deferred until the Windows vertical slice passes.
- A ready-to-paste Claude prompt that instructs Claude to read `CLAUDE.md`,
  `HANDOFF.md`, the approved product specification, and the Windows plan before
  changing code.

Update `HANDOFF.md` to point to these public documents and reflect that the
live readiness gate now passes.

### Community and Safety Files

Create:

- `CONTRIBUTING.md`
- `SECURITY.md`
- `LICENSES.md`
- `.github/pull_request_template.md`
- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/dependabot.yml`

`LICENSES.md` will explain the mixed-license monorepo:

- Android KOReader derivative: AGPL-3.0.
- Windows Thorium derivative: BSD-3-Clause.
- Original backend/shared code: license choice must be explicit before broad
  external contribution or distribution.

Do not add a misleading single root license that claims imported upstream code
uses one license.

## GitHub Presentation

Update the GitHub repository metadata:

- Description: keep the current accurate summary.
- Homepage: live backend readiness or project documentation URL.
- Topics: ebook-reader, offline-first, typescript, fastify, postgresql,
  railway, android, windows, koreader, readium, synchronization.

The repository currently has `main` as its default branch while the meaningful
implementation is in `phase-0-technical-foundation`. PR #1 is clean and should
eventually merge into `main`. The documentation pass must not merge the PR
automatically without checking that the unfinished Windows Task 1 work is
either committed coherently or excluded.

## Git and Worktree Safety

Existing uncommitted Windows API-code-generation changes belong to the next
implementation phase. They must not be reverted, silently reformatted, or
mixed into the portfolio documentation commit.

The existing untracked `HANDOFF.md` is part of this documentation package and
may be edited and committed.

Documentation commits will stage only the public presentation files. Windows
source, generated types, lockfiles, workflow edits, and the Phase 2 plan edits
remain untouched unless they are intentionally completed in a later commit.

## Verification

Before committing:

- Check every local link and referenced path.
- Scan for secrets, tokens, private credentials, placeholders, and unsupported
  claims.
- Render Mermaid syntax mentally and keep diagrams GitHub-compatible.
- Verify the live `/health/ready` endpoint.
- Verify documented commands against current package scripts.
- Run `git diff --check`.
- Confirm staged files do not include unfinished Windows implementation work.

After committing:

- Push the documentation commit to `phase-0-technical-foundation`.
- Update GitHub description, homepage, and topics.
- Confirm PR #1 remains mergeable.

## Definition of Done

This portfolio pass is complete when:

1. A recruiter can understand the project and current status from the README.
2. An engineer can understand every backend subsystem from `docs/BACKEND.md`.
3. Database relationships and major request flows have readable diagrams.
4. The OpenAPI contract is clearly discoverable.
5. Resume claims are truthful and evidence-backed.
6. Another LLM can begin Windows work from `CLAUDE.md`, `HANDOFF.md`, and
   `NEXT_STEPS.md` without reconstructing prior decisions.
7. Community, security, and mixed-license expectations are explicit.
8. No secrets or unfinished Windows implementation files enter the
   documentation commit.
