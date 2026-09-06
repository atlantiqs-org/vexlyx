# Vacation Auto-Responder (F4.7)

> **Feature:** F4.7 — Vacation Auto-Responder
> **Status:** 🟢 COMPLETED
> **Package:** `@vexlyx/api`, `@vexlyx/dashboard`, `@vexlyx/shared`
> **Depends on:** F4.1 (Postfix SMTP), F4.2 (Dovecot IMAP), F4.3 (Mailbox Management UI)
> **Protocols:** RFC 5228 (Sieve), RFC 5230 (Vacation Extension), RFC 5260 (Date & Index Extensions), LMTP

---

## 1. Overview

F4.7 introduces automated "out-of-office" vacation responders per mailbox. When active, incoming mail delivered to a mailbox automatically triggers an auto-reply to the original sender, rate-limited to once per sender within a configurable repeat interval (1–30 days), while keeping normal inbox delivery completely intact.

### Key Capabilities
- **Pigeonhole Sieve Processing:** Dovecot's Pigeonhole Sieve engine compiles and executes server-side Sieve scripts on incoming delivery.
- **Postfix -> Dovecot LMTP Delivery:** Mail delivery is handed off from Postfix to Dovecot via LMTP (`lmtp:dovecot:24`), enabling per-user Sieve script execution and automated response generation.
- **DKIM-Signed Auto-Replies:** Dovecot's Sieve vacation action relays outgoing replies back to Postfix (`submission_host = postfix:25`), ensuring all auto-replies are DKIM-signed and properly authenticated before dispatch.
- **Rate-Limiting & Duplicate Suppression:** The `:days` parameter suppresses duplicate replies to the same sender within the specified interval, tracked in Dovecot's duplicate database.
- **Optional Date Windows:** Support for scheduled vacation periods using Sieve's RFC 5260 `date` and `relational` extensions, active only within the specified date boundaries.
- **Per-Mailbox UI:** Tactile modal on the mailboxes table with instant status badge feedback.

---

## 2. Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Dashboard UI                     │
│  /mail → MailboxesPanel.tsx                                 │
│  - "Auto-reply" badge on active mailboxes                   │
│  - Palmtree action icon → VacationResponderDialog.tsx       │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Fastify API Server                      │
│  GET /api/mailboxes/:id/vacation                            │
│  PUT /api/mailboxes/:id/vacation                            │
└───────────────┬──────────────────────────────┬──────────────┘
                │                              │
                ▼                              ▼
┌───────────────────────────────┐ ┌───────────────────────────┐
│      PostgreSQL (Prisma)      │ │  system/python/           │
│  model VacationResponder      │ │  dovecot_manager.py       │
│  - mailboxId (unique)         │ │  - sync_vacation          │
│  - enabled, subject, message  │ │  - generate_sieve_script  │
│  - intervalDays, dates        │ └─────────────┬─────────────┘
└───────────────────────────────┘               │ Writes
                                                ▼
                         /var/mail/vhosts/<domain>/<user>/.dovecot.sieve
                                                │
                                                ▼
┌──────────────────┐           LMTP:24           ┌──────────────────┐
│  vexlyx-postfix  │────────────────────────────▶│  vexlyx-dovecot   │
│  (Port 25/587)   │                             │  (IMAP + LMTP)   │
│                  │◀────────────────────────────│  Pigeonhole runs │
└──────────────────┘     SMTP:25 (submission)    │  .dovecot.sieve  │
(signs with DKIM)                                └────────┬─────────┘
                                                          │ Stores message
                                                          ▼
                                            /var/mail/vhosts/.../Maildir
```

---

## 3. Configuration Specifications

### 1. Dovecot LMTP & Sieve Configuration (`docker/dovecot/dovecot.conf`)
- `protocols = imap lmtp`
- LMTP TCP Listener on Port 24:
  ```text
  service lmtp {
    inet_listener lmtp {
      port = 24
    }
  }
  ```
- Sieve Mail Plugin in LMTP:
  ```text
  protocol lmtp {
    mail_plugins = $mail_plugins sieve
  }
  ```
- Pigeonhole Plugin & Submission Relay:
  ```text
  plugin {
    quota = maildir:User quota
    sieve = /var/mail/vhosts/%d/%n/.dovecot.sieve
    sieve_default = /var/mail/vhosts/%d/%n/.dovecot.sieve
    sieve_vacation_send_from_recipient = yes
  }

  submission_host = postfix:25
  ```

### 2. Postfix Virtual Transport (`docker/postfix/main.cf`)
Postfix routes virtual mailboxes to Dovecot LMTP:
```text
virtual_transport = lmtp:dovecot:24
```
Recipient addresses are verified against `virtual_mailbox_maps` and `virtual_domains` before LMTP handoff, preventing open backscatter.

### 3. Docker Container (`docker/dovecot/Dockerfile`)
Installs `dovecot-lmtpd` and `dovecot-pigeonhole-plugin` on Alpine Linux, exposing port 24:
```dockerfile
RUN apk add --no-cache \
    dovecot \
    dovecot-lmtpd \
    dovecot-pigeonhole-plugin \
    openssl \
    ca-certificates \
    bash

EXPOSE 143 993 24 12345
```

---

## 4. Sieve Script Generation

Generated scripts strictly follow RFC 5228, RFC 5230, and RFC 5260:

### Standard Script
```sieve
require ["vacation"];

vacation
  :days 7
  :subject "Out of office: Vacation"
text:
I am currently away with limited access to email.
.
;
```

### Scheduled Date Window Script
```sieve
require ["vacation", "date", "relational"];

if allof (
  currentdate :value "ge" "date" "2026-10-01",
  currentdate :value "le" "date" "2026-10-15"
) {
  vacation
    :days 1
    :subject "Out of office"
    text:
I am away from Oct 1 to Oct 15.
.
;
}
```

- When `enabled=false`, `dovecot_manager.py` removes `.dovecot.sieve` and `.dovecot.svbin`.
- Script files use strict LF (`\n`) newlines to prevent Windows line-ending corruption in Linux containers.

---

## 5. API Endpoints

All endpoints require session authentication (`app.requireAuth`).

### `GET /api/mailboxes/:id/vacation`
Returns the vacation responder configuration for a mailbox. If none exists, returns default inactive configuration.

**Response:**
```json
{
  "responder": {
    "id": "cuid...",
    "mailboxId": "cuid...",
    "enabled": true,
    "subject": "Out of office: Auto-reply",
    "message": "Away on leave.",
    "intervalDays": 1,
    "startDate": "2026-10-01T00:00:00.000Z",
    "endDate": "2026-10-15T00:00:00.000Z",
    "createdAt": "2026-09-06T05:50:00.000Z",
    "updatedAt": "2026-09-06T05:55:00.000Z"
  }
}
```

### `PUT /api/mailboxes/:id/vacation`
Upserts the vacation responder configuration in PostgreSQL and synchronizes the `.dovecot.sieve` script on disk.

**Request Body:**
```json
{
  "enabled": true,
  "subject": "Out of office: Vacation",
  "message": "I will respond upon my return.",
  "intervalDays": 3,
  "startDate": "2026-10-01T00:00:00.000Z",
  "endDate": "2026-10-15T00:00:00.000Z"
}
```

---

## 6. How to Test

### Automated Tests
Run the dedicated test suite:
```bash
python -m unittest tests.test_vacation_responder -v
```

Tests verify:
- Sieve script generation syntax and dot-stuffing.
- Enabling/disabling script persistence on disk.
- Date condition inclusion (RFC 5260).
- Configuration syntax for Dovecot LMTP, Pigeonhole, and Postfix routing.
- Fastify API route authentication enforcement (401).

### Full Mail Subsystem Test Run
```bash
python -m unittest tests.test_vacation_responder tests.test_dovecot_imap tests.test_postfix_smtp -v
```

---

## 7. How to Extend

- **Custom Sieve Rules:** The current implementation uses Sieve's `vacation` action. This can be extended in future phases to support custom server-side filter rules (e.g. forward to another address or move spam to Junk folder) by adding more action blocks to `.dovecot.sieve`.
- **ManageSieve Protocol:** For power users or third-party webmail clients, ManageSieve (port 4190) can be exposed in Dovecot by installing `dovecot-managesieved`.
