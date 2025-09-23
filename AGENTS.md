# Repository Guidelines

## Project Structure & Module Organization
- `backend/` hosts the FastAPI service; routers live in `app/api`, models in `app/models`, shared logic in `app/services`, and tests in `backend/tests`.
- `electron-app/` contains the Electron shell (`main.js`, `preload.js`) plus Vue renderer views in `renderer/` and shared utilities in `shared/`; Vitest specs sit in `tests/`.
- `chrome-extension/` is the MV3 extension with feature modules under `src/background`, `src/popup`, and `src/options`; matching Vitest suites are in `tests/`.
- `documents/` stores planning notes, while Compose files orchestrate the dev (`docker-compose.yml`) and production (`docker-compose.prod.yml`) stacks.

## Build, Test & Development Commands
- Docker stack: `docker compose up -d` boots the API + Postgres; use `docker compose down` to stop.
- Backend (local): `cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000`.
- Electron app: `cd electron-app && npm install && npm run dev` for live reload; `npm run build` packages with electron-builder.
- Chrome extension: `cd chrome-extension && npm install && npm run dev` emits `dist/` for load-unpacked; `npm run mock:backend` spins a local stub.

## Coding Style & Naming Conventions
- Python follows PEP 8 with 4-space indents, snake_case modules, and typed Pydantic schemas; favor dependency-injected services over singletons.
- TypeScript/Vue uses 2-space indents, camelCase functions, PascalCase components (e.g., `ClipList.vue`), and keeps renderer imports browser-safe.
- Run `npm run lint` and `npm run format` in `chrome-extension/`; align Electron renderer code with the same Prettier defaults.

## Testing Guidelines
- Backend: Pytest with asyncio (`backend/tests`); name files `test_<feature>.py`.
- Frontend/Desktop: Vitest drives both packages; colocate `*.spec.ts` near components and add integration flows under `electron-app/tests/integration`.
- Required commands before every PR: `cd backend && pytest`, `cd chrome-extension && npm run tests`, `cd electron-app && npm run tests`.

## Commit & Pull Request Guidelines
- Use Conventional Commits (`feat(electron): …`, `fix(extension): …`) mirroring current history; keep scopes per subsystem.
- PRs should link issues, outline API/UI impact, enumerate test commands, and attach screenshots or recordings for user-visible changes.
- Call out environment or native-messaging adjustments and update `.env.example` or docs when behavior shifts.

## Security & Configuration Tips
- Do not commit secrets; derive from `.env.example` and rotate `POSTGRES_PASSWORD` before sharing builds.
- After native messaging edits run `cd electron-app && npm run install-native-host` (add `--browser chrome-flatpak` when targeting Flatpak Chrome) and record overrides in the PR.

- Don't run `npm run tests:watch` in CLI mode or during CI because it is a watcher and will error out.
