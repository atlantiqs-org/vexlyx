# Firewall Management (F5.4)

> **Status:** 🟢 COMPLETED
> **Feature:** Web-based UFW firewall management — list/add/delete rules, default incoming/outgoing policy, lockout protection.

---

## What It Does

F5.4 adds a `/firewall` page to the Vexlyx dashboard that:

- **Lists the live firewall state** — every UFW rule currently in effect, merged with the panel's own record of who added each managed rule and when.
- **Adds/removes rules** — port, protocol (TCP/UDP), source IP/CIDR (optional, defaults to anywhere), allow/deny action, and an optional comment. Applies immediately to the real host firewall.
- **Sets default policy** — incoming/outgoing default (allow/deny), same as `ufw default <policy> <direction>`.
- **Refuses to lock out the server** — any change that would deny or remove access to the SSH port or the panel API's own port is rejected server-side with a clear error, surfaced as a toast in the UI.
- **Confirms destructive changes** — deleting a rule or changing the default policy requires confirming in a dialog first; adding a rule (already validated against lockout) does not.

Rules created outside the panel (the installer's baseline SSH/HTTP/HTTPS/mail rules from `system/scripts/install/steps/15-firewall.sh`) still show up in the list for visibility, marked as **system-managed** — they're read-only here, not deletable through this API.

---

## Architecture

The API container (`apps/api/Dockerfile`) has no `sudo`, no `ufw` binary, and no host networking or `NET_ADMIN` — it's an isolated Docker container like any other. A plain `ufw`/`iptables` call inside it would only modify that container's own (irrelevant) network namespace, not the real host firewall. Unlike Docker container management (which works because the API is a Docker *client* talking to the host daemon over the bind-mounted socket), there's no host-level UFW equivalent to call into directly.

The fix is a **throwaway, host-networked helper container**, launched per UFW command via the same bind-mounted Docker socket every other system-layer script already uses:

```
Browser (Firewall page)
  │  REST (list/add/delete rules, update default policy)
  ▼
apps/api/src/modules/firewall/{routes,service,schema}.ts
  │  Prisma: FirewallRule / FirewallSettings rows (audit trail + managed-rule tracking)
  │  spawn(python, firewall_manager.py) — stdin/stdout JSON, one call per command
  ▼
system/python/firewall_manager.py
  │  docker run --rm --network host --cap-add NET_ADMIN --cap-add NET_RAW
  │    -v /etc/ufw:/etc/ufw -v /lib/ufw:/lib/ufw vexlyx-ufw-helper:latest ufw ...
  ▼
vexlyx-ufw-helper container (docker/ufw-helper/Dockerfile)
  │  --network host means this container shares the HOST's network
  │  namespace, so `ufw` inside it really does modify the host's iptables.
  ▼
Host firewall (real UFW/iptables state)
```

The main API container itself stays completely unprivileged — no Dockerfile or `docker-compose.prod.yml` changes were needed for it. Only the helper image (built once during install, see `system/scripts/install/steps/10-images.sh`) ever runs with elevated network/capability access, and only for the few seconds each UFW command takes.

### Key Files

| File | Purpose |
|------|---------|
| `docker/ufw-helper/Dockerfile` | Minimal `ufw`-only image run with `--network host` to reach the real firewall |
| `system/python/firewall_manager.py` | Builds and runs `docker run ... ufw ...`, parses `ufw status verbose`, enforces the lockout guard |
| `apps/api/src/modules/firewall/service.ts` | Spawns the Python script, merges live UFW state with DB-tracked managed rules |
| `apps/api/src/modules/firewall/routes.ts` | REST endpoints (`GET /`, `POST /rules`, `DELETE /rules/:id`, `PUT /settings`) |
| `apps/api/prisma/schema.prisma` | `FirewallRule` and `FirewallSettings` models |
| `packages/shared/src/schemas/firewall.ts` | Zod schemas shared between API and dashboard |
| `apps/dashboard/src/hooks/useFirewall.ts` | React Query hooks (status, add/delete rule, update settings) |
| `apps/dashboard/src/components/firewall/` | All UI components |
| `apps/dashboard/src/app/(panel)/firewall/page.tsx` | Next.js route |

---

## Python Script (`firewall_manager.py`)

**Protocol:** Same as `system_monitor.py`/`backup_manager.py` — JSON payload on stdin, one JSON response on stdout, exit code 0/1.

**Commands:**

- `status` — runs `ufw status verbose` in the helper container, parses it into `{ active, defaultIncoming, defaultOutgoing, rules: [...] }`.
- `add_rule` — refuses (`LOCKOUT_RISK`) if `action` is `DENY` and `port` is a protected port; otherwise builds and runs the equivalent `ufw allow|deny [from <source> to any port <port> proto <proto>]` command.
- `delete_rule` — refuses (`LOCKOUT_RISK`) if `action` is `ALLOW` and `port` is a protected port; otherwise runs `ufw delete <same rule spec>` (not a numbered delete, so it's unaffected by other rules changing in between).
- `set_default_policy` — if `defaultIncoming` is `deny`, first checks that at least one protected port already has a live `ALLOW` rule; refuses (`LOCKOUT_RISK`) otherwise. Applies via two `ufw default <policy> <direction>` calls (UFW only supports one direction per invocation).

**Protected ports:** the SSH port (`FIREWALL_SSH_PORT` env var, default `22`) and the panel API's own port (`PORT` env var, default `5000`) — passed into every command's payload by `service.ts`. This mirrors the SSH-lockout guard the installer already runs once at `system/scripts/install/steps/15-firewall.sh`, extended to also cover the panel and enforced on every change, not just at install time.

**Known `ufw` quirks discovered during live testing (Ubuntu 24.04, ufw 0.36.2):**
- `--force` is only accepted before `enable`/`reset`/`disable` — passing it before `allow`/`deny`/`delete`/`default`/`status` fails with `ERROR: Invalid syntax`. None of our commands ever prompt for confirmation anyway, so `run_ufw()` never passes it.
- `ufw` shells out to the `sysctl` binary internally for *every* command, including read-only ones like `status verbose` — `debian:bookworm-slim` doesn't ship it, so `docker/ufw-helper/Dockerfile` explicitly installs `procps` alongside `ufw`.

**Windows dev:** `run_ufw()` no-ops (`sys.platform` isn't `linux`) and `status` returns a canned inactive/empty response, so the UI is clickable in local dev without a real UFW host. Mutating commands silently succeed without actually running `docker run` — there's nothing to apply.

---

## Data Model

- **`FirewallRule`** — one row per panel-created rule (port, protocol, source, action, comment, `createdBy`, `createdAt`). Written only after the live `ufw` call succeeds; deleted only after the live `ufw delete` succeeds. This is the audit trail — UFW itself is the enforcement point.
- **`FirewallSettings`** — singleton row (`id: "default"`), same pattern as `BackupSettings`. Records the last-applied default policy and when.

`GET /api/firewall` merges `ufw status verbose`'s live rule list with `FirewallRule` rows (matched on port/protocol/action/source) to attach `id`/`createdBy`/`createdAt`/`managed: true`; any live rule with no DB match (e.g. the installer's baseline rules) is returned with `managed: false` and a synthetic `id` — the dashboard shows these read-only.

---

## How to Test

1. **View rules** — open `/firewall`; the table should show the installer's baseline rules (SSH, 80, 443, mail ports) as system-managed, plus any panel-added rules.
2. **Add a rule** — "Add Rule" → port 8080, TCP, Allow → confirms in the dialog is not required (non-destructive), rule appears in the table and the port opens (`ufw status` on the host shows it, or `nc -zv <host> 8080` from outside succeeds once something is listening).
3. **Delete a rule** — click the trash icon on a managed rule → confirm in the dialog → rule disappears and the port closes.
4. **Lockout protection** — try to add a `DENY` rule for port 22 (or the panel's port): the API rejects it with `LOCKOUT_RISK` and a toast explains why; nothing is applied and no DB row is written. Same for deleting the SSH `ALLOW` rule, or setting default incoming to `deny` before any protected port has an explicit allow rule.
5. **Default policy** — change default incoming/outgoing in the "Default Policy" card → confirm in the dialog → `ufw status verbose` on the host reflects the new defaults.

---

## How to Extend

- **More protected ports:** add to `get_protected_ports()` in `firewall_manager.py` and the corresponding payload fields in `service.ts`'s `runFirewallCommand` calls (e.g. to also protect 80/443 for Traefik).
- **IPv6 rules:** `parse_status()` currently skips `(v6)` lines to avoid duplicate entries for the same rule; extend the regex/schema if dual-stack rules need to be shown and managed separately.
- **Rate limiting (`ufw limit`):** not currently exposed — `FirewallAction` only supports `ALLOW`/`DENY`. Adding `LIMIT` would need a new enum value in both the Prisma schema and `packages/shared/src/schemas/firewall.ts`, plus a corresponding case in `build_rule_args()`.
