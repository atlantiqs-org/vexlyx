# Shared Package (`@vexlyx/shared`)

> **Feature:** F0.7  
> **Status:** 🟢 Completed  
> **Package:** `packages/shared`

---

## What This Does

`@vexlyx/shared` is the single source of truth for Zod validation schemas and TypeScript types used by **both** `apps/api` (Fastify) and `apps/dashboard` (Next.js). It eliminates type drift — if the API changes a schema, the frontend immediately gets a TypeScript error if it sends the wrong shape.

---

## Architecture

```
packages/shared/
├── src/
│   ├── schemas/
│   │   └── auth.ts         # RegisterSchema, LoginSchema (+ inferred types)
│   ├── types/
│   │   └── index.ts        # User, Role, ApiError types
│   └── index.ts            # Package boundary — re-exports everything
├── dist/                   # Compiled output (consumed by apps via node_modules)
├── package.json
└── tsconfig.json
```

### How It's Consumed

Both apps declare the dependency in their `package.json`:

```json
"@vexlyx/shared": "workspace:*"
```

Then import directly:

```ts
// API (Fastify)
import { RegisterSchema, LoginSchema } from "@vexlyx/shared";

// Dashboard (Next.js)
import type { User } from "@vexlyx/shared";
```

### The `apps/api/src/modules/auth/schema.ts` Pattern

The API auth module's `schema.ts` is now a **thin re-export** layer:

```ts
export { RegisterSchema, LoginSchema } from "@vexlyx/shared";
export type { RegisterInput, LoginInput } from "@vexlyx/shared";
```

This means `routes.ts` and `service.ts` continue importing from `"./schema.js"` unchanged — the migration was transparent to the rest of the module.

---

## File Reference

### `src/schemas/auth.ts`

| Export | Type | Description |
|--------|------|-------------|
| `RegisterSchema` | `ZodObject` | Validates register form: email, name, password, confirmPassword |
| `RegisterInput` | `type` | Inferred from `RegisterSchema` |
| `LoginSchema` | `ZodObject` | Validates login form: email, password |
| `LoginInput` | `type` | Inferred from `LoginSchema` |

### `src/types/index.ts`

| Export | Type | Description |
|--------|------|-------------|
| `User` | `type` | Public user object returned by the API (no password field) |
| `Role` | `type` | `"ADMIN" \| "USER"` |
| `ApiError` | `type` | Standard error response shape `{ error, code, details }` |

---

## How to Test It

```bash
# 1. Build the shared package
cd packages/shared
pnpm build
# Expected: exits with code 0, dist/ updated

# 2. Typecheck all packages from root
pnpm typecheck
# Expected: zero errors in api, dashboard, and shared

# 3. Runtime check — auth still works end-to-end
# POST /api/auth/register with valid body → 201
# POST /api/auth/login with valid body → session cookie set
# GET /api/auth/me → returns { user } matching the User type
```

---

## How to Add a New Schema

When building a new feature (e.g., F1.1 — Projects):

1. **Create the schema file:**
   ```ts
   // packages/shared/src/schemas/project.ts
   import { z } from "zod";

   export const CreateProjectSchema = z.object({
     name: z.string().min(1).max(100),
     type: z.enum(["nodejs", "python", "static", "php"]),
     gitUrl: z.string().url().optional(),
   });

   export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
   ```

2. **Re-export from `src/index.ts`:**
   ```ts
   export { CreateProjectSchema } from "./schemas/project.js";
   export type { CreateProjectInput } from "./schemas/project.js";
   ```

3. **Add a thin re-export in the API module** (`apps/api/src/modules/projects/schema.ts`):
   ```ts
   export { CreateProjectSchema } from "@vexlyx/shared";
   export type { CreateProjectInput } from "@vexlyx/shared";
   ```

4. **Rebuild shared:**
   ```bash
   pnpm --filter @vexlyx/shared build
   ```

5. **Import in dashboard** where needed:
   ```ts
   import type { CreateProjectInput } from "@vexlyx/shared";
   ```

---

## Important Decisions

| Decision | Rationale |
|----------|-----------|
| Single `src/index.ts` entry point (re-exports) | This is the *package boundary*, not an internal barrel. The CLAUDE.md anti-pattern rule applies to in-app barrels, not package entry points. |
| `zod` declared as `peerDependency` + `devDependency` | Prevents relying on pnpm hoisting. Peer dep signals that consumers must have zod installed (they do — both apps have it). |
| Auth module `schema.ts` stays as thin re-export | `routes.ts` and `service.ts` import from `"./schema.js"` — keeping this indirection means zero changes to those files and a clean migration path. |
| Only auth schemas for now | Phase 1+ schemas (projects, domains, etc.) will be added as those features are built, keeping the shared package lean and the source of truth accurate. |
