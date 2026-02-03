# Smart Office AI 実装プラン: Phase 1 初期セットアップ

## 概要

個人開発向けのオールインワンAI事務アプリ。無料/OSSベースで構築し、ローカルLLM（Ollama）を中心にAI機能を提供。Docker Composeで一発起動できる構成を目指す。

**技術スタック**: React + TypeScript（フロントエンド）/ Python FastAPI（バックエンド）/ PostgreSQL + pgvector（DB）/ Ollama（LLM）/ Caddy（リバースプロキシ）

---

## Phase 1 ゴール（完了基準）

**Docker一発起動 → ログイン → AIチャットができる状態**

- [x] Docker Compose環境の構築
- [x] データベース（PostgreSQL + pgvector）のセットアップ
- [x] 認証基盤（JWT + TOTP）の実装
- [x] 基本UIレイアウト（サイドバー、ヘッダー）
- [x] Ollama連携（ローカルLLMとの通信）
- [ ] 基本チャットUI（メッセージの送受信）

**完了サマリー**:
- Step 1-5: 完了（2025-02-02現在）
- Step 6: 完了（2026-02-02）- Magic UI導入と基本レイアウト
- Step 7: 完了（2026-02-03）- 認証フロントエンド（ログイン画面）
- Step 8: 完了（2026-02-03）- Ollama連携（バックエンド）
- Step 9-10: 未着手

---

## ディレクトリ構築計画

```
smart-office-ai/
├── docker-compose.yml              # メイン構成
├── .env.example                    # 環境変数テンプレート
├── Makefile                        # 便利コマンド
├── frontend/                       # React + TypeScript
│   ├── src/
│   │   ├── components/ui/          # Magic UIコンポーネント
│   │   ├── pages/                  # 画面コンポーネント
│   │   ├── hooks/                  # カスタムフック
│   │   ├── lib/                    # ユーティリティ
│   │   └── stores/                 # Zustand状態管理
│   ├── package.json
│   └── Dockerfile
├── backend/                        # Python FastAPI
│   ├── app/
│   │   ├── api/v1/                 # REST APIエンドポイント
│   │   ├── models/                 # SQLAlchemyモデル
│   │   ├── schemas/                # Pydanticスキーマ
│   │   ├── services/ai/            # AI関連サービス
│   │   ├── core/                   # 設定・セキュリティ
│   │   └── main.py                 # アプリケーションエントリ
│   ├── alembic/                    # DBマイグレーション
│   ├── requirements.txt
│   └── Dockerfile
├── caddy/                          # リバースプロキシ設定
│   └── Caddyfile
└── data/                           # データ永続化用（gitignore）
```

---

## 実装ステップ詳細

### Step 1: プロジェクト初期化とDocker環境構築

**目的**: コンテナ一発起動の基盤を構築

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `docker-compose.yml`, `.env.example`, `Makefile` |
| **所要時間目安** | 2-3時間 |
| **依存関係** | なし（最初のステップ） |

**実行内容**:

1. **プロジェクトルートの初期化**
   - `.env.example` の作成（環境変数テンプレート）
   - `.gitignore` の作成（data/ ディレクトリ等を除外）

2. **Docker Compose構成の作成**
   - PostgreSQL 16 + pgvector拡張
   - Redis（Valkey）
   - Caddy（リバースプロキシ）
   - Ollama（ローカルLLM）
   - ボリュームマウント設定

3. **Makefileの作成**
   - `make up` / `make down` 等のショートカットコマンド

**確認ポイント**:
- [x] `docker-compose up` で全サービスが起動する
- [x] PostgreSQLにpgvector拡張がインストールされている
- [x] Caddyが80/443ポートで待ち受けている

---

### Step 2: バックエンド基盤（FastAPI）

**目的**: APIサーバーの骨格を構築

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `backend/requirements.txt`, `backend/Dockerfile`, `backend/app/main.py`, `backend/app/core/config.py` |
| **所要時間目安** | 3-4時間 |
| **依存関係** | Step 1完了後 |

**実行内容**:

1. **依存関係の定義** (`requirements.txt`)
   - FastAPI, Uvicorn, SQLAlchemy, asyncpg, pydantic-settings
   - python-jose（JWT）, passlib（パスワードハッシュ）, pyotp（TOTP）
   - alembic（マイグレーション）

2. **Dockerfileの作成**
   - Python 3.12ベース
   - マルチステージビルド（開発用）

3. **コア設定モジュール** (`app/core/config.py`)
   - Pydantic Settingsで環境変数管理
   - データベース接続設定
   - JWTシークレット設定

4. **メインアプリケーション** (`app/main.py`)
   - FastAPIアプリケーション初期化
   - CORS設定
   - ヘルスチェックエンドポイント

**確認ポイント**:
- [x] `http://localhost:8000/health` でOKレスポンス
- [x] 自動APIドキュメント（`http://localhost:8000/docs`）が表示される

---

### Step 3: データベース設計とマイグレーション

**目的**: ユーザーテーブルと基本スキーマの構築

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `backend/app/models/user.py`, `backend/app/core/database.py`, `backend/alembic/` |
| **所要時間目安** | 3-4時間 |
| **依存関係** | Step 2完了後 |

**実行内容**:

1. **データベース接続設定** (`app/core/database.py`)
   - SQLAlchemy async設定
   - セッション管理

2. **ユーザーモデルの作成** (`app/models/user.py`)
   - フィールド: id, email, username, hashed_password, totp_secret, is_active, created_at, updated_at
   - SQLAlchemyモデル定義

3. **Alembicの初期化**
   - マイグレーション設定
   - 最初のマイグレーション（ユーザーテーブル作成）

**確認ポイント**:
- [x] `alembic upgrade head` でテーブルが作成される
- [x] pgvector拡張が有効になっている
- [x] テストカバレッジ95%達成

---

### Step 4: 認証基盤（JWT + TOTP）

**目的**: ログイン/ログアウト、2要素認証の実装

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `backend/app/core/security.py`, `backend/app/api/v1/auth.py`, `backend/app/schemas/auth.py` |
| **所要時間目安** | 4-5時間 |
| **依存関係** | Step 3完了後 |

**実行内容**:

1. **セキュリティユーティリティ** (`app/core/security.py`)
   - パスワードハッシュ（bcrypt）
   - JWTトークンの作成・検証
   - TOTPシークレット生成・検証

2. **認証スキーマ** (`app/schemas/auth.py`)
   - UserCreate, UserLogin, Token, TOTPSetup等

3. **認証APIエンドポイント** (`app/api/v1/auth.py`)
   - POST `/auth/register` - ユーザー登録
   - POST `/auth/login` - ログイン（JWT発行）
   - POST `/auth/2fa/setup` - TOTP設定（QRコード生成）
   - POST `/auth/2fa/verify` - TOTP検証

4. **依存性注入（認証）**
   - `get_current_user` 依存関係の作成

**確認ポイント**:
- [x] ユーザー登録APIでパスワードがハッシュ化される
- [x] ログインでJWTトークンが発行される
- [x] TOTP設定でQRコードが生成される
- [x] 保護エンドポイントで認証が機能する

**Step 4 完了日**: 2026-02-02
**実装内容**:
- PyJWT 2.10.1（CVE対策済み）
- タイミング攻撃対策（ダミーハッシュ比較）
- 2段階TOTP設定フロー（setup → enable）
- ログイン時TOTP検証（2FA有効時は必須）
- 122個のテスト、89%カバレッジ

---

### Step 5: フロントエンド基盤（React + Vite）

**目的**: フロントエンド開発環境の構築

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `frontend/package.json`, `frontend/Dockerfile`, `frontend/vite.config.ts`, `frontend/tsconfig.json` |
| **所要時間目安** | 2-3時間 |
| **依存関係** | Step 1完了後（バックエンドと並行可能） |

**実行内容**:

1. **Viteプロジェクト初期化**
   - React + TypeScriptテンプレート
   - 必要な依存関係のインストール

2. **依存関係のインストール**
   - Tailwind CSS
   - React Router DOM
   - Zustand（状態管理）
   - React Query（TanStack Query）

3. **Dockerfileの作成**
   - Node.jsベース（開発用）
   - HMR（Hot Module Replacement）対応

4. **基本設定ファイル**
   - Tailwind設定
   - TypeScript設定
   - Vite設定（プロキシ設定）

**確認ポイント**:
- [x] `http://localhost:5173` でReactアプリが表示される
- [x] HMRが機能する（ファイル保存で自動リロード）

**Step 5 完了日**: 2026-02-02
**実装内容**:
- React 18 + TypeScript + Vite
- Tailwind CSS + React Router DOM
- Zustand（状態管理）+ TanStack Query
- Vitest（テスト）+ ESLint（リンター）
- Docker開発環境（HMR対応）

---

### Step 6: Magic UI導入と基本レイアウト

**目的**: モダンUIコンポーネントの導入とアプリの基本レイアウト構築

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `frontend/src/components/ui/`, `frontend/src/App.tsx`, `frontend/src/pages/Layout.tsx` |
| **所要時間目安** | 4-5時間 |
| **依存関係** | Step 5完了後 |

**実行内容**:

1. **Magic UIコンポーネントの導入**
   - `npx magicui init` で初期化
   - 必要なコンポーネントの追加（Button, Card, Input, Sidebar等）

2. **基本レイアウトコンポーネント** (`pages/Layout.tsx`)
   - ヘッダー（検索バー、通知、ユーザーメニュー）
   - サイドバー（ナビゲーション）
   - メインコンテンツエリア

3. **ルーティング設定** (`App.tsx`)
   - `/login` - ログイン画面
   - `/` - ダッシュボード（ホーム）
   - `/chat` - チャット画面
   - 未認証リダイレクト

4. **グローバルスタイル**
   - ダークモード対応
   - カラーテーマ設定

**確認ポイント**:
- [x] ダークモード切り替えが機能する
- [x] サイドバーが表示され、ナビゲーションできる
- [x] レスポンシブ対応（最低限の画面幅対応）

**Step 6 完了日**: 2026-02-02
**実装内容**:
- Magic UIコンポーネント導入（animated-theme-toggler, shiny-button, magic-card, blur-fade）
- ダークモード切り替え（Zustand persist, localStorage永続化）
- レスポンシブレイアウト（デスクトップサイドバー、モバイルドロワー）
- ルーティング設定（/, /login, /chat）
- 25個のテスト全て通過

---

### Step 7: 認証フロントエンド（ログイン画面）

**目的**: ユーザー認証UIの実装

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `frontend/src/pages/Login.tsx`, `frontend/src/stores/authStore.ts`, `frontend/src/lib/api.ts` |
| **所要時間目安** | 4-5時間 |
| **依存関係** | Step 4, Step 6完了後 |

**実行内容**:

1. **APIクライアント設定** (`lib/api.ts`, `lib/types.ts`)
   - axiosインスタンス（JWTインターセプター付き）
   - JWTトークンの自動付与
   - エラーハンドリング（401で自動クリア）

2. **認証状態管理** (`stores/authStore.ts`)
   - Zustandでログイン状態管理
   - トークンの永続化（localStorage、persistミドルウェア）

3. **ログイン画面** (`pages/Login.tsx`)
   - メール/パスワード入力フォーム
   - 2FA入力フォーム（TOTP、エラーメッセージで動的表示）
   - バリデーション（HTML5 + React state）

4. **認証ガード** (`pages/ProtectedRoute.tsx`)
   - 未ログイン時のリダイレクト
   - トークン有効期限チェック（checkAuth）

5. **ヘッダー統合** (`components/layout/Header.tsx`, `components/common/UserMenu.tsx`)
   - ログアウト機能
   - ユーザー情報表示

**確認ポイント**:
- [x] ログインフォームでバックエンドAPIと通信できる
- [x] ログイン成功でJWTが保存される
- [x] ログイン状態でナビゲーションが変わる

**Step 7 完了日**: 2026-02-03
**実装内容**:
- APIクライアント（Axios + JWTインターセプター）
- 認証ストア（Zustand + persist、トークンのみ永続化）
- ログインページ（フォーム送信、TOTP動的表示、エラー表示）
- ProtectedRoute（本実装の認証チェック、ローディング状態）
- Header/UserMenu（ユーザー情報表示、ログアウト）
- 109個のテスト全て通過、80.3%カバレッジ達成

**Step 7 セキュリティ技術的負債（リファクタリング計画）:**

以下の問題はPhase 1完了後のリファクタリングで対応予定。

| 重要度 | 問題 | ファイル | 説明 |
|--------|------|--------|------|
| CRITICAL | localStorage JWT保存 | api.ts, authStore.ts | XSSでトークン盗聴リスク。httpOnlyクッキーへ移行検討 |
| CRITICAL | CSP未設定 | index.html | XSS防御がない。Caddyでセキュリティヘッダー設定 |
| CRITICAL | ユーザー列挙攻撃 | api.ts | エラーメッセージでユーザー存在が分かる。バックエンド含めて対応 |
| HIGH | rememberMe未実装 | Login.tsx:24 | チェックボックスが機能しない。実装または削除 |
| HIGH | eslint-disable乱用 | shiny-button.tsx, authStore.ts | 型安全性を無視。適切な型定義へ |
| HIGH | TOTP平文表示 | Login.tsx:122 | type="password"へ変更 |
| HIGH | HTTPS強制なし | vite.config.ts | 本番環境でHTTPS強制 |
| HIGH | checkAuth競合 | ProtectedRoute.tsx:17 | 複数呼び出しの重複排除 |
| MEDIUM | トークンリフレッシュなし | api.ts | 有効期限前にリフレッシュ |
| MEDIUM | セキュリティヘッダー不足 | Caddyfile | X-Frame-Options等追加 |
| MEDIUM | パスワードstate残留 | Login.tsx:22 | 送信後即時クリア |

**Phase 1完了後のセキュリティ強化タスク:**

1. **httpOnlyクッキー移行**（バックエンド変更含む）
   - バックエンド: Set-CookieヘッダーでJWT発行
   - フロントエンド: credentials: 'include' でAPI呼び出し
   - localStorageからのトークン削除

2. **Caddyセキュリティヘッダー設定**
   ```caddy
   header {
       Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline';"
       X-Frame-Options "DENY"
       X-Content-Type-Options "nosniff"
       Referrer-Policy "strict-origin-when-cross-origin"
   }
   ```

3. **rememberMe 実装または削除**
   - 削除案: チェックボックスUIを削除
   - 実装案: バックエンドで長期有効トークン発行

---

### Step 8: Ollama連携（バックエンド）

**目的**: ローカルLLM（Ollama）との通信実装

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `backend/app/services/ai/llm_service.py`, `backend/app/api/v1/ai.py` |
| **所要時間目安** | 3-4時間 |
| **依存関係** | Step 2完了後 |

**実行内容**:

1. **LLMサービス** (`services/ai/llm_service.py`)
   - Ollama APIクライアント
   - モデル一覧取得
   - チャット生成（ストリーミング対応）

2. **AI関連API** (`api/v1/ai.py`)
   - GET `/ai/models` - 利用可能なモデル一覧
   - POST `/ai/chat` - チャットメッセージ生成（ストリーミング）
   - POST `/ai/chat/stream` - SSEストリーミングエンドポイント

3. **モデル自動ダウンロード設定**
   - docker-composeで指定モデルの自動pull

**確認ポイント**:
- [x] `http://localhost:11434` でOllamaが応答する
- [x] `/api/v1/ai/models` でモデル一覧が取得できる
- [x] `/api/v1/ai/chat` でAI応答が返る

**Step 8 完了日**: 2026-02-03
**実装内容**:
- Ollama Pythonライブラリ（ollama>=0.4.0）を使用したLLMサービス
- `OllamaClient` クラス（health_check, list_models, chat, chat_stream）
- AI APIエンドポイント（GET /api/v1/ai/models, POST /api/v1/ai/chat, POST /api/v1/ai/chat/stream, GET /api/v1/ai/health）
- Pydanticスキーマ（ChatMessage, ChatRequest, ChatResponse, ModelInfo, HealthResponse, StreamChunk）
- カスタム例外（OllamaServiceError, OllamaConnectionError, OllamaModelNotFoundError, OllamaTimeoutError）
- Docker Compose healthcheck追加（ollama service）
- 70個のテスト全て通過、96%カバレッジ（services/ai）

---

### Step 9: 基本チャットUI

**目的**: AIと対話できる最小限のチャットインターフェース

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `frontend/src/pages/Chat.tsx`, `frontend/src/components/chat/ChatMessage.tsx`, `frontend/src/components/chat/ChatInput.tsx` |
| **所要時間目安** | 5-6時間 |
| **依存関係** | Step 7, Step 8完了後 |

**実行内容**:

1. **チャットメッセージコンポーネント** (`components/chat/ChatMessage.tsx`)
   - ユーザー/AIメッセージ表示
   - Markdownレンダリング（react-markdown）
   - コードブロック対応

2. **チャット入力コンポーネント** (`components/chat/ChatInput.tsx`)
   - テキストエリア（自動リサイズ）
   - 送信ボタン
   - キーボードショートカット（Enter送信）

3. **チャット画面** (`pages/Chat.tsx`)
   - メッセージ一覧表示
   - 入力エリア
   - ストリーミング応答表示
   - ローディング状態

4. **チャット状態管理**
   - メッセージ履歴の管理
   - 現在の会話コンテキスト

**確認ポイント**:
- [ ] メッセージを入力して送信できる
- [ ] AI応答がストリーミングで表示される
- [ ] Markdownが正しくレンダリングされる
- [ ] 長い応答でもスクロールが機能する

---

### Step 10: データベース永続化（会話履歴）

**目的**: チャットメッセージのデータベース保存

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `backend/app/models/chat.py`, `backend/app/api/v1/chat.py` |
| **所要時間目安** | 4-5時間 |
| **依存関係** | Step 3, Step 8完了後 |

**実行内容**:

1. **チャット関連モデル** (`models/chat.py`)
   - Conversation（会話テーブル）
   - Message（メッセージテーブル）
   - リレーション設定

2. **チャットAPI** (`api/v1/chat.py`)
   - GET `/conversations` - 会話一覧
   - POST `/conversations` - 新規会話作成
   - GET `/conversations/{id}/messages` - メッセージ一覧
   - POST `/conversations/{id}/messages` - メッセージ送信（AI応答も同時に生成・保存）

3. **マイグレーション作成**
   - チャットテーブルの作成

**確認ポイント**:
- [ ] 会話がデータベースに保存される
- [ ] 過去の会話履歴を取得できる
- [ ] 会話一覧が表示される

---

## テスト戦略

### 各Stepでの確認方法

| Step | テスト内容 |
|------|-----------|
| 1 | `docker-compose ps` で全サービスがUp状態 |
| 2 | `curl http://localhost:8000/health` |
| 3 | `psql` でテーブル構造を確認 |
| 4 | `curl` で認証APIをテスト、JWTの検証 |
| 5 | ブラウザで開発サーバー確認 |
| 6 | ブラウザでUI表示確認 |
| 7 | E2E: ログイン→トークン確認→リロードで保持 |
| 8 | `curl` でOllama APIテスト、応答確認 |
| 9 | E2E: チャット送信→AI応答表示 |
| 10 | DB直接確認: メッセージが保存されているか |

---

## リスクと対策

| リスク | 対策 |
|--------|------|
| **Docker環境でポート競合** | `.env` でポートをカスタマイズ可能にする |
| **OllamaがGPUを認識しない** | CPU推論モードのフォールバックを用意 |
| **PostgreSQL+pgvectorの構築が複雑** | 公式pgvectorイメージを使用 |
| **フロントエンド→バックエンド通信エラー** | CORS設定の確認、Viteプロキシ設定 |
| **JWTシークレット管理** | `.env.example` に明記、本番では強力な値を生成 |

---

## 学習用リソース

各Stepで参考になるドキュメント：

| Step | 参考資料 |
|------|----------|
| 1 | Docker Compose公式ドキュメント、Caddyドキュメント |
| 2 | FastAPI公式チュートリアル、Pydantic設定 |
| 3 | SQLAlchemy 2.0ドキュメント、Alembicチュートリアル |
| 4 | python-joseドキュメント、PyOTPドキュメント |
| 5 | Viteガイド、Reactドキュメント |
| 6 | Tailwind CSSドキュメント、Magic UIドキュメント |
| 7 | Zustandドキュメント、TanStack Queryドキュメント |
| 8 | Ollama REST APIドキュメント |
| 9 | react-markdownドキュメント、SSE (Server-Sent Events) |
| 10 | SQLAlchemyリレーションシップガイド |

---

## Phase 1 完了定義チェックリスト

- [ ] `docker-compose up` で全サービスが起動する
- [ ] ユーザー登録・ログインができる
- [ ] 2FA（TOTP）設定ができる
- [ ] ダッシュボード画面が表示される
- [ ] AIチャットでメッセージの送受信ができる
- [ ] チャット履歴がデータベースに保存される

---

## 推定所要時間

| 項目 | 時間 |
|------|------|
| 全10ステップ合計 | 約32-38時間 |
| 1日2時間作業の場合 | 約16-19日（3-4週間） |

---

## 次のPhase（予定）

**Phase 2**: コア機能 - チャット & ファイル（4週間）
- リアルタイムチャット（WebSocket）
- チャンネル/DM機能
- ファイルアップロード
- RAG（Vector DB検索）
