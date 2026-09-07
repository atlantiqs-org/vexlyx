#!/usr/bin/env bash
# Renders docker/traefik/traefik.prod.yml from its .tmpl with the real ACME
# email. Regenerated on every run (cheap, deterministic, installer-owned —
# not a file operators are expected to hand-edit) so a changed admin email
# is picked up on re-run instead of needing a manual reset.
set -euo pipefail

log_step "[7/16] Rendering production Traefik config"

sed "s/__ACME_EMAIL__/${VEXLYX_ADMIN_EMAIL}/" \
  docker/traefik/traefik.prod.yml.tmpl > docker/traefik/traefik.prod.yml

log_ok "docker/traefik/traefik.prod.yml rendered."

# docker/traefik/acme.json is gitignored, so on a fresh checkout it doesn't
# exist yet. If Docker Compose is left to bind-mount a missing file, it
# auto-creates it as root:root 644 — and Traefik refuses to use an ACME
# storage file that isn't exactly 600, silently disabling the letsencrypt
# resolver (every router referencing it then logs "nonexistent certificate
# resolver"). `touch` is a no-op on an existing file, so this never discards
# real certificate data on a re-run.
touch docker/traefik/acme.json
chmod 600 docker/traefik/acme.json
log_ok "docker/traefik/acme.json ready (mode 600)."
