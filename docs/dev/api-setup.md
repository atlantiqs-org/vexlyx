# API Setup — Developer Guide

> **Feature:** F0.3 — Fastify API Scaffold
> **Last Updated:** 2026-08-29

---

## Overview

The Vexlyx API is a Fastify 5 server with TypeScript, Zod validation, and a modular plugin architecture. It runs on `http://localhost:5000` during development and serves all backend logic for the dashboard.

## Architecture

```
apps/api/src/
├── index.ts                    # Entry point — builds & starts Fastify
├── config/
│   └── env.ts                  # Zod-validated environment variables
├── plugins/
│   └── error-handler.ts        # Global error handler plugin
└── modules/
    └── health/
        └── routes.ts           # GET /api/health
```

### Key Concepts

- **Entry point** (`index.ts`): Creates the Fastify instance, registers plugins & modules, then listens.
- **Config** (`config/`): Environment validation runs on import — fails fast if vars are missing.
- **Plugins** (`plugins/`): Fastify plugins that register hooks, decorators, or error handlers.
- **Modules** (`modules/`): Feature modules with `routes.ts`, `service.ts`, `schema.ts`.

---

## Route Registration Pattern

Every module exports an async function that receives a `FastifyInstance`:

```ts
// apps/api/src/modules/{feature}/routes.ts
import type { FastifyInstance } from "fastify";

export async function featureRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    return { data: "hello" };
  });

  app.post("/", async (request, reply) => {
    // request.body is typed via schema
    reply.status(201);
    return { created: true };
  });
}
```

Register it in `index.ts`:

```ts
await app.register(featureRoutes, { prefix: "/api/feature" });
```

---

## Error Handling

All errors follow a consistent JSON shape:

```json
{
  "error": "Human readable message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Error Codes

| Code | Status | When |
|------|--------|------|
| `NOT_FOUND` | 404 | Route doesn't exist |
| `VALIDATION_ERROR` | 400 | Zod or Fastify schema validation fails |
| `REQUEST_ERROR` | 4xx | Client errors (auth, permissions, etc.) |
| `INTERNAL_ERROR` | 500 | Unhandled server errors |

### Zod Validation Errors

When a Zod schema fails, `details.fields` contains per-field errors:

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "fields": {
      "email": ["Invalid email"],
      "password": ["String must contain at least 8 character(s)"]
    }
  }
}
```

---

## Environment Variables

Validated with Zod on startup. If any are invalid, the server refuses to start with a clear error.

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PORT` | number | `5000` | Server port |
| `HOST` | string | `0.0.0.0` | Bind address |
| `NODE_ENV` | enum | `development` | `development`, `production`, `test` |
| `CORS_ORIGIN` | string (URL) | `http://localhost:3000` | Allowed CORS origin |

### Adding a New Env Var

1. Add to the Zod schema in `apps/api/src/config/env.ts`
2. Add to `apps/api/.env.example` with a safe default
3. Document in this file

---

## Adding a New Module

1. Create the module directory:
   ```
   apps/api/src/modules/{name}/
   ├── routes.ts    # Route handlers
   ├── service.ts   # Business logic
   └── schema.ts    # Zod validation schemas
   ```

2. Write your routes following the pattern above.

3. Register in `index.ts`:
   ```ts
   import { nameRoutes } from "./modules/{name}/routes.js";
   // Inside buildApp():
   await app.register(nameRoutes, { prefix: "/api/{name}" });
   ```

4. If you add shared schemas, put them in `packages/shared/src/schemas/{name}.ts`.

---

## Logging

Uses Pino (built into Fastify). In development, logs are pretty-printed via `pino-pretty`.

```ts
// Use the app logger
app.log.info("Server started");
app.log.error(error, "Something failed");
app.log.debug({ userId }, "Processing request");

// Inside route handlers
request.log.info("Handling request");
```

**Never use `console.log`** — use `app.log` or `request.log` instead.

---

## Running the API

```bash
# Development (with hot reload via tsx watch)
cd apps/api
pnpm dev

# Or from root (starts all apps)
pnpm dev

# Type check
pnpm typecheck

# Build
pnpm build
```

---

## Testing Endpoints

```bash
# Health check
curl http://localhost:5000/api/health

# 404 test
curl http://localhost:5000/nonexistent
```
