#!/usr/bin/env bash
# Builds the panel on the host (not inside a Docker build) — the API image
# intentionally ships no app code (see apps/api/Dockerfile); it bind-mounts
# this exact build output at runtime instead.
set -euo pipefail

log_step "[9/16] Building the panel (pnpm install + build)"

# A leftover apps/api/.env (gitignored, so it only exists if something wrote
# it locally — a manual `pnpm dev` run, a stray copy, etc.) is silently
# auto-loaded by Prisma Client at runtime regardless of NODE_ENV, even
# though nothing in the production stack is supposed to use a .env file —
# docker-compose.prod.yml passes everything via `environment:`. If that file
# sets NODE_ENV=development or VEXLYX_MOCK_DNS=true (both plausible leftovers
# from local testing), it silently defeats real DNS-based domain
# verification in production. Refuse to proceed rather than build on top of
# an unknown, unaudited env override.
if [[ -f apps/api/.env ]]; then
  die "apps/api/.env exists and would be silently loaded by Prisma at runtime, overriding production config. Remove or rename it, then re-run: mv apps/api/.env apps/api/.env.bak"
fi

pnpm install --frozen-lockfile

# A tsconfig.tsbuildinfo left behind by an earlier interrupted/failed
# install attempt makes `tsc --build` trust its recorded state and skip
# emitting — even when the dist/ it refers to no longer exists — which is
# exactly what produced turbo's "no output files found for task
# @vexlyx/shared#build" on a re-run. Force a clean slate for the TS
# composite projects on every run so this can never depend on what debris a
# prior attempt left around.
rm -rf packages/shared/dist packages/shared/tsconfig.tsbuildinfo
rm -rf apps/api/dist apps/api/tsconfig.tsbuildinfo

# Built explicitly, ahead of the full monorepo build below: on a fresh
# checkout there is no packages/shared/dist yet, and relying on turbo's
# `dependsOn: ["^build"]` graph to serialize @vexlyx/api and
# @vexlyx/dashboard's builds after it has been observed to race on a fresh
# VM (both start concurrently with shared, so tsc fails with "Cannot find
# module '@vexlyx/shared'" before shared has written any output). Building
# it first here removes the race regardless of turbo's scheduling.
pnpm --filter @vexlyx/shared build

# `prisma generate` only needs DATABASE_URL to be a syntactically valid
# connection string — it does not connect to a database.
DATABASE_URL="postgresql://vexlyx:placeholder@localhost:5432/vexlyx_dev" \
  pnpm --filter @vexlyx/api exec prisma generate

pnpm build

log_ok "Panel build complete."
