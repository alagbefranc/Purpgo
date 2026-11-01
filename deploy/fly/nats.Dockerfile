# JetStream on a volume. Listens on :: because Fly .internal names are IPv6.
# NATS_TOKEN is a Fly secret; clients use nats://<token>@purpgo-nats.internal:4222.
FROM nats:2.10-alpine
ENTRYPOINT ["/bin/sh", "-c", "exec nats-server -js -sd /data -m 8222 -a :: --auth \"$NATS_TOKEN\""]
