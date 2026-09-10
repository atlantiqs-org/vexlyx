# User Roles & Permissions (F5.5)

> **Status:** 🟢 COMPLETED
> **Feature:** ADMIN/USER/RESELLER roles, role-based route middleware, reseller sub-accounts, per-user resource quotas.

---

## What It Does

F5.5 adds a third role (`RESELLER`) on top of the existing `ADMIN`/`USER` roles, and closes a gap where **no route in the API actually checked a caller's role** — every route only checked that a session existed (`requireAuth`). Concretely:

- **`ADMIN`** — everything, including a new `/users` page to view every account, change any user's role, edit quotas, and delete users. Firewall and Backups (previously reachable by any authenticated user) are now ADMIN-only.
- **`USER`** — unchanged: manages their own projects, domains, databases, and mailboxes, each capped by their own resource quotas.
- **`RESELLER`** — a new tier that creates sub-accounts (plain `USER` rows with `resellerId` pointing at the reseller) and sees only themselves plus their own sub-accounts on `/users`. Capped by their own `maxSubAccounts` quota.
- **Resource quotas** — every user has nullable `maxProjects`/`maxDomains`/`maxDatabases`/`maxMailboxes`/`maxSubAccounts` fields (`null` = unlimited), enforced at creation time with a `QUOTA_EXCEEDED` (403) error.

---

## Architecture

```
Dashboard (/users page, Sidebar role-gated nav)
  │  REST: GET/POST /api/users, PATCH /api/users/:id/{role,quotas}, DELETE /api/users/:id
  ▼
apps/api/src/modules/users/{routes,service,schema}.ts
  │  requireRole("ADMIN") / requireRole("ADMIN","RESELLER") preHandlers
  ▼
apps/api/src/plugins/auth.ts — requireRole(...roles)
  │  Looks up the caller's current role from Postgres on every call (not
  │  cached in the session), so a role change takes effect immediately.
  ▼
apps/api/src/utils/quota.ts — assertUnderQuota(prisma, userId, resource, makeError)
  │  Called from projects/domains/databases/mailboxes/users `create()`
  ▼
Prisma `User` model — role, resellerId (self-relation), max* quota fields
```

### Key Files

| File | Purpose |
|------|---------|
| `apps/api/prisma/schema.prisma` | `Role` enum (+`RESELLER`), `User.resellerId` self-relation, `max*` quota fields |
| `apps/api/src/plugins/auth.ts` | `requireRole(...roles)` preHandler factory |
| `apps/api/src/utils/quota.ts` | `assertUnderQuota` — shared count-based quota check |
| `apps/api/src/modules/users/{routes,service,schema}.ts` | User listing/role/quota/sub-account management |
| `apps/api/src/modules/firewall/routes.ts`, `apps/api/src/modules/backups/routes.ts` | Gated from `requireAuth` to `requireRole("ADMIN")` |
| `packages/shared/src/schemas/users.ts` | Zod schemas shared between API and dashboard |
| `apps/dashboard/src/hooks/useUsers.ts` | React Query hooks (list, create sub-account, update role/quotas, delete) |
| `apps/dashboard/src/components/users/` | All UI components |
| `apps/dashboard/src/app/(panel)/users/page.tsx` | Next.js route |
| `apps/dashboard/src/components/layout/Sidebar.tsx` | Nav items hidden per-role via `roles` on each item |

---

## Role Middleware

`app.requireRole(...roles: Role[])` (in `apps/api/src/plugins/auth.ts`, alongside the existing `requireAuth`) returns a preHandler that:

1. 401s if there's no session (same as `requireAuth`).
2. Looks up the caller's `role` fresh from Postgres — deliberately **not** cached in the Redis session, so an admin changing someone's role takes effect on their very next request instead of requiring them to log out and back in.
3. 403s with `{ code: "FORBIDDEN_ROLE" }` if the role isn't in the allowed set.
4. Attaches `request.userRole` so the route handler doesn't need a second lookup.

---

## Sub-accounts & Quotas

- A sub-account is just a normal `User` row with `resellerId` set to its owning reseller (`User` self-relation `reseller`/`subAccounts` in `schema.prisma`) — no separate join table.
- `UserService.list()` scopes by requester: `ADMIN` gets every user; `RESELLER` gets `WHERE id = self OR resellerId = self`.
- `assertUnderQuota(prisma, userId, resource, makeError)` looks up the matching `max*` field (`null` = unlimited), counts existing non-deleted rows for that resource, and throws via `makeError` — each module wraps it in its own existing error class (`ProjectError`, `DomainError`, `DatabaseError`, `MailboxError`, `UserError`) so the existing per-module error handler in `routes.ts` picks it up unchanged.
- Quota checks run at the very top of `create()` in `projects/service.ts`, `domains/service.ts`, `databases/service.ts`, `mailboxes/service.ts`, and `users/service.ts` (`createSubAccount`).

---

## How to Test

1. `pnpm db:seed` from `apps/api/` seeds `admin@vexlyx.local`, `reseller@vexlyx.local` (maxSubAccounts: 5), and `sub-account@vexlyx.local` (maxProjects: 3, owned by the reseller) — all with password `admin123`.
2. Log in as admin → `/users` shows every account; edit a user's role/quotas via the pencil icon.
3. Log in as reseller → `/users` shows only the reseller + its sub-account; "New Sub-account" creates additional `USER` rows until `maxSubAccounts` is hit (expect a `QUOTA_EXCEEDED` toast).
4. Log in as the sub-account (plain `USER`) → `/users`, `/firewall`, `/backups` nav items are hidden; direct `GET /api/users`, `/api/firewall`, `/api/backups` all return 403.
5. As the sub-account, create projects past `maxProjects` (3) → the 4th attempt returns 403 `QUOTA_EXCEEDED`.

---

## F5.8 — Direct User Provisioning, Registration Lockdown & Logout

- `POST /api/users` (`apps/api/src/modules/users/routes.ts`) now accepts `requireRole("ADMIN", "RESELLER")`, not just `RESELLER`. `UserService.createSubAccount` (`apps/api/src/modules/users/service.ts`) branches on `requester.role`: an ADMIN can set any `role` (via the now-optional `role` field on `CreateSubAccountSchema`, `packages/shared/src/schemas/users.ts`) and isn't quota-checked; a RESELLER is still forced to `role: "USER"`, `resellerId: requester.id`, and quota-checked against `maxSubAccounts`.
- `CreateSubAccountDialog.tsx` takes an `isAdmin` prop — when true it shows a role `Select` and the button reads "New User"; when false (reseller) it behaves exactly as before. `UsersPage.tsx` renders it for both roles now.
- `ALLOW_REGISTRATION` (`apps/api/src/config/env.ts`) now **defaults to `false`** — a fresh install is a closed panel; the first admin (from `create-admin.ts`/`seed.ts`) provisions everyone else via `/users`. A new public `GET /api/auth/config` route exposes the current value so the dashboard doesn't have to guess; `useAuthConfig.ts` fetches it once. `LoginForm.tsx` hides the "Create one" link when disabled, and `RegisterForm.tsx` shows an "ask your administrator" message in place of the form.
- Logout was previously dead code (`useAuth().logout()` existed but nothing called it) — `Header.tsx` now has an account dropdown (shadcn `dropdown-menu`) showing the user's name/email with a "Log out" item.

---

## How to Extend

- **More admin-gated modules:** change the route's `preHandler` from `app.requireAuth` to `app.requireRole("ADMIN")` (or add `RESELLER` where a reseller should also reach it) — same one-line change made to `firewall/routes.ts` and `backups/routes.ts`.
- **More quota'd resources:** add a `max<Resource>` column to `User`, a case in `QUOTA_FIELD`/`countExisting` in `apps/api/src/utils/quota.ts`, and one `assertUnderQuota(...)` call at the top of that resource's `create()`.
- **Reseller self-service quota requests:** out of scope here — quotas are currently ADMIN-set only via `PATCH /api/users/:id/quotas`.
