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

- **Backend**: pytest with async support, 80%+ coverage required
- **Frontend**: Vitest + Playwright for E2E
- **E2E**: Critical user flows (login → chat → file upload → AI query)

Always write tests FIRST (TDD) for new features.
