#!/usr/bin/env python3
"""
webmail_manager.py -- System-layer script for Vexlyx Roundcube Webmail Management (F4.4).

Handles:
- Status checks for the Roundcube container: whether the Apache/HTTP port is
  reachable and whether the `vexlyx-roundcube` container is running.

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
        else:
            respond({"error": f"Unknown command: {cmd}", "code": "UNKNOWN_COMMAND"})
            sys.exit(1)
    except Exception as e:
        respond({"error": str(e), "code": "EXECUTION_ERROR"})
        sys.exit(1)


if __name__ == "__main__":
    main()
