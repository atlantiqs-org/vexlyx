#!/usr/bin/env bash
# Brings up the stateful services first and waits for their health checks
# before anything that depends on them (migrations, admin user creation).
set -euo pipefail

log_step "[11/16] Starting database services"

COMPOSE=(docker compose --env-file "${VEXLYX_SECRETS_FILE}" -f docker-compose.yml -f docker-compose.prod.yml)

"${COMPOSE[@]}" up -d postgres mysql redis

wait_healthy() {
  local container="$1" tries=30
  while (( tries > 0 )); do
    status="$(docker inspect -f '{{.State.Health.Status}}' "${container}" 2>/dev/null || echo "starting")"
    [[ "${status}" == "healthy" ]] && { log_ok "${container} is healthy."; return 0; }
    sleep 2
    (( tries-- ))
  done
  die "${container} did not become healthy in time. Check: docker logs ${container}"
}

wait_healthy vexlyx-postgres
wait_healthy vexlyx-mysql
wait_healthy vexlyx-redis
