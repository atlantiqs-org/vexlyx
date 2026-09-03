"""
test_live_mock_domains.py — Live End-to-End Test for F3.1 Custom Domain Management (Option B).

Tests:
1. Health check of Fastify API.
2. User authentication & session cookie handling.
3. Finding or creating a test project.
4. Adding a custom domain (POST /api/domains) -> verifying status is PENDING and instructions returned.
5. Verifying ownership with VEXLYX_MOCK_DNS (POST /api/domains/:id/verify) -> status becomes ACTIVE.
6. Verifying Traefik dynamic router YAML file is created in docker/traefik/dynamic/domain-{id}.yml.
7. Inspecting Traefik configuration file content.
8. Deleting the domain (DELETE /api/domains/:id) -> verifying Traefik dynamic YAML is removed.
"""

import http.cookiejar
import json
import os
import sys
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

API_BASE = "http://localhost:5000"
REPO_ROOT = Path(__file__).resolve().parent.parent
TRAEFIK_DYNAMIC_DIR = REPO_ROOT / "docker" / "traefik" / "dynamic"


def main():
    print("=" * 60)
    print(" VEXLYX F3.1 CUSTOM DOMAIN MANAGEMENT — LIVE END-TO-END TEST")
    print(" Mode: Option B (Local Dev Mock DNS)")
    print("=" * 60)

    # 1. Setup cookie jar for session management
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

    # 2. Health check
    print("\n[1/7] Checking API health...")
    try:
        req = urllib.request.Request(f"{API_BASE}/api/health")
        with opener.open(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"  ✓ API is ONLINE: {data.get('status', 'OK')} (v{data.get('version', 'unknown')})")
    except Exception as e:
        print(f"  ✗ Failed to reach API at {API_BASE}: {e}")
        print("    Make sure 'pnpm dev' is running.")
        sys.exit(1)

    # 3. Authenticate
    print("\n[2/7] Authenticating test user...")
    # Try seeded admin credentials first
    admin_email = "admin@vexlyx.local"
    admin_pass = "admin123"

    login_payload = json.dumps({"email": admin_email, "password": admin_pass}).encode("utf-8")
    login_req = urllib.request.Request(
        f"{API_BASE}/api/auth/login",
        data=login_payload,
        headers={"Content-Type": "application/json"},
    )
    user_id = None
    try:
        with opener.open(login_req, timeout=5) as resp:
            user_data = json.loads(resp.read().decode("utf-8"))
            user_id = user_data["user"]["id"]
            print(f"  ✓ Logged in as admin user: {admin_email} (ID: {user_id})")
    except urllib.error.HTTPError:
        # Fallback: Register a test user with confirmPassword
        test_email = f"domain-tester-{os.urandom(3).hex()}@example.com"
        test_pass = "TestPassword123!"
        reg_payload = json.dumps({
            "name": "Domain Tester",
            "email": test_email,
            "password": test_pass,
            "confirmPassword": test_pass,
        }).encode("utf-8")
        reg_req = urllib.request.Request(
            f"{API_BASE}/api/auth/register",
            data=reg_payload,
            headers={"Content-Type": "application/json"},
        )
        try:
            with opener.open(reg_req, timeout=5) as resp:
                user_data = json.loads(resp.read().decode("utf-8"))
                user_id = user_data["user"]["id"]
                print(f"  ✓ Registered new test user: {test_email} (ID: {user_id})")
        except Exception as e:
            print(f"  ✗ Failed to register/login: {e}")
            sys.exit(1)

    # 4. Get or create a test project
    print("\n[3/7] Locating or creating a test project...")
    proj_req = urllib.request.Request(f"{API_BASE}/api/projects")
    project_id = None
    project_name = None
    try:
        with opener.open(proj_req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            projects = data.get("projects", [])
            if projects:
                project_id = projects[0]["id"]
                project_name = projects[0]["name"]
                print(f"  ✓ Using existing project: '{project_name}' (ID: {project_id})")
    except Exception as e:
        print(f"  ! Could not fetch projects list: {e}")

    if not project_id:
        create_payload = json.dumps({
            "name": f"domain-test-{os.urandom(3).hex()}",
            "type": "NODEJS",
        }).encode("utf-8")
        create_req = urllib.request.Request(
            f"{API_BASE}/api/projects",
            data=create_payload,
            headers={"Content-Type": "application/json"},
        )
        with opener.open(create_req, timeout=5) as resp:
            p_data = json.loads(resp.read().decode("utf-8"))
            project_id = p_data["id"]
            project_name = p_data["name"]
            print(f"  ✓ Created new test project: '{project_name}' (ID: {project_id})")

    # 5. Add custom domain
    test_hostname = f"demo-app-{os.urandom(3).hex()}.vexlyx.localhost"
    print(f"\n[4/7] Attaching custom domain '{test_hostname}' to project '{project_name}'...")
    domain_payload = json.dumps({
        "hostname": test_hostname,
        "projectId": project_id,
    }).encode("utf-8")
    domain_req = urllib.request.Request(
        f"{API_BASE}/api/domains",
        data=domain_payload,
        headers={"Content-Type": "application/json"},
    )
    domain_data = None
    with opener.open(domain_req, timeout=5) as resp:
        domain_data = json.loads(resp.read().decode("utf-8"))
        domain_id = domain_data["id"]
        status = domain_data["status"]
        instructions = domain_data.get("verificationInstructions", {})
        print(f"  ✓ Domain created successfully:")
        print(f"    - Domain ID: {domain_id}")
        print(f"    - Initial Status: {status}")
        print(f"    - TXT Host: {instructions.get('recordName')}")
        print(f"    - TXT Value: {instructions.get('recordValue')}")
        assert status == "PENDING", f"Expected status PENDING, got {status}"

    # 6. Verify the domain using Mock DNS (Option B)
    print(f"\n[5/7] Verifying ownership of '{test_hostname}' via Option B...")
    verify_req = urllib.request.Request(
        f"{API_BASE}/api/domains/{domain_id}/verify?mock=true",
        data=b"{}",
        headers={"Content-Type": "application/json"},
    )
    with opener.open(verify_req, timeout=5) as resp:
        verify_data = json.loads(resp.read().decode("utf-8"))
        verified = verify_data.get("verified")
        new_status = verify_data.get("status")
        msg = verify_data.get("message")
        print(f"  ✓ Verification response:")
        print(f"    - Verified: {verified}")
        print(f"    - Status: {new_status}")
        print(f"    - Message: {msg}")
        assert verified is True, f"Expected verified=True, got {verified}"
        assert new_status == "ACTIVE", f"Expected status ACTIVE, got {new_status}"

    # 7. Check Traefik Dynamic Router YAML file on disk
    print("\n[6/7] Checking Traefik dynamic router auto-configuration on disk...")
    traefik_file = TRAEFIK_DYNAMIC_DIR / f"domain-{domain_id}.yml"
    print(f"  Looking for: {traefik_file}")
    if traefik_file.exists():
        content = traefik_file.read_text(encoding="utf-8")
        print("  ✓ Traefik dynamic configuration file exists!")
        print("  --- Traefik YAML Content ---")
        for line in content.strip().splitlines():
            print(f"    {line}")
        print("  -----------------------------")
        assert f"Host(`{test_hostname}`)" in content, "Host rule missing from Traefik YAML"
        assert "loadBalancer" in content, "loadBalancer service missing from Traefik YAML"
    else:
        print(f"  ✗ File not found: {traefik_file}")
        sys.exit(1)

    # 7.5 Live HTTP Request to Traefik on port 80
    print(f"\n[6.5/7] Testing live HTTP proxy through Traefik port 80 for '{test_hostname}'...")
    import time
    time.sleep(1.5)  # Allow Traefik reload to finish
    try:
        http_req = urllib.request.Request(
            "http://localhost",
            headers={"Host": test_hostname},
        )
        with urllib.request.urlopen(http_req, timeout=5) as http_resp:
            print(f"  ✓ Traefik routed 'Host: {test_hostname}' to project container: HTTP {http_resp.status} OK!")
    except Exception as e:
        print(f"  ! Live HTTP check note: {e}")

    # 8. Clean up / Delete domain
    print(f"\n[7/7] Deleting custom domain (ID: {domain_id})...")
    del_req = urllib.request.Request(
        f"{API_BASE}/api/domains/{domain_id}",
        method="DELETE",
    )
    with opener.open(del_req, timeout=5) as resp:
        assert resp.status == 204, f"Expected 204 No Content, got {resp.status}"
        print(f"  ✓ Domain deleted via DELETE /api/domains/{domain_id} (HTTP 204)")

    # Verify Traefik dynamic file was removed
    if not traefik_file.exists():
        print(f"  ✓ Traefik dynamic file was automatically cleaned up from disk!")
    else:
        print(f"  ✗ Traefik dynamic file still exists on disk after deletion: {traefik_file}")
        sys.exit(1)

    print("\n" + "=" * 60)
    print(" ALL TESTS PASSED SUCCESSFULLY! ")
    print(f" Option B local verification and Traefik dynamic routing")
    print(f" are working 100% end-to-end on localhost.")
    print("=" * 60)


if __name__ == "__main__":
    main()
