"""
test_vacation_responder.py -- Automated test suite for F4.7 Vacation Auto-Responder.

Tests:
1. Sieve script generation:
   - Basic RFC 5230 vacation script with custom subject, message, and repeat interval.
   - RFC 5228 dot-stuffing and escaping for multi-line messages.
   - RFC 5260 date window conditions when start/end dates are specified.
2. System manager synchronization:
   - Enabling vacation responder writes .dovecot.sieve to mailbox home directory.
   - Disabling vacation responder removes .dovecot.sieve and .dovecot.svbin.
   - Line endings are strictly LF only (regression test for Windows Python).
3. Dovecot Pigeonhole & Postfix LMTP configuration validation:
   - dovecot.conf contains LMTP protocol and service on port 24.
   - dovecot.conf includes Sieve plugin and submission_host relay to Postfix.
   - Dockerfile installs dovecot-lmtpd and dovecot-pigeonhole-plugin.
   - Postfix main.cf routes virtual mailboxes to Dovecot LMTP (virtual_transport).
   - Production installer (setup-dovecot.sh) includes dovecot-sieve and dovecot-lmtpd.
4. Fastify API Security:
   - Unauthenticated GET and PUT requests to /api/mailboxes/:id/vacation return 401.
"""

import json
import os
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
VHOSTS_DIR = ROOT_DIR / "docker" / "mail-data" / "vhosts"
DOVECOT_MANAGER = ROOT_DIR / "system" / "python" / "dovecot_manager.py"


def run_dovecot_manager(cmd: str, payload: dict) -> dict:
    proc = subprocess.run(
        [sys.executable, str(DOVECOT_MANAGER), cmd],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    assert proc.returncode == 0, f"dovecot_manager failed (code {proc.returncode}): {proc.stderr}"
    return json.loads(proc.stdout.strip())


class TestSieveScriptGeneration(unittest.TestCase):
    """Unit tests verifying RFC-compliant Sieve script generation and file operations."""

    def setUp(self):
        self.test_address = "vacation-test@vexlyx-test.org"
        self.test_home = VHOSTS_DIR / "vexlyx-test.org" / "vacation-test"
        self.sieve_file = self.test_home / ".dovecot.sieve"
        self.svbin_file = self.test_home / ".dovecot.svbin"

    def tearDown(self):
        if self.sieve_file.exists():
            self.sieve_file.unlink()
        if self.svbin_file.exists():
            self.svbin_file.unlink()
        if self.test_home.exists():
            try:
                self.test_home.rmdir()
                self.test_home.parent.rmdir()
            except OSError:
                pass

    def test_01_enable_vacation_creates_sieve_script(self):
        """Enabling vacation responder writes valid Sieve script with interval and subject."""
        res = run_dovecot_manager(
            "sync_vacation",
            {
                "address": self.test_address,
                "enabled": True,
                "subject": "Out of office: Away on holiday",
                "message": "I will return on Monday.",
                "intervalDays": 7,
            },
        )

        self.assertTrue(res.get("success"))
        self.assertTrue(res.get("enabled"))
        self.assertTrue(res.get("sieveFileExists"))
        self.assertTrue(self.sieve_file.exists(), ".dovecot.sieve file must be written to disk")

        content = self.sieve_file.read_text(encoding="utf-8")
        self.assertIn('require ["vacation"];', content)
        self.assertIn(":days 7", content)
        self.assertIn(':subject "Out of office: Away on holiday"', content)
        self.assertIn("I will return on Monday.", content)
        self.assertNotIn("\r\n", content, "Script must use LF line endings, never CRLF")

    def test_02_disable_vacation_removes_sieve_script(self):
        """Disabling vacation responder deletes the .dovecot.sieve script."""
        # First enable
        run_dovecot_manager(
            "sync_vacation",
            {
                "address": self.test_address,
                "enabled": True,
                "subject": "Away",
                "message": "Away message",
                "intervalDays": 1,
            },
        )
        self.assertTrue(self.sieve_file.exists())

        # Then disable
        res = run_dovecot_manager(
            "sync_vacation",
            {
                "address": self.test_address,
                "enabled": False,
            },
        )

        self.assertTrue(res.get("success"))
        self.assertFalse(res.get("enabled"))
        self.assertFalse(self.sieve_file.exists(), ".dovecot.sieve must be removed when disabled")

    def test_03_date_window_conditions_included(self):
        """When start and end dates are specified, RFC 5260 date conditions are generated."""
        res = run_dovecot_manager(
            "sync_vacation",
            {
                "address": self.test_address,
                "enabled": True,
                "subject": "Conference Travel",
                "message": "Attending annual summit.",
                "intervalDays": 2,
                "startDate": "2026-10-01T00:00:00.000Z",
                "endDate": "2026-10-10T23:59:59.000Z",
            },
        )

        self.assertTrue(res.get("success"))
        content = self.sieve_file.read_text(encoding="utf-8")

        self.assertIn('require ["vacation", "date", "relational"];', content)
        self.assertIn('currentdate :value "ge" "date" "2026-10-01"', content)
        self.assertIn('currentdate :value "le" "date" "2026-10-10"', content)

    def test_04_message_dot_stuffing_and_quoting(self):
        """Lines starting with '.' in message body are properly dot-stuffed per RFC 5228."""
        raw_msg = "Hello.\n.hidden command\nNormal line\n\"Quoted\" and \\slashes\\"
        res = run_dovecot_manager(
            "sync_vacation",
            {
                "address": self.test_address,
                "enabled": True,
                "subject": 'Re: "Hello" \\World\\',
                "message": raw_msg,
                "intervalDays": 1,
            },
        )

        self.assertTrue(res.get("success"))
        content = self.sieve_file.read_text(encoding="utf-8")
        self.assertIn("..hidden command", content, "Line starting with '.' must be dot-stuffed")
        self.assertIn(':subject "Re: \\"Hello\\" \\\\World\\\\"', content, "Quotes and slashes must be escaped")


class TestDovecotPigeonholeConfiguration(unittest.TestCase):
    """Verifies that Dovecot and Postfix configurations wire Pigeonhole Sieve and LMTP."""

    def test_01_dovecot_conf_lmtp_and_sieve(self):
        conf = ROOT_DIR / "docker" / "dovecot" / "dovecot.conf"
        self.assertTrue(conf.exists(), "dovecot.conf must exist")
        content = conf.read_text(encoding="utf-8")

        self.assertIn("protocols = imap lmtp", content)
        self.assertIn("service lmtp", content)
        self.assertIn("port = 24", content)
        self.assertIn("protocol lmtp", content)
        self.assertIn("mail_plugins = $mail_plugins sieve", content)
        self.assertIn("submission_host = postfix:25", content)
        self.assertIn(".dovecot.sieve", content)

    def test_02_dockerfile_installs_pigeonhole_and_lmtp(self):
        dockerfile = ROOT_DIR / "docker" / "dovecot" / "Dockerfile"
        self.assertTrue(dockerfile.exists(), "Dockerfile must exist")
        content = dockerfile.read_text(encoding="utf-8")

        self.assertIn("dovecot-lmtpd", content)
        self.assertIn("dovecot-pigeonhole-plugin", content)
        self.assertIn("24", content, "Port 24 must be exposed in Dockerfile")

    def test_03_postfix_routes_virtual_to_lmtp(self):
        main_cf = ROOT_DIR / "docker" / "postfix" / "main.cf"
        self.assertTrue(main_cf.exists(), "main.cf must exist")
        content = main_cf.read_text(encoding="utf-8")

        self.assertIn("virtual_transport = lmtp:dovecot:24", content)

    def test_04_setup_script_includes_sieve(self):
        setup_script = ROOT_DIR / "system" / "scripts" / "setup-dovecot.sh"
        self.assertTrue(setup_script.exists(), "setup-dovecot.sh must exist")
        content = setup_script.read_text(encoding="utf-8")

        self.assertIn("dovecot-sieve", content)
        self.assertIn("protocols = imap lmtp", content)


class TestVacationApiSecurity(unittest.TestCase):
    """Verifies that unauthenticated requests to the vacation API return 401 Unauthorized."""

    def test_01_unauthenticated_get_returns_401(self):
        url = f"{API_BASE_URL}/api/mailboxes/dummy-id/vacation"
        req = urllib.request.Request(url, method="GET")
        try:
            with urllib.request.urlopen(req) as resp:
                self.assertEqual(resp.status, 401)
        except urllib.error.HTTPError as e:
            self.assertEqual(e.code, 401)
        except urllib.error.URLError:
            self.skipTest("API server is not running on port 5000")

    def test_02_unauthenticated_put_returns_401(self):
        url = f"{API_BASE_URL}/api/mailboxes/dummy-id/vacation"
        data = json.dumps({"enabled": True, "message": "Test"}).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="PUT",
        )
        try:
            with urllib.request.urlopen(req) as resp:
                self.assertEqual(resp.status, 401)
        except urllib.error.HTTPError as e:
            self.assertEqual(e.code, 401)
        except urllib.error.URLError:
            self.skipTest("API server is not running on port 5000")


if __name__ == "__main__":
    unittest.main()
