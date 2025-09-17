🚀 M1 – Foundation & Tooling

Goal: Get a working Chrome extension scaffold with modern tooling.

Setup: Scaffold project with Vite + Vue 3 + TypeScript, and configure MV3 bundling.

Structure: Add manifest.json, icons, and basic folder layout (background, popup, content, options, shared).

Tooling: Configure ESLint, Prettier, Vitest/Jest, sinon-chrome.

Automation: Add npm scripts for dev, build, test, e2e, and packaging (zip).

Docs: Update README with build/run instructions.

✅ Deliverable: A fully bootstrapped extension project that builds and runs in Chrome with a clear developer workflow.



📄 M2 – Core Capture & Popup

Goal: Enable basic data capture and display in the popup.

Selection Capture: Grab highlighted text from the page.

Tab Metadata: Collect current tab URL and title.

Popup UI: Vue-based popup displaying captured text/URL with send actions.

Messaging: Wire popup to background worker with runtime messages.

Tests: Add unit tests for selection capture and popup logic.

✅ Deliverable: Popup that shows selection/URL and can send them to the background.



🔄 M3 – Background & Transport Layer

Goal: Create robust data routing and multiple transport options.

Background Router: Service worker manages popup events and executes content scripts.

Config Storage: Persist mode/endpoints in chrome.storage.

Transports:

Native messaging client (with retries/failover).

Reconnectable WebSocket client with backoff.

HTTP fallback to FastAPI backend.

Options Page: UI for configuring transports and testing connections.

Integration Tests: Verify end-to-end routing and error handling with mocks.

✅ Deliverable: Extension can send data to backend using native, WebSocket, or HTTP, configurable via options.



🎨 M4 – Validation & UX Polish

Goal: Ensure reliability, accessibility, and good user experience.

Validation: Size/type/URL format checks with clear error messages.

Error Handling: Toasts and feedback for timeouts, retries, and permission issues.

Accessibility: ARIA roles, keyboard navigation, reduced motion; pass Axe audit.

Tests: Cover validators and error flows.

✅ Deliverable: Stable, user-friendly popup with robust validation and accessibility.



🧪 M5 – Testing & CI Pipeline

Goal: Guarantee quality through high coverage and CI automation.

Coverage: Expand tests to achieve ≥85% unit/integration coverage.

E2E Tests: Playwright/Puppeteer + web-ext simulate selection→send flow.

CI Job: Run build, tests, and artifact upload in CI.

✅ Deliverable: Extension with automated tests and CI ensuring quality on every PR.



📦 M6 – Production & Release Readiness

Goal: Finalize for Chrome Web Store submission.

Build Optimization: Tree-shaking, minification, sourcemaps.

CSP: Configure connect-src for dev/prod endpoints.

Assets: Final icons and packaged ZIP passing Web Store checks.

Privacy Policy: Stub (no tracking, local-only, user-configurable endpoints).

✅ Deliverable: Store-ready extension package with documentation and compliance.