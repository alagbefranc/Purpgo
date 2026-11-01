# Fly.io config (deployed 2026-11-01)

Deployed to Fly org `personal`, region yyz: purpgo-pg, -redis, -nats, -api, -consumer, -worker, -links, -rt. web and admin are on Cloudflare Pages (purpgo-app, purpgo-admin), not Fly; web.toml, admin.toml and forms.toml are unused.

Deploy from the repo root: `fly deploy . --remote-only --depot=false -c deploy/fly/<file>.toml -a <app>`. links builds from the tracking/ context: `fly deploy tracking --remote-only --depot=false -c $PWD/deploy/fly/links.toml -a purpgo-links`. Dockerfile paths in the tomls are relative to this directory.

`commands.sh` exits immediately unless `PURPGO_DEPLOY_APPROVED=1` is set in the environment. Do not set that until the owner has approved `DEPLOY-PLAN.md`.

Read [DEPLOY-PLAN.md](../../DEPLOY-PLAN.md) before changing an app name, a region, or a secret.
