#!/usr/bin/env bash
# Base apt packages needed by the rest of the installer and by the panel
# itself (git for repo clone/pull, ufw for firewalling, openssl for secret
# generation and self-signed cert fallback).
set -euo pipefail

log_step "[2/16] Installing base packages"

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends \
  ca-certificates curl gnupg git ufw openssl apt-transport-https

log_ok "Base packages installed."
