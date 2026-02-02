"""Main FastAPI application."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.auth import router as auth_router
from app.core.config import settings
from app.core.database import init_db, close_db

# Configure logging
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management."""
    # Startup
    logger.info("Smart Office AI Backend starting...")
    # Initialize database extensions (pgvector, uuid-ossp)
    await init_db()
    yield
    # Shutdown
    logger.info("Smart Office AI Backend shutting down...")
    await close_db()


app = FastAPI(
    title="Smart Office AI",
    description="AI-powered office suite backend",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration - allow origins from environment variable
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Smart Office AI API",
        "version": "0.1.0",
        "docs": "/docs",
    }


# Include API routers
app.include_router(auth_router, prefix="/api/v1")
