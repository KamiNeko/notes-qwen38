#!/usr/bin/env bash
# Builds the dev container image with plain `docker build`.
#
# Why not `docker compose build`? The Dev Containers CLI + Compose v5 + Buildx
# >= 0.37.2 reject the CLI-generated Dockerfile that sits outside the bake
# context (devcontainers/cli#1320). A plain build has no such restriction, and
# docker-compose.yml references the result as an image-only service.
set -euo pipefail

cd "$(dirname "$0")"

IMAGE=strata-tools:latest

echo "==> Building $IMAGE"
docker build -t "$IMAGE" -f Dockerfile .

echo "==> Done. Open the folder in the container (F1 -> Dev Containers: Reopen in Container)."
echo "    Rebuild after changing this Dockerfile with: bash .devcontainer/build-tools-image.sh"
