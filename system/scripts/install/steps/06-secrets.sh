#!/usr/bin/env bash
# Generates SESSION_SECRET, ENCRYPTION_KEY, and database passwords exactly
# once, persisted to /etc/vexlyx/vexlyx.env (0600). See generate_secrets()
# in config.sh for why re-running this never rotates an existing install's
# secrets.
set -euo pipefail

log_step "[6/16] Generating secrets"

generate_secrets
