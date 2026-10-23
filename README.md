# Strata

A self-hosted notes app: take notes, store them persistently, see them all,
filter and search. Dark UI with a sidebar tag cloud and a master–detail split,
modeled on the provided `screenshot.png` reference.

- **Backend:** .NET 10 minimal API — auth (register/login/profile), notes CRUD,
  tags with counts, full-text search. EF Core + PostgreSQL. JWT delivered as an
  httpOnly cookie.
- **Frontend:** React + Vite + Tailwind CSS v4 + shadcn/ui + TanStack Query +
  React Router. Markdown notes with live preview.
- **Infra:** dev container (VS Code Dev Containers), Docker images for backend
  and frontend, docker-compose for both dev and deployment.

## Quick start (dev container — recommended)

Prerequisites: Docker and VS Code with the **Dev Containers** extension.

```bash
# 1. Build the dev container image (once, and after Dockerfile changes)
bash .devcontainer/build-tools-image.sh

# 2. In VS Code: F1 -> "Dev Containers: Reopen in Container"
```

On container start, `postCreateCommand` restores NuGet and npm packages. Then:

```bash
cd backend && dotnet run     # API on http://localhost:8080 (auto-applies EF migrations)
cd frontend && npm run dev   # Vite on http://localhost:5173 (proxies /api -> :8080)
```

Open http://localhost:5173, create an account, start taking notes.

> **Why the unusual devcontainer layout?** With Dev Containers CLI 0.89.0 +
> Docker Compose v5 + Buildx ≥ 0.37.2, a compose service with a `build:`
> section (or any `features`) makes the CLI inject a generated Dockerfile from
> `/tmp`, which bake rejects with *"additional privileges requested:
> --allow=fs.read=…"* ([devcontainers/cli#1320](https://github.com/devcontainers/cli/issues/1320)).
> The dev service is therefore image-only and features are avoided; the image
> is built with plain `docker build` via the script above.

## Full stack with Docker (no dev container)

```bash
cp .env.example .env          # then edit secrets (JWT_KEY!)
docker compose up -d --build  # db + backend + frontend
# app: http://localhost:3000  (nginx serves the SPA and proxies /api)
```

## API overview

| Method | Path                | Description                              |
| ------ | ------------------- | ---------------------------------------- |
| POST   | `/api/auth/register`| Create account, sets auth cookie         |
| POST   | `/api/auth/login`   | Sign in, sets auth cookie                |
| POST   | `/api/auth/logout`  | Clear cookie                             |
| GET    | `/api/auth/me`      | Current user                             |
| GET    | `/api/notes`        | List/search/filter (`q`, `tag`, `sort`)  |
| POST   | `/api/notes`        | Create note (title, content, tags)       |
| GET    | `/api/notes/{id}`   | Get one note                             |
| PUT    | `/api/notes/{id}`   | Update note (tags replaced)              |
| DELETE | `/api/notes/{id}`   | Delete note (soft)                       |
| GET    | `/api/tags`         | Tag cloud with per-tag note counts       |
| GET    | `/api/health`       | Liveness                                 |

Auth: JWT in an httpOnly `strata_auth` cookie (SameSite=Lax). The frontend
always talks to the API same-origin (Vite proxy in dev, nginx in Docker), so
no CORS is needed in the browser path.

## Project layout

```
.devcontainer/        dev container config + image build script
backend/              .NET 10 API (Dockerfile, Strata.sln, src/Strata.Api)
  src/Strata.Api/     Program.cs, Endpoints/, Data/ (EF Core), Services/
frontend/             React app (Dockerfile, nginx.conf, src/)
  src/components/ui/  shadcn primitives
  src/pages/          Login / Register / Notes
docker-compose.yml    deployment stack (db + backend + frontend)
.env.example          copy to .env for the deployment stack
```

## Notes on behavior

- Notes are Markdown; the list shows a plain-text excerpt and relative times.
- Tags are per-user, created on demand, shown in the sidebar with counts.
- Search matches title and content (case-insensitive `ILIKE`).
- Notes are soft-deleted (`deleted_at`), so accidental deletes never lose data.
- EF migrations are applied automatically in Development; run
  `dotnet ef database update` (via `dotnet dotnet-ef`) for other environments.
