# Portfolio Repository Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the repository understandable, credible, and continuation-ready
for recruiters, engineers, contributors, and coding agents.

**Architecture:** Keep the root README concise and route technical depth into
focused documents. Use the checked-in OpenAPI contract as the machine schema,
Mermaid for GitHub-native diagrams, and explicit status language that separates
the live backend from unfinished client applications.

**Tech Stack:** Markdown, Mermaid, GitHub repository metadata and templates,
existing TypeScript/OpenAPI/PostgreSQL project artifacts.

---

### Task 1: Public project landing page

**Files:**

- Modify: `README.md`

- [x] Replace the planning-only README with an honest product overview.
- [x] Add architecture, capabilities, stack, repository map, quick-start,
      security, roadmap, status, and documentation links.
- [x] Link the live readiness endpoint and authoritative CI evidence.
- [x] Verify no client-completion or production-scale claims are made.

### Task 2: Human backend and schema documentation

**Files:**

- Create: `docs/BACKEND.md`
- Create: `docs/API.md`
- Create: `docs/architecture/backend-schema.md`

- [x] Explain each backend subsystem in human language.
- [x] Document all stable API routes, authentication, rate policies, and
      common errors.
- [x] Add deployment, ER, authentication, file-transfer, sync, and deletion
      Mermaid diagrams.
- [x] Link the generated OpenAPI schema as the machine-readable source.

### Task 3: Portfolio and continuation documentation

**Files:**

- Create: `docs/PORTFOLIO.md`
- Create: `CLAUDE.md`
- Create: `NEXT_STEPS.md`
- Modify: `HANDOFF.md`

- [x] Add resume bullets and interview talking points with evidence boundaries.
- [x] Add repository rules and meaningful verification commands for Claude.
- [x] Lock execution to the Windows vertical slice before Android.
- [x] Include a ready-to-paste Claude continuation prompt.
- [x] Refresh the handoff links and live deployment status.

### Task 4: Community, security, and licensing

**Files:**

- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Create: `LICENSES.md`
- Create: `.github/pull_request_template.md`
- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`
- Create: `.github/ISSUE_TEMPLATE/feature_request.yml`
- Create: `.github/dependabot.yml`

- [x] Explain contribution and verification expectations.
- [x] Document private vulnerability reporting and secret handling.
- [x] Explain the mixed AGPL/BSD/original-code licensing status without adding
      a misleading root license.
- [x] Add structured issue and PR templates.
- [x] Configure monthly npm and GitHub Actions dependency updates.

### Task 5: Verification and GitHub presentation

**Files:**

- Modify only the documentation/community files from Tasks 1-4.

- [ ] Check all referenced local files.
- [ ] Scan for secrets, unsupported metrics, placeholders, and stale status.
- [ ] Verify the live readiness endpoint and GitHub CI run.
- [ ] Run `git diff --check`.
- [ ] Stage only portfolio files; exclude all unfinished Windows implementation
      files and lockfile/workflow changes.
- [ ] Commit and push to `phase-0-technical-foundation`.
- [ ] Update GitHub homepage and repository topics.
- [ ] Confirm PR #1 remains cleanly mergeable.
