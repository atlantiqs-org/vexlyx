"""
test_python_runtime.py — Automated test suite for F2.2 Python (Django/Flask/FastAPI) Deployment.

Tests:
1. Django auto-detection via manage.py & requirements.txt / pyproject.toml
2. Django WSGI module auto-detection (mysite/wsgi.py, config/wsgi.py) & collectstatic command
3. Flask auto-detection & entrypoint resolution (app.py, main.py, wsgi.py)
4. FastAPI auto-detection & entrypoint resolution (main.py, app/main.py)
5. Python version pinning (3.10, 3.11, 3.12) from .python-version, runtime.txt, pyproject.toml, and env vars
6. Docker compose template generation with python.yml (PORT=8000, GUNICORN_CMD_ARGS, UVICORN_PORT, FLASK_RUN_PORT)
7. Environment variable injection into python.yml template
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
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
BUILD_MANAGER = REPO_ROOT / "system" / "python" / "build_manager.py"
DOCKER_MANAGER = REPO_ROOT / "system" / "python" / "docker_manager.py"
TEMPLATES_DIR = REPO_ROOT / "system" / "templates" / "docker-compose"


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


def test_django_detection_and_wsgi():
    print("Testing Django framework auto-detection & WSGI resolution...")

    # Case A: Django app with mysite/wsgi.py
    with tempfile.TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)
        (tmppath / "manage.py").write_text(
            'import os\nos.environ.setdefault("DJANGO_SETTINGS_MODULE", "mysite.settings")',
            encoding="utf-8",
        )
        (tmppath / "requirements.txt").write_text("Django>=4.2\ngunicorn>=21.0.0", encoding="utf-8")
        pkg_dir = tmppath / "mysite"
        pkg_dir.mkdir(parents=True, exist_ok=True)
        (pkg_dir / "wsgi.py").write_text("application = None", encoding="utf-8")

        code, result, stderr = run_py_script(
            BUILD_MANAGER, {"command": "plan", "projectDir": str(tmppath)}
        )

        assert code == 0, f"Plan failed: {stderr}"
        assert result.get("framework") == "django", f"Expected django, got: {result}"
        assert result.get("detectedType") == "PYTHON"
        assert result.get("buildCmd") == "python manage.py collectstatic --noinput"
        assert "mysite.wsgi:application" in str(result.get("startCmd")), f"Expected mysite.wsgi, got: {result.get('startCmd')}"
        assert "gunicorn" in str(result.get("startCmd"))
        print("  [PASS] Django with mysite/wsgi.py detected -> collectstatic & gunicorn mysite.wsgi:application")

    # Case B: Django app with config/wsgi.py and pyproject.toml
    with tempfile.TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)
        (tmppath / "manage.py").write_text("# manage.py", encoding="utf-8")
        (tmppath / "pyproject.toml").write_text(
            '[tool.poetry.dependencies]\npython = "^3.11"\ndjango = "^5.0"',
            encoding="utf-8",
        )
        cfg_dir = tmppath / "config"
        cfg_dir.mkdir(parents=True, exist_ok=True)
        (cfg_dir / "wsgi.py").write_text("application = None", encoding="utf-8")

        code, result, stderr = run_py_script(
            BUILD_MANAGER, {"command": "plan", "projectDir": str(tmppath)}
        )

        assert code == 0, f"Plan failed: {stderr}"
        assert result.get("framework") == "django"
        assert result.get("detectedType") == "PYTHON"
        assert result.get("buildCmd") == "python manage.py collectstatic --noinput"
        assert "config.wsgi:application" in str(result.get("startCmd"))
        print("  [PASS] Django with config/wsgi.py in pyproject.toml detected -> gunicorn config.wsgi:application")


def test_flask_detection_and_entrypoints():
    print("Testing Flask framework auto-detection & entrypoint discovery...")
    cases = [
        ("app.py", "app:app"),
        ("main.py", "main:app"),
        ("wsgi.py", "wsgi:app"),
        ("application.py", "application:app"),
    ]

    for filename, expected_entry in cases:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmppath = Path(tmpdir)
            (tmppath / "requirements.txt").write_text("flask>=3.0.0\ngunicorn>=21.0.0", encoding="utf-8")
            (tmppath / filename).write_text("from flask import Flask\napp = Flask(__name__)", encoding="utf-8")

            code, result, stderr = run_py_script(
                BUILD_MANAGER, {"command": "plan", "projectDir": str(tmppath)}
            )

            assert code == 0, f"Plan failed for {filename}: {stderr}"
            assert result.get("framework") == "flask", f"Expected flask for {filename}, got: {result}"
            assert result.get("detectedType") == "PYTHON"
            assert expected_entry in str(result.get("startCmd")), f"Expected {expected_entry} in {result.get('startCmd')}"
            assert "gunicorn" in str(result.get("startCmd"))
            print(f"  [PASS] Flask auto-detected with entrypoint '{filename}' -> '{expected_entry}'")


def test_fastapi_detection_and_entrypoints():
    print("Testing FastAPI framework auto-detection & entrypoint discovery...")
    cases = [
        ("main.py", "main:app"),
        ("app.py", "app:app"),
        ("app/main.py", "app.main:app"),
    ]

    for rel_path, expected_entry in cases:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmppath = Path(tmpdir)
            (tmppath / "requirements.txt").write_text("fastapi>=0.109.0\nuvicorn>=0.27.0", encoding="utf-8")
            file_target = tmppath / rel_path
            file_target.parent.mkdir(parents=True, exist_ok=True)
            file_target.write_text("from fastapi import FastAPI\napp = FastAPI()", encoding="utf-8")

            code, result, stderr = run_py_script(
                BUILD_MANAGER, {"command": "plan", "projectDir": str(tmppath)}
            )

            assert code == 0, f"Plan failed for {rel_path}: {stderr}"
            assert result.get("framework") == "fastapi", f"Expected fastapi for {rel_path}, got: {result}"
            assert result.get("detectedType") == "PYTHON"
            assert expected_entry in str(result.get("startCmd")), f"Expected {expected_entry} in {result.get('startCmd')}"
            assert "uvicorn" in str(result.get("startCmd"))
            print(f"  [PASS] FastAPI auto-detected with entrypoint '{rel_path}' -> '{expected_entry}'")


def test_python_version_pinning():
    print("Testing Python version detection (3.10, 3.11, 3.12)...")
    sys.path.insert(0, str(REPO_ROOT / "system" / "python"))
    import build_manager

    # 1. .python-version
    with tempfile.TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)
        (tmppath / ".python-version").write_text("3.11.8\n", encoding="utf-8")
        ver = build_manager.detect_python_version(tmppath)
        assert ver == "3.11", f"Expected 3.11, got {ver}"
        print("  [PASS] .python-version '3.11.8' -> 3.11")

    # 2. runtime.txt
    with tempfile.TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)
        (tmppath / "runtime.txt").write_text("python-3.12.2\n", encoding="utf-8")
        ver = build_manager.detect_python_version(tmppath)
        assert ver == "3.12", f"Expected 3.12, got {ver}"
        print("  [PASS] runtime.txt 'python-3.12.2' -> 3.12")

    # 3. pyproject.toml
    with tempfile.TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)
        (tmppath / "pyproject.toml").write_text('requires-python = ">=3.10"', encoding="utf-8")
        ver = build_manager.detect_python_version(tmppath)
        assert ver == "3.10", f"Expected 3.10, got {ver}"
        print("  [PASS] pyproject.toml 'requires-python = \">=3.10\"' -> 3.10")

    # 4. env_vars override
    with tempfile.TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)
        ver = build_manager.detect_python_version(tmppath, {"PYTHON_VERSION": "3.12"})
        assert ver == "3.12", f"Expected 3.12, got {ver}"
        print("  [PASS] env_vars PYTHON_VERSION '3.12' -> 3.12")


def test_python_docker_template():
    print("Testing python.yml template rendering & parameters...")
    python_template_path = TEMPLATES_DIR / "python.yml"
    assert python_template_path.is_file(), "python.yml template does not exist"

    template_content = python_template_path.read_text(encoding="utf-8")
    assert "HOST: \"0.0.0.0\"" in template_content, "HOST 0.0.0.0 missing from template"
    assert "PORT: \"{{container_port}}\"" in template_content, "PORT variable missing"
    assert "GUNICORN_CMD_ARGS" in template_content, "GUNICORN_CMD_ARGS missing from template"
    assert "UVICORN_HOST: \"0.0.0.0\"" in template_content, "UVICORN_HOST missing from template"
    assert "PYTHONUNBUFFERED: \"1\"" in template_content, "PYTHONUNBUFFERED missing from template"
    assert "traefik.enable=true" in template_content, "Traefik labels missing"

    # Test template picking and port in docker_manager.py
    sys.path.insert(0, str(REPO_ROOT / "system" / "python"))
    import docker_manager

    assert docker_manager.pick_template("PYTHON") == "python.yml", "pick_template(PYTHON) should return python.yml"
    assert docker_manager.default_container_port("PYTHON") == 8000, "default_container_port(PYTHON) should be 8000"

    with tempfile.TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)
        docker_manager.generate_compose_file(
            compose_dir=tmppath,
            template_path=python_template_path,
            image_name="vexlyx-python-app",
            service_name="test-python-app",
            hostname="testpy.vexlyx.localhost",
            host_port=8160,
            container_port=8000,
            memory_limit="256m",
            env_vars={"DJANGO_SECRET_KEY": "supersecret", "DATABASE_URL": "postgresql://..."},
        )

        compose_file = tmppath / "docker-compose.yml"
        assert compose_file.is_file(), "docker-compose.yml was not created"
        compose_text = compose_file.read_text(encoding="utf-8")

        assert "image: \"vexlyx-python-app\"" in compose_text
        assert "8160:8000" in compose_text
        assert "DJANGO_SECRET_KEY" in compose_text
        assert "DATABASE_URL" in compose_text
        assert "testpy.vexlyx.localhost" in compose_text
        assert "GUNICORN_CMD_ARGS: \"--bind=0.0.0.0:8000\"" in compose_text
        print("  [PASS] python.yml rendered correctly with all variables & Traefik labels")


def main():
    print("=== Running Python Runtime (F2.2) Automated Test Suite ===")
    test_django_detection_and_wsgi()
    test_flask_detection_and_entrypoints()
    test_fastapi_detection_and_entrypoints()
    test_python_version_pinning()
    test_python_docker_template()
    print("\n[SUCCESS] ALL PYTHON RUNTIME TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    main()
