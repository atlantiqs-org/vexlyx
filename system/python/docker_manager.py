#!/usr/bin/env python3
"""
docker_manager.py -- System-layer script for Vexlyx Docker container lifecycle.

Called by the API service via child_process.spawn with a JSON payload on stdin.
Writes JSON results to stdout and exits with code 0 on success, 1 on error.

Commands:
  deploy    -- Generate docker-compose.yml for the project then `docker compose up -d`.
               Returns: { containerId, hostPort, hostname }
  start     -- `docker compose start` in the project deploy dir.
  stop      -- `docker compose stop` in the project deploy dir.
  restart   -- `docker compose restart` in the project deploy dir.
  remove    -- `docker compose down --volumes --remove-orphans` in the project deploy dir.
  status    -- Inspect running container and return container status.
  logs      -- `docker compose logs --tail=N` in the project deploy dir.

Port allocation strategy:
  Each project gets a unique host port derived from a configurable range (default 8100-8999).
  The port is deterministically derived from the project ID hash so re-deploys reuse the same port.
  Users can override via the `hostPort` payload field.

Never run this script as root.
Requires Docker CLI (docker compose v2) to be installed and available in PATH.
"""

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# Stream encoding
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


def log_line(message: str) -> None:
    print(json.dumps({"log": message}), flush=True)


def fail(message: str, code: str = "DOCKER_ERROR") -> None:
    print(json.dumps({"error": message, "code": code}), flush=True)
    sys.exit(1)


def require_field(payload: dict, field: str) -> str:
    value = payload.get(field)
    if not value or not isinstance(value, str):
        fail(f"Missing required field: {field}", "INVALID_PAYLOAD")
    return value  # type: ignore[return-value]


def get_docker_binary() -> str:
    binary = shutil.which("docker")
    if binary:
        return binary
    fail(
        "Docker CLI not found in PATH. Install Docker Engine or Docker Desktop.",
        "DOCKER_NOT_FOUND",
    )
    return "docker"  # unreachable


def ensure_traefik_network(docker_bin: str) -> None:
    """Ensure the external 'traefik-net' bridge network exists in Docker."""
    res = subprocess.run(
        [docker_bin, "network", "inspect", "traefik-net"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if res.returncode != 0:
        log_line("[vexlyx] Creating Docker network: traefik-net")
        subprocess.run(
            [docker_bin, "network", "create", "traefik-net"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )


def run_compose(
    compose_dir: str,
    args: list[str],
    docker_bin: str,
    capture: bool = False,
) -> subprocess.CompletedProcess[str] | None:
    """Run `docker compose <args>` in compose_dir. Streams stdout if not capture mode."""
    if not Path(compose_dir).is_dir():
        fail(
            f"Compose directory does not exist: {compose_dir}",
            "COMPOSE_DIR_NOT_FOUND",
        )

    cmd = [docker_bin, "compose"] + args
    if capture:
        return subprocess.run(
            cmd,
            cwd=compose_dir,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )

    proc = subprocess.Popen(
        cmd,
        cwd=compose_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,
    )
    if proc.stdout:
        for line in proc.stdout:
            stripped = line.rstrip("\r\n")
            if stripped:
                log_line(stripped)
    proc.wait()
    if proc.returncode != 0:
        fail(
            f"`docker compose {' '.join(args)}` failed with exit code {proc.returncode}",
            "COMPOSE_NONZERO_EXIT",
        )
    return None


def derive_host_port(project_id: str, port_start: int, port_end: int) -> int:
    """
    Deterministically derive a host port from project_id so re-deploys reuse
    the same port without needing a port database.
    """
    h = int(hashlib.sha256(project_id.encode()).hexdigest(), 16)
    port_range = port_end - port_start + 1
    return port_start + (h % port_range)


def slugify(name: str) -> str:
    """Convert a project name to a Docker-safe service/router name."""
    slug = re.sub(r"[^a-z0-9-]", "-", name.lower())
    return re.sub(r"-+", "-", slug).strip("-") or "app"


def get_templates_dir() -> Path:
    """Find the system/templates/docker-compose directory."""
    script_dir = Path(__file__).resolve().parent
    # script is at system/python/docker_manager.py → templates at system/templates/
    candidates = [
        script_dir.parent / "templates" / "docker-compose",
        Path(os.getcwd()) / "system" / "templates" / "docker-compose",
        Path(os.getcwd()) / "../../system" / "templates" / "docker-compose",
    ]
    for c in candidates:
        if c.is_dir():
            return c
    fail(
        "Cannot find system/templates/docker-compose directory.",
        "TEMPLATES_DIR_NOT_FOUND",
    )
    return candidates[0]  # unreachable


def pick_template(project_type: str) -> str:
    """Return the template filename for a given project type."""
    mapping = {
        "NODEJS": "node.yml",
        "NEXTJS": "next.yml",
        "PYTHON": "python.yml",
        "REACT": "static.yml",
        "STATIC": "static.yml",
        "PHP": "php.yml",
        "WORDPRESS": "wordpress.yml",
        "DOCKER": "node.yml",    # fallback until custom Dockerfile added in F2.5
    }
    return mapping.get(project_type.upper(), "node.yml")


def default_container_port(project_type: str) -> int:
    """Return the expected internal container port for a project type."""
    mapping = {
        "NODEJS": 3000,
        "NEXTJS": 3000,
        "PYTHON": 8000,
        "REACT": 80,
        "STATIC": 80,
        "PHP": 80,
        "WORDPRESS": 80,
        "DOCKER": 3000,
    }
    return mapping.get(project_type.upper(), 3000)


def build_env_block(env_vars: dict[str, str], indent: int = 6) -> str:
    """Format env vars as indented YAML key-value pairs for the compose template."""
    if not env_vars:
        return ""
    pad = " " * indent
    lines = [f"{pad}{k}: {json.dumps(str(v))}" for k, v in env_vars.items()]
    return "\n".join(lines)


def generate_compose_file(
    compose_dir: Path,
    template_path: Path,
    image_name: str,
    service_name: str,
    hostname: str,
    host_port: int,
    container_port: int,
    memory_limit: str,
    env_vars: dict[str, str],
) -> None:
    template = template_path.read_text(encoding="utf-8")
    env_block = build_env_block(env_vars)
    content = (
        template
        .replace("{{image_name}}", image_name)
        .replace("{{service_name}}", service_name)
        .replace("{{hostname}}", hostname)
        .replace("{{host_port}}", str(host_port))
        .replace("{{container_port}}", str(container_port))
        .replace("{{memory_limit}}", memory_limit)
        .replace("{{env_block}}", env_block)
    )
    compose_dir.mkdir(parents=True, exist_ok=True)
    (compose_dir / "docker-compose.yml").write_text(content, encoding="utf-8")


def get_container_id(compose_dir: str, docker_bin: str) -> str | None:
    """Return the short container ID of the `app` service, or None."""
    if not Path(compose_dir).is_dir() or not (Path(compose_dir) / "docker-compose.yml").is_file():
        return None

    result = subprocess.run(
        [docker_bin, "compose", "ps", "-q", "app"],
        cwd=compose_dir,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    container_id = result.stdout.strip()
    return container_id if container_id else None


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------


def cmd_deploy(payload: dict) -> None:
    """
    Generate a docker-compose.yml for the project and start the container.

    Required payload fields:
      projectId    -- project database ID
      projectName  -- project name (used for hostname slug)
      projectDir   -- absolute path to the deploy directory
      imageName    -- Docker image name built by Nixpacks (F1.4)
      projectType  -- e.g. NODEJS, PYTHON, STATIC
      baseDomain   -- base domain for Traefik hostname (e.g. vexlyx.localhost)
      memoryLimit  -- Docker memory limit (e.g. 128m)
      portRangeStart -- start of host-port range
      portRangeEnd   -- end of host-port range

    Optional payload fields:
      hostPort     -- override dynamic port assignment
      containerPort -- override default container port
      domain       -- fully custom hostname override
      envVars      -- dict of env var key->value to inject

    Returns: { containerId, hostPort, hostname }
    """
    project_id = require_field(payload, "projectId")
    project_name = require_field(payload, "projectName")
    project_dir = require_field(payload, "projectDir")
    image_name = require_field(payload, "imageName")
    project_type = payload.get("projectType", "NODEJS")
    base_domain = payload.get("baseDomain", "vexlyx.localhost")
    memory_limit = payload.get("memoryLimit", "128m")
    port_start = int(payload.get("portRangeStart", 8100))
    port_end = int(payload.get("portRangeEnd", 8999))
    env_vars: dict[str, str] = payload.get("envVars", {})
    docker_bin = get_docker_binary()

    # Ensure network exists
    ensure_traefik_network(docker_bin)

    # Resolve ports
    host_port = int(payload["hostPort"]) if payload.get("hostPort") else derive_host_port(project_id, port_start, port_end)
    container_port = int(payload["containerPort"]) if payload.get("containerPort") else default_container_port(project_type)

    # Resolve hostname
    slug = slugify(project_name)
    hostname = payload.get("domain") or f"{slug}.{base_domain}"

    # Sanitize service name (Traefik router names must be alphanumeric + hyphens)
    service_name = slugify(project_id[:12])

    # Resolve template
    templates_dir = get_templates_dir()
    template_file = templates_dir / pick_template(project_type)
    if not template_file.is_file():
        fail(f"Template not found: {template_file}", "TEMPLATE_NOT_FOUND")

    compose_dir = Path(project_dir) / "deploy"
    log_line(f"[vexlyx] Generating docker-compose.yml in {compose_dir}")
    generate_compose_file(
        compose_dir=compose_dir,
        template_path=template_file,
        image_name=image_name,
        service_name=service_name,
        hostname=hostname,
        host_port=host_port,
        container_port=container_port,
        memory_limit=memory_limit,
        env_vars=env_vars,
    )

    log_line(f"[vexlyx] Starting container: image={image_name} port={host_port} hostname={hostname}")
    run_compose(str(compose_dir), ["up", "-d", "--force-recreate", "--pull", "never"], docker_bin)

    # Retrieve the container ID
    container_id = get_container_id(str(compose_dir), docker_bin) or ""
    log_line(f"[vexlyx] Container started: id={container_id[:12] if container_id else 'unknown'}")

    respond({
        "done": True,
        "containerId": container_id,
        "hostPort": host_port,
        "hostname": hostname,
    })


def cmd_start(payload: dict) -> None:
    project_dir = require_field(payload, "projectDir")
    docker_bin = get_docker_binary()
    compose_dir = str(Path(project_dir) / "deploy")
    if not Path(compose_dir).is_dir():
        fail(f"Deploy directory not found: {compose_dir}", "NOT_DEPLOYED")
    log_line("[vexlyx] Starting container…")
    run_compose(compose_dir, ["start"], docker_bin)
    respond({"done": True})


def cmd_stop(payload: dict) -> None:
    project_dir = require_field(payload, "projectDir")
    docker_bin = get_docker_binary()
    compose_dir = str(Path(project_dir) / "deploy")
    if not Path(compose_dir).is_dir():
        fail(f"Deploy directory not found: {compose_dir}", "NOT_DEPLOYED")
    log_line("[vexlyx] Stopping container…")
    run_compose(compose_dir, ["stop"], docker_bin)
    respond({"done": True})


def cmd_restart(payload: dict) -> None:
    project_dir = require_field(payload, "projectDir")
    docker_bin = get_docker_binary()
    compose_dir = str(Path(project_dir) / "deploy")
    if not Path(compose_dir).is_dir():
        fail(f"Deploy directory not found: {compose_dir}", "NOT_DEPLOYED")
    log_line("[vexlyx] Restarting container…")
    run_compose(compose_dir, ["restart"], docker_bin)
    respond({"done": True})


def cmd_remove(payload: dict) -> None:
    project_dir = require_field(payload, "projectDir")
    docker_bin = get_docker_binary()
    compose_dir = str(Path(project_dir) / "deploy")
    if not Path(compose_dir).is_dir():
        respond({"done": True})
        return
    log_line("[vexlyx] Removing container (down --volumes --remove-orphans)…")
    run_compose(compose_dir, ["down", "--volumes", "--remove-orphans"], docker_bin)
    respond({"done": True})


def cmd_status(payload: dict) -> None:
    project_dir = require_field(payload, "projectDir")
    docker_bin = get_docker_binary()
    compose_dir = str(Path(project_dir) / "deploy")

    if not Path(compose_dir).is_dir():
        respond({"containerStatus": "not_found", "containerId": None})
        return

    container_id = get_container_id(compose_dir, docker_bin)
    if not container_id:
        respond({"containerStatus": "not_found", "containerId": None})
        return

    result = subprocess.run(
        [docker_bin, "inspect", "--format", "{{.State.Status}}", container_id],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    status = result.stdout.strip() if result.returncode == 0 else "unknown"
    respond({"containerStatus": status, "containerId": container_id})


def cmd_logs(payload: dict) -> None:
    project_dir = require_field(payload, "projectDir")
    tail = int(payload.get("tail", 100))
    docker_bin = get_docker_binary()
    compose_dir = str(Path(project_dir) / "deploy")

    if not Path(compose_dir).is_dir():
        respond({"logs": "No runtime logs available. Container has not been deployed yet."})
        return

    result = subprocess.run(
        [docker_bin, "compose", "logs", f"--tail={tail}", "--no-log-prefix", "app"],
        cwd=compose_dir,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    if result.returncode != 0 and not result.stdout.strip() and not result.stderr.strip():
        respond({"logs": "No runtime logs available."})
        return

def cmd_logs_follow(payload: dict) -> None:
    project_dir = require_field(payload, "projectDir")
    tail = int(payload.get("tail", 100))
    docker_bin = get_docker_binary()
    compose_dir = str(Path(project_dir) / "deploy")

    if not Path(compose_dir).is_dir():
        fail("No runtime logs available. Container has not been deployed yet.", "DEPLOY_DIR_NOT_FOUND")
        return

    proc = subprocess.Popen(
        [docker_bin, "compose", "logs", "--follow", f"--tail={tail}", "--no-log-prefix", "app"],
        cwd=compose_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,
    )

    try:
        if proc.stdout:
            for line in iter(proc.stdout.readline, ""):
                text = line.rstrip("\r\n")
                if text:
                    print(json.dumps({"log": text, "stream": "stdout"}), flush=True)
    except (BrokenPipeError, KeyboardInterrupt):
        pass
    finally:
        try:
            proc.terminate()
            proc.wait(timeout=2)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

COMMANDS = {
    "deploy": cmd_deploy,
    "start": cmd_start,
    "stop": cmd_stop,
    "restart": cmd_restart,
    "remove": cmd_remove,
    "status": cmd_status,
    "logs": cmd_logs,
    "logs_follow": cmd_logs_follow,
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
        fail(
            f"Unknown command '{command}'. Valid: {', '.join(COMMANDS)}",
            "UNKNOWN_COMMAND",
        )
        return

    COMMANDS[command](payload)


if __name__ == "__main__":
    main()
