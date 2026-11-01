#!/usr/bin/env bash
# Fly.io launch commands for Purpgo. NOT APPROVED TO RUN.
#
# This script refuses to create apps, volumes, certificates, secrets, or
# deploys unless the owner has set PURPGO_DEPLOY_APPROVED=1 in the environment
# after reading DEPLOY-PLAN.md. Running it spends money.
set -euo pipefail

if [[ "${PURPGO_DEPLOY_APPROVED:-}" != "1" ]]; then
  echo "Refusing to run. Read DEPLOY-PLAN.md and export PURPGO_DEPLOY_APPROVED=1 only after the owner approves." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
REGION=yyz

# Org must already exist. This does not create a Fly account or add a card.
# fly auth login
# fly orgs list

create_app() {
  fly apps create "$1" || true
}

# --- apps (no public IPs allocated here) ---
create_app purpgo-pg
create_app purpgo-redis
create_app purpgo-nats
create_app purpgo-api
create_app purpgo-consumer
create_app purpgo-worker
create_app purpgo-links
create_app purpgo-rt
create_app purpgo-web
create_app purpgo-admin
create_app purpgo-forms

# --- volumes. Sizes are the minimal tier. Comfortable postgres is --size 20. ---
fly volumes create pg_data --size 10 -a purpgo-pg -r "$REGION" -y
fly volumes create redis_data --size 1 -a purpgo-redis -r "$REGION" -y
fly volumes create nats_data --size 1 -a purpgo-nats -r "$REGION" -y
fly volumes create worker_state --size 1 -a purpgo-worker -r "$REGION" -y

# --- secrets. Generate on this machine. Do not write them into git. ---
# AUTH_SECRET=$(openssl rand -base64 32)
# INTERNAL_API_TOKEN=$(openssl rand -hex 24)
# SECRET_KEY_BASE=$(openssl rand -base64 64 | tr -d '\n')
# KMS_LOCAL_MASTER_KEY=$(openssl rand -base64 32)
# CREDENTIALS_ENCRYPTION_KEY=$(openssl rand -hex 32)
# POSTGRES_PASSWORD=$(openssl rand -hex 24)
# REDIS_PASSWORD=$(openssl rand -hex 24)
# Store KMS_LOCAL_MASTER_KEY and CREDENTIALS_ENCRYPTION_KEY in a password
# manager before the next command. Losing them makes mailbox credentials
# unreadable.
#
# fly secrets set -a purpgo-pg POSTGRES_PASSWORD="$POSTGRES_PASSWORD"
# fly secrets set -a purpgo-redis REDIS_PASSWORD="$REDIS_PASSWORD"
#
# PRIMARY_DB="postgres://purpgo:${POSTGRES_PASSWORD}@purpgo-pg.internal:5432/purpgo?sslmode=disable"
# REDIS_URL="redis://:${REDIS_PASSWORD}@purpgo-redis.internal:6379"
# NATS_URL="nats://purpgo-nats.internal:4222"
#
# Shared by api, consumer, worker:
# fly secrets set -a purpgo-api \
#   APP_ENV=prod \
#   AUTH_SECRET="$AUTH_SECRET" \
#   INTERNAL_API_TOKEN="$INTERNAL_API_TOKEN" \
#   KMS_LOCAL_MASTER_KEY="$KMS_LOCAL_MASTER_KEY" \
#   CREDENTIALS_ENCRYPTION_KEY="$CREDENTIALS_ENCRYPTION_KEY" \
#   PRIMARY_DB="$PRIMARY_DB" \
#   REDIS="$REDIS_URL" \
#   NATS_URL="$NATS_URL" \
#   APP_URL="https://app.purpgo.com" \
#   API_PUBLIC_URL="https://api.purpgo.com" \
#   CORS_ALLOW_ORIGINS="https://app.purpgo.com,https://admin.purpgo.com" \
#   WEBSOCKET_URL="wss://rt.purpgo.com/socket/websocket" \
#   TRACKING_DOMAIN="links.purpgo.com" \
#   FORMS_DOMAIN="forms.purpgo.com" \
#   BLOB_PROVIDER=s3 \
#   BLOB_BUCKET="purpgo-blobs" \
#   AWS_REGION="auto" \
#   AWS_ACCESS_KEY_ID="..." \
#   AWS_SECRET_ACCESS_KEY="..." \
#   AWS_ENDPOINT_URL_S3="https://<accountid>.r2.cloudflarestorage.com" \
#   BLOB_PUBLIC_BASE_URL="https://api.purpgo.com/public" \
#   MAIL_TRANSPORT=smtp \
#   EMAIL_NAME="Purpgo" \
#   EMAIL_ADDRESS="noreply@notify.purpgo.com" \
#   SMTP_HOST="..." SMTP_USERNAME="..." SMTP_PASSWORD="..." SMTP_SECURITY=starttls \
#   EMAIL_BRAND_NAME="Purpgo" \
#   EMAIL_BRAND_LEGAL_ENTITY="Purpgo LLC" \
#   EMAIL_BRAND_WEBSITE_URL="https://app.purpgo.com" \
#   EMAIL_BRAND_SUPPORT_EMAIL="..." \
#   BILLING_PROVIDER=none \
#   EVENTBUS_PROVIDER=nats \
#   CODEC_PROVIDER=json \
#   KMS_PROVIDER=local \
#   TASKS_PROVIDER=local \
#   PUBSUB_ENABLED=false \
#   MAIL_TLS_INSECURE=false \
#   UPDATE_CHECK_ENABLED=false \
#   UPDATER_URL=none
#
# fly secrets set -a purpgo-consumer \
#   APP_ENV=prod EVENTBUS_PROVIDER=nats CODEC_PROVIDER=json \
#   NATS_URL="$NATS_URL" PRIMARY_DB="$PRIMARY_DB" REDIS="$REDIS_URL" \
#   KMS_PROVIDER=local KMS_LOCAL_MASTER_KEY="$KMS_LOCAL_MASTER_KEY" \
#   CREDENTIALS_ENCRYPTION_KEY="$CREDENTIALS_ENCRYPTION_KEY" \
#   BLOB_PROVIDER=s3 BLOB_BUCKET="purpgo-blobs" AWS_REGION="auto" \
#   AWS_ACCESS_KEY_ID="..." AWS_SECRET_ACCESS_KEY="..." \
#   AWS_ENDPOINT_URL_S3="https://<accountid>.r2.cloudflarestorage.com"
#
# fly secrets set -a purpgo-worker \
#   APP_ENV=prod EVENTBUS_PROVIDER=nats CODEC_PROVIDER=json \
#   NATS_URL="$NATS_URL" REDIS="$REDIS_URL" \
#   KMS_PROVIDER=local KMS_LOCAL_MASTER_KEY="$KMS_LOCAL_MASTER_KEY" \
#   CREDENTIALS_ENCRYPTION_KEY="$CREDENTIALS_ENCRYPTION_KEY" \
#   ENCRYPTED_KEYS_PROVIDER=http \
#   ENCRYPTED_KEYS_BACKEND_URL="http://purpgo-api.internal:8080" \
#   ENCRYPTED_KEYS_WORKER_TOKEN="$INTERNAL_API_TOKEN" \
#   MAIL_TLS_INSECURE=false \
#   BLOB_PROVIDER=s3 BLOB_BUCKET="purpgo-blobs" AWS_REGION="auto" \
#   AWS_ACCESS_KEY_ID="..." AWS_SECRET_ACCESS_KEY="..." \
#   AWS_ENDPOINT_URL_S3="https://<accountid>.r2.cloudflarestorage.com"
#
# fly secrets set -a purpgo-links \
#   APP_ENV=prod EVENTBUS_PROVIDER=nats NATS_URL="$NATS_URL" \
#   BACKEND_INTERNAL_URL="http://purpgo-api.internal:8080" \
#   INTERNAL_API_TOKEN="$INTERNAL_API_TOKEN"
#
# fly secrets set -a purpgo-rt \
#   APP_ENV=prod PHX_HOST="rt.purpgo.com" \
#   DATABASE_URL="$PRIMARY_DB" DATABASE_SSL=false \
#   REDIS_URL="$REDIS_URL" \
#   JWT_SECRET="$AUTH_SECRET" SECRET_KEY_BASE="$SECRET_KEY_BASE" \
#   CHECK_ORIGIN_HOSTS="https://app.purpgo.com,https://admin.purpgo.com" \
#   PUBSUB_ENABLED=false
#
# fly secrets set -a purpgo-web \
#   PURPGO_API_URL="https://api.purpgo.com" \
#   PURPGO_APP_URL="https://app.purpgo.com" \
#   PURPGO_ENV_LABEL="production"
#
# fly secrets set -a purpgo-admin \
#   PURPGO_API_URL="https://api.purpgo.com" \
#   PURPGO_DASHBOARD_URL="https://app.purpgo.com" \
#   PURPGO_ENV_LABEL="production"
#
# fly secrets set -a purpgo-forms \
#   APP_ENV=prod \
#   BACKEND_INTERNAL_URL="http://purpgo-api.internal:8080" \
#   INTERNAL_API_TOKEN="$INTERNAL_API_TOKEN"

# --- deploy, data plane first ---
fly deploy -c deploy/fly/postgres.toml -a purpgo-pg
fly deploy -c deploy/fly/redis.toml -a purpgo-redis
fly deploy -c deploy/fly/nats.toml -a purpgo-nats
fly deploy -c deploy/fly/api.toml -a purpgo-api
fly deploy -c deploy/fly/consumer.toml -a purpgo-consumer
fly deploy -c deploy/fly/worker.toml -a purpgo-worker
fly deploy -c deploy/fly/links.toml -a purpgo-links
fly deploy -c deploy/fly/realtime.toml -a purpgo-rt
fly deploy -c deploy/fly/web.toml -a purpgo-web
fly deploy -c deploy/fly/admin.toml -a purpgo-admin
fly deploy -c deploy/fly/forms.toml -a purpgo-forms

# --- certificates, after the new DNS records in DEPLOY-PLAN.md exist ---
# Do not add certificates for purpgo.com, get., staging., accounts-staging.,
# or jobline-preview.
fly certs add app.purpgo.com -a purpgo-web
fly certs add api.purpgo.com -a purpgo-api
fly certs add admin.purpgo.com -a purpgo-admin
fly certs add links.purpgo.com -a purpgo-links
fly certs add rt.purpgo.com -a purpgo-rt
fly certs add forms.purpgo.com -a purpgo-forms

echo "Deploy commands finished. Confirm each app with: fly status -a <app>"
