.PHONY: up down logs ps restart shell-db shell-backend migration-create migration-up migration-down destroy test test-integration test-unit

# コンテナ起動
up:
	docker-compose up -d

# コンテナ停止
down:
	docker-compose down

# ログ表示
logs:
	docker-compose logs -f

# サービス状態確認
ps:
	docker-compose ps

# 再起動
restart:
	docker-compose restart

# データベース接続
shell-db:
	docker-compose exec postgres psql -U smartoffice

# Backend接続
shell-backend:
	docker-compose exec backend bash

# マイグレーション作成
migration-create:
	docker-compose exec backend alembic revision -m '$(MSG)'

# マイグレーション適用
migration-up:
	docker-compose exec backend alembic upgrade head

# マイグレーション1つ戻す
migration-down:
	docker-compose exec backend alembic downgrade -1

# 全削除（データ含む）
destroy:
	docker-compose down -v

# テスト関連
test: test-unit

# ユニットテストのみ（モック使用、Ollama不要）
test-unit:
	docker-compose exec backend pytest -v -m "not integration"

# 統合テスト（Ollama実接続、事前にOllamaを起動しておく必要あり）
test-integration:
	docker-compose up -d ollama
	echo "Waiting for Ollama to be ready..."
	sleep 5
	docker-compose exec backend pytest -m integration -v

# すべてのテスト
test-all:
	docker-compose up -d ollama
	echo "Waiting for Ollama to be ready..."
	sleep 5
	docker-compose exec backend pytest -v
