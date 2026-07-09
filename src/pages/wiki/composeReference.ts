/**
 * Canonical Docker Compose snippets for wiki install docs.
 * Keep in sync with web/docker-compose.yml and backend/Potok.Backend/docker-compose.yml.
 */

import { WEB_PLUGINS_REPO_URL } from "./wikiConstants";

/** Required stack: web client + API gateway + PostgreSQL. */
export const REQUIRED_COMPOSE = `services:
  # 💻 REQUIRED — Potok web client (Frontend + Wiki)
  potok-web:
    image: ghcr.io/potok-media/potok-web:latest
    container_name: potok-web
    restart: unless-stopped
    ports:
      - "\${WEB_PORT:-3000}:80"
    environment:
      - VITE_DEFAULT_BFF_URL=\${VITE_DEFAULT_BFF_URL:-http://localhost:5000}
      - VITE_BLOCK_SETTINGS_INPUT=\${VITE_BLOCK_SETTINGS_INPUT:-false}
    depends_on:
      - potok-gateway

  # 🌐 REQUIRED — API gateway / BFF (Gateway)
  potok-gateway:
    image: ghcr.io/potok-media/potok-gateway:latest
    container_name: potok-gateway
    restart: unless-stopped
    ports:
      - "\${GATEWAY_PORT:-5000}:\${GATEWAY_PORT:-5000}"
    environment:
      - PORT=\${GATEWAY_PORT:-5000}
      - ConnectionStrings__DefaultConnection=Host=\${DB_HOST:-db};Port=\${DB_PORT:-5432};Database=\${DB_NAME:-potok};Username=\${DB_USER:-potok};Password=\${DB_PASSWORD:-potok};Timeout=30;CommandTimeout=60;
      - Gateway__TmdbApiKey=\${GATEWAY_TMDB_API_KEY}
      - Gateway__MultiUserMode=\${GATEWAY_MULTI_USER_MODE:-false}
      - Gateway__JwtSecret=\${GATEWAY_JWT_SECRET:-default-fallback-gateway-jwt-secret-key-32-chars-long}
    depends_on:
      db:
        condition: service_healthy

  # 🗄️ REQUIRED — PostgreSQL (Gateway dependency)
  db:
    image: postgres:16-alpine
    container_name: potok-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: \${DB_NAME:-potok}
      POSTGRES_USER: \${DB_USER:-potok}
      POSTGRES_PASSWORD: \${DB_PASSWORD:-potok}
    expose:
      - "5432"
    ports:
      - "\${DB_PORT:-5432}:5432"
    volumes:
      - potok-db:/var/lib/postgresql/data
    healthcheck:
      test:
        - CMD-SHELL
        - pg_isready -U \${DB_USER:-potok} -d \${DB_NAME:-potok}
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

volumes:
  potok-db:
    name: potok_db`;

/** Optional add-ons for potok-torrents plugin (SearchEngine + TorrentGo). */
export const OPTIONAL_TORRENT_COMPOSE = `  # 🔍 OPTIONAL — Tracker search (potok-torrents plugin)
  # ${WEB_PLUGINS_REPO_URL}
  potok-searchengine:
    image: ghcr.io/potok-media/potok-searchengine:latest
    container_name: potok-searchengine
    restart: unless-stopped
    ports:
      - "\${SEARCH_ENGINE_PORT:-6000}:\${SEARCH_ENGINE_PORT:-6000}"
    environment:
      - PORT=\${SEARCH_ENGINE_PORT:-6000}
      - ConnectionStrings__DefaultConnection=Host=\${DB_HOST:-db};Port=\${DB_PORT:-5432};Database=\${DB_NAME:-potok};Username=\${DB_USER:-potok};Password=\${DB_PASSWORD:-potok};Timeout=30;CommandTimeout=60;
    volumes:
      - ./config.yml:/app/config.local.yml
    depends_on:
      db:
        condition: service_healthy

  # 🌊 OPTIONAL — BitTorrent streaming (potok-torrents plugin)
  potok-torrentgo:
    image: ghcr.io/potok-media/potok-torrentgo:latest
    container_name: potok-torrentgo
    restart: unless-stopped
    ports:
      - "\${TORRENTGO_PORT:-5282}:\${TORRENTGO_PORT:-5282}"
      # Inbound BitTorrent (DHT / peer listen) — comment out behind NAT / Tailscale:
      # - "55123:55123/udp"
    environment:
      - PORT=\${TORRENTGO_PORT:-5282}
    devices:
      - \${GPU_DEVICE:-/dev/null:/dev/null}`;

export const NGINX_PROXY = `server {
    listen 80;
    server_name wiki.potok.rip;

    location / {
        proxy_pass http://localhost:3000/wiki;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name app.potok.rip;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }

    location /api/ {
        proxy_pass http://localhost:5000/;
        proxy_set_header Host $host;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}`;