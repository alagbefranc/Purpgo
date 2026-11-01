# JetStream on a volume. Not built until the owner approves.
FROM nats:2.10-alpine
CMD ["-js", "-sd", "/data", "-m", "8222"]
