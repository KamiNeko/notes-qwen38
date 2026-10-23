#!/usr/bin/env bash
# Runs once after the dev container is created.
set -euo pipefail

echo "==> Copying .env if missing"
if [ ! -f .env ]; then
  cp .env.example .env
  # Generate a random JWT key for local development
  if command -v openssl >/dev/null 2>&1; then
    sed -i "s|^JWT_KEY=.*|JWT_KEY=$(openssl rand -base64 48)|" .env
  fi
fi

echo "==> Installing frontend dependencies"
(cd frontend && npm install)

echo "==> Restoring backend packages"
(cd backend && dotnet restore Strata.sln)

echo
echo "==> Dev environment ready. Postgres is already running as the 'db' compose service."
echo "   cd backend  && dotnet run   # API on :8080 (auto-applies EF migrations in Development)"
echo "   cd frontend && npm run dev  # Vite on :5173, proxies /api -> :8080"
echo "   psql: Host=localhost Port=5432 Db=strata User=strata Pass=strata-dev-password"
