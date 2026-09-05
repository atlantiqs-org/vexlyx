<?php
// Dovecot/Postfix (F4.1/F4.2) use a self-signed TLS certificate in
// development — the same one desktop mail clients get a trust warning for
// (see the Mailboxes tab's "Mail Client Setup" dialog). Roundcube's PHP
// IMAP/SMTP client has no interactive "trust this certificate" prompt, so
// without this override STARTTLS silently fails and every login attempt
// comes back as "Login failed", even with correct credentials.
$config['imap_conn_options'] = [
    'ssl' => [
        'verify_peer' => false,
        'verify_peer_name' => false,
        'allow_self_signed' => true,
    ],
];

$config['smtp_conn_options'] = [
    'ssl' => [
        'verify_peer' => false,
        'verify_peer_name' => false,
        'allow_self_signed' => true,
    ],
];
