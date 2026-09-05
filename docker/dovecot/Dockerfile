FROM alpine:3.20

# Install Dovecot (IMAP + auth + doveadm), OpenSSL, and utilities
RUN apk add --no-cache \
    dovecot \
    openssl \
    ca-certificates \
    bash

# Create required directories
RUN mkdir -p /etc/dovecot /etc/dovecot/certs /var/mail/vhosts /var/run/dovecot

# Copy configuration
COPY dovecot.conf /etc/dovecot/dovecot.conf
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

# Expose IMAP (143), IMAPS (993), and the internal SASL auth port (12345)
EXPOSE 143 993 12345

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
