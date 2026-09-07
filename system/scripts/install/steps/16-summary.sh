#!/usr/bin/env bash
set -euo pipefail

log_step "[16/16] Done"

echo ""
echo "  Vexlyx is installed."
echo ""
echo "  Panel:        https://${VEXLYX_DOMAIN}"
echo "  Admin email:  ${VEXLYX_ADMIN_EMAIL}"
if [[ "${ADMIN_PASSWORD_WAS_GENERATED}" == "true" ]]; then
  echo "  Admin password (generated, shown once): ${VEXLYX_ADMIN_PASSWORD}"
  echo "  Save this now — it is not stored anywhere and cannot be recovered."
else
  echo "  Admin password: the one you provided via VEXLYX_ADMIN_PASSWORD."
fi
echo ""
echo "  Install root:  ${VEXLYX_HOME}"
echo "  Secrets file:  ${VEXLYX_SECRETS_FILE} (mode 0600 — back this up)"
echo ""
echo "  Manage the stack:"
echo "    cd ${VEXLYX_HOME}"
echo "    docker compose --env-file ${VEXLYX_SECRETS_FILE} -f docker-compose.yml -f docker-compose.prod.yml ps"
echo "    docker compose --env-file ${VEXLYX_SECRETS_FILE} -f docker-compose.yml -f docker-compose.prod.yml logs -f"
echo ""
echo "  To upgrade or repair the install, just re-run install.sh — every step is safe to run again."
echo ""
if ! docker compose --env-file "${VEXLYX_SECRETS_FILE}" -f docker-compose.yml -f docker-compose.prod.yml \
    exec -T traefik cat /etc/traefik/acme.json 2>/dev/null | grep -q '"Certificate"'; then
  log_warn "No Let's Encrypt certificate detected yet for ${VEXLYX_DOMAIN}."
  log_warn "If ${VEXLYX_DOMAIN} does not yet point at this server's public IP, Traefik will keep retrying automatically once DNS propagates — the panel is reachable over HTTPS with a browser warning in the meantime."
fi
