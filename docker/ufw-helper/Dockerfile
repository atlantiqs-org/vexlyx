# Vexlyx UFW helper (F5.4) — minimal image that gives firewall_manager.py a
# way to reach the HOST's real firewall state.
#
# The main API container (apps/api/Dockerfile) has no NET_ADMIN and its own
# isolated network namespace, so a plain `ufw` call inside it would only
# touch that container's own (irrelevant) netfilter tables. This image is
# instead run per-command as a throwaway container with `--network host`
# (via the Docker CLI the API already talks to the host daemon with, over
# the bind-mounted socket — the same "Docker-outside-of-Docker" pattern
# docker_manager.py uses) plus NET_ADMIN/NET_RAW, so `ufw` inside it modifies
# the host's actual iptables state. See system/python/firewall_manager.py.
FROM debian:bookworm-slim

# procps provides /usr/sbin/sysctl -- ufw shells out to it internally (even
# for read-only commands like `status verbose`), and debian-slim doesn't
# ship it by default; without it every ufw invocation fails with
# "ERROR: problem running sysctl".
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends ufw procps \
    && rm -rf /var/lib/apt/lists/*

ENTRYPOINT ["ufw"]
