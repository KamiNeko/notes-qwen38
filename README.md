# Strata

### A quieter place for everything you want to remember.

Ideas arrive in the middle of everything. Strata gives them a home: a
self-hosted notes workspace where you can write in Markdown, find a thought
again with search and tags, and keep your notes on infrastructure you control.

No sprawling workspace to maintain. No guessing where you saved that note.
Just your notes, organized around the way you think.

## Find your flow

- **Write without friction.** Capture a thought in a clean editor, then switch
  to a live Markdown preview when you want to see it take shape.
- **Find it when you need it.** Search note titles and content, filter by tags,
  and sort by recent updates, age, or title.
- **Keep ideas connected.** Add lightweight tags as you write and browse them
  from a sidebar with note counts.
- **Make it yours.** Strata is self-hosted, with a PostgreSQL-backed API and a
  responsive web app. Your deployment runs on infrastructure you manage.
- **Keep your space personal.** Create an account and manage your notes in a
  workspace scoped to you.

## Get started

The quickest path for development is the VS Code Dev Container. You’ll need
Docker, VS Code, and the **Dev Containers** extension.

```bash
# Build the development image once (and again after Dockerfile changes)
bash .devcontainer/build-tools-image.sh
```

In VS Code, run **Dev Containers: Reopen in Container** from the Command
Palette. The container restores the NuGet and npm packages on creation. Then
start the API and web app in separate terminals:

```bash
cd backend && dotnet run
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173), create an account, and
write your first note.

### Run the full stack with Docker

For a deployment-style setup without the dev container, you’ll need Docker
Compose:

```bash
cp .env.example .env
# Edit .env and set a strong JWT_KEY before starting the app.
docker compose up -d --build
```

Visit [http://localhost:3000](http://localhost:3000). Docker Compose starts the
web app, API, and PostgreSQL database together.

## What’s inside

Strata is built to stay simple to run and familiar to work on:

| Layer | Technology |
| --- | --- |
| Web app | React, Vite, Tailwind CSS, shadcn/ui |
| API | .NET 10 minimal API |
| Data | PostgreSQL and Entity Framework Core |
| Sign-in | JWT in an httpOnly cookie |
| Local development | VS Code Dev Containers and Docker Compose |

The API supports account registration and login, note creation and editing,
tag management, search, sorting, and health checks. The browser talks to the
API on the same origin: Vite proxies requests during development, and nginx
does so in the Docker deployment.

## Make it your own

Strata is designed for people who want a focused place for notes and the
freedom to run it themselves. Start it locally, explore the code, and shape it
around your workflow.

## Project layout

```text
.devcontainer/        dev container config and image build script
backend/              .NET API, data model, and migrations
frontend/             React app and nginx configuration
docker-compose.yml    deployment stack
.env.example          environment template for Docker Compose
```
