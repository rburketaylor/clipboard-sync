# 📄 Design Document: Clipboard Sync Project

## 1. Overview
The **Clipboard Sync** project is a lightweight system that connects a **Chrome Extension** with a **desktop application (Electron)** and a **backend service (Python + PostgreSQL)**. The goal is to demonstrate cross-stack integration while keeping implementation scope small enough for a rapid prototype.  

Use case: A user highlights text or grabs the current URL in Chrome, sends it to the Electron app, which stores it in a PostgreSQL database via a Python backend. The Electron UI then displays the last few clipboard entries.  

---

## 2. Objectives
- Demonstrate familiarity with **Vue.js, Electron, Python, PostgreSQL, and Docker**.  
- Implement **Chrome Extension APIs** for communication.  
- Containerize services for portability.  
- Provide minimal but real **tests** (Pytest).  
- Show awareness of **CI/CD practices** with a stub workflow.  

---

## 3. High-Level Architecture

[Chrome Extension] ---> [Electron App] ---> [Python Backend] ---> [PostgreSQL]
| | |
| Browser APIs | REST API (HTTP) | Data Storage
| (Content Script) | Axios/Fetch | Containerized


---

## 4. Components

### 4.1 Chrome Extension
- **Tech:** Vue 3, Vite (or Webpack), Chrome Extension Manifest v3.  
- **Responsibilities:**
  - Popup UI with Vue.
  - Content script to capture selected text or active tab URL.
  - Button triggers sending data to Electron via WebSocket or native messaging.
- **Deliverables:**
  - `manifest.json`
  - `popup.vue` (UI)
  - `background.js` (message passing)

---

### 4.2 Electron App
- **Tech:** Electron, Node.js, Vue.  
- **Responsibilities:**
  - Receive messages from Chrome extension.
  - Forward data to Python backend API.
  - Display last 5 clipboard entries in a small window UI.
- **Deliverables:**
  - `main.js` (Electron bootstrap)
  - `renderer/` (Vue frontend)
  - API client integration

---

### 4.3 Python Backend
- **Tech:** FastAPI (preferred) or Flask.  
- **Responsibilities:**
  - REST API endpoints:
    - `POST /clip` → store text/URL in Postgres.
    - `GET /clips` → return latest entries (limit 10).
  - Input validation (Pydantic models).
  - Unit tests with Pytest.
- **Deliverables:**
  - `app.py` (main FastAPI app)
  - `models.py` (SQLAlchemy/Postgres schema)
  - `tests/test_api.py`

---

### 4.4 PostgreSQL
- **Tech:** PostgreSQL in Docker container.  
- **Responsibilities:**
  - Table: `clips(id SERIAL, content TEXT, created_at TIMESTAMP DEFAULT now())`.
  - Store all clipboard entries sent from backend.
- **Deliverables:**
  - Dockerized instance (via docker-compose)
  - Migration or init script to set up schema.

---

### 4.5 Infrastructure
- **Docker Compose:**
  - `backend` (Python + FastAPI)
  - `db` (Postgres)
- **Local Development Workflow:**
  - Run backend + DB with Docker Compose.
  - Run Electron + extension separately on host.  

---

### 4.6 Testing & CI/CD
- **Testing:**
  - Pytest for backend routes.
  - Optional: basic Vue unit test in extension.  
- **CI/CD (lightweight demo):**
  - GitHub Actions or Azure DevOps pipeline YAML.
  - Steps:
    - Run `pytest`.
    - Build Docker image for backend.  

---

## 5. File Structure

clipboard-sync/
├── chrome-extension/
│ ├── manifest.json
│ ├── src/
│ │ ├── popup.vue
│ │ ├── background.js
│ │ └── content.js
│ └── vite.config.js
├── electron-app/
│ ├── main.js
│ ├── renderer/
│ │ ├── App.vue
│ │ └── components/
│ └── package.json
├── backend/
│ ├── app.py
│ ├── models.py
│ ├── requirements.txt
│ ├── tests/
│ │ └── test_api.py
├── docker-compose.yml
├── README.md
└── .github/workflows/ci.yml # (optional CI pipeline)


---

## 6. Data Flow
1. User selects text in Chrome → clicks **“Send”** in extension popup.  
2. Extension sends message to Electron app.  
3. Electron app calls `POST /clip` on backend.  
4. Backend inserts entry into PostgreSQL.  
5. Electron app calls `GET /clips` and renders last 5 entries.  

---

## 7. Security Considerations
- Validate all input in backend.  
- No sensitive data handling (demo project).  
- Restrict DB access via Docker network.  

---

## 8. Future Extensions
- Add authentication layer (JWT/OAuth).  
- Add Golang microservice for high-perf ingestion.  
- Deploy backend + DB to Azure.  
- Add UI automation with Playwright or Ginkgo. 