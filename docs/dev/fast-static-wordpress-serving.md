# Fast Static & WordPress Serving (F5.7)

STATIC/REACT and WORDPRESS projects no longer go through a per-deploy Nixpacks
build. Both now deploy fixed, pre-built Docker images — matching how Coolify,
CapRover, and Dokploy handle these project types.

## Static / React

- **No `buildCmd`**: the deploy skips Nixpacks entirely. `docker_manager.py`'s
  `cmd_deploy` bind-mounts the project's source directory read-only into a
  fixed `nginx:alpine` container (`system/templates/docker-compose/static.yml`).
- **With a `buildCmd`** (e.g. Vite): Nixpacks still builds the project once,
  into a throwaway image. `build_manager.py`'s `extract-static-output` command
  then pulls the build output directory (`dist`/`build`/`out`/`public`, tried
  in that order — `docker create` → `docker cp` → `docker rm`/`docker rmi`)
  onto the host at `<projectDir>/deploy/static-output`, discards the image,
  and that directory is bind-mounted the same way as the no-build case.
- **SPA fallback**: Nixpacks' own static provider handled `try_files`-style
  routing invisibly inside its built image; there was no first-party config
  for it. `docker_manager.py` now generates
  `system/templates/nginx/spa.conf.template` into `<projectDir>/deploy/nginx.conf`
  and bind-mounts it into the nginx container's `default.conf`.
- Redeploying without a build (`DeployService.deploy`, the no-rebuild path)
  reuses `deploy/static-output` if one already exists; if the project has a
  `buildCmd` but has never been built, it fails clearly instead of serving
  unbuilt source.

## WordPress

- Uses the official **`wordpress:php8.3-fpm-alpine`** (PHP-FPM only) +
  **`nginx:alpine`** pair (`system/templates/docker-compose/wordpress.yml`),
  instead of a Nixpacks-built PHP-FPM image with the entire WP core baked in.
- Two Compose services: `app` (PHP-FPM) and `web` (nginx, Traefik-facing).
  They share a named volume (`wp_core_<service>`) mounted at
  `/var/www/html`, which the official image seeds with WordPress core on
  first start. `wp-content` is bind-mounted from the host on both services
  at `/var/www/html/wp-content` — **only `wp-content` is user data that
  persists on the host**; core comes from the image.
- `nginx` proxies PHP requests to `app:9000` via FastCGI
  (`system/templates/nginx/wordpress.conf.template`).
- DB credentials flow in purely as `WORDPRESS_DB_*` container env vars —
  there is no host-side `wp-config.php` anymore.

### Database wiring (F2.6 integration)

WordPress install/import now require an existing F2.6 `Database` record
(`databaseId`) instead of freeform host/user/password fields:

- `WordPressService.install()`/`importSite()` look up the database via
  `DatabaseService.getById`, reject non-MySQL databases, and auto-link the
  database to the project (`Database.projectId`) if not already linked.
- The database's **container-internal name** (`internalHost`, e.g.
  `vexlyx-mysql`) is what's written to the project's `DB_HOST` env var and
  consumed by the compose template's `WORDPRESS_DB_HOST`.
- The database's **host-facing address** (`host`) is used for the host-side
  `mysqldump`/`mysql` CLI calls in export/import — these run from the API
  host, not inside a container, so they need the externally-reachable host,
  not the Docker-internal container name.

### `build_manager.py` command changes

- `cmd_wordpress_install`: only scaffolds `wp-content/{plugins,themes,uploads}`.
  No longer downloads WP core or writes `wp-config.php`.
- `cmd_wordpress_status`: "installed" now means `wp-content/plugins` exists.
  `coreVersion` is reported as `"unknown"` — the host can no longer read
  `wp-includes/version.php` since core isn't on the host; a live version
  needs a container `exec`, which is out of scope for this feature.
- `cmd_wordpress_export`/`cmd_wordpress_import`: only tar/restore
  `wp-content` + a DB dump (core is reproducible from the image). DB
  credentials are passed in directly from the resolved `Database` record —
  export no longer parses them out of a (now nonexistent) `wp-config.php`.

## `docker_manager.py` service-name convention

Every project type has a single `app` Compose service — except WordPress,
which has `app` (PHP-FPM) and `web` (nginx). `primary_service_name(project_type)`
returns `"web"` for WORDPRESS, `"app"` otherwise, and is used by
`get_container_id`, `cmd_status`, `cmd_logs`, and `cmd_logs_follow` so the
dashboard's status/logs reflect the Traefik-facing container.

## Known limitations

- **No automated migration** for WordPress projects deployed under the old
  full-core-in-image model. Their `wp-content` and database survive a
  redeploy under the new template, but anything written outside
  `wp-content` (custom core edits, a hand-edited `wp-config.php`) is lost —
  this is a one-time, deliberate behavior change on first redeploy.
- `cmd_wordpress_status`'s `coreVersion` is always `"unknown"` post-migration.
- WordPress's `app` and `web` containers are each capped independently at
  the project's configured memory limit (not a shared budget).
