# Smart Office AI プロジェクト移行手順

## 概要

このプロジェクトはDocker Composeで完全にコンテナ化されているため、新しいPCへの移行は比較的簡単です。主な手順はコードのコピーと環境変数の設定です。

---

## 前提条件（新しいPC側）

| ツール | 必須バージョン | 用途 |
|--------|---------------|------|
| Docker | 最新版 | コンテナ実行 |
| Docker Compose | v2+ | サービス orchestration |
| Git | 任意 | リポジトリ管理 |

**確認コマンド:**
```bash
docker --version
docker compose version
```

---

## 移行手順

### Step 1: プロジェクトのコピー

**方法A: Git リモートリポジトリからクローン**
```bash
git clone <リポジトリURL> smart-office-ai
cd smart-office-ai
```

**方法B: 直接コピー（GitHub等を使用していない場合）**
1. 既存PCでアーカイブ作成:
   ```bash
   tar czf smart-office-ai.tar.gz \
     --exclude='node_modules' \
     --exclude='__pycache__' \
     --exclude='.venv' \
     --exclude='*.pyc' \
     --exclude='.git' \
     smart-office-ai/
   ```
2. 新しいPCで展開

**コピー除外すべきディレクトリ:**
- `frontend/node_modules` → `npm install` で再生成
- `backend/__pycache__`, `*.pyc` → Pythonが自動生成
- `.venv` → Docker内で使用

---

### Step 2: 環境変数ファイルの作成

`.env.example` を `.env` にコピーして設定:

```bash
cp .env.example .env
```

**必須設定項目（.env の編集）:**

```bash
# データベース
DATABASE_URL=postgresql+asyncpg://soai_user:your_secure_password@postgres:5432/soai_db
POSTGRES_USER=soai_user
POSTGRES_PASSWORD=your_secure_password  # 変更推奨

# Redis
REDIS_URL=redis://redis:6379/0

# JWT認証
JWT_SECRET_KEY=generate-strong-random-secret-here  # 変更必須！
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Ollama（ローカルLLM）
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=gemma3:12b  # または llama3.2, qwen2.5

# フロントエンド
VITE_API_URL=http://localhost:8000

# Caddy（本番環境でHTTPS化する場合のみ）
# DOMAIN=your-domain.com
```

**JWT_SECRET_KEYの生成方法:**
```bash
openssl rand -hex 32
```

---

### Step 3: Docker イメージのビルド

```bash
# 初回のみビルドが必要
docker compose build

# または make コマンドを使用
make build  # ※ Makefileに存在しない場合は docker compose build を直接使用
```

---

### Step 4: サービスの起動

```bash
# すべてのサービスを起動
docker compose up -d

# または make コマンド
make up
```

**起動確認:**
```bash
docker compose ps
make ps
```

---

### Step 5: データベースマイグレーション

```bash
# バックエンドコンテナ内でマイグレーション実行
docker compose exec backend alembic upgrade head

# または make コマンド
make migration-up
```

---

### Step 6: Ollama モデルのダウンロード

初回のみ、使用するLLMモデルをダウンロード:

```bash
# Ollama コンテナ内でモデルをプル
docker compose exec ollama ollama pull gemma3:12b

# または .env で指定したモデル
docker compose exec ollama ollama pull llama3.2
```

**利用可能なモデル例:**
- `gemma3:12b` - 軽量・高速
- `llama3.2` - バランス型
- `qwen2.5:14b` - 日本語強み

---

### Step 7: 動作確認

| サービス | URL | 確認内容 |
|---------|-----|----------|
| フロントエンド | http://localhost | ページ表示 |
| バックエンドAPI | http://localhost:8000/docs | Swagger UI |
| ヘルスチェック | http://localhost:8000/api/v1/health | JSONレスポンス |
| Ollama | http://localhost:11434 | APIレスポンス |

---

## データの移行（必要な場合）

既存環境のデータ（PostgreSQL, Redis, Ollamaモデル）を移行する場合:

### PostgreSQL データベース

**既存PCでダンプ:**
```bash
docker compose exec postgres pg_dump -U soai_user soai_db > backup.sql
```

**新しいPCでリストア:**
```bash
docker compose exec -T postgres psql -U soai_user soai_db < backup.sql
```

### Ollama モデル

ローカルにダウンロードしたモデルは `ollama_data` ボリュームに保存されます:
```bash
# 既存PCでボリュームをエクスポート
docker run --rm -v ollama_data:/data -v $(pwd):/backup alpine tar czf /backup/ollama-backup.tar.gz -C /data .

# 新しいPCでインポート
docker run --rm -v ollama_data:/data -v $(pwd):/backup alpine tar xzf /backup/ollama-backup.tar.gz -C /data
```

---

## よくある問題

### 問題1: ポートが既に使用されている
```bash
# ポート使用状況を確認
lsof -i :80    # Caddy
lsof -i :5173  # Frontend
lsof -i :8000  # Backend

# docker-compose.yml でポートを変更可能
```

### 問題2: PostgreSQL接続エラー
```bash
# ログを確認
docker compose logs postgres

# データベースを再作成（注意: データ消去）
docker compose down -v
docker compose up -d
```

### 問題3: Ollamaが応答しない
```bash
# Ollamaコンテナの状態確認
docker compose logs ollama

# モデルがダウンロードされているか確認
docker compose exec ollama ollama list
```

---

## 開発モードでの作業

**フロントエンド開発（ホットリロード）:**
```bash
cd frontend
npm install
npm run dev  # http://localhost:5173
```

**バックエンド開発:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python -m app.main
```

---

## 検証チェックリスト

移行完了後に確認:

- [ ] `docker compose ps` ですべてのサービスが `Up` 状態
- [ ] `http://localhost` でフロントエンドが表示される
- [ ] `http://localhost:8000/docs` でSwagger UIが表示される
- [ ] `make shell-db` でデータベースに接続できる
- [ ] `docker compose exec ollama ollama list` でモデルが表示される

---

## 関連ファイルパス

| ファイル | 用途 |
|---------|------|
| `docker-compose.yml` | サービス定義 |
| `.env.example` | 環境変数テンプレート |
| `Makefile` | 便利コマンド集 |
| `backend/requirements.txt` | Python依存関係 |
| `frontend/package.json` | Node.js依存関係 |
| `backend/alembic/` | データベースマイグレーション |
