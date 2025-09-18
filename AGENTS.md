# Repository Guidelines

## Project Structure & Module Organization
- `backend/` FastAPI service (`app.py`), SQLAlchemy models, pytest fixtures, and bootstrap SQL in `init.sql`.
- `chrome-extension/` Vite + Vue MV3 app; feature code in `src/`, build helpers in `scripts/`, and Vitest suites in `tests/unit/`.
- `electron-app/` desktop shell with entrypoints (`main.js`, `preload.js`, `native-host.js`) and renderer UI in `renderer/`.
- Root Compose files wire the API and Postgres; `documents/` holds supportive architecture notes.

## Build, Test, and Development Commands
- Stack via Docker: `docker compose up -d`; `docker compose down -v` resets the database volume.
- Backend locally: `cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`, then `uvicorn app:app --reload`.
- Electron: `cd electron-app && npm install && BACKEND_URL=http://localhost:8000 npm start`; package installers with `npm run build`.
- Extension: `cd chrome-extension && npm install && npm run dev`; create the upload artifact with `npm run zip`.

## Coding Style & Naming Conventions
- Python adheres to PEP 8, four-space indentation, and explicit typing; mirror the response patterns used in `backend/app.py` when adding endpoints.
- TypeScript/Vue favors PascalCase components, camelCase helpers, and keeping Chrome API calls in dedicated modules to contain MV3 permissions.
- Run `npm run lint` and `npm run format:check` in `chrome-extension/` before committing front-end changes; keep Electron main-process files in CommonJS style.

## Testing Guidelines
- Backend: `cd backend && pytest` uses the repo’s `pytest.ini` defaults (`-ra`, asyncio mode); mock Postgres unless the Compose stack is running.
- Extension: `npm run test` for headless checks, `npm run test:ui` for interactive debugging; name new suites `*.spec.ts` beside the feature under test.
- Electron currently relies on manual smoke-testing—note scenarios exercised (clip list, native-host handshake) in PR descriptions until automated coverage exists.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat(extension): …`, `docs: …`) as seen in history; keep each commit focused on one functional change.
- PRs summarize intent, link issues, and list the test or lint commands executed; attach screenshots or GIFs for UI-facing updates.
- Call out config or migration steps (e.g., rerunning `npm run install-native-host`) so reviewers can reproduce behavior locally.

## Security & Configuration Notes
- Never commit populated `.env`; extend `.env.example` when introducing settings and document defaults in the PR.
- `BACKEND_URL` defaults to `http://localhost:8000`; flag deviations and remind teammates to rerun the native-host installer after Chrome ID changes.
