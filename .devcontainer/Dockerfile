# Dev container image for strata.
#
# Base: the official .NET dev container image (GA SDK 10 in /usr/share/dotnet,
# includes git, ICU and the `vscode` user) — pattern from the .NET blog post:
# https://devblogs.microsoft.com/dotnet/dotnet-in-dev-container/
#
# Extra runtimes/SDKs are layered on top by COPYing from the official images —
# the same technique the blog uses to add SDK versions.
FROM mcr.microsoft.com/devcontainers/dotnet:2-10.0

# Latest GA .NET 10 SDK patch (10.0.40x) on top of the base image's SDK.
COPY --from=mcr.microsoft.com/dotnet/sdk:10.0 /usr/share/dotnet /usr/share/dotnet

# Node.js 22 runtime + npm/npx/corepack (binaries and global modules)
COPY --from=node:22 /usr/local/bin/ /usr/local/bin/
COPY --from=node:22 /usr/local/lib/node_modules/ /usr/local/lib/node_modules/

# psql client for inspecting the database container.
# (The base image ships a yarn apt repo whose signing key expired; drop it so
# apt-get update doesn't fail — we don't need yarn.)
RUN rm -f /etc/apt/sources.list.d/yarn.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client \
    && rm -rf /var/lib/apt/lists/*

ENV DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_NOLOGO=1
