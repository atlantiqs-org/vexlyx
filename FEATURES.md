# FEATURES.md

> **Project:** Vexlyx
> **Type:** Open-Source Hybrid Hosting Control Panel
> **Last Updated:** 2026-08-28

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
| Phase 0: Foundation | 🟡 IN PROGRESS | 57% (4/7) |
| Phase 1: Project Deployment | 🔴 NOT STARTED | 0% |
| Phase 2: Multi-Runtime Support | 🔴 NOT STARTED | 0% |
| Phase 3: Domain & DNS | 🔴 NOT STARTED | 0% |
| Phase 4: Email Server | 🔴 NOT STARTED | 0% |
| Phase 5: System & Admin | 🔴 NOT STARTED | 0% |
| Phase 6: Ecosystem & Launch | 🔴 NOT STARTED | 0% |

**Overall Completion:** 8% (4/48 features)

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
**Status:** 🔴 NOT STARTED

**Description:**
Set up the complete Docker Compose development environment with PostgreSQL, Redis, and Traefik. Configure Redis for sessions, caching, and BullMQ queues.

**Acceptance Criteria:**
- [ ] Docker Compose includes PostgreSQL 16, Redis 7, and Traefik v3 services
- [ ] Redis client configured in API with connection pooling
- [ ] Redis used for session storage
- [ ] BullMQ configured for background job processing
- [ ] Traefik dashboard accessible on `localhost:8080`
- [ ] Persistent volumes for PostgreSQL and Redis data
- [ ] Health checks for all services

**Test Plan:**
1. `docker-compose up -d` starts all services
2. `redis-cli ping` returns `PONG`
3. BullMQ queue can add and process a test job
4. Traefik dashboard shows services on `http://localhost:8080`
5. Data persists after `docker-compose down && docker-compose up`

**Developer Docs:**
- **Location:** `docs/dev/infrastructure.md`
- **Contents:** Docker services overview, Redis usage patterns, BullMQ queue setup, Traefik routing basics

**Files to Create:**
- `docker-compose.yml`
- `apps/api/src/config/redis.ts`
- `apps/api/src/config/queue.ts`
- `docker/traefik/traefik.yml`
- `docker/traefik/dynamic/`

---

### F0.6 — Authentication System
**Status:** 🔴 NOT STARTED

**Description:**
Implement complete authentication with Lucia Auth. Support email/password registration and login. Use Argon2id for password hashing. Session-based auth with HTTP-only cookies.

**Acceptance Criteria:**
- [ ] `POST /api/auth/register` — creates user, hashes password with Argon2id
- [ ] `POST /api/auth/login` — validates credentials, creates session
- [ ] `POST /api/auth/logout` — destroys session
- [ ] `GET /api/auth/me` — returns current user
- [ ] Session stored in Redis with TTL
- [ ] CSRF protection enabled
- [ ] Rate limiting: 5 login attempts per 15 minutes per IP
- [ ] Frontend login/register forms with validation
- [ ] Protected routes redirect to login
- [ ] Auth context/provider in React

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
- **Contents:** Lucia setup, session flow, password hashing, protected routes, frontend auth hooks

**Files to Create:**
- `apps/api/src/modules/auth/routes.ts`
- `apps/api/src/modules/auth/service.ts`
- `apps/api/src/modules/auth/schema.ts`
- `apps/api/src/plugins/auth.ts`
- `apps/dashboard/app/login/page.tsx`
- `apps/dashboard/app/register/page.tsx`
- `apps/dashboard/components/auth/LoginForm.tsx`
- `apps/dashboard/components/auth/RegisterForm.tsx`
- `apps/dashboard/lib/auth.ts`
- `apps/dashboard/stores/auth.ts`

---

### F0.7 — Shared Package (Types & Schemas)
**Status:** 🔴 NOT STARTED

**Description:**
Create the shared package containing Zod schemas and TypeScript types used by both frontend and backend. This ensures type safety across the monorepo.

**Acceptance Criteria:**
- [ ] Zod schemas for all API inputs (auth, projects, domains, etc.)
- [ ] TypeScript types inferred from Zod schemas
- [ ] Package builds and exports correctly
- [ ] Both dashboard and api import from `@vexlyx/shared`
- [ ] No circular dependencies

**Test Plan:**
1. `pnpm build` in `packages/shared` succeeds
2. Import `LoginSchema` from `@vexlyx/shared` in both apps
3. TypeScript compiles without errors in both apps
4. Zod schema validates correct and incorrect data properly

**Developer Docs:**
- **Location:** `docs/dev/shared-package.md`
- **Contents:** Adding new schemas, type inference, validation patterns

**Files to Create:**
- `packages/shared/package.json`
- `packages/shared/src/schemas/auth.ts`
- `packages/shared/src/schemas/project.ts`
- `packages/shared/src/types/index.ts`
- `packages/shared/tsconfig.json`

---

## Phase 1: Project Deployment

### F1.1 — Project CRUD API
**Status:** 🔴 NOT STARTED

**Description:**
Build the complete project management API. Users can create, read, update, and delete hosting projects. Each project has a name, type, git URL, and status.

**Acceptance Criteria:**
- [ ] `GET /api/projects` — list user's projects with pagination
- [ ] `POST /api/projects` — create new project
- [ ] `GET /api/projects/:id` — get single project details
- [ ] `PUT /api/projects/:id` — update project settings
- [ ] `DELETE /api/projects/:id` — delete project and cleanup resources
- [ ] Projects are scoped to the authenticated user
- [ ] Validation via Zod schemas from shared package
- [ ] Soft delete (mark as deleted, cleanup async)

**Test Plan:**
1. Create project → returns 201 with project data
2. List projects → returns only current user's projects
3. Get project by ID → returns correct project
4. Update project name → returns updated project
5. Delete project → returns 204, project marked deleted
6. Access other user's project → returns 403

**Developer Docs:**
- **Location:** `docs/dev/projects-api.md`

**Files to Create:**
- `apps/api/src/modules/projects/routes.ts`
- `apps/api/src/modules/projects/service.ts`
- `apps/api/src/modules/projects/schema.ts`

---

### F1.2 — Project Dashboard UI
**Status:** 🔴 NOT STARTED

**Description:**
Build the project management interface in the dashboard. List view with cards/table, create project modal, and project detail page.

**Acceptance Criteria:**
- [ ] `/projects` page lists all user projects in a card grid
- [ ] "New Project" button opens creation modal
- [ ] Modal has form: name, type (select), git URL (optional)
- [ ] Project cards show status badge, type icon, last deployed
- [ ] Clicking card navigates to `/projects/[id]`
- [ ] Empty state for new users
- [ ] Real-time status updates via polling or Socket.io

**Test Plan:**
1. Create project via modal → appears in list immediately
2. Navigate to project detail → shows correct project info
3. Delete project from detail page → returns to list, project removed
4. Empty state shown when no projects exist

**Developer Docs:**
- **Location:** `docs/dev/projects-ui.md`

**Files to Create:**
- `apps/dashboard/app/projects/page.tsx`
- `apps/dashboard/app/projects/[id]/page.tsx`
- `apps/dashboard/components/projects/ProjectCard.tsx`
- `apps/dashboard/components/projects/ProjectList.tsx`
- `apps/dashboard/components/projects/CreateProjectModal.tsx`

---

### F1.3 — Git Repository Integration
**Status:** 🔴 NOT STARTED

**Description:**
Allow users to connect GitHub/GitLab repositories to projects. Clone repos, detect branch, and store connection metadata.

**Acceptance Criteria:**
- [ ] Git URL validation (supports GitHub, GitLab, Bitbucket)
- [ ] `git clone` executed in project workspace
- [ ] Branch selection (default: main/master)
- [ ] Webhook URL generation for auto-deploy
- [ ] SSH key generation for private repos
- [ ] Store repo metadata in database

**Test Plan:**
1. Add GitHub URL to project → repo clones successfully
2. Private repo → uses SSH key, clone succeeds
3. Invalid URL → returns validation error
4. Webhook URL accessible and triggers deployment

**Developer Docs:**
- **Location:** `docs/dev/git-integration.md`

**Files to Create:**
- `apps/api/src/modules/git/service.ts`
- `apps/api/src/modules/git/routes.ts`
- `apps/dashboard/components/projects/GitSettings.tsx`

---

### F1.4 — Nixpacks Build Integration
**Status:** 🔴 NOT STARTED

**Description:**
Integrate Nixpacks for zero-configuration builds. Auto-detect framework from source code and generate Docker images.

**Acceptance Criteria:**
- [ ] Nixpacks CLI installed on server
- [ ] `nixpacks plan` execution to detect framework
- [ ] `nixpacks build` generates Docker image
- [ ] Build logs streamed to frontend via Socket.io
- [ ] Build cache optimization
- [ ] Support for custom build commands override

**Test Plan:**
1. Node.js project → Nixpacks detects, builds successfully
2. Python project → Nixpacks detects, builds successfully
3. Next.js project → SSR build works
4. Build logs appear in real-time in dashboard
5. Failed build → shows error logs, status = failed

**Developer Docs:**
- **Location:** `docs/dev/build-system.md`

**Files to Create:**
- `apps/api/src/modules/build/service.ts`
- `apps/api/src/modules/build/routes.ts`
- `system/python/build_manager.py`

---

### F1.5 — Docker Deployment Engine
**Status:** 🔴 NOT STARTED

**Description:**
Generate and manage Docker Compose files per project. Deploy containers, manage networks, and integrate with Traefik for routing.

**Acceptance Criteria:**
- [ ] Docker Compose template generation per project type
- [ ] Container lifecycle management (start, stop, restart, remove)
- [ ] Traefik labels auto-generated for routing
- [ ] Environment variables injected into containers
- [ ] Health checks configured
- [ ] Container logs accessible via API
- [ ] Resource limits (CPU, memory) per container

**Test Plan:**
1. Deploy Node.js app → container starts, accessible via domain
2. Deploy static site → Nginx serves files correctly
3. Stop container → app unreachable, status = stopped
4. Restart container → app back online
5. Environment variables → accessible inside container
6. Traefik routes → correct domain points to correct container

**Developer Docs:**
- **Location:** `docs/dev/deployment-engine.md`

**Files to Create:**
- `apps/api/src/modules/deploy/service.ts`
- `apps/api/src/modules/deploy/routes.ts`
- `system/python/docker_manager.py`
- `system/templates/docker-compose/node.yml`
- `system/templates/docker-compose/static.yml`
- `system/templates/docker-compose/python.yml`

---

### F1.6 — Real-Time Logs
**Status:** 🔴 NOT STARTED

**Description:**
Stream build and runtime logs from Docker containers to the frontend dashboard in real-time using Socket.io.

**Acceptance Criteria:**
- [ ] Socket.io server integrated with Fastify
- [ ] Build logs streamed during `nixpacks build`
- [ ] Runtime logs streamed from running containers
- [ ] Log history persisted (last 1000 lines)
- [ ] Frontend terminal-like viewer (xterm.js)
- [ ] Filter logs by stream (stdout/stderr)
- [ ] Auto-scroll with pause option

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
**Status:** 🔴 NOT STARTED

**Description:**
Allow users to set environment variables per project. Variables are encrypted at rest and injected into containers at runtime.

**Acceptance Criteria:**
- [ ] `POST /api/projects/:id/env` — add/update env vars
- [ ] `GET /api/projects/:id/env` — list env vars (values masked)
- [ ] `DELETE /api/projects/:id/env/:key` — remove env var
- [ ] Values encrypted with AES-256-GCM
- [ ] Injected into Docker containers on deployment
- [ ] Frontend UI with key-value editor
- [ ] Support for `.env` file import

**Test Plan:**
1. Add env var → stored encrypted in database
2. List env vars → keys visible, values masked as `••••`
3. Deploy app → env vars accessible inside container
4. Update env var → new value used on next deployment
5. Import .env file → all vars parsed and stored

**Developer Docs:**
- **Location:** `docs/dev/environment-variables.md`

**Files to Create:**
- `apps/api/src/modules/env/routes.ts`
- `apps/api/src/modules/env/service.ts`
- `apps/dashboard/components/projects/EnvVarEditor.tsx`

---

## Phase 2: Multi-Runtime Support

### F2.1 — Next.js Deployment
**Status:** 🔴 NOT STARTED

**Description:**
Support deploying Next.js applications with SSR, API routes, and static generation.

**Acceptance Criteria:**
- [ ] Auto-detection via `next.config.*` or `package.json` dependency
- [ ] Build command: `npm run build`
- [ ] Start command: `npm run start`
- [ ] SSR works (not just static export)
- [ ] API routes functional
- [ ] Image optimization via Next.js Image component
- [ ] Build output cached for faster redeploys

**Test Plan:**
1. Deploy Next.js app with SSR → pages render server-side
2. API route `/api/hello` → returns JSON response
3. Image component → images optimized and served
4. Re-deploy → build cache used, faster build time

**Developer Docs:**
- **Location:** `docs/dev/runtimes/nextjs.md`

---

### F2.2 — Python (Django/Flask/FastAPI) Deployment
**Status:** 🔴 NOT STARTED

**Description:**
Support deploying Python web applications. Auto-detect framework and configure appropriate WSGI/ASGI server.

**Acceptance Criteria:**
- [ ] Auto-detection via `requirements.txt` or `pyproject.toml`
- [ ] Django: `gunicorn` + `manage.py collectstatic`
- [ ] Flask: `gunicorn` with auto-detected entry point
- [ ] FastAPI: `uvicorn` with auto-detected app instance
- [ ] Static files served via Nginx sidecar
- [ ] Python version selection (3.10, 3.11, 3.12)

**Test Plan:**
1. Deploy Django app → admin panel accessible
2. Deploy Flask app → routes work correctly
3. Deploy FastAPI app → auto-docs at `/docs`
4. Static files → CSS/JS served correctly

**Developer Docs:**
- **Location:** `docs/dev/runtimes/python.md`

---

### F2.3 — React (Vite) Static Deployment
**Status:** 🔴 NOT STARTED

**Description:**
Support deploying React applications built with Vite as static sites.

**Acceptance Criteria:**
- [ ] Auto-detection via `vite.config.*`
- [ ] Build command: `npm run build`
- [ ] Output served from `dist/` folder via Nginx
- [ ] SPA routing support (fallback to index.html)
- [ ] Environment variable injection at build time

**Test Plan:**
1. Deploy Vite React app → loads correctly
2. Client-side routing → `/about` works on refresh
3. Build-time env vars → replaced in built files

**Developer Docs:**
- **Location:** `docs/dev/runtimes/react-vite.md`

---

### F2.4 — PHP & WordPress Deployment
**Status:** 🔴 NOT STARTED

**Description:**
Support deploying PHP applications and one-click WordPress installation.

**Acceptance Criteria:**
- [ ] PHP-FPM + Nginx container setup
- [ ] Multiple PHP versions (8.1, 8.2, 8.3)
- [ ] WordPress one-click installer
- [ ] Auto-download WordPress core
- [ ] wp-config.php auto-generation with DB credentials
- [ ] Plugin/theme upload via file manager
- [ ] Permalink support

**Test Plan:**
1. Deploy PHP app → executes correctly
2. One-click WordPress → site loads, admin accessible
3. Upload plugin → appears in WordPress admin
4. Permalinks → pretty URLs work

**Developer Docs:**
- **Location:** `docs/dev/runtimes/php-wordpress.md`

---

### F2.5 — Custom Dockerfile Deployment
**Status:** 🔴 NOT STARTED

**Description:**
Allow users to provide their own Dockerfile for maximum flexibility.

**Acceptance Criteria:**
- [ ] Dockerfile upload or inline editor
- [ ] `docker build` from provided Dockerfile
- [ ] `.dockerignore` support
- [ ] Build context from project files
- [ ] Health check configuration
- [ ] Exposed port auto-detection or manual specification

**Test Plan:**
1. Upload custom Dockerfile → builds successfully
2. Invalid Dockerfile → build fails with clear error
3. `.dockerignore` → excluded files not in build context

**Developer Docs:**
- **Location:** `docs/dev/runtimes/custom-dockerfile.md`

---

### F2.6 — Database Provisioning (MySQL/PostgreSQL)
**Status:** 🔴 NOT STARTED

**Description:**
Allow users to create databases per project. Manage database users, passwords, and connections.

**Acceptance Criteria:**
- [ ] `POST /api/databases` — create database + user
- [ ] `GET /api/databases` — list user's databases
- [ ] `DELETE /api/databases/:id` — drop database and user
- [ ] Auto-generated strong passwords
- [ ] Connection string provided to user
- [ ] Database accessible only from project containers
- [ ] phpMyAdmin/Adminer integration for MySQL

**Test Plan:**
1. Create MySQL DB → database and user created
2. Connect from app → connection successful
3. Delete DB → database dropped, user removed
4. phpMyAdmin → accessible via panel, shows correct DBs

**Developer Docs:**
- **Location:** `docs/dev/database-provisioning.md`

---

### F2.7 — GitHub Webhook Auto-Deploy
**Status:** 🔴 NOT STARTED

**Description:**
Automatically redeploy projects when code is pushed to connected GitHub repositories.

**Acceptance Criteria:**
- [ ] Webhook endpoint `POST /api/webhooks/github`
- [ ] Signature verification with GitHub secret
- [ ] Filter by branch (only deploy configured branch)
- [ ] Queue deployment via BullMQ
- [ ] Deployment status shown in dashboard
- [ ] Support for pull request previews (optional)

**Test Plan:**
1. Push to main branch → webhook received, deployment queued
2. Push to other branch → ignored (if not configured)
3. Invalid signature → webhook rejected with 401
4. Deployment → new code live within 2 minutes

**Developer Docs:**
- **Location:** `docs/dev/github-webhooks.md`

---

## Phase 3: Domain & DNS

### F3.1 — Custom Domain Management
**Status:** 🔴 NOT STARTED

**Description:**
Allow users to attach custom domains to projects. Validate domain ownership and configure routing.

**Acceptance Criteria:**
- [ ] `POST /api/domains` — add domain to project
- [ ] Domain validation via DNS TXT record
- [ ] `GET /api/domains` — list domains
- [ ] `DELETE /api/domains/:id` — remove domain
- [ ] Traefik router auto-configuration
- [ ] Domain status tracking (pending, active, error)

**Test Plan:**
1. Add domain → validation instructions shown
2. Add TXT record → validation passes, status = active
3. Visit domain → loads correct project
4. Remove domain → routing removed, DNS cleaned up

**Developer Docs:**
- **Location:** `docs/dev/domains.md`

---

### F3.2 — Subdomain Support
**Status:** 🔴 NOT STARTED

**Description:**
Support subdomains pointing to different projects or paths within the same server.

**Acceptance Criteria:**
- [ ] `api.domain.com` → API project
- [ ] `blog.domain.com` → blog project
- [ ] `app.domain.com` → main app
- [ ] Wildcard subdomain support (`*.domain.com`)
- [ ] Subdomain management UI

**Test Plan:**
1. Add subdomain → routes to correct project
2. Wildcard subdomain → any subdomain works
3. Remove subdomain → routing removed

**Developer Docs:**
- **Location:** `docs/dev/subdomains.md`

---

### F3.3 — DNS Record Management
**Status:** 🔴 NOT STARTED

**Description:**
Full DNS zone management for domains hosted on Vexlyx nameservers.

**Acceptance Criteria:**
- [ ] Support for A, AAAA, CNAME, MX, TXT, NS, SRV records
- [ ] DNS zone file generation
- [ ] BIND9 or CoreDNS integration
- [ ] Record validation (IP format, hostname, etc.)
- [ ] TTL configuration per record
- [ ] DNS propagation status
- [ ] Import/export zone files

**Test Plan:**
1. Add A record → resolves correctly
2. Add MX record → email routing works
3. Add TXT record → SPF/DKIM validation passes
4. Export zone file → contains all records
5. Import zone file → records created correctly

**Developer Docs:**
- **Location:** `docs/dev/dns-management.md`

---

### F3.4 — SSL Certificate Management
**Status:** 🔴 NOT STARTED

**Description:**
Automatic SSL certificate provisioning via Let's Encrypt through Traefik.

**Acceptance Criteria:**
- [ ] Auto SSL for all domains via Traefik certresolver
- [ ] Wildcard SSL support
- [ ] Certificate expiry monitoring
- [ ] Auto-renewal before expiry
- [ ] Manual certificate upload (for custom certs)
- [ ] SSL status shown per domain

**Test Plan:**
1. Add domain → SSL certificate auto-generated within 60 seconds
2. Visit `https://domain.com` → valid certificate
3. Wildcard domain → `*.domain.com` covered
4. Expiry alert → notification 7 days before expiry

**Developer Docs:**
- **Location:** `docs/dev/ssl-management.md`

---

## Phase 4: Email Server

### F4.1 — Postfix SMTP Server
**Status:** 🔴 NOT STARTED

**Description:**
Install and configure Postfix for outgoing email (SMTP).

**Acceptance Criteria:**
- [ ] Postfix installed and running on host
- [ ] Port 25 and 587 open
- [ ] Virtual domain configuration
- [ ] Relay restrictions (no open relay)
- [ ] TLS encryption enforced
- [ ] DKIM signing via OpenDKIM

**Test Plan:**
1. Send email via SMTP → delivered successfully
2. TLS required → plaintext connection rejected
3. Open relay test → relay denied for unauthorized IPs

**Developer Docs:**
- **Location:** `docs/dev/email/postfix.md`

---

### F4.2 — Dovecot IMAP Server
**Status:** 🔴 NOT STARTED

**Description:**
Install and configure Dovecot for incoming email (IMAP).

**Acceptance Criteria:**
- [ ] Dovecot installed and running on host
- [ ] Port 143 and 993 open
- [ ] Virtual mailbox configuration
- [ ] Maildir format storage
- [ ] Quota management
- [ ] SSL/TLS on port 993

**Test Plan:**
1. Connect via IMAPS → login successful
2. Retrieve emails → inbox loads correctly
3. Quota exceeded → rejection with clear message

**Developer Docs:**
- **Location:** `docs/dev/email/dovecot.md`

---

### F4.3 — Mailbox Management UI
**Status:** 🔴 NOT STARTED

**Description:**
Dashboard interface for creating and managing email mailboxes.

**Acceptance Criteria:**
- [ ] `POST /api/mailboxes` — create mailbox
- [ ] `GET /api/mailboxes` — list mailboxes
- [ ] `DELETE /api/mailboxes/:id` — delete mailbox
- [ ] Quota configuration per mailbox
- [ ] Password reset functionality
- [ ] Mailbox usage statistics

**Test Plan:**
1. Create mailbox → can login via IMAP
2. Send email to mailbox → appears in inbox
3. Delete mailbox → emails inaccessible
4. Quota set → enforced by Dovecot

**Developer Docs:**
- **Location:** `docs/dev/email/mailbox-management.md`

---

### F4.4 — Webmail (Roundcube)
**Status:** 🔴 NOT STARTED

**Description:**
Deploy Roundcube as a Docker container for web-based email access.

**Acceptance Criteria:**
- [ ] Roundcube Docker container running
- [ ] Proxied via Traefik at `webmail.domain.com`
- [ ] Auto-configured with Dovecot/Postfix settings
- [ ] Multiple mailbox support
- [ ] Compose, reply, forward functionality
- [ ] Address book
- [ ] Attachment support

**Test Plan:**
1. Access webmail → login page loads
2. Login → inbox displays emails
3. Compose email → sends successfully
4. Attachment upload/download → works correctly

**Developer Docs:**
- **Location:** `docs/dev/email/webmail.md`

---

### F4.5 — SPF, DKIM, DMARC Auto-Configuration
**Status:** 🔴 NOT STARTED

**Description:**
Automatically generate and manage email authentication DNS records.

**Acceptance Criteria:**
- [ ] SPF record auto-generated per domain
- [ ] DKIM key pair generation
- [ ] DKIM public key in DNS TXT record
- [ ] DMARC policy record generation
- [ ] Email deliverability score monitoring
- [ ] DNS records updated when mail domain added

**Test Plan:**
1. Add mail domain → SPF, DKIM, DMARC records created
2. Send email → passes SPF/DKIM/DMARC checks
3. Mail-Tester score → 9/10 or higher

**Developer Docs:**
- **Location:** `docs/dev/email/authentication.md`

---

### F4.6 — Email Forwarding & Aliases
**Status:** 🔴 NOT STARTED

**Description:**
Support email forwarding and alias creation.

**Acceptance Criteria:**
- [ ] Create alias `sales@domain.com` → forwards to `user@domain.com`
- [ ] Multiple destination addresses per alias
- [ ] Catch-all alias support
- [ ] Alias management UI
- [ ] Vacation auto-responder

**Test Plan:**
1. Create alias → email forwarded correctly
2. Catch-all → unmatched emails forwarded to admin
3. Vacation responder → auto-reply sent

**Developer Docs:**
- **Location:** `docs/dev/email/aliases.md`

---

## Phase 5: System & Administration

### F5.1 — One-Line Server Installer
**Status:** 🔴 NOT STARTED

**Description:**
Create an automated installation script that sets up Vexlyx on a fresh Ubuntu 24.04 server.

**Acceptance Criteria:**
- [ ] `curl -fsSL https://get.vexlyx.dev | bash` installs everything
- [ ] Installs Docker, Docker Compose, Node.js, Python
- [ ] Configures PostgreSQL, Redis, Traefik
- [ ] Sets up Postfix, Dovecot, BIND9
- [ ] Creates admin user
- [ ] Generates SSL certificate for panel domain
- [ ] Configures firewall (UFW)
- [ ] Idempotent (can run multiple times safely)

**Test Plan:**
1. Fresh Ubuntu 24.04 VM → script completes without errors
2. Visit `https://panel.domain.com` → login page loads
3. All services running → `systemctl status` shows active
4. Re-run script → no errors, no duplicate config

**Developer Docs:**
- **Location:** `docs/dev/installer.md`

---

### F5.2 — Resource Monitoring
**Status:** 🔴 NOT STARTED

**Description:**
Monitor server and container resource usage (CPU, RAM, Disk, Network).

**Acceptance Criteria:**
- [ ] Server-level metrics (CPU, RAM, Disk, Uptime)
- [ ] Per-container metrics
- [ ] Real-time graphs in dashboard
- [ ] Historical data (24h, 7d, 30d)
- [ ] Alert thresholds (CPU > 80%, Disk > 90%)
- [ ] Integration with Netdata or custom collector

**Test Plan:**
1. Dashboard shows current CPU/RAM usage
2. Container metrics → accurate per-project usage
3. High CPU alert → notification sent
4. Historical graph → shows 7-day trend

**Developer Docs:**
- **Location:** `docs/dev/monitoring.md`

---

### F5.3 — Backup System
**Status:** 🔴 NOT STARTED

**Description:**
Automated and on-demand backups for projects, databases, and email.

**Acceptance Criteria:**
- [ ] Daily automated backups at configurable time
- [ ] On-demand backup trigger
- [ ] Backup includes: files, databases, mailboxes, DNS zones
- [ ] Backup compression (tar.gz)
- [ ] Retention policy (keep last 7 daily, 4 weekly)
- [ ] Remote backup to S3/MinIO (optional)
- [ ] One-click restore from backup

**Test Plan:**
1. Trigger backup → archive created successfully
2. Scheduled backup → runs automatically at set time
3. Restore backup → project fully restored
4. Retention → old backups auto-deleted

**Developer Docs:**
- **Location:** `docs/dev/backups.md`

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
- [ ] Hosted at `docs.vexlyx.dev`

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
