# Infrastructure — Docker Compose Dev Environment

Vexlyx runs three Docker services for local development: **PostgreSQL** (database), **Redis** (sessions, caching, queues), and **Traefik** (reverse proxy with auto-SSL). All services have health checks and persistent volumes.

## Quick Start

```bash
# Start all infrastructure services
docker-compose up -d

# Verify everything is healthy
docker-compose ps

# Follow logs from all services
docker-compose logs -f

# Stop services (data persists)
docker-compose down

# Stop and destroy all data
docker-compose down -v
```

## Services

### PostgreSQL 16

| Property | Value |
|----------|-------|
| Image | `postgres:16-alpine` |
| Port | `5432` |
| User | `vexlyx` |
| Password | `vexlyx_dev` |
| Database | `vexlyx_dev` |
| Volume | `vexlyx_postgres_data` |

**Connection string:** `postgresql://vexlyx:vexlyx_dev@localhost:5432/vexlyx_dev`

### Redis 7

| Property | Value |
|----------|-------|
| Image | `redis:7-alpine` |
| Port | `6379` |
| Max memory | `256mb` |
| Eviction | `allkeys-lru` |
| Persistence | AOF (`appendonly yes`) |
| Volume | `vexlyx_redis_data` |

**Connection string:** `redis://localhost:6379`

**Usage in Vexlyx:**
- **Sessions** — Lucia Auth session storage (F0.6)
- **Caching** — API response caching, rate limiting
- **Queues** — BullMQ background job processing

**Test connectivity:**
```bash
docker exec vexlyx-redis redis-cli ping
# Returns: PONG
```

### Traefik v3

| Property | Value |
|----------|-------|
| Image | `traefik:v3.4` |
| HTTP Port | `80` |
| Dashboard | `http://localhost:8080` |
| Docker provider | Enabled (`exposedByDefault: false`) |

**Dashboard:** Open `http://localhost:8080` in your browser to view the Traefik dashboard. This shows all configured routers, services, and middlewares.

**Configuration files:**
- Static config: `docker/traefik/traefik.yml`
- Dynamic configs: `docker/traefik/dynamic/` (empty for now — Phase 1 adds routing)

## Redis Client (API)

The Redis client is registered as a Fastify plugin and available on every request via `app.redis`.

**File:** `apps/api/src/config/redis.ts`

```ts
// Access Redis from any route handler
app.get("/example", async (request, reply) => {
  await app.redis.set("key", "value");
  const value = await app.redis.get("key");
  return { value };
});
```

**Configuration:**
- Uses `ioredis` with `maxRetriesPerRequest: null` (required by BullMQ)
- Lazy connect — doesn't block startup if Redis is temporarily unavailable
- Graceful disconnect on server shutdown

## BullMQ Queues (API)

Background job queues are registered as a Fastify plugin and available via `app.queues`.

**File:** `apps/api/src/config/queue.ts`

### Current Queues

| Queue Name | Worker | Purpose |
|------------|--------|---------|
| `test-ping` | Yes | Infrastructure validation only |

### Adding a New Queue

1. Open `apps/api/src/config/queue.ts`
2. Inside `queuePlugin`, create a new queue and worker:

```ts
const deployQueue = createQueue("deploy");
queues.set("deploy", deployQueue);

const deployWorker = createWorker(
  "deploy",
  async (job) => {
    // Process deployment job
    app.log.info({ jobId: job.id, data: job.data }, "Processing deployment");
  },
  app,
);
workers.push(deployWorker);
```

3. Enqueue a job from any route:

```ts
app.post("/deploy", async (request, reply) => {
  const queue = app.queues.get("deploy");
  await queue?.add("start-deploy", { projectId: "abc123" });
  return { status: "queued" };
});
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |

## How to Extend

- **Add a Docker service:** Add to `docker-compose.yml`, include health check and persistent volume
- **Add a Traefik route:** Create a YAML file in `docker/traefik/dynamic/`
- **Add a BullMQ queue:** Follow the pattern in `queue.ts` — create queue + worker, add to maps
- **Use Redis for caching:** Use `app.redis.set/get` with TTL via `app.redis.setex(key, ttl, value)`
