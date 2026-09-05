#!/bin/sh
set -e

echo "[Vexlyx] Initializing Postfix SMTP & OpenDKIM..."

# 1. TLS Certificates
mkdir -p /etc/postfix/certs
if [ ! -f /etc/postfix/certs/cert.pem ] || [ ! -f /etc/postfix/certs/key.pem ]; then
    echo "[Vexlyx] Generating self-signed TLS certificates for development..."
    openssl req -new -newkey rsa:2048 -days 365 -nodes -x509 \
        -subj "/C=US/ST=State/L=City/O=Vexlyx/CN=mail.vexlyx.local" \
        -keyout /etc/postfix/certs/key.pem -out /etc/postfix/certs/cert.pem
    chmod 600 /etc/postfix/certs/key.pem
    chmod 644 /etc/postfix/certs/cert.pem
fi

# 2. Virtual Maps
mkdir -p /etc/postfix
touch /etc/postfix/virtual_domains
touch /etc/postfix/virtual_mailbox_maps
touch /etc/postfix/virtual_alias_maps
# Must not be group/other writable — postfix check rejects 666/664 config files
chmod 640 /etc/postfix/virtual_domains
chmod 640 /etc/postfix/virtual_mailbox_maps
chmod 640 /etc/postfix/virtual_alias_maps
# 3. Virtual Mailbox Base Directory
# Required by Postfix virtual delivery agent (virtual_mailbox_base in main.cf)
mkdir -p /var/mail/vhosts/vexlyx.local/test
chown -R 101:12 /var/mail/vhosts 2>/dev/null || true

# Seed a test mailbox so virtual delivery succeeds in dev (Dovecot handles this in prod)
if [ ! -s /etc/postfix/virtual_mailbox_maps ]; then
    echo "test@vexlyx.local vexlyx.local/test/Maildir/" > /etc/postfix/virtual_mailbox_maps
    echo "admin@vexlyx.local vexlyx.local/test/Maildir/" >> /etc/postfix/virtual_mailbox_maps
fi
postmap /etc/postfix/virtual_mailbox_maps || true
postmap /etc/postfix/virtual_alias_maps || true

# Fix all spool directory ownership (must run as root before postfix starts)
# Without this, Postfix's cleanup daemon fails with: 451 queue file write error
echo "[Vexlyx] Running postfix set-permissions to fix spool directory ownership..."
postfix set-permissions 2>&1 || true

# 3. OpenDKIM Setup
mkdir -p /etc/opendkim/keys
touch /etc/opendkim/KeyTable
touch /etc/opendkim/SigningTable
if [ ! -f /etc/opendkim/TrustedHosts ]; then
    cat <<EOF > /etc/opendkim/TrustedHosts
127.0.0.1
localhost
::1
10.0.0.0/8
172.16.0.0/12
192.168.0.0/16
EOF
fi
chown -R opendkim:opendkim /etc/opendkim || true
chmod -R 750 /etc/opendkim || true

# 4. Fix spool directory permissions (Docker volumes on Windows reset ownership)
# The maildrop dir must be owned postfix:postdrop with setgid so postfix can
# write queue files. Without this, Postfix returns: 451 queue file write error
echo "[Vexlyx] Fixing /var/spool/postfix permissions..."
postfix set-permissions 2>/dev/null || true
chown postfix:postdrop /var/spool/postfix/maildrop 2>/dev/null || true
chmod 730 /var/spool/postfix/maildrop 2>/dev/null || true
chmod g+s /var/spool/postfix/maildrop 2>/dev/null || true

# 5. Start OpenDKIM in background
echo "[Vexlyx] Starting OpenDKIM Milter on port 8891..."
opendkim -x /etc/opendkim/opendkim.conf || true

# 5. Start Postfix in foreground
echo "[Vexlyx] Starting Postfix MTA on ports 25 and 587..."
exec postfix start-fg
