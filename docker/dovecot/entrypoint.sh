#!/bin/sh
set -e

echo "[Vexlyx] Initializing Dovecot IMAP Server..."

# 1. TLS Certificates
mkdir -p /etc/dovecot/certs
if [ ! -f /etc/dovecot/certs/cert.pem ] || [ ! -f /etc/dovecot/certs/key.pem ]; then
    echo "[Vexlyx] Generating self-signed TLS certificates..."
    openssl req -new -newkey rsa:2048 -days 365 -nodes -x509 \
        -subj "/C=US/ST=State/L=City/O=Vexlyx/CN=${MYHOSTNAME:-mail.vexlyx.local}" \
        -keyout /etc/dovecot/certs/key.pem -out /etc/dovecot/certs/cert.pem
    chmod 600 /etc/dovecot/certs/key.pem
    chmod 644 /etc/dovecot/certs/cert.pem
fi

# 2. Virtual mailbox base directory (shared with Postfix via bind mount)
# Fixed uid:gid 5000:5000 must match mail_uid/mail_gid in dovecot.conf and
# virtual_uid_maps/virtual_gid_maps in Postfix's main.cf.
mkdir -p /var/mail/vhosts
chown -R 5000:5000 /var/mail/vhosts 2>/dev/null || true

# Index cache directory — container-local (not bind-mounted), see the
# INDEX= comment in dovecot.conf for why.
mkdir -p /var/indexes
chown -R 5000:5000 /var/indexes 2>/dev/null || true

# 3. Virtual users database (passdb + userdb), synced from Postgres by
# dovecot_manager.py sync_mailboxes. The unprivileged "dovecot" auth worker
# process needs read access, so it's group-owned by "dovecot" (not root) and
# not group/other writable.
mkdir -p /etc/dovecot
touch /etc/dovecot/users
chown root:dovecot /etc/dovecot/users
chmod 640 /etc/dovecot/users

# Seed dev test mailboxes so IMAPS login can be exercised before F4.3 ships
# real mailbox creation. Password: "vexlyx-dev".
# Checked by address (not file emptiness) so a real dovecot_manager.py
# sync_mailboxes run — which rewrites entries for DB-known domains — never
# permanently wipes these two dev fixtures on a later container restart.
# Disabled in production (F5.1 sets VEXLYX_SEED_DEV_FIXTURES=false) so a
# fresh install never ships a mailbox with a known, hardcoded password.
if [ "${VEXLYX_SEED_DEV_FIXTURES:-true}" = "true" ] && ! grep -q "^test@vexlyx.local:" /etc/dovecot/users 2>/dev/null; then
    echo "[Vexlyx] Seeding dev test mailboxes (test@vexlyx.local / admin@vexlyx.local)..."
    HASH=$(doveadm pw -s ARGON2ID -p "vexlyx-dev")
    mkdir -p /var/mail/vhosts/vexlyx.local/test/Maildir/cur /var/mail/vhosts/vexlyx.local/test/Maildir/new /var/mail/vhosts/vexlyx.local/test/Maildir/tmp
    mkdir -p /var/mail/vhosts/vexlyx.local/admin/Maildir/cur /var/mail/vhosts/vexlyx.local/admin/Maildir/new /var/mail/vhosts/vexlyx.local/admin/Maildir/tmp
    chown -R 5000:5000 /var/mail/vhosts
    {
      echo "test@vexlyx.local:${HASH}:5000:5000::::userdb_quota_rule=*:storage=1024M"
      echo "admin@vexlyx.local:${HASH}:5000:5000::::userdb_quota_rule=*:storage=1024M"
    } >> /etc/dovecot/users
    chmod 640 /etc/dovecot/users
fi

echo "[Vexlyx] Starting Dovecot IMAP on ports 143 and 993 (SASL auth on 12345)..."
exec dovecot -F -c /etc/dovecot/dovecot.conf
