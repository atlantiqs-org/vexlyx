#!/usr/bin/env bash
# Builds the dashboard and api container images. Needs to happen before the
# migration/admin-user steps, which run one-off tasks against the api image
# via `docker compose run`.
set -euo pipefail

log_step "[10/16] Building panel Docker images"

COMPOSE=(docker compose --env-file "${VEXLYX_SECRETS_FILE}" -f docker-compose.yml -f docker-compose.prod.yml)

"${COMPOSE[@]}" build dashboard api

log_ok "Panel images built."
