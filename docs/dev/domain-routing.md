# Fix Production Subdomain Routing (F5.10)

> **Status:** 🟢 COMPLETED
> **Feature:** Default `{slug}.<BASE_DOMAIN>` project subdomains now get real HTTPS routing in production, matching what custom `Domain` records (F3.1/F3.2) already had.

---

## The Bug

`docker/traefik/traefik.prod.yml.tmpl` sets a **global** HTTP→HTTPS redirect on the `web` entrypoint:

```yaml
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
```

But every deployed-project compose template (`system/templates/docker-compose/{next,node,php,static,python,wordpress,docker}.yml`) only labeled a router on `web` — no `websecure` router, no TLS. So a request to a default subdomain hit the global redirect, landed on `websecure` with no matching router, and dead-ended. Only custom `Domain` records worked, because `domains/service.ts` generates a proper Traefik *dynamic* config file (`docker/traefik/dynamic/domain-*.yml`) with both entrypoints + TLS for those.

---

## The Fix

### 1. Compose templates — add a `websecure` router

Every template in `system/templates/docker-compose/` now labels two routers per container, mirroring the pattern `docker-compose.prod.yml` already uses for the dashboard/api containers:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.{{service_name}}.rule=Host(`{{hostname}}`)"
  - "traefik.http.routers.{{service_name}}.entrypoints=web"
  - "traefik.http.routers.{{service_name}}-secure.rule=Host(`{{hostname}}`)"
  - "traefik.http.routers.{{service_name}}-secure.entrypoints=websecure"
  - "traefik.http.routers.{{service_name}}-secure.tls.certresolver=letsencrypt"
  - "traefik.http.services.{{service_name}}.loadbalancer.server.port={{container_port}}"
```

`docker_manager.py`'s `generate_compose_file()` does plain string substitution on these templates (no per-project-type Python logic to update separately) — editing the 7 template files covers all 8 project types (`REACT`/`STATIC` share `static.yml`).

This is a no-op in dev: `docker/traefik/traefik.yml` (dev) has no forced redirect on `web`, so HTTP still works exactly as before; the new `websecure` router just sits there unused unless someone deliberately hits `https://*.vexlyx.localhost` (where ACME will fail to issue a cert, same as it already does for non-self-signed custom domains in dev — an accepted, pre-existing tradeoff).

### 2. Dashboard "view" links

- `ContainerControls.tsx`'s "Endpoint / Domain" card now links `https://` instead of `http://`, and prefers an attached, `ACTIVE` custom `Domain` over the default `deployedDomain` (fetched via the existing `useDomains` hook — the same one `DomainPanel` uses).
- The same panel's "Host Port" card no longer renders `http://localhost:<port>` as a clickable link — that URL is always wrong for anyone not literally on the server's own machine. It's now plain text, matching how `Container ID` is displayed.
- `WordPressPanel.tsx`'s site-link logic was updated the same way: prefer the active custom domain, else `deployedDomain`, always over `https://`, with the `localhost` fallback removed entirely.

---

## Key Files

| File | Change |
|------|--------|
| `system/templates/docker-compose/{node,next,python,php,static,wordpress,docker}.yml` | Added `-secure` router (websecure entrypoint + `tls.certresolver=letsencrypt`) |
| `apps/dashboard/src/components/projects/ContainerControls.tsx` | `https://` + custom-domain preference on the Domain card; Host Port card is no longer a link |
| `apps/dashboard/src/components/projects/WordPressPanel.tsx` | Same `https://` + custom-domain preference; dropped the `localhost` fallback |

No changes were needed in `docker_manager.py`, `apps/api/src/modules/domains/service.ts` (custom-domain routing), or `docker-compose.prod.yml` — this was purely the missing router labels plus two UI links.

---

## How to Test

1. Deploy a fresh project with no custom domain attached, in production → its default subdomain loads over HTTPS with a valid Let's Encrypt cert (was previously unreachable).
2. Open the project's page in the dashboard → "Endpoint / Domain" links to `https://<subdomain>`; "Host Port" is plain text, not a link.
3. Attach a custom `Domain` to the project and wait for it to go `ACTIVE` → the dashboard's view link switches to the custom domain; the default subdomain still works too (unaffected regression check).
4. Deploy one project of each type (Next.js, Node, Python, PHP, static/React, WordPress, custom Dockerfile) → confirm each gets a working `-secure` router (`docker inspect <container> --format '{{json .Config.Labels}}'` or the Traefik dashboard's router list).
5. In dev (`docker-compose up`), confirm nothing regressed — `http://*.vexlyx.localhost` project subdomains still load exactly as before.

---

## How to Extend

- **Wildcard cert instead of per-router ACME challenges:** today each project subdomain gets its own Let's Encrypt cert via the `letsencrypt` resolver's HTTP challenge (same as the dashboard/api containers). If the number of deployed subdomains grows large enough that per-cert HTTP challenges become slow/rate-limited, switching to a DNS-01 challenge with a wildcard cert for `*.<BASE_DOMAIN>` would remove the per-router cert dependency — see Traefik's `acme.dnsChallenge` config.
- **Split base domain (F5.9):** `VEXLYX_BASE_DOMAIN` can now differ from the panel's own domain; this fix's `websecure` router works identically regardless of which zone the wildcard DNS record lives in, since the cert is requested per-hostname, not per-zone.
