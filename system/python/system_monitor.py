#!/usr/bin/env python3
"""
system_monitor.py -- Vexlyx system resource monitoring collector.

Called by the API service via child_process.spawn with a JSON payload on stdin.
Writes JSON results to stdout and exits with code 0 on success, 1 on error.

Commands:
  server_metrics    -- Returns CPU, RAM, disk, network, and uptime metrics.
                       Uses psutil for accurate cross-platform readings.
  container_metrics -- Returns per-container CPU/RAM/network stats via
                       `docker stats --no-stream`. No psutil required here.

Protocol: same stdin/stdout JSON pattern as docker_manager.py.

Never run this script as root.
Requires: psutil (pip install psutil) for server_metrics.
          Docker CLI for container_metrics.
"""

import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path


# ---------------------------------------------------------------------------
# Stream encoding (mirrors docker_manager.py)
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


def fail(message: str, code: str = "MONITOR_ERROR") -> None:
    print(json.dumps({"error": message, "code": code}), flush=True)
    sys.exit(1)


def bytes_to_int(value) -> int:
    """Safely convert any numeric type to int, returning 0 on failure."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


# ---------------------------------------------------------------------------
# Server metrics — uses psutil when available, native OS fallback otherwise
# ---------------------------------------------------------------------------


def _get_cpu_percent(interval: float = 0.2) -> float:
    """Calculate CPU usage % using psutil, Windows GetSystemTimes, or Linux /proc/stat."""
    try:
        import psutil  # type: ignore[import]
        return float(psutil.cpu_percent(interval=interval))
    except Exception:
        pass

    if sys.platform == "win32":
        try:
            import ctypes

            class FILETIME(ctypes.Structure):
                _fields_ = [
                    ("dwLowDateTime", ctypes.c_ulong),
                    ("dwHighDateTime", ctypes.c_ulong),
                ]

            def to_int(ft):
                return (ft.dwHighDateTime << 32) + ft.dwLowDateTime

            def get_times():
                idle, kernel, user = FILETIME(), FILETIME(), FILETIME()
                ctypes.windll.kernel32.GetSystemTimes(
                    ctypes.byref(idle), ctypes.byref(kernel), ctypes.byref(user)
                )
                return to_int(idle), to_int(kernel), to_int(user)

            i1, k1, u1 = get_times()
            time.sleep(interval)
            i2, k2, u2 = get_times()
            idle_delta = i2 - i1
            kernel_delta = k2 - k1
            user_delta = u2 - u1
            total_delta = kernel_delta + user_delta
            if total_delta <= 0:
                return 0.0
            return round(max(0.0, min(100.0, 100.0 * (1.0 - idle_delta / total_delta))), 2)
        except Exception:
            return 0.0

    # Linux /proc/stat fallback
    try:
        def read_cpu_times():
            with open("/proc/stat") as f:
                line = f.readline()
            parts = line.split()
            values = [int(p) for p in parts[1:8]]
            total = sum(values)
            idle = values[3]
            return total, idle

        total1, idle1 = read_cpu_times()
        time.sleep(interval)
        total2, idle2 = read_cpu_times()
        diff_total = total2 - total1
        diff_idle = idle2 - idle1
        if diff_total == 0:
            return 0.0
        return round((1.0 - diff_idle / diff_total) * 100, 2)
    except Exception:
        return 0.0


def _get_mem() -> dict:
    """Retrieve RAM usage statistics using psutil, Windows GlobalMemoryStatusEx, or Linux /proc/meminfo."""
    try:
        import psutil  # type: ignore[import]
        mem = psutil.virtual_memory()
        return {
            "ramUsed": mem.used,
            "ramTotal": mem.total,
            "ramPercent": mem.percent,
        }
    except Exception:
        pass

    if sys.platform == "win32":
        try:
            import ctypes

            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [
                    ("dwLength", ctypes.c_ulong),
                    ("dwMemoryLoad", ctypes.c_ulong),
                    ("ullTotalPhys", ctypes.c_ulonglong),
                    ("ullAvailPhys", ctypes.c_ulonglong),
                    ("ullTotalPageFile", ctypes.c_ulonglong),
                    ("ullAvailPageFile", ctypes.c_ulonglong),
                    ("ullTotalVirtual", ctypes.c_ulonglong),
                    ("ullAvailVirtual", ctypes.c_ulonglong),
                    ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
                ]

            stat = MEMORYSTATUSEX()
            stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat))
            total = stat.ullTotalPhys
            used = max(0, total - stat.ullAvailPhys)
            percent = round(float(stat.dwMemoryLoad), 2)
            return {"ramUsed": used, "ramTotal": total, "ramPercent": percent}
        except Exception:
            return {"ramUsed": 0, "ramTotal": 0, "ramPercent": 0.0}

    # Linux /proc/meminfo fallback
    try:
        info = {}
        with open("/proc/meminfo") as f:
            for line in f:
                parts = line.split()
                if len(parts) >= 2:
                    info[parts[0].rstrip(":")] = int(parts[1]) * 1024

        mem_total = info.get("MemTotal", 0)
        mem_free = info.get("MemFree", 0)
        mem_buffers = info.get("Buffers", 0)
        mem_cached = info.get("Cached", 0)
        mem_used = mem_total - mem_free - mem_buffers - mem_cached
        mem_percent = round(mem_used / mem_total * 100, 2) if mem_total > 0 else 0.0
        return {
            "ramUsed": max(mem_used, 0),
            "ramTotal": mem_total,
            "ramPercent": mem_percent,
        }
    except Exception:
        return {"ramUsed": 0, "ramTotal": 0, "ramPercent": 0.0}


def _get_disk(path: str = ".") -> dict:
    """Retrieve disk usage statistics using psutil or cross-platform shutil.disk_usage."""
    try:
        import psutil  # type: ignore[import]
        target = "/" if sys.platform != "win32" else (os.path.splitdrive(os.getcwd())[0] + "\\")
        disk = psutil.disk_usage(target)
        return {
            "diskUsed": disk.used,
            "diskTotal": disk.total,
            "diskPercent": disk.percent,
        }
    except Exception:
        pass

    try:
        target = "/" if sys.platform != "win32" else (os.path.splitdrive(os.getcwd())[0] + "\\")
        total, used, free = shutil.disk_usage(target)
        percent = round(used / total * 100, 2) if total > 0 else 0.0
        return {"diskUsed": used, "diskTotal": total, "diskPercent": percent}
    except Exception:
        return {"diskUsed": 0, "diskTotal": 0, "diskPercent": 0.0}


def _get_net() -> dict:
    """Parse network RX/TX bytes using psutil or /proc/net/dev."""
    try:
        import psutil  # type: ignore[import]
        net = psutil.net_io_counters()
        return {"netRxBytes": net.bytes_recv, "netTxBytes": net.bytes_sent}
    except Exception:
        pass

    try:
        rx_total, tx_total = 0, 0
        with open("/proc/net/dev") as f:
            lines = f.readlines()[2:]
        for line in lines:
            parts = line.split()
            if len(parts) >= 10 and not parts[0].startswith("lo:"):
                rx_total += int(parts[1])
                tx_total += int(parts[9])
        return {"netRxBytes": rx_total, "netTxBytes": tx_total}
    except Exception:
        return {"netRxBytes": 0, "netTxBytes": 0}


def _get_uptime() -> float:
    """Read system uptime in seconds using psutil, Windows GetTickCount64, or /proc/uptime."""
    try:
        import psutil  # type: ignore[import]
        return round(float(time.time() - psutil.boot_time()), 1)
    except Exception:
        pass

    if sys.platform == "win32":
        try:
            import ctypes
            GetTickCount64 = ctypes.windll.kernel32.GetTickCount64
            GetTickCount64.restype = ctypes.c_ulonglong
            return round(GetTickCount64() / 1000.0, 1)
        except Exception:
            return 0.0

    try:
        with open("/proc/uptime") as f:
            return float(f.read().split()[0])
    except Exception:
        return 0.0


def _get_load_avg() -> tuple:
    """Read load averages on Linux or return (0.0, 0.0, 0.0) on Windows."""
    if sys.platform == "win32":
        return 0.0, 0.0, 0.0
    try:
        return os.getloadavg()
    except (AttributeError, OSError):
        try:
            with open("/proc/loadavg") as f:
                parts = f.read().split()
            return float(parts[0]), float(parts[1]), float(parts[2])
        except Exception:
            return 0.0, 0.0, 0.0


def get_server_metrics() -> dict:
    """
    Collect current server-level metrics.
    Prefers psutil when available; falls back cleanly on Windows (ctypes/shutil) or Linux (/proc).
    """
    cpu_percent = _get_cpu_percent(interval=0.2)
    mem_data = _get_mem()
    disk_data = _get_disk()
    net_data = _get_net()
    uptime = _get_uptime()
    load1, load5, load15 = _get_load_avg()

    return {
        "cpuPercent": round(float(cpu_percent), 2),
        "ramUsed": bytes_to_int(mem_data["ramUsed"]),
        "ramTotal": bytes_to_int(mem_data["ramTotal"]),
        "ramPercent": round(float(mem_data["ramPercent"]), 2),
        "diskUsed": bytes_to_int(disk_data["diskUsed"]),
        "diskTotal": bytes_to_int(disk_data["diskTotal"]),
        "diskPercent": round(float(disk_data["diskPercent"]), 2),
        "uptimeSeconds": round(float(uptime), 1),
        "loadAvg1": round(float(load1), 2),
        "loadAvg5": round(float(load5), 2),
        "loadAvg15": round(float(load15), 2),
        "netRxBytes": bytes_to_int(net_data["netRxBytes"]),
        "netTxBytes": bytes_to_int(net_data["netTxBytes"]),
    }


# ---------------------------------------------------------------------------
# Container metrics — docker stats --no-stream
# ---------------------------------------------------------------------------


def _parse_bytes(value: str) -> int:
    """
    Parse Docker's human-readable byte strings (e.g. '1.5GiB', '256MiB', '512B').
    Returns the value as raw bytes (int).
    """
    value = value.strip()
    units = {
        "B": 1,
        "KiB": 1024,
        "MiB": 1024**2,
        "GiB": 1024**3,
        "TiB": 1024**4,
        "KB": 1000,
        "MB": 1000**2,
        "GB": 1000**3,
        "TB": 1000**4,
        "kB": 1000,
        "mB": 1000**2,
        "gB": 1000**3,
    }
    for suffix, multiplier in sorted(units.items(), key=lambda x: -len(x[0])):
        if value.endswith(suffix):
            numeric = value[: -len(suffix)].strip()
            try:
                return int(float(numeric) * multiplier)
            except ValueError:
                return 0
    # Fallback — plain number string
    try:
        return int(float(value))
    except ValueError:
        return 0


def get_container_metrics() -> list:
    """
    Run `docker stats --no-stream --format json` and parse per-container stats.
    Returns a list of container metric dicts.
    """
    docker_bin = shutil.which("docker")
    if not docker_bin:
        fail("docker binary not found in PATH", "DOCKER_NOT_FOUND")

    try:
        result = subprocess.run(
            [
                docker_bin,
                "stats",
                "--no-stream",
                "--format",
                (
                    '{"id":"{{.ID}}","name":"{{.Name}}",'
                    '"cpu":"{{.CPUPerc}}","mem":"{{.MemUsage}}",'
                    '"memPerc":"{{.MemPerc}}","net":"{{.NetIO}}",'
                    '"block":"{{.BlockIO}}","status":"running"}'
                ),
            ],
            capture_output=True,
            text=True,
            timeout=15,
        )
    except subprocess.TimeoutExpired:
        fail("docker stats timed out", "DOCKER_TIMEOUT")
        return []
    except Exception as exc:
        fail(f"docker stats failed: {exc}", "DOCKER_ERROR")
        return []

    containers = []
    for line in result.stdout.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            raw = json.loads(line)
        except json.JSONDecodeError:
            continue

        # Parse CPU percent (e.g. "2.34%")
        cpu_str = raw.get("cpu", "0%").rstrip("%")
        try:
            cpu_percent = round(float(cpu_str), 2)
        except ValueError:
            cpu_percent = 0.0

        # Parse memory usage (e.g. "128MiB / 2GiB")
        mem_str = raw.get("mem", "0B / 0B")
        mem_parts = mem_str.split("/")
        mem_used = _parse_bytes(mem_parts[0]) if len(mem_parts) > 0 else 0
        mem_limit = _parse_bytes(mem_parts[1]) if len(mem_parts) > 1 else 0

        mem_perc_str = raw.get("memPerc", "0%").rstrip("%")
        try:
            mem_percent = round(float(mem_perc_str), 2)
        except ValueError:
            mem_percent = 0.0

        # Parse network I/O (e.g. "1.5MB / 256kB")
        net_str = raw.get("net", "0B / 0B")
        net_parts = net_str.split("/")
        net_rx = _parse_bytes(net_parts[0]) if len(net_parts) > 0 else 0
        net_tx = _parse_bytes(net_parts[1]) if len(net_parts) > 1 else 0

        # Parse block I/O (e.g. "4.5MB / 1.2GB")
        block_str = raw.get("block", "0B / 0B")
        block_parts = block_str.split("/")
        block_read = _parse_bytes(block_parts[0]) if len(block_parts) > 0 else 0
        block_write = _parse_bytes(block_parts[1]) if len(block_parts) > 1 else 0

        containers.append(
            {
                "containerId": raw.get("id", ""),
                "name": raw.get("name", "").lstrip("/"),
                "cpuPercent": cpu_percent,
                "memUsed": mem_used,
                "memLimit": mem_limit,
                "memPercent": mem_percent,
                "netRx": net_rx,
                "netTx": net_tx,
                "blockRead": block_read,
                "blockWrite": block_write,
                "status": raw.get("status", "running"),
            }
        )

    return containers


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> None:
    raw_input = sys.stdin.read().strip()
    if not raw_input:
        fail("No input received on stdin", "NO_INPUT")
        return

    try:
        payload = json.loads(raw_input)
    except json.JSONDecodeError as exc:
        fail(f"Invalid JSON payload: {exc}", "INVALID_JSON")
        return

    command = payload.get("command", "")

    if command == "server_metrics":
        metrics = get_server_metrics()
        respond({"done": True, **metrics})

    elif command == "container_metrics":
        containers = get_container_metrics()
        respond({"done": True, "containers": containers})

    else:
        fail(f"Unknown command: {command!r}", "UNKNOWN_COMMAND")


if __name__ == "__main__":
    main()
