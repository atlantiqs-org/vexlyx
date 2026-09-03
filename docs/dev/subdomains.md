# Subdomain & Wildcard Routing (F3.2)

> **Feature:** F3.2 — Subdomain Support  
> **Status:** 🟢 COMPLETED  
> **Package:** `@vexlyx/api`, `@vexlyx/dashboard`, `@vexlyx/shared`  
> **Prisma Models:** `Domain`, `Project`, `DnsRecord`

---

## 1. Overview

Subdomain & Wildcard Routing enables Vexlyx users to route traffic from multiple subdomains (`api.domain.com`, `blog.domain.com`, `app.domain.com`) or wildcard catch-alls (`*.domain.com`) to different project containers on the same server with zero downtime.

Drawing from modern PaaS patterns (Vercel, Coolify, Cloudflare), Vexlyx implements **Account-Level Ownership Inheritance**: once an apex domain (`domain.com`) is verified via DNS TXT record, any subsequent subdomains or wildcards created under that parent domain automatically inherit verification status and are immediately activated (`ACTIVE`), generating Traefik dynamic router definitions on the fly.

---

## 2. Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Dashboard UI                     │
│  - /domains (Global domain overview & Subdomain manager)    │
│  - SubdomainModal (Prefix input, wildcard toggle, project)  │
│  - Project detail /projects/[id] (DomainPanel)              │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Fastify API Server                      │
│  - POST   /api/domains              (Create subdomain)      │
│  - GET    /api/domains              (List domains/subdomains│
│  - GET    /api/domains/:id/subdomains (List child subdomains)
│  - POST   /api/domains/:id/verify   (DNS TXT verification)  │
│  - DELETE /api/domains/:id          (Cascade deletion)      │
└───────────────┬──────────────────────────────┬──────────────┘
                │                              │
                ▼                              ▼
┌───────────────────────────────┐ ┌───────────────────────────┐
│     PostgreSQL (Prisma)       │ │  Traefik v3 Dynamic File  │
│  - model Domain               │ │  docker/traefik/dynamic/  │
│    * hostname (e.g. *.dom.com)│ │  domain-{domainId}.yml    │
│    * parentId (relation)      │ └─────────────┬─────────────┘
│    * pathPrefix (e.g. /api)   │               │ Hot-reloaded
│    * status (PENDING/ACTIVE)  │               ▼
│  - subdomains Domain[]        │ ┌───────────────────────────┐
└───────────────────────────────┘ │ Traefik v3 Reverse Proxy  │
                                  │ Specific Host priority 100│
                                  │ Wildcard Host priority 10 │
                                  └───────────────────────────┘
```

---

## 3. Key Technical Decisions & Mechanisms

### 1. Account-Level Verification Inheritance
- Proving ownership of an apex domain (`domain.com`) via DNS TXT challenge claims that domain for the user account.
- When creating any subdomain (`api.domain.com`) or wildcard (`*.domain.com`) where the parent domain is already verified (`ACTIVE`), the subdomain is **immediately marked `ACTIVE`** without prompting for repetitive DNS challenges.
- Traefik dynamic routing is configured immediately upon creation.

### 2. Traefik Dynamic Router Prioritization
When both specific subdomains and wildcard domains exist for the same apex domain (e.g., `api.domain.com` and `*.domain.com`), Traefik router rules are assigned deterministic priorities:
- **Specific Subdomains:** `priority: 100` (`rule: Host(\`api.domain.com\`)`)
- **Wildcard Subdomains:** `priority: 10` (`rule: Host(\`*.domain.com\`)`)
- **Path Prefixes (Optional):** `rule: Host(\`...\`) && PathPrefix(\`${pathPrefix}\`)`

Incoming traffic to `api.domain.com` always matches the specific project container, while unmatched subdomains (`anything.domain.com`) smoothly fall back to the wildcard project container.

### 3. Wildcard DNS Verification Target
If a user adds a wildcard subdomain (`*.domain.com`) standalone without having previously verified `domain.com`, the DNS TXT challenge is automatically targeted to `_vexlyx-challenge.domain.com` (stripping `*.` so resolvers can query valid TXT records).

### 4. Cascade Cleanup
Deleting a parent domain unlinks the Traefik configuration files for all child subdomains and cascades in the database.

---

## 4. API Reference

### `POST /api/domains`
Create a domain, subdomain, or wildcard subdomain.
- **Request Body:**
  ```json
  {
    "hostname": "api.mydomain.com",
    "parentId": "dom_parent123", // optional
    "projectId": "proj_abc456",   // optional
    "pathPrefix": "/v1"           // optional
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "id": "dom_child789",
    "hostname": "api.mydomain.com",
    "status": "ACTIVE", // inherited if parent is ACTIVE
    "parentId": "dom_parent123",
    "projectId": "proj_abc456",
    "isWildcard": false,
    "pathPrefix": "/v1"
  }
  ```

### `GET /api/domains/:id/subdomains`
Lists all subdomains attached to a specific parent domain.

---

## 5. Testing

Run the automated test suite:
```bash
python tests/test_subdomains.py
python tests/test_custom_domains.py
```

Covered test cases:
1. `test_acceptance_criteria_subdomains`: Validates `api.domain.com`, `blog.domain.com`, `app.domain.com`, `*.domain.com`.
2. `test_invalid_wildcards_and_subdomains`: Rejects `*.com`, `*.*.com`, `*domain.com`, spaces, and invalid formats.
3. `test_subdomain_helpers`: Validates `isWildcardHostname`, `getParentDomain`, and `isSubdomain`.
4. `test_traefik_router_priorities`: Validates priority 100 for specific subdomains and priority 10 for wildcards.
5. `test_verification_inheritance`: Verifies automatic activation when parent domain is active.
6. `test_unauthorized_access`: Verifies 401 unauthorized protection on API routes.
