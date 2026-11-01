# The `purpgo` CLI as an image, for CI jobs and anywhere installing a binary
# is more trouble than pulling one:
#
#   docker run --rm -e PURPGO_TOKEN ghcr.io/purpgo/purpgo/cli campaign list
#
# Distroless-style: the CLI is a static binary that talks to one HTTPS API, so
# the runtime needs certificates, timezone data and nothing else.
FROM --platform=$BUILDPLATFORM golang:1.26-alpine AS builder

ARG TARGETOS
ARG TARGETARCH
ARG VERSION=""
ARG COMMIT=""
ARG BUILT_AT=""

WORKDIR /app
COPY go.mod go.sum ./
RUN --mount=type=cache,id=gomod,target=/go/pkg/mod go mod download

COPY . .
RUN --mount=type=cache,id=gomod,target=/go/pkg/mod \
    --mount=type=cache,id=gobuild,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build \
      -ldflags="-s -w \
        -X github.com/purpgo/purpgo/internal/version.Version=$VERSION \
        -X github.com/purpgo/purpgo/internal/version.Commit=$COMMIT \
        -X github.com/purpgo/purpgo/internal/version.BuiltAt=$BUILT_AT" \
      -o /out/purpgo ./cmd/cli

FROM alpine:3.23

RUN apk add --no-cache ca-certificates tzdata && adduser -D -u 1000 purpgo

COPY --from=builder /out/purpgo /usr/local/bin/purpgo

# A container has no browser, so `purpgo auth login` cannot finish here.
# PURPGO_TOKEN is the documented way in, and the config directory is a volume
# mount point for anyone who would rather bring their hosts.yml.
ENV PURPGO_CONFIG_DIR=/home/purpgo/.config/purpgo \
    PURPGO_NO_UPDATE_CHECK=1

USER purpgo
WORKDIR /home/purpgo

ENTRYPOINT ["purpgo"]
CMD ["--help"]
