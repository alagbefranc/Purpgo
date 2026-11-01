# Redis 7 with AOF on the mounted volume. Not built until the owner approves.
FROM redis:7-alpine
COPY deploy/fly/redis-entrypoint.sh /usr/local/bin/redis-entrypoint.sh
RUN chmod +x /usr/local/bin/redis-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/redis-entrypoint.sh"]
