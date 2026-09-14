# Mail Page: Production-Grade Operations (F4.8)

> **Feature:** F4.8 — Mail Page: Production-Grade Operations (Queue, Bounces, DKIM Rotation)
> **Status:** 🟢 COMPLETED
> **Package:** `@vexlyx/api`, `@vexlyx/dashboard`, `@vexlyx/shared`
> **Prisma Models:** `DkimKey`
> **Infrastructure:** Postfix `postqueue`/`postsuper`, Postfix `maillog_file`, Roundcube SQLite

---

## 1. Overview

Phases F4.1-F4.7 built the mail *provisioning* side (mailboxes, aliases, vacation responders, DKIM/SPF/DMARC status, storage bars). F4.8 adds the day-2 *operations* tooling a real mail admin needs to run a production server, matching what Mailcow/cPanel/WHM expose as baseline:

1. **Queue Management** — list, delete, flush, hold, and release messages in the Postfix mail queue.
2. **Delivery Log** — tail and filter Postfix's delivery/bounce events by domain, mailbox, or status.
3. **DKIM Rotation** — generate a new DKIM selector/key for a domain without invalidating the previous one, so in-flight mail keeps validating during DNS propagation.
4. **Webmail Activity** — show recent Roundcube login activity per mailbox instead of a bare status badge.

Queue Management and the Delivery Log expose server-wide data across every tenant (this app supports resellers/sub-accounts with per-user mailbox quotas), so both are gated to `ADMIN` role only — consistent with other server-wide infrastructure views (`/api/backups`, `/api/firewall`, `/api/services`). DKIM rotation and webmail activity remain scoped to the requesting user's own domains/mailboxes under the module's usual `requireAuth`.

---

## 2. Queue Management

Backed by Postfix's own `postqueue`/`postsuper` CLI tools, run via `docker exec vexlyx-postfix ...` from `system/python/postfix_manager.py`.

| Action | Postfix command | API endpoint |
|---|---|---|
| List | `postqueue -p` | `GET /api/mail/queue` |
| Delete | `postsuper -d <id>` | `POST /api/mail/queue/:queueId/delete` |
| Flush all | `postqueue -f` | `POST /api/mail/queue/flush` |
| Flush one (requeue now) | `postsuper -r <id>` | `POST /api/mail/queue/:queueId/flush` |
| Hold | `postsuper -h <id>` | `POST /api/mail/queue/:queueId/hold` |
| Release | `postsuper -H <id>` | `POST /api/mail/queue/:queueId/release` |

A queue message's `flagged` field is `"held"` when Postfix marks it `!` (on hold), `"active"` when marked `*` (currently being retried), or `"none"` otherwise. A `reason` is populated from a deferred/bounced recipient line's parenthetical explanation.

**Known limitation:** there is no pagination — a very large queue is returned in full. Acceptable for a single-server admin panel; revisit if queue sizes become an operational concern.

---

## 3. Delivery Log

Postfix had no log capture at all before F4.8 (no syslog daemon runs in the minimal Alpine container, and `maillog_file` was unset). F4.8 adds:

```
# docker/postfix/main.cf
maillog_file = /var/log/postfix/postfix.log
```

Postfix 3.4+ (Alpine 3.20 ships 3.9.x) writes directly to this file without needing syslog. `docker-compose.yml` bind-mounts it out to `./docker/mail-data/logs/postfix.log` (same host-bind-mount convention as `./docker/mail-data/vhosts`), so `system/python/postfix_manager.py`'s `get_delivery_log()` can read it directly from the host filesystem — no `docker exec`/`docker logs` needed.

Log lines are parsed with a tolerant regex (non-matching lines are skipped, not treated as errors) extracting timestamp, queue ID, recipient, Postfix's `status=` (mapped to `success`/`deferred`/`bounced`), relay, delay, and a trailing parenthetical as the human-readable reason. At most the last 20,000 raw lines are scanned per request — the file is never loaded into memory in full.

**Known limitation:** no log rotation is implemented. `docker/mail-data/logs/postfix.log` grows unbounded; a `logrotate` policy or a size cap is a reasonable follow-up, not implemented here.

---

## 4. DKIM Rotation

Before F4.8, DKIM only supported first-time key generation under a fixed `"default"` selector, tracked purely on the filesystem (`docker/postfix/opendkim/keys/<domain>/default.*`). Rotation needs to express "the old key is still valid, the new key now signs" — which the filesystem alone can't represent — so F4.8 adds a `DkimKey` Prisma model:

```prisma
enum DkimKeyStatus { ACTIVE RETIRING RETIRED }

model DkimKey {
  id, domainId, userId, selector, status, publicKey, keyLength, createdAt, retiredAt
}
```

**Rotation flow** (`POST /api/mail/dkim/:domainId/rotate`, `MailService.rotateDkim`):
1. Backfill: if the domain has no `DkimKey` row yet (generated before F4.8), synthesize one `ACTIVE` row from the existing filesystem `default` selector.
2. Call `postfix_manager.py`'s `rotate_dkim` command: generates a new selector (`dk<YYYYMMDD>`, suffixed `-2`/`-3` on same-day re-rotation) and key pair, then repoints OpenDKIM's `SigningTable` entry for `*@domain` at the new selector — **without touching** the old selector's `KeyTable` entry, key files, or `TrustedHosts` entry.
3. Mark the previous `ACTIVE` `DkimKey` row(s) `RETIRING`, create a new `ACTIVE` row for the new selector, publish the new selector's DNS TXT record.

**`RETIRED` is never set automatically.** An admin manually removes the old DNS TXT record once propagation is confirmed, and there's no cleanup automation for `RETIRING` rows in this feature — that stays a deliberate manual step (see the in-app rotation dialog, which surfaces the retiring selector's record name).

---

## 5. Webmail Activity

`GET /api/mail/webmail/activity` queries Roundcube's own SQLite database (`/var/roundcube/db/sqlite.db` inside `vexlyx-roundcube`) for each of the user's mailboxes' `last_login` timestamp from the `users` table.

The Roundcube Docker image ships no `sqlite3` CLI — only the PHP `pdo_sqlite`/`sqlite3` extensions Roundcube itself needs — so `system/python/webmail_manager.py`'s `get_recent_logins()` runs a small PHP one-liner via `docker exec ... php -r ...` rather than shelling out to a `sqlite3` binary.

If the query fails (container down, database not yet initialized on a fresh install), the function degrades gracefully — `{"logins": [], "error": ..., "code": "SQLITE_QUERY_ERROR"}` — rather than raising, so the panel still renders with an empty activity list instead of erroring out.

---

## 6. API Reference

| Method | Path | Auth |
|---|---|---|
| GET | `/api/mail/queue` | `requireRole("ADMIN")` |
| POST | `/api/mail/queue/:queueId/delete` | `requireRole("ADMIN")` |
| POST | `/api/mail/queue/flush` | `requireRole("ADMIN")` |
| POST | `/api/mail/queue/:queueId/flush` | `requireRole("ADMIN")` |
| POST | `/api/mail/queue/:queueId/hold` | `requireRole("ADMIN")` |
| POST | `/api/mail/queue/:queueId/release` | `requireRole("ADMIN")` |
| GET | `/api/mail/logs` | `requireRole("ADMIN")` |
| POST | `/api/mail/dkim/:domainId/rotate` | `requireAuth` |
| GET | `/api/mail/webmail/activity` | `requireAuth` |

Request/response shapes are defined as Zod schemas in `packages/shared/src/schemas/mail.ts` (`QueueMessageSchema`, `QueueListResponseSchema`, `QueueActionResultSchema`, `DeliveryLogEntrySchema`, `DeliveryLogResponseSchema`, `DeliveryLogFilterSchema`, `DkimKeySchema`, `DkimRotateResponseSchema`, `WebmailLoginActivitySchema`, `WebmailActivityResponseSchema`).

---

## 7. Known Limitations / Follow-ups

- **No log rotation** for `docker/mail-data/logs/postfix.log` — unbounded growth over time.
- **No queue pagination** — fine for a single-server admin panel, not for a very large queue.
- **`DkimKeyStatus.RETIRED` is never set automatically** — an admin must confirm DNS propagation and clean up manually; there's no scheduled job for this.
- **Pre-existing, unrelated to F4.8:** the `vexlyx-postfix` container's OpenDKIM milter process was observed not staying running after container start in local testing (`opendkim -x ...` in `entrypoint.sh` appears to exit rather than daemonize under the current Alpine OpenDKIM package). Mail delivery is unaffected because `milter_default_action = accept` in `main.cf`, but DKIM signing itself won't actually happen until this is investigated — worth a follow-up ticket independent of this feature.
