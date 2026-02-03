# ランブック (Runbook)

Smart Office AI の運用・監視・トラブルシューティングの手順書です。

## 目次

1. [デプロイ手順](#デプロイ手順)
2. [監視とヘルスチェック](#監視とヘルスチェック)
3. [一般的な問題と解決策](#一般的な問題と解決策)
4. [ロールバック手順](#ロールバック手順)
5. [データバックアップ・リストア](#データバックアップ・リストア)

---

## デプロイ手順

### 初期デプロイ

```bash
# 1. リポジトリのクローン
git clone <repository-url>
cd smart-office-ai

# 2. 環境変数の設定
cp .env.example .env
vim .env  # 必須項目を編集

# 3. シークレットキーの生成（本番環境）
openssl rand -hex 32  # JWT_SECRET_KEY 用

# 4. コンテナの起動
# Note: Docker Compose V2 では `docker compose` を使用します
docker compose up -d

# 5. データベースマイグレーション
docker compose exec backend alembic upgrade head

# 6. 動作確認
curl https://your-domain.com/health
```

### アップデートデプロイ

```bash
# 1. 最新コードの取得
git pull origin main

# 2. 新しい環境変数の確認
vim .env

# 3. イメージの再ビルド
docker compose build backend frontend

# 4. コンテナの再起動
docker compose up -d

# 5. マイグレーションの適用（必要な場合）
docker compose exec backend alembic upgrade head

# 6. ヘルスチェック
curl https://your-domain.com/health
```

### ゼロダウンタイムデプロイ（推奨）

```bash
# 1. 新しいコンテナで起動
docker compose -f docker-compose.yml -f docker-compose.new.yml up -d

# 2. ヘルスチェック
curl https://your-domain.com/health

# 3. 古いコンテナを停止
docker compose -f docker-compose.yml down
```

---

## 監視とヘルスチェック

### ヘルスチェックエンドポイント

```bash
# バックエンドヘルスチェック
curl https://your-domain.com/health
# 期待されるレスポンス: {"status":"ok"}

# AIサービスヘルスチェック
curl https://your-domain.com/api/v1/ai/health
# 期待されるレスポンス: {"status":"healthy","ollama_reachable":true}

# データベース接続チェック
docker-compose exec backend python -c "from app.core.database import init_db; import asyncio; asyncio.run(init_db())"
```

### サービス状態確認

```bash
# 全サービスの状態
docker compose ps

# 個別のサービス状態
docker compose ps backend
docker compose ps postgres
docker compose ps redis
docker compose ps ollama
docker compose ps caddy

# AIサービスヘルスチェック
curl http://localhost:8000/api/v1/ai/health
curl http://localhost:8000/api/v1/ai/models

# リソース使用状況
docker stats
```

### ログ監視

```bash
# バックエンドログ（エラーのみ）
docker compose logs backend | grep -i error

# データベースログ
docker compose logs postgres | tail -100

# 全サービスの最新ログ
docker compose logs --tail=50 --follow
```

### アラート設定（推奨）

| メトリクス | 閾値 | アクション |
|-----------|------|---------|
| API応答時間 | > 5秒 | スケールアウト検討 |
| エラーレート | > 5% | ログ調査 |
| データベース接続 | 利用率 > 80% | プールサイズ増加 |
| ディスク使用量 | > 80% | ログローテーション、古いデータ削除 |
| メモリ使用量 | > 85% | コンテナ再起動 or スケールアップ |

---

## 一般的な問題と解決策

### バックエンド関連

#### 問題: APIが応答しない

**症状**: `curl` でタイムアウト、または 502/504 エラー

**診断**:
```bash
docker compose ps backend
docker compose logs backend --tail=100
```

**解決策**:
```bash
# コンテナの再起動
docker compose restart backend

# 問題が解決しない場合、再ビルド
docker compose build backend
docker compose up -d backend
```

#### 問題: データベース接続エラー

**症状**: `connection refused` または `could not connect to server`

**診断**:
```bash
docker compose ps postgres
docker compose logs postgres --tail=50
```

**解決策**:
```bash
# PostgreSQL の再起動
docker-compose restart postgres

# データベースの状態確認
make shell-db
# psql内で: SELECT pg_is_in_recovery();
```

#### 問題: マイグレーション失敗

**症状**: `alembic upgrade head` がエラー

**診断**:
```bash
docker compose exec backend alembic current
docker compose exec backend alembic history
```

**解決策**:
```bash
# 1つ戻す
docker compose exec backend alembic downgrade -1

# スキップして強制適用（緊急時のみ）
docker compose exec backend alembic stamp head
```

### フロントエンド関連

#### 問題: 画面が真っ白

**診断**:
```bash
# ブラウザコンソールを確認（F12）
# ネットワークタブで API リクエストの失敗を確認
```

**解決策**:
```bash
# フロントエンドの再ビルド
docker compose build frontend
docker compose up -d frontend
```

### AI関連

#### 問題: Ollamaが応答しない

**診断**:
```bash
curl http://localhost:11434/api/tags
docker-compose logs ollama --tail=50
```

**解決策**:
```bash
# Ollama コンテナの再起動
docker compose restart ollama

# モデルの再プル
docker compose exec ollama ollama pull gemma3:12b
```

---

## ロールバック手順

### コードのロールバック

```bash
# 1. 前のコミットを確認
git log --oneline -10

# 2. 前の安定版に戻す
git checkout <previous-stable-commit>

# 3. 再デプロイ
docker compose build backend frontend
docker compose up -d

# 4. マイグレーションのロールバック（必要な場合）
docker compose exec backend alembic downgrade -1
```

### データベースマイグレーションのロールバック

```bash
# 1つ戻す
docker compose exec backend alembic downgrade -1

# 特定のバージョンへ戻す
docker compose exec backend alembic downgrade <revision_id>

# 全て戻す（ベースラインへ）
docker compose exec backend alembic downgrade base
```

### 緊急ロールバック（全システム）

```bash
# 1. システム停止
docker compose down

# 2. 前の安定版イメージを使用
# docker-compose.yml でイメージタグを変更

# 3. 再起動
docker compose up -d
```

---

## データバックアップ・リストア

### データベースバックアップ

```bash
# バックアップ作成
docker compose exec postgres pg_dump -U smartoffice smartoffice > backup_$(date +%Y%m%d).sql

# 圧縮付きバックアップ
docker compose exec postgres pg_dump -U smartoffice smartoffice | gzip > backup_$(date +%Y%m%d).sql.gz

# 自動バックアップ（cronジョブ）
# 毎日午前2時にバックアップ
0 2 * * * docker compose exec postgres pg_dump -U smartoffice smartoffice | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz
```

### データベースリストア

```bash
# バックアップからのリストア
gunzip -c backup_20250101.sql.gz | docker compose exec -T postgres psql -U smartoffice smartoffice

# または
cat backup_20250101.sql | docker compose exec -T postgres psql -U smartoffice smartoffice
```

### ボリュームバックアップ（Docker）

```bash
# ボリュームの確認
docker volume ls

# ボリュームのバックアップ（tar形式）
docker run --rm -v smartoffice_ai_db_data:/data -v $(pwd):/backup alpine tar czf /backup/db_backup.tar.gz -C /data .

# ボリュームからのリストア
docker run --rm -v smartoffice_ai_db_data:/data -v $(pwd):/backup alpine tar xzf /backup/db_backup.tar.gz -C /data
```

---

## メンテナンス

### 定期メンテナンスタスク

| 頻度 | タスク | コマンド |
|------|------|--------|
| 毎日 | バックアップ | `pg_dump` またはボリュームスナップショット |
| 毎週 | ログローテーション確認 | `docker logs --tail 1000` |
| 毎月 | セキュリティアップデート | `docker-compose build --no-cache` |
| 毎四半期 | 未使用データのアーカイブ | 直接DB操作またはスクリプト |

### ログのクリーンアップ

```bash
# Docker ログのクリーンアップ
docker system prune -a

# 特定コンテナのログサイズ制限設定
# docker-compose.yml に追加:
# logging:
#   driver: "json-file"
#   options:
#     max-size: "10m"
#     max-file: "3"
```

---

## 緊急時の連絡先

| 役割 | 担当者 | 連絡先 |
|------|--------|--------|
| システム管理者 | - | - |
| データベース管理者 | - | - |
| 開発リード | - | - |

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|----------|
| 2025-02-02 | 1.0.0 | 初版リリース |
