# Implementation Plan

- [x] 1. Set up project structure and development environment
  - Create directory structure for chrome-extension/, electron-app/, and backend/ components
  - Initialize package.json files for Node.js components with required dependencies
  - Create Docker Compose configuration for backend and PostgreSQL services
  - Set up .gitignore and basic project documentation
  - _Requirements: 5.1, 5.2_

- [ ] 2. Implement PostgreSQL database schema and connection
  - Create database initialization script with clips table schema
  - Implement SQLAlchemy database models with proper constraints and indexes
  - Create database connection management and session handling code
  - Write unit tests for database model validation and constraints
  - _Requirements: 4.1, 4.2, 4.3, 6.3_

- [ ] 3. Build Python backend API foundation
  - Create FastAPI application with basic configuration and middleware
  - Implement Pydantic schemas for request/response validation
  - Set up database connection integration with FastAPI
  - Create health check endpoint for service monitoring
  - Write unit tests for application startup and basic configuration
  - _Requirements: 4.1, 4.2, 6.1, 6.2_

- [ ] 4. Implement clipboard API endpoints
- [ ] 4.1 Create POST /clip endpoint for storing clipboard data
  - Implement endpoint handler with Pydantic validation
  - Add database insertion logic with error handling
  - Create comprehensive input validation for content, type, and title fields
  - Write unit tests for successful creation and validation error scenarios
  - _Requirements: 4.1, 4.2, 6.1, 6.2_

- [ ] 4.2 Create GET /clips endpoint for retrieving clipboard history
  - Implement endpoint handler with pagination support
  - Add database query logic with proper ordering and limits
  - Create response serialization with Pydantic models
  - Write unit tests for data retrieval and pagination functionality
  - _Requirements: 4.3, 7.2_

- [ ] 5. Implement comprehensive backend error handling and logging
  - Create custom exception handlers for validation and database errors
  - Implement structured logging throughout the application
  - Add HTTP status code handling for different error scenarios
  - Write unit tests for error handling and logging functionality
  - _Requirements: 6.1, 6.2, 7.3_

- [ ] 6. Create Electron desktop application foundation
  - Initialize Electron project with main process and renderer setup
  - Configure Vue.js integration for the renderer process
  - Implement basic window management and application lifecycle
  - Create IPC communication setup between main and renderer processes
  - Write basic tests for Electron application startup
  - _Requirements: 3.1, 3.2, 7.1_

- [ ] 7. Build Electron UI components and clipboard display
- [ ] 7.1 Create main application Vue component with clipboard list
  - Implement ClipboardList component to display recent entries
  - Add proper styling and layout for clipboard history display
  - Create timestamp formatting and content type indicators
  - Write unit tests for Vue component rendering and data display
  - _Requirements: 3.2, 3.3, 3.4_

- [ ] 7.2 Implement HTTP client for backend API communication
  - Create API client module with Axios for HTTP requests
  - Implement methods for POST /clip and GET /clips endpoints
  - Add error handling and retry logic for network failures
  - Write unit tests for API client functionality with mocked responses
  - _Requirements: 3.1, 7.2, 7.4_

- [ ] 8. Integrate Electron app with backend API
  - Connect clipboard data reception to backend API calls
  - Implement automatic refresh of clipboard list after new entries
  - Add connection status indicators and error message display
  - Create proper error handling for API communication failures
  - Write integration tests for complete data flow from reception to display
  - _Requirements: 3.1, 3.3, 7.2, 7.4_

- [ ] 9. Create Chrome extension foundation and manifest
  - Create manifest.json with proper permissions and configuration
  - Set up Vue.js build configuration with Vite for extension development
  - Implement basic extension popup structure and styling
  - Create background service worker for message handling
  - Write basic tests for extension loading and popup functionality
  - _Requirements: 1.1, 1.4, 2.1, 7.1_

- [ ] 10. Implement Chrome extension content detection and UI
- [ ] 10.1 Create content script for text selection detection
  - Implement content script to detect and capture selected text
  - Add event listeners for text selection changes
  - Create message passing to background script with selected content
  - Write unit tests for text selection detection and message passing
  - _Requirements: 1.1, 1.2, 1.4_

- [ ] 10.2 Build extension popup UI with Vue components
  - Create popup Vue component with text display and send button
  - Implement URL detection and display for current active tab
  - Add user interaction handlers for send actions
  - Create proper styling and responsive design for popup interface
  - Write unit tests for popup component interactions and state management
  - _Requirements: 1.2, 1.3, 2.1, 2.2_

- [ ] 11. Implement Chrome extension to Electron communication
  - Set up native messaging or WebSocket communication protocol
  - Implement message sending from extension to Electron app
  - Create proper message formatting with clipboard data structure
  - Add error handling for communication failures
  - Write integration tests for cross-application message passing
  - _Requirements: 1.3, 2.2, 7.1_

- [ ] 12. Create comprehensive test suite and CI setup
- [ ] 12.1 Implement backend API integration tests
  - Create test database setup and teardown procedures
  - Write integration tests for complete API workflows
  - Add performance tests for database operations
  - Create test fixtures and data factories for consistent testing
  - _Requirements: 5.3_

- [ ] 12.2 Set up Docker containerization and orchestration
  - Create Dockerfile for Python backend with proper dependencies
  - Configure Docker Compose with backend and PostgreSQL services
  - Add environment variable configuration for different deployment stages
  - Create container health checks and proper networking setup
  - Write deployment verification tests for containerized services
  - _Requirements: 5.1, 5.2, 6.4_

- [ ] 13. Implement end-to-end system integration and testing
  - Create end-to-end test scenarios covering complete user workflows
  - Test Chrome extension text selection through to Electron display
  - Verify URL capture and storage functionality across all components
  - Add system performance and reliability testing
  - Create user acceptance test scenarios based on requirements
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3_

---

## Chrome Extension (MV3) — Tracked Tasks

The following tasks implement the Chrome Extension described in `design-doc.md` §4.1 and `.kiro/specs/clipboard-sync/requirements.md`.

### M1 — Setup and Scaffolding
- [ ] 1.1 Initialize Vite + Vue 3 + TypeScript in `chrome-extension/`
  - Add `@crxjs/vite-plugin` (or equivalent) for MV3 bundling
  - Configure `vite.config.ts` for popup/options pages and background worker
- [ ] 1.2 Create directory layout
  - `public/manifest.json`, `public/icons/{16,32,48,128}.png`
  - `src/{background,content,popup,options,shared}` with placeholder files
- [ ] 1.3 Tooling and quality
  - Add `eslint`, `prettier`, and project configs
  - Add test runner (`vitest` preferred) and `@vue/test-utils`, `sinon-chrome`
- [ ] 1.4 NPM scripts in `chrome-extension/package.json`
  - `dev`, `build`, `test`, `e2e`, `zip`
- [ ] 1.5 Update top-level `README.md` with dev workflow for the extension
  - _Requirements: 5.3 (tests), 7.1 (communication)_

### M2 — Capture and Popup UX
- [ ] 2.1 On-demand selection capture via `chrome.scripting.executeScript`
  - Implement `src/content/selection.ts` using `window.getSelection()`
- [ ] 2.2 Capture tab meta (URL/title)
  - Implement `src/content/tabMeta.ts`
- [ ] 2.3 Popup UI (Vue)
  - `src/popup/{index.html,main.ts,Popup.vue}`
  - Display current selection and active tab URL/title
  - Buttons: “Send Text”, “Send URL”
- [ ] 2.4 Wire popup→background messaging (`chrome.runtime.sendMessage`)
- [ ] 2.5 Unit tests for selection capture and popup interactions
  - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.2_

### M3 — Background Router and Transports
- [ ] 3.1 Background service worker `src/background/index.ts`
  - Route: `popupOpened`, `sendClip`
  - Execute selection/tabMeta scripts on active tab
- [ ] 3.2 Runtime config in `chrome.storage.local`
  - Keys: `{ mode: 'native'|'ws'|'http', wsUrl, backendBaseUrl, debug }`
- [ ] 3.3 Transports
  - `src/background/transports/native.ts`: `chrome.runtime.connectNative('com.clipboardsync.host')`, retry/timeout
  - `src/background/transports/ws.ts`: reconnectable WS client (configurable URL)
  - `src/background/transports/http.ts`: POST `{backendBaseUrl}/clip` (+ optional GET `/clips?limit=5`)
- [ ] 3.4 Options page for settings
  - `src/options/{index.html,main.ts,Options.vue}` with “Test Connection”
- [ ] 3.5 Integration tests for routing and transports (mocks)
  - _Requirements: 2.3, 3.1, 7.1, 7.2, 7.4_

### M4 — Validation, Limits, and Error UX
- [ ] 4.1 Validation helpers `src/shared/validators.ts`
  - Enforce content ≤ 10KB; title ≤ 500 chars; type ∈ {text,url}; URL validation
- [ ] 4.2 Error and state handling
  - Timeouts, retries with backoff; user-facing messages/toasts in popup
- [ ] 4.3 Accessibility and polish
  - Keyboard navigation, ARIA roles, reduced motion
- [ ] 4.4 Unit tests for validators and error flows
  - _Requirements: 6.1, 6.2, 7.3_

### M5 — Testing and CI
- [ ] 5.1 Unit + integration coverage ≥ 85%
- [ ] 5.2 E2E tests with Playwright/Puppeteer + `web-ext`
  - Load built extension; simulate selection→send flow with mock WS/native
- [ ] 5.3 CI job
  - `npm ci && npm run test && npm run build` in `chrome-extension/`
  - Upload `dist/` as artifact
  - _Requirements: 5.3_

### M6 — Packaging and Release Prep
- [ ] 6.1 Production build optimizations (tree-shake, minify, sourcemaps)
- [ ] 6.2 CSP `connect-src` for backend/WS (`localhost` in dev)
- [ ] 6.3 Icons and assets complete; store-ready `zip` artifact
- [ ] 6.4 Privacy policy stub (no tracking; local communication only)
  - _Requirements: 5.1, 5.2, 6.4_

### Dependencies & Integration
- Backend: `/clip`, `/clips`, `/health` endpoints ready; CORS allow `http://localhost` for fallback HTTP
- Electron: native host `com.clipboardsync.host` registration + optional WS bridge at `ws://127.0.0.1:17373`

### Success Criteria
- 100% of extension-related acceptance criteria in `.kiro/specs/clipboard-sync/requirements.md` pass
- Popup render < 100ms; round‑trip send < 500ms on localhost
- < 1% send failures in dev with automatic reconnect ≤ 3s
- Minimal permissions: `storage`, `scripting`, optional host permissions for HTTP fallback
