#!/usr/bin/env bash
# Creates the external `traefik-net` Docker network every service (dev and
# prod) joins — the same network docker_manager.py's ensure_traefik_network()
# creates on demand for user project containers.
set -euo pipefail

log_step "[8/16] Configuring Docker network"

if docker network inspect traefik-net >/dev/null 2>&1; then
  log_ok "Docker network 'traefik-net' already exists."
else
  docker network create traefik-net
  log_ok "Created Docker network 'traefik-net'."
fi
