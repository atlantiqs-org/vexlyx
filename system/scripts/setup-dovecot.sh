#!/usr/bin/env bash
# ==============================================================================
# Vexlyx — Production Host Setup for Dovecot IMAP Server (F4.2)
# Targets: Ubuntu 22.04 / 24.04 LTS, Debian 12
# ==============================================================================
set -euo pipefail

echo "======================================================"
echo "  Vexlyx Dovecot IMAP Server Installer"
echo "======================================================"

if [[ $EUID -ne 0 ]]; then
   echo "[ERROR] This script must be run as root (or with sudo)." >&2
   exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "[1/6] Installing Dovecot IMAP and SSL tools..."
apt-get update -y
apt-get install -y dovecot-imapd dovecot-lmtpd ssl-cert

echo "[2/6] Creating the shared virtual mailbox uid/gid..."
# Fixed numeric ids shared with Postfix's virtual_uid_maps/virtual_gid_maps
# so both services agree on Maildir file ownership.
groupadd -g 5000 vmail 2>/dev/null || true
useradd -u 5000 -g vmail -d /var/mail/vhosts -s /usr/sbin/nologin -M vmail 2>/dev/null || true
mkdir -p /var/mail/vhosts
chown -R vmail:vmail /var/mail/vhosts

echo "[3/6] Setting up the virtual users database..."
mkdir -p /etc/dovecot
touch /etc/dovecot/users
chown root:dovecot /etc/dovecot/users
chmod 640 /etc/dovecot/users

echo "[4/6] Applying Dovecot configuration..."
cat <<'EOF' > /etc/dovecot/conf.d/99-vexlyx.conf
protocols = imap
mail_location = maildir:/var/mail/vhosts/%d/%n/Maildir
mail_home = /var/mail/vhosts/%d/%n
mail_uid = 5000
mail_gid = 5000
first_valid_uid = 5000
first_valid_gid = 5000

passdb {
  driver = passwd-file
  args = scheme=ARGON2ID username_format=%u /etc/dovecot/users
}
userdb {
  driver = passwd-file
  args = username_format=%u /etc/dovecot/users
}

disable_plaintext_auth = yes
ssl = required
ssl_cert = </etc/dovecot/certs/cert.pem
ssl_key = </etc/dovecot/certs/key.pem

mail_plugins = $mail_plugins quota
plugin {
  quota = maildir:User quota
}

service imap-login {
  inet_listener imap {
    port = 143
  }
  inet_listener imaps {
    port = 993
    ssl = yes
  }
}

service auth {
  unix_listener /var/spool/postfix/private/auth {
    mode = 0660
    user = postfix
    group = postfix
  }
}
EOF

echo "[5/6] Generating TLS certificate (self-signed placeholder — replace with"
echo "       your Let's Encrypt cert from F3.4 in production)..."
mkdir -p /etc/dovecot/certs
if [[ ! -f /etc/dovecot/certs/cert.pem ]]; then
  openssl req -new -newkey rsa:2048 -days 365 -nodes -x509 \
    -subj "/C=US/ST=State/L=City/O=Vexlyx/CN=mail.$(hostname -d || echo 'vexlyx.local')" \
    -keyout /etc/dovecot/certs/key.pem -out /etc/dovecot/certs/cert.pem
fi

echo "[6/6] Verifying syntax and enabling systemd service..."
dovecot -n
systemctl restart dovecot
systemctl enable dovecot

echo "======================================================"
echo "  Dovecot IMAP Server successfully configured!"
echo "  Ports 143 (IMAP) and 993 (IMAPS) are active."
echo "  Postfix SASL auth is served via the unix socket at"
echo "  /var/spool/postfix/private/auth (bare-metal setup only —"
echo "  the Docker dev environment uses a TCP auth listener instead)."
echo "======================================================"
