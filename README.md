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

Browser client for the **Potok** media service. Connects to a Potok Gateway (BFF) to search
movies and TV shows and stream them via the TorrentGo engine. React 19 + TypeScript + Vite.

## Features

- Search and streaming through the Potok Gateway
- Built-in player (ArtPlayer + HLS) with watch-progress tracking
- Multiple server profiles with isolated Trakt/library cache
- Trakt integration, personal media library, real-time updates (WebSockets)
- Plugin SDK (`PotokSDK`) — see the [wiki](https://potok.rip/wiki)

## Run locally

```bash
npm install
cp .env.example .env      # set the Gateway address
npm run dev               # http://localhost:5173
```

## Docker

```bash
docker compose up -d      # ghcr.io/potok-media/potok-web:latest, http://localhost:3000
```

<details>
<summary><code>docker-compose.yml</code></summary>

```yaml
services:
  # 💻 Potok web client (Frontend)
  potok-web:
    image: ghcr.io/potok-media/potok-web:latest
    container_name: potok-web
    restart: unless-stopped
    ports:
      - "${WEB_PORT:-3000}:80"
    environment:
      - VITE_DEFAULT_BFF_URL=${VITE_DEFAULT_BFF_URL}
      - VITE_BLOCK_SETTINGS_INPUT=${VITE_BLOCK_SETTINGS_INPUT:-false}
```

</details>

## Environment

| Variable | Description | Default |
|---|---|---|
| `VITE_DEFAULT_BFF_URL` | Default Gateway (BFF) address | `http://localhost:5000` |
| `VITE_BLOCK_SETTINGS_INPUT` | Lock connection settings (read-only) | `false` |
| `WEB_PORT` | Host port for the Docker container | `3000` |

## Translations

> [!NOTE]
> 🌐 **Help translate Potok!** The interface is localized via [**Crowdin**](https://crowdin.com/project/potok) — no coding required. Pick your language (or request a new one) and translate strings right in the browser; approved translations ship with the next release.
>
> 👉 **[Start translating on Crowdin →](https://crowdin.com/project/potok)**

## Part of Potok

This is one client of the **Potok** ecosystem:

- 🌐 **Web** — this repository
- ⚙️ **Backend** — Gateway · SearchEngine · TorrentGo
- 🧩 **Plugins & SDK** — extend the UI via `PotokSDK`

🔗 [Live](https://potok.rip) · [Wiki](https://potok.rip/wiki) · [GitHub](https://github.com/potok-media)
