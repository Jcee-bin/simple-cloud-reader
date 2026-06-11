# Phase 0 Technical Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the monorepo foundation and prove that KOReader, Thorium,
canonical locators, and Railway-compatible synchronization can support the
approved product.

**Architecture:** Import pinned KOReader and Thorium sources as squashed git
subtrees. Add a small TypeScript workspace for the shared contract and API
spike, plus a Lua locator adapter inside the Android tree. Exercise the backend
against local PostgreSQL and MinIO because they match Railway's PostgreSQL and
S3-compatible bucket interfaces.

**Tech Stack:** Git subtree, KOReader/Lua/Busted, Thorium/Electron/TypeScript/
Jest, Node.js 22, npm 11, Fastify, Zod, PostgreSQL 16, MinIO, Docker Compose,
Vitest.

---

## File Map

```text
UPSTREAMS.md
package.json
package-lock.json
tsconfig.base.json
apps/
  android/                         imported KOReader source
    frontend/apps/simplecloud/
      canonicallocator.lua         KOReader locator adapter
    spec/unit/
      simplecloud_canonicallocator_spec.lua
  windows/                         imported Thorium source
    src/common/simpleCloud/
      canonicalLocator.ts          Readium locator adapter
      canonicalLocator.test.ts
packages/
  sync-contract/
    package.json
    src/
      index.ts
      locator.ts
      sync.ts
      fixtures/locators.json
    test/
      locator.test.ts
      sync.test.ts
services/
  api/
    package.json
    src/
      app.ts
      config.ts
      server.ts
      routes/health.ts
      routes/files.ts
      routes/sync.ts
      storage/objectStore.ts
      sync/inMemorySyncStore.ts
    test/
      health.test.ts
      files.test.ts
      sync.test.ts
infra/local/
  compose.yaml
  minio-init/
    create-bucket.sh
docs/spikes/
  phase-0-results.md
```

## Task 0: Prepare the Windows Build Host

**Files:** None

This machine currently has Node.js `v24.13.1` and npm `11.14.1`, but Docker and
WSL are not installed. KOReader's documented Windows development path requires
WSL or a Linux virtual machine, and the local backend proof requires Docker.

- [ ] **Step 1: Install WSL with Ubuntu**

Open an elevated PowerShell window and run:

```powershell
wsl --install -d Ubuntu
```

Expected: Windows installs WSL and Ubuntu and may request a restart.

- [ ] **Step 2: Restart if requested and finish Ubuntu setup**

Launch Ubuntu once, create the requested Linux username/password, then run:

```bash
sudo apt update
sudo apt install --no-install-recommends autoconf automake build-essential \
  ca-certificates ccache cmake curl gettext git libffi-dev libssl-dev \
  nasm ninja-build patch pkg-config procps-ng tar unzip wget
```

Expected: all packages install successfully.

- [ ] **Step 3: Install Docker Desktop**

Open PowerShell and run:

```powershell
winget install --exact --id Docker.DockerDesktop
```

Start Docker Desktop and enable its WSL 2 engine when prompted.

- [ ] **Step 4: Verify prerequisites**

Run:

```powershell
wsl --status
docker version
docker compose version
node --version
npm --version
```

Expected: WSL reports version 2, Docker client and server are reachable, Node
is at least 22, and npm is at least 11.

- [ ] **Step 5: Stop if host setup is incomplete**

Do not begin upstream imports until all commands in Step 4 succeed. Host
installation can require a Windows restart, so resume the plan in a fresh
session after reboot if necessary.

## Task 1: Import and Pin Both Upstreams

**Files:**
- Create: `UPSTREAMS.md`
- Create: `apps/android/**` through git subtree
- Create: `apps/windows/**` through git subtree

- [ ] **Step 1: Add the upstream remotes**

Run:

```powershell
git remote add upstream-koreader https://github.com/koreader/koreader.git
git remote add upstream-thorium https://github.com/edrlab/thorium-reader.git
git fetch upstream-koreader 5598a6ee4488bf88fd0ab15b24dce2cdee61d508
git fetch upstream-thorium c19a45f1cc2d352c88952e8da4f1794d9dfe6c29
```

Expected: both pinned commits are present in `FETCH_HEAD` history and no
working-tree files change.

- [ ] **Step 2: Import KOReader**

Run:

```powershell
git subtree add --prefix=apps/android upstream-koreader 5598a6ee4488bf88fd0ab15b24dce2cdee61d508 --squash
```

Expected: `apps/android/frontend/apps/reader/readerui.lua` and
`apps/android/COPYING` exist.

- [ ] **Step 3: Import Thorium**

Run:

```powershell
git subtree add --prefix=apps/windows upstream-thorium c19a45f1cc2d352c88952e8da4f1794d9dfe6c29 --squash
```

Expected: `apps/windows/package.json` and `apps/windows/LICENSE` exist.

- [ ] **Step 4: Record provenance**

Create `UPSTREAMS.md`:

```markdown
# Upstream Sources

## Android

- Project: KOReader
- URL: https://github.com/koreader/koreader
- Imported commit: `5598a6ee4488bf88fd0ab15b24dce2cdee61d508`
- Import path: `apps/android`
- License: AGPL-3.0, see `apps/android/COPYING`
- Update method: `git subtree pull --prefix=apps/android upstream-koreader master --squash`

## Windows

- Project: Thorium Reader
- URL: https://github.com/edrlab/thorium-reader
- Imported commit: `c19a45f1cc2d352c88952e8da4f1794d9dfe6c29`
- Import path: `apps/windows`
- License: BSD-3-Clause, see `apps/windows/LICENSE`
- Update method: `git subtree pull --prefix=apps/windows upstream-thorium develop --squash`
```

- [ ] **Step 5: Verify provenance and licenses**

Run:

```powershell
Test-Path apps/android/COPYING
Test-Path apps/windows/LICENSE
git log --oneline --all -- UPSTREAMS.md apps/android apps/windows | Select-Object -First 10
```

Expected: both `Test-Path` calls print `True`; the log includes both subtree
imports.

- [ ] **Step 6: Commit provenance**

```powershell
git add UPSTREAMS.md
git commit -m "build: pin reader upstreams"
```

Expected: commit succeeds and `git status --short` is empty.

## Task 2: Create the Root TypeScript Workspace

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `packages/sync-contract/package.json`
- Create: `services/api/package.json`
- Create: `package-lock.json` through npm

- [ ] **Step 1: Add the root workspace manifest**

Create `package.json`:

```json
{
  "name": "simple-cloud-reader",
  "version": "0.0.0",
  "private": true,
  "engines": {
    "node": ">=22.0.0",
    "npm": ">=11.0.0"
  },
  "workspaces": [
    "packages/*",
    "services/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present"
  },
  "devDependencies": {
    "typescript": "6.0.3"
  }
}
```

- [ ] **Step 2: Add strict shared TypeScript settings**

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 3: Add workspace package manifests**

Create `packages/sync-contract/package.json`:

```json
{
  "name": "@simple-cloud-reader/sync-contract",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "zod": "4.4.3"
  },
  "devDependencies": {
    "vitest": "4.1.8"
  }
}
```

Create `services/api/package.json`:

```json
{
  "name": "@simple-cloud-reader/api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "3.1066.0",
    "@aws-sdk/s3-request-presigner": "3.1066.0",
    "@simple-cloud-reader/sync-contract": "0.0.0",
    "fastify": "5.8.5",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@types/node": "25.9.3",
    "vitest": "4.1.8"
  }
}
```

- [ ] **Step 4: Add package TypeScript configs**

Create `packages/sync-contract/tsconfig.json` and
`services/api/tsconfig.json` with the same content:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 5: Install and verify workspace resolution**

Run:

```powershell
npm install
npm ls @simple-cloud-reader/sync-contract fastify zod
```

Expected: npm exits `0` and reports the local sync-contract workspace plus
Fastify and Zod without invalid dependencies.

- [ ] **Step 6: Commit the workspace**

```powershell
git add package.json package-lock.json tsconfig.base.json packages/sync-contract/package.json packages/sync-contract/tsconfig.json services/api/package.json services/api/tsconfig.json
git commit -m "build: add shared TypeScript workspace"
```

## Task 3: Define Canonical Locator and Sync Contracts

**Files:**
- Create: `packages/sync-contract/src/locator.ts`
- Create: `packages/sync-contract/src/sync.ts`
- Create: `packages/sync-contract/src/index.ts`
- Create: `packages/sync-contract/src/fixtures/locators.json`
- Test: `packages/sync-contract/test/locator.test.ts`
- Test: `packages/sync-contract/test/sync.test.ts`

- [ ] **Step 1: Write failing locator tests**

Create `packages/sync-contract/test/locator.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import fixtures from "../src/fixtures/locators.json";
import { canonicalLocatorSchema } from "../src/locator.js";

describe("canonicalLocatorSchema", () => {
  it.each(fixtures.valid)("accepts $name", ({ locator }) => {
    expect(canonicalLocatorSchema.parse(locator)).toEqual(locator);
  });

  it.each(fixtures.invalid)("rejects $name", ({ locator }) => {
    expect(() => canonicalLocatorSchema.parse(locator)).toThrow();
  });
});
```

- [ ] **Step 2: Add locator fixtures**

Create `packages/sync-contract/src/fixtures/locators.json`:

```json
{
  "valid": [
    {
      "name": "epub cfi",
      "locator": {
        "format": "epub",
        "progression": 0.42,
        "engine": "readium",
        "engineLocation": {
          "href": "chapter-4.xhtml",
          "type": "application/xhtml+xml",
          "locations": {
            "progression": 0.25,
            "totalProgression": 0.42,
            "cfi": "/6/8!/4/2/14"
          }
        }
      }
    },
    {
      "name": "koreader page",
      "locator": {
        "format": "pdf",
        "progression": 0.5,
        "engine": "koreader",
        "engineLocation": {
          "page": 50,
          "pageCount": 100
        }
      }
    }
  ],
  "invalid": [
    {
      "name": "progression below zero",
      "locator": {
        "format": "epub",
        "progression": -0.1,
        "engine": "readium",
        "engineLocation": {}
      }
    },
    {
      "name": "missing engine location",
      "locator": {
        "format": "pdf",
        "progression": 0.4,
        "engine": "koreader"
      }
    }
  ]
}
```

- [ ] **Step 3: Run the locator test and observe failure**

Run:

```powershell
npm exec --workspace=@simple-cloud-reader/sync-contract vitest run test/locator.test.ts
```

Expected: FAIL because `src/locator.ts` does not exist.

- [ ] **Step 4: Implement the locator schema**

Create `packages/sync-contract/src/locator.ts`:

```typescript
import { z } from "zod";

export const canonicalLocatorSchema = z.object({
  format: z.string().min(1),
  progression: z.number().min(0).max(1),
  engine: z.enum(["koreader", "readium"]),
  engineLocation: z.record(z.string(), z.unknown()),
});

export type CanonicalLocator = z.infer<typeof canonicalLocatorSchema>;
```

- [ ] **Step 5: Write failing sync-envelope tests**

Create `packages/sync-contract/test/sync.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { mutationBatchSchema } from "../src/sync.js";

describe("mutationBatchSchema", () => {
  it("accepts an idempotent progress mutation", () => {
    const value = {
      deviceId: "device-a",
      operations: [{
        operationId: "op-1",
        entityType: "progress",
        entityId: "book-1",
        action: "upsert",
        clientTimestamp: "2026-06-12T00:00:00.000Z",
        payload: {
          format: "epub",
          progression: 0.42,
          engine: "readium",
          engineLocation: {}
        }
      }]
    };

    expect(mutationBatchSchema.parse(value)).toEqual(value);
  });

  it("rejects duplicate operation IDs in one batch", () => {
    const operation = {
      operationId: "op-1",
      entityType: "bookmark",
      entityId: "bookmark-1",
      action: "delete",
      clientTimestamp: "2026-06-12T00:00:00.000Z",
      payload: {}
    };

    expect(() => mutationBatchSchema.parse({
      deviceId: "device-a",
      operations: [operation, operation]
    })).toThrow();
  });
});
```

- [ ] **Step 6: Implement mutation and cursor schemas**

Create `packages/sync-contract/src/sync.ts`:

```typescript
import { z } from "zod";
import { canonicalLocatorSchema } from "./locator.js";

export const entityTypeSchema = z.enum([
  "book",
  "progress",
  "highlight",
  "note",
  "bookmark",
  "collection",
  "collectionMembership"
]);

export const mutationOperationSchema = z.object({
  operationId: z.string().min(1),
  entityType: entityTypeSchema,
  entityId: z.string().min(1),
  action: z.enum(["upsert", "delete"]),
  clientTimestamp: z.iso.datetime(),
  payload: z.union([
    canonicalLocatorSchema,
    z.record(z.string(), z.unknown())
  ])
});

export const mutationBatchSchema = z.object({
  deviceId: z.string().min(1),
  operations: z.array(mutationOperationSchema).max(100)
}).superRefine(({ operations }, context) => {
  const seen = new Set<string>();
  operations.forEach((operation, index) => {
    if (seen.has(operation.operationId)) {
      context.addIssue({
        code: "custom",
        path: ["operations", index, "operationId"],
        message: "operationId must be unique within a batch"
      });
    }
    seen.add(operation.operationId);
  });
});

export const syncChangeSchema = mutationOperationSchema.extend({
  serverVersion: z.number().int().positive(),
  serverTimestamp: z.iso.datetime()
});

export const pullResponseSchema = z.object({
  cursor: z.string().min(1),
  hasMore: z.boolean(),
  changes: z.array(syncChangeSchema)
});

export type MutationBatch = z.infer<typeof mutationBatchSchema>;
export type SyncChange = z.infer<typeof syncChangeSchema>;
```

Create `packages/sync-contract/src/index.ts`:

```typescript
export * from "./locator.js";
export * from "./sync.js";
```

- [ ] **Step 7: Run contract tests and typecheck**

Run:

```powershell
npm exec --workspace=@simple-cloud-reader/sync-contract vitest run
npm run typecheck --workspace=@simple-cloud-reader/sync-contract
```

Expected: all contract tests pass and TypeScript exits `0`.

- [ ] **Step 8: Commit the contract**

```powershell
git add packages/sync-contract
git commit -m "feat: define sync and locator contracts"
```

## Task 4: Prove the Railway-Compatible Local Infrastructure

**Files:**
- Create: `infra/local/compose.yaml`
- Create: `infra/local/minio-init/create-bucket.sh`
- Create: `services/api/src/config.ts`
- Create: `services/api/src/storage/objectStore.ts`
- Create: `services/api/src/routes/health.ts`
- Create: `services/api/src/routes/files.ts`
- Create: `services/api/src/app.ts`
- Create: `services/api/src/server.ts`
- Test: `services/api/test/health.test.ts`
- Test: `services/api/test/files.test.ts`

- [ ] **Step 1: Add PostgreSQL and MinIO**

Create `infra/local/compose.yaml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: simple_cloud_reader
      POSTGRES_USER: reader
      POSTGRES_PASSWORD: reader
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U reader -d simple_cloud_reader"]
      interval: 2s
      timeout: 2s
      retries: 20

  minio:
    image: minio/minio:RELEASE.2025-09-07T16-13-09Z
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"

  minio-init:
    image: minio/mc:RELEASE.2025-08-13T08-35-41Z
    depends_on:
      - minio
    entrypoint: ["/bin/sh", "/scripts/create-bucket.sh"]
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - ./minio-init:/scripts:ro
```

Create `infra/local/minio-init/create-bucket.sh`:

```sh
#!/bin/sh
set -eu
until mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"; do
  sleep 2
done
mc mb --ignore-existing local/simple-cloud-reader
mc anonymous set none local/simple-cloud-reader
```

- [ ] **Step 2: Write a failing health test**

Create `services/api/test/health.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

describe("GET /health", () => {
  it("reports the API as ready", async () => {
    const app = buildApp();
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
    await app.close();
  });
});
```

- [ ] **Step 3: Run the health test and observe failure**

Run:

```powershell
npm exec --workspace=@simple-cloud-reader/api vitest run test/health.test.ts
```

Expected: FAIL because `src/app.ts` does not exist.

- [ ] **Step 4: Implement API configuration and health**

Create `services/api/src/config.ts`:

```typescript
import { z } from "zod";

const configSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().min(1).default("auto"),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_FORCE_PATH_STYLE: z.stringbool().default(false)
});

export type ApiConfig = z.infer<typeof configSchema>;

export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env
): ApiConfig {
  return configSchema.parse(environment);
}
```

Create `services/api/src/routes/health.ts`:

```typescript
import type { FastifyInstance } from "fastify";

export async function registerHealthRoute(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => ({ status: "ok" }));
}
```

Create `services/api/src/app.ts`:

```typescript
import Fastify, { type FastifyInstance } from "fastify";
import { registerHealthRoute } from "./routes/health.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  void app.register(registerHealthRoute);
  return app;
}
```

Create `services/api/src/server.ts`:

```typescript
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = buildApp();

await app.listen({ host: "0.0.0.0", port: config.PORT });
```

- [ ] **Step 5: Run the health test**

Run:

```powershell
npm exec --workspace=@simple-cloud-reader/api vitest run test/health.test.ts
```

Expected: PASS.

- [ ] **Step 6: Write failing signed-URL tests**

Create `services/api/test/files.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import type { ObjectStore } from "../src/storage/objectStore.js";

describe("POST /v1/files/:bookId/upload-url", () => {
  it("uses a user-scoped object key", async () => {
    const objectStore: ObjectStore = {
      createUploadUrl: vi.fn(async (key, contentType) => ({
        key,
        contentType,
        url: `https://objects.test/${key}`
      })),
      createDownloadUrl: vi.fn()
    };
    const app = buildApp({
      objectStore,
      authenticate: async () => ({ userId: "user-1" })
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/files/book-1/upload-url",
      payload: {
        sha256: "a".repeat(64),
        contentType: "application/epub+zip"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(objectStore.createUploadUrl).toHaveBeenCalledWith(
      `users/user-1/books/book-1/${"a".repeat(64)}`,
      "application/epub+zip"
    );
    await app.close();
  });
});
```

- [ ] **Step 7: Implement object-store and file routes**

Create `services/api/src/storage/objectStore.ts`:

```typescript
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ApiConfig } from "../config.js";

export interface ObjectStore {
  createUploadUrl(
    key: string,
    contentType: string
  ): Promise<{ key: string; contentType: string; url: string }>;
  createDownloadUrl(key: string): Promise<{ key: string; url: string }>;
}

export function createObjectStore(config: ApiConfig): ObjectStore {
  const client = new S3Client({
    endpoint: config.S3_ENDPOINT,
    region: config.S3_REGION,
    forcePathStyle: config.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: config.S3_ACCESS_KEY_ID,
      secretAccessKey: config.S3_SECRET_ACCESS_KEY
    }
  });

  return {
    async createUploadUrl(key, contentType) {
      const command = new PutObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
        ContentType: contentType
      });
      return {
        key,
        contentType,
        url: await getSignedUrl(client, command, { expiresIn: 900 })
      };
    },
    async createDownloadUrl(key) {
      const command = new GetObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key
      });
      return {
        key,
        url: await getSignedUrl(client, command, { expiresIn: 900 })
      };
    }
  };
}
```

Create `services/api/src/routes/files.ts`:

```typescript
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ObjectStore } from "../storage/objectStore.js";

const requestSchema = z.object({
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  contentType: z.string().min(1)
});

export interface AuthenticatedUser {
  userId: string;
}

export interface FileRouteDependencies {
  objectStore: ObjectStore;
  authenticate(): Promise<AuthenticatedUser>;
}

export async function registerFileRoutes(
  app: FastifyInstance,
  dependencies: FileRouteDependencies
): Promise<void> {
  app.post<{ Params: { bookId: string } }>(
    "/v1/files/:bookId/upload-url",
    async (request, reply) => {
      const user = await dependencies.authenticate();
      const body = requestSchema.parse(request.body);
      const key = `users/${user.userId}/books/${request.params.bookId}/${body.sha256}`;
      return reply.send(
        await dependencies.objectStore.createUploadUrl(key, body.contentType)
      );
    }
  );
}
```

Replace `services/api/src/app.ts` with:

```typescript
import Fastify, { type FastifyInstance } from "fastify";
import { registerFileRoutes, type FileRouteDependencies } from "./routes/files.js";
import { registerHealthRoute } from "./routes/health.js";

export function buildApp(
  dependencies?: FileRouteDependencies
): FastifyInstance {
  const app = Fastify({ logger: false });
  void app.register(registerHealthRoute);
  if (dependencies) {
    void app.register(registerFileRoutes, dependencies);
  }
  return app;
}
```

- [ ] **Step 8: Verify signed URLs and local services**

Run:

```powershell
npm exec --workspace=@simple-cloud-reader/api vitest run test/files.test.ts
docker compose -f infra/local/compose.yaml up -d --wait
docker compose -f infra/local/compose.yaml ps
```

Expected: tests pass; PostgreSQL and MinIO report healthy; `minio-init` exits
successfully.

- [ ] **Step 9: Commit infrastructure**

```powershell
git add infra/local services/api
git commit -m "feat: prove private signed object transfers"
```

## Task 5: Prove Idempotent Cursor-Based Synchronization

**Files:**
- Create: `services/api/src/sync/inMemorySyncStore.ts`
- Create: `services/api/src/routes/sync.ts`
- Modify: `services/api/src/app.ts`
- Test: `services/api/test/sync.test.ts`

- [ ] **Step 1: Write the failing sync integration test**

Create `services/api/test/sync.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { InMemorySyncStore } from "../src/sync/inMemorySyncStore.js";

describe("sync API", () => {
  it("deduplicates retries and returns changes after a cursor", async () => {
    const syncStore = new InMemorySyncStore();
    const app = buildApp({
      authenticate: async () => ({ userId: "user-1" }),
      syncStore
    });
    const batch = {
      deviceId: "device-a",
      operations: [{
        operationId: "op-1",
        entityType: "progress",
        entityId: "book-1",
        action: "upsert",
        clientTimestamp: "2026-06-12T00:00:00.000Z",
        payload: {
          format: "epub",
          progression: 0.42,
          engine: "readium",
          engineLocation: {}
        }
      }]
    };

    const first = await app.inject({
      method: "POST",
      url: "/v1/sync/push",
      payload: batch
    });
    const retry = await app.inject({
      method: "POST",
      url: "/v1/sync/push",
      payload: batch
    });
    const pull = await app.inject({
      method: "GET",
      url: "/v1/sync/pull?cursor=0"
    });

    expect(first.statusCode).toBe(200);
    expect(retry.json()).toEqual(first.json());
    expect(pull.json().changes).toHaveLength(1);
    expect(pull.json().cursor).toBe("1");
    await app.close();
  });
});
```

- [ ] **Step 2: Run the test and observe failure**

Run:

```powershell
npm exec --workspace=@simple-cloud-reader/api vitest run test/sync.test.ts
```

Expected: FAIL because the sync store and routes do not exist.

- [ ] **Step 3: Implement the in-memory proof store**

Create `services/api/src/sync/inMemorySyncStore.ts`:

```typescript
import type {
  MutationBatch,
  SyncChange
} from "@simple-cloud-reader/sync-contract";

interface StoredOperation {
  result: { acceptedOperationIds: string[]; cursor: string };
}

export class InMemorySyncStore {
  private version = 0;
  private readonly operations = new Map<string, StoredOperation>();
  private readonly changes: SyncChange[] = [];

  push(userId: string, batch: MutationBatch) {
    const acceptedOperationIds: string[] = [];
    for (const operation of batch.operations) {
      const key = `${userId}:${operation.operationId}`;
      const existing = this.operations.get(key);
      if (existing) {
        continue;
      }
      this.version += 1;
      const change: SyncChange = {
        ...operation,
        serverVersion: this.version,
        serverTimestamp: new Date().toISOString()
      };
      this.changes.push(change);
      acceptedOperationIds.push(operation.operationId);
      this.operations.set(key, {
        result: { acceptedOperationIds: [operation.operationId], cursor: `${this.version}` }
      });
    }

    const allWereRetries = acceptedOperationIds.length === 0;
    if (allWereRetries && batch.operations.length > 0) {
      const prior = this.operations.get(
        `${userId}:${batch.operations[0]!.operationId}`
      );
      if (prior) {
        return prior.result;
      }
    }

    return { acceptedOperationIds, cursor: `${this.version}` };
  }

  pull(cursor: number) {
    const changes = this.changes.filter(
      (change) => change.serverVersion > cursor
    );
    return {
      cursor: `${this.version}`,
      hasMore: false,
      changes
    };
  }
}
```

- [ ] **Step 4: Implement the sync routes**

Create `services/api/src/routes/sync.ts`:

```typescript
import { mutationBatchSchema } from "@simple-cloud-reader/sync-contract";
import type { FastifyInstance } from "fastify";
import type { AuthenticatedUser } from "./files.js";
import type { InMemorySyncStore } from "../sync/inMemorySyncStore.js";

export interface SyncRouteDependencies {
  syncStore: InMemorySyncStore;
  authenticate(): Promise<AuthenticatedUser>;
}

export async function registerSyncRoutes(
  app: FastifyInstance,
  dependencies: SyncRouteDependencies
): Promise<void> {
  app.post("/v1/sync/push", async (request) => {
    const user = await dependencies.authenticate();
    return dependencies.syncStore.push(
      user.userId,
      mutationBatchSchema.parse(request.body)
    );
  });

  app.get<{ Querystring: { cursor?: string } }>(
    "/v1/sync/pull",
    async (request) => {
      await dependencies.authenticate();
      const cursor = Number.parseInt(request.query.cursor ?? "0", 10);
      return dependencies.syncStore.pull(Number.isFinite(cursor) ? cursor : 0);
    }
  );
}
```

Replace `services/api/src/app.ts` with:

```typescript
import Fastify, { type FastifyInstance } from "fastify";
import { registerFileRoutes, type FileRouteDependencies } from "./routes/files.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerSyncRoutes, type SyncRouteDependencies } from "./routes/sync.js";

type AppDependencies =
  & Partial<Pick<FileRouteDependencies, "objectStore">>
  & Partial<Pick<SyncRouteDependencies, "syncStore">>
  & Pick<FileRouteDependencies, "authenticate">;

export function buildApp(
  dependencies?: AppDependencies
): FastifyInstance {
  const app = Fastify({ logger: false });
  void app.register(registerHealthRoute);
  if (dependencies?.objectStore) {
    void app.register(registerFileRoutes, {
      authenticate: dependencies.authenticate,
      objectStore: dependencies.objectStore
    });
  }
  if (dependencies?.syncStore) {
    void app.register(registerSyncRoutes, {
      authenticate: dependencies.authenticate,
      syncStore: dependencies.syncStore
    });
  }
  return app;
}
```

- [ ] **Step 5: Run all API tests**

Run:

```powershell
npm exec --workspace=@simple-cloud-reader/api vitest run
npm run typecheck --workspace=@simple-cloud-reader/api
```

Expected: health, file URL, and sync tests pass; TypeScript exits `0`.

- [ ] **Step 6: Document the proof limitation**

Create `docs/spikes/phase-0-results.md`:

```markdown
# Phase 0 Spike Results

| Proof | Status | Evidence |
|---|---|---|
| Upstream imports | PENDING | |
| Railway-compatible object storage | PENDING | |
| Cursor sync and idempotency | PENDING | |
| Readium locator round trip | PENDING | |
| KOReader locator round trip | PENDING | |
| Android local book open | PENDING | |
| Windows local book open | PENDING | |

The in-memory sync store proves protocol shape only. PostgreSQL durability,
authorization boundaries, tombstones, batching, and conflict history belong to
Phase 1 and must not reuse the in-memory implementation in production.
```

- [ ] **Step 7: Commit the sync proof**

```powershell
git add services/api docs/spikes/phase-0-results.md
git commit -m "feat: prove idempotent cursor synchronization"
```

## Task 6: Add and Verify the Readium Locator Adapter

**Files:**
- Modify: `apps/windows/package.json`
- Create: `apps/windows/src/common/simpleCloud/canonicalLocator.ts`
- Test: `apps/windows/src/common/simpleCloud/canonicalLocator.test.ts`
- Modify: `docs/spikes/phase-0-results.md`

- [ ] **Step 1: Link the shared contract into the Windows package**

Add this entry to `apps/windows/package.json` under `dependencies`:

```json
"@simple-cloud-reader/sync-contract": "file:../../packages/sync-contract"
```

Build the contract and refresh the Windows lockfile:

```powershell
npm run build --workspace=@simple-cloud-reader/sync-contract
Set-Location apps/windows
npm install
Set-Location ../..
```

Expected: `apps/windows/package-lock.json` records the local
`@simple-cloud-reader/sync-contract` dependency.

- [ ] **Step 2: Write failing Readium adapter tests**

Create `apps/windows/src/common/simpleCloud/canonicalLocator.test.ts`:

```typescript
import { fromReadiumLocator, toReadiumLocator } from "./canonicalLocator";

describe("Readium canonical locator adapter", () => {
  const readium = {
    href: "chapter-4.xhtml",
    type: "application/xhtml+xml",
    locations: {
      progression: 0.25,
      totalProgression: 0.42,
      cfi: "/6/8!/4/2/14"
    }
  };

  it("uses total progression for canonical progress", () => {
    expect(fromReadiumLocator("epub", readium)).toEqual({
      format: "epub",
      progression: 0.42,
      engine: "readium",
      engineLocation: readium
    });
  });

  it("restores the exact Readium locator", () => {
    expect(toReadiumLocator(fromReadiumLocator("epub", readium))).toEqual(readium);
  });
});
```

- [ ] **Step 3: Run the focused Thorium test and observe failure**

Run from `apps/windows`:

```powershell
npm ci
npm run testFile -- src/common/simpleCloud/canonicalLocator.test.ts
```

Expected: FAIL because `canonicalLocator.ts` does not exist.

- [ ] **Step 4: Implement the Readium adapter**

Create `apps/windows/src/common/simpleCloud/canonicalLocator.ts`:

```typescript
import type { CanonicalLocator } from "@simple-cloud-reader/sync-contract";
import type { Locator } from "@r2-navigator-js/electron/common/locator";

export function fromReadiumLocator(
  format: string,
  locator: Locator
): CanonicalLocator {
  const progression =
    locator.locations.totalProgression ??
    locator.locations.progression ??
    0;

  return {
    format,
    progression,
    engine: "readium",
    engineLocation: JSON.parse(JSON.stringify(locator)) as Record<string, unknown>
  };
}

export function toReadiumLocator(locator: CanonicalLocator): Locator {
  if (locator.engine !== "readium") {
    throw new Error(`Expected readium locator, received ${locator.engine}`);
  }
  return locator.engineLocation as unknown as Locator;
}
```

- [ ] **Step 5: Run the focused test and Thorium typecheck**

Run from `apps/windows`:

```powershell
npm run testFile -- src/common/simpleCloud/canonicalLocator.test.ts
npm run lint:ts -- --quiet
```

Expected: focused tests pass and ESLint reports no new error in the adapter.

- [ ] **Step 6: Capture real locator restoration evidence**

Open a non-DRM EPUB with:

```powershell
npm run start:dev
```

Navigate to the middle of a chapter, close the reader window, reopen the same
book from the library, and verify that Thorium restores the chapter and visible
paragraph. Close and relaunch the entire application, reopen the book, and
verify the same location a second time.

Record in `docs/spikes/phase-0-results.md`:

```markdown
| Readium locator round trip | PASS | Focused Jest test plus reader-window and full-application restarts restored the same chapter and paragraph. |
| Windows local book open | PASS | Development build imported and opened the fixture EPUB. |
```

- [ ] **Step 7: Commit the Windows adapter**

```powershell
git add apps/windows/package.json apps/windows/package-lock.json apps/windows/src/common/simpleCloud docs/spikes/phase-0-results.md
git commit -m "feat(windows): prove canonical locator round trip"
```

## Task 7: Add and Verify the KOReader Locator Adapter

**Files:**
- Create: `apps/android/frontend/apps/simplecloud/canonicallocator.lua`
- Test: `apps/android/spec/unit/simplecloud_canonicallocator_spec.lua`
- Modify: `docs/spikes/phase-0-results.md`

- [ ] **Step 1: Write failing Lua adapter tests**

Create `apps/android/spec/unit/simplecloud_canonicallocator_spec.lua`:

```lua
local CanonicalLocator = require("apps/simplecloud/canonicallocator")

describe("Simple Cloud canonical locator", function()
    it("maps page progress into a bounded canonical locator", function()
        local locator = CanonicalLocator.fromPage("pdf", 50, 100)
        assert.are.same({
            format = "pdf",
            progression = 0.5,
            engine = "koreader",
            engineLocation = {
                page = 50,
                pageCount = 100,
            },
        }, locator)
    end)

    it("restores an exact KOReader page", function()
        local page = CanonicalLocator.toPage({
            format = "pdf",
            progression = 0.5,
            engine = "koreader",
            engineLocation = {
                page = 50,
                pageCount = 100,
            },
        })
        assert.are.equal(50, page)
    end)

    it("falls back to normalized progression", function()
        local page = CanonicalLocator.toPage({
            format = "pdf",
            progression = 0.5,
            engine = "readium",
            engineLocation = {},
        }, 200)
        assert.are.equal(100, page)
    end)
end)
```

- [ ] **Step 2: Run the focused KOReader test and observe failure**

Run from `apps/android` inside WSL or Linux:

```bash
./kodev test front simplecloud_canonicallocator
```

Expected: FAIL because `apps/simplecloud/canonicallocator` cannot be required.

- [ ] **Step 3: Implement the Lua adapter**

Create `apps/android/frontend/apps/simplecloud/canonicallocator.lua`:

```lua
local CanonicalLocator = {}

local function clamp(value)
    return math.max(0, math.min(1, value))
end

function CanonicalLocator.fromPage(format, page, page_count)
    assert(page_count and page_count > 0, "page_count must be positive")
    return {
        format = format,
        progression = clamp(page / page_count),
        engine = "koreader",
        engineLocation = {
            page = page,
            pageCount = page_count,
        },
    }
end

function CanonicalLocator.toPage(locator, fallback_page_count)
    if locator.engine == "koreader"
        and locator.engineLocation
        and locator.engineLocation.page then
        return locator.engineLocation.page
    end
    assert(fallback_page_count and fallback_page_count > 0,
        "fallback_page_count must be positive")
    return math.max(1, math.floor(locator.progression * fallback_page_count + 0.5))
end

return CanonicalLocator
```

- [ ] **Step 4: Run the focused test and frontend suite**

Run from `apps/android`:

```bash
./kodev test front simplecloud_canonicallocator
./kodev test front
```

Expected: focused adapter tests and the existing frontend suite pass.

- [ ] **Step 5: Prove Android book opening**

Build the Android arm64 target from Linux or WSL:

```bash
./kodev release android-arm64
```

Install the generated APK on an Android phone or tablet, import a non-DRM EPUB,
and invoke the existing safe entry point:

```lua
ReaderUI:showReader(managed_file_path)
```

Record:

```markdown
| KOReader locator round trip | PASS | Focused Busted tests restore exact page and normalized fallback. |
| Android local book open | PASS | arm64 APK opened the managed fixture EPUB through ReaderUI:showReader. |
```

If the APK cannot build or open the fixture, mark the row `FAIL`, include the
exact command/error, and stop before UI implementation.

- [ ] **Step 6: Commit the Android adapter**

```powershell
git add apps/android/frontend/apps/simplecloud apps/android/spec/unit/simplecloud_canonicallocator_spec.lua docs/spikes/phase-0-results.md
git commit -m "feat(android): prove canonical locator round trip"
```

## Task 8: Validate the Phase 0 Exit Gate

**Files:**
- Modify: `docs/spikes/phase-0-results.md`
- Create: `.github/workflows/phase-0.yml`

- [ ] **Step 1: Add a focused CI workflow**

Create `.github/workflows/phase-0.yml`:

```yaml
name: Phase 0

on:
  pull_request:
  push:
    branches: [main]

jobs:
  contract-and-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test

  android-locator:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/android
    steps:
      - uses: actions/checkout@v4
      - run: ./kodev test front simplecloud_canonicallocator

  windows-locator:
    runs-on: windows-latest
    defaults:
      run:
        working-directory: apps/windows
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: apps/windows/package-lock.json
      - run: npm ci
      - run: npm run testFile -- src/common/simpleCloud/canonicalLocator.test.ts
```

- [ ] **Step 2: Run local verification**

Run:

```powershell
npm run typecheck
npm test
git diff --check
git status --short
```

Run from WSL/Linux:

```bash
cd apps/android
./kodev test front simplecloud_canonicallocator
```

Run from `apps/windows`:

```powershell
npm run testFile -- src/common/simpleCloud/canonicalLocator.test.ts
```

Expected: all automated checks pass and only the intended workflow/results
changes remain.

- [ ] **Step 3: Complete the evidence table**

Every row in `docs/spikes/phase-0-results.md` must be changed from `PENDING` to
`PASS` or `FAIL`. Each row must name the test, build artifact, or manual
reproduction used as evidence.

The gate passes only when these rows are `PASS`:

- Upstream imports.
- Railway-compatible object storage.
- Cursor sync and idempotency.
- Readium locator round trip.
- KOReader locator round trip.
- Android local book open.
- Windows local book open.

- [ ] **Step 4: Commit Phase 0 verification**

```powershell
git add .github/workflows/phase-0.yml docs/spikes/phase-0-results.md
git commit -m "ci: enforce phase zero feasibility gate"
```

- [ ] **Step 5: Stop or proceed explicitly**

If every row is `PASS`, write the detailed Phase 1 backend plan before adding
production features.

If any row is `FAIL`, do not proceed to UI implementation. Update
`docs/superpowers/specs/2026-06-12-simple-cloud-reader-design.md` with the
validated architectural change, review it with the user, and create a revised
Phase 0 plan.
