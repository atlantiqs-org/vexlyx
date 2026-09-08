# Resource Monitoring (F5.2)

> **Status:** 🟢 COMPLETED  
> **Feature:** Server and container resource monitoring with real-time Socket.io push, historical persistence, and threshold alerts.

---

## What It Does

F5.2 adds a `/monitoring` page to the Vexlyx dashboard that shows:

- **Live server gauges** — CPU %, RAM %, Disk % updated every 5 seconds via Socket.io
- **System stats** — Uptime, load average (1/5/15m), cumulative network RX/TX
- **Historical trend chart** — Area chart of CPU/RAM/Disk over 1h, 24h, 7d, or 30d
- **Container resource table** — Per-container CPU, RAM usage, and network I/O
- **Threshold alerts** — Animated badge + sonner toast when CPU >80%, RAM >85%, or Disk >90%

---

## Architecture

```
Browser                         API Server                    Host OS
──────                         ──────────                    ───────
useServerMetrics()  ──WS──▶   subscribe:metrics    ─────▶  system_monitor.py
                    ◀──WS──   metrics:server push           (psutil / /proc)
                    ◀──WS──   alert:threshold

useMetricHistory()  ──REST──▶  GET /api/monitoring/history
                    ◀──JSON──  MetricSnapshot[] (PostgreSQL)

                               BullMQ Worker (every 60s)
                               → system_monitor.py
                               → save MetricSnapshot
                               → push to metrics room
```

### Key Files

| File | Purpose |
|------|---------|
| `system/python/system_monitor.py` | Python collector — psutil for server, `docker stats` for containers |
| `apps/api/src/modules/monitoring/service.ts` | Spawns Python script, queries DB history, saves snapshots |
| `apps/api/src/modules/monitoring/socket.ts` | Socket.io handlers + BullMQ job runner |
| `apps/api/src/modules/monitoring/routes.ts` | REST endpoints + BullMQ repeatable job registration |
| `apps/api/prisma/schema.prisma` | `MetricSnapshot` model |
| `apps/dashboard/src/hooks/useMonitoring.ts` | React hooks (Socket.io + REST fallback + alerts) |
| `apps/dashboard/src/components/monitoring/` | All UI components |
| `apps/dashboard/src/app/(panel)/monitoring/page.tsx` | Next.js route |

---

## Python Collector (`system_monitor.py`)

**Protocol:** Same as `docker_manager.py` — JSON payload on stdin, JSON response on stdout.

```bash
# Test server metrics manually:
echo '{"command":"server_metrics"}' | python3 system/python/system_monitor.py

# Test container metrics:
echo '{"command":"container_metrics"}' | python3 system/python/system_monitor.py
```

**psutil is preferred** but the script falls back to `/proc/stat`, `/proc/meminfo`, `os.statvfs()`, and `/proc/net/dev` if psutil is unavailable. Install with:

```bash
pip install psutil
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/monitoring/server` | ✅ | Live server metrics snapshot |
| `GET` | `/api/monitoring/containers` | ✅ | Live per-container metrics |
| `GET` | `/api/monitoring/history?range=24h` | ✅ | Historical snapshots (`1h` / `24h` / `7d` / `30d`) |

---

## Socket.io Events

| Direction | Event | Payload |
|-----------|-------|---------|
| Client → Server | `subscribe:metrics` | — |
| Server → Client | `metrics:server` | `ServerMetrics` |
| Server → Client | `metrics:containers` | `ContainerMetric[]` |
| Server → Client | `alert:threshold` | `AlertThreshold` |
| Client → Server | `unsubscribe:metrics` | — |

---

## Database

A new `metric_snapshots` table is created by migration:

```sql
CREATE TABLE metric_snapshots (
  id           TEXT PRIMARY KEY,
  cpu_percent  DOUBLE PRECISION NOT NULL,
  ram_used     BIGINT NOT NULL,
  ram_total    BIGINT NOT NULL,
  disk_used    BIGINT NOT NULL,
  disk_total   BIGINT NOT NULL,
  recorded_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX ON metric_snapshots (recorded_at);
```

Snapshots are written every **60 seconds** by the BullMQ `metrics-collector` worker.  
Snapshots older than **30 days** are pruned automatically in each collection cycle.

---

## Background Collector (BullMQ)

The repeatable job is registered in `monitoringRoutes()` on startup:

```ts
await metricsQueue.upsertJobScheduler(
  "collect-metrics",
  { every: 60_000 },        // run every 60 seconds
  { name: "collect-metrics", data: {} },
);
```

`upsertJobScheduler` is idempotent — safe to call on every restart without creating duplicates.

---

## Alert Thresholds

Default thresholds (hardcoded in `socket.ts`):

| Resource | Default Threshold |
|----------|------------------|
| CPU | > 80% |
| RAM | > 85% |
| Disk | > 90% |

To change defaults, edit `DEFAULT_THRESHOLDS` in `apps/api/src/modules/monitoring/socket.ts`.

---

## How to Test

1. Start the dev stack: `pnpm dev`
2. Visit `http://localhost:3000/monitoring`
3. Verify live gauges update every 5 seconds (watch CPU/RAM fluctuate)
4. Check the container table populates if Docker containers are running
5. Wait ~60 seconds → check the 1h chart starts showing data points
6. Simulate a CPU spike: open Task Manager / `stress-ng` on the server → watch toast appear

---

## How to Extend

### Add a new metric to the server snapshot

1. Add field to `ServerMetricsSchema` in `packages/shared/src/schemas/monitoring.ts`
2. Collect it in `get_server_metrics()` in `system/python/system_monitor.py`
3. Add it to the `MonitoringPage` UI in the system info grid or as a new gauge

### Add a new alert type

1. Add the check in `checkThresholds()` in `apps/api/src/modules/monitoring/socket.ts`
2. Add a dismiss case in `ThresholdAlertBadge.tsx`

### Persist container metrics historically

Currently only server-level snapshots are persisted. To add per-container history:
1. Add a `ContainerSnapshot` model to `schema.prisma` with `containerId` + metrics fields
2. Call `service.saveContainerSnapshots()` from the BullMQ job in `socket.ts`
