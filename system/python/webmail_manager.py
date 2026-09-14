#!/usr/bin/env python3
"""
webmail_manager.py -- System-layer script for Vexlyx Roundcube Webmail Management (F4.4).

Handles:
- Status checks for the Roundcube container: whether the Apache/HTTP port is
  reachable and whether the `vexlyx-roundcube` container is running.
- Recent login activity, queried from Roundcube's own SQLite database inside
  the container (F4.8).

Outputs structured JSON responses on stdout.
"""

import json
import socket
import subprocess
import sys
from datetime import datetime, timezone

# Stream Encoding Configuration
if hasattr(sys.stdin, "reconfigure"):
    try:
        sys.stdin.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def respond(data: dict) -> None:
    print(json.dumps(data), flush=True)


# ---------------------------------------------------------------------------
# Network & Port Probing
# ---------------------------------------------------------------------------

def check_port_open(host: str, port: int, timeout: float = 2.0) -> bool:
    try:
        s = socket.create_connection((host, port), timeout=timeout)
        s.close()
        return True
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Status Inspection
# ---------------------------------------------------------------------------

def get_webmail_status(host: str = "127.0.0.1", port: int = 8089, url: str = "") -> dict:
    port_open = check_port_open(host, port)

    container_running = False
    try:
        proc = subprocess.run(
            ["docker", "inspect", "-f", "{{.State.Running}}", "vexlyx-roundcube"],
            capture_output=True,
            text=True,
            timeout=3,
        )
        if proc.returncode == 0 and "true" in proc.stdout.lower():
            container_running = True
    except Exception:
        pass

    is_active = port_open or container_running
    status_str = "active" if is_active else "inactive"

    return {
        "service": "roundcube",
        "status": status_str,
        "containerRunning": container_running,
        "url": url,
        "lastChecked": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Recent Login Activity (F4.8)
# ---------------------------------------------------------------------------

def _find_roundcube_db_path() -> str:
    """
    The Docker image's ROUNDCUBEMAIL_DB_TYPE=sqlite env var can land the
    database at either sqlite.db3 (older image releases) or sqlite.db (newer
    ones) under /var/roundcube/db — list the directory rather than
    hardcoding one filename.
    """
    try:
        proc = subprocess.run(
            ["docker", "exec", "vexlyx-roundcube", "sh", "-c", "ls /var/roundcube/db"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        for name in proc.stdout.split():
            if name.startswith("sqlite.db"):
                return f"/var/roundcube/db/{name}"
    except Exception:
        pass
    return "/var/roundcube/db/sqlite.db"


# The roundcube/roundcubemail Docker image does not ship a `sqlite3` CLI
# binary, only the PHP `pdo_sqlite`/`sqlite3` extensions Roundcube itself
# needs — so the query has to run as a small PHP one-liner via `docker exec`
# rather than shelling out to `sqlite3 -json` like a normal host install.
_PHP_QUERY_TEMPLATE = (
    "$db = new SQLite3(%s); "
    "$res = $db->query('SELECT username, last_login FROM users ORDER BY last_login DESC'); "
    "$rows = []; "
    "while ($row = $res->fetchArray(SQLITE3_ASSOC)) { $rows[] = $row; } "
    "echo json_encode($rows);"
)


def get_recent_logins(addresses: list = None, limit: int = 50) -> dict:
    checked_at = datetime.now(timezone.utc).isoformat()
    db_path = _find_roundcube_db_path()
    php_code = _PHP_QUERY_TEMPLATE % json.dumps(db_path)

    try:
        proc = subprocess.run(
            ["docker", "exec", "vexlyx-roundcube", "php", "-r", php_code],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if proc.returncode != 0:
            return {"logins": [], "checkedAt": checked_at, "error": proc.stderr.strip(), "code": "SQLITE_QUERY_ERROR"}

        rows = json.loads(proc.stdout) if proc.stdout.strip() else []
        address_filter = set(a.lower() for a in addresses) if addresses else None

        logins = []
        for row in rows:
            username = (row.get("username") or "").lower()
            if address_filter is not None and username not in address_filter:
                continue
            logins.append({"address": username, "lastLogin": row.get("last_login")})

        return {"logins": logins[:limit], "checkedAt": checked_at}
    except Exception as e:
        return {"logins": [], "checkedAt": checked_at, "error": str(e), "code": "SQLITE_QUERY_ERROR"}


# ---------------------------------------------------------------------------
# CLI Command Dispatcher
# ---------------------------------------------------------------------------

def main():
    if len(sys.argv) < 2:
        respond({"error": "Missing command argument", "code": "INVALID_ARGUMENTS"})
        sys.exit(1)

    cmd = sys.argv[1]
    payload = {}
    if len(sys.argv) >= 3:
        try:
            payload = json.loads(sys.argv[2])
        except Exception:
            payload = {}
    elif not sys.stdin.isatty():
        try:
            stdin_data = sys.stdin.read().strip()
            if stdin_data:
                payload = json.loads(stdin_data)
        except Exception:
            payload = {}

    try:
        if cmd == "status":
            host = payload.get("host", "127.0.0.1")
            port = int(payload.get("port", 8089))
            url = payload.get("url", "")
            respond(get_webmail_status(host, port, url))
        elif cmd == "recent_logins":
            addresses = payload.get("addresses")
            limit = int(payload.get("limit", 50))
            respond(get_recent_logins(addresses, limit))
        else:
            respond({"error": f"Unknown command: {cmd}", "code": "UNKNOWN_COMMAND"})
            sys.exit(1)
    except Exception as e:
        respond({"error": str(e), "code": "EXECUTION_ERROR"})
        sys.exit(1)


if __name__ == "__main__":
    main()
