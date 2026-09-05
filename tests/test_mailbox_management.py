"""
test_mailbox_management.py -- Automated test suite for F4.3 Mailbox Management UI.

Building real mailbox creation on top of F4.1 (Postfix) + F4.2 (Dovecot)
surfaced several pre-existing bugs in the mail stack that had never been
exercised end-to-end before. These tests are primarily regression tests for
those bugs -- see docs/dev/email/mailbox-management.md section 4 for the full
root-cause writeups.

Tests:
1. Dovecot passwd-file Argon2 PHC parameter reordering (regression test for
   Node's argon2 package emitting "m=..,p=..,t=.." while Dovecot's ARGON2ID
   parser requires the canonical "m=..,t=..,p=.." order -- silently breaks
   every IMAP login otherwise, with no error until the login attempt).
2. Dovecot real Maildir disk-usage calculation (get_usage / get_mailbox_usage).
3. Postfix virtual_mailbox_maps Maildir path format (domain/local/Maildir/,
   matching Dovecot's mail_location exactly -- was local/domain/ with no
   Maildir segment, so delivered mail was invisible to Dovecot).
4. Postfix virtual_domains plain-list format (no inline "# comment", which
   is invalid syntax for that unindexed lookup table).
5. Config files use LF-only line endings (regression test for Windows Python
   corrupting Linux-container config files with embedded \\r).
6. DKIM KeyTable stores the container-native path, not the host OS path, and
   self-heals a stale entry even when the key already exists on disk.
7. Live Fastify API security (401 Unauthorized on unauthenticated requests).
8. Live end-to-end (skipped gracefully if the dev stack isn't running):
   create a mailbox through the real API, log into it over real IMAPS with
   the returned password, delete it, and confirm login then fails.
"""

import http.cookiejar
import imaplib
import json
import os
import ssl
import subprocess
import sys
import unittest
import urllib.error
import urllib.request
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT_DIR = Path(__file__).resolve().parent.parent
API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:5000")
DOVECOT_USERS_FILE = ROOT_DIR / "docker" / "dovecot" / "config" / "users"
POSTFIX_CONFIG_DIR = ROOT_DIR / "docker" / "postfix" / "config"
VHOSTS_DIR = ROOT_DIR / "docker" / "mail-data" / "vhosts"


def run_dovecot_manager(cmd: str, payload: dict) -> dict:
    script = ROOT_DIR / "system" / "python" / "dovecot_manager.py"
    proc = subprocess.run(
        [sys.executable, str(script), cmd],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    assert proc.returncode == 0, f"dovecot_manager failed (code {proc.returncode}): {proc.stderr}"
    return json.loads(proc.stdout.strip())


def run_postfix_manager(cmd: str, payload: dict) -> dict:
    script = ROOT_DIR / "system" / "python" / "postfix_manager.py"
    proc = subprocess.run(
        [sys.executable, str(script), cmd],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    assert proc.returncode == 0, f"postfix_manager failed (code {proc.returncode}): {proc.stderr}"
    return json.loads(proc.stdout.strip())


class TestDovecotArgon2ParamOrder(unittest.TestCase):
    """Regression tests for the Node argon2 (m,p,t) vs Dovecot (m,t,p) PHC order bug."""

    def setUp(self):
        self._original_users_content = (
            DOVECOT_USERS_FILE.read_text(encoding="utf-8") if DOVECOT_USERS_FILE.exists() else ""
        )

    def tearDown(self):
        DOVECOT_USERS_FILE.write_text(self._original_users_content, encoding="utf-8", newline="\n")

    def test_01_reorders_node_style_hash(self):
        """A Node-argon2-style hash (m,p,t order) must be rewritten to Dovecot's (m,t,p) order."""
        domain = "test-argon2-order.org"
        node_style_hash = "$argon2id$v=19$m=65536,p=4,t=3$c2FsdHNhbHRzYWx0$aGFzaGhhc2hoYXNoaGFzaA"

        run_dovecot_manager(
            "sync_mailboxes",
            {
                "domains": [domain],
                "mailboxes": [{"address": f"user@{domain}", "passwordHash": node_style_hash, "quotaMb": 256}],
            },
        )

        content = DOVECOT_USERS_FILE.read_text(encoding="utf-8")
        self.assertIn("m=65536,t=3,p=4", content, "Parameters must be reordered to Dovecot's canonical m,t,p order")
        self.assertNotIn("m=65536,p=4,t=3", content, "The broken m,p,t order must not reach the passwd-file")
        # Salt/digest bytes themselves must be untouched -- only the parameter order changes.
        self.assertIn("c2FsdHNhbHRzYWx0$aGFzaGhhc2hoYXNoaGFzaA", content)

    def test_02_leaves_already_correct_order_unchanged(self):
        """A hash already in Dovecot's (m,t,p) order (e.g. from doveadm pw) must pass through untouched."""
        domain = "test-argon2-order.org"
        dovecot_style_hash = "$argon2id$v=19$m=65536,t=3,p=1$c2FsdHNhbHQ$aGFzaGhhc2g"

        run_dovecot_manager(
            "sync_mailboxes",
            {
                "domains": [domain],
                "mailboxes": [{"address": f"user2@{domain}", "passwordHash": dovecot_style_hash, "quotaMb": 256}],
            },
        )

        content = DOVECOT_USERS_FILE.read_text(encoding="utf-8")
        self.assertIn("m=65536,t=3,p=1", content)

    def test_03_ignores_non_argon2_hash(self):
        """A hash without the m=,p=,t= pattern (e.g. a different scheme) must not be mangled."""
        domain = "test-argon2-order.org"
        other_hash = "{PLAIN}not-actually-argon2"

        run_dovecot_manager(
            "sync_mailboxes",
            {
                "domains": [domain],
                "mailboxes": [{"address": f"user3@{domain}", "passwordHash": other_hash, "quotaMb": 256}],
            },
        )

        content = DOVECOT_USERS_FILE.read_text(encoding="utf-8")
        self.assertIn("not-actually-argon2", content)


class TestDovecotMailboxUsage(unittest.TestCase):
    """Unit tests for real Maildir disk-usage calculation (F4.3)."""

    def setUp(self):
        self.domain = "test-usage-mail.org"
        self.local_part = "usageuser"
        self.maildir = VHOSTS_DIR / self.domain / self.local_part / "Maildir" / "new"
        self.maildir.mkdir(parents=True, exist_ok=True)

    def tearDown(self):
        import shutil

        target = VHOSTS_DIR / self.domain
        if target.exists():
            shutil.rmtree(target, ignore_errors=True)

    def test_01_sums_real_file_sizes(self):
        (self.maildir / "msg1").write_bytes(b"x" * 100)
        (self.maildir / "msg2").write_bytes(b"y" * 250)

        res = run_dovecot_manager("get_usage", {"addresses": [f"{self.local_part}@{self.domain}"]})

        self.assertEqual(res["usage"][f"{self.local_part}@{self.domain}"], 350)

    def test_02_missing_mailbox_returns_zero(self):
        res = run_dovecot_manager("get_usage", {"addresses": [f"nobody@{self.domain}"]})
        self.assertEqual(res["usage"][f"nobody@{self.domain}"], 0)

    def test_03_batches_multiple_addresses_in_one_call(self):
        (self.maildir / "msg1").write_bytes(b"z" * 42)
        res = run_dovecot_manager(
            "get_usage",
            {"addresses": [f"{self.local_part}@{self.domain}", f"ghost@{self.domain}"]},
        )
        self.assertEqual(res["usage"][f"{self.local_part}@{self.domain}"], 42)
        self.assertEqual(res["usage"][f"ghost@{self.domain}"], 0)


class TestPostfixMailboxMapFormat(unittest.TestCase):
    """Regression tests for the virtual_mailbox_maps Maildir path format bug."""

    def test_01_maildir_path_matches_dovecot_layout(self):
        """
        Right-hand side of virtual_mailbox_maps must be "<domain>/<local>/Maildir/"
        to match Dovecot's mail_location (dovecot.conf: maildir:/var/mail/vhosts/%d/%n/Maildir).
        Getting the order reversed or dropping the "Maildir" segment means mail is
        delivered somewhere Dovecot's IMAP will never look, even though Postfix
        reports successful delivery.
        """
        domain = "test-maildir-format.org"
        address = f"someone@{domain}"

        run_postfix_manager("sync_virtual_domains", {"domains": [domain], "mailboxes": [address]})

        content = (POSTFIX_CONFIG_DIR / "virtual_mailbox_maps").read_text(encoding="utf-8")
        self.assertIn(f"{address} {domain}/someone/Maildir/", content)
        self.assertNotIn(f"someone/{domain}/", content, "Must not use the reversed local/domain order")

    def test_02_virtual_domains_has_no_inline_comment(self):
        """
        virtual_mailbox_domains has no lmdb:/hash: prefix in main.cf, so Postfix
        parses it as a plain domain list -- a trailing "# comment" on the same
        line is invalid syntax there and Postfix logs a parse warning on every
        lookup (cosmetic, but indicates the file isn't in the format Postfix expects).
        """
        domain = "test-maildir-format.org"
        run_postfix_manager("sync_virtual_domains", {"domains": [domain], "mailboxes": []})

        content = (POSTFIX_CONFIG_DIR / "virtual_domains").read_text(encoding="utf-8")
        self.assertIn(domain, content)
        self.assertNotIn("#", content, "virtual_domains must be a plain domain list with no inline comments")

    def test_03_config_files_use_lf_only(self):
        """
        Python's write_text() on Windows defaults to os.linesep ("\\r\\n"),
        which corrupts these files for the Linux Postfix container -- must be
        forced to LF-only regardless of host OS.
        """
        domain = "test-maildir-format.org"
        run_postfix_manager("sync_virtual_domains", {"domains": [domain], "mailboxes": [f"x@{domain}"]})

        for name in ("virtual_domains", "virtual_mailbox_maps"):
            raw = (POSTFIX_CONFIG_DIR / name).read_bytes()
            self.assertNotIn(b"\r", raw, f"{name} must not contain CR bytes")


class TestDkimContainerPath(unittest.TestCase):
    """Regression tests for the DKIM KeyTable host-path-vs-container-path bug."""

    def test_01_new_key_uses_container_native_path(self):
        domain = "test-dkim-container-path.org"
        run_postfix_manager("generate_dkim", {"domain": domain, "selector": "default", "keyLength": 2048})

        key_table = (ROOT_DIR / "docker" / "postfix" / "opendkim" / "KeyTable").read_text(encoding="utf-8")
        line = next(l for l in key_table.splitlines() if f"default._domainkey.{domain}" in l)

        self.assertIn(f"/etc/opendkim/keys/{domain}/default.private", line)
        self.assertNotIn("\\", line, "KeyTable must never contain a Windows-style backslash path")
        self.assertNotIn(":\\", line, "KeyTable must never contain a Windows drive letter")

    def test_02_existing_key_self_heals_stale_entry(self):
        """
        Calling generate_dkim again for a domain whose key already exists on disk
        (the "early return" branch) must still repair a stale/incorrect KeyTable
        path rather than silently leaving it broken.
        """
        domain = "test-dkim-container-path.org"
        key_table_path = ROOT_DIR / "docker" / "postfix" / "opendkim" / "KeyTable"

        # Corrupt the existing entry the way the original bug used to write it.
        content = key_table_path.read_text(encoding="utf-8")
        corrupted = content.replace(
            f"/etc/opendkim/keys/{domain}/default.private",
            f"C:\\fake\\host\\path\\{domain}\\default.private",
        )
        key_table_path.write_text(corrupted, encoding="utf-8", newline="\n")
        self.assertIn("C:\\fake\\host\\path", key_table_path.read_text(encoding="utf-8"))

        # Key files already exist on disk, so this hits the "early return" branch.
        run_postfix_manager("generate_dkim", {"domain": domain, "selector": "default", "keyLength": 2048})

        healed = key_table_path.read_text(encoding="utf-8")
        self.assertNotIn("C:\\fake\\host\\path", healed, "Stale host-path entry must self-heal")
        self.assertIn(f"/etc/opendkim/keys/{domain}/default.private", healed)


class TestMailboxApiSecurity(unittest.TestCase):
    """Verifies that all Fastify /api/mailboxes endpoints enforce authentication."""

    def test_01_unauthenticated_requests_return_401(self):
        endpoints = [
            ("GET", f"{API_BASE_URL}/api/mailboxes"),
            ("POST", f"{API_BASE_URL}/api/mailboxes"),
            ("DELETE", f"{API_BASE_URL}/api/mailboxes/dummy-id"),
            ("PATCH", f"{API_BASE_URL}/api/mailboxes/dummy-id/quota"),
            ("POST", f"{API_BASE_URL}/api/mailboxes/dummy-id/reset-password"),
        ]

        for method, url in endpoints:
            req = urllib.request.Request(url, method=method)
            # Fastify rejects DELETE/PATCH/POST requests that declare a JSON
            # content-type but carry no body -- only set it when sending one
            # (matches apps/dashboard/src/lib/api.ts's fetchAPI convention).
            if method in ("POST", "PATCH"):
                req.data = b"{}"
                req.add_header("Content-Type", "application/json")

            try:
                with urllib.request.urlopen(req) as resp:
                    self.fail(f"Expected 401 Unauthorized for {method} {url}, got {resp.status}")
            except urllib.error.HTTPError as e:
                self.assertEqual(e.code, 401, f"Expected 401 for {method} {url}, got {e.code}")
            except urllib.error.URLError:
                # If the API server is not running during an isolated test run, skip the live assertion.
                pass


class TestMailboxLiveEndToEnd(unittest.TestCase):
    """
    Live end-to-end test: create a mailbox through the real API, log into it
    over real IMAPS with the password the API returns, delete it, and confirm
    login then fails. Skipped gracefully if the dev stack isn't running.

    This is the strongest regression guard for the Argon2 param-order bug --
    it is the one test that would have caught it, since every other check
    (schema validation, hash-format inspection) considered the broken hash
    well-formed.
    """

    ADMIN_EMAIL = "admin@vexlyx.local"
    ADMIN_PASSWORD = "admin123"

    def setUp(self):
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )
        self._created_mailbox_id = None

        try:
            self._post(f"{API_BASE_URL}/api/auth/login", {"email": self.ADMIN_EMAIL, "password": self.ADMIN_PASSWORD})
        except (urllib.error.URLError, ConnectionRefusedError, OSError):
            self.skipTest("API server is not reachable on :5000 (dev stack not running)")
            return

        try:
            domains = self._get(f"{API_BASE_URL}/api/domains")
        except urllib.error.URLError:
            self.skipTest("Could not list domains (dev stack not fully running)")
            return

        if not domains:
            self.skipTest("No domains available to attach a test mailbox to")
            return
        self.domain_id = domains[0]["id"]
        self.hostname = domains[0]["hostname"]

    def tearDown(self):
        if self._created_mailbox_id:
            try:
                self._delete(f"{API_BASE_URL}/api/mailboxes/{self._created_mailbox_id}")
            except Exception:
                pass

    def _request(self, url, method="GET", body=None):
        data = json.dumps(body).encode("utf-8") if body is not None else None
        req = urllib.request.Request(url, data=data, method=method)
        # Only set Content-Type when actually sending a body -- Fastify
        # rejects a declared JSON content-type on a bodyless request.
        if data is not None:
            req.add_header("Content-Type", "application/json")
        with self.opener.open(req, timeout=10) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else None

    def _get(self, url):
        return self._request(url, "GET")

    def _post(self, url, body=None):
        return self._request(url, "POST", body or {})

    def _delete(self, url):
        return self._request(url, "DELETE")

    def _imaps_login(self, address, password):
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        conn = imaplib.IMAP4_SSL("127.0.0.1", 993, ssl_context=context, timeout=5)
        try:
            return conn.login(address, password)
        finally:
            conn.logout()

    def test_01_create_login_delete_login_fails(self):
        create_res = self._post(
            f"{API_BASE_URL}/api/mailboxes",
            {"localPart": "e2etest", "domainId": self.domain_id, "quota": 256},
        )
        self._created_mailbox_id = create_res["mailbox"]["id"]
        address = create_res["mailbox"]["address"]
        password = create_res["password"]

        self._post(f"{API_BASE_URL}/api/mail/sync")

        try:
            typ, _ = self._imaps_login(address, password)
        except (ConnectionRefusedError, OSError, TimeoutError):
            self.skipTest("Dovecot container is not reachable on 127.0.0.1:993 (dev stack not running)")
            return
        self.assertEqual(typ, "OK", "Real IMAPS login with the API-returned password must succeed")

        self._delete(f"{API_BASE_URL}/api/mailboxes/{self._created_mailbox_id}")
        self._created_mailbox_id = None
        self._post(f"{API_BASE_URL}/api/mail/sync")

        with self.assertRaises(imaplib.IMAP4.error):
            self._imaps_login(address, password)


if __name__ == "__main__":
    unittest.main(verbosity=2)
