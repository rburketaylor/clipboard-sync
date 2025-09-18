# Clipboard Sync

Clipboard Sync is a small cross‑stack system that lets you capture text selections or page URLs in Chrome and sync them to a desktop app backed by a FastAPI service and PostgreSQL. It’s designed to be simple, local‑first, and easy to run with Docker.

## Architecture

Four components work together:

- **Chrome Extension** (Vite + Vue 3, MV3): Captures selected text and active tab URL/title and sends them to the backend through Native Messaging.
- **Electron Desktop App** (Electron 38): Shows recent clips and lets you create, copy, and delete entries; talks to the backend via `BACKEND_URL`.
- **Python Backend API** (FastAPI): Validates and persists clips; provides `/health`, `/clip`, `/clips`, and `DELETE /clip/{id}` endpoints.
- **PostgreSQL**: Storage for clipboard entries.

## Project Structure

```
clipboard-sync/
├── chrome-extension/       # Chrome extension (Vite + Vue 3, MV3)
├── electron-app/           # Electron desktop app
├── backend/                # FastAPI backend + SQLAlchemy models
├── documents/              # Planning, design, requirement, and roadmap documents
├── docker-compose.yml      # Dev Compose (backend + db)
├── docker-compose.prod.yml # Production overrides
└── README.md               # This file
```

## Quick Start

### Prerequisites

- Node.js 24+
- Python 3.12+ (only if running backend locally; Docker recommended)
- Docker + Docker Compose
- Chrome browser (Special cases if run under flatpak on Unix below)

### 1) Backend + DB (Docker)

1. Copy and edit environment variables:
   ```bash
   cp .env.example .env
   # IMPORTANT: set strong credentials (POSTGRES_PASSWORD, TEST_POSTGRES_PASSWORD, etc.)
   ```
2. Start services:
   ```bash
   docker compose up -d
   ```
3. Wait for health checks, then verify:
   ```bash
   curl -s http://localhost:8000/health
   # -> {"status":"ok","database":true}
   ```

The backend runs at `http://localhost:8000`.

To run locally without Docker:
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### 2) Electron App

```bash
cd electron-app
npm install
# Uses BACKEND_URL (defaults to http://localhost:8000)
BACKEND_URL=http://localhost:8000 npm start
# or: npm run dev    # opens DevTools
```

### 3) Chrome Extension

```bash
cd chrome-extension
npm install
npm run dev   # builds to dist/ and watches for changes
```

Load in Chrome:
- Visit `chrome://extensions`
- Enable Developer mode
- Load unpacked → select `chrome-extension/dist`

Native messaging host (optional transport):
- From `electron-app/`, run `npm run install-native-host --extension-id <your-extension-id>`. You can pass multiple IDs or rely on `EXTENSION_ID` env when packaging.
- Use `--browser chrome-flatpak` when the browser is the Flatpak build (`com.google.Chrome`). The script copies `native-host.js`, writes the manifest, and applies `flatpak override --user --talk-name=org.freedesktop.Flatpak com.google.Chrome` so the sandbox can launch Node. If the override step fails (e.g., `flatpak` CLI missing), rerun that command manually and restart Chrome afterwards.
- Non-Flatpak Chrome/Chromium installs do not need the override, but you still must rerun the installer whenever the host script or extension ID changes.

Flatpak Chrome quick reminder:
- Reload the extension and restart the Flatpak after installing the native host so the new permissions take effect.

Configure via Options:
- Transport: HTTP (default). Native and WebSocket modes are present but disabled in the UI for now.
- Backend URL: `http://localhost:8000` (or your target)
- Use “Test Connection” to verify reachability.

## API Endpoints

- `GET /health` → `{ status: "ok", database: true|false }`
- `POST /clip` → create a clip
  - Body: `{ type: "text"|"url", content: string, title?: string }`
  - Constraints: `content` 1..10,000 chars; `title` ≤ 500; when `type=url`, only `http(s)` with a host is accepted.
  - Returns: `{ id, type, content, title, created_at }` (201)
- `GET /clips?limit=10` → latest clips (limit 1..100)
- `DELETE /clip/{id}` → remove a clip (204 on success, 404 if the clip does not exist)

## Docker Services

Dev Compose orchestrates:

- **backend**: FastAPI (port 8000). Health‑checked and waits for DB.
- **db**: PostgreSQL (port 5432). Named volume `postgres_data_v2`.

Production overrides (`docker-compose.prod.yml`):
- Removes live bind‑mounts and reload flags
- Doesn’t expose DB port
- Sets `ENVIRONMENT=production` and `LOG_LEVEL=info`

## Electron App

The desktop app shows recent clips and lets you create/copy/delete entries. It talks to the backend at `BACKEND_URL` (defaults to `http://localhost:8000`) for all operations, including the new DELETE support—no additional environment variables are required.

## Security & Config

### Environment Variables

Use environment variables for sensitive settings:

1. **Don’t commit `.env` files**
2. **Use `.env.example`** as a guide
3. **Change default passwords** before any non‑local use
4. **Database credentials** are provided via env, not hard‑coded

### CORS (dev)

Non‑production runs enable permissive CORS for the extension to talk to the backend during development.

### Production Deployment

For production:
- Use strong, randomly generated passwords
- Consider Docker secrets or external secret management
- Enable TLS for DB connections where applicable
- Restrict DB access to application containers only
- Keep dependencies updated

### Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_HOST` | Database host for app runtime | `db` (Docker) |
| `POSTGRES_PORT` | Database port | `5432` |
| `POSTGRES_DB` | Application database name | `clipboarddb` |
| `POSTGRES_USER` | Application database user | `clipboarduser` |
| `POSTGRES_PASSWORD` | Application database password | `clipboardpass_change_me_in_production` |
| `POSTGRES_ADMIN_DB` | Admin database used for migrations/setup | `postgres` |
| `APP_HOST` | Backend bind host (healthcheck + uvicorn) | `0.0.0.0` |
| `APP_PORT` | Backend port | `8000` |
| `HEALTHCHECK_PATH` | Healthcheck endpoint path | `/health` |
| `TEST_DATABASE_NAME` | Test database name | `clipboard_sync_test` |
| `TEST_POSTGRES_HOST` | Host used by tests | `localhost` |
| `TEST_POSTGRES_PORT` | Port used by tests | `5432` |
| `TEST_POSTGRES_USER` | Database user for tests | `clipboarduser` |
| `TEST_POSTGRES_PASSWORD` | Database password for tests | `clipboardpass_change_me_in_production` |
