# コントリビューションガイド

Smart Office AI へのコントリビューションに興味を持っていただきありがとうございます。このドキュメントでは、開発環境のセットアップからプルリクエストの送信までの手順を説明します。

---

## 目次

1. [クイックスタート](#クイックスタート)
2. [開発ワークフロー](#開発ワークフロー)
3. [コマンドリファレンス](#コマンドリファレンス)
4. [環境変数](#環境変数)
5. [テスト](#テスト)
6. [コードスタイル](#コードスタイル)
7. [プルリクエスト チェックリスト](#プルリクエスト-チェックリスト)

---

## クイックスタート

### 前提条件

以下のソフトウェアがインストールされている必要があります：

| ソフトウェア | バージョン | 用途 |
|-------------|----------|------|
| Docker | 20.10+ | コンテナ実行環境 |
| Docker Compose | 2.0+ | コンテナオーケストレーション |
| Node.js | 18+ | フロントエンド開発 |
| Python | 3.12+ | バックエンド開発 |
| Git | 2.30+ | バージョン管理 |

#### NixOS の場合

flake.nix で開発環境が定義されています：

```bash
# 開発環境に入る
nix shell

# Chromium が自動的に利用可能
# E2Eテスト実行時は環境変数を設定:
export PLAYWRIGHT_CHROMIUM_PATH=$(which chromium)
```

### 初期セットアップ

```bash
# 1. リポジトリのクローン
git clone https://github.com/your-org/smart-office-ai.git
cd smart-office-ai

# 2. 環境変数の設定
cp .env.example .env
vim .env  # 必要に応じて編集

# 3. コンテナの起動
make up

# 4. データベースマイグレーションの適用
make migration-up

# 5. フロントエンド開発サーバーの起動（別ターミナル）
cd frontend
npm install
npm run dev
```

### 動作確認

```bash
# バックエンドのヘルスチェック
curl http://localhost:8000/api/v1/health

# フロントエンドの表示
# ブラウザで http://localhost:5173 にアクセス
```

---

## 開発ワークフロー

### ブランチ戦略

| ブランチ名 | 用途 |
|-----------|------|
| `main` | 本番コード（保護済み） |
| `develop` | 開発統合ブランチ |
| `feature/*` | 新機能開発 |
| `fix/*` | バグ修正 |
| `refactor/*` | リファクタリング |

### 変更手順

1. **機能ブランチの作成**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **変更の実装**
   - コードを書く
   - テストを書く（TDD推奨）
   - テストが通ることを確認

3. **コミット**
   ```bash
   git add .
   git commit -m "feat: add user profile feature"
   ```

4. **プッシュ**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **プルリクエストの作成**
   - GitHub でプルリクエストを作成
   - レビューを受ける
   - フィードバックに対応する

### コミットメッセージ規約

[Conventional Commits](https://www.conventionalcommits.org/) 形式を使用してください：

```
<type>: <description>

[optional body]
```

| タイプ | 用途 |
|--------|------|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `refactor` | リファクタリング |
| `docs` | ドキュメント |
| `test` | テスト追加・修正 |
| `chore` | その他（設定、ツール等） |
| `perf` | パフォーマンス改善 |
| `ci` | CI/CD関連 |

---

## コマンドリファレンス

### Docker コマンド（Makefile）

プロジェクトルートで `make` コマンドを使用します：

| コマンド | 説明 |
|---------|------|
| `make up` | すべてのコンテナを起動 |
| `make down` | すべてのコンテナを停止 |
| `make ps` | サービスの状態を確認 |
| `make logs` | ログを表示（追従モード） |
| `make restart` | サービスを再起動 |
| `make shell-db` | PostgreSQL に接続（psql） |
| `make shell-backend` | バックエンドコンテナのシェル |
| `make migration-create MSG=message` | マイグレーション作成 |
| `make migration-up` | マイグレーション適用 |
| `make migration-down` | マイグレーション1つ戻す |
| `make destroy` | 全削除（データ含む）**注意** |

### フロントエンド（NPM スクリプト）

`frontend/` ディレクトリで実行：

| コマンド | 説明 |
|---------|------|
| `npm run dev` | Vite 開発サーバー起動（HMR有効） |
| `npm run build` | 本番ビルド |
| `npm run preview` | 本番ビルドのプレビュー |
| `npm run test` | テスト実行（vitest） |
| `npm run test:ui` | UI付きテスト実行 |
| `npm run test:coverage` | カバレッジ付きテスト |
| `npm run lint` | ESLint コード品質チェック |
| `npm run type-check` | TypeScript 型チェック |

### バックエンド（Python）

バックエンドコンテナ内または `backend/` ディレクトリで実行：

| コマンド | 説明 |
|---------|------|
| `pytest` | テスト実行 |
| `pytest -v` | 詳細出力でテスト実行 |
| `pytest tests/test_auth.py` | 特定ファイルのテスト |
| `pytest --cov=app` | カバレッジ付きテスト |
| `alembic upgrade head` | マイグレーション適用 |
| `alembic revision --autogenerate -m "message"` | マイグレーション作成 |

---

## 環境変数

`.env` ファイルで設定する環境変数の一覧です（`.env.example` をコピーして使用）：

### データベース設定

| 変数名 | 用途 | デフォルト/形式 | 備考 |
|--------|------|----------------|------|
| `POSTGRES_USER` | データベースユーザー | `smartoffice` | 本番環境で変更推奨 |
| `POSTGRES_PASSWORD` | データベースパスワード | `changeme` | **本番環境で必ず変更** |
| `POSTGRES_DB` | データベース名 | `smartoffice` | - |
| `POSTGRES_PORT` | PostgreSQL ポート | `5432` | ホスト側ポート |
| `DATABASE_URL` | SQLAlchemy 接続文字列 | `postgresql+asyncpg://...` | **必須** |

### Redis 設定

| 変数名 | 用途 | デフォルト/形式 |
|--------|------|----------------|
| `REDIS_URL` | Redis 接続文字列 | `redis://redis:6379/0` |

### JWT 認証設定

| 変数名 | 用途 | デフォルト/形式 | 備考 |
|--------|------|----------------|------|
| `JWT_SECRET_KEY` | JWT 署名シークレット | **32文字以上** | **本番環境で必ず変更** |
| `JWT_ALGORITHM` | JWT アルゴリズム | `HS256` | - |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | トークン有効期限（分） | `30` | - |

### Ollama 設定

| 変数名 | 用途 | デフォルト/形式 |
|--------|------|----------------|
| `OLLAMA_BASE_URL` | Ollama API エンドポイント | `http://ollama:11434` |
| `OLLAMA_MODEL` | デフォルトモデル名 | `gemma3:12b` |
| `OLLAMA_TIMEOUT` | リクエストタイムアウト（秒） | `120` |

### Caddy 設定

| 変数名 | 用途 | デフォルト/形式 |
|--------|------|----------------|
| `DOMAIN` | Caddy ドメイン | `localhost` |

### フロントエンド設定

| 変数名 | 用途 | デフォルト/形式 |
|--------|------|----------------|
| `VITE_API_URL` | フロントエンド API プロキシ | `http://localhost:8000` |

---

## テスト

### バックエンドテスト（pytest）

```bash
# バックエンドコンテナ内で実行
make shell-backend
pytest

# カバレッジ付き
pytest --cov=app --cov-report=html

# 特定のテストファイル
pytest tests/test_auth.py -v
```

**カバレッジ要件**: 80%以上

### フロントエンドテスト（vitest）

```bash
cd frontend

# テスト実行
npm run test

# UI付き
npm run test:ui

# カバレッジ付き
npm run test:coverage
```

**カバレッジ要件**: 80%以上

### E2E テスト（Playwright）

#### NixOS の場合

NixOS ではシステムに Chromium をインストールする必要があります。

**1. ZaneyOS の場合** (`/home/hart/zaneyos/hosts/<HOSTNAME>/host-packages.nix`):

```nix
environment.systemPackages = with pkgs; [
  audacity
  discord
  nodejs
  chromium    # ← 追加
];
```

**2. 適用**:
```bash
cd /home/hart/zaneyos
sudo nixos-rebuild switch --flake .#<HOSTNAME>
```

**3. E2Eテスト実行**:
```bash
cd frontend
export PLAYWRIGHT_CHROMIUM_PATH=/run/current-system/sw/bin/chromium
npm run test:e2e
```

#### 非 NixOS Linux/macOS/Windows の場合

```bash
cd frontend

# 初回のみ：ブラウザのインストール
npm run test:e2e:install

# E2Eテスト実行
npm run test:e2e

# UIモードで実行
npm run test:e2e:ui

# デバッグモード
npm run test:e2e:debug

# レポート表示
npm run test:e2e:report
```

**カバレッジ要件**: クリティカルなユーザーフロー（ログイン → チャット → ファイルアップロード）

---

## コードスタイル

### フロントエンド（TypeScript/React）

- **命名規則**: キャメルケース（関数・変数）、パスカルケース（コンポーネント・型）
- **不変性**: オブジェクト/配列の直接変更を避ける
- **ファイルサイズ**: 1ファイル200-400行（最大800行）
- **コンポーネント**: 小さく、単一責任を持つ

**良い例**:
```typescript
// ✅ 不変性
function updateUser(user: User, name: string): User {
  return { ...user, name }
}

// ✅ 型定義
interface UserProps {
  id: string
  name: string
}

export function UserCard({ id, name }: UserProps) {
  return <div>{name}</div>
}
```

**悪い例**:
```typescript
// ❌ ミューテーション
function updateUser(user: User, name: string): User {
  user.name = name  // ミューテーション！
  return user
}

// ❌ 型なし
export function UserCard(props) {
  return <div>{props.name}</div>
}
```

### バックエンド（Python/FastAPI）

- **PEP 8** 準拠
- **型ヒント**使用必須
- **Pydantic** で入力検証
- **SQLAlchemy** パラメータ化クエリ（SQLインジェクション対策）

**良い例**:
```python
# ✅ 型ヒント + Pydantic
from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str

@router.post("/users")
async def create_user(data: UserCreate) -> User:
    return await user_service.create(data)
```

---

## セキュリティガイドライン

すべてのコード変更で以下を確認してください：

- [ ] ハードコードされたシークレット（APIキー、パスワード）がない
- [ ] ユーザー入力が検証されている（Pydantic/zod）
- [ ] SQLパラメータ化クエリを使用（SQLインジェクション対策）
- [ ] XSS対策（HTMLサニタイズ）
- [ ] CSRF保護が有効
- [ ] エラーメッセージに機密情報が含まれない

---

## プルリクエスト チェックリスト

プルリクエストを作成する前に、以下を確認してください：

### コード品質

- [ ] コードが読みやすく、適切に命名されている
- [ ] 関数が小さい（50行未満）
- [ ] ファイルがフォーカスされている（800行未満）
- [ ] 深いネストがない（4レベル未満）
- [ ] 適切なエラーハンドリングがある

### テスト

- [ ] 新機能のテストがある
- [ ] 既存テストが壊れていない
- [ ] テストカバレッジ80%以上
- [ ] E2Eテスト（クリティカルな機能）

### ドキュメント

- [ ] README（必要な場合）
- [ ] APIドキュメント（FastAPI自動ドキュメント確認）
- [ ] コメント（複雑なロジックのみ）

### セキュリティ

- [ ] シークレットが露出していない
- [ ] 入力検証がある
- [ ] 認証・認可が適切

---

## Docker サービス構成

| サービス | ポート | 説明 |
|---------|--------|------|
| postgres | 5432 | PostgreSQL 16 + pgvector |
| redis | 6379 | Redis（Valkey 8） |
| ollama | 11434 | ローカルLLM |
| backend | 8000 | FastAPI |
| frontend | 5173 | Vite 開発サーバー |
| caddy | 80/443 | リバースプロキシ |

---

## よくある質問

### Q: ポートが競合しています

A: `.env` ファイルでポート番号を変更してください：
```bash
POSTGRES_PORT=5433
```

### Q: Ollamaが応答しません

A: モデルをダウンロードしてください：
```bash
docker-compose exec ollama ollama pull gemma3:12b
```

### Q: マイグレーションが失敗しました

A: 現在の状態を確認してください：
```bash
make shell-backend
alembic current
alembic history
```

### Q: NixOS で E2E テストが失敗します

A: NixOS ではシステムに Chromium をインストールする必要があります：

**ZaneyOS の場合**:
```bash
# /home/hart/zaneyos/hosts/<HOSTNAME>/host-packages.nix に chromium を追加
environment.systemPackages = with pkgs; [ chromium ];

# 適用
cd /home/hart/zaneyos
sudo nixos-rebuild switch --flake .#<HOSTNAME>

# E2Eテスト実行
cd /path/to/smart-office-ai/frontend
export PLAYWRIGHT_CHROMIUM_PATH=/run/current-system/sw/bin/chromium
npm run test:e2e
```

---

## 追加リソース

- [プロジェクト概要](../README.md)
- [ランブック（運用手順）](./RUNBOOK.md)
- [実装プラン](./implementation-plan.md)
- [FastAPI ドキュメント](https://fastapi.tiangolo.com/)
- [React ドキュメント](https://react.dev/)
- [Vite ガイド](https://vitejs.dev/)

---

## ライセンス

このプロジェクトのライセンスについて詳しくは [LICENSE](../LICENSE) を参照してください。
