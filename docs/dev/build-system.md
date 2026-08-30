# F1.4 — Nixpacks Build Integration

## What This Feature Does

Integrates [Nixpacks](https://nixpacks.com) for zero-configuration application builds. It automatically detects project frameworks and languages from source code (Node.js, Next.js, Python, React, PHP, etc.), builds optimized Docker container images, tracks deployment state in PostgreSQL, and progressively records build logs.

---

## Architecture

```
Dashboard (BuildPanel.tsx / useBuild.ts)
    │
    │  POST /api/projects/:id/build
    │  GET  /api/projects/:id/deployments
    │  GET  /api/projects/:id/deployments/:deploymentId
    ▼
API (apps/api/src/modules/build/)
    ├── routes.ts   — Fastify route handlers (auth-gated, BullMQ queue registration)
    ├── service.ts  — Business logic, BullMQ job processor, Deployment lifecycle
    └── schema.ts   — TriggerBuildBodySchema, DeploymentListQuerySchema, BuildJobData
         │
         │  BullMQ 'build-queue' (Redis)
         │  Job processor
         │
         │  stdin: JSON payload { command: "plan" | "build", ... }
         │  stdout: newline-delimited JSON { log: "..." } / { done: true }
         ▼
    system/python/build_manager.py
         │
         ├── cmd_plan()  — nixpacks plan --format json (framework detection)
         └── cmd_build() — nixpacks build <dir> --name <image> [--build-cmd <cmd>]
```

### Data Flow

1. **User clicks "Deploy"** in `BuildPanel.tsx`
2. **Dashboard** calls `POST /api/projects/:id/build` with optional `buildCmd` override
3. **API `buildRoutes`** validates request → calls `BuildService.triggerBuild()`
4. **Service** creates a `Deployment` record with status `QUEUED` and enqueues a job into BullMQ `build-queue`
5. **API returns 202 Accepted** immediately with the `Deployment` record; dashboard starts polling `GET /api/projects/:id/deployments/:deploymentId` every 3s
6. **BullMQ Worker** picks up the job:
   - Updates status to `BUILDING`
   - Spawns `build_manager.py plan` to detect framework and default build command
   - Spawns `build_manager.py build` to build the Docker image
   - Progressively appends streamed stdout log lines to `Deployment.buildLogs`
   - On success: marks status as `RUNNING` and records `duration` (seconds)
   - On failure: marks status as `FAILED` and appends error details to `buildLogs`

---

## Key Files

| File | Role |
|------|------|
| [`apps/api/src/modules/build/routes.ts`](../apps/api/src/modules/build/routes.ts) | 3 authenticated Fastify routes, BullMQ queue/worker setup |
| [`apps/api/src/modules/build/service.ts`](../apps/api/src/modules/build/service.ts) | `BuildService` class, BullMQ processor, log streaming |
| [`apps/api/src/modules/build/schema.ts`](../apps/api/src/modules/build/schema.ts) | Request validation schemas and `BuildJobData` interface |
| [`apps/api/src/config/queue.ts`](../apps/api/src/config/queue.ts) | BullMQ infrastructure, helper functions (`createQueue`, `createWorker`) |
| [`system/python/build_manager.py`](../system/python/build_manager.py) | Python system layer: `nixpacks plan` and `nixpacks build` |
| [`packages/shared/src/schemas/projects.ts`](../packages/shared/src/schemas/projects.ts) | `TriggerBuildSchema`, `DeploymentStatusSchema` |
| [`packages/shared/src/types/index.ts`](../packages/shared/src/types/index.ts) | `Deployment`, `DeploymentStatus`, `PaginatedDeployments` types |
| [`apps/dashboard/src/hooks/useBuild.ts`](../apps/dashboard/src/hooks/useBuild.ts) | React hooks: `useTriggerBuild`, `useDeploymentPolling`, `useDeployments` |
| [`apps/dashboard/src/components/projects/BuildPanel.tsx`](../apps/dashboard/src/components/projects/BuildPanel.tsx) | Deployment list, status badges, trigger button, and terminal-styled `<pre>` log viewer |
| [`apps/dashboard/src/app/(panel)/projects/[id]/page.tsx`](../apps/dashboard/src/app/(panel)/projects/[id]/page.tsx) | Project detail page hosting `<BuildPanel />` |

---

## Database Model

Uses the existing `Deployment` model in `apps/api/prisma/schema.prisma`:

| Column | Type | Description |
|--------|------|-------------|
| `id` | `String` (cuid) | Unique deployment ID |
| `status` | `DeploymentStatus` | `QUEUED` → `BUILDING` → `DEPLOYING` → `RUNNING` / `FAILED` / `CANCELLED` |
| `commitHash` | `String?` | Git commit hash |
| `commitMsg` | `String?` | Git commit message |
| `buildLogs` | `String?` | Concatenated terminal log output |
| `duration` | `Int?` | Total build duration in seconds |
| `projectId` | `String` | Foreign key referencing `Project` |
| `createdAt` | `DateTime` | Timestamp when build was queued |
| `updatedAt` | `DateTime` | Timestamp of last status/log update |

---

## Environment Variables

| Variable | Default (dev) | Description |
|----------|---------------|-------------|
| `NIXPACKS_IMAGE_PREFIX` | `vexlyx` | Prefix for Docker image names (e.g. `vexlyx-<projectId>`) |
| `PROJECTS_DIR` | `./workspaces/projects` | Root directory where cloned repos reside |

---

## API Reference

### `POST /api/projects/:id/build`
Triggers a new build for the project.

**Request Body (optional):**
```json
{
  "buildCmd": "npm run build:custom"
}
```

**Response (`202 Accepted`):**
```json
{
  "id": "cm9xyz...",
  "status": "QUEUED",
  "commitHash": null,
  "commitMsg": null,
  "buildLogs": null,
  "duration": null,
  "projectId": "cm9abc...",
  "createdAt": "2026-08-30T01:30:00.000Z",
  "updatedAt": "2026-08-30T01:30:00.000Z"
}
```

### `GET /api/projects/:id/deployments`
Lists deployments for a project (ordered latest first).

**Query Params:**
- `page` (default: 1)
- `limit` (default: 10, max: 50)

**Response:**
```json
{
  "deployments": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "totalPages": 1
  }
}
```

### `GET /api/projects/:id/deployments/:deploymentId`
Fetches a single deployment (used for log and status polling).

**Response:** Single `Deployment` object.

---

## How to Test

### 1. Nixpacks CLI installation check
Ensure `nixpacks` is installed on your machine or host:
```bash
nixpacks --version
```
If not installed:
```bash
# Linux/macOS
curl -sSL https://nixpacks.com/install.sh | sh
# Windows (via Scoop or Cargo)
scoop install nixpacks
# or
cargo install nixpacks
```

### 2. Triggering a build via UI
1. Run `pnpm dev`
2. Open `http://localhost:3000/projects/<PROJECT_ID>`
3. Ensure repository is connected in Git settings
4. In the **Deployments** panel, click **Deploy**
5. Watch the deployment transition from `QUEUED` → `BUILDING` → `RUNNING` (or `FAILED`)
6. Click the chevron button to expand and view the build logs

### 3. API build test with cURL
```bash
# Trigger build
curl -X POST http://localhost:5000/api/projects/<PROJECT_ID>/build \
  -H "Content-Type: application/json" \
  -d '{"buildCmd": "npm run build"}' \
  --cookie "session=<YOUR_SESSION>"

# Poll deployment logs
curl http://localhost:5000/api/projects/<PROJECT_ID>/deployments/<DEPLOYMENT_ID> \
  --cookie "session=<YOUR_SESSION>"
```

---

## How to Extend

### Add Real-Time Log Streaming via Socket.io (F1.6)
In F1.6:
1. Initialize Socket.io plugin in `apps/api/src/plugins/socket.ts`
2. In `createBuildProcessor`, emit Socket.io events (`deployment:log`, `deployment:status`) alongside DB updates
3. In `BuildPanel.tsx` or `LogViewer.tsx`, subscribe to the project room via Socket.io client

### Docker Deployment Engine Integration (F1.5)
Once the image is built with Nixpacks, F1.5 will read the generated image name (`vexlyx-<projectId>`) and run it with Docker Compose / Traefik routing.
