#!/usr/bin/env bash
# ==============================================================================
# Vexlyx Installer — shared helpers (F5.1)
# Sourced by run.sh and every script under steps/. Not meant to be run directly.
# ==============================================================================

VEXLYX_HOME="${VEXLYX_HOME:-/opt/vexlyx}"
VEXLYX_SECRETS_DIR="/etc/vexlyx"
VEXLYX_SECRETS_FILE="${VEXLYX_SECRETS_DIR}/vexlyx.env"
VEXLYX_STATE_FILE="${VEXLYX_SECRETS_DIR}/install.log"

COLOR_BLUE='\033[0;34m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[0;33m'
COLOR_RED='\033[0;31m'
COLOR_RESET='\033[0m'

log_step() {
  echo -e "\n${COLOR_BLUE}==>${COLOR_RESET} $*"
}

log_info() {
  echo -e "    $*"
}

log_ok() {
  echo -e "    ${COLOR_GREEN}✓${COLOR_RESET} $*"
}

log_warn() {
  echo -e "    ${COLOR_YELLOW}! $*${COLOR_RESET}" >&2
}

log_error() {
  echo -e "${COLOR_RED}[ERROR]${COLOR_RESET} $*" >&2
}

die() {
  log_error "$*"
  exit 1
}

on_error() {
  local exit_code=$?
  local line_no=$1
  log_error "Install failed at line ${line_no} (exit code ${exit_code})."
  log_error "Re-running the installer is safe — completed steps are skipped."
  if [[ -f "${VEXLYX_STATE_FILE}" ]]; then
    log_error "Full log: ${VEXLYX_STATE_FILE}"
  fi
  exit "${exit_code}"
}

require_root() {
  if [[ ${EUID} -ne 0 ]]; then
    die "This installer must be run as root (or with sudo)."
  fi
}

is_tty() {
  [[ -t 0 ]]
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

rand_hex() {
  # $1 = number of random bytes (hex output is 2x that many characters)
  openssl rand -hex "${1:-32}"
}

# env_or_prompt VAR_NAME "Prompt text" "default"
# Uses $VAR_NAME if already set in the environment (non-interactive/scripted
# use). Otherwise, if attached to a TTY, prompts with the given default. If
# neither, falls back to the default silently — callers that have no safe
# default (e.g. a required domain) must check for an empty result themselves.
env_or_prompt() {
  local var_name="$1" prompt="$2" default="${3:-}"
  local current="${!var_name:-}"
  if [[ -n "${current}" ]]; then
    return 0
  fi
  if is_tty; then
    local input=""
    if [[ -n "${default}" ]]; then
      read -r -p "${prompt} [${default}]: " input
    else
      read -r -p "${prompt}: " input
    fi
    printf -v "${var_name}" '%s' "${input:-${default}}"
  else
    printf -v "${var_name}" '%s' "${default}"
  fi
}

# Reads KEY=VALUE from the persisted secrets file into the current shell, if
# it already exists — but only for variables not already set, so an operator
# passing an explicit env var override this run always wins over a value
# persisted by a previous run.
load_secrets_file() {
  [[ -f "${VEXLYX_SECRETS_FILE}" ]] || return 0
  local key value
  while IFS='=' read -r key value; do
    [[ -z "${key}" || "${key}" == \#* ]] && continue
    if [[ -z "${!key:-}" ]]; then
      printf -v "${key}" '%s' "${value}"
      export "${key?}"
    fi
  done < "${VEXLYX_SECRETS_FILE}"
}
