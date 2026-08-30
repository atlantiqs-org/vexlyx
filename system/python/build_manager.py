#!/usr/bin/env python3
"""
build_manager.py — System-layer script for Vexlyx Nixpacks build operations.

Called by the API service via child_process.spawn with a JSON payload on stdin.
Writes JSON results to stdout and exits with code 0 on success, 1 on error.

Commands:
  plan   — Run `nixpacks plan` to detect the framework and proposed build command.
           Returns a single JSON object: { framework, buildCmd }.

  build  — Run `nixpacks build` to create a Docker image.
           Streams log lines as newline-delimited JSON: { log: "..." }
           Ends with: { done: true, imageName: "..." }

Never run this script as root.
Requires `nixpacks` to be installed and available in PATH.
"""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Ensure standard streams use UTF-8 on all platforms (especially Windows)
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
    """Write a JSON result to stdout and flush."""
    print(json.dumps(data), flush=True)


def log_line(message: str) -> None:
    """Emit a single log line as newline-delimited JSON for streaming."""
    print(json.dumps({"log": message}), flush=True)


def fail(message: str, code: str = "BUILD_ERROR") -> None:
    """Write a JSON error to stdout and exit 1."""
    print(json.dumps({"error": message, "code": code}), flush=True)
    sys.exit(1)


def require_field(payload: dict, field: str) -> str:
    value = payload.get(field)
    if not value or not isinstance(value, str):
        fail(f"Missing required field: {field}", "INVALID_PAYLOAD")
    return value  # type: ignore[return-value]  — fail() exits


def get_nixpacks_binary() -> str:
    """Find nixpacks in PATH or common install directories."""
    binary = shutil.which("nixpacks")
    if binary:
        return binary

    # Check common user installation directories
    home = Path.home()
    candidates = [
        home / ".nixpacks" / "bin" / ("nixpacks.exe" if sys.platform == "win32" else "nixpacks"),
        Path("/usr/local/bin/nixpacks"),
        Path("/usr/bin/nixpacks"),
        Path("C:/Program Files/nixpacks/nixpacks.exe"),
    ]

    for candidate in candidates:
        if candidate.is_file():
            return str(candidate.resolve())

    if sys.platform == "win32":
        install_cmd = "PowerShell: irm https://nixpacks.com/install.ps1 | iex"
    else:
        install_cmd = "curl -sSL https://nixpacks.com/install.sh | sh"

    fail(
        f"nixpacks is not installed or not found in PATH. Install it with: {install_cmd}",
        "NIXPACKS_NOT_FOUND",
    )
    return "nixpacks"  # unreachable — fail() exits


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_plan(payload: dict) -> None:
    """
    Detect the framework and proposed build command for a project directory.

    Payload fields:
      projectDir — absolute path to the cloned project source

    Returns a single JSON object:
      { framework: string, buildCmd: string | null }
    """
    project_dir = require_field(payload, "projectDir")
    nixpacks_bin = get_nixpacks_binary()

    if not Path(project_dir).is_dir():
        fail(
            f"Project directory does not exist: {project_dir}",
            "PROJECT_DIR_NOT_FOUND",
        )

    result = subprocess.run(
        [nixpacks_bin, "plan", project_dir, "--format", "json"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    if result.returncode != 0:
        error_output = (result.stderr or result.stdout or "").strip()
        fail(f"nixpacks plan failed:\n{error_output}", "NIXPACKS_PLAN_FAILED")

    raw_output = result.stdout.strip()
    if not raw_output:
        fail("nixpacks plan produced no output", "NIXPACKS_PLAN_NO_OUTPUT")

    try:
        plan = json.loads(raw_output)
    except json.JSONDecodeError:
        # nixpacks plan output is not always clean JSON; treat as unknown
        plan = {}

    # Extract framework name — nixpacks returns it under different keys
    # depending on version (providers, variables.NIXPACKS_METADATA, language, etc.)
    providers = plan.get("providers") or []
    provider_name = providers[0] if len(providers) > 0 else None
    variables = plan.get("variables") or {}
    metadata = variables.get("NIXPACKS_METADATA")

    framework = (
        provider_name
        or metadata
        or plan.get("language")
        or plan.get("provider")
        or "unknown"
    )
    if isinstance(framework, dict):
        framework = framework.get("name", "unknown")

    build_cmd = None
    phases = plan.get("phases", {})
    build_phase = phases.get("build", {})
    if isinstance(build_phase, dict):
        cmds = build_phase.get("cmds", [])
        if cmds:
            build_cmd = " && ".join(cmds)

    respond({"framework": str(framework), "buildCmd": build_cmd})


def cmd_build(payload: dict) -> None:
    """
    Build a Docker image for a project using Nixpacks.

    Payload fields:
      projectDir — absolute path to the cloned project source
      imageName  — Docker image name/tag (e.g. vexlyx-<projectId>)
      buildCmd   — optional build command override (passed via --build-cmd)

    Streams log lines as: { "log": "<line>" }
    Ends with:            { "done": true, "imageName": "<imageName>" }
    """
    project_dir = require_field(payload, "projectDir")
    image_name = require_field(payload, "imageName")
    build_cmd = payload.get("buildCmd")
    nixpacks_bin = get_nixpacks_binary()

    if not Path(project_dir).is_dir():
        fail(
            f"Project directory does not exist: {project_dir}",
            "PROJECT_DIR_NOT_FOUND",
        )

    cmd = [nixpacks_bin, "build", project_dir, "--name", image_name]

    if build_cmd:
        cmd += ["--build-cmd", build_cmd]

    log_line(f"Running: {' '.join(cmd)}")

    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,  # line-buffered
    )

    # Stream combined output line by line
    if proc.stdout:
        for line in proc.stdout:
            stripped = line.rstrip("\r\n")
            if stripped:
                log_line(stripped)

    proc.wait()

    if proc.returncode != 0:
        fail(
            f"nixpacks build failed with exit code {proc.returncode}",
            "NIXPACKS_BUILD_FAILED",
        )

    # Signal successful completion
    print(json.dumps({"done": True, "imageName": image_name}), flush=True)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

COMMANDS = {
    "plan": cmd_plan,
    "build": cmd_build,
}


def main() -> None:
    raw = sys.stdin.read().strip()
    if not raw:
        fail("No input received on stdin", "NO_INPUT")

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        fail(f"Invalid JSON payload: {exc}", "INVALID_JSON")
        return  # unreachable — fail() exits; here for type checker

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
