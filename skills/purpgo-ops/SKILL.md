---
name: purpgo-ops
description: Administer and recover a self-hosted Purpgo instance with purpgoctl's operator commands - instance status and health checks, creating accounts, resetting passwords, granting or revoking platform admin, disabling 2FA, claiming a fresh instance, exporting or importing a workspace. Use when the task is about the instance itself (accounts, access, health, migration) rather than campaigns or contacts.
---
<!-- Modified by Purpgo LLC. -->

# Operating a Purpgo instance with purpgoctl

The operator commands talk to the database directly, so they work when
signing in does not. They run wherever `PRIMARY_DB` is set, which in practice
means inside the backend container:

```bash
docker compose -p purpgo exec backend purpgoctl <command>
make cli ARGS="<command>"          # same thing on a compose install
```

## Start every investigation with status

```bash
docker compose -p purpgo exec backend purpgoctl status        # prose + exit 1 on errors
docker compose -p purpgo exec backend purpgoctl status --json # stable keys, always exits 0
make doctor                                                     # the same, wrapped
```

`--json` keys are a contract (only ever appended to); read `.summary.error`
for the verdict and `.next_steps` for the exact commands the situation calls
for. Prefer parsing that over reasoning from the prose.

## The commands

| Task | Command |
|---|---|
| Claim a fresh instance | `purpgoctl setup-link` (refuses once accounts exist) |
| Create an account | `purpgoctl user create --email you@example.com [--admin]` |
| List accounts / find admins | `purpgoctl user list [--admin]` |
| Reset a password | `purpgoctl user reset-password --email ...` (prints a link) |
| Grant platform admin | `purpgoctl user grant-admin --email ... --role super\|support\|ops\|analyst` |
| Revoke platform admin | `purpgoctl user revoke-admin --email ...` |
| Clear a lost authenticator | `purpgoctl user disable-2fa --email ...` |
| Hash for unattended bootstrap | `purpgoctl hash-password` |
| List workspaces | `purpgoctl org list` |
| Move a workspace out | `purpgoctl org export --org <id\|slug\|owner-email> --out file.zip` |
| Move a workspace in | `purpgoctl org import --org ... --file file.zip --dry-run` first |
| Back the instance up | `purpgoctl backup --out /data/blobs/purpgo.tar.gz`, then copy it out and delete it |
| Restore one onto this instance | `purpgoctl restore --file /data/blobs/purpgo.tar.gz` |
| See which key opens each stored secret | `purpgoctl keys status [--json]` |
| Move secrets onto a new primary key | `purpgoctl keys reseal` (dry run), then `keys reseal --apply` |
| Mint replacement keys and tokens | `purpgoctl keys generate [NAME...]` |

## Mechanics that bite

- Prompts need a TTY; pipes need `-T`. `docker compose exec` allocates a TTY
  unless you pass `-T`, so:
  - prompting: `docker compose -p purpgo exec backend purpgoctl user create --email ...`
  - piping: `printf '%s' "$PW" | docker compose -p purpgo exec -T backend purpgoctl user create --email ... --password-stdin`
- Passwords are 8-128 characters, the dashboard's own rule.
- `--admin` opens the admin panel on `ADMIN_URL` (port 5174 by default), not
  the dashboard on `APP_URL`.
- Redis down: `setup-link` and link-minting `reset-password` fail; use
  `user reset-password --password-stdin` instead. Everything else degrades to
  a warning and keeps working.
- `org import` always with `--dry-run` first; the report is free and names
  every member whose rows would be reassigned to the owner.
- `org export --with-credentials` produces the most sensitive file the
  product has (every mailbox password and refresh token, sealed only by the
  passphrase you supply). Never write it anywhere world-readable, and never
  echo the passphrase.
- `backup` and `restore` are the INSTANCE-level pair and are not
  interchangeable with `org export`/`org import`: a bundle cannot be applied to
  one workspace, and a workspace archive cannot restore an instance.
- `restore` replaces every organization, user and mailbox on the target. It
  asks for a typed `restore` first; `--yes` skips that, so only pass it to a
  target you have just checked with `status --json`.
- `restore` refuses when the host's `CREDENTIALS_ENCRYPTION_KEY` or
  `KMS_LOCAL_MASTER_KEY` differ from the bundle's, and prints the lines to put
  in `.env`. Do that. `--force` accepts losing every stored mailbox credential
  permanently and is never the right answer to that message.

## Standing an instance up, or moving one

Installing, reconfiguring, backing up on a schedule and moving an instance to
another host is the `purpgo-install` skill.

## Interacting with the product itself

Campaigns, contacts, mailboxes, the inbox and settings go through the API
half of purpgoctl with an API key. That is the `purpgo-api` skill.
- Rotating `CREDENTIALS_ENCRYPTION_KEY` or `TWOFA_SECRET` is never a swap.
  Deploy the new value with the old one in `CREDENTIALS_ENCRYPTION_READ_KEYS`
  / `TWOFA_READ_SECRETS`, run `keys reseal --apply` until `keys status` shows
  nothing under a read key, and keep the old key while any backup, rollback
  target or pending job still needs it. Swapping the primary without the old
  key as a read key makes every stored mailbox credential or MFA enrolment
  unopenable.
- `keys status` and `keys reseal` exit non-zero when a value opens under no
  configured key. That is the signal to restore a key, never to retire one,
  and `reseal` leaves those values untouched.
