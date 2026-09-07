#!/usr/bin/env bash
# Creates the admin user via a one-off api container run. create-admin.ts
# only ever creates — see apps/api/prisma/create-admin.ts — so re-running
# this after an admin already exists is a safe no-op that never resets
# their password.
set -euo pipefail

log_step "[13/16] Creating admin user"

COMPOSE=(docker compose --env-file "${VEXLYX_SECRETS_FILE}" -f docker-compose.yml -f docker-compose.prod.yml)

"${COMPOSE[@]}" run --rm --no-deps \
  -e VEXLYX_ADMIN_EMAIL="${VEXLYX_ADMIN_EMAIL}" \
  -e VEXLYX_ADMIN_PASSWORD="${VEXLYX_ADMIN_PASSWORD}" \
  -e VEXLYX_ADMIN_NAME="${VEXLYX_ADMIN_NAME}" \
  api pnpm exec tsx prisma/create-admin.ts
