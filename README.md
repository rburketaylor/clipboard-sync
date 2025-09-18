# Clipboard Sync

Clipboard Sync is a small cross‑stack system that lets you capture text selections or page URLs in Chrome and sync them to a desktop app backed by a FastAPI service and PostgreSQL. It’s designed to be simple, local‑first, and easy to run with Docker.

## Architecture

Four components work together:

- **Chrome Extension** (Vite + Vue 3, MV3): Captures selected text and active tab URL/title and sends them to the backend through Native Messaging.
- **Electron Desktop App** (Electron 38): Shows recent clips and lets you create new ones; talks to the backend via `BACKEND_URL`.
- **Python Backend API** (FastAPI): Validates and persists clips; provides `/health`, `/clip`, and `/clips` endpoints.
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
   # IMPORTANT: set a strong POSTGRES_PASSWORD and update DATABASE_URL accordingly
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
- From `electron-app/`, run `npm run install-native-host -- --extension-id <your-extension-id>`. You can pass multiple IDs or rely on `EXTENSION_ID` env when packaging.
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

## Docker Services

Dev Compose orchestrates:

- **backend**: FastAPI (port 8000). Health‑checked and waits for DB.
- **db**: PostgreSQL (port 5432). Named volume `postgres_data_v2`.

Production overrides (`docker-compose.prod.yml`):
- Removes live bind‑mounts and reload flags
- Doesn’t expose DB port
- Sets `ENVIRONMENT=production` and `LOG_LEVEL=info`

## Electron App

The desktop app shows recent clips and lets you create/copy entries. It talks to the backend at `BACKEND_URL` (defaults to `http://localhost:8000`).

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
| `POSTGRES_DB` | Database name | `clipboarddb` |
| `POSTGRES_USER` | Database user | `clipboarduser` |
| `POSTGRES_PASSWORD` | Database password | `clipboardpass_change_me_in_production` |
| `DATABASE_URL` | Full database connection string | Auto-generated from above |
| `TEST_DATABASE_URL` | Test database connection string | Auto-generated for testing |