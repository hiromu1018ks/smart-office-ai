# Smart Office AI

オールインワンAI統合オフィススイート - チャット、カレンダー、タスク、ファイル管理、CRM、ワークフローをセルフホスト可能なローカルLLMで駆動。

## 特徴

- 🏠 **セルフホスト可能** - Docker Compose でワンコマンド起動
- 🤖 **ローカルLLM** - Ollama によるプライベートなAI処理
- 🔐 **セキュア** - JWT認証 + TOTP (2FA)
- 📊 **フルスタック** - React 18 + FastAPI + PostgreSQL + pgvector
- 💰 **無料/OSSのみ** - コスト0で運用可能

## クイックスタート

```bash
# 1. リポジトリのクローン
git clone <repository-url>
cd smart-office-ai

# 2. 環境変数の設定
cp .env.example .env
# .env を編集して必要な値を設定

# 3. サービス起動
make up

# 4. データベースマイグレーション
make migration-up

# 5. ブラウザでアクセス
open http://localhost
```

## 開発コマンド

### Docker コンテナ操作

| コマンド | 説明 |
|---------|------|
| `make up` | 全コンテナ起動 |
| `make down` | 全コンテナ停止 |
| `make ps` | サービス状態確認 |
| `make logs` | ログを tail で表示 |
| `make restart` | 全コンテナ再起動 |
| `make destroy` | 全データを削除（要注意） |

### データベース

| コマンド | 説明 |
|---------|------|
| `make shell-db` | PostgreSQL に接続 (psql) |
| `make migration-up` | マイグレーション適用 |
| `make migration-down` | マイグレーション1つ戻す |
| `make migration-create MSG=message` | 新しいマイグレーション作成 |

### バックエンド開発

| コマンド | 説明 |
|---------|------|
| `make shell-backend` | Backendコンテナに入る |
| `pytest` | 単体テスト実行 |
| `pytest -m integration` | 統合テスト実行 |

### フロントエンド開発

```bash
cd frontend
npm run dev          # Vite開発サーバー起動
npm run build        # プロダクションビルド
npm run preview      # プロダクションビルドのプレビュー
npm run test         # 単体テスト
npm run test:e2e     # E2Eテスト (Playwright)
npm run lint         # Lint
```

## プロジェクト構造

```
smart-office-ai/
├── docker-compose.yml          # Docker Compose 設定
├── Makefile                    # 便利コマンド
├── .env.example                # 環境変数テンプレート
├── CLAUDE.md                   # Claude Code 用プロジェクトガイド
├── backend/                    # Python FastAPI バックエンド
│   ├── app/
│   │   ├── api/v1/             # REST API エンドポイント
│   │   ├── models/             # SQLAlchemy ORM モデル
│   │   ├── schemas/            # Pydantic スキーマ
│   │   ├── services/ai/        # LLM/RAG/OCR サービス
│   │   ├── core/               # 設定・セキュリティ
│   │   └── main.py             # FastAPI エントリポイント
│   ├── alembic/                # DB マイグレーション
│   ├── tests/                  # テスト
│   └── requirements.txt
├── frontend/                   # React + TypeScript フロントエンド
│   ├── src/
│   │   ├── components/ui/      # Magic UI コンポーネント
│   │   ├── components/chat/    # チャット関連コンポーネント
│   │   ├── pages/              # ルートコンポーネント
│   │   ├── hooks/              # カスタム React フック
│   │   ├── stores/             # Zustand 状態管理
│   │   └── lib/                // ユーティリティ (APIクライアント等)
│   ├── package.json
│   └── vite.config.ts
├── caddy/                      # リバースプロキシ設定
│   └── Caddyfile
└── docs/                       # ドキュメント
```

## 技術スタック

| コンポーネント | 技術 |
|--------------|------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Magic UI |
| **Backend** | Python 3.12, FastAPI, SQLAlchemy 2.0 (async) |
| **Database** | PostgreSQL 16 + pgvector |
| **Cache/Queue** | Redis (Valkey 8) |
| **LLM** | Ollama (ローカル) + Claude/OpenAI API オプション |
| **Reverse Proxy** | Caddy (自動HTTPS) |
| **Real-time** | WebSocket (FastAPI ネイティブ) |

## 環境変数

`.env.example` を `.env` にコピーして設定してください。

```bash
# データベース
POSTGRES_USER=smartoffice
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=smartoffice
DATABASE_URL=postgresql+asyncpg://smartoffice:password@postgres:5432/smartoffice

# Redis
REDIS_URL=redis://redis:6379/0

# JWT認証
JWT_SECRET_KEY=your_jwt_secret_key

# Ollama
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=gemma3:12b

# フロントエンド
VITE_API_URL=http://localhost:8000
```

## 開発ステータス

### Phase 1: インフラ + 認証 + 基本チャット

- [x] Docker Compose 環境構築
- [x] データベース (PostgreSQL + pgvector) セットアップ
- [x] 認証基盤 (JWT + TOTP) 実装
- [x] 基本UIレイアウト (サイドバー、ヘッダー)
- [x] Ollama 連携 (ローカルLLM通信)
- [x] 基本チャットUI (SSEストリーミング)

詳細な実装プランは [docs/implementation-plan.md](docs/implementation-plan.md) を参照してください。

## ライセンス

MIT License
