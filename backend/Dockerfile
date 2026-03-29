FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests first for better Docker layer caching.
COPY package*.json ./

# Install all dependencies (includes dev deps needed when running npm run dev).
RUN npm ci

# Copy application source.
COPY . .

EXPOSE 5000

# Runtime environment variables are provided via docker-compose env_file/environment.
CMD ["node", "server.js"]
