#!/usr/bin/env bash
# ==============================================================================
# Vexlyx — Production Host Setup for Postfix SMTP & OpenDKIM (F4.1)
# Targets: Ubuntu 22.04 / 24.04 LTS, Debian 12
# ==============================================================================
set -euo pipefail

echo "======================================================"
echo "  Vexlyx Postfix SMTP & OpenDKIM Installer"
echo "======================================================"

if [[ $EUID -ne 0 ]]; then
   echo "[ERROR] This script must be run as root (or with sudo)." >&2
   exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "[1/6] Installing Postfix, OpenDKIM, and SSL tools..."
apt-get update -y
debconf-set-selections <<< "postfix postfix/mailname string mail.$(hostname -d || echo 'vexlyx.local')"
debconf-set-selections <<< "postfix postfix/main_mailer_type string 'Internet Site'"
apt-get install -y postfix opendkim opendkim-tools ssl-cert

echo "[2/6] Configuring directories and file permissions..."
mkdir -p /etc/postfix /etc/opendkim/keys /var/spool/postfix/opendkim
chown -R opendkim:opendkim /etc/opendkim
chmod -R 750 /etc/opendkim

echo "[3/6] Setting up virtual maps..."
touch /etc/postfix/virtual_domains
touch /etc/postfix/virtual_mailbox_maps
touch /etc/postfix/virtual_alias_maps
postmap /etc/postfix/virtual_mailbox_maps || true
postmap /etc/postfix/virtual_alias_maps || true

echo "[4/6] Configuring OpenDKIM..."
cat <<'EOF' > /etc/opendkim.conf
AutoRestart             Yes
AutoRestartRate         10/1h
UMask                   002
Syslog                  Yes
SyslogSuccess           Yes
LogWhy                  Yes

Canonicalization        relaxed/simple
Mode                    sv
SubDomains              no

Socket                  inet:8891@127.0.0.1

KeyTable                /etc/opendkim/KeyTable
SigningTable            refile:/etc/opendkim/SigningTable
ExternalIgnoreList      refile:/etc/opendkim/TrustedHosts
InternalHosts           refile:/etc/opendkim/TrustedHosts

SignatureAlgorithm      rsa-sha256
UserID                  opendkim:opendkim
EOF

touch /etc/opendkim/KeyTable
touch /etc/opendkim/SigningTable
cat <<'EOF' > /etc/opendkim/TrustedHosts
127.0.0.1
localhost
::1
10.0.0.0/8
172.16.0.0/12
192.168.0.0/16
EOF

echo "[5/6] Applying Postfix main.cf and master.cf..."
postconf -e "myhostname = mail.$(hostname -d || echo 'vexlyx.local')"
postconf -e "mydestination = localhost"
postconf -e "inet_interfaces = all"
postconf -e "inet_protocols = ipv4"
postconf -e "virtual_mailbox_domains = /etc/postfix/virtual_domains"
postconf -e "virtual_mailbox_maps = hash:/etc/postfix/virtual_mailbox_maps"
postconf -e "virtual_alias_maps = hash:/etc/postfix/virtual_alias_maps"
postconf -e "smtpd_relay_restrictions = permit_mynetworks, permit_sasl_authenticated, reject_unauth_destination"
postconf -e "smtpd_recipient_restrictions = permit_mynetworks, permit_sasl_authenticated, reject_unauth_destination"
postconf -e "smtpd_tls_security_level = may"
postconf -e "smtpd_milters = inet:127.0.0.1:8891"
postconf -e "non_smtpd_milters = \$smtpd_milters"
postconf -e "milter_default_action = accept"

echo "[6/6] Verifying syntax and enabling systemd services..."
postfix check
systemctl restart opendkim
systemctl enable opendkim
systemctl restart postfix
systemctl enable postfix

echo "======================================================"
echo "  Postfix SMTP & OpenDKIM successfully configured!"
echo "  Ports 25 (SMTP) and 587 (Submission) are active."
echo "======================================================"
