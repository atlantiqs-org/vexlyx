#!/usr/bin/env bash
# Collects panel domain, admin credentials, and mail hostname — from env
# vars if set, interactively if attached to a TTY, otherwise safe generated
# defaults (see system/scripts/install/config.sh for the exact rules).
set -euo pipefail

log_step "[5/16] Collecting configuration"

collect_config

log_ok "Panel domain: ${VEXLYX_DOMAIN}"
log_ok "Admin email: ${VEXLYX_ADMIN_EMAIL}"
log_ok "Mail hostname: ${VEXLYX_MAIL_HOSTNAME}"
