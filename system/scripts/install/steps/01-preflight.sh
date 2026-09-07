#!/usr/bin/env bash
# Preflight checks — OS/arch sanity. Root is already enforced by run.sh
# before any step (including this one) runs.
set -euo pipefail

log_step "[1/16] Preflight checks"

install -d -m 0700 "${VEXLYX_SECRETS_DIR}"

if [[ -f /etc/os-release ]]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  if [[ "${ID:-}" == "ubuntu" && "${VERSION_ID:-}" == "24.04" ]]; then
    log_ok "Ubuntu 24.04 detected."
  else
    log_warn "This installer targets Ubuntu 24.04 (detected: ${PRETTY_NAME:-unknown})."
    log_warn "Continuing anyway — some steps may behave differently on other distros."
  fi
else
  log_warn "Could not detect the OS (/etc/os-release missing). Continuing anyway."
fi

arch="$(uname -m)"
case "${arch}" in
  x86_64|aarch64) log_ok "Architecture: ${arch}" ;;
  *) log_warn "Untested architecture: ${arch}. Docker/Nixpacks images may not have builds for it." ;;
esac
