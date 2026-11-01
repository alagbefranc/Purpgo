#!/bin/sh
# Modified by Purpgo LLC.
# Render the runtime config from container env so a single built image serves
# any deployment. Runs before nginx starts (nginx /docker-entrypoint.d hook).
#
# PURPGO_CONFIG_OUT moves where it writes, which is how a static host that
# has no container start renders the same file at build time. One definition
# of the key set, so the two paths cannot drift apart.
set -eu

CONFIG_OUT="${PURPGO_CONFIG_OUT:-/usr/share/nginx/html/config.js}"
mkdir -p "$(dirname "$CONFIG_OUT")"

# Values are written into JavaScript string literals, so a double quote, a
# backslash or a line break in one would end the literal early and take the
# whole config with it, leaving the app with no API_URL at all. Escape rather
# than trust whatever ended up in .env.
js() {
    printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' | tr -d '\r\n'
}

cat > "$CONFIG_OUT" <<EOF
window.__PURPGO_ENV__ = {
  API_URL: "$(js "${PURPGO_API_URL:-}")",
  DASHBOARD_URL: "$(js "${PURPGO_DASHBOARD_URL:-}")",
  ENV_LABEL: "$(js "${PURPGO_ENV_LABEL:-}")",
  TURNSTILE_KEY: "$(js "${PURPGO_TURNSTILE_KEY:-}")",
  SENTRY_DSN: "$(js "${PURPGO_SENTRY_DSN:-}")",
  SENTRY_ENVIRONMENT: "$(js "${PURPGO_SENTRY_ENVIRONMENT:-}")",
  POSTHOG_KEY: "$(js "${PURPGO_POSTHOG_KEY:-}")",
  POSTHOG_HOST: "$(js "${PURPGO_POSTHOG_HOST:-}")",
  POSTHOG_UI_HOST: "$(js "${PURPGO_POSTHOG_UI_HOST:-}")",
  POSTHOG_ERROR_TRACKING: "$(js "${PURPGO_POSTHOG_ERROR_TRACKING:-}")",
  POSTHOG_SESSION_REPLAY: "$(js "${PURPGO_POSTHOG_SESSION_REPLAY:-}")"
};
EOF

# The redirect truncates in place and keeps whatever mode the built file had, so
# a restrictive umask or checkout leaves nginx serving 403 for the whole config.
chmod 644 "$CONFIG_OUT"
