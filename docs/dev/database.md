# Database — Prisma Schema & PostgreSQL

## What This Does

Vexlyx uses **Prisma ORM** with **PostgreSQL 16** for all database operations. The schema defines 8 core models (User, Project, Deployment, EnvVar, Domain, DnsRecord, Database, Mailbox) and 7 enums covering every entity in the hosting control panel. PostgreSQL runs locally via Docker Compose.

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Fastify Route  │────▶│  app.prisma.*    │────▶│   PostgreSQL 16  │
│  (route handler) │     │  (Prisma Client) │     │  (Docker)        │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

- **Prisma Client** is registered as a Fastify plugin (`app.prisma`)
- All routes access the database through `app.prisma`
- Connection is established on server start, disconnected on shutdown
- Queries are logged in development, only errors in production

## Schema Overview

### Models

| Model | Table | Purpose |
|-------|-------|---------|
| `User` | `users` | Panel users with role-based access |
| `Project` | `projects` | Hosted applications/websites |
| `Deployment` | `deployments` | Build + deploy lifecycle tracking |
| `EnvVar` | `env_vars` | Encrypted environment variables |
| `Domain` | `domains` | Custom domains with SSL status |
| `DnsRecord` | `dns_records` | DNS zone records (A, CNAME, MX, etc.) |
| `Database` | `databases` | User-provisioned MySQL/PostgreSQL instances |
| `Mailbox` | `mailboxes` | Email accounts per domain |

### Enums

| Enum | Values |
|------|--------|
| `Role` | ADMIN, USER |
| `ProjectType` | NODEJS, NEXTJS, PYTHON, REACT, STATIC, PHP, WORDPRESS, DOCKER |
| `ProjectStatus` | CREATING, ACTIVE, STOPPED, ERROR, DELETED |
| `DeploymentStatus` | QUEUED, BUILDING, DEPLOYING, RUNNING, FAILED, CANCELLED |
| `DomainStatus` | PENDING, ACTIVE, ERROR |
| `DatabaseType` | POSTGRESQL, MYSQL |
| `MailboxStatus` | ACTIVE, SUSPENDED, DELETED |

### Key Relations

- `User` → has many Projects, Domains, Databases, Mailboxes
- `Project` → belongs to User, has many Deployments, EnvVars, Domains, Databases
- `Domain` → belongs to User, optionally linked to Project, has many DnsRecords, Mailboxes
- All child records cascade-delete when their parent is deleted

### Unique Constraints

- `User.email` — globally unique
- `Project [userId, name]` — project names unique per user
- `EnvVar [projectId, key]` — env var keys unique per project
- `Domain.hostname` — globally unique
- `Database [userId, name]` — database names unique per user
- `Mailbox.address` — globally unique

## Common Commands

Run from `apps/api/`:

```bash
# Generate Prisma Client after schema changes
pnpm db:generate

# Create and apply a new migration
pnpm db:migrate

# Push schema to DB without creating a migration file (prototyping)
pnpm db:push

# Seed the database with development data
pnpm db:seed

# Open Prisma Studio (visual DB browser)
pnpm db:studio

# Reset DB: drop all data, re-apply migrations, re-seed
pnpm db:reset
```

## Migration Workflow

### Adding a New Model

1. Edit `prisma/schema.prisma` — add the new model with `@@map("table_name")`
2. Run `pnpm db:migrate` — Prisma creates a migration SQL file
3. Name the migration descriptively: `add_ssl_certificates_table`
4. Run `pnpm db:generate` — regenerate the client with new types
5. Use `app.prisma.newModel.findMany()` etc. in service layer

### Modifying an Existing Model

1. Edit the model in `schema.prisma`
2. Run `pnpm db:migrate`
3. If migration fails due to data constraints, edit the generated SQL or use `pnpm db:push` for prototyping

## Querying Patterns

```ts
// In a Fastify route handler:
app.get("/", async (request, reply) => {
  const projects = await app.prisma.project.findMany({
    where: { userId: request.user.id },
    include: { deployments: { take: 1, orderBy: { createdAt: "desc" } } },
  });
  return { projects };
});
```

Always use the service layer for complex queries — routes should only call service methods.

## How to Test

1. Start PostgreSQL: `docker-compose up -d postgres`
2. Apply migrations: `cd apps/api && pnpm db:migrate`
3. Seed data: `pnpm db:seed`
4. Open Prisma Studio: `pnpm db:studio`
5. Verify the `users` table contains the admin user

## How to Extend

- **New model:** Add to `schema.prisma`, migrate, generate client
- **New enum:** Add to `schema.prisma` enums section, migrate
- **New relation:** Add fields to both sides of the relation, migrate
- **Indexes:** Add `@@index([field])` for frequently queried columns

## Important Decisions

| Decision | Rationale |
|----------|-----------|
| `cuid()` IDs | URL-safe, sortable, no collision risk across distributed systems |
| Snake-case DB columns | PostgreSQL convention via `@map()`, while keeping camelCase in TypeScript |
| Cascade deletes | Simplifies cleanup — deleting a User removes all their Projects, Domains, etc. |
| Per-user unique project names | Users can have projects with the same name as other users |
| Separate Deployment model | Tracks every deploy attempt, not just current state |
| EnvVar encryption placeholder | Values stored as strings now; AES-256-GCM encryption added in F1.7 |
