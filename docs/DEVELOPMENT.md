# 開発者ガイド (Development Guide)

Smart Office AI の開発環境セットアップとワークフローについて説明します。

## 目次

1. [環境セットアップ](#環境セットアップ)
2. [開発ワークフロー](#開発ワークフロー)
3. [利用可能なコマンド](#利用可能なコマンド)
4. [テスト](#テスト)
5. [データベース操作](#データベース操作)
6. [トラブルシューティング](#トラブルシューティング)

---

## 環境セットアップ

### 前提条件

- Docker 20.10+
- Docker Compose 2.0+
- Git 2.30+

### 初期セットアップ

```bash
# リポジトリのクローン
git clone <repository-url>
cd smart-office-ai

# 環境変数ファイルの作成
cp .env.example .env
# .env を編集して必要な値を設定（特にパスワード、シークレットキー）

# コンテナの起動
make up
# または
docker-compose up -d

# マイグレーションの適用
make migration-up
# または
docker-compose exec backend alembic upgrade head
```

### 初期起動後の確認

```bash
# サービス状態確認
make ps

# ヘルスチェック
curl http://localhost:8000/health
# 期待されるレスポンス: {"status":"ok"}

# APIドキュメント（ブラウザでアクセス）
# http://localhost:8000/docs
```

---

## 開発ワークフロー

### ブランチ戦略

```
main          - 安定版（本番デプロイ用）
develop       - 開発版
feature/*     - 機能開発ブランチ
fix/*         - バグ修正ブランチ
```

### 新機能開発の流れ

1. **機能ブランチの作成**
   ```bash
   git checkout -b feature/user-auth
   ```

2. **TDDアプローチで実装**
   ```bash
   # 1. テストを先に書く（RED）
   # 2. 実装してテストを通す（GREEN）
   # 3. リファクタリング（REFACTOR）

   # テスト実行
   make test
   # または
   docker-compose exec backend pytest tests/ -v
   ```

3. **カバレッジ確認**
   ```bash
   docker-compose exec backend pytest tests/ --cov=app --cov-report=term-missing
   # 目標: 80%以上のカバレッジ
   ```

4. **コミット**
   ```bash
   git add .
   git commit -m "feat: implement user authentication"
   ```

5. **プッシュ & プルリクエスト**
   ```bash
   git push origin feature/user-auth
   # GitHub/GitLab でプルリクエストを作成
   ```

### コードレビュー確認事項

- [ ] セキュリティ上の問題がないか
- [ ] テストカバレッジが80%以上
- [ ] `console.log` が残っていない
- [ ] 未使用のインポートがない
- [ ] 適切なエラーハンドリングがある
- [ ] ドキュメントが更新されている

---

## API認証エンドポイント

### 認証フロー概要

1. **ユーザー登録** - `POST /api/v1/auth/register`
2. **ログイン** - `POST /api/v1/auth/login`
3. **TOTP設定（2段階）** - `POST /api/v1/auth/2fa/setup` → `POST /api/v1/auth/2fa/enable`
4. **TOTP無効化** - `POST /api/v1/auth/2fa/disable`

### APIエンドポイント一覧

| メソッド | パス | 認証 | 説明 |
|--------|------|------|------|
| POST | `/api/v1/auth/register` | 不要 | ユーザー登録 |
| POST | `/api/v1/auth/login` | 不要 | ログイン（2FA有効時はTOTP必須） |
| POST | `/api/v1/auth/2fa/setup` | 必須 | TOTPシークレット生成（保存しない） |
| POST | `/api/v1/auth/2fa/enable` | 必須 | TOTP有効化（コード検証後に保存） |
| POST | `/api/v1/auth/2fa/disable` | 必須 | TOTP無効化（コード必須） |
| POST | `/api/v1/auth/2fa/verify` | 必須 | TOTPコード検証 |
| GET | `/api/v1/auth/me` | 必須 | 現在のユーザー情報取得 |

### cURL使用例

```bash
# ユーザー登録
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","username":"testuser","password":"SecurePass123"}'

# ログイン
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123"}'

# ログイン（2FA有効時）
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123","totp_code":"123456"}'

# TOTP設定（シークレット取得）
curl -X POST http://localhost:8000/api/v1/auth/2fa/setup \
  -H "Authorization: Bearer <token>"

# TOTP有効化
curl -X POST http://localhost:8000/api/v1/auth/2fa/enable \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"secret":"<32char_secret>","code":"123456"}'

# 現在のユーザー情報
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer <token>"
```

---

## 利用可能なコマンド

### Makefile コマンド

```bash
# コンテナ操作
make up          # 全コンテナ起動
make down        # 全コンテナ停止
make ps          # サービス状態確認
make restart     # サービス再起動
make logs        # ログ表示（tail -f）

# シェルアクセス
make shell-db    # PostgreSQL に接続
make shell-backend   # バックエンドコンテナに入る

# データベースマイグレーション
make migration-create MSG="add_user_profile"  # 新規マイグレーション作成
make migration-up                           # マイグレーション適用
make migration-down                         # 1つ戻す

# クリーンアップ
make destroy     # コンテナとボリュームを削除（データ消去）
```

### バックエンド開発コマンド

```bash
# コンテナ内で実行
docker-compose exec backend pytest tests/ -v                    # テスト実行
docker-compose exec backend pytest tests/ --cov=app             # カバレッジ計測
docker-compose exec backend alembic revision --autogenerate -m "msg"  # 自動マイグレーション作成
docker-compose exec backend python -m app.core.scripts.seed_db   # シードデータ投入（作成後）
```

### フロントエンド開発コマンド

```bash
# フロントエンドコンテナ内で実行（実装後）
docker-compose exec frontend npm run dev     # 開発サーバー起動
docker-compose exec frontend npm run build   # プロダクションビルド
docker-compose exec frontend npm run test    # テスト実行
docker-compose exec frontend npm run lint    # Lint実行
```

---

## テスト

### テストの種類

| テスト種類 | 説明 | コマンド |
|-----------|------|--------|
| ユニットテスト | 個別の関数・クラスのテスト | `pytest tests/test_database.py` |
| インテグレーションテスト | DB、外部サービスとの連携テスト | `pytest tests/test_integration.py` |
| E2Eテスト | ブラウザでの操作テスト（実装後） | `playwright tests/e2e/` |

### テスト実行

```bash
# 全テスト実行
docker-compose exec backend pytest tests/ -v

# 特定のテストファイル
docker-compose exec backend pytest tests/test_models.py -v

# 特定のテスト関数
docker-compose exec backend pytest tests/test_models.py::TestUser::test_create_user -v

# カバレッジレポート付き
docker-compose exec backend pytest tests/ --cov=app --cov-report=html
# レポート: backend/htmlcov/index.html

# 失敗したテストの最初で停止
docker-compose exec backend pytest tests/ -x

# デバッグモード
docker-compose exec backend pytest tests/ -v -s
```

### テストカバレッジ目標

- **全体**: 80%以上
- **セキュリティ関連**: 100%
- **コアビジネスロジック**: 100%

---

## データベース操作

### psql での直接操作

```bash
# データベース接続
make shell-db

# 接続後の主なコマンド
\dt                    # テーブル一覧
\d users               # テーブル構造確認
\du                    # ユーザー一覧
\dx                    # 拡張機能一覧
\q                     # 終了

# クエリ例
SELECT * FROM users LIMIT 10;
SELECT COUNT(*) FROM users;
```

### マイグレーション

```bash
# 現在のバージョン確認
docker-compose exec backend alembic current

# 履歴確認
docker-compose exec backend alembic history

# マイグレーション作成（手動）
docker-compose exec backend alembic revision -m "add_user_profile"

# マイグレーション作成（自動）
docker-compose exec backend alembic revision --autogenerate -m "sync models"

# 最新へ適用
make migration-up

# 1つ戻す
make migration-down

# 特定のバージョンへ戻す
docker-compose exec backend alembic downgrade <revision_id>
```

### データベースリセット

```bash
# 注意: 全データが消去されます
make destroy
# データベースのみ削除して再作成
docker-compose down -v
docker-compose up -d
make migration-up
```

---

## トラブルシューティング

### よくある問題と解決策

| 問題 | 原因 | 解決策 |
|------|------|--------|
| `Port already in use` | ポート競合 | `.env` でポート番号を変更 |
| `Connection refused` | コンテナが起動していない | `make ps` で状態確認、`make logs` でログ確認 |
| `ModuleNotFoundError` | 依存関係がインストールされていない | `docker-compose build backend` で再ビルド |
| マイグレーションエラー | データベーススキーマの不整合 | `alembic downgrade head` で戻してから再適用 |

### ログの確認

```bash
# 全サービスのログ
make logs

# 特定サービスのログ
docker-compose logs backend
docker-compose logs postgres
docker-compose logs ollama

# 直近のログ（100行）
docker-compose logs --tail=100 backend

# ログを追跡
docker-compose logs -f backend
```

### コンテナの再構築

```bash
# 特定サービスのみ再構築
docker-compose build backend
docker-compose up -d backend

# キャッシュなしで再構築
docker-compose build --no-cache backend
```

### デバッグモード

```bash
# SQLAlchemy クエリログを有効化
# .env に追加: DB_ECHO=true

# フロントエンド開発サーバーのデバッグ
# .env に追加: VITE_DEBUG=true
```

---

## プロジェクト構造

```
smart-office-ai/
├── docker-compose.yml         # Docker Compose 設定
├── Makefile                   # 便利コマンド
├── .env.example               # 環境変数テンプレート
├── CLAUDE.md                  # Claude Code 用プロジェクトガイド
├── backend/                   # バックエンド（FastAPI）
│   ├── app/
│   │   ├── api/v1/           # REST API エンドポイント
│   │   ├── core/             # 設定、セキュリティ、DB
│   │   ├── models/           # SQLAlchemy モデル
│   │   ├── schemas/          # Pydantic スキーマ
│   │   ├── services/         # ビジネスロジック
│   │   └── main.py           # アプリケーションエントリ
│   ├── alembic/              # データベースマイグレーション
│   ├── tests/                # テストファイル
│   ├── requirements.txt      # Python 依存関係
│   └── Dockerfile
├── frontend/                  # フロントエンド（React）
│   ├── src/
│   │   ├── components/       # React コンポーネント
│   │   ├── pages/            # 画面コンポーネント
│   │   ├── hooks/            # カスタムフック
│   │   ├── lib/              # ユーティリティ
│   │   └── stores/           # 状態管理
│   ├── package.json
│   └── Dockerfile
├── caddy/                     # Caddy 設定
└── docs/                      # ドキュメント
```

---

## 環境変数リファレンス

| 変数名 | 説明 | デフォルト値 |
|--------|------|------------|
| `DATABASE_URL` | PostgreSQL接続URL | - |
| `REDIS_URL` | Redis接続URL | `redis://redis:6379/0` |
| `JWT_SECRET_KEY` | JWT署名キー（32文字以上推奨） | - |
| `JWT_ALGORITHM` | JWTアルゴリズム | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | アクセストークン有効期限（分） | `30` |
| `OLLAMA_BASE_URL` | Ollama API URL | `http://ollama:11434` |
| `OLLAMA_MODEL` | デフォルトモデル名 | `llama3.2` |
| `DB_POOL_SIZE` | DB接続プールサイズ | `5` |
| `DB_MAX_OVERFLOW` | DB接続プール最大オーバーフロー | `10` |
| `DB_ECHO` | SQLクエリログ出力 | `false` |
| `CORS_ORIGINS` | 許可するオリジン（JSON配列またはカンマ区切り） | `["http://localhost:5173","http://localhost:3000"]` |
