# Design System Notes

> Reference docs for cross-cutting UI conventions enforced across the dashboard. See `CLAUDE.md` §5 and §15 for the full design system; this file covers patterns detailed enough to need their own write-up.

---

## Refresh Buttons (F5.12)

Every "reload this data" button in the dashboard uses the same hook and icon-class helper so the spin animation is identical everywhere, regardless of how fast the underlying request actually is.

**Hook:** `apps/dashboard/src/hooks/useRefreshAnimation.ts`

```tsx
import { useRefreshAnimation, refreshIconClassName } from "@/hooks/useRefreshAnimation";

const { isRefreshing, refresh } = useRefreshAnimation();
const handleRefresh = () => refresh(() => fetchData(true));

<Button onClick={() => void handleRefresh()} disabled={isRefreshing} aria-label="Refresh...">
  <RefreshCw className={refreshIconClassName(isRefreshing, "h-4 w-4")} />
</Button>
```

- `refresh(action)` sets `isRefreshing`, awaits `action()`, then floors the spin at 600ms — even if the request resolves faster, so the animation never feels like a flicker on a fast connection and never runs the full duration of a slow one.
- `refreshIconClassName(isRefreshing, sizeClassName)` standardizes the trailing classes (`transition-transform duration-500`, `animate-spin text-primary` when active). Only pass the icon's size (and optional spacing) as `sizeClassName` — never hand-roll the animation classes.
- If a data-fetching hook (e.g. `useDomains`) already owns the refresh state instead of the component, call `useRefreshAnimation()` inside that hook and delegate its exposed `refresh` to it — the consuming component doesn't change.
- If a refresh button has no real async work to await (e.g. it just bumps a counter that a child component reacts to), still wrap it: `refresh(async () => setTrigger((t) => t + 1))`. The 600ms floor still applies as a purely cosmetic animation.

**`RefreshCw` is reserved for this pattern only.** A button that performs a different action — restarting a container, generating or rotating a credential — is not a refresh, even if it looks similar:
- Use `RotateCw` for restart-style actions (see `ContainerControls.tsx`'s container-restart button, `ServiceCard.tsx`).
- Use a `Loader2` spin-swap (icon replaced entirely while pending, not spun in place) for submit/mutation actions with an idle icon that describes the action (e.g. `KeyRound` for "Generate SSH Key", `RotateCw` for "Regenerate Secret" — see `GitSettings.tsx`).
