from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db, close_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 起動時の処理
    print("Smart Office AI Backend starting...")
    # データベース拡張の初期化（pgvector, uuid-ossp）
    await init_db()
    yield
    # シャットダウン時の処理
    print("Smart Office AI Backend shutting down...")
    await close_db()


app = FastAPI(
    title="Smart Office AI",
    description="AI-powered office suite backend",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"message": "Smart Office AI API", "version": "0.1.0", "docs": "/docs"}
