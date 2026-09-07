#!/usr/bin/env bash
# Applies Prisma migrations via a one-off run of the api image (not the host
# pnpm install from step 09) — postgres is only reachable by service name on
# the Docker network now that docker-compose.prod.yml stops publishing its
# port to the host.
set -euo pipefail

log_step "[12/16] Running database migrations"

COMPOSE=(docker compose --env-file "${VEXLYX_SECRETS_FILE}" -f docker-compose.yml -f docker-compose.prod.yml)

"${COMPOSE[@]}" run --rm --no-deps api pnpm exec prisma migrate deploy

log_ok "Migrations applied."
