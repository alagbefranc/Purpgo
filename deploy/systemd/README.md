<!-- Modified by Purpgo LLC. -->
# systemd units for a Docker-free install

One unit per Purpgo process, for a host where the binaries were built from
source and installed under `/opt/purpgo`. The step-by-step guide that uses
them is [Deploying without Docker](https://docs.purpgo.com/development/bare-metal/).

| Unit | Runs | Reads |
|------|------|-------|
| `purpgo-backend.service` | `/opt/purpgo/bin/backend` | `/etc/purpgo/purpgo.env` |
| `purpgo-forms.service` | `/opt/purpgo/bin/forms` | `/etc/purpgo/purpgo.env` |
| `purpgo-consumer.service` | `/opt/purpgo/bin/consumer` | `/etc/purpgo/purpgo.env` |
| `purpgo-tracking.service` | `/opt/purpgo/bin/tracking` | `/etc/purpgo/purpgo.env` |
| `purpgo-realtime.service` | `/opt/purpgo/realtime/bin/realtime start` | `/etc/purpgo/purpgo.env` |
| `purpgo-worker.service` | `/opt/purpgo/bin/worker` | `/etc/purpgo/worker.env` |
| `purpgo-updater.service` | `/opt/purpgo/bin/updater` | `/etc/purpgo/updater.env` |

Every unit runs as the unprivileged `purpgo` user, may write only under
`/var/lib/purpgo` (blob storage), and restarts on failure. Copy them to
`/etc/systemd/system/`, then `systemctl daemon-reload` and
`systemctl enable --now` the ones this host runs. Paths are plain strings, so
`sed` them if you install somewhere other than `/opt/purpgo`.

`deploy/config/env.example` is the template for `purpgo.env`; the worker env
file is what `POST /api/v1/workers/enroll` returns for an enrollment token.

`purpgo-updater.service` is the exception to the unprivileged rule: it runs as
the user who owns the checkout (`deploy` in the unit; change it) and drives
`scripts/upgrade-bare-metal.sh`, which builds unprivileged and then runs
`purpgo-install-release.sh` (installed root-owned at
`/usr/local/sbin/purpgo-install-release`) through sudo. That installer takes no
arguments, touches only fixed paths and refuses symlinks, and is the single
command to allow in sudoers. `updater.env` holds only `UPDATER_TOKEN` (the
backend's `INTERNAL_API_TOKEN`). See
[Updates](https://docs.purpgo.com/development/updates/).
