#!/usr/bin/env bash
# Docker Engine + Compose v2 plugin, via Docker's official apt repository.
# Idempotent: skipped entirely if a working `docker compose` already exists.
set -euo pipefail

log_step "[3/16] Installing Docker Engine + Compose"

if has_cmd docker && docker compose version >/dev/null 2>&1; then
  log_ok "Docker + Compose already installed ($(docker --version))."
else
  install -d -m 0755 /etc/apt/keyrings
  if [[ ! -f /etc/apt/keyrings/docker.asc ]]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
  fi

  . /etc/os-release
  codename="${VERSION_CODENAME:-noble}"
  cat > /etc/apt/sources.list.d/docker.list <<EOF
deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${codename} stable
EOF

  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y --no-install-recommends \
    docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  log_ok "Docker Engine + Compose plugin installed."
fi

systemctl enable --now docker
docker info >/dev/null 2>&1 || die "Docker daemon is not responding after install."
log_ok "Docker daemon is running."
