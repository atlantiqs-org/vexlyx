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
import re
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
# Node.js & React / Vite Framework Helpers (F2.3)
# ---------------------------------------------------------------------------

def detect_node_version(project_dir: Path, env_vars: dict | None = None) -> str | None:
    """
    Detect Node.js version requested by project (e.g. '18', '20', '22').
    Checks:
    1. env_vars['NIXPACKS_NODE_VERSION'] or env_vars['NODE_VERSION']
    2. .nvmrc file
    3. .node-version file
    4. package.json -> engines.node
    """
    if env_vars:
        if env_vars.get("NIXPACKS_NODE_VERSION"):
            return str(env_vars["NIXPACKS_NODE_VERSION"]).strip()
        if env_vars.get("NODE_VERSION"):
            return str(env_vars["NODE_VERSION"]).strip()

    # 1. .nvmrc
    nvmrc = project_dir / ".nvmrc"
    if nvmrc.is_file():
        try:
            content = nvmrc.read_text(encoding="utf-8").strip()
            m = re.search(r"v?(\d+(?:\.\d+)?)", content)
            if m:
                return m.group(1)
        except Exception:
            pass

    # 2. .node-version
    node_ver_file = project_dir / ".node-version"
    if node_ver_file.is_file():
        try:
            content = node_ver_file.read_text(encoding="utf-8").strip()
            m = re.search(r"v?(\d+(?:\.\d+)?)", content)
            if m:
                return m.group(1)
        except Exception:
            pass

    # 3. package.json engines.node
    pkg_json = project_dir / "package.json"
    if pkg_json.is_file():
        try:
            data = json.loads(pkg_json.read_text(encoding="utf-8"))
            engines = data.get("engines", {})
            node_engine = engines.get("node")
            if node_engine:
                m = re.search(r"(\d+(?:\.\d+)?)", str(node_engine))
                if m:
                    return m.group(1)
        except Exception:
            pass

    return None


def detect_vite_project(project_dir: Path, plan: dict) -> tuple[str, str | None, str | None, str] | None:
    """
    Detect Vite-based projects (React, Vue, Svelte, or Vanilla/Static Vite).
    Resolves build command and appropriate static start command (npx --yes serve -s dist -l 80).
    """
    vite_config_candidates = [
        "vite.config.js",
        "vite.config.ts",
        "vite.config.mjs",
        "vite.config.cjs",
        "vite.config.mts",
        "vite.config.cts",
    ]
    has_vite_config = any((project_dir / cfg).is_file() for cfg in vite_config_candidates)

    has_vite_dep = False
    has_react_dep = False
    has_vue_dep = False
    has_svelte_dep = False
    has_start_script = False

    pkg_json_path = project_dir / "package.json"
    if pkg_json_path.is_file():
        try:
            pkg = json.loads(pkg_json_path.read_text(encoding="utf-8"))
            deps = pkg.get("dependencies", {})
            dev_deps = pkg.get("devDependencies", {})
            scripts = pkg.get("scripts", {})
            all_deps = {**deps, **dev_deps}

            if "vite" in all_deps or "@vitejs/plugin-react" in all_deps or "@vitejs/plugin-react-swc" in all_deps or "@vitejs/plugin-vue" in all_deps:
                has_vite_dep = True
            if "react" in all_deps or "react-dom" in all_deps or "@vitejs/plugin-react" in all_deps or "@vitejs/plugin-react-swc" in all_deps:
                has_react_dep = True
            if "vue" in all_deps or "@vitejs/plugin-vue" in all_deps or "@vitejs/plugin-vue-jsx" in all_deps:
                has_vue_dep = True
            if "svelte" in all_deps or "@sveltejs/vite-plugin-svelte" in all_deps:
                has_svelte_dep = True
            if "start" in scripts:
                has_start_script = True
        except Exception:
            pass

    if has_vite_config or has_vite_dep:
        # Resolve package manager for build command
        pkg_mgr = "npm"
        if (project_dir / "pnpm-lock.yaml").is_file():
            pkg_mgr = "pnpm"
        elif (project_dir / "yarn.lock").is_file():
            pkg_mgr = "yarn"
        elif (project_dir / "bun.lockb").is_file() or (project_dir / "bun.lock").is_file():
            pkg_mgr = "bun"

        default_build = "yarn build" if pkg_mgr == "yarn" else f"{pkg_mgr} run build"

        phases = plan.get("phases", {})
        build_phase = phases.get("build", {})
        build_cmd = None
        if isinstance(build_phase, dict):
            cmds = build_phase.get("cmds", [])
            if cmds:
                build_cmd = " && ".join(cmds)
        if not build_cmd:
            build_cmd = default_build

        # Resolve start command:
        # 1. If nixpacks plan already resolved a start command (e.g. Caddy), use it
        # 2. If package.json has a "start" script, use package manager start command
        # 3. For static/Vite sites, use "npx --yes serve -s dist -l 80" so container serves built static files on port 80
        start_section = plan.get("start", {})
        start_cmd = start_section.get("cmd") if isinstance(start_section, dict) else None

        if not start_cmd:
            if has_start_script:
                start_cmd = "yarn start" if pkg_mgr == "yarn" else f"{pkg_mgr} run start"
            else:
                start_cmd = "npx --yes serve -s dist -l 80"

        # Determine exact framework and project type
        if has_react_dep:
            framework = "react"
            project_type = "REACT"
        elif has_vue_dep:
            framework = "vue"
            project_type = "STATIC"
        elif has_svelte_dep:
            framework = "svelte"
            project_type = "STATIC"
        else:
            framework = "vite"
            project_type = "STATIC"

        return (framework, build_cmd, start_cmd, project_type)

    return None


def detect_static_project(project_dir: Path, plan: dict) -> tuple[str, str | None, str | None, str] | None:
    """
    Detect plain static HTML/CSS/JS websites without frameworks.
    """
    if (project_dir / "index.html").is_file() and not (project_dir / "package.json").is_file():
        start_section = plan.get("start", {})
        start_cmd = start_section.get("cmd") if isinstance(start_section, dict) else None
        if not start_cmd:
            start_cmd = "npx --yes serve -s . -l 80"
        return ("static", None, start_cmd, "STATIC")
    return None


# ---------------------------------------------------------------------------
# Python Framework & Version Helpers (F2.2)
# ---------------------------------------------------------------------------

def detect_python_version(project_dir: Path, env_vars: dict | None = None) -> str | None:
    """
    Detect Python version requested by project (e.g. '3.10', '3.11', '3.12').
    Checks:
    1. env_vars['NIXPACKS_PYTHON_VERSION'] or env_vars['PYTHON_VERSION']
    2. .python-version file
    3. runtime.txt file
    4. pyproject.toml
    """
    if env_vars:
        if env_vars.get("NIXPACKS_PYTHON_VERSION"):
            return str(env_vars["NIXPACKS_PYTHON_VERSION"]).strip()
        if env_vars.get("PYTHON_VERSION"):
            return str(env_vars["PYTHON_VERSION"]).strip()

    # 1. .python-version
    py_version_file = project_dir / ".python-version"
    if py_version_file.is_file():
        try:
            content = py_version_file.read_text(encoding="utf-8").strip()
            m = re.search(r"(\d+\.\d+(?:\.\d+)?)", content)
            if m:
                ver = m.group(1)
                parts = ver.split(".")
                return f"{parts[0]}.{parts[1]}" if len(parts) >= 2 else ver
        except Exception:
            pass

    # 2. runtime.txt
    runtime_file = project_dir / "runtime.txt"
    if runtime_file.is_file():
        try:
            content = runtime_file.read_text(encoding="utf-8").strip()
            m = re.search(r"(\d+\.\d+(?:\.\d+)?)", content)
            if m:
                ver = m.group(1)
                parts = ver.split(".")
                return f"{parts[0]}.{parts[1]}" if len(parts) >= 2 else ver
        except Exception:
            pass

    # 3. pyproject.toml
    pyproject_file = project_dir / "pyproject.toml"
    if pyproject_file.is_file():
        try:
            content = pyproject_file.read_text(encoding="utf-8")
            m = re.search(r'(?:python|requires-python)\s*=\s*["\']([^"\']+)["\']', content, re.IGNORECASE)
            if m:
                raw_ver = m.group(1)
                vm = re.search(r"(\d+\.\d+)", raw_ver)
                if vm:
                    return vm.group(1)
        except Exception:
            pass

    return None


def find_django_wsgi_module(project_dir: Path) -> str:
    """Find the Django wsgi module name (e.g. 'mysite.wsgi' or 'config.wsgi')."""
    # Check if manage.py specifies DJANGO_SETTINGS_MODULE
    manage_py = project_dir / "manage.py"
    if manage_py.is_file():
        try:
            content = manage_py.read_text(encoding="utf-8")
            m = re.search(r"DJANGO_SETTINGS_MODULE['\"]\s*,\s*['\"]([^'\"]+)\.settings['\"]", content)
            if m:
                pkg_name = m.group(1).strip()
                if (project_dir / pkg_name / "wsgi.py").is_file():
                    return f"{pkg_name}.wsgi"
        except Exception:
            pass

    # Search subdirectories for wsgi.py
    ignore_dirs = {".git", ".venv", "venv", "env", "__pycache__", "node_modules", "static", "staticfiles", "media"}
    for child in project_dir.iterdir():
        if child.is_dir() and child.name not in ignore_dirs and not child.name.startswith("."):
            if (child / "wsgi.py").is_file():
                return f"{child.name}.wsgi"

    if (project_dir / "wsgi.py").is_file():
        return "wsgi"

    return "wsgi"


def find_flask_entrypoint(project_dir: Path) -> str:
    """Auto-detect Flask app entrypoint (e.g. 'app:app', 'main:app', 'wsgi:app')."""
    candidates = [
        ("app.py", "app:app"),
        ("main.py", "main:app"),
        ("wsgi.py", "wsgi:app"),
        ("application.py", "application:app"),
        ("src/app.py", "src.app:app"),
        ("src/main.py", "src.main:app"),
        ("api/index.py", "api.index:app"),
        ("api/app.py", "api.app:app"),
    ]
    for rel_path, entry in candidates:
        if (project_dir / rel_path).is_file():
            return entry

    return "app:app"


def find_fastapi_entrypoint(project_dir: Path) -> str:
    """Auto-detect FastAPI app entrypoint (e.g. 'main:app', 'app.main:app', 'app:app')."""
    candidates = [
        ("main.py", "main:app"),
        ("app/main.py", "app.main:app"),
        ("app.py", "app:app"),
        ("src/main.py", "src.main:app"),
        ("src/app.py", "src.app:app"),
        ("api/index.py", "api.index:app"),
        ("api/main.py", "api.main:app"),
    ]
    for rel_path, entry in candidates:
        if (project_dir / rel_path).is_file():
            return entry

    return "main:app"


def detect_python_project(project_dir: Path, plan: dict) -> tuple[str, str | None, str | None, str] | None:
    """
    Detect Python framework (Django, Flask, FastAPI, generic Python),
    suggested build command, start command, and 'PYTHON' project type.
    """
    deps_text = ""
    req_file = project_dir / "requirements.txt"
    if req_file.is_file():
        try:
            deps_text += "\n" + req_file.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            pass

    pyproject_file = project_dir / "pyproject.toml"
    if pyproject_file.is_file():
        try:
            deps_text += "\n" + pyproject_file.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            pass

    pipfile = project_dir / "Pipfile"
    if pipfile.is_file():
        try:
            deps_text += "\n" + pipfile.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            pass

    setup_py = project_dir / "setup.py"
    if setup_py.is_file():
        try:
            deps_text += "\n" + setup_py.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            pass

    deps_lower = deps_text.lower()

    has_manage_py = (project_dir / "manage.py").is_file()
    has_django_dep = bool(re.search(r"\bdjango\b", deps_lower))
    has_fastapi_dep = bool(re.search(r"\bfastapi\b", deps_lower))
    has_flask_dep = bool(re.search(r"\bflask\b", deps_lower))

    providers = plan.get("providers") or []
    plan_is_python = any("python" in str(p).lower() for p in providers) or "python" in str(plan.get("language", "")).lower()

    # 1. Django
    if has_manage_py or has_django_dep:
        wsgi_module = find_django_wsgi_module(project_dir)
        build_cmd = "python manage.py collectstatic --noinput" if has_manage_py else None
        start_cmd = f"gunicorn {wsgi_module}:application --bind 0.0.0.0:${{PORT:-8000}} --workers 2"
        return ("django", build_cmd, start_cmd, "PYTHON")

    # 2. FastAPI
    if has_fastapi_dep:
        entrypoint = find_fastapi_entrypoint(project_dir)
        start_cmd = f"uvicorn {entrypoint} --host 0.0.0.0 --port ${{PORT:-8000}} --workers 2"
        return ("fastapi", None, start_cmd, "PYTHON")

    # 3. Flask
    if has_flask_dep:
        entrypoint = find_flask_entrypoint(project_dir)
        start_cmd = f"gunicorn -w 2 -b 0.0.0.0:${{PORT:-8000}} {entrypoint}"
        return ("flask", None, start_cmd, "PYTHON")

    # 4. Generic Python
    has_py_files = bool(list(project_dir.glob("*.py"))) or req_file.is_file() or pyproject_file.is_file() or (project_dir / "runtime.txt").is_file() or (project_dir / ".python-version").is_file()

    if plan_is_python or has_py_files:
        start_cmd = None
        if (project_dir / "main.py").is_file():
            start_cmd = "python main.py"
        elif (project_dir / "app.py").is_file():
            start_cmd = "python app.py"
        elif (project_dir / "wsgi.py").is_file():
            start_cmd = "gunicorn wsgi:application"
        return ("python", None, start_cmd, "PYTHON")

    return None


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def detect_framework_and_commands(project_dir: Path, plan: dict) -> tuple[str, str | null, str | null, str | null]:
    """
    Detect the project framework, suggested build command, start command,
    and normalized project type based on file heuristics and Nixpacks plan.
    """
    # Detect package manager for Node/JS projects
    pkg_mgr = "npm"
    if (project_dir / "pnpm-lock.yaml").is_file():
        pkg_mgr = "pnpm"
    elif (project_dir / "yarn.lock").is_file():
        pkg_mgr = "yarn"
    elif (project_dir / "bun.lockb").is_file() or (project_dir / "bun.lock").is_file():
        pkg_mgr = "bun"

    default_build = "yarn build" if pkg_mgr == "yarn" else f"{pkg_mgr} run build"
    default_start = "yarn start" if pkg_mgr == "yarn" else f"{pkg_mgr} run start"

    # 1. Direct Next.js heuristic check
    is_nextjs = False
    next_config_candidates = [
        "next.config.js",
        "next.config.mjs",
        "next.config.ts",
        "next.config.cjs",
    ]
    for cfg in next_config_candidates:
        if (project_dir / cfg).is_file():
            is_nextjs = True
            break

    pkg_json_path = project_dir / "package.json"
    if not is_nextjs and pkg_json_path.is_file():
        try:
            pkg = json.loads(pkg_json_path.read_text(encoding="utf-8"))
            deps = pkg.get("dependencies", {})
            dev_deps = pkg.get("devDependencies", {})
            if "next" in deps or "next" in dev_deps:
                is_nextjs = True
        except Exception:
            pass

    if is_nextjs:
        phases = plan.get("phases", {})
        build_phase = phases.get("build", {})
        build_cmd = None
        if isinstance(build_phase, dict):
            cmds = build_phase.get("cmds", [])
            if cmds:
                build_cmd = " && ".join(cmds)
        if not build_cmd:
            build_cmd = default_build

        start_section = plan.get("start", {})
        start_cmd = start_section.get("cmd") if isinstance(start_section, dict) else None
        if not start_cmd:
            start_cmd = default_start

        return ("nextjs", build_cmd, start_cmd, "NEXTJS")

    # 2. Direct Vite / React / Vue / Static heuristic check (F2.3)
    vite_result = detect_vite_project(project_dir, plan)
    if vite_result:
        v_framework, v_build_cmd, v_start_cmd, v_type = vite_result
        return (v_framework, v_build_cmd, v_start_cmd, v_type)

    # 3. Python (Django / Flask / FastAPI / Python) check (F2.2)
    py_result = detect_python_project(project_dir, plan)
    if py_result:
        py_framework, py_build_cmd, py_start_cmd, py_type = py_result
        return (py_framework, py_build_cmd, py_start_cmd, py_type)

    # 4. Plain Static HTML/CSS/JS check
    static_result = detect_static_project(project_dir, plan)
    if static_result:
        s_framework, s_build_cmd, s_start_cmd, s_type = static_result
        return (s_framework, s_build_cmd, s_start_cmd, s_type)

    # 5. Generic Node / Frontend build tools (Gulp, Webpack, etc.) & Nixpacks fallback
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

    start_section = plan.get("start", {})
    start_cmd = start_section.get("cmd") if isinstance(start_section, dict) else None

    # Check Gulp / Webpack / generic frontend build manifests
    has_gulp = (project_dir / "gulpfile.js").is_file() or (project_dir / "gulpfile.ts").is_file()
    has_webpack = (project_dir / "webpack.config.js").is_file() or (project_dir / "webpack.config.ts").is_file()
    if has_gulp:
        framework = "gulp"
    elif has_webpack:
        framework = "webpack"

    # Map detected framework to standard ProjectType if possible
    fw_lower = str(framework).lower()
    detected_type = None
    if "next" in fw_lower:
        detected_type = "NEXTJS"
    elif "react" in fw_lower or "vite" in fw_lower:
        detected_type = "REACT"
    elif "gulp" in fw_lower or "webpack" in fw_lower or "static" in fw_lower or "html" in fw_lower:
        detected_type = "STATIC"
    elif "node" in fw_lower or "javascript" in fw_lower or "typescript" in fw_lower:
        detected_type = "NODEJS"
    elif "python" in fw_lower or "django" in fw_lower or "flask" in fw_lower or "fastapi" in fw_lower:
        detected_type = "PYTHON"

    # For Node/JS/TS/Static projects, resolve start_cmd and align static builds
    pkg_json_path = project_dir / "package.json"
    if pkg_json_path.is_file():
        try:
            pkg = json.loads(pkg_json_path.read_text(encoding="utf-8"))
            scripts = pkg.get("scripts", {})
            has_start_script = "start" in scripts
            has_build_script = "build" in scripts

            if not build_cmd and has_build_script:
                build_cmd = default_build

            if not start_cmd:
                if has_start_script:
                    start_cmd = default_start
                elif has_build_script or has_gulp or has_webpack:
                    # Frontend/static build tool with no server start script
                    start_cmd = 'if [ -d dist ]; then npx --yes serve -s dist -l 80; elif [ -d build ]; then npx --yes serve -s build -l 80; elif [ -d out ]; then npx --yes serve -s out -l 80; elif [ -d public ]; then npx --yes serve -s public -l 80; else npx --yes serve -s . -l 80; fi'
                    detected_type = "STATIC"
                elif (project_dir / "server.js").is_file():
                    start_cmd = "node server.js"
                elif (project_dir / "app.js").is_file():
                    start_cmd = "node app.js"
                elif (project_dir / "index.js").is_file():
                    start_cmd = "node index.js"
                elif pkg.get("main"):
                    start_cmd = f"node {pkg['main']}"
        except Exception:
            pass

    return (str(framework), build_cmd, start_cmd, detected_type)


def cmd_plan(payload: dict) -> None:
    """
    Detect the framework and proposed build command for a project directory.

    Payload fields:
      projectDir — absolute path to the cloned project source
      envVars    — optional dict of environment variables

    Returns a single JSON object:
      { framework: string, buildCmd: string | null, startCmd: string | null, detectedType: string | null }
    """
    project_dir = require_field(payload, "projectDir")
    env_vars = payload.get("envVars")
    nixpacks_bin = get_nixpacks_binary()
    project_path = Path(project_dir)

    if not project_path.is_dir():
        fail(
            f"Project directory does not exist: {project_dir}",
            "PROJECT_DIR_NOT_FOUND",
        )

    cmd = [nixpacks_bin, "plan", project_dir, "--format", "json"]

    # Detect python version and propagate to nixpacks plan
    py_ver = detect_python_version(project_path, env_vars if isinstance(env_vars, dict) else None)
    if py_ver:
        cmd += ["--env", f"NIXPACKS_PYTHON_VERSION={py_ver}"]

    # Detect node version and propagate to nixpacks plan
    node_ver = detect_node_version(project_path, env_vars if isinstance(env_vars, dict) else None)
    if not node_ver and ((project_path / "vite.config.js").is_file() or (project_path / "vite.config.ts").is_file() or (project_path / "next.config.js").is_file() or (project_path / "next.config.mjs").is_file() or (project_path / "next.config.ts").is_file()):
        node_ver = "20"

    if node_ver:
        cmd += ["--env", f"NIXPACKS_NODE_VERSION={node_ver}"]

    if isinstance(env_vars, dict):
        for k, v in env_vars.items():
            if k and v is not None and k not in ("NIXPACKS_PYTHON_VERSION", "NIXPACKS_NODE_VERSION"):
                cmd += ["--env", f"{k}={v}"]

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    plan = {}
    if result.returncode == 0:
        raw_output = result.stdout.strip()
        if raw_output:
            try:
                plan = json.loads(raw_output)
            except json.JSONDecodeError:
                plan = {}

    framework, build_cmd, start_cmd, detected_type = detect_framework_and_commands(
        project_path, plan
    )

    if result.returncode != 0 and framework == "unknown":
        error_output = (result.stderr or result.stdout or "").strip()
        fail(f"nixpacks plan failed:\n{error_output}", "NIXPACKS_PLAN_FAILED")

    respond({
        "framework": framework,
        "buildCmd": build_cmd,
        "startCmd": start_cmd,
        "detectedType": detected_type,
    })


def cmd_build(payload: dict) -> None:
    """
    Build a Docker image for a project using Nixpacks.

    Payload fields:
      projectDir — absolute path to the cloned project source
      imageName  — Docker image name/tag (e.g. vexlyx-<projectId>)
      buildCmd   — optional build command override (passed via --build-cmd)
      startCmd   — optional start command override (passed via --start-cmd)
      cacheKey   — optional cache key for incremental builds (passed via --cache-key)
      envVars    — optional dict of environment variables to pass to build phase

    Streams log lines as: { "log": "<line>" }
    Ends with:            { "done": true, "imageName": "<imageName>" }
    """
    project_dir = require_field(payload, "projectDir")
    image_name = require_field(payload, "imageName")
    install_cmd = payload.get("installCmd")
    build_cmd = payload.get("buildCmd")
    start_cmd = payload.get("startCmd")
    cache_key = payload.get("cacheKey")
    env_vars = payload.get("envVars")
    nixpacks_bin = get_nixpacks_binary()

    project_path = Path(project_dir)
    if not project_path.is_dir():
        fail(
            f"Project directory does not exist: {project_dir}",
            "PROJECT_DIR_NOT_FOUND",
        )

    # Auto-resolve start_cmd, build_cmd, and install_cmd if not provided
    detected_fw, detected_build, detected_start, detected_type = detect_framework_and_commands(project_path, {})
    if not start_cmd and detected_start:
        start_cmd = detected_start
    if not build_cmd and detected_build:
        build_cmd = detected_build

    # For Python projects, ensure setuptools<70 (which provides pkg_resources) is installed into venv for gunicorn/wsgi on Python 3.12
    if detected_type == "PYTHON" and not install_cmd:
        if (project_path / "requirements.txt").is_file():
            install_cmd = "python -m venv --copies /opt/venv && . /opt/venv/bin/activate && pip install 'setuptools<70' && pip install -r requirements.txt"
        elif (project_path / "pyproject.toml").is_file():
            install_cmd = "python -m venv --copies /opt/venv && . /opt/venv/bin/activate && pip install 'setuptools<70' && pip install ."
    elif not install_cmd:
        if (project_path / "bun.lockb").is_file() or (project_path / "bun.lock").is_file():
            install_cmd = "bun install"
        elif (project_path / "pnpm-lock.yaml").is_file():
            install_cmd = "pnpm install"
        elif (project_path / "yarn.lock").is_file():
            install_cmd = "yarn install"

    cmd = [nixpacks_bin, "build", project_dir, "--name", image_name]

    if cache_key:
        cmd += ["--cache-key", str(cache_key)]

    if install_cmd:
        cmd += ["--install-cmd", install_cmd]

    if build_cmd:
        cmd += ["--build-cmd", build_cmd]

    if start_cmd:
        cmd += ["--start-cmd", start_cmd]

    # Detect python and node versions and ensure they are passed
    py_ver = detect_python_version(Path(project_dir), env_vars if isinstance(env_vars, dict) else None)
    node_ver = detect_node_version(Path(project_dir), env_vars if isinstance(env_vars, dict) else None)
    if not node_ver and (detected_type in ("REACT", "NEXTJS") or detected_fw in ("vite", "react")):
        node_ver = "20"

    merged_env_vars = dict(env_vars) if isinstance(env_vars, dict) else {}
    if py_ver and "NIXPACKS_PYTHON_VERSION" not in merged_env_vars:
        merged_env_vars["NIXPACKS_PYTHON_VERSION"] = py_ver
    if node_ver and "NIXPACKS_NODE_VERSION" not in merged_env_vars:
        merged_env_vars["NIXPACKS_NODE_VERSION"] = node_ver

    for k, v in merged_env_vars.items():
        if k and v is not None:
            cmd += ["--env", f"{k}={v}"]

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

    # Stream combined output line by line, splitting both \r and \n from progress lines
    if proc.stdout:
        for raw_line in proc.stdout:
            parts = [p.strip() for p in raw_line.replace("\r", "\n").split("\n")]
            for part in parts:
                if part:
                    log_line(part)

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
