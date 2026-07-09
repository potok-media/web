<div align="center">
  <img src="./.github/assets/logo.svg" alt="Potok" width="120" />

  <h1>Potok</h1>

  **English** · [Русский](./README.ru.md)

  ![Version](https://img.shields.io/badge/version-3.1.0-3b82f6)
  ![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white)
  ![Vite](https://img.shields.io/badge/Vite-646cff?logo=vite&logoColor=white)
  ![Image](https://img.shields.io/badge/ghcr.io-potok--web-181717?logo=docker&logoColor=white)
  ![License](https://img.shields.io/badge/license-MIT-green)
  [![Crowdin](https://badges.crowdin.net/potok/localized.svg)](https://crowdin.com/project/potok)
</div>

Browser client for the **Potok** media service. Connects to a Potok Gateway (BFF) for metadata,
library, and plugins. Torrent search/streaming uses the optional `potok-torrents` plugin
(SearchEngine + TorrentGo). React 19 + TypeScript + Vite.

## Features

- Media library and details through the Potok Gateway
- Built-in player (ArtPlayer + HLS) with watch-progress tracking
- Multiple server profiles with isolated Trakt/library cache
- Trakt integration, real-time updates (WebSockets)
- Plugin SDK (`PotokSDK`) — see the [wiki](https://potok.rip/wiki)

## Full stack (recommended)

Deploy **web + gateway + PostgreSQL** together. For torrents, add SearchEngine and TorrentGo.

Create `docker-compose.yml`, `.env`, and optional `config.yml` in one folder — [wiki install guide](https://potok.rip/wiki). Then:

```bash
docker compose up -d
```

See [backend README](../backend/Potok.Backend/README.md) for Gateway / SearchEngine / TorrentGo details.

## Web only — local dev

```bash
npm install
npm run dev               # http://localhost:5173
```

Create `.env` for local dev:

```env
VITE_DEFAULT_BFF_URL=http://localhost:5000
VITE_BLOCK_SETTINGS_INPUT=false
```

## Web only — Docker

```bash
docker compose up -d      # http://localhost:3000
```

`.env` for the web container:

```env
WEB_PORT=3000
VITE_DEFAULT_BFF_URL=http://localhost:5000
VITE_BLOCK_SETTINGS_INPUT=false
```

<details>
<summary><code>docker-compose.yml</code></summary>

```yaml
services:
  potok-web:
    image: ghcr.io/potok-media/potok-web:latest
    container_name: potok-web
    restart: unless-stopped
    ports:
      - "${WEB_PORT:-3000}:80"
    environment:
      - VITE_DEFAULT_BFF_URL=${VITE_DEFAULT_BFF_URL:-http://localhost:5000}
      - VITE_BLOCK_SETTINGS_INPUT=${VITE_BLOCK_SETTINGS_INPUT:-false}
```

</details>

> Full-stack `.env` (gateway, database, torrents) — in the [wiki install guide](https://potok.rip/wiki).

## Translations

> [!NOTE]
> 🌐 **Help translate Potok!** [**Crowdin**](https://crowdin.com/project/potok) — no coding required.
>
> 👉 **[Start translating on Crowdin →](https://crowdin.com/project/potok)**

## Part of Potok

- 🌐 **Web** — this repository
- ⚙️ **Backend** — Gateway · SearchEngine · TorrentGo
- 🧩 **Plugins & SDK** — `PotokSDK`

🔗 [Live](https://potok.rip) · [Wiki](https://potok.rip/wiki) · [GitHub](https://github.com/potok-media)