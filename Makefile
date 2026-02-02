.PHONY: up down logs ps restart shell-db shell-backend

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

# 全削除（データ含む）
destroy:
	docker-compose down -v
