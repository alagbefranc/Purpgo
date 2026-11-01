# Purpgo production deploy plan (Fly.io)

Status: **plan only**. No Fly app has been created, no DNS record has been changed, and nothing in `deploy/fly/commands.sh` has been run. That script exits unless `PURPGO_DEPLOY_APPROVED=1`.

Prices below were read on **1 November 2026** from:

- https://fly.io/pricing (compute by region, including the Toronto multiplier)
- https://docs.fly.io/about/pricing (volumes, egress, certificates, IPv4, Managed Postgres summary)
- https://docs.fly.io/postgres (Managed Postgres plans and storage)
- https://docs.fly.io/reference/regions (region list; Toronto `yyz` hosts apps and Managed Postgres)
- https://docs.fly.io/upstash/redis (Upstash, not chosen for v1)
- https://neon.com/pricing (Neon, not chosen for v1; page says last updated 31 October 2026)
- https://supabase.com/pricing (Supabase, not chosen for v1)
- https://developers.cloudflare.com/r2/pricing/ (R2, last updated 30 October 2026)

Monthly machine prices are Fly's 30-day continuous-runtime figures. A 31-day month is slightly higher. Toronto prices that Fly does not print as a single cell are Ashburn list price times the published `yyz` multiplier **1.115**, rounded to the cent: shared-cpu-1x 512MB is $3.69 × 1.115 = **$4.11**; shared-cpu-1x 1GB is $6.70 × 1.115 = **$7.47**. Fly prints shared-cpu-1x 256MB in Toronto as **$2.45**.

## Region

**Toronto (`yyz`).** It is the only Canadian Fly region, it can host Managed Postgres later, and its multiplier (1.115) is lower than Chicago (`ord`, 1.250). Winnipeg is closer to Chicago on the map; Toronto is the right first region anyway because the operator is in Canada and the database, Redis, and NATS then stay in Canada. Private traffic between these apps stays inside `yyz`, which Fly does not charge for.

Do not spread v1 across regions. Cross-region private traffic is billed.

## What production actually runs

Compose starts a no-cloud stack. Several of those containers exist only for a laptop.

| Compose service | Production | Why |
|---|---|---|
| postgres | Yes, one Fly Machine | System of record. Realtime and the API both use it. |
| redis | Yes, one Fly Machine | Realtime fanout and the cache. A handful of users do not need Upstash. |
| nats | Yes, one Fly Machine with JetStream | The event bus. Consumer, worker, and tracking all require it. Kafka is not used. |
| backend | Yes, as `purpgo-api` | REST API. Applies migrations on boot. |
| consumer | Yes | Turns bus events into database writes. Not mergeable into the API image; it is a different binary. |
| worker | Yes, one Machine (two on the comfortable tier) | SMTP/IMAP send and sync. More workers add parallelism, not more sending IPs. Outbound mail is submitted to the mailbox provider. |
| tracking | Yes, as `purpgo-links` | Open pixels and click redirects. Must be its own hostname. |
| realtime | Yes, as `purpgo-rt` | WebSockets. Separate Elixir image. |
| web | Yes, as `purpgo-web` | The dashboard. Static nginx. |
| admin | Yes, but allowed to stop on the minimal tier | Same login as the dashboard. Rarely open. |
| forms | Optional for v1 | Public form pages. No database of its own. Ships stopped until requested. |
| updater | Drop | It expects a Docker socket and a git checkout. Fly deploys are `fly deploy`. Set `UPDATER_URL=none` and `UPDATE_CHECK_ENABLED=false`. |
| mailpit | Drop | Local SMTP sink. The image has no authentication. Compose already keeps it out of `make up`. |
| dovecot | Drop | Local IMAP for the sandbox profile only. |
| seed | Drop | Plants `admin@purpgo.local` / `Test1234!` and a public API key. Upstream says never to run it where anyone else can connect. |
| blobs volume shared by API, consumer, and worker | Replace with Cloudflare R2 | A Fly volume attaches to one Machine. Those three processes are different images, so they cannot share a disk. Upstream already supports `BLOB_PROVIDER=s3`. R2 is the S3 API on the Cloudflare account that already holds the zone. |

Docs are not a compose service. Host them later on Cloudflare Pages at `docs.purpgo.com` for $0. The product does not need the docs site in order to run.

The marketing site stays off this plan. The apex `purpgo.com` is out of scope.

## Fly layout

One Fly **app per image**. Process groups only help when several processes share one image. Backend, consumer, and worker are three Dockerfiles.

No public IPv4 is allocated for Postgres, Redis, NATS, the consumer, or the worker. They listen on the org private network (`<app>.internal`). The worker still has outbound internet via Fly's shared egress, which is what it uses to reach Gmail, Microsoft, and customer SMTP servers.

| App | Image | Public hostname | Machine (always on unless noted) | Volume |
|---|---|---|---|---|
| `purpgo-pg` | `postgres:16-alpine` | none | shared-cpu-1x, 1GB | 10GB (`pg_data`), 20GB on the comfortable tier |
| `purpgo-redis` | Redis 7 | none | shared-cpu-1x, 256MB | 1GB |
| `purpgo-nats` | NATS 2.10, JetStream | none | shared-cpu-1x, 256MB | 1GB |
| `purpgo-api` | backend Dockerfile | `api.purpgo.com` | shared-cpu-1x, 1GB | none (blobs in R2) |
| `purpgo-consumer` | consumer Dockerfile | none | shared-cpu-1x, 512MB | none |
| `purpgo-worker` | worker Dockerfile | none | shared-cpu-1x, 512MB | 1GB worker id file |
| `purpgo-links` | tracking Dockerfile | `links.purpgo.com` | shared-cpu-1x, 256MB | none |
| `purpgo-rt` | realtime Dockerfile | `rt.purpgo.com` | shared-cpu-1x, 512MB | none |
| `purpgo-web` | web Dockerfile | `app.purpgo.com` | shared-cpu-1x, 256MB | none |
| `purpgo-admin` | admin Dockerfile | `admin.purpgo.com` | shared-cpu-1x, 256MB, **stopped until a request** on the minimal tier | none |
| `purpgo-forms` | forms Dockerfile | `forms.purpgo.com` | shared-cpu-1x, 256MB, **stopped until a request**; omit entirely if forms are out of v1 | none |

Config lives in `deploy/fly/*.toml`. Deploy from the repo root with `fly deploy -c deploy/fly/<file>.toml -a <app>`.

### Why not the managed databases

| Option | Why it is not v1 |
|---|---|
| Fly Managed Postgres Basic | **$38/month** plus $0.28/GB storage, before the apps. That is a second copy of this whole compute bill. Right when a backup and a failover matter more than the dollars. |
| Fly unmanaged `fly postgres` | Superseded by Managed Postgres. A normal Postgres image on a Machine is the supported cheap shape. |
| Neon Free | 100 CU-hours per project per month and scale-to-zero after 5 idle minutes. An always-on API plus a worker burns past 100 CU-hours (0.25 CU × 24 × 30 ≈ 180). Compute then suspends until next month. |
| Neon Launch, always on | About $0.106 per CU-hour. 0.25 CU all month is roughly **$19** plus storage, and the database is outside `yyz` unless Neon offers that region. More expensive than the $7.47 Machine, and a second vendor. |
| Supabase Free | 500MB and the project pauses after a week of low activity. A bad fit for a worker that must keep heartbeats. |
| Supabase Pro | From **$25/month**. More than the Fly Machine, and not required for features. |
| Upstash Redis pay-as-you-go | $0.20 per 100k commands. Fine until Phoenix presence polling runs the bill up. The Fixed 250MB plan is **$10/month**. A 256MB Redis Machine is $2.45. |
| Tigris | Another store. R2 is already on the Cloudflare account and the free tier covers a first launch. |

Operate the single Postgres node with Fly volume snapshots (first 10GB-month of snapshot data is free, then $0.08/GB-month). This is not highly available. A disk loss without a snapshot loses the database. The encryption keys are not on that disk; they still have to be backed up separately or a restored database cannot be decrypted.

## Subdomains

All of these are **new names**. Grey-cloud them (DNS only) so Fly terminates TLS and the tracking service sees the client IP. Do not orange-cloud them on day one.

| Hostname | App | Why it exists |
|---|---|---|
| `app.purpgo.com` | `purpgo-web` | The dashboard. Browsers, passkeys, and every emailed link use `APP_URL`. |
| `api.purpgo.com` | `purpgo-api` | The API. Separate from the dashboard so the static app and the Go process scale and deploy independently. |
| `admin.purpgo.com` | `purpgo-admin` | The operator panel. Same account as the dashboard, different origin, so it can be stopped without taking the product down. |
| `rt.purpgo.com` | `purpgo-rt` | WebSockets. The Elixir service is its own process; Fly sends a hostname to one app. |
| `links.purpgo.com` | `purpgo-links` | Open pixels and click redirects. One tracking hostname is enough (`track.` is not also created). |
| `forms.purpgo.com` | `purpgo-forms` | Public form pages and embeds. Optional for v1. |
| `notify.purpgo.com` | none on Fly | Envelope domain for transactional mail only. Not a website. |
| `docs.purpgo.com` | Cloudflare Pages, later | The docs app. Not required to send mail or use the dashboard. $0 on Pages. |

`links.purpgo.com` is a compromise. Upstream's `tracking_domain_shares_brand` check will warn, because campaign links then share the registered domain `purpgo.com` with the dashboard. A blocklist hit on the tracking host can touch the parent domain. The follow-up, not part of this launch, is a second registered domain used only for tracking. That purchase is not in the totals below.

### Left untouched

Do not create, edit, or delete records for:

- `purpgo.com` (apex: A, AAAA, CNAME, TXT, MX)
- `get.purpgo.com`
- `staging.purpgo.com`
- `accounts-staging.purpgo.com`
- `jobline-preview.purpgo.com`
- any existing MX, SPF, DKIM, or DMARC that serves mail today, including `_dmarc.purpgo.com` if it already exists

## DNS at Cloudflare

Add only the rows below. Proxied = DNS only (grey cloud).

| Type | Name | Value | Purpose |
|---|---|---|---|
| CNAME | `app` | `purpgo-web.fly.dev` | Dashboard |
| CNAME | `api` | `purpgo-api.fly.dev` | API |
| CNAME | `admin` | `purpgo-admin.fly.dev` | Admin |
| CNAME | `rt` | `purpgo-rt.fly.dev` | WebSockets |
| CNAME | `links` | `purpgo-links.fly.dev` | Tracking |
| CNAME | `forms` | `purpgo-forms.fly.dev` | Forms, when that app is launched |
| CNAME | `docs` | the Pages hostname | Only when docs are published |

Fly prints the certificate target after `fly certs add`. If a name comes back as an A/AAAA pair instead of a CNAME, use that pair for that name only. Still do not point the apex at Fly.

After the new names resolve, add the certificates listed in `deploy/fly/commands.sh`. The first 10 single-hostname certificates on Fly are free. This plan uses at most 6.

### Transactional mail (new names only)

Platform mail (login codes, invites, resets) is submitted to an SMTP relay. The `From` address is `noreply@notify.purpgo.com`, not an address on the apex. The relay provider will show the exact CNAMEs. They land on `notify.purpgo.com` and on DKIM selectors under that name. Typical shape, to be replaced by the provider's screen:

| Type | Name | Value |
|---|---|---|
| TXT | `notify` | `v=spf1 include:<provider> -all` |
| CNAME | `<selector>._domainkey.notify` | the provider's DKIM target |
| TXT | `_dmarc.notify` | `v=DMARC1; p=none; rua=mailto:<an address you already receive>` |

`p=none` until the reports look clean. Do not publish a DMARC record at `_dmarc.purpgo.com` as part of this plan.

No MX is required on `notify` if the relay sends and you do not receive mail there. Do not add an MX.

### Customer tracking CNAMEs

Those are records in the customer's DNS, not in `purpgo.com`. A workspace that wants its own click domain CNAMEs that hostname at `links.purpgo.com` after the hostname is verified in the product. Nothing in the `purpgo.com` zone changes for that.

### Existing mail

No SPF include is added to the apex. No new MX. No change to whatever already receives mail for `purpgo.com`. If transactional mail must later be sent as `@purpgo.com`, that is a separate change to existing TXT records and is out of this plan.

## Monthly cost

Assumptions for a handful of users, all Machines in `yyz`, 30-day month, R2 inside the free tier (10 GB-month, 1 million Class A, 10 million Class B, egress free), snapshots of the database under the 10GB free snapshot allowance, North American public egress at $0.02/GB.

### Minimal (first launch)

| Line | Monthly |
|---|---|
| Postgres Machine, shared-cpu-1x 1GB | $7.47 |
| Postgres volume, 10GB × $0.15 | $1.50 |
| Redis Machine, 256MB | $2.45 |
| Redis volume, 1GB | $0.15 |
| NATS Machine, 256MB | $2.45 |
| NATS volume, 1GB | $0.15 |
| API Machine, 1GB | $7.47 |
| Consumer Machine, 512MB | $4.11 |
| Worker Machine, 512MB | $4.11 |
| Tracking Machine, 256MB | $2.45 |
| Realtime Machine, 512MB | $4.11 |
| Web Machine, 256MB | $2.45 |
| Admin Machine, stopped, ~1GB rootfs × $0.15 | $0.15 |
| Forms | not run |
| R2, certificates, shared IPv4 | $0 |
| Egress, about 5GB | $0.10 |
| Volume snapshots within 10GB | $0 |
| **Minimal total** | **$39** |

$7.47 + $1.50 + $2.45 + $0.15 + $2.45 + $0.15 + $7.47 + $4.11 + $4.11 + $2.45 + $4.11 + $2.45 + $0.15 + $0.10 = $39.12, reported as **$39/month**.

### Comfortable

Same region. Admin and forms stay on. Two workers. 20GB Postgres volume. About 20GB egress. Snapshots still assumed inside the free 10GB of stored snapshot data; if stored snapshots exceed that, add $0.08 per extra GB-month.

| Line | Monthly |
|---|---|
| Postgres Machine, 1GB | $7.47 |
| Postgres volume, 20GB | $3.00 |
| Redis Machine + 1GB volume | $2.60 |
| NATS Machine + 1GB volume | $2.60 |
| API Machine, 1GB | $7.47 |
| Consumer Machine, 512MB | $4.11 |
| Two worker Machines, 512MB, plus a 1GB state volume each | $8.52 |
| Tracking, 256MB | $2.45 |
| Realtime, 512MB | $4.11 |
| Web, 256MB | $2.45 |
| Admin, always on, 256MB | $2.45 |
| Forms, always on, 256MB | $2.45 |
| Egress, about 20GB × $0.02 | $0.40 |
| R2, certificates, shared IPv4, snapshots | $0 |
| **Comfortable total** | **$50** |

The rows above already include volumes. They sum to $50.08, reported as **$50/month**. A second worker cannot mount the first worker's volume; create the extra 1GB volume before `fly scale count 2 -a purpgo-worker`.

Not in either total: a second tracking domain, Fly support ($29 Standard), a dedicated IPv4 ($2), a static egress IP (about $3.60), Managed Postgres Basic ($38 plus storage), or the SMTP vendor. Transactional volume for a handful of users usually fits a provider's free quota; confirm that quota on the day you sign up. It is not part of the Fly bill.

## Secrets

Names only. The blank list is `deploy/fly/secrets.example`. Generate values on the operator machine. Back up `KMS_LOCAL_MASTER_KEY` and `CREDENTIALS_ENCRYPTION_KEY` outside Fly before the first mailbox is saved. Losing either one makes stored mailbox credentials unreadable, and a database snapshot does not fix that. Upstream refuses to boot when `APP_ENV=prod` and these still hold the published compose defaults.

### Required for v1

| Name | Where |
|---|---|
| `APP_ENV` | api, consumer, worker, links, realtime, forms |
| `AUTH_SECRET` | api; realtime reads the same value as `JWT_SECRET` |
| `SECRET_KEY_BASE` | realtime |
| `INTERNAL_API_TOKEN` | api, links, forms; worker as `ENCRYPTED_KEYS_WORKER_TOKEN` |
| `KMS_LOCAL_MASTER_KEY` | api, consumer, worker |
| `CREDENTIALS_ENCRYPTION_KEY` | api, consumer, worker |
| `POSTGRES_PASSWORD` | `purpgo-pg` |
| `REDIS_PASSWORD` | `purpgo-redis` |
| `PRIMARY_DB` | api, consumer; realtime as `DATABASE_URL` |
| `REDIS` | api, consumer, worker; realtime as `REDIS_URL` |
| `NATS_URL` | api, consumer, worker, links |
| `DATABASE_SSL` | realtime (`false` on the private Postgres) |
| `APP_URL`, `API_PUBLIC_URL`, `CORS_ALLOW_ORIGINS`, `WEBSOCKET_URL` | api |
| `PHX_HOST`, `CHECK_ORIGIN_HOSTS` | realtime |
| `TRACKING_DOMAIN` | api |
| `FORMS_DOMAIN` | api, if forms are on |
| `BACKEND_INTERNAL_URL` | links, forms |
| `ENCRYPTED_KEYS_BACKEND_URL`, `ENCRYPTED_KEYS_PROVIDER` | worker |
| `BLOB_PROVIDER`, `BLOB_BUCKET`, `BLOB_PUBLIC_BASE_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION` | api, consumer, worker |
| `MAIL_TRANSPORT`, `EMAIL_NAME`, `EMAIL_ADDRESS`, `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_SECURITY` | api (consumer sends some mail from the same block) |
| `EMAIL_BRAND_NAME`, `EMAIL_BRAND_LEGAL_ENTITY`, `EMAIL_BRAND_WEBSITE_URL`, `EMAIL_BRAND_SUPPORT_EMAIL` | api |
| `EVENTBUS_PROVIDER`, `CODEC_PROVIDER`, `KMS_PROVIDER`, `TASKS_PROVIDER`, `BILLING_PROVIDER`, `PUBSUB_ENABLED` | api, and the matching subset on consumer and worker |
| `MAIL_TLS_INSECURE` | worker, set to `false` |
| `UPDATE_CHECK_ENABLED`, `UPDATER_URL` | api (`false` and `none`) |
| `PURPGO_API_URL`, `PURPGO_APP_URL` | web |
| `PURPGO_API_URL`, `PURPGO_DASHBOARD_URL`, `PURPGO_ENV_LABEL` | admin |
| `TRUSTED_PROXIES` | api, and the tracking equivalent if open-tracking IP must be the visitor rather than the Fly proxy |

`TRUSTED_PROXIES` is empty by default, which means the API does not trust `X-Forwarded-For`. On Fly the process sees the proxy. Before launch, set it from Fly's current proxy documentation so rate limits and tracking see the client. Do not guess a CIDR in this repo.

### Optional for v1

| Name | When it becomes required |
|---|---|
| `BOX_OUTLOOK_CLIENT_ID`, `BOX_OUTLOOK_CLIENT_SECRET` | Connecting Microsoft 365 or Outlook mailboxes with OAuth |
| `BOX_GOOGLE_OAUTH_CONNECT`, `BOX_GOOGLE_CLIENT_ID`, `BOX_GOOGLE_CLIENT_SECRET` | Per-mailbox Google OAuth. App passwords and SMTP/IMAP need none of these. Upstream is retiring the per-mailbox Google flow. |
| `GOOGLE_WORKSPACE_DELEGATION_KEY` | Whole-domain Google Workspace connect |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | "Sign in with Google" for the dashboard. Not the mailbox client. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` | Only if `BILLING_PROVIDER=stripe`. v1 stays `none`. The API exits on boot if the provider is stripe and any of the three is missing. |
| `CAPTCHA_PROVIDER`, `TURNSTILE_SECRET`, `TURNSTILE_SITE_KEY`, `PURPGO_TURNSTILE_KEY` | Public signup or form captcha |
| `UNSUBSCRIBE_SIGNING_SECRET`, `TWOFA_SECRET` | Dedicated keys. The app can derive some of this from `AUTH_SECRET`; set them before real users if you want to rotate them alone. |
| `GEODB_URL` | Country and city on opens. Needs a MaxMind database. |
| `TRACKING_IP_HASH_KEY` | Hashing tracker IPs |
| `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` | SSO |
| `PURPGO_POSTHOG_*`, `SENTRY_DSN`, `PURPGO_SENTRY_DSN` | Product analytics and error tracking. Leave `SENTRY_DSN` unset on realtime rather than setting it to an empty string; the Elixir library refuses to boot on `""`. |
| `TYPESAFE_API_KEY`, `INBOX_TAGGING_ENABLED` | Automatic inbox tagging |
| `APNS_*` | iOS push |
| `RELEASES_GITHUB_TOKEN` | Higher GitHub release-check quota. Not used when update checks are off. |

## Accounts the owner provides

1. A Fly.io organization with billing enabled. Creating the Machines is what spends money. Do not run `deploy/fly/commands.sh` until that spend is accepted.
2. Access to the Cloudflare zone for `purpgo.com`, used only to add the new names above.
3. An R2 bucket and an API token (S3-compatible access key). Free tier covers v1 storage.
4. An SMTP relay (Resend, Postmark, SES, or similar) authenticated to send as `noreply@notify.purpgo.com`, with SPF and DKIM on `notify.purpgo.com` only.
5. A password-manager copy of the two encryption keys.

Not required to launch:

- Stripe
- Google Cloud, unless Outlook is not enough and you want Google OAuth or Workspace domain-wide connect
- Microsoft Entra, unless mailboxes are Microsoft 365 rather than SMTP/IMAP or app passwords
- MaxMind, PostHog, Sentry, Turnstile, Apple Developer

SMTP plus IMAP mailboxes need no OAuth app at all.

## Order of operations

`deploy/fly/commands.sh` is the command list. It is gated. The order inside it is:

1. `fly auth login` and confirm the org. Not in the script, because it is interactive.
2. Create the apps. Do not allocate public IPs for `purpgo-pg`, `purpgo-redis`, `purpgo-nats`, `purpgo-consumer`, or `purpgo-worker`.
3. Create the volumes in `yyz`.
4. Generate secrets locally, store the two encryption keys, then `fly secrets set` per app. The script leaves the `fly secrets set` lines commented so a filled-in shell history is a deliberate act.
5. Deploy Postgres, Redis, and NATS, then the API (it migrates on boot), then consumer, worker, tracking, realtime, web, admin, and forms.
6. Add the DNS CNAMEs. Wait until they resolve.
7. `fly certs add` for the new hostnames only.
8. Open `https://app.purpgo.com`, claim the instance from the one-time link in `fly logs -a purpgo-api`, and do not run the demo seed.

Claim the instance while you are the only person who can reach it. `DISABLE_REGISTRATION` defaults to invite-only on a self-host after the first account exists.

## Risks

### Sending reputation

- Mail submitted through Gmail or Microsoft is sent from their infrastructure. Fly's shared egress IP is the client that logged into that SMTP server, and upstream's architecture notes say Google strips that client IP and Microsoft dropped `X-Originating-IP`. Reputation then belongs to the mailbox, not to Fly.
- A mailbox whose SMTP server is the worker itself, talking directly to recipient MX hosts, would send from Fly's shared egress. Those addresses are used by other Fly customers. Do not do that for v1. Use the mailbox provider's SMTP submission (587 or 465).
- A static egress IP is about $3.60/month and is still one address with no warmup history. It does not fix cold email by itself. It is not in the v1 totals.
- `links.purpgo.com` puts campaign URLs on the same registered domain as the product. One complaint-driven blocklist entry can affect more than the tracker. Upstream tells operators to use a separate registered domain and then per-workspace tracking domains. Budget that domain when the first real campaign goes out.
- A single small install does not have the hosted product's shared warmup pool. Warmup here is this instance's own mailboxes exchanging mail. Upstream warns that fewer than two pool rows makes warmup fail closed; migration `000156` inserts the free and premium pools, and a partial restore can drop them. That is not the same thing as a large pool of unrelated mailboxes, and it is not evidence of inbox placement. Upstream's send-safety notes say diagnostic reads, stars, and rescues are automated and disclosed, not a reputation proof.
- Do not turn on `MAIL_TLS_INSECURE`. That flag exists for the sandbox's self-signed Dovecot.

### CASL and CAN-SPAM

The operator is in Canada. CASL applies to commercial electronic messages that are sent from Canada or accessed in Canada. A cold-email product does not supply consent by itself. Express consent, or a narrow implied-consent category, the sender's identity, and a working unsubscribe are the operator's obligations. Penalties under CASL are large for organizations. Messages to people in the United States also have to meet CAN-SPAM: honest headers, a physical postal address, and a working opt-out. This plan does not add a postal address to the legal footer because one was not invented for Purpgo LLC. Put a real mailing address in `EMAIL_BRAND_ADDRESS` before commercial mail is sent to the US. This is not legal advice; have Canadian counsel look at the first campaign.

Unsubscribe links are signed. Set `APP_URL` to `https://app.purpgo.com` or those links point at the wrong host. Keep `UNSUBSCRIBE_SIGNING_SECRET` stable once messages have been sent.

### What upstream's self-host docs already warn about

- `APP_ENV=prod` refuses the published default secrets. `ALLOW_INSECURE_DEFAULTS=true` is the override they tell you not to use.
- `KMS_LOCAL_MASTER_KEY` and `CREDENTIALS_ENCRYPTION_KEY` are unrecoverable if lost. Rotate them only with a plan; existing ciphertext does not move itself.
- `make seed-demo` inserts a public super-admin password and a public API key. Never run it on this Fly stack.
- Mailpit's UI has no authentication. It is not in this plan.
- The updater holds the Docker socket and is root-equivalent on a compose host. It does not belong on Fly.
- Passkeys require HTTPS `APP_URL`. Changing that host later invalidates enrolled passkeys.
- `AUTH_SECRET` and realtime's `JWT_SECRET` must be the same string, or the dashboard loads and the socket rejects every token.
- `INTERNAL_API_TOKEN` must match across API, worker, tracking, and forms, or clicks and worker key fetches fail closed.
- The API migrates on boot. A dirty `schema_migrations` row blocks the instance until someone repairs that version.
- Platform mail without SPF and DKIM on the `From` domain lands in spam. Publish those on `notify.purpgo.com` only.
- `DEPLOYMENT_MODE` stays `self_hosted` (the compose default). `cloud` turns on hosted-billing assumptions this plan does not configure.

## Files

| Path | Role |
|---|---|
| `deploy/fly/*.toml` | One app each. Not deployed. |
| `deploy/fly/postgres.Dockerfile`, `redis.Dockerfile`, `nats.Dockerfile` | Thin wrappers around upstream images. |
| `deploy/fly/commands.sh` | The command sequence. Exits unless `PURPGO_DEPLOY_APPROVED=1`. |
| `deploy/fly/secrets.example` | Env names, empty values. |
