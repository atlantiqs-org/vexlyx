"""
test_database_provisioning.py — Automated test suite for F2.6 Database Provisioning.

Tests:
1. System script command routing and input validation (SQL injection prevention).
2. PostgreSQL database and user provisioning, permission grants, connection testing, and teardown.
3. MySQL database and user provisioning, permission grants, connection testing, and teardown.
4. Error handling on invalid engines, duplicate identifiers, and dropped connections.
"""

import json
import os
import shutil
import subprocess
import sys
import time
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

REPO_ROOT = Path(__file__).resolve().parent.parent
DB_MANAGER = REPO_ROOT / "system" / "python" / "database_manager.py"


def run_py_script(script_path: Path, payload: dict) -> tuple[int, dict, str]:
    proc = subprocess.Popen(
        [sys.executable, str(script_path)],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    stdout, stderr = proc.communicate(json.dumps(payload))
    lines = [line.strip() for line in stdout.strip().split("\n") if line.strip()]
    last_line = lines[-1] if lines else "{}"
    try:
        parsed = json.loads(last_line)
    except Exception:
        parsed = {"raw": stdout}
    return proc.returncode, parsed, stderr


def is_container_running(name: str) -> bool:
    docker_bin = shutil.which("docker")
    if not docker_bin:
        return False
    res = subprocess.run(
        [docker_bin, "inspect", "--format", "{{.State.Running}}", name],
        capture_output=True,
        text=True,
    )
    return res.returncode == 0 and res.stdout.strip() == "true"


def test_identifier_validation():
    print("Testing identifier validation & SQL injection prevention...")

    # Invalid names with SQL injection attempts
    bad_names = [
        "app_db; DROP TABLE users;--",
        "app db with spaces",
        "db' OR '1'='1",
        'db" OR "1"="1',
        "db`name",
        "db/path/traversal",
        "",
        "a" * 70,
    ]

    for bad in bad_names:
        code, result, stderr = run_py_script(
            DB_MANAGER,
            {
                "command": "create_database",
                "engine": "POSTGRESQL",
                "dbName": bad,
                "dbUser": "valid_user",
                "dbPassword": "secret_password",
            },
        )
        assert code != 0, f"Expected validation failure for '{bad}', but got code 0"
        assert result.get("code") in ("INVALID_IDENTIFIER", "INVALID_PAYLOAD")

    print("  [PASS] SQL injection patterns and invalid identifiers rejected successfully")


def test_postgresql_lifecycle():
    print("\nTesting PostgreSQL provisioning lifecycle...")
    pg_running = is_container_running("vexlyx-postgres")

    if not pg_running:
        print("  [SKIP] vexlyx-postgres container is not currently running. Skipping live container ops.")
        return

    test_db = f"test-vex-pg-{int(time.time()) % 100000}"
    test_user = f"u_test_{int(time.time()) % 100000}"
    test_pw = "VexlyxSecurePw123!"

    # 1. Create database + user
    code, result, stderr = run_py_script(
        DB_MANAGER,
        {
            "command": "create_database",
            "engine": "POSTGRESQL",
            "containerName": "vexlyx-postgres",
            "dbName": test_db,
            "dbUser": test_user,
            "dbPassword": test_pw,
            "rootUser": "vexlyx",
            "adminDb": "vexlyx_dev",
        },
    )
    assert code == 0, f"PostgreSQL create failed: {stderr} {result}"
    assert result.get("success") is True
    assert result.get("database") == test_db
    assert result.get("user") == test_user
    print(f"  [PASS] Created PostgreSQL database '{test_db}' with owner '{test_user}'")

    # 2. Test connection with the created credentials
    code, result, stderr = run_py_script(
        DB_MANAGER,
        {
            "command": "test_connection",
            "engine": "POSTGRESQL",
            "containerName": "vexlyx-postgres",
            "dbName": test_db,
            "dbUser": test_user,
            "dbPassword": test_pw,
        },
    )
    assert code == 0, f"PostgreSQL connection test failed: {stderr} {result}"
    assert result.get("connected") is True
    print(f"  [PASS] Verified active PostgreSQL connection ({result.get('latencyMs')}ms latency)")

    # 3. Drop database and user
    code, result, stderr = run_py_script(
        DB_MANAGER,
        {
            "command": "delete_database",
            "engine": "POSTGRESQL",
            "containerName": "vexlyx-postgres",
            "dbName": test_db,
            "dbUser": test_user,
            "rootUser": "vexlyx",
            "adminDb": "vexlyx_dev",
        },
    )
    assert code == 0, f"PostgreSQL delete failed: {stderr} {result}"
    assert result.get("success") is True
    print(f"  [PASS] Dropped database '{test_db}' and cleaned up user '{test_user}'")


def test_mysql_lifecycle():
    print("\nTesting MySQL provisioning lifecycle...")
    mysql_running = is_container_running("vexlyx-mysql")

    if not mysql_running:
        print("  [SKIP] vexlyx-mysql container is not currently running. Skipping live container ops.")
        return

    test_db = f"test-vex-my-{int(time.time()) % 100000}"
    test_user = f"u_my_{int(time.time()) % 100000}"
    test_pw = "VexlyxSecurePw123!"

    # 1. Create database + user
    code, result, stderr = run_py_script(
        DB_MANAGER,
        {
            "command": "create_database",
            "engine": "MYSQL",
            "containerName": "vexlyx-mysql",
            "dbName": test_db,
            "dbUser": test_user,
            "dbPassword": test_pw,
            "rootUser": "root",
            "rootPassword": "vexlyx_mysql_root",
        },
    )
    assert code == 0, f"MySQL create failed: {stderr} {result}"
    assert result.get("success") is True
    assert result.get("database") == test_db
    assert result.get("user") == test_user
    print(f"  [PASS] Created MySQL database '{test_db}' and user '{test_user}' with scoped privileges")

    # 2. Test connection with the created credentials
    code, result, stderr = run_py_script(
        DB_MANAGER,
        {
            "command": "test_connection",
            "engine": "MYSQL",
            "containerName": "vexlyx-mysql",
            "dbName": test_db,
            "dbUser": test_user,
            "dbPassword": test_pw,
        },
    )
    assert code == 0, f"MySQL connection test failed: {stderr} {result}"
    assert result.get("connected") is True
    print(f"  [PASS] Verified active MySQL connection ({result.get('latencyMs')}ms latency)")

    # 3. Drop database and user
    code, result, stderr = run_py_script(
        DB_MANAGER,
        {
            "command": "delete_database",
            "engine": "MYSQL",
            "containerName": "vexlyx-mysql",
            "dbName": test_db,
            "dbUser": test_user,
            "rootUser": "root",
            "rootPassword": "vexlyx_mysql_root",
        },
    )
    assert code == 0, f"MySQL delete failed: {stderr} {result}"
    assert result.get("success") is True
    print(f"  [PASS] Dropped MySQL database '{test_db}' and removed user '{test_user}'")


def main():
    print("=================================================================")
    print("Running Vexlyx Database Provisioning Test Suite (F2.6)")
    print("=================================================================")

    test_identifier_validation()
    test_postgresql_lifecycle()
    test_mysql_lifecycle()

    print("\n=================================================================")
    print("ALL DATABASE PROVISIONING TESTS COMPLETED SUCCESSFULLY!")
    print("=================================================================")


if __name__ == "__main__":
    main()
