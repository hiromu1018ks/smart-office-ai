FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy configuration files
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY vitest.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.cjs ./
COPY eslint.config.js ./

# Copy source files
COPY index.html ./
COPY src/ ./src/
COPY public/ ./public/

# Development server startup
# Note: In production, we'd use "npm run build" and serve static files
# But for development with HMR, we run the dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
