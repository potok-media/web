<div align="center">
  <img src="./.github/assets/logo.svg" alt="Potok" width="120" />

  <h1>Potok</h1>

  [English](./README.md) · **Русский**

  ![Version](https://img.shields.io/badge/version-3.1.0-3b82f6)
  ![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white)
  ![Vite](https://img.shields.io/badge/Vite-646cff?logo=vite&logoColor=white)
  ![Image](https://img.shields.io/badge/ghcr.io-potok--web-181717?logo=docker&logoColor=white)
  ![License](https://img.shields.io/badge/license-MIT-green)
  [![Crowdin](https://badges.crowdin.net/potok/localized.svg)](https://crowdin.com/project/potok)
</div>

Браузерный клиент медиа-сервиса **Potok**. Работает через шлюз Potok Gateway (BFF): метаданные,
медиатека, плагины. Поиск и стриминг торрентов — через опциональный плагин `potok-torrents`
(SearchEngine + TorrentGo). React 19 + TypeScript + Vite.

## Возможности

- Медиатека и карточки через Potok Gateway
- Встроенный плеер (ArtPlayer + HLS) с отслеживанием прогресса
- Несколько профилей серверов с изоляцией кэша Trakt/медиатеки
- Интеграция с Trakt, обновления в реальном времени (WebSockets)
- SDK для плагинов (`PotokSDK`) — см. [вики](https://potok.rip/wiki)

## Полный стек (рекомендуется)

Разворачивайте **web + gateway + PostgreSQL** вместе. Для торрентов добавьте SearchEngine и TorrentGo.

Создайте в одной папке `docker-compose.yml`, `.env` и при необходимости `config.yml` — [вики, установка](https://potok.rip/wiki). Затем:

```bash
docker compose up -d
```

Подробности по backend: [README backend](../backend/Potok.Backend/README.ru.md).

## Только web — локальная разработка

```bash
npm install
npm run dev               # http://localhost:5173
```

`.env` для локальной разработки:

```env
VITE_DEFAULT_BFF_URL=http://localhost:5000
VITE_BLOCK_SETTINGS_INPUT=false
```

## Только web — Docker

```bash
docker compose up -d      # http://localhost:3000
```

`.env` для контейнера web:

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

> Полный `.env` (gateway, БД, торренты) — в [вики, установка](https://potok.rip/wiki).

## Переводы

> [!NOTE]
> 🌐 **Помогите с переводом Potok!** [**Crowdin**](https://crowdin.com/project/potok).
>
> 👉 **[Перевести на Crowdin →](https://crowdin.com/project/potok)**

## Часть Potok

- 🌐 **Web** — этот репозиторий
- ⚙️ **Backend** — Gateway · SearchEngine · TorrentGo
- 🧩 **Плагины и SDK** — `PotokSDK`

🔗 [Сайт](https://potok.rip) · [Вики](https://potok.rip/wiki) · [GitHub](https://github.com/potok-media)