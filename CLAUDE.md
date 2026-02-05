# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Office AI is an all-in-one AI-powered office suite designed for self-hosting. It combines chat, calendar, tasks, file management, CRM, and workflows with local LLM capabilities via Ollama.

**Key Principles**: Free/OSS-only stack, self-hosted, AI-native, Docker Compose single-command deployment.

---

## Development Commands

### Docker Services
```bash
make up          # Start all containers
make down        # Stop all containers
make ps          # Show service status
make logs        # Follow logs
make restart     # Restart services
make destroy     # Stop and remove all volumes (deletes data)
```

### Database
```bash
make shell-db    # Connect to PostgreSQL (psql)
```

### Backend
```bash
# Inside backend container or local venv
pytest                    # Run tests
pytest -v tests/test_auth.py  # Run specific test file
alembic upgrade head      # Apply migrations
alembic revision --autogenerate -m "message"  # Create migration
```

### Frontend
```bash
npm run dev      # Start Vite dev server
npm run build    # Production build
npm run preview  # Preview production build
```

---

## Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Magic UI
- **Backend**: Python 3.12 + FastAPI + SQLAlchemy 2.0 (async)
- **Database**: PostgreSQL 16 + pgvector (for RAG/vector search)
- **Cache/Queue**: Redis (Valkey 8)
- **LLM**: Ollama (local) with optional Claude/OpenAI API fallback
- **Reverse Proxy**: Caddy (auto HTTPS)
- **Real-time**: WebSocket (FastAPI native)

### Project Structure
```
backend/
├── app/
│   ├── api/v1/          # REST API endpoints (auth, chat, calendar, tasks, etc.)
│   ├── models/          # SQLAlchemy ORM models
│   ├── schemas/         # Pydantic request/response schemas
│   ├── services/
│   │   └── ai/          # LLM, RAG, embedding, OCR services
│   ├── core/            # Config, security, database
│   └── main.py          # FastAPI app entry point
├── alembic/             # DB migrations
└── tests/               # Backend tests

frontend/
├── src/
│   ├── components/
│   │   ├── ui/          # Magic UI components
│   │   ├── chat/        # Chat-related components
│   │   ├── calendar/    # Calendar components
│   │   └── ...
│   ├── pages/           # Route-level components
│   ├── hooks/           # Custom React hooks
│   ├── stores/          # Zustand state management
│   └── lib/             # Utilities (API client, etc.)
```

### Service Communication
```
Caddy (80/443)
  ├─→ /api/*      → Backend:8000 (FastAPI)
  └─→ /*          → Frontend:5173 (Vite dev server)

Backend services:
  → PostgreSQL (pgvector for embeddings)
  → Redis (cache + job queue)
  → Ollama (local LLM on :11434)
```

---

## Key Design Patterns

### Authentication
- JWT access tokens (30min expire) + refresh tokens
- TOTP (2FA) using PyOTP
- Password hashing with bcrypt (passlib)
- FastAPI dependency injection: `get_current_user()`

### AI Service Architecture
1. **Intent Classification** (local LLM) → route to appropriate handler
2. **RAG Search** (pgvector) → retrieve relevant context
3. **Generation** (local LLM or API fallback) → produce response
4. **Streaming** via SSE for real-time chat responses

### Database Patterns
- Async SQLAlchemy 2.0 with `asyncpg`
- Repository pattern for data access
- Alembic for all schema changes
- pgvector for embeddings (1536 dim for OpenAI-compatible, 768 for local models)

### State Management (Frontend)
- Zustand for global auth/UI state
- TanStack Query (React Query) for server state
- WebSocket for real-time updates (chat, notifications)

---

## Implementation Phases

1. **Phase 1** (Current): Infrastructure + Auth + Basic Chat
2. **Phase 2**: Chat + Files + RAG
3. **Phase 3**: Calendar + Tasks + Search
4. **Phase 4**: CRM + Workflows
5. **Phase 5**: Optimization + Mobile

See `docs/implementation-plan.md` for detailed Step-by-step tasks.

---

## Environment Variables

Copy `.env.example` to `.env` and configure:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection
- `JWT_SECRET_KEY`: Generate strong secret for production
- `OLLAMA_BASE_URL`: http://ollama:11434 (internal) or http://localhost:11434 (local)
- `OLLAMA_MODEL`: Default model (e.g., llama3.2, qwen2.5)

---

## AI/LLM Notes

### Model Selection Priority
1. **Local LLM** (Ollama) - preferred for privacy/cost
2. **API** (Claude/OpenAI) - fallback for complex tasks

### RAG Configuration
- Chunk size: 500 tokens (documents), message-level for chat
- Overlap: 50 tokens
- Embedding: nomic-embed-text or mxbai-embed-large via Ollama
- Vector DB: PostgreSQL + pgvector (no separate Vector DB)

---

## Security Considerations

- All API endpoints protected by JWT except `/api/v1/auth/*`
- TOTP strongly recommended for all users
- Input validation via Pydantic schemas
- SQL injection prevention: SQLAlchemy parameterized queries only
- CORS restricted to frontend origin in production
- AI prompt injection防护: system prompt isolation

---

## Testing Strategy

### Test Types
- **Unit Tests**: Test individual functions/components in isolation
- **Integration Tests**: Test actual communication with external services
- **E2E Tests**: Playwright tests for critical user flows

### Coverage Target: 80%+

### ⚠️ ANTI-PATTERN: Test False Positives

**Problem**: Tests that pass but don't verify actual behavior.

| Anti-Pattern | Example | Why It Fails |
|-------------|---------|--------------|
| **Hardcoded value tests** | `expect(screen.getByText('24'))` | Tests match hardcoded values in component, not dynamic data |
| **Over-mocking** | Mocking `ollama.AsyncClient` at lowest level | Can't detect integration bugs; mock bugs hide real bugs |
| **Superficial assertions** | `expect(mockFn).toHaveBeenCalled()` | Doesn't verify correct parameters or side effects |
| **State unchanged checks** | Only checking localStorage was called | Doesn't verify axios headers actually set |

### Best Practices to Avoid False Positives

#### 1. Test the Contract, Not Implementation Details

**BAD:**
```typescript
// Dashboard.test.tsx - Tests hardcoded values
expect(screen.getByText('24')).toBeInTheDocument()
expect(screen.getByText('Activity 1')).toBeInTheDocument()
```

**GOOD:**
```typescript
// Use data-testid for behavior verification
expect(screen.getByTestId('stat-card-messages')).toBeInTheDocument()
// For future dynamic data, use contract tests (skip until implemented)
describe.skip('Data Contract', () => {
  it('should render stats from props', () => {
    render(<Dashboard stats={mockStats} />)
    expect(screen.getByText('99')).toBeInTheDocument()
  })
})
```

#### 2. Write Integration Tests for External Services

**BAD:**
```python
# test_llm_service.py - Mocking at lowest level
with patch('ollama.AsyncClient') as mock_client:
    mock_client.chat.return_value = mock_response
    # This can't detect API changes or integration bugs
```

**GOOD:**
```python
# test_llm_service_integration.py - Real Ollama communication
@pytest.mark.integration
async def test_real_chat(real_client):
    if not await real_client.health_check():
        pytest.skip("Ollama not available")
    response = await real_client.chat(messages, model="gemma3:12b")
    assert response.message.content  # Actual Ollama response
```

Run with: `make test-integration`

#### 3. Verify Actual Behavior, Not Mock Calls

**BAD:**
```typescript
// api.test.ts - Only checks localStorage was called
expect(localStorageMock.setItem).toHaveBeenCalledWith('soai-token', token)
```

**GOOD:**
```typescript
// Verify axios headers are actually set
setToken('test-token')
expect(api.defaults.headers.common.Authorization).toBe('Bearer test-token')
// Or use MSW to verify actual HTTP requests
```

#### 4. Use MSW for Frontend Integration Tests

```typescript
// Chat.integration.test.tsx
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.post('/api/v1/ai/chat', async ({ request }) => {
    const body = await request.json()
    // Verify request structure
    return HttpResponse.json({ message: { content: body.messages[0].content } })
  })
)
```

#### 5. E2E Tests for Critical Flows

```typescript
// e2e/chat.spec.ts - Tests actual user behavior
test('user can send message and receive response', async ({ page }) => {
  await page.goto('/chat')
  await page.fill('[data-testid="chat-input"]', 'Hello')
  await page.press('[data-testid="chat-input"]', 'Enter')
  await expect(page.locator('[data-testid="chat-message-assistant"]')).toBeVisible()
})
```

### Test File Organization

```
backend/tests/
├── test_<module>.py           # Unit tests (mocked)
├── test_<module>_integration.py # Integration tests (real services)
└── conftest.py                 # Shared fixtures

frontend/
├── src/
│   ├── *.test.tsx              # Unit tests
│   └── *.integration.test.tsx  # MSW integration tests
└── e2e/
    └── *.spec.ts               # Playwright E2E tests
```

### TDD Workflow

1. **Write test first** - Test should FAIL
2. **Run test** - Confirm it fails (RED)
3. **Implement** - Make test pass (GREEN)
4. **Break implementation** - Confirm test catches bugs (not a false positive!)
5. **Fix and verify** - Test passes again

### Running Tests

```bash
# Unit tests only (fast, no external services)
make test-unit

# Integration tests (requires Ollama running)
make test-integration

# All tests
make test-all

# Frontend unit tests
npm run test

# Frontend E2E tests
npm run test:e2e
```
