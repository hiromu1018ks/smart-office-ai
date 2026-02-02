FROM node:20-alpine

WORKDIR /app

# 依存関係インストール（後でpackage.jsonを作成）
COPY package*.json ./
RUN npm install

# 開発サーバー起動
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
