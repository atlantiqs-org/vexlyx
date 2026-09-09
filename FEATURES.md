# FEATURES.md

> **Project:** Vexlyx
> **Type:** Open-Source Hybrid Hosting Control Panel
> **Last Updated:** 2026-09-09

---

## How to Use This File

This document is the **single source of truth** for all Vexlyx features. 

- **For You:** Before asking Claude to work on a feature, copy the relevant section from this file and paste it into your prompt.
- **For Claude/AI:** Read this file first to understand the project state, then read the specific feature section you're asked to implement.
- **For Other Devs:** This file shows exactly what's built, what's pending, and where to start.

**Status Legend:**
- `🔴 NOT STARTED` — Feature not yet implemented
- `🟡 IN PROGRESS` — Currently being worked on
- `🟢 COMPLETED` — Feature implemented and tested
- `⚪ PLANNED` — Planned for future but not prioritized

---

## Project Status Dashboard

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 0: Foundation | 🟢 COMPLETED | 100% (7/7) |
| Phase 1: Project Deployment | 🟢 COMPLETED | 100% (7/7) |
| Phase 2: Multi-Runtime Support | 🟢 COMPLETED | 100% (8/8) |
| Phase 3: Domain & DNS | 🟢 COMPLETED | 100% (4/4) |
| Phase 4: Email Server | 🟢 COMPLETED | 100% (7/7) |
| Phase 5: System & Administration | 🟡 IN PROGRESS | 43% (3/7) |
| Phase 6: Ecosystem & Launch | 🔴 NOT STARTED | 0% (0/4) |

**Overall Completion:** 82% (36/44 features)

---

## Phase 0: Foundation

### F0.1 — Monorepo Setup
**Status:** 🟢 COMPLETED

**Description:**
Initialize the Vexlyx monorepo using Turborepo with three workspaces: `apps/dashboard` (Next.js), `apps/api` (Fastify), and `packages/shared` (shared types and Zod schemas). Configure TypeScript, ESLint, Prettier, and Git hooks.

**Acceptance Criteria:**
- [x] `pnpm-workspace.yaml` configured with three packages
- [x] Turborepo pipeline configured for `build`, `dev`, `lint`, `test`
- [x] Root `package.json` with shared dev dependencies
- [x] `.gitignore` excludes `node_modules`, `.turbo`, `dist`, `.env`
- [x] README.md with setup instructions

**Test Plan:**
1. Run `pnpm install` — all dependencies install without errors
2. Run `pnpm dev` — Turborepo starts all apps in parallel
3. Run `pnpm build` — all packages build successfully
4. Run `pnpm lint` — no linting errors across all packages

**Developer Docs:**
- **Location:** `docs/dev/monorepo.md`
- **Contents:** Workspace structure, dependency management, adding new packages, build pipeline explanation

**Files to Create:**
- `package.json` (root)
- `pnpm-workspace.yaml`
- `turbo.json`
- `.gitignore`
- `README.md`
- `tsconfig.json` (root)

---

### F0.2 — Next.js Dashboard Scaffold
**Status:** 🟢 COMPLETED

**Description:**
Set up the Next.js 15 dashboard app with App Router, TypeScript, Tailwind CSS 4, and shadcn/ui. Configure the basic layout with sidebar navigation, header, and main content area.

**Acceptance Criteria:**
- [x] Next.js 15 installed with App Router
- [x] Tailwind CSS 4 configured with custom theme tokens
- [x] shadcn/ui initialized with base components (Button, Card, Separator, Sheet, Skeleton)
- [x] Root layout with sidebar + header structure
- [x] Dashboard home page with placeholder widgets
- [x] Dark mode support via `next-themes`
- [x] Responsive design (mobile sidebar toggle)

**Test Plan:**
1. `pnpm dev` starts dashboard on `http://localhost:3000`
2. Sidebar navigation renders on desktop
3. Mobile hamburger menu toggles sidebar
4. Dark mode toggle works across all pages
5. No console errors or hydration mismatches

**Developer Docs:**
- **Location:** `docs/dev/dashboard-setup.md`
- **Contents:** Component architecture, shadcn/ui usage guide, theme system, adding new pages

**Files to Create:**
- `apps/dashboard/package.json`
- `apps/dashboard/next.config.js`
- `apps/dashboard/tailwind.config.ts`
- `apps/dashboard/app/layout.tsx`
- `apps/dashboard/app/page.tsx`
- `apps/dashboard/components/ui/*` (shadcn components)
- `apps/dashboard/components/layout/Sidebar.tsx`
- `apps/dashboard/components/layout/Header.tsx`
- `apps/dashboard/lib/utils.ts`

---

### F0.3 — Fastify API Scaffold
**Status:** 🟢 COMPLETED

**Description:**
Set up the Fastify backend API with TypeScript, Zod validation, and a modular plugin architecture. Configure health check endpoint, error handling, and logging.

**Acceptance Criteria:**
- [x] Fastify 5.x installed with TypeScript
- [x] Zod for runtime validation
- [x] Modular route structure (`src/modules/*/routes.ts`)
- [x] Global error handler with consistent response format
- [x] Health check endpoint `GET /health` returns `{ status: "ok" }`
- [x] Pino logger configured
- [x] Environment variable validation via Zod

**Test Plan:**
1. `pnpm dev` starts API on `http://localhost:5000`
2. `GET /health` returns `200 OK` with JSON response
3. Invalid route returns `404` with consistent error shape
4. Server error returns `500` with error code and message

**Developer Docs:**
- **Location:** `docs/dev/api-setup.md`
- **Contents:** Route registration pattern, error handling conventions, adding new modules, environment variables

**Files to Create:**
- `apps/api/package.json`
- `apps/api/src/index.ts`
- `apps/api/src/config/env.ts`
- `apps/api/src/plugins/error-handler.ts`
- `apps/api/src/modules/health/routes.ts`
- `apps/api/tsconfig.json`

---

### F0.4 — Prisma Schema & Database
**Status:** 🟢 COMPLETED

**Description:**
Design and implement the complete Prisma schema for Vexlyx. Set up PostgreSQL via Docker Compose for local development. Run initial migration and generate Prisma Client.

**Acceptance Criteria:**
- [x] Complete Prisma schema with all models (User, Project, Domain, Database, Mailbox, Deployment, etc.)
- [x] All enums defined (Role, ProjectType, Status, etc.)
- [x] Relations properly configured with foreign keys
- [x] Docker Compose includes PostgreSQL 16 service
- [x] Initial migration created and applied
- [x] Prisma Client generated and exported from `apps/api/src/config/database.ts`
- [x] Seed script creates admin user for development

**Test Plan:**
1. `docker-compose up postgres` starts PostgreSQL
2. `pnpm db:migrate` applies all migrations
3. `pnpm db:seed` creates admin user
4. `pnpm db:studio` opens Prisma Studio showing all tables
5. Querying `User` table returns seeded admin user

**Developer Docs:**
- **Location:** `docs/dev/database.md`
- **Contents:** Schema overview, migration workflow, seeding, querying patterns, adding new models

**Files Created:**
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/`
- `apps/api/prisma/seed.ts`
- `apps/api/src/config/database.ts`
- `docker-compose.yml` (root)

---

### F0.5 — Redis & Docker Compose Dev Environment
**Status:** 🟢 COMPLETED

**Description:**
Set up the complete Docker Compose development environment with PostgreSQL, Redis, and Traefik. Configure Redis for sessions, caching, and BullMQ queues.

**Acceptance Criteria:**
- [x] Docker Compose includes PostgreSQL 16, Redis 7, and Traefik v3 services
- [x] Redis client configured in API with connection pooling
- [x] Redis used for session storage
- [x] BullMQ configured for background job processing
- [x] Traefik dashboard accessible on `localhost:8080`
- [x] Persistent volumes for PostgreSQL and Redis data
- [x] Health checks for all services

**Test Plan:**
1. `docker-compose up -d` starts all services
2. `redis-cli ping` returns `PONG`
3. BullMQ queue can add and process a test job
4. Traefik dashboard shows services on `http://localhost:8080`
5. Data persists after `docker-compose down && docker-compose up`

**Developer Docs:**
- **Location:** `docs/dev/infrastructure.md`
- **Contents:** Docker services overview, Redis usage patterns, BullMQ queue setup, Traefik routing basics

**Files Created:**
- `docker-compose.yml`
- `apps/api/src/config/redis.ts`
- `apps/api/src/config/queue.ts`
- `apps/api/src/config/env.ts` (modified — added `REDIS_URL`)
- `docker/traefik/traefik.yml`
- `docker/traefik/dynamic/`

---

### F0.6 — Authentication System
**Status:** 🟢 COMPLETED

**Description:**
Implement complete authentication with custom session-based auth (Lucia Auth was deprecated March 2025). Support email/password registration and login. Use Argon2id for password hashing. Session-based auth with HTTP-only cookies stored in Redis.

**Acceptance Criteria:**
- [x] `POST /api/auth/register` — creates user, hashes password with Argon2id
- [x] `POST /api/auth/login` — validates credentials, creates session
- [x] `POST /api/auth/logout` — destroys session
- [x] `GET /api/auth/me` — returns current user
- [x] Session stored in Redis with TTL
- [x] CSRF protection via SameSite=Lax cookies
- [x] Rate limiting: 5 login attempts per 15 minutes per IP
- [x] Frontend login/register forms with validation
- [x] Protected routes redirect to login
- [x] Auth hook (`useAuth`) in React

**Test Plan:**
1. Register new user → user created in database with hashed password
2. Login with correct credentials → session cookie set, redirected to dashboard
3. Login with wrong password → `401` error, rate limit counter increments
4. Access `/dashboard` without auth → redirect to `/login`
5. Logout → session destroyed, redirect to `/login`
6. `GET /api/auth/me` with valid session → returns user object
7. `GET /api/auth/me` without session → returns `401`

**Developer Docs:**
- **Location:** `docs/dev/authentication.md`
- **Contents:** Custom auth setup, session flow, password hashing, protected routes, frontend auth hooks

**Files Created:**
- `apps/api/src/modules/auth/routes.ts`
- `apps/api/src/modules/auth/service.ts`
- `apps/api/src/modules/auth/schema.ts`
- `apps/api/src/plugins/auth.ts`
- `apps/dashboard/src/app/(auth)/layout.tsx`
- `apps/dashboard/src/app/(auth)/login/page.tsx`
- `apps/dashboard/src/app/(auth)/register/page.tsx`
- `apps/dashboard/src/components/auth/LoginForm.tsx`
- `apps/dashboard/src/components/auth/RegisterForm.tsx`
- `apps/dashboard/src/lib/api.ts`
- `apps/dashboard/src/hooks/useAuth.ts`


---

### F0.7 — Shared Package (Types & Schemas)
**Status:** 🟢 COMPLETED

**Description:**
Create the shared package containing Zod schemas and TypeScript types used by both frontend and backend. This ensures type safety across the monorepo.

**Acceptance Criteria:**
- [x] Zod schemas for all API inputs (auth, projects, domains, etc.)
- [x] TypeScript types inferred from Zod schemas
- [x] Package builds and exports correctly
- [x] Both dashboard and api import from `@vexlyx/shared`
- [x] No circular dependencies

**Test Plan:**
1. `pnpm build` in `packages/shared` succeeds
2. Import `LoginSchema` from `@vexlyx/shared` in both apps
3. TypeScript compiles without errors in both apps
4. Zod schema validates correct and incorrect data properly

**Developer Docs:**
- **Location:** `docs/dev/shared-package.md`
- **Contents:** Adding new schemas, type inference, validation patterns

**Files Created:**
- `packages/shared/src/schemas/auth.ts`
- `packages/shared/src/types/index.ts`
- `packages/shared/src/index.ts` (updated)
- `packages/shared/package.json` (updated — added zod peer dep)

**Files Modified:**
- `apps/api/src/modules/auth/schema.ts` (now re-exports from `@vexlyx/shared`)
- `apps/dashboard/src/hooks/useAuth.ts` (imports `User` from `@vexlyx/shared`)

---

## Phase 1: Project Deployment

### F1.1 — Project CRUD API
**Status:** 🟢 COMPLETED

**Description:**
Build the complete project management API. Users can create, read, update, and delete hosting projects. Each project has a name, type, git URL, and status.

**Acceptance Criteria:**
- [x] `GET /api/projects` — list user's projects with pagination
- [x] `POST /api/projects` — create new project
- [x] `GET /api/projects/:id` — get single project details
- [x] `PUT /api/projects/:id` — update project settings
- [x] `DELETE /api/projects/:id` — delete project and cleanup resources
- [x] Projects are scoped to the authenticated user
- [x] Validation via Zod schemas from shared package
- [x] Soft delete (mark as deleted, cleanup async)

**Test Plan:**
1. Create project → returns 201 with project data
2. List projects → returns only current user's projects
3. Get project by ID → returns correct project
4. Update project name → returns updated project
5. Delete project → returns 204, project marked deleted
6. Access other user's project → returns 403

**Developer Docs:**
- **Location:** `docs/dev/projects-api.md`

**Files Created:**
- `apps/api/src/modules/projects/routes.ts`
- `apps/api/src/modules/projects/service.ts`
- `apps/api/src/modules/projects/schema.ts`
- `packages/shared/src/schemas/projects.ts`

**Files Modified:**
- `packages/shared/src/index.ts` (exports project schemas/types)
- `packages/shared/src/types/index.ts` (added Project, ProjectType, ProjectStatus, PaginatedProjects)
- `apps/api/prisma/schema.prisma` (added `deletedAt` to Project)
- `apps/api/src/index.ts` (registered `/api/projects` routes)

---

### F1.2 — Project Dashboard UI
**Status:** 🟢 COMPLETED

**Description:**
Build the project management interface in the dashboard. List view with cards/table, create project modal, and project detail page.

**Acceptance Criteria:**
- [x] `/projects` page lists all user projects in a card grid
- [x] "New Project" button opens creation modal
- [x] Modal has form: name, type (select), git URL (optional)
- [x] Project cards show status badge, type icon, last deployed
- [x] Clicking card navigates to `/projects/[id]`
- [x] Empty state for new users
- [x] Real-time status updates via polling (30s interval)

**Test Plan:**
1. Create project via modal → appears in list immediately
2. Navigate to project detail → shows correct project info
3. Delete project from detail page → returns to list, project removed
4. Empty state shown when no projects exist

**Developer Docs:**
- **Location:** `docs/dev/projects-ui.md`

**Files Created:**
- `apps/dashboard/src/app/(panel)/projects/page.tsx`
- `apps/dashboard/src/app/(panel)/projects/[id]/page.tsx`
- `apps/dashboard/src/components/projects/ProjectCard.tsx`
- `apps/dashboard/src/components/projects/ProjectList.tsx`
- `apps/dashboard/src/components/projects/CreateProjectModal.tsx`
- `apps/dashboard/src/hooks/useProjects.ts`
- `apps/dashboard/src/components/ui/dialog.tsx` (shadcn)
- `apps/dashboard/src/components/ui/select.tsx` (shadcn)
- `apps/dashboard/src/components/ui/badge.tsx` (shadcn)

---

### F1.3 — Git Repository Integration
**Status:** 🟢 COMPLETED

**Description:**
Allow users to connect GitHub/GitLab repositories to projects. Clone repos, detect branch, and store connection metadata.

**Acceptance Criteria:**
- [x] Git URL validation (supports GitHub, GitLab, Bitbucket — HTTPS and SSH formats)
- [x] `git clone` executed in project workspace (via Python git_manager.py)
- [x] Branch selection (default: main/master)
- [x] Webhook URL generation for auto-deploy (secret stored; delivery wired in F2.7)
- [x] SSH key generation for private repos (Ed25519, key on disk, public key in DB)
- [x] Store repo metadata in database (gitUrl, branch, webhookSecret, sshPublicKey, sshPrivateKeyPath)

**Test Plan:**
1. Add GitHub URL to project → repo clones successfully
2. Private repo → uses SSH key, clone succeeds
3. Invalid URL → returns validation error
4. Webhook URL accessible and displayed in GitSettings UI

**Developer Docs:**
- **Location:** `docs/dev/git-integration.md`

**Files Created:**
- `apps/api/src/modules/git/schema.ts`
- `apps/api/src/modules/git/service.ts`
- `apps/api/src/modules/git/routes.ts`
- `system/python/git_manager.py`
- `apps/dashboard/src/hooks/useGitSettings.ts`
- `apps/dashboard/src/components/projects/GitSettings.tsx`
- `apps/api/prisma/migrations/20260829183245_add_git_fields_to_project/migration.sql`

**Files Modified:**
- `apps/api/prisma/schema.prisma` (added `webhookSecret`, `sshPublicKey`, `sshPrivateKeyPath` to Project)
- `apps/api/src/config/env.ts` (added `PROJECTS_DIR`, `SSH_KEYS_DIR`, `API_BASE_URL`)
- `apps/api/src/index.ts` (registered `gitRoutes` at `/api/projects`)
- `apps/api/.env.example` (documented new env vars)
- `packages/shared/src/schemas/projects.ts` (added `ConnectRepoSchema`, `GitMetadata`)
- `packages/shared/src/index.ts` (exported new types)
- `apps/dashboard/src/app/(panel)/projects/[id]/page.tsx` (added `<GitSettings />`)

---

### F1.4 — Nixpacks Build Integration
**Status:** 🟢 COMPLETED

**Description:**
Integrate Nixpacks for zero-configuration builds. Auto-detect framework from source code and generate Docker images.

**Acceptance Criteria:**
- [x] Nixpacks CLI installed / verified on server
- [x] `nixpacks plan` execution to detect framework
- [x] `nixpacks build` generates Docker image
- [x] Build logs stored and polled progressively by frontend (Socket.io streaming in F1.6)
- [x] Build queue managed via BullMQ and Redis
- [x] Support for custom build commands override

**Test Plan:**
1. Node.js project → Nixpacks detects, builds successfully
2. Python project → Nixpacks detects, builds successfully
3. Next.js project → SSR build works
4. Build logs appear in real-time in dashboard (via polling)
5. Failed build → shows error logs, status = failed

**Developer Docs:**
- **Location:** `docs/dev/build-system.md`

**Files Created:**
- `apps/api/src/modules/build/schema.ts`
- `apps/api/src/modules/build/service.ts`
- `apps/api/src/modules/build/routes.ts`
- `system/python/build_manager.py`
- `apps/dashboard/src/hooks/useBuild.ts`
- `apps/dashboard/src/components/projects/BuildPanel.tsx`
- `docs/dev/build-system.md`

**Files Modified:**
- `packages/shared/src/schemas/projects.ts` (added `TriggerBuildSchema`, `DeploymentStatusSchema`)
- `packages/shared/src/types/index.ts` (added `Deployment`, `DeploymentStatus`, `PaginatedDeployments`)
- `packages/shared/src/index.ts` (exported new schemas and types)
- `apps/api/src/config/env.ts` (added `NIXPACKS_IMAGE_PREFIX`)
- `apps/api/src/config/queue.ts` (refactored `createQueue`, `createWorker`, and queue registry)
- `apps/api/src/index.ts` (registered `buildRoutes` at `/api/projects`)
- `apps/api/.env.example` (documented `NIXPACKS_IMAGE_PREFIX`)
- `apps/dashboard/src/app/(panel)/projects/[id]/page.tsx` (added `<BuildPanel />`)

---

### F1.5 — Docker Deployment Engine
**Status:** 🟢 COMPLETED

**Description:**
Generate and manage Docker Compose files per project. Deploy containers, manage networks, and integrate with Traefik for routing.

**Acceptance Criteria:**
- [x] Docker Compose template generation per project type
- [x] Container lifecycle management (start, stop, restart, remove)
- [x] Traefik labels auto-generated for routing
- [x] Environment variables injected into containers
- [x] Health checks configured
- [x] Container logs accessible via API
- [x] Resource limits (CPU, memory) per container

**Test Plan:**
1. Deploy Node.js app → container starts, accessible via domain
2. Deploy static site → Nginx serves files correctly
3. Stop container → app unreachable, status = stopped
4. Restart container → app back online
5. Environment variables → accessible inside container
6. Traefik routes → correct domain points to correct container

**Developer Docs:**
- **Location:** `docs/dev/deployment-engine.md`

**Files Created:**
- `apps/api/src/modules/deploy/service.ts`
- `apps/api/src/modules/deploy/routes.ts`
- `apps/api/src/modules/deploy/schema.ts`
- `system/python/docker_manager.py`
- `system/templates/docker-compose/node.yml`
- `system/templates/docker-compose/static.yml`
- `system/templates/docker-compose/python.yml`
- `apps/dashboard/src/hooks/useDeploy.ts`
- `apps/dashboard/src/components/projects/ContainerControls.tsx`
- `docs/dev/deployment-engine.md`
- `apps/api/prisma/migrations/20260830083857_add_container_fields_to_project/migration.sql`

**Files Modified:**
- `apps/api/prisma/schema.prisma` (added container fields to Project)
- `apps/api/src/config/env.ts` (added `BASE_DOMAIN`, `DEPLOY_MEMORY_LIMIT`, and port range)
- `apps/api/.env.example` (documented new deploy env vars)
- `apps/api/src/index.ts` (registered `deployRoutes` at `/api/projects`)
- `apps/api/src/modules/build/service.ts` (chained container deploy to build worker)
- `apps/api/src/modules/projects/service.ts` (included container fields in `PROJECT_SELECT`)
- `packages/shared/src/schemas/projects.ts` (added `DeployBodySchema`, `ContainerActionSchema`)
- `packages/shared/src/types/index.ts` (added container fields to `Project` type)
- `packages/shared/src/index.ts` (exported new schemas and types)
- `apps/dashboard/src/components/projects/BuildPanel.tsx` (added `onDeploySuccess` callback)
- `apps/dashboard/src/app/(panel)/projects/[id]/page.tsx` (integrated `ContainerControls`)

---

### F1.6 — Real-Time Logs
**Status:** 🟢 COMPLETED

**Description:**
Stream build and runtime logs from Docker containers to the frontend dashboard in real-time using Socket.io.

**Acceptance Criteria:**
- [x] Socket.io server integrated with Fastify
- [x] Build logs streamed during `nixpacks build`
- [x] Runtime logs streamed from running containers
- [x] Log history persisted (last 1000 lines, frontend cap)
- [x] Frontend terminal-like viewer (styled pre, no extra dep)
- [x] Filter logs by stream (stdout/stderr)
- [x] Auto-scroll with pause option

**Test Plan:**
1. Start deployment → build logs appear in real-time
2. Container running → runtime logs stream continuously
3. Disconnect/reconnect → resumes from last known position
4. 1000+ lines → older lines truncated, recent preserved
5. Filter stderr → only error lines shown

**Developer Docs:**
- **Location:** `docs/dev/realtime-logs.md`

**Files to Create:**
- `apps/api/src/plugins/socket.ts`
- `apps/api/src/modules/logs/service.ts`
- `apps/dashboard/components/projects/LogViewer.tsx`

---

### F1.7 — Environment Variables Management
**Status:** 🟢 COMPLETED

**Description:**
Allow users to set environment variables per project. Variables are encrypted at rest and injected into containers at runtime.

**Acceptance Criteria:**
- [x] `POST /api/projects/:id/env` — add/update env vars
- [x] `GET /api/projects/:id/env` — list env vars (values masked)
- [x] `DELETE /api/projects/:id/env/:key` — remove env var
- [x] Values encrypted with AES-256-GCM
- [x] Injected into Docker containers on deployment
- [x] Frontend UI with key-value editor
- [x] Support for `.env` file import

**Test Plan:**
1. Add env var → stored encrypted in database
2. List env vars → keys visible, values masked as `••••`
3. Deploy app → env vars accessible inside container
4. Update env var → new value used on next deployment
5. Import .env file → all vars parsed and stored

**Developer Docs:**
- **Location:** `docs/dev/environment-variables.md`

**Files Created:**
- `packages/shared/src/schemas/env.ts`
- `apps/api/src/utils/encryption.ts`
- `apps/api/src/modules/env/schema.ts`
- `apps/api/src/modules/env/service.ts`
- `apps/api/src/modules/env/routes.ts`
- `apps/dashboard/src/hooks/useEnvVars.ts`
- `apps/dashboard/src/components/projects/EnvVarEditor.tsx`
- `docs/dev/environment-variables.md`

**Files Modified:**
- `packages/shared/src/types/index.ts`
- `packages/shared/src/index.ts`
- `apps/api/src/config/env.ts`
- `apps/api/.env.example`
- `apps/api/src/index.ts`
- `apps/api/src/modules/deploy/service.ts`
- `apps/api/src/modules/build/service.ts`
- `apps/dashboard/src/app/(panel)/projects/[id]/page.tsx`

---

## Phase 2: Multi-Runtime Support

### F2.1 — Next.js Deployment
**Status:** 🟢 COMPLETED

**Description:**
Support deploying Next.js applications with SSR, API routes, and static generation.

**Acceptance Criteria:**
- [x] Auto-detection via `next.config.*` or `package.json` dependency
- [x] Build command: `npm run build`
- [x] Start command: `npm run start`
- [x] SSR works (not just static export)
- [x] API routes functional
- [x] Image optimization via Next.js Image component
- [x] Build output cached for faster redeploys

**Test Plan:**
1. Deploy Next.js app with SSR → pages render server-side
2. API route `/api/hello` → returns JSON response
3. Image component → images optimized and served
4. Re-deploy → build cache used, faster build time

**Developer Docs:**
- **Location:** `docs/dev/runtimes/nextjs.md`

**Files Created:**
- `system/templates/docker-compose/next.yml`
- `tests/test_nextjs_runtime.py`
- `docs/dev/runtimes/nextjs.md`

**Files Modified:**
- `system/python/docker_manager.py`
- `system/python/build_manager.py`
- `apps/api/src/modules/build/service.ts`

---

### F2.2 — Python (Django/Flask/FastAPI) Deployment
**Status:** 🟢 COMPLETED

**Description:**
Support deploying Python web applications. Auto-detect framework and configure appropriate WSGI/ASGI server.

**Acceptance Criteria:**
- [x] Auto-detection via `requirements.txt` or `pyproject.toml`
- [x] Django: `gunicorn` + `manage.py collectstatic`
- [x] Flask: `gunicorn` with auto-detected entry point
- [x] FastAPI: `uvicorn` with auto-detected app instance
- [x] Static files served via Nginx sidecar
- [x] Python version selection (3.10, 3.11, 3.12)

**Test Plan:**
1. Deploy Django app → admin panel accessible
2. Deploy Flask app → routes work correctly
3. Deploy FastAPI app → auto-docs at `/docs`
4. Static files → CSS/JS served correctly

**Developer Docs:**
- **Location:** `docs/dev/runtimes/python.md`

**Files Created:**
- `tests/test_python_runtime.py`
- `docs/dev/runtimes/python.md`

**Files Modified:**
- `system/python/build_manager.py`
- `apps/api/src/modules/build/service.ts`

---

### F2.3 — React (Vite) Static Deployment
**Status:** 🟢 COMPLETED

**Description:**
Support deploying React applications built with Vite as static sites.

**Acceptance Criteria:**
- [x] Auto-detection via `vite.config.*`
- [x] Build command: `npm run build`
- [x] Output served from `dist/` folder via Nginx / Caddy static web server
- [x] SPA routing support (fallback to index.html)
- [x] Environment variable injection at build time

**Test Plan:**
1. Deploy Vite React app → loads correctly
2. Client-side routing → `/about` works on refresh
3. Build-time env vars → replaced in built files

**Developer Docs:**
- **Location:** `docs/dev/runtimes/react-vite.md`

**Files Created:**
- `tests/test_react_runtime.py`
- `docs/dev/runtimes/react-vite.md`

**Files Modified:**
- `system/python/build_manager.py`
- `system/templates/docker-compose/static.yml`
- `apps/api/src/modules/build/service.ts`

---

### F2.4 — PHP & WordPress Deployment
**Status:** 🟢 COMPLETED

**Description:**
Support deploying modern & traditional PHP applications (Laravel, Symfony, generic PHP) and one-click WordPress installation with Nginx + PHP-FPM container orchestration, multi-version PHP support (8.1, 8.2, 8.3), automated core scaffolding, secure salt generation, wp-config.php auto-wiring, permalinks rewrites, and plugin/theme file uploads.

**Acceptance Criteria:**
- [x] PHP-FPM + Nginx container setup
- [x] Multiple PHP versions (8.1, 8.2, 8.3)
- [x] WordPress one-click installer
- [x] Auto-download WordPress core
- [x] wp-config.php auto-generation with DB credentials
- [x] Plugin/theme upload via file manager
- [x] Permalink support

**Test Plan:**
1. Deploy PHP app → executes correctly
2. One-click WordPress → site loads, admin accessible
3. Upload plugin → appears in WordPress admin
4. Permalinks → pretty URLs work

**Developer Docs:**
- **Location:** `docs/dev/runtimes/php-wordpress.md`

**Files Created:**
- `system/templates/docker-compose/php.yml`
- `system/templates/docker-compose/wordpress.yml`
- `apps/api/src/modules/wordpress/schema.ts`
- `apps/api/src/modules/wordpress/service.ts`
- `apps/api/src/modules/wordpress/routes.ts`
- `apps/dashboard/src/components/projects/WordPressPanel.tsx`
- `tests/test_php_wordpress_runtime.py`
- `docs/dev/runtimes/php-wordpress.md`

**Files Modified:**
- `system/python/build_manager.py`
- `system/python/docker_manager.py`
- `apps/api/src/modules/build/service.ts`
- `apps/api/src/index.ts`
- `apps/dashboard/src/app/(panel)/projects/[id]/page.tsx`
- `tests/test_multi_project_isolation.py`

---

### F2.5 — Custom Dockerfile Deployment
**Status:** 🟢 COMPLETED

**Description:**
Allow users to provide their own Dockerfile for maximum flexibility. Includes interactive Dockerfile and .dockerignore code editor, 1-click starter presets (Node.js, Python, Go, Rust, Static Nginx, Bun, PHP 8.3), native `docker build` execution with real-time log streaming, build argument injection, automatic `EXPOSE` port detection, custom health checks, and Traefik load balancer orchestration.

**Acceptance Criteria:**
- [x] Dockerfile upload or inline editor
- [x] `docker build` from provided Dockerfile
- [x] `.dockerignore` support
- [x] Build context from project files
- [x] Health check configuration
- [x] Exposed port auto-detection or manual specification

**Test Plan:**
1. Upload custom Dockerfile → builds successfully
2. Invalid Dockerfile → build fails with clear error
3. `.dockerignore` → excluded files not in build context

**Developer Docs:**
- **Location:** `docs/dev/runtimes/custom-dockerfile.md`

**Files Created:**
- `system/templates/docker-compose/docker.yml`
- `packages/shared/src/schemas/dockerfile.ts`
- `apps/api/src/modules/dockerfile/schema.ts`
- `apps/api/src/modules/dockerfile/service.ts`
- `apps/api/src/modules/dockerfile/routes.ts`
- `apps/dashboard/src/components/projects/DockerfilePanel.tsx`
- `tests/test_dockerfile_runtime.py`
- `docs/dev/runtimes/custom-dockerfile.md`

**Files Modified:**
- `system/python/build_manager.py`
- `system/python/docker_manager.py`
- `packages/shared/src/index.ts`
- `apps/api/src/modules/build/service.ts`
- `apps/api/src/index.ts`
- `apps/dashboard/src/app/(panel)/projects/[id]/page.tsx`
- `tests/test_multi_project_isolation.py`


---

### F2.6 — Database Provisioning (MySQL/PostgreSQL)
**Status:** 🟢 COMPLETED

**Description:**
Allow users to create databases per project or standalone. Manage database users, passwords, connections, and live testing. Includes PostgreSQL 16 and MySQL 8.0 support, automatic strong password generation with AES-256-GCM encryption at rest, connection string generation (internal Docker and host), automatic project environment variable injection, and Adminer web GUI integration.

**Acceptance Criteria:**
- [x] `POST /api/databases` — create database + user
- [x] `GET /api/databases` — list user's databases
- [x] `DELETE /api/databases/:id` — drop database and user
- [x] Auto-generated strong passwords
- [x] Connection string provided to user
- [x] Database accessible only from project containers
- [x] phpMyAdmin/Adminer integration for MySQL

**Test Plan:**
1. Create MySQL DB → database and user created
2. Connect from app → connection successful
3. Delete DB → database dropped, user removed
4. phpMyAdmin / Adminer → accessible via panel, shows correct DBs

**Developer Docs:**
- **Location:** `docs/dev/database-provisioning.md`

**Files Created:**
- `system/python/database_manager.py`
- `packages/shared/src/schemas/databases.ts`
- `apps/api/src/modules/databases/schema.ts`
- `apps/api/src/modules/databases/service.ts`
- `apps/api/src/modules/databases/routes.ts`
- `apps/dashboard/src/app/(panel)/databases/page.tsx`
- `apps/dashboard/src/components/projects/DatabasePanel.tsx`
- `tests/test_database_provisioning.py`
- `docs/dev/database-provisioning.md`

**Files Modified:**
- `docker-compose.yml`
- `packages/shared/src/index.ts`
- `apps/api/src/config/env.ts`
- `apps/api/.env.example`
- `apps/api/src/index.ts`
- `apps/dashboard/src/app/(panel)/projects/[id]/page.tsx`

---

### F2.7 — GitHub Webhook Auto-Deploy
**Status:** 🟢 COMPLETED

**Description:**
Automatically redeploy projects when code is pushed to connected GitHub repositories.

**Acceptance Criteria:**
- [x] Webhook endpoint `POST /api/webhooks/github`
- [x] Signature verification with GitHub secret
- [x] Filter by branch (only deploy configured branch)
- [x] Queue deployment via BullMQ
- [x] Deployment status shown in dashboard
- [x] Support for pull request previews (optional)

**Test Plan:**
1. Push to main branch → webhook received, deployment queued
2. Push to other branch → ignored (if not configured)
3. Invalid signature → webhook rejected with 401
4. Deployment → new code live within 2 minutes

**Developer Docs:**
- **Location:** `docs/dev/github-webhooks.md`

**Files Created:**
- `packages/shared/src/schemas/webhooks.ts`
- `apps/api/src/modules/webhooks/schema.ts`
- `apps/api/src/modules/webhooks/service.ts`
- `apps/api/src/modules/webhooks/routes.ts`
- `tests/test_github_webhooks.py`
- `docs/dev/github-webhooks.md`

**Files Modified:**
- `packages/shared/src/schemas/projects.ts`
- `packages/shared/src/index.ts`
- `apps/api/src/modules/git/service.ts`
- `apps/api/src/modules/git/routes.ts`
- `apps/api/src/modules/build/service.ts`
- `apps/api/src/index.ts`
- `apps/dashboard/src/hooks/useGitSettings.ts`
- `apps/dashboard/src/components/projects/GitSettings.tsx`
- `apps/dashboard/src/components/projects/BuildPanel.tsx`

---

### F2.8 — File Manager & SFTP Access
**Status:** 🟢 COMPLETED

**Description:**
Web-based file manager embedded in the project detail page and a dedicated full-screen editor. Users can browse, edit, upload, download, rename, move, copy and delete their project files directly from the dashboard. A CodeMirror 6 editor handles in-browser editing with syntax highlighting. WordPress projects gain one-click export (files + DB as `.tar.gz`) and import (extract + SQL restore + wp-config update). Each Vexlyx user can provision a chrooted SFTP account (one per user, scoped to all their projects) with password-based and SSH-key-based authentication.

**Acceptance Criteria:**
- [x] `GET  /api/files/:id/list` — lazy-load directory tree (depth 1–3)
- [x] `GET  /api/files/:id/read` — read file content (≤ 2 MB)
- [x] `POST /api/files/:id/write` — atomic save (temp-file + rename)
- [x] `DELETE /api/files/:id/delete` — delete file or folder recursively
- [x] `POST /api/files/:id/rename` — rename / move within project
- [x] `POST /api/files/:id/mkdir` — create directory
- [x] `POST /api/files/:id/copy` — copy file or directory
- [x] `POST /api/files/:id/move` — move file or directory
- [x] `GET  /api/files/:id/download` — stream file as download
- [x] `POST /api/files/:id/create` — create file without overwriting (returns 409 on collision)
- [x] `POST /api/files/:id/upload` — multipart upload, max 100 MB per file
- [x] Path-traversal protection: `safePath()` + symlink escape guard
- [x] Blocks writes to `.env` / `wp-config.php` via extension blocklist
- [x] `GET  /api/projects/:id/wordpress/export` — tar.gz stream (files + mysqldump)
- [x] `POST /api/projects/:id/wordpress/import` — upload + extract + SQL + wp-config
- [x] `POST /api/sftp/provision` — create chrooted Linux user + sshd_config Match block
- [x] `GET  /api/sftp/credentials` — return stored (decrypted) connection details with dynamic host
- [x] `POST /api/sftp/rotate-password` — generate new password, update chpasswd
- [x] `POST /api/sftp/add-ssh-key` — append to authorized_keys
- [x] `DELETE /api/sftp/disable` — lock the Linux account (`usermod --lock`)
- [x] `POST /api/sftp/enable` — unlock the Linux account (`usermod --unlock`) & sync projects
- [x] Passwords encrypted at rest with AES-256-GCM
- [x] `FileManagerCard` compact widget on project detail page (5 recent files + Open button)
- [x] Full-screen two-pane file manager at `/projects/:id/files`
- [x] CodeMirror 6 editor with auto language detection + Ctrl+S save
- [x] Drag-and-drop upload dropzone (100 MB limit enforced client-side)
- [x] `SftpPanel` card: provision, show credentials, rotate password, add SSH key, disable, enable

**Test Plan:**
1. Browse project directory → tree loads lazily on folder expand
2. Click a `.php` / `.ts` / `.yaml` file → opens in CodeMirror with correct syntax highlighting
3. Edit file → Ctrl+S → toast "File saved"
4. Upload a 1 MB file via drag-and-drop → file appears in tree after refresh
5. Attempt path like `../../etc/passwd` → API returns 403
6. Attempt write to `.env` → API returns 403
7. WordPress export → `wp-export-*.tar.gz` downloads with SQL dump inside
8. WordPress import (valid archive) → files extracted, SQL restored, wp-config updated
9. Provision SFTP → credentials shown; `sftp username@host` connects, chroot holds
10. Add SSH key → key appears; password-less login works
11. Rotate password → old password rejected, new one works
12. Disable SFTP → `usermod --lock` prevents all logins

**Developer Docs:**
- **Location:** `docs/dev/file-manager-sftp.md`

**Files Created:**
- `packages/shared/src/schemas/files.ts`
- `apps/api/src/modules/files/schema.ts`
- `apps/api/src/modules/files/service.ts`
- `apps/api/src/modules/files/routes.ts`
- `apps/api/src/modules/sftp/schema.ts`
- `apps/api/src/modules/sftp/service.ts`
- `apps/api/src/modules/sftp/routes.ts`
- `system/python/sftp_manager.py`
- `apps/dashboard/src/components/files/FileTree.tsx`
- `apps/dashboard/src/components/files/FileEditor.tsx`
- `apps/dashboard/src/components/files/UploadDropzone.tsx`
- `apps/dashboard/src/components/projects/FileManagerCard.tsx`
- `apps/dashboard/src/components/projects/SftpPanel.tsx`
- `apps/dashboard/src/components/ui/dropdown-menu.tsx`
- `apps/dashboard/src/app/(standalone)/layout.tsx`
- `apps/dashboard/src/app/(standalone)/projects/[id]/files/page.tsx`
- `apps/api/src/types/stream.d.ts`
- `tests/test_file_manager_sftp.py`
- `docs/dev/file-manager-sftp.md`

**Files Modified:**
- `packages/shared/src/index.ts`
- `apps/api/prisma/schema.prisma` — added `SftpUser` model
- `apps/api/src/config/env.ts` — added `FILE_UPLOAD_MAX_MB`, `SFTP_HOST`, `SFTP_PORT`
- `apps/api/src/index.ts` — registered `@fastify/multipart`, `fileRoutes`, `sftpRoutes`
- `apps/api/src/modules/wordpress/schema.ts` — added `WordPressImportSchema`
- `apps/api/src/modules/wordpress/service.ts` — added `exportSite`, `importSite`, `saveTempUpload`
- `apps/api/src/modules/wordpress/routes.ts` — added export + import routes
- `system/python/build_manager.py` — added `wordpress-export`, `wordpress-import` commands
- `apps/dashboard/src/app/(panel)/projects/[id]/page.tsx` — renders `FileManagerCard`, `SftpPanel`
- `apps/dashboard/src/components/projects/WordPressPanel.tsx` — export/import buttons + dialog

---

## Phase 3: Domain & DNS


### F3.1 — Custom Domain Management
**Status:** 🟢 COMPLETED

**Description:**
Allow users to attach custom domains to projects. Validate domain ownership and configure routing.

**Acceptance Criteria:**
- [x] `POST /api/domains` — add domain to project
- [x] Domain validation via DNS TXT record
- [x] `GET /api/domains` — list domains
- [x] `DELETE /api/domains/:id` — remove domain
- [x] Traefik router auto-configuration
- [x] Domain status tracking (pending, active, error)

**Test Plan:**
1. Add domain → validation instructions shown
2. Add TXT record → validation passes, status = active
3. Visit domain → loads correct project
4. Remove domain → routing removed, DNS cleaned up

**Developer Docs:**
- **Location:** `docs/dev/domains.md`

**Files Created:**
- `packages/shared/src/schemas/domains.ts`
- `apps/api/src/modules/domains/schema.ts`
- `apps/api/src/modules/domains/service.ts`
- `apps/api/src/modules/domains/routes.ts`
- `apps/dashboard/src/hooks/useDomains.ts`
- `apps/dashboard/src/components/projects/DomainPanel.tsx`
- `apps/dashboard/src/app/(panel)/domains/page.tsx`
- `tests/test_custom_domains.py`
- `docs/dev/domains.md`

**Files Modified:**
- `packages/shared/src/index.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/src/index.ts`
- `apps/dashboard/src/app/(panel)/projects/[id]/page.tsx`

---

### F3.2 — Subdomain Support
**Status:** 🟢 COMPLETED

**Description:**
Support subdomains pointing to different projects or paths within the same server.

**Acceptance Criteria:**
- [x] `api.domain.com` → API project
- [x] `blog.domain.com` → blog project
- [x] `app.domain.com` → main app
- [x] Wildcard subdomain support (`*.domain.com`)
- [x] Subdomain management UI

**Test Plan:**
1. Add subdomain → routes to correct project
2. Wildcard subdomain → any subdomain works
3. Remove subdomain → routing removed

**Developer Docs:**
- **Location:** `docs/dev/subdomains.md`

**Files Created:**
- `apps/dashboard/src/components/domains/SubdomainModal.tsx`
- `tests/test_subdomains.py`
- `docs/dev/subdomains.md`

**Files Modified:**
- `packages/shared/src/schemas/domains.ts`
- `packages/shared/src/index.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/src/modules/domains/service.ts`
- `apps/api/src/modules/domains/routes.ts`
- `apps/dashboard/src/hooks/useDomains.ts`
- `apps/dashboard/src/app/(panel)/domains/page.tsx`
- `apps/dashboard/src/components/projects/DomainPanel.tsx`

---

### F3.3 — DNS Record Management
**Status:** 🟢 COMPLETED

**Description:**
Full DNS zone management for domains hosted on Vexlyx nameservers.

**Acceptance Criteria:**
- [x] Support for A, AAAA, CNAME, MX, TXT, NS, SRV records
- [x] DNS zone file generation
- [x] BIND9 or CoreDNS integration
- [x] Record validation (IP format, hostname, etc.)
- [x] TTL configuration per record
- [x] DNS propagation status
- [x] Import/export zone files

**Test Plan:**
1. Add A record → resolves correctly
2. Add MX record → email routing works
3. Add TXT record → SPF/DKIM validation passes
4. Export zone file → contains all records
5. Import zone file → records created correctly

**Developer Docs:**
- **Location:** `docs/dev/dns-management.md`

**Files Created:**
- `packages/shared/src/schemas/dns.ts`
- `docker/coredns/Corefile`
- `docker/coredns/zones/.gitkeep`
- `system/python/dns_manager.py`
- `apps/api/src/modules/domains/dns-service.ts`
- `apps/dashboard/src/hooks/useDnsRecords.ts`
- `apps/dashboard/src/app/(panel)/domains/[id]/dns/page.tsx`
- `apps/dashboard/src/components/domains/DnsManagementModal.tsx`
- `tests/test_dns_management.py`
- `docs/dev/dns-management.md`

**Files Modified:**
- `packages/shared/src/index.ts`
- `docker-compose.yml`
- `apps/api/prisma/schema.prisma`
- `apps/api/src/modules/domains/schema.ts`
- `apps/api/src/modules/domains/routes.ts`
- `apps/api/src/plugins/auth.ts`
- `apps/dashboard/src/app/(panel)/domains/page.tsx`

---

### F3.4 — SSL Certificate Management
**Status:** 🟢 COMPLETED

**Description:**
Automatic SSL certificate provisioning via Let's Encrypt through Traefik.

**Acceptance Criteria:**
- [x] Auto SSL for all domains via Traefik certresolver
- [x] Wildcard SSL support
- [x] Certificate expiry monitoring
- [x] Auto-renewal before expiry
- [x] Manual certificate upload (for custom certs)
- [x] SSL status shown per domain

**Test Plan:**
1. Add domain → SSL certificate auto-generated within 60 seconds
2. Visit `https://domain.com` → valid certificate
3. Wildcard domain → `*.domain.com` covered
4. Expiry alert → notification 7 days before expiry

**Developer Docs:**
- **Location:** `docs/dev/ssl-management.md`

**Files Created:**
- `packages/shared/src/schemas/ssl.ts`
- `system/python/ssl_manager.py`
- `apps/api/src/modules/domains/ssl-service.ts`
- `apps/dashboard/src/hooks/useDomainSsl.ts`
- `apps/dashboard/src/app/(panel)/domains/[id]/ssl/page.tsx`
- `tests/test_ssl_management.py`
- `docs/dev/ssl-management.md`

**Files Modified:**
- `docker-compose.yml`
- `docker/traefik/traefik.yml`
- `.gitignore`
- `apps/api/prisma/schema.prisma`
- `apps/api/src/modules/domains/schema.ts`
- `apps/api/src/modules/domains/service.ts`
- `apps/api/src/modules/domains/routes.ts`
- `packages/shared/src/schemas/domains.ts`
- `packages/shared/src/index.ts`
- `apps/dashboard/src/app/(panel)/domains/page.tsx`
- `FEATURES.md`


---

## Phase 4: Email Server

### F4.1 — Postfix SMTP Server
**Status:** 🟢 COMPLETED

**Description:**
Install and configure Postfix for outgoing email (SMTP).

**Acceptance Criteria:**
- [x] Postfix installed and running on host
- [x] Port 25 and 587 open
- [x] Virtual domain configuration
- [x] Relay restrictions (no open relay)
- [x] TLS encryption enforced
- [x] DKIM signing via OpenDKIM

**Test Plan:**
1. Send email via SMTP → delivered successfully
2. TLS required → plaintext connection rejected
3. Open relay test → relay denied for unauthorized IPs

**Developer Docs:**
- **Location:** `docs/dev/email/postfix.md`

**Files Created:**
- `packages/shared/src/schemas/mail.ts`
- `docker/postfix/Dockerfile`
- `docker/postfix/main.cf`
- `docker/postfix/master.cf`
- `docker/postfix/opendkim.conf`
- `docker/postfix/entrypoint.sh`
- `docker/postfix/config/virtual_domains`
- `docker/postfix/config/virtual_mailbox_maps`
- `system/python/postfix_manager.py`
- `system/scripts/setup-postfix.sh`
- `apps/api/src/modules/mail/schema.ts`
- `apps/api/src/modules/mail/service.ts`
- `apps/api/src/modules/mail/routes.ts`
- `apps/dashboard/src/hooks/useMail.ts`
- `apps/dashboard/src/app/(panel)/mail/page.tsx`
- `tests/test_postfix_smtp.py`
- `docs/dev/email/postfix.md`

**Files Modified:**
- `docker-compose.yml`
- `packages/shared/src/index.ts`
- `apps/api/src/index.ts`
- `FEATURES.md`

---

### F4.2 — Dovecot IMAP Server
**Status:** 🟢 COMPLETED

**Description:**
Install and configure Dovecot for incoming email (IMAP).

**Acceptance Criteria:**
- [x] Dovecot installed and running on host
- [x] Port 143 and 993 open
- [x] Virtual mailbox configuration
- [x] Maildir format storage
- [x] Quota management
- [x] SSL/TLS on port 993

**Test Plan:**
1. Connect via IMAPS → login successful
2. Retrieve emails → inbox loads correctly
3. Quota exceeded → rejection with clear message

**Developer Docs:**
- **Location:** `docs/dev/email/dovecot.md`

**Files Created:**
- `docker/dovecot/Dockerfile`
- `docker/dovecot/dovecot.conf`
- `docker/dovecot/entrypoint.sh`
- `docker/dovecot/config/users`
- `system/python/dovecot_manager.py`
- `system/scripts/setup-dovecot.sh`
- `tests/test_dovecot_imap.py`
- `docs/dev/email/dovecot.md`

**Files Modified:**
- `docker-compose.yml`
- `docker/postfix/main.cf`
- `docker/postfix/entrypoint.sh`
- `packages/shared/src/schemas/mail.ts`
- `packages/shared/src/index.ts`
- `apps/api/src/config/env.ts`
- `apps/api/src/modules/mail/service.ts`
- `apps/api/.env.example`
- `apps/dashboard/src/hooks/useMail.ts`
- `apps/dashboard/src/app/(panel)/mail/page.tsx`
- `.gitignore`
- `FEATURES.md`

---

### F4.3 — Mailbox Management UI
**Status:** 🟢 COMPLETED

**Description:**
Dashboard interface for creating and managing email mailboxes.

**Acceptance Criteria:**
- [x] `POST /api/mailboxes` — create mailbox
- [x] `GET /api/mailboxes` — list mailboxes
- [x] `DELETE /api/mailboxes/:id` — delete mailbox
- [x] Quota configuration per mailbox
- [x] Password reset functionality
- [x] Mailbox usage statistics

**Test Plan:**
1. Create mailbox → can login via IMAP
2. Send email to mailbox → appears in inbox
3. Delete mailbox → emails inaccessible
4. Quota set → enforced by Dovecot

**Developer Docs:**
- **Location:** `docs/dev/email/mailbox-management.md`

**Files Created:**
- `apps/api/src/modules/mailboxes/routes.ts`
- `apps/api/src/modules/mailboxes/service.ts`
- `apps/api/src/modules/mailboxes/schema.ts`
- `packages/shared/src/schemas/mailbox.ts`
- `apps/dashboard/src/hooks/useMailboxes.ts`
- `apps/dashboard/src/components/mail/MailboxesPanel.tsx`
- `apps/dashboard/src/components/ui/tabs.tsx`
- `apps/dashboard/src/components/ui/table.tsx`
- `docs/dev/email/mailbox-management.md`

**Files Modified:**
- `apps/api/src/index.ts`
- `apps/api/src/modules/mail/service.ts`
- `packages/shared/src/index.ts`
- `apps/dashboard/src/app/(panel)/mail/page.tsx`
- `system/python/dovecot_manager.py`
- `system/python/postfix_manager.py`
- `docker/postfix/entrypoint.sh`
- `FEATURES.md`

---

### F4.4 — Webmail (Roundcube)
**Status:** 🟢 COMPLETED

**Description:**
Deploy Roundcube as a Docker container for web-based email access.

**Acceptance Criteria:**
- [x] Roundcube Docker container running
- [x] Proxied via Traefik at `webmail.vexlyx.localhost` (single shared instance, same tier as `adminer`)
- [x] Auto-configured with Dovecot/Postfix settings (no config changes needed on either)
- [x] Multiple mailbox support (any Dovecot mailbox can log in)
- [x] Compose, reply, forward functionality (Roundcube core)
- [x] Address book (Roundcube core)
- [x] Attachment support (Roundcube core)

**Test Plan:**
1. Access webmail → login page loads
2. Login → inbox displays emails
3. Compose email → sends successfully
4. Attachment upload/download → works correctly

**Developer Docs:**
- **Location:** `docs/dev/email/webmail.md`

**Files Created:**
- `system/python/webmail_manager.py`
- `docker/traefik/dynamic/webmail.yml`
- `docker/roundcube/config/local.inc.php`
- `apps/dashboard/src/hooks/useWebmail.ts`
- `apps/dashboard/src/components/mail/WebmailPanel.tsx`
- `docs/dev/email/webmail.md`

**Files Modified:**
- `docker-compose.yml`
- `packages/shared/src/schemas/mail.ts`
- `packages/shared/src/index.ts`
- `apps/api/src/config/env.ts`
- `apps/api/.env.example`
- `apps/api/src/modules/mail/service.ts`
- `apps/api/src/modules/mail/routes.ts`
- `apps/dashboard/src/app/(panel)/mail/page.tsx`
- `FEATURES.md`

---

### F4.5 — SPF, DKIM, DMARC Auto-Configuration
**Status:** 🟢 COMPLETED

**Description:**
Automatically generate and manage email authentication DNS records.

**Acceptance Criteria:**
- [x] SPF record auto-generated per domain
- [x] DKIM key pair generation
- [x] DKIM public key in DNS TXT record
- [x] DMARC policy record generation
- [x] Email deliverability score monitoring (internal 0-100 score, no external API)
- [x] DNS records updated when mail domain added (triggered on first mailbox creation)

**Test Plan:**
1. Add mail domain → SPF, DKIM, DMARC records created
2. Send email → passes SPF/DKIM/DMARC checks
3. Mail-Tester score → 9/10 or higher (verify manually via mail-tester.com; Vexlyx's own score is internal-only and DB-based, see docs)

**Developer Docs:**
- **Location:** `docs/dev/email/authentication.md`

**Files Created:**
- `docs/dev/email/authentication.md`
- `tests/test_mail_authentication.py`

**Files Modified:**
- `apps/api/src/modules/domains/dns-service.ts`
- `apps/api/src/modules/mail/service.ts`
- `apps/api/src/modules/mail/routes.ts`
- `apps/api/src/modules/mail/schema.ts`
- `apps/api/src/modules/mailboxes/service.ts`
- `packages/shared/src/schemas/mail.ts`
- `packages/shared/src/index.ts`
- `apps/dashboard/src/hooks/useMail.ts`
- `apps/dashboard/src/app/(panel)/mail/page.tsx`
- `FEATURES.md`

---

### F4.6 — Email Forwarding & Aliases
**Status:** 🟢 COMPLETED

**Description:**
Support email forwarding and alias creation.

**Acceptance Criteria:**
- [x] Create alias `sales@domain.com` → forwards to `user@domain.com`
- [x] Multiple destination addresses per alias
- [x] Catch-all alias support
- [x] Alias management UI

> Vacation auto-responder split out to F4.7 (requires Dovecot Pigeonhole/Sieve, not yet installed).

**Test Plan:**
1. Create alias → email forwarded correctly
2. Catch-all → unmatched emails forwarded to admin

**Developer Docs:**
- **Location:** `docs/dev/email/aliases.md`

---

### F4.7 — Vacation Auto-Responder
**Status:** 🟢 COMPLETED

**Description:**
Per-mailbox vacation/out-of-office auto-reply, powered by Dovecot Pigeonhole (Sieve) and LMTP delivery handoff from Postfix.

**Acceptance Criteria:**
- [x] Dovecot Pigeonhole (Sieve) installed and wired into the mail stack
- [x] Per-mailbox vacation message configuration UI
- [x] Auto-reply sent once per sender within a configurable interval

**Test Plan:**
1. Enable vacation responder on a mailbox → sender receives one auto-reply
2. Second message from same sender within interval → no duplicate auto-reply

**Developer Docs:**
- **Location:** `docs/dev/email/vacation-responder.md`

**Files Created:**
- `packages/shared/src/schemas/vacation.ts`
- `apps/api/src/modules/vacation/schema.ts`
- `apps/api/src/modules/vacation/service.ts`
- `apps/api/src/modules/vacation/routes.ts`
- `apps/dashboard/src/hooks/useVacationResponder.ts`
- `apps/dashboard/src/components/mail/VacationResponderDialog.tsx`
- `docs/dev/email/vacation-responder.md`
- `tests/test_vacation_responder.py`

**Files Modified:**
- `apps/api/prisma/schema.prisma`
- `packages/shared/src/schemas/mailbox.ts`
- `packages/shared/src/index.ts`
- `docker/dovecot/Dockerfile`
- `docker/dovecot/dovecot.conf`
- `docker/postfix/main.cf`
- `system/python/dovecot_manager.py`
- `system/scripts/setup-dovecot.sh`
- `apps/api/src/index.ts`
- `apps/api/src/modules/mailboxes/service.ts`
- `apps/dashboard/src/components/mail/MailboxesPanel.tsx`
- `FEATURES.md`

---

## Phase 5: System & Administration

### F5.1 — One-Line Server Installer
**Status:** 🟢 COMPLETED

**Description:**
Automated, idempotent installation script that sets up Vexlyx on a fresh Ubuntu 24.04 server via `curl -fsSL https://get.vexlyx.com | bash`. `install.sh` is a thin bootstrap that clones/updates the repo into `/opt/vexlyx` and hands off to `system/scripts/install/run.sh`, which runs 16 numbered, independently-idempotent steps covering package/Docker/Node/Python installation, config collection, secret generation, building the panel, and bringing up every service (Postgres/MySQL/Redis, Traefik with real Let's Encrypt certs, CoreDNS, Postfix/Dovecot/Roundcube, and the dashboard/API themselves) behind a hardened `docker-compose.prod.yml` overlay, finishing with UFW configuration. DNS is served via CoreDNS (not BIND9 — see F3.3, which already made that call) as Docker containers rather than bare-metal services, since the existing mail-management code (`postfix_manager.py`/`dovecot_manager.py`) is hardwired to `docker exec` against containers.

**Acceptance Criteria:**
- [x] `curl -fsSL https://get.vexlyx.com | bash` installs everything
- [x] Installs Docker, Docker Compose, Node.js, Python
- [x] Configures PostgreSQL, Redis, Traefik
- [x] Sets up Postfix, Dovecot, CoreDNS (supersedes BIND9 per F3.3's implementation choice)
- [x] Creates admin user
- [x] Generates SSL certificate for panel domain
- [x] Configures firewall (UFW)
- [x] Idempotent (can run multiple times safely)

**Test Plan:**
1. Fresh Ubuntu server → script completes without errors
2. Visit `https://panel.domain.com` → login page loads over a real Let's Encrypt cert, login works
3. All services running → `docker compose -f docker-compose.yml -f docker-compose.prod.yml ps` shows all healthy
4. Re-run script → no errors, no duplicate config/rules/containers

Validated end-to-end on a real Ubuntu EC2 instance through to a working login, a deployed WordPress project, and a verified custom domain. See `docs/dev/installer.md`'s Testing section for the full list of bugs this surfaced (in the installer itself, in Dockerfiles, and a few pre-existing application bugs unrelated to F5.1) and how each was fixed.

**Developer Docs:**
- **Location:** `docs/dev/installer.md`

**Files Created:**
- `install.sh`
- `system/scripts/install/{lib.sh,config.sh,run.sh}`
- `system/scripts/install/steps/01-preflight.sh` … `16-summary.sh`
- `docker-compose.prod.yml`
- `docker/traefik/traefik.prod.yml.tmpl`
- `apps/api/Dockerfile`
- `apps/dashboard/Dockerfile`
- `apps/api/prisma/create-admin.ts`
- `apps/dashboard/public/.gitkeep`
- `.dockerignore`
- `docs/dev/installer.md`

**Files Modified:**
- `docker-compose.yml` (Traefik `v3.4` → `v3.6` for Docker 29+ API compatibility; removed the ineffective `DOCKER_API_VERSION` env var)
- `docker/postfix/entrypoint.sh`, `docker/dovecot/entrypoint.sh` (production hostname override, `VEXLYX_SEED_DEV_FIXTURES` gate on dev-only mailbox seeding)
- `apps/dashboard/next.config.ts` (`output: "standalone"`)
- `apps/api/src/config/env.ts`, `apps/api/src/plugins/auth.ts` (`COOKIE_DOMAIN` for cross-subdomain session sharing)
- `apps/api/package.json`, `apps/api/.env.example`
- `package.json` (`engines.node` → `>=22`)
- `.gitignore`
- `README.md`, `DEV.md` (Node 22+ prerequisite, real repo URL)
- `system/python/build_manager.py` (pre-existing `null`/`None` Python bug, unrelated to F5.1, surfaced by first real-world use)
- `apps/dashboard/src/components/projects/EnvVarEditor.tsx` (autocomplete attributes, unrelated to F5.1, surfaced by first real-world use)
- `apps/dashboard/src/app/(standalone)/projects/[id]/files/page.tsx`, `apps/dashboard/src/components/files/UploadDropzone.tsx`, `apps/dashboard/src/components/projects/FileManagerCard.tsx` (pre-existing F2.8 ESLint errors blocking the first-ever production `next build`)

---

### F5.2 — Resource Monitoring
**Status:** 🟢 COMPLETED

**Description:**
Monitor server and container resource usage (CPU, RAM, Disk, Network) with real-time Socket.io push, BullMQ background collection, historical persistence in PostgreSQL, and threshold alerts.

**Acceptance Criteria:**
- [x] Server-level metrics (CPU, RAM, Disk, Uptime)
- [x] Per-container metrics
- [x] Real-time graphs in dashboard (live gauges via Socket.io + area chart)
- [x] Historical data (1h, 24h, 7d, 30d) stored as 60-second snapshots
- [x] Alert thresholds (CPU > 80%, RAM > 85%, Disk > 90%) — sonner toast + animated badge
- [x] Custom collector (`system_monitor.py`) using psutil + `docker stats`

**Test Plan:**
1. Dashboard shows current CPU/RAM usage ✅ — live SVG gauges, Socket.io push every 5s
2. Container metrics → accurate per-project usage ✅ — `docker stats --no-stream` parser
3. High CPU alert → notification sent ✅ — sonner toast + ThresholdAlertBadge
4. Historical graph → shows trend ✅ — recharts area chart with 1h/24h/7d/30d selector

**Developer Docs:**
- **Location:** `docs/dev/monitoring.md`

**Files Created:**
- `packages/shared/src/schemas/monitoring.ts`
- `system/python/system_monitor.py`
- `apps/api/src/modules/monitoring/schema.ts`
- `apps/api/src/modules/monitoring/service.ts`
- `apps/api/src/modules/monitoring/socket.ts`
- `apps/api/src/modules/monitoring/routes.ts`
- `apps/dashboard/src/hooks/useMonitoring.ts`
- `apps/dashboard/src/components/monitoring/ResourceGauge.tsx`
- `apps/dashboard/src/components/monitoring/UsageBar.tsx`
- `apps/dashboard/src/components/monitoring/MetricHistoryChart.tsx`
- `apps/dashboard/src/components/monitoring/ContainerMetricsTable.tsx`
- `apps/dashboard/src/components/monitoring/ThresholdAlertBadge.tsx`
- `apps/dashboard/src/components/monitoring/MonitoringPage.tsx`
- `apps/dashboard/src/app/(panel)/monitoring/page.tsx`
- `docs/dev/monitoring.md`

**Files Modified:**
- `packages/shared/src/index.ts`
- `apps/api/prisma/schema.prisma` (added `MetricSnapshot` model)
- `apps/api/src/index.ts` (registered `monitoringRoutes`)
- `apps/dashboard/src/components/layout/Sidebar.tsx` (added Monitoring nav item)
- `FEATURES.md`

---


### F5.3 — Backup System
**Status:** 🟢 COMPLETED

**Description:**
Automated and on-demand full-system backups (projects, databases, mail, DNS) with configurable schedule, retention, and per-item restore.

**Acceptance Criteria:**
- [x] Daily automated backups at configurable time — `BackupSettings` singleton row, editable from the dashboard, re-schedules the BullMQ job immediately
- [x] On-demand backup trigger — "Backup Now" button, `POST /api/backups`
- [x] Backup includes: files, databases, mailboxes, DNS zones — full-system snapshot per run
- [x] Backup compression (tar.gz) — one `<snapshotId>.tar.gz` per snapshot
- [x] Retention policy (keep last 7 daily, 4 weekly) — configurable, defaults match; `applyRetention()` runs after every backup
- [ ] Remote backup to S3/MinIO (optional) — deferred; local disk (`BACKUPS_DIR`) only in this pass
- [x] One-click restore from backup — per-item restore (project/database/mail domain/DNS zone) from any completed snapshot, behind a destructive confirmation dialog

**Test Plan:**
1. Trigger backup → archive created successfully ✅ — verified end-to-end via live API (manual trigger → `COMPLETED` snapshot → archive file on disk)
2. Scheduled backup → runs automatically at set time ✅ — BullMQ `upsertJobScheduler` with cron pattern, re-armed on settings change
3. Restore backup → project fully restored ✅ — verified round-trip: seeded a DB row, backed up, corrupted the row, restored, confirmed original value came back
4. Retention → old backups auto-deleted ✅ — `applyRetention()` grandfather-father-son rotation, deletes both DB row and archive file

**Developer Docs:**
- **Location:** `docs/dev/backup-system.md`

**Files Created:**
- `packages/shared/src/schemas/backups.ts`
- `system/python/backup_manager.py`
- `apps/api/src/modules/backups/schema.ts`
- `apps/api/src/modules/backups/service.ts`
- `apps/api/src/modules/backups/socket.ts`
- `apps/api/src/modules/backups/routes.ts`
- `apps/dashboard/src/hooks/useBackups.ts`
- `apps/dashboard/src/components/backups/BackupsPage.tsx`
- `apps/dashboard/src/components/backups/BackupList.tsx`
- `apps/dashboard/src/components/backups/BackupDetail.tsx`
- `apps/dashboard/src/components/backups/RestoreConfirmDialog.tsx`
- `apps/dashboard/src/components/backups/TriggerBackupButton.tsx`
- `apps/dashboard/src/components/backups/BackupSettingsCard.tsx`
- `apps/dashboard/src/app/(panel)/backups/page.tsx`
- `docs/dev/backup-system.md`

**Files Modified:**
- `packages/shared/src/index.ts`
- `apps/api/prisma/schema.prisma` (added `BackupSnapshot`, `BackupSettings` models + `BackupStatus`/`BackupTrigger` enums)
- `apps/api/src/config/env.ts` (added `BACKUPS_DIR`, `BACKUP_SCHEDULE_CRON`, `BACKUP_RETENTION_DAILY`, `BACKUP_RETENTION_WEEKLY`)
- `apps/api/src/index.ts` (registered `backupRoutes`)
- `apps/dashboard/src/components/layout/Sidebar.tsx` (added Backups nav item)
- `FEATURES.md`

---

### F5.4 — Firewall Management
**Status:** 🔴 NOT STARTED

**Description:**
Web-based UFW firewall management.

**Acceptance Criteria:**
- [ ] List current firewall rules
- [ ] Add new rules (port, protocol, source IP)
- [ ] Delete rules
- [ ] Default policy configuration
- [ ] Rule validation (prevent locking out)
- [ ] Apply changes with confirmation

**Test Plan:**
1. View rules → shows current UFW status
2. Add rule → port opens, traffic allowed
3. Delete rule → port closed
4. Invalid rule → error, not applied

**Developer Docs:**
- **Location:** `docs/dev/firewall.md`

---

### F5.5 — User Roles & Permissions
**Status:** 🔴 NOT STARTED

**Description:**
Role-based access control with Admin, User, and Reseller roles.

**Acceptance Criteria:**
- [ ] Admin: full access, manage users, system settings
- [ ] User: manage own projects, domains, databases
- [ ] Reseller: create sub-accounts, allocate resources
- [ ] Role assignment UI
- [ ] Permission middleware on API routes
- [ ] Resource quotas per role

**Test Plan:**
1. Admin creates user → user can login and create projects
2. User tries admin endpoint → 403 Forbidden
3. Reseller creates sub-account → sub-account works independently
4. Quota exceeded → creation blocked with clear message

**Developer Docs:**
- **Location:** `docs/dev/roles-permissions.md`

---

### F5.6 — Service Status Dashboard
**Status:** 🔴 NOT STARTED

**Description:**
Real-time status of all system services.

**Acceptance Criteria:**
- [ ] Postfix status (running/stopped/error)
- [ ] Dovecot status
- [ ] BIND9/CoreDNS status
- [ ] Docker daemon status
- [ ] PostgreSQL status
- [ ] Redis status
- [ ] Start/stop/restart controls
- [ ] Service logs viewer

**Test Plan:**
1. Dashboard shows all services green
2. Stop Postfix → status changes to red
3. Restart Postfix → status back to green
4. View logs → shows recent service logs

**Developer Docs:**
- **Location:** `docs/dev/service-status.md`

---

### F5.7 — Fast Static & WordPress Serving (No-Build Deploy Path)
**Status:** 🔴 NOT STARTED

**Description:**
STATIC/REACT and WORDPRESS project types currently deploy through the exact same path as Node/Python apps: a full Nixpacks build produces a custom Docker image per deploy (`system/templates/docker-compose/static.yml` and `wordpress.yml` both use `image: "{{image_name}}"`, a Nixpacks-built image — confirmed by reading the current templates and `docker_manager.py`). For a plain HTML/static site this means running a full image build (slow, and a heavier image than needed) just to serve files that need no compilation at all — noticed directly while testing F5.3 backups against `backup-test-app` (a single `index.html`).

**Competitor research (2026):** Coolify's dedicated "Static" buildpack packages files straight into a plain Nginx image with **no framework build step**, and for pure static content its docs recommend an even lighter path — a minimal `nginx-static` image with the project directory bind-mounted in, no build stage at all. CapRover follows the same idea: static sites are served by bundling files into a lightweight Nginx image rather than going through its normal app-build pipeline. Neither Coolify nor CapRover run WordPress through a custom per-deploy build either — WordPress ships as a one-click catalog template built on the official `wordpress` Docker Hub image, parameterized with DB credentials, not compiled per install. Across all three major self-hosted PaaS competitors (Coolify, CapRover, Dokploy), the pattern is consistent: **build once (or never) for content that doesn't need it; only run a real build step for projects that actually declare one** (e.g. a Vite `buildCmd`).

**Proposed plan for Vexlyx:**
1. **STATIC/REACT with no `buildCmd`:** skip Nixpacks entirely. Serve directly from a fixed, pre-pulled `nginx:alpine` image with the project's `PROJECTS_DIR/<id>` directory bind-mounted read-only as the web root. No image build step — deploy becomes "start a container," not "build then start."
2. **STATIC/REACT with a `buildCmd` (e.g. Vite):** run the build in an ephemeral Nixpacks/Node builder container that writes its output (e.g. `dist/`) back to disk, then discard the builder and serve the result the same fixed-`nginx:alpine` way as (1). The custom image is never the long-lived container.
3. **WORDPRESS:** replace the Nixpacks-built PHP-FPM image with the official `wordpress:php8.3-fpm-alpine` + `nginx:alpine` pair, wired to the database already provisioned by F2.6 via env vars — same idea as competitors' one-click WordPress templates. No per-install build step.
4. Keep the existing per-project container + Traefik router model (matches Vexlyx's multi-tenant isolation story) — this only replaces the "build a custom image" step with "start a fixed image" step for these two project types. A shared static-file container serving multiple projects via vhosts (lower footprint at scale, weaker isolation) is a further optimization competitors also use, but is out of scope here — flagged as a possible future iteration, not required for this feature.
5. Update `system/templates/docker-compose/static.yml` and `wordpress.yml` to reference the fixed images instead of `{{image_name}}`, and update `docker_manager.py`'s `cmd_deploy` to skip the Nixpacks build call for these two paths.

**Acceptance Criteria:**
- [ ] STATIC/REACT project with no `buildCmd` deploys without any Nixpacks build step (bind-mounted `nginx:alpine`)
- [ ] STATIC/REACT project with a `buildCmd` still runs the build, but the served container uses the fixed lightweight image, not the Nixpacks output image
- [ ] WORDPRESS deploys using the official `wordpress` + `nginx:alpine` images, wired to an F2.6-provisioned database, with no custom build step
- [ ] Deploy time for a plain static site drops from a full Nixpacks build to low single-digit seconds
- [ ] Resulting container image size for static sites drops to roughly the size of `nginx:alpine` plus site content, not a full Nixpacks-built image
- [ ] Existing SPA fallback (index.html routing) and env-var-at-build-time behavior from F2.3 still work
- [ ] Existing WordPress one-click installer, plugin/theme upload, and export/import from F2.4/F2.8 still work against the new image pair

**Test Plan:**
1. Deploy a plain HTML project → no Nixpacks build runs, container starts in seconds
2. Deploy a Vite React project with `buildCmd` set → build still runs once, served container is the lightweight image
3. Time a static deploy before/after → confirm meaningful reduction
4. `docker images` before/after → confirm static site images are near `nginx:alpine` size, not a full Nixpacks image
5. One-click WordPress install → still works end-to-end (site loads, admin accessible, DB connected)
6. Re-run F2.8's WordPress export/import test → still passes against the new image pair

**Developer Docs:**
- **Location:** `docs/dev/fast-static-wordpress-serving.md`

---

## Phase 6: Ecosystem & Launch

### F6.1 — Complete Documentation
**Status:** 🔴 NOT STARTED

**Description:**
VitePress documentation site covering installation, development, and API reference.

**Acceptance Criteria:**
- [ ] Installation guide (bare metal, Docker)
- [ ] Developer guide (local setup, contributing)
- [ ] API reference (auto-generated from OpenAPI)
- [ ] Feature documentation (all 48 features)
- [ ] Troubleshooting guide
- [ ] Changelog
- [ ] Hosted at `docs.vexlyx.com`

**Test Plan:**
1. New developer reads guide → sets up local env successfully
2. API reference → all endpoints documented
3. Search → finds relevant docs

**Developer Docs:**
- **Location:** `docs/README.md`

---

### F6.2 — CI/CD Pipeline
**Status:** 🔴 NOT STARTED

**Description:**
GitHub Actions for testing, building, and releasing Vexlyx.

**Acceptance Criteria:**
- [ ] Lint check on PR
- [ ] Type check on PR
- [ ] Unit tests on PR
- [ ] Build check on PR
- [ ] Auto-release on tag push
- [ ] Docker image build and push
- [ ] Changelog generation

**Test Plan:**
1. Open PR → all checks pass
2. Push tag → release created, Docker image built
3. Merge PR → auto-deploy to staging (optional)

**Developer Docs:**
- **Location:** `docs/dev/ci-cd.md`

---

### F6.3 — Community & Support
**Status:** 🔴 NOT STARTED

**Description:**
Set up community channels and support infrastructure.

**Acceptance Criteria:**
- [ ] Discord server with channels: general, support, dev, showcase
- [ ] GitHub Discussions enabled
- [ ] Issue templates (bug, feature, question)
- [ ] `CONTRIBUTING.md` guide
- [ ] `SECURITY.md` with disclosure process
- [ ] Demo video (2-3 minutes)

**Test Plan:**
1. New user joins Discord → gets welcome message
2. Open issue → template guides report
3. Contribution PR → follows guidelines

**Developer Docs:**
- **Location:** `docs/community.md`

---

## Feature Request Template

When adding a new feature to this document, use this template:

```markdown
### FX.X — Feature Name
**Status:** 🔴 NOT STARTED

**Description:**
[Clear description of what this feature does]

**Acceptance Criteria:**
- [ ] [Specific, testable requirement]
- [ ] [Specific, testable requirement]

**Test Plan:**
1. [Step-by-step test procedure]
2. [Expected result]

**Developer Docs:**
- **Location:** `docs/dev/feature-name.md`
- **Contents:** [What the docs should cover]

**Files to Create:**
- `path/to/file.ts`
```

---

*This file is maintained by the project owner and updated after each feature completion. Last update: 2026-08-28*
