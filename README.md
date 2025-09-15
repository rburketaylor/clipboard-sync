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

4. Start the backend and database with Docker:
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

## Docker Services

The application uses Docker Compose to orchestrate the backend services:

- **backend**: FastAPI application (port 8000)
- **db**: PostgreSQL database (port 5432)

## License

MIT