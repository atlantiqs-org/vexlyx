# Projects Dashboard UI

## What it does

The Projects UI gives users a complete visual interface to manage their hosting projects. It includes a card grid at `/projects`, a creation modal, and a detail page at `/projects/[id]` with project settings and a destructive delete action.

---

## Architecture

```
/projects (page.tsx)
  ├── useProjects hook        ← fetch + CRUD + 30s polling
  ├── ProjectList             ← grid / skeleton / empty state
  │   └── ProjectCard         ← single project card
  └── CreateProjectModal      ← dialog with form

/projects/[id] (page.tsx)
  ├── fetchAPI directly       ← single project fetch + delete
  └── Confirmation Dialog     ← destructive delete guard
```

### Key files

| File | Role |
|------|------|
| [`useProjects.ts`](../../apps/dashboard/src/hooks/useProjects.ts) | Data layer — fetch, poll, create, delete |
| [`ProjectCard.tsx`](../../apps/dashboard/src/components/projects/ProjectCard.tsx) | Single project card with status + type |
| [`ProjectList.tsx`](../../apps/dashboard/src/components/projects/ProjectList.tsx) | Grid, skeleton state, empty state |
| [`CreateProjectModal.tsx`](../../apps/dashboard/src/components/projects/CreateProjectModal.tsx) | Dialog with validated form |
| [`projects/page.tsx`](../../apps/dashboard/src/app/(panel)/projects/page.tsx) | `/projects` route |
| [`projects/[id]/page.tsx`](../../apps/dashboard/src/app/(panel)/projects/[id]/page.tsx) | `/projects/[id]` route |

---

## `useProjects` hook

Follows the same `useState` + `useEffect` + `fetchAPI` pattern as `useAuth`.

```ts
const {
  projects,      // Project[]
  pagination,    // { page, limit, total, totalPages } | null
  isLoading,     // boolean — true on initial load only
  error,         // string | null
  createProject, // (data: CreateProjectInput) => Promise<Project>
  deleteProject, // (id: string) => Promise<void>
  refetch,       // () => void — manual refresh
} = useProjects();
```

**Polling:** A `setInterval` runs `fetchAPI` silently every **30 seconds** to pick up status changes from the deployment engine (e.g. `CREATING → ACTIVE`). The interval is cleared on component unmount.

**Optimistic updates:** `createProject` and `deleteProject` update local state immediately without waiting for the next poll — so the UI feels instant.

---

## `ProjectCard`

Displays:
- **Type icon** — unique Lucide icon per `ProjectType`
- **Status badge** — colour-coded using exact tokens from `CLAUDE.md §15`:
  - `ACTIVE` → emerald
  - `CREATING` → amber
  - `STOPPED` → slate
  - `ERROR` → rose
  - `DELETED` → slate (muted)
- **Git URL** — stripped of `https://` for brevity
- **Relative timestamp** — inline helper (no deps), e.g. "3h ago"

Clicking the card navigates to `/projects/[id]` via a wrapping `<Link>`.

---

## `CreateProjectModal`

A `shadcn/Dialog` with:
- **Name** — Input, validated client-side (mirrors Zod schema regex)
- **Type** — Select with all 8 `ProjectType` options
- **Git URL** — optional Input
- Errors clear on change (not on submit) for a smooth UX
- `sonner` toast on success (`toast.success`) and failure (`toast.error`)
- Form resets on close

---

## Project Detail Page (`/projects/[id]`)

Three states:
1. **Loading** — skeleton cards matching the loaded layout
2. **Not found** — centered message + "Back to Projects" button
3. **Loaded** — 4 info cards (Overview, Repository, Build Settings, Timestamps)

**Delete flow:**
1. User clicks "Delete" → confirmation `Dialog` opens
2. Dialog describes consequences clearly
3. On confirm → `DELETE /api/projects/:id` → `router.push("/projects")`
4. `sonner` toast confirms deletion

---

## Design decisions

### No TanStack Query
TanStack Query is in the stack spec but not installed. The `useAuth` pattern is already established and consistent. TQ can be added in a later refactor when there are enough data-fetching hooks to justify it.

### Polling over Socket.io
Socket.io arrives in F1.6. 30-second polling is simple and correct for F1.2 — project status changes are infrequent.

### Optimistic updates
The `useProjects` hook updates local state before confirming with the server. If an operation fails, the next poll will correct the UI. This avoids artificial delays on fast connections.

### Status colours
All status colours use `bg-*/10` (10% opacity) backgrounds with matching border and text, avoiding any hardcoded hex values. Light and dark mode both work without overrides.

---

## How to test

```bash
# 1. Start dev server
pnpm dev

# 2. Log in at http://localhost:3000/login

# 3. Navigate to http://localhost:3000/projects
#    → Should show empty state with "New Project" CTA

# 4. Click "New Project"
#    → Modal opens, fill name (e.g. "test-app"), type (Node.js), submit
#    → Project card appears immediately in the grid

# 5. Click the project card
#    → Navigates to /projects/[id], shows 4 detail cards

# 6. Click "Delete" → confirm
#    → Toast appears, redirected back to /projects, card gone
```

---

## How to extend

### Add a new field to the card
1. Add the field to `Project` type in `packages/shared/src/types/index.ts`
2. Add it to `PROJECT_SELECT` in `apps/api/src/modules/projects/service.ts`
3. Render it in `ProjectCard.tsx`

### Add filtering to the list
1. Add filter state to `projects/page.tsx`
2. Pass filter params to `useProjects` and thread them into the `fetchAPI` call as query params
3. `ProjectListQuerySchema` in the shared package already supports `type`, `status`, and `search`

### Add edit functionality
Create `apps/dashboard/src/components/projects/EditProjectModal.tsx` following the same pattern as `CreateProjectModal`. Use `PUT /api/projects/:id`.
