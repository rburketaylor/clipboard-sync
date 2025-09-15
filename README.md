# Clipboard Sync

A cross-platform clipboard synchronization system that enables users to capture text selections and URLs from Chrome browser and synchronize them across a desktop application.

## Architecture

The system consists of four main components:

- **Chrome Extension** (Vue.js): Captures text selections and URLs from web pages
- **Electron Desktop App** (Vue.js + Node.js): Displays clipboard history and manages data flow
- **Python Backend API** (FastAPI): Handles business logic and data validation
- **PostgreSQL Database**: Provides persistent storage for clipboard entries

## Project Structure

```
clipboard-sync/
├── chrome-extension/     # Chrome extension with Vue.js
├── electron-app/         # Electron desktop application
├── backend/              # Python FastAPI backend
├── docker-compose.yml    # Docker orchestration
└── README.md            # This file
```

## Development Setup

### Prerequisites

- Node.js (v18 or higher)
- Python 3.11+
- Docker and Docker Compose
- Chrome browser for extension development

### Backend Setup

1. Set up the Python virtual environment using pyenv:
   ```bash
   pyenv activate clipboardsync-env
   ```

2. Navigate to the backend directory:
   ```bash
   cd backend
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**:
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env and set secure passwords
   # IMPORTANT: Change the default passwords before running in production!
   ```

5. Start the backend and database with Docker:
   ```bash
   docker-compose up
   ```

The backend API will be available at `http://localhost:8000`

**Note**: Always use the `clipboardsync-env` pyenv environment when working with Python components of this project.

### Electron App Setup

1. Navigate to the electron-app directory:
   ```bash
   cd electron-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Chrome Extension Setup

1. Navigate to the chrome-extension directory:
   ```bash
   cd chrome-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `chrome-extension/dist` folder

## API Endpoints

- `POST /clip` - Create a new clipboard entry
- `GET /clips` - Retrieve recent clipboard entries
- `GET /health` - Health check endpoint

## Testing

Each component includes its own test suite:

```bash
# Backend tests (use pyenv environment)
pyenv activate clipboardsync-env
cd backend && python -m pytest

# Electron app tests
cd electron-app && npm test

# Chrome extension tests
cd chrome-extension && npm test
```

## Creating GitHub Issues (Chrome Extension Plan)

This repo includes a helper to create all tracked issues for the Chrome Extension plan in one go.

- Script: `scripts/create_gh_issues.sh`
- Source of truth: `issues/extension_issues.json`

Prerequisites
- `jq`, `curl`, and `git` installed
- A GitHub token with permission to create issues in this repo
  - Classic: `repo` scope
  - Fine‑grained: Issues: Read/Write for this repository

Usage
```bash
# 1) Provide a token (do not commit tokens)
export GITHUB_TOKEN=ghp_your_token_here

# 2) Optional: override target repo if your local git remote differs
export REPO=rburketaylor/clipboard-sync

# 3) Preview (no changes to GitHub)
DRY_RUN=true ./scripts/create_gh_issues.sh

# 4) Create labels and issues
./scripts/create_gh_issues.sh
```

Notes
- The script is idempotent for labels but does not deduplicate already‑created issues. Use `DRY_RUN=true` first.
- It auto‑detects `owner/repo` from `origin` if `REPO` is not set.
- It creates labels: `area:extension`, `type:task`, `priority:normal`, and `M1`–`M6`.

Quick Verify
```bash
curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/repos/${REPO:-$(git config --get remote.origin.url | sed -n 's#.*github.com[:/]\(.*\)\.git#\1#p')}/issues?labels=area:extension" \
  | jq '.[].title'
```

## Docker Services

The application uses Docker Compose to orchestrate the backend services:

- **backend**: FastAPI application (port 8000)
- **db**: PostgreSQL database (port 5432)

## Security Configuration

### Environment Variables

The application uses environment variables for sensitive configuration. Key security practices:

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use `.env.example`** - Template showing required variables without sensitive values
3. **Change default passwords** - Always use strong, unique passwords in production
4. **Database credentials** - Stored in environment variables, not hardcoded

### Production Deployment

For production environments:

1. Use strong, randomly generated passwords
2. Consider using Docker secrets or external secret management
3. Enable SSL/TLS for database connections
4. Restrict database access to application containers only
5. Regular security updates for all dependencies

### Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_DB` | Database name | `clipboarddb` |
| `POSTGRES_USER` | Database user | `clipboarduser` |
| `POSTGRES_PASSWORD` | Database password | `clipboardpass_change_me_in_production` |
| `DATABASE_URL` | Full database connection string | Auto-generated from above |
| `TEST_DATABASE_URL` | Test database connection string | Auto-generated for testing |

## License

MIT
