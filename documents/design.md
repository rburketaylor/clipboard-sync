# Design Document

## Overview

The Clipboard Sync system is a multi-component application that enables seamless clipboard synchronization between Chrome browser and desktop environment. The system consists of four main components: a Chrome Extension (Vue.js), an Electron desktop application (Vue.js + Node.js), a Python backend API (FastAPI), and a PostgreSQL database. The architecture follows a linear data flow pattern where the Chrome extension captures user selections, the Electron app serves as a bridge and display interface, the Python backend handles business logic and validation, and PostgreSQL provides persistent storage.

## Architecture

The system follows a layered architecture with clear separation of concerns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Chrome         │    │  Electron       │    │  Python         │    │  PostgreSQL     │
│  Extension      │───▶│  Desktop App    │───▶│  Backend API    │───▶│  Database       │
│  (Vue.js)       │    │  (Vue.js +      │    │  (FastAPI)      │    │                 │
│                 │    │   Node.js)      │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Communication Protocols
- **Chrome Extension ↔ Electron**: Native messaging or WebSocket
- **Electron ↔ Backend**: HTTP REST API (Axios/Fetch)
- **Backend ↔ Database**: SQLAlchemy ORM with PostgreSQL driver

### Deployment Architecture
- **Development**: Chrome extension and Electron app run on host machine
- **Backend Services**: Docker Compose orchestrates Python backend and PostgreSQL containers
- **Production**: Backend containerized for cloud deployment, database as managed service

## Components and Interfaces

### Chrome Extension Component

**Technology Stack**: Vue 3, Vite, Chrome Extension Manifest v3

**Core Interfaces**:
```typescript
interface ClipboardData {
  content: string;
  type: 'text' | 'url';
  title?: string;
  timestamp: Date;
}

interface ExtensionMessage {
  action: 'sendClipboard';
  data: ClipboardData;
}
```

**Key Files**:
- `manifest.json`: Extension configuration and permissions
- `popup.vue`: Main UI component for user interaction
- `background.js`: Service worker for message handling
- `content.js`: Content script for text selection detection

**Responsibilities**:
- Detect and capture selected text from web pages
- Extract current page URL and title
- Provide popup UI for user actions
- Send clipboard data to Electron app via native messaging

### Electron Desktop Application

**Technology Stack**: Electron, Node.js, Vue 3

**Core Interfaces**:
```typescript
interface ClipboardEntry {
  id: number;
  content: string;
  type: 'text' | 'url';
  title?: string;
  created_at: Date;
}

interface APIClient {
  postClip(data: ClipboardData): Promise<ClipboardEntry>;
  getClips(): Promise<ClipboardEntry[]>;
}
```

**Key Files**:
- `main.js`: Electron main process and window management
- `renderer/App.vue`: Main application component
- `renderer/components/ClipboardList.vue`: Clipboard history display
- `api-client.js`: HTTP client for backend communication

**Responsibilities**:
- Receive messages from Chrome extension
- Forward clipboard data to Python backend
- Display clipboard history in desktop UI
- Handle application lifecycle and window management

### Python Backend API

**Technology Stack**: FastAPI, SQLAlchemy, Pydantic, PostgreSQL

**Core Interfaces**:
```python
class ClipboardCreate(BaseModel):
    content: str
    type: Literal['text', 'url']
    title: Optional[str] = None

class ClipboardResponse(BaseModel):
    id: int
    content: str
    type: str
    title: Optional[str]
    created_at: datetime

class ClipboardAPI:
    async def create_clip(clip: ClipboardCreate) -> ClipboardResponse
    async def get_clips(limit: int = 10) -> List[ClipboardResponse]
```

**Key Files**:
- `app.py`: FastAPI application and route definitions
- `models.py`: SQLAlchemy database models
- `schemas.py`: Pydantic validation models
- `database.py`: Database connection and session management

**API Endpoints**:
- `POST /clip`: Create new clipboard entry
- `GET /clips`: Retrieve recent clipboard entries
- `GET /health`: Health check endpoint

**Responsibilities**:
- Validate incoming clipboard data
- Store clipboard entries in PostgreSQL
- Retrieve clipboard history with pagination
- Handle errors and provide appropriate HTTP responses

### PostgreSQL Database

**Schema Design**:
```sql
CREATE TABLE clips (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('text', 'url')),
    title VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clips_created_at ON clips(created_at DESC);
```

**Responsibilities**:
- Persist clipboard entries with metadata
- Provide efficient querying with timestamp indexing
- Maintain data integrity with constraints
- Support concurrent access from backend API

## Data Models

### Core Data Model
```python
class Clip(Base):
    __tablename__ = "clips"
    
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    type = Column(String(10), nullable=False)
    title = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
```

### Validation Rules
- **Content**: Required, maximum 10,000 characters
- **Type**: Must be either 'text' or 'url'
- **Title**: Optional, maximum 500 characters
- **URL Validation**: When type is 'url', content must be valid URL format

### Data Flow Transformations
1. **Chrome Extension**: Raw selection → ClipboardData object
2. **Electron App**: ClipboardData → HTTP request payload
3. **Backend API**: Request payload → validated Pydantic model → SQLAlchemy model
4. **Database**: SQLAlchemy model → persisted record
5. **Response Flow**: Database record → Pydantic response model → JSON → Electron UI

## Error Handling

### Chrome Extension Error Handling
- **No Selection**: Display "No text selected" message
- **Communication Failure**: Show "Connection error" with retry option
- **Permission Denied**: Guide user through extension permission setup

### Electron App Error Handling
- **Backend Unavailable**: Display connection status indicator
- **API Errors**: Show user-friendly error messages
- **Network Timeout**: Implement retry mechanism with exponential backoff

### Backend API Error Handling
```python
@app.exception_handler(ValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={"detail": "Invalid input data", "errors": exc.errors()}
    )

@app.exception_handler(DatabaseError)
async def database_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Database operation failed"}
    )
```

### Database Error Handling
- **Connection Failures**: Implement connection pooling and retry logic
- **Constraint Violations**: Return appropriate validation errors
- **Transaction Failures**: Ensure proper rollback and error reporting

## Testing Strategy

### Unit Testing
**Chrome Extension**:
- Mock Chrome APIs for content script testing
- Test popup component interactions
- Validate message passing logic

**Electron App**:
- Mock HTTP client for API testing
- Test Vue component rendering
- Validate IPC communication

**Python Backend**:
```python
# Example test structure
class TestClipboardAPI:
    async def test_create_clip_success(self):
        # Test successful clip creation
        
    async def test_create_clip_validation_error(self):
        # Test input validation
        
    async def test_get_clips_pagination(self):
        # Test clip retrieval with limits
```

### Integration Testing
- **API Integration**: Test complete request/response cycles
- **Database Integration**: Test with real PostgreSQL instance
- **Cross-Component**: Test Chrome extension → Electron → Backend flow

### End-to-End Testing
- **User Workflow**: Simulate complete user journey from text selection to display
- **Error Scenarios**: Test system behavior under various failure conditions
- **Performance**: Validate response times and resource usage

### Testing Infrastructure
- **Docker Test Environment**: Isolated containers for testing
- **CI/CD Pipeline**: Automated testing on code changes
- **Test Data Management**: Fixtures and factories for consistent test data