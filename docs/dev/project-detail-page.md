# Project Detail Page

`apps/dashboard/src/app/(panel)/projects/[id]/page.tsx` is organized into tabs
using the shadcn `Tabs` component, instead of stacking every panel vertically.

## Tabs

| Tab | Value | Contents |
|-----|-------|----------|
| Overview | `overview` | Summary cards: type/status, repository, build settings, timestamps |
| Deploy/Build | `deploy` | `ContainerControls`, `BuildPanel` |
| Environment | `environment` | `EnvVarEditor` |
| Database | `database` | `DatabasePanel` |
| Domains | `domains` | `DomainPanel` |
| Files | `files` | `FileManagerCard`, `SftpPanel` |
| Git & Advanced | `advanced` | `GitSettings`, `WordPressPanel` (WordPress projects only), `DockerfilePanel` (Docker projects or projects with no git repo) |

## Active tab persistence

The active tab is stored in the `tab` URL query param (e.g.
`/projects/abc123?tab=environment`), read via `useSearchParams` and written
with `router.replace` (so switching tabs doesn't add browser history entries).
An unrecognized or missing `tab` value falls back to `overview`.

## Extending

To add a new panel to an existing tab, drop it inside the matching
`TabsContent` block. To add a new tab, add its slug to the `TAB_VALUES` tuple
at the top of the file and add a matching `TabsTrigger`/`TabsContent` pair.
