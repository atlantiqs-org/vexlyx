#!/usr/bin/env python3
"""
firewall_manager.py -- Vexlyx UFW firewall management (F5.4).

Called by the Fastify API via child_process.spawn with a JSON payload on
stdin. Writes JSON results to stdout, exits with code 0 on success, 1 on
error.

The API container has no NET_ADMIN and its own isolated network namespace,
so a plain `ufw` call here would only touch that container's own (useless)
netfilter tables. Every UFW command below is instead run inside a throwaway
`vexlyx-ufw-helper` container started with `--network host` (real host
firewall) plus NET_ADMIN/NET_RAW, launched via the host Docker daemon over
the bind-mounted socket -- the same "Docker-outside-of-Docker" pattern
docker_manager.py uses for everything else. See docker/ufw-helper/Dockerfile.

Commands:
  status             -- Returns whether UFW is active and its default
                         incoming/outgoing policy.
  add_rule           -- Adds an allow/deny rule. Refuses to add a DENY rule
                         for a protected port (would lock out SSH/the panel).
  delete_rule        -- Removes a rule by its original spec. Refuses to
                         remove an ALLOW rule for a protected port.
  set_default_policy -- Sets UFW's default incoming/outgoing policy. Refuses
                         to default-deny incoming unless a protected port
                         already has an explicit live ALLOW rule.

Never run this script as root; it never needs to be -- all privileged work
happens inside the helper container, not this process.
"""

import json
import re
import shutil
import subprocess
import sys

# ---------------------------------------------------------------------------
# Stream encoding (mirrors backup_manager.py / system_monitor.py)
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def respond(data: dict) -> None:
    print(json.dumps(data), flush=True)


def fail(message: str, code: str = "FIREWALL_ERROR") -> None:
    print(json.dumps({"error": message, "code": code}), flush=True)
    sys.exit(1)


def require_field(payload: dict, field: str):
    value = payload.get(field)
    if value is None:
        fail(f"Missing required field: {field}", "INVALID_PAYLOAD")
    return value


def get_docker_binary() -> str:
    binary = shutil.which("docker")
    if binary:
        return binary
    fail(
        "Docker CLI not found in PATH. Make sure Docker Engine is running.",
        "DOCKER_NOT_FOUND",
    )
    return "docker"


IS_LINUX = sys.platform.startswith("linux")
HELPER_IMAGE = "vexlyx-ufw-helper:latest"


def run_ufw(payload: dict, args: list[str]) -> str:
    """Runs `ufw <args>` inside the host-networked helper container and
    returns stdout. On non-Linux dev machines (no real UFW host to reach),
    returns a canned response instead of shelling out at all."""
    if not IS_LINUX:
        return ""

    image = payload.get("helperImage") or HELPER_IMAGE
    docker_bin = get_docker_binary()
    # No `--force`: it's only valid before enable/reset/disable in this ufw
    # version ("ERROR: Invalid syntax" otherwise) -- none of the commands we
    # issue (status/allow/deny/delete/default) ever prompt for confirmation.
    cmd = [
        docker_bin,
        "run",
        "--rm",
        "--network",
        "host",
        "--cap-add",
        "NET_ADMIN",
        "--cap-add",
        "NET_RAW",
        "-v",
        "/etc/ufw:/etc/ufw",
        "-v",
        "/lib/ufw:/lib/ufw",
        image,
        *args,
    ]

    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    except subprocess.TimeoutExpired:
        fail("ufw command timed out", "UFW_TIMEOUT")
        return ""
    except FileNotFoundError:
        fail("Docker CLI not found in PATH.", "DOCKER_NOT_FOUND")
        return ""

    if proc.returncode != 0:
        fail(f"ufw {' '.join(args)} failed: {proc.stderr.strip() or proc.stdout.strip()}", "UFW_COMMAND_FAILED")
        return ""

    return proc.stdout


# ---------------------------------------------------------------------------
# Protected ports -- never allow a change that would deny/remove access to
# these. Mirrors the SSH-lockout guard in
# system/scripts/install/steps/15-firewall.sh, extended to also cover the
# panel API's own port.
# ---------------------------------------------------------------------------


def get_protected_ports(payload: dict) -> set[int]:
    ports = {int(payload.get("sshPort") or 22)}
    panel_port = payload.get("panelPort")
    if panel_port:
        ports.add(int(panel_port))
    return ports


# ---------------------------------------------------------------------------
# status -- parse `ufw status verbose` into structured rules + policy
# ---------------------------------------------------------------------------

_STATUS_ACTIVE_RE = re.compile(r"^Status:\s*(active|inactive)", re.MULTILINE)
_DEFAULT_RE = re.compile(
    r"^Default:\s*(allow|deny|reject)\s*\(incoming\),\s*(allow|deny|reject)\s*\(outgoing\)",
    re.MULTILINE,
)
_RULE_RE = re.compile(
    r"^(?P<port>\d+)(?::\d+)?/(?P<proto>tcp|udp)(?:\s*\(v6\))?\s+"
    r"(?P<action>ALLOW|DENY|REJECT|LIMIT)\s+(?:IN|OUT)\s+"
    r"(?P<source>\S+)(?:\s+#\s*(?P<comment>.+))?$"
)


def parse_status(output: str) -> dict:
    status_match = _STATUS_ACTIVE_RE.search(output)
    active = status_match.group(1) == "active" if status_match else False

    default_match = _DEFAULT_RE.search(output)
    default_incoming = default_match.group(1).upper() if default_match else "DENY"
    default_outgoing = default_match.group(2).upper() if default_match else "ALLOW"

    rules = []
    for line in output.splitlines():
        line = line.strip()
        if "(v6)" in line:
            continue
        match = _RULE_RE.match(line)
        if not match:
            continue
        source = match.group("source")
        rules.append(
            {
                "port": int(match.group("port")),
                "protocol": match.group("proto").upper(),
                "action": "ALLOW" if match.group("action") == "ALLOW" else "DENY",
                "source": None if source.lower() == "anywhere" else source,
                "comment": match.group("comment"),
            }
        )

    return {
        "active": active,
        "defaultIncoming": "ALLOW" if default_incoming == "ALLOW" else "DENY",
        "defaultOutgoing": "ALLOW" if default_outgoing == "ALLOW" else "DENY",
        "rules": rules,
    }


def cmd_status(payload: dict) -> None:
    output = run_ufw(payload, ["status", "verbose"])
    if not IS_LINUX:
        respond(
            {
                "active": False,
                "defaultIncoming": "DENY",
                "defaultOutgoing": "ALLOW",
                "rules": [],
                "mock": True,
            }
        )
        return
    respond(parse_status(output))


# ---------------------------------------------------------------------------
# add_rule / delete_rule -- shared rule-spec builder
# ---------------------------------------------------------------------------


def build_rule_args(payload: dict) -> list[str]:
    port = int(require_field(payload, "port"))
    protocol = str(require_field(payload, "protocol")).lower()
    action = str(require_field(payload, "action")).lower()
    source = payload.get("source")
    comment = payload.get("comment")

    if protocol not in ("tcp", "udp"):
        fail(f"Invalid protocol '{protocol}'", "INVALID_PAYLOAD")
    if action not in ("allow", "deny"):
        fail(f"Invalid action '{action}'", "INVALID_PAYLOAD")
    if not (1 <= port <= 65535):
        fail(f"Invalid port '{port}'", "INVALID_PAYLOAD")

    if source:
        args = [action, "from", str(source), "to", "any", "port", str(port), "proto", protocol]
    else:
        args = [action, f"{port}/{protocol}"]

    if comment:
        args += ["comment", str(comment)]

    return args


def cmd_add_rule(payload: dict) -> None:
    port = int(require_field(payload, "port"))
    action = str(require_field(payload, "action")).upper()
    protected = get_protected_ports(payload)

    if action == "DENY" and port in protected:
        fail(
            f"Refusing to add a DENY rule for port {port} -- it is protected (SSH or panel access) "
            "and denying it would lock out this server.",
            "LOCKOUT_RISK",
        )

    args = build_rule_args(payload)
    run_ufw(payload, args)
    respond({"success": True})


def cmd_delete_rule(payload: dict) -> None:
    port = int(require_field(payload, "port"))
    action = str(require_field(payload, "action")).upper()
    protected = get_protected_ports(payload)

    if action == "ALLOW" and port in protected:
        fail(
            f"Refusing to remove the ALLOW rule for port {port} -- it is protected (SSH or panel access) "
            "and removing it would lock out this server.",
            "LOCKOUT_RISK",
        )

    args = ["delete", *build_rule_args(payload)]
    run_ufw(payload, args)
    respond({"success": True})


# ---------------------------------------------------------------------------
# set_default_policy
# ---------------------------------------------------------------------------


def cmd_set_default_policy(payload: dict) -> None:
    default_incoming = str(require_field(payload, "defaultIncoming")).lower()
    default_outgoing = str(require_field(payload, "defaultOutgoing")).lower()

    if default_incoming not in ("allow", "deny"):
        fail(f"Invalid defaultIncoming '{default_incoming}'", "INVALID_PAYLOAD")
    if default_outgoing not in ("allow", "deny"):
        fail(f"Invalid defaultOutgoing '{default_outgoing}'", "INVALID_PAYLOAD")

    if default_incoming == "deny":
        protected = get_protected_ports(payload)
        status = parse_status(run_ufw(payload, ["status", "verbose"])) if IS_LINUX else {"rules": []}
        live_allowed = {
            r["port"] for r in status["rules"] if r["action"] == "ALLOW"
        }
        if IS_LINUX and not (protected & live_allowed):
            fail(
                "Refusing to default-deny incoming traffic -- none of the protected ports "
                f"({', '.join(str(p) for p in sorted(protected))}) has an explicit ALLOW rule yet. "
                "Add one first so this change can't lock out the server.",
                "LOCKOUT_RISK",
            )

    run_ufw(payload, ["default", default_incoming, "incoming"])
    run_ufw(payload, ["default", default_outgoing, "outgoing"])
    respond({"success": True})


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

COMMANDS = {
    "status": cmd_status,
    "add_rule": cmd_add_rule,
    "delete_rule": cmd_delete_rule,
    "set_default_policy": cmd_set_default_policy,
}


def main() -> None:
    raw = sys.stdin.read().strip()
    if not raw:
        fail("No input received on stdin", "NO_INPUT")

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        fail(f"Invalid JSON payload: {exc}", "INVALID_JSON")
        return

    command = payload.get("command")
    if command not in COMMANDS:
        fail(f"Unknown command '{command}'. Valid: {', '.join(COMMANDS)}", "UNKNOWN_COMMAND")
        return

    COMMANDS[command](payload)


if __name__ == "__main__":
    main()
