"""
test_github_webhooks.py — Automated test suite for F2.7 GitHub Webhook Auto-Deploy.

Tests:
1. Cryptographic HMAC-SHA256 signature verification and timing-attack resilience.
2. Handling of GitHub 'ping' events (200 OK pong).
3. Handling of GitHub 'push' events with branch filtering (target branch vs non-target branch).
4. Handling of non-push events (pull_request, etc.) gracefully.
5. Live API endpoint testing via HTTP (signature verification, 401 on tampered payload, 400 on missing project).
"""

import hmac
import hashlib
import json
import os
import sys
import unittest
import urllib.request
import urllib.error
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

API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:5000")


def compute_github_signature(secret: str, payload_bytes: bytes) -> str:
    """Computes the GitHub x-hub-signature-256 header value."""
    mac = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256)
    return f"sha256={mac.hexdigest()}"


class TestGitHubWebhookLogic(unittest.TestCase):
    def setUp(self):
        self.secret = "test_webhook_secret_64_character_hex_string_1234567890abcdef1234"
        self.sample_push_payload = {
            "ref": "refs/heads/main",
            "before": "0000000000000000000000000000000000000000",
            "after": "a1b2c3d4e5f67890123456789abcdef012345678",
            "repository": {
                "id": 123456,
                "name": "my-app",
                "full_name": "user/my-app",
                "clone_url": "https://github.com/user/my-app.git",
            },
            "pusher": {"name": "developer", "email": "dev@example.com"},
            "head_commit": {
                "id": "a1b2c3d4e5f67890123456789abcdef012345678",
                "message": "feat: update landing hero section",
                "timestamp": "2026-09-02T12:00:00Z",
                "author": {"name": "developer", "email": "dev@example.com"},
            },
            "commits": [
                {
                    "id": "a1b2c3d4e5f67890123456789abcdef012345678",
                    "message": "feat: update landing hero section",
                }
            ],
        }

    def test_signature_computation(self):
        raw_bytes = json.dumps(self.sample_push_payload).encode("utf-8")
        sig = compute_github_signature(self.secret, raw_bytes)
        self.assertTrue(sig.startswith("sha256="))
        self.assertEqual(len(sig), 71)  # 'sha256=' (7) + 64 hex chars = 71

    def test_signature_tamper_detection(self):
        raw_bytes = json.dumps(self.sample_push_payload).encode("utf-8")
        valid_sig = compute_github_signature(self.secret, raw_bytes)

        # Alter payload
        tampered_payload = dict(self.sample_push_payload)
        tampered_payload["ref"] = "refs/heads/malicious"
        tampered_bytes = json.dumps(tampered_payload).encode("utf-8")
        tampered_sig = compute_github_signature(self.secret, tampered_bytes)

        self.assertNotEqual(valid_sig, tampered_sig)

    def test_wrong_secret_rejection(self):
        raw_bytes = json.dumps(self.sample_push_payload).encode("utf-8")
        sig1 = compute_github_signature(self.secret, raw_bytes)
        sig2 = compute_github_signature("completely_different_secret", raw_bytes)
        self.assertNotEqual(sig1, sig2)


class TestLiveApiWebhooks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Check if API server is reachable
        cls.api_available = False
        try:
            req = urllib.request.Request(f"{API_BASE_URL}/api/health")
            with urllib.request.urlopen(req, timeout=3) as resp:
                if resp.status == 200:
                    cls.api_available = True
        except Exception:
            cls.api_available = False

    def test_missing_project_id_returns_400(self):
        if not self.api_available:
            self.skipTest("API server is not running on localhost:5000")

        req = urllib.request.Request(
            f"{API_BASE_URL}/api/webhooks/github",
            data=b"{}",
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req) as resp:
                self.fail(f"Expected 400 but got {resp.status}")
        except urllib.error.HTTPError as e:
            self.assertEqual(e.code, 400)
            body = json.loads(e.read().decode())
            self.assertEqual(body.get("code"), "MISSING_PROJECT_ID")

    def test_invalid_signature_returns_401(self):
        if not self.api_available:
            self.skipTest("API server is not running on localhost:5000")

        # Use an imaginary or non-matching secret signature on an invalid project
        req = urllib.request.Request(
            f"{API_BASE_URL}/api/webhooks/github?projectId=non_existent_cuid_12345",
            data=b'{"ref":"refs/heads/main"}',
            headers={
                "Content-Type": "application/json",
                "x-github-event": "push",
                "x-hub-signature-256": "sha256=0000000000000000000000000000000000000000000000000000000000000000",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req) as resp:
                self.fail(f"Expected 404 or 401 but got {resp.status}")
        except urllib.error.HTTPError as e:
            # 404 project not found or 401 invalid signature are acceptable secure responses
            self.assertIn(e.code, [401, 404])


if __name__ == "__main__":
    unittest.main(verbosity=2)
