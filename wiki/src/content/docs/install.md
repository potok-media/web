---
title: "Установка и Docker Compose"
description: "Стек: web, gateway, PostgreSQL. Торренты — SearchEngine, TorrentGo, FlareSolverr, <repo>potok-torrents</repo> из <repo>web-plugins</repo>."
---

<a id="compose"></a>

Стек: web, gateway, PostgreSQL. Торренты — SearchEngine, TorrentGo, FlareSolverr, [potok-torrents](https://github.com/potok-media/web-plugins) из [web-plugins](https://github.com/potok-media/web-plugins).

<a id="quick-start"></a>

## Файлы

-   `docker-compose.yml`
-   `.env`
-   `config.yml` — торренты, см. SearchEngine и TorrentGo

## Compose

```yaml
services:
  # 💻 REQUIRED — Potok web client (Frontend + Wiki)
  potok-web:
    image: ghcr.io/potok-media/potok-web:latest
    container_name: potok-web
    restart: unless-stopped
    ports:
      - "${WEB_PORT:-3000}:80"
    environment:
      - VITE_DEFAULT_BFF_URL=${VITE_DEFAULT_BFF_URL:-http://localhost:5000}
      - VITE_BLOCK_SETTINGS_INPUT=${VITE_BLOCK_SETTINGS_INPUT:-false}
    depends_on:
      - potok-gateway

  # 🌐 REQUIRED — API gateway / BFF (Gateway)
  potok-gateway:
    image: ghcr.io/potok-media/potok-gateway:latest
    container_name: potok-gateway
    restart: unless-stopped
    ports:
      - "${GATEWAY_PORT:-5000}:${GATEWAY_PORT:-5000}"
    environment:
      - PORT=${GATEWAY_PORT:-5000}
      - ConnectionStrings__DefaultConnection=Host=${DB_HOST:-db};Port=${DB_PORT:-5432};Database=${DB_NAME:-potok};Username=${DB_USER:-potok};Password=${DB_PASSWORD:-potok};Timeout=30;CommandTimeout=60;
      - Gateway__TmdbApiKey=${GATEWAY_TMDB_API_KEY:-${TMDB_API_KEY:-2c4fa42c601c29b6fea7ad9b211c46f0}}
      - Gateway__MultiUserMode=${GATEWAY_MULTI_USER_MODE:-false}
      - Gateway__JwtSecret=${GATEWAY_JWT_SECRET:-default-fallback-gateway-jwt-secret-key-32-chars-long}
      # Telegram login (optional): set both to enable sign-in/registration via Telegram
      - Gateway__TelegramBotToken=${GATEWAY_TELEGRAM_BOT_TOKEN:-}
      - Gateway__TelegramBotUsername=${GATEWAY_TELEGRAM_BOT_USERNAME:-}
    depends_on:
      db:
        condition: service_healthy

  # 🗄️ REQUIRED — PostgreSQL (Gateway dependency)
  db:
    image: postgres:16-alpine
    container_name: potok-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME:-potok}
      POSTGRES_USER: ${DB_USER:-potok}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-potok}
    expose:
      - "5432"
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - potok-db:/var/lib/postgresql/data
    healthcheck:
      test:
        - CMD-SHELL
        - pg_isready -U ${DB_USER:-potok} -d ${DB_NAME:-potok}
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

volumes:
  potok-db:
    name: potok_db
```

## Торренты

SearchEngine + TorrentGo + FlareSolverr в compose. URL — в [potok-torrents](https://github.com/potok-media/web-plugins). Порт FlareSolverr 8191 наружу не публикуйте.

```yaml
  # 🔍 OPTIONAL — Tracker search (potok-torrents plugin)
  # https://github.com/potok-media/web-plugins
  potok-searchengine:
    image: ghcr.io/potok-media/potok-searchengine:latest
    container_name: potok-searchengine
    restart: unless-stopped
    ports:
      - "${SEARCH_ENGINE_PORT:-6000}:${SEARCH_ENGINE_PORT:-6000}"
    environment:
      - PORT=${SEARCH_ENGINE_PORT:-6000}
      - ConnectionStrings__DefaultConnection=Host=${DB_HOST:-db};Port=${DB_PORT:-5432};Database=${DB_NAME:-potok};Username=${DB_USER:-potok};Password=${DB_PASSWORD:-potok};Timeout=30;CommandTimeout=60;
    volumes:
      - ./config.yml:/app/config.local.yml
    depends_on:
      db:
        condition: service_healthy
      flaresolverr:
        condition: service_started

  # Cloudflare challenge solver for RU trackers (rutracker.org etc.).
  # SearchEngine talks to it on the compose network. Do not publish 8191.
  flaresolverr:
    image: ghcr.io/flaresolverr/flaresolverr:latest
    container_name: potok-flaresolverr
    restart: unless-stopped
    environment:
      - LOG_LEVEL=info
      - TZ=Europe/Moscow

  # 🌊 OPTIONAL — BitTorrent streaming (potok-torrents plugin)
  potok-torrentgo:
    image: ghcr.io/potok-media/potok-torrentgo:latest
    container_name: potok-torrentgo
    restart: unless-stopped
    ports:
      - "${TORRENTGO_PORT:-5282}:${TORRENTGO_PORT:-5282}"
      # Inbound BitTorrent (DHT / peer listen) — comment out behind NAT / Tailscale:
      # - "55123:55123/udp"
    environment:
      - PORT=${TORRENTGO_PORT:-5282}
      # TMDB lookup for the Add-torrent dialog — same key/fallback chain as the gateway.
      - TMDB_API_KEY=${GATEWAY_TMDB_API_KEY:-${TMDB_API_KEY:-2c4fa42c601c29b6fea7ad9b211c46f0}}
      # Standalone management web UI is OFF by default. Uncomment to expose it, and set
      # POTOK_AUTH_USER/POTOK_AUTH_PASS to protect it (otherwise it's open to anyone).
      # - TORRENTGO_ENABLE_WEBUI=true
    devices:
      - ${GPU_DEVICE:-/dev/null:/dev/null}
```

`config.yml` и сервисы — в SearchEngine и TorrentGo.

### URL в [potok-torrents](https://github.com/potok-media/web-plugins)

searchEngineURL и torrentGoURL — `http://<ip>:6000`, `http://<ip>:5282`. Доступны из браузера, Gateway не проксирует.

<a id="variables"></a>

## .env

`GATEWAY_TMDB_API_KEY` — TMDB (необязательно — если не задан, используется общий ключ по умолчанию). `GATEWAY_MULTI_USER_MODE=true` — саморегистрация, `false` — только вход. `GATEWAY_JWT_SECRET` — сменить в проде. `GATEWAY_TELEGRAM_BOT_TOKEN` + `GATEWAY_TELEGRAM_BOT_USERNAME` — задать оба для входа через Telegram.

```properties
# web
WEB_PORT=3000
VITE_DEFAULT_BFF_URL=http://localhost:5000
VITE_BLOCK_SETTINGS_INPUT=false

# gateway — https://www.themoviedb.org/
GATEWAY_PORT=5000
# TMDB key is OPTIONAL — a shared default is used if left blank. Set your own to avoid rate sharing.
GATEWAY_TMDB_API_KEY=
GATEWAY_MULTI_USER_MODE=false
GATEWAY_JWT_SECRET=change-me-in-production-32chars-min
# Telegram login (optional) — set both to enable sign-in/registration via Telegram
GATEWAY_TELEGRAM_BOT_TOKEN=
GATEWAY_TELEGRAM_BOT_USERNAME=

# database (bundled db service)
DB_HOST=db
DB_PORT=5432
DB_NAME=potok
DB_USER=potok
DB_PASSWORD=changeme

# torrents (optional)
SEARCH_ENGINE_PORT=6000
TORRENTGO_PORT=5282
# GPU_DEVICE=/dev/dri:/dev/dri
```

<a id="run"></a>

## Запуск

```bash
docker compose up -d
```

<a id="local"></a>

## Из этого репозитория

Образы web, gateway, `SearchEngine` и `TorrentGo` собираются из Dockerfile в дереве, не с GHCR. Postgres и FlareSolverr — публичные образы. Из корня репозитория:

```bash
docker compose -f docker-compose.local.yml up --build
```

<a id="nginx"></a>

## Nginx

`potok.rip` → :3000, `api.potok.rip` → :5000. `wiki.potok.rip` — прокси на `/wiki` (+ `/assets/`); с корня редирект на `/wiki`. `VITE_DEFAULT_BFF_URL=https://api.potok.rip`.

```nginx
server {
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
}
```
