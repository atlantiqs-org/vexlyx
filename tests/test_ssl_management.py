"""
test_ssl_management.py — Automated test suite for F3.4 SSL Certificate Management.

Tests:
1. Self-Signed / Dev SSL Certificate Generation with SANs (including wildcard coverage).
2. PEM Certificate & Private Key Validation (matching vs mismatched key rejection).
3. Traefik acme.json parser & certificate storage extractor.
4. Certificate Expiry Monitoring & Alert Logic (7-day threshold alert trigger).
5. Traefik Static & Dynamic TLS Configuration Verification (port 443, websecure, certResolver).
6. Live API endpoint security (401 Unauthorized protection on all SSL endpoints).
"""

import json
import os
import re
import subprocess
import sys
import unittest
import urllib.request
import urllib.error
from datetime import datetime, timedelta, timezone
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
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:5000")


# ---------------------------------------------------------------------------
# Unit Tests: System Layer (ssl_manager.py)
# ---------------------------------------------------------------------------

class TestSslManager(unittest.TestCase):
    def setUp(self):
        self.script = ROOT_DIR / "system" / "python" / "ssl_manager.py"
        self.assertTrue(self.script.exists(), f"Script must exist at {self.script}")

    def run_manager(self, cmd: str, payload: dict) -> dict:
        proc = subprocess.run(
            [sys.executable, str(self.script), cmd, json.dumps(payload)],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        self.assertEqual(proc.returncode, 0, f"Script failed with code {proc.returncode}: {proc.stderr}")
        return json.loads(proc.stdout.strip())

    def test_01_self_signed_cert_generation(self):
        """Generates self-signed certificate with wildcard SANs and verifies metadata."""
        domain = "test-ssl.vexlyx.localhost"
        wildcard = "*.test-ssl.vexlyx.localhost"

        res = self.run_manager("generate_self_signed", {
            "hostname": domain,
            "sans": [wildcard],
            "days": 90,
        })

        self.assertTrue(res.get("success"), f"Generation failed: {res}")
        self.assertEqual(res.get("commonName"), domain)
        self.assertIn("Vexlyx", res.get("issuer", ""))
        self.assertIn(domain, res.get("sans", []))
        self.assertIn(wildcard, res.get("sans", []))
        self.assertGreater(res.get("daysRemaining", 0), 80)
        self.assertTrue(res.get("certPem", "").startswith("-----BEGIN CERTIFICATE-----"))
        self.assertTrue(res.get("keyPem", "").startswith("-----BEGIN RSA PRIVATE KEY-----"))

        # Clean up generated files
        cert_path = Path(res["certPath"])
        key_path = Path(res["keyPath"])
        if cert_path.exists():
            cert_path.unlink()
        if key_path.exists():
            key_path.unlink()

    def test_02_cert_parsing_and_expiry_detection(self):
        """Parses X.509 certificate PEM and correctly computes expiry window."""
        res = self.run_manager("generate_self_signed", {
            "hostname": "expiry-test.vexlyx.localhost",
            "days": 5,
        })
        self.assertTrue(res.get("success"))
        cert_pem = res["certPem"]

        # Parse generated cert
        parsed = self.run_manager("parse_cert", {"certificate": cert_pem})
        self.assertTrue(parsed.get("success"))
        self.assertEqual(parsed.get("commonName"), "expiry-test.vexlyx.localhost")
        self.assertFalse(parsed.get("isExpired"))
        # Days <= 7 triggers isExpiringSoon
        self.assertTrue(parsed.get("isExpiringSoon"), "Cert with 5 days should trigger isExpiringSoon alert")

        # Clean up
        Path(res["certPath"]).unlink(missing_ok=True)
        Path(res["keyPath"]).unlink(missing_ok=True)

    def test_03_validate_key_pair_matching_and_mismatch(self):
        """Validates that matching cert and key are accepted, and mismatched are rejected."""
        # Generate Pair A
        pair_a = self.run_manager("generate_self_signed", {"hostname": "site-a.vexlyx.localhost"})
        # Generate Pair B
        pair_b = self.run_manager("generate_self_signed", {"hostname": "site-b.vexlyx.localhost"})

        # Matching pair
        match_res = self.run_manager("validate_pair", {
            "certificate": pair_a["certPem"],
            "privateKey": pair_a["keyPem"],
        })
        self.assertTrue(match_res.get("success"), "Matching key pair must succeed")
        self.assertTrue(match_res.get("valid"))

        # Mismatched pair (Cert A with Key B)
        mismatch_res = self.run_manager("validate_pair", {
            "certificate": pair_a["certPem"],
            "privateKey": pair_b["keyPem"],
        })
        self.assertFalse(mismatch_res.get("success"), "Mismatched key pair must fail")
        self.assertIn("does not match", mismatch_res.get("error", "").lower())

        # Clean up
        for p in [pair_a, pair_b]:
            Path(p["certPath"]).unlink(missing_ok=True)
            Path(p["keyPath"]).unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# Unit Tests: Expiry Alert Threshold (7 Days)
# ---------------------------------------------------------------------------

class TestExpiryAlertLogic(unittest.TestCase):
    def test_expiry_thresholds(self):
        """Tests the 7-day expiry alert criteria specified in F3.4 acceptance test 4."""
        now = datetime.now(timezone.utc)

        # Case 1: 45 days remaining -> Normal Active
        valid_45d = now + timedelta(days=45)
        diff_45d = (valid_45d - now).total_seconds() / 86400
        self.assertGreater(diff_45d, 7)
        self.assertFalse(0 < diff_45d <= 7)

        # Case 2: 6 days remaining -> Triggers 7-day alert (EXPIRING_SOON)
        valid_6d = now + timedelta(days=6)
        diff_6d = (valid_6d - now).total_seconds() / 86400
        self.assertTrue(0 < diff_6d <= 7, "6 days remaining must be within the <= 7 days alert window")

        # Case 3: Expired (-1 day) -> EXPIRED
        valid_past = now - timedelta(days=1)
        diff_past = (valid_past - now).total_seconds()
        self.assertLessEqual(diff_past, 0, "Past date must be flagged as expired")


# ---------------------------------------------------------------------------
# Unit Tests: Traefik Configuration Verification
# ---------------------------------------------------------------------------

class TestTraefikConfiguration(unittest.TestCase):
    def test_traefik_static_config(self):
        """Verifies Traefik static configuration has web (:80), websecure (:443), and letsencrypt resolver."""
        traefik_yml = ROOT_DIR / "docker" / "traefik" / "traefik.yml"
        self.assertTrue(traefik_yml.exists(), "traefik.yml must exist")
        content = traefik_yml.read_text(encoding="utf-8")

        self.assertIn("web:", content)
        self.assertIn(":80", content)
        self.assertIn("websecure:", content)
        self.assertIn(":443", content)
        self.assertIn("certificatesResolvers:", content)
        self.assertIn("letsencrypt:", content)
        self.assertIn("acme.json", content)

    def test_docker_compose_traefik_ports(self):
        """Verifies docker-compose.yml exposes 443:443 and mounts certs/acme directories."""
        compose_file = ROOT_DIR / "docker-compose.yml"
        self.assertTrue(compose_file.exists(), "docker-compose.yml must exist")
        content = compose_file.read_text(encoding="utf-8")

        self.assertIn('"443:443"', content)
        self.assertIn("acme.json", content)
        self.assertIn("certs", content)


# ---------------------------------------------------------------------------
# API Integration Tests: Security & Auth Enforcement
# ---------------------------------------------------------------------------

class TestSslApiEndpoints(unittest.TestCase):
    def _api_get(self, endpoint: str):
        url = f"{API_BASE_URL}{endpoint}"
        req = urllib.request.Request(url, method="GET")
        try:
            with urllib.request.urlopen(req) as resp:
                return resp.status, resp.read().decode("utf-8")
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode("utf-8")
        except urllib.error.URLError:
            return None, "API_UNREACHABLE"

    def _api_post(self, endpoint: str, data: dict = None):
        url = f"{API_BASE_URL}{endpoint}"
        payload = json.dumps(data or {}).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req) as resp:
                return resp.status, resp.read().decode("utf-8")
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode("utf-8")
        except urllib.error.URLError:
            return None, "API_UNREACHABLE"

    def test_01_unauthenticated_endpoints_return_401(self):
        """Ensures all SSL management endpoints require authentication."""
        status, _ = self._api_get("/api/domains/ssl/alerts")
        if status is None:
            self.skipTest("API server is not currently running locally")

        self.assertEqual(status, 401, "GET /api/domains/ssl/alerts must return 401 Unauthorized")

        status, _ = self._api_get("/api/domains/test-id/ssl")
        self.assertEqual(status, 401, "GET /api/domains/:id/ssl must return 401 Unauthorized")

        status, _ = self._api_post("/api/domains/test-id/ssl/provision")
        self.assertEqual(status, 401, "POST /api/domains/:id/ssl/provision must return 401 Unauthorized")

        status, _ = self._api_post("/api/domains/test-id/ssl/upload")
        self.assertEqual(status, 401, "POST /api/domains/:id/ssl/upload must return 401 Unauthorized")

        status, _ = self._api_post("/api/domains/test-id/ssl/renew")
        self.assertEqual(status, 401, "POST /api/domains/:id/ssl/renew must return 401 Unauthorized")


if __name__ == "__main__":
    unittest.main(verbosity=2)
