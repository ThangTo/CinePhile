#!/usr/bin/env bash
set -euo pipefail

# Ubuntu/Debian helper for CinePhine Redis on a small VPS.
# Run from the backend directory after pulling the repository.

MAXMEMORY="${REDIS_MAXMEMORY:-256mb}"
REDIS_CONF="${REDIS_CONF:-/etc/redis/redis.conf}"

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This helper expects Ubuntu/Debian with apt-get."
  exit 1
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run with sudo: sudo bash scripts/setupRedisVps.sh"
  exit 1
fi

apt-get update
apt-get install -y redis-server redis-tools

if [ ! -f "$REDIS_CONF" ]; then
  echo "Redis config not found at $REDIS_CONF"
  exit 1
fi

cp "$REDIS_CONF" "${REDIS_CONF}.bak.$(date +%Y%m%d%H%M%S)"

set_or_append() {
  local key="$1"
  local value="$2"

  if grep -Eq "^[#[:space:]]*${key}[[:space:]]+" "$REDIS_CONF"; then
    sed -i -E "s|^[#[:space:]]*${key}[[:space:]].*|${key} ${value}|" "$REDIS_CONF"
  else
    printf "\n%s %s\n" "$key" "$value" >> "$REDIS_CONF"
  fi
}

set_or_append "bind" "127.0.0.1 ::1"
set_or_append "protected-mode" "yes"
set_or_append "supervised" "systemd"
set_or_append "maxmemory" "$MAXMEMORY"
set_or_append "maxmemory-policy" "noeviction"
set_or_append "appendonly" "yes"
set_or_append "appendfsync" "everysec"
set_or_append "tcp-keepalive" "300"

systemctl enable redis-server
systemctl restart redis-server

redis-cli -h 127.0.0.1 ping
systemctl --no-pager --full status redis-server
