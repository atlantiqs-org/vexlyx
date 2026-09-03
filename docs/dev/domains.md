# Custom Domain Management (F3.1)

> **Feature:** F3.1 — Custom Domain Management  
> **Status:** 🟢 COMPLETED  
> **Package:** `@vexlyx/api`, `@vexlyx/dashboard`, `@vexlyx/shared`  
> **Prisma Models:** `Domain`, `DnsRecord`, `Project`

---

## 1. Overview

Custom Domain Management allows users to attach custom fully-qualified domain names (FQDNs) to their deployed projects, verify domain ownership through DNS TXT record challenges, and automatically configure Traefik v3 HTTP routing using zero-downtime dynamic file provider definitions.

When a domain is verified, Vexlyx generates a dynamic router configuration in `docker/traefik/dynamic/domain-{domainId}.yml` routing all incoming web traffic matching `Host(...)` to the project's container on `traefik-net`. When a domain is deleted, the dynamic configuration file is removed immediately with zero downtime or container restarts.

---

## 2. Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Dashboard UI                     │
│  - /domains (Global domain overview & project assignment)   │
│  - /projects/[id] (Project detail DomainPanel)              │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Fastify API Server                      │
│  - POST   /api/domains              (Register domain)       │
│  - GET    /api/domains              (List user domains)     │
│  - GET    /api/domains/:id          (Get domain details)    │
│  - POST   /api/domains/:id/verify   (Resolve DNS & verify)  │
│  - DELETE /api/domains/:id          (Unlink & cleanup)      │
└───────────────┬──────────────────────────────┬──────────────┘
                │                              │
                ▼                              ▼
┌───────────────────────────────┐ ┌───────────────────────────┐
│     PostgreSQL (Prisma)       │ │  Traefik v3 Dynamic File  │
│  - model Domain               │ │  docker/traefik/dynamic/  │
│    * hostname (unique)        │ │  domain-{domainId}.yml    │
│    * status (PENDING/ACTIVE)  │ └─────────────┬─────────────┘
│    * verificationToken        │               │ Hot-reloaded
│    * projectId (relation)     │               ▼
│  - model DnsRecord (TXT)      │ ┌───────────────────────────┐
└───────────────────────────────┘ │ Traefik v3 Reverse Proxy  │
                                  │ routes Host(domain) to    │
                                  │ {service_name}@docker     │
                                  └───────────────────────────┘
```

### Key Workflow:

1. **Domain Registration (`POST /api/domains`)**:
   - Hostname validated against RFC 1123 FQDN syntax (lowercase, no protocols, valid labels).
   - Generates a cryptographic verification token: `vexlyx-verify-<32-hex-chars>`.
   - Stores `Domain` in database with status `PENDING` and inserts a matching `DnsRecord` TXT challenge.
   - Returns DNS instructions:
     - **Type**: `TXT`
     - **Host**: `_vexlyx-challenge.<hostname>`
     - **Value**: `vexlyx-verification=<token>`

2. **DNS Ownership Verification (`POST /api/domains/:id/verify`)**:
   - Performs asynchronous DNS TXT queries via Node's `dns.promises.resolveTxt` against `_vexlyx-challenge.<hostname>` and `<hostname>`.
   - If matching token is detected:
     - Domain status updated to `ACTIVE`.
     - Invokes `syncTraefikRouter(domain)`.
   - If token is missing/mismatched:
     - Domain status set to `ERROR`.
     - Returns detected records and actionable troubleshooting guidance.

3. **Traefik Dynamic Routing (`syncTraefikRouter`)**:
   - Traefik v3 in `docker-compose.yml` mounts `./docker/traefik/dynamic/`.
   - Writes `docker/traefik/dynamic/domain-{domainId}.yml` with direct service loadbalancer routing across `traefik-net`:
     ```yaml
     http:
       routers:
         domain-{domainId}:
           rule: Host(`{domain.hostname}`)
           entryPoints:
             - web
           service: service-{domainId}
       services:
         service-{domainId}:
           loadBalancer:
             servers:
               - url: "http://vexlyx-{serviceName}-app-1:{containerPort}"
     ```
   - Seamlessly proxies HTTP traffic to the target container with zero downtime.

4. **Domain Deletion (`DELETE /api/domains/:id`)**:
   - Unlinks `docker/traefik/dynamic/domain-{domainId}.yml`.
   - Traefik instantly removes the HTTP router.
   - Deletes domain row from PostgreSQL (cascade deletes associated `dns_records`).

---

## 3. API Reference

### `POST /api/domains`
- **Auth:** Required (Session cookie)
- **Body:**
  ```json
  {
    "hostname": "app.example.com",
    "projectId": "cm1234567890abcdef" // optional
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "id": "dom_abc123",
    "hostname": "app.example.com",
    "status": "PENDING",
    "sslEnabled": false,
    "verificationToken": "vexlyx-verify-a1b2c3d4...",
    "projectId": "cm1234567890abcdef",
    "verificationInstructions": {
      "recordType": "TXT",
      "recordName": "_vexlyx-challenge.app.example.com",
      "recordValue": "vexlyx-verification=vexlyx-verify-a1b2c3d4..."
    }
  }
  ```

### `GET /api/domains`
- **Auth:** Required
- **Query Parameters:** `projectId`, `status`, `search`, `page`, `limit`
- **Response (200 OK):** Array of `DomainResponse` objects.

### `POST /api/domains/:id/verify`
- **Auth:** Required
- **Query Parameters (Testing only):** `?mockRecord=...`
- **Response (200 OK):**
  ```json
  {
    "verified": true,
    "status": "ACTIVE",
    "message": "Domain verified successfully. Traefik traffic routing is active.",
    "expectedRecord": { ... },
    "detectedRecords": [ ... ]
  }
  ```

### `DELETE /api/domains/:id`
- **Auth:** Required
- **Response:** `204 No Content`

---

## 4. Testing

### Automated Test Suite
Run the Python custom domain test suite:
```bash
python tests/test_custom_domains.py
```

Covered test cases:
1. `test_valid_hostnames`: Validates compliant RFC 1123 domain names and subdomains.
2. `test_invalid_hostnames`: Rejects protocols, ports, trailing dots, spaces, invalid chars.
3. `test_traefik_yaml_generation`: Verifies Traefik router configuration format, entryPoints, and Docker service names.
4. `test_verification_match`: Tests token resolution matching and failure rejection.
5. `test_endpoint_unauthorized`: Verifies 401 unauthorized protection on `/api/domains`.

### Monorepo Validation
```bash
pnpm typecheck   # Validates TypeScript across all 3 workspaces
pnpm lint        # Validates ESLint rules
pnpm build       # Validates Next.js and API production builds
```

---

## 5. UI Integration

- **Project Settings (`DomainPanel`)**: Located at `/projects/[id]`. Allows attaching and verifying domains directly in the context of a project.
- **Global Overview (`/domains`)**: Located at `/domains`. Lists all domains across all projects with filters, search, and a project-selector creation dialog.

---

## 6. Important Decisions

1. **Dedicated Verification Token**: Added `verificationToken String? @map("verification_token")` directly to `Domain` model via Prisma migration `20260902184554_add_domain_verification_token` to guarantee cryptographic unicity and fast indexing.
2. **Traefik Dynamic File Provider**: Utilized Traefik's dynamic file provider (`docker/traefik/dynamic/`) rather than editing container labels. This enables zero-downtime instant routing attachment and detachment without restarting or redeploying the application container.
3. **No External DNS Dependencies**: Implemented DNS resolution using Node's built-in `dns.promises.resolveTxt` and crypto generation using `node:crypto`.
