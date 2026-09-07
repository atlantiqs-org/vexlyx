#!/usr/bin/env bash
# Configures UFW. Rule order matters here: every allow rule is added BEFORE
# enabling the firewall, and the SSH rule is verified present first, so a
# fresh install can never lock the operator out over the same connection
# they're running this script from.
set -euo pipefail

log_step "[15/16] Configuring firewall (UFW)"

ufw --force default deny incoming
ufw --force default allow outgoing

ssh_ports="$(ss -tlnp 2>/dev/null | awk '/sshd/ {print $4}' | sed -E 's/.*:([0-9]+)$/\1/' | sort -u)"
if [[ -z "${ssh_ports}" ]]; then
  ssh_ports="22"
  log_warn "Could not detect sshd's listening port — defaulting to 22/tcp."
fi
for port in ${ssh_ports}; do
  ufw allow "${port}/tcp" comment "SSH"
done

ufw allow 80/tcp comment "HTTP / ACME challenge"
ufw allow 443/tcp comment "HTTPS"
ufw allow 25/tcp comment "SMTP"
ufw allow 587/tcp comment "SMTP submission"
ufw allow 143/tcp comment "IMAP"
ufw allow 993/tcp comment "IMAPS"

if [[ "${VEXLYX_ENABLE_PUBLIC_DNS}" == "true" ]]; then
  ufw allow 53/tcp comment "DNS"
  ufw allow 53/udp comment "DNS"
  log_info "Public DNS explicitly enabled (VEXLYX_ENABLE_PUBLIC_DNS=true) — port 53 opened."
else
  log_info "Port 53 (DNS) left closed. Set VEXLYX_ENABLE_PUBLIC_DNS=true to open it if this server should be a public nameserver."
fi

for port in ${ssh_ports}; do
  # `ufw status` only lists rules once the firewall is active — while
  # inactive (deliberately, until this check passes) it just prints "Status:
  # inactive" with no rules at all, even though they really were added.
  # `ufw show added` lists the configured rule set regardless of active state.
  ufw show added | grep -q "allow ${port}/tcp" || die "SSH rule for port ${port} failed to apply — refusing to enable UFW."
done

ufw --force enable
log_ok "UFW enabled. Rules:"
ufw status verbose
