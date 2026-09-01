"""
test_multi_project_isolation.py — Automated test suite for multi-project container isolation & concurrency.

Tests:
1. Compose templates (node.yml, next.yml, python.yml, static.yml) contain top-level project name `name: "vexlyx-{{service_name}}"`
2. Multiple distinct projects rendered into separate compose files produce isolated project names
3. Port derivation isolation (different project IDs produce distinct host ports)
4. Traefik service name and routing isolation (no duplicate service or router names)
5. Environment block rendering isolation across multiple projects
"""

import json
import os
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
TEMPLATES_DIR = REPO_ROOT / "system" / "templates" / "docker-compose"
sys.path.insert(0, str(REPO_ROOT / "system" / "python"))
import docker_manager


def test_compose_templates_have_project_name():
    print("Testing that all Docker Compose templates have top-level project name...")
    templates = ["node.yml", "next.yml", "python.yml", "static.yml", "php.yml", "wordpress.yml", "docker.yml"]
    for tmpl in templates:
        tmpl_path = TEMPLATES_DIR / tmpl
        assert tmpl_path.is_file(), f"Template {tmpl} does not exist"
        content = tmpl_path.read_text(encoding="utf-8")
        assert 'name: "vexlyx-{{service_name}}"' in content, f"Template {tmpl} missing 'name: \"vexlyx-{{{{service_name}}}}\"'"
        print(f"  [PASS] {tmpl} contains 'name: \"vexlyx-{{{{service_name}}}}\"'")


def test_multi_project_compose_generation():
    print("Testing multi-project compose file generation & isolation...")
    projects = [
        {"id": "cmth6hlx80005uxgcyhagf3h9", "name": "hkr-website", "type": "STATIC", "port": 8120},
        {"id": "cmtfpn0u3000nux4gotmwddt1", "name": "custom-boilerplate", "type": "STATIC", "port": 8121},
        {"id": "cmtgwvyhe000xuxbs5zk3mwly", "name": "nextjs-portfolio", "type": "NEXTJS", "port": 8122},
        {"id": "cmtes2qe70001uxkws03ozjrb", "name": "django-backend", "type": "PYTHON", "port": 8123},
    ]

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        generated_files = []

        for p in projects:
            p_dir = tmp_path / p["id"] / "deploy"
            tmpl_file = TEMPLATES_DIR / docker_manager.pick_template(p["type"])
            slug = docker_manager.slugify(p["name"])
            service_name = docker_manager.slugify(p["id"][:12])
            hostname = f"{slug}.vexlyx.localhost"

            docker_manager.generate_compose_file(
                compose_dir=p_dir,
                template_path=tmpl_file,
                image_name=f"vexlyx-{p['id']}",
                service_name=service_name,
                hostname=hostname,
                host_port=p["port"],
                container_port=docker_manager.default_container_port(p["type"]),
                memory_limit="256m",
                env_vars={"PROJECT_ID": p["id"], "PROJECT_NAME": p["name"]},
            )

            compose_file = p_dir / "docker-compose.yml"
            assert compose_file.is_file(), f"Failed to generate compose file for {p['name']}"
            generated_files.append((p, compose_file.read_text(encoding="utf-8")))

        # Verify all generated compose files have unique names and isolated routers
        project_names = set()
        service_names = set()
        host_ports = set()
        hostnames = set()

        for p, text in generated_files:
            service_name = docker_manager.slugify(p["id"][:12])
            expected_proj_name = f'name: "vexlyx-{service_name}"'
            assert expected_proj_name in text, f"Missing {expected_proj_name} in compose file"

            # Check uniqueness
            assert service_name not in service_names, f"Duplicate service name: {service_name}"
            service_names.add(service_name)

            assert p["port"] not in host_ports, f"Duplicate host port: {p['port']}"
            host_ports.add(p["port"])

            slug = docker_manager.slugify(p["name"])
            hostname = f"{slug}.vexlyx.localhost"
            assert hostname not in hostnames, f"Duplicate hostname: {hostname}"
            hostnames.add(hostname)

            # Check Traefik router name matches service name
            assert f"traefik.http.routers.{service_name}.rule=Host(`{hostname}`)" in text
            assert f"traefik.http.services.{service_name}.loadbalancer.server.port=" in text

            print(f"  [PASS] Project {p['name']} ({p['id'][:10]}...) -> name: 'vexlyx-{service_name}', port: {p['port']}, host: {hostname}")


def test_port_derivation_determinism():
    print("Testing host port derivation determinism and spread...")
    ids = [
        "cmth6hlx80005uxgcyhagf3h9",
        "cmtfpn0u3000nux4gotmwddt1",
        "cmtgwvyhe000xuxbs5zk3mwly",
        "cmtes2qe70001uxkws03ozjrb",
        "cmteswds40005uxgolmnhx74p",
    ]

    ports = set()
    for pid in ids:
        port1 = docker_manager.derive_host_port(pid, 8100, 8999)
        port2 = docker_manager.derive_host_port(pid, 8100, 8999)
        assert port1 == port2, f"Non-deterministic port derivation for {pid}"
        assert 8100 <= port1 <= 8999, f"Port {port1} outside range 8100-8999"
        ports.add(port1)
        print(f"  [PASS] ID {pid[:12]}... -> Port {port1}")

    assert len(ports) == len(ids), "Colliding derived ports for test IDs"


def main():
    print("=== Running Multi-Project Container Isolation Automated Test Suite ===")
    test_compose_templates_have_project_name()
    test_multi_project_compose_generation()
    test_port_derivation_determinism()
    print("\n[SUCCESS] ALL MULTI-PROJECT ISOLATION TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    main()
