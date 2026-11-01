#!/bin/sh
# Reads REDIS_PASSWORD from the environment (a Fly secret). Not run until deploy.
set -eu
if [ -z "${REDIS_PASSWORD:-}" ]; then
  echo "REDIS_PASSWORD is required" >&2
  exit 1
fi
exec redis-server --appendonly yes --dir /data --requirepass "$REDIS_PASSWORD"
