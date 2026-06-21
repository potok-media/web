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

Браузерный клиент медиа-сервиса **Potok**. Работает через шлюз Potok Gateway (BFF): поиск
фильмов и сериалов и стриминг через движок TorrentGo. React 19 + TypeScript + Vite.

## Возможности

- Поиск и стриминг через шлюз Potok Gateway
- Встроенный плеер (ArtPlayer + HLS) с отслеживанием прогресса просмотра
- Несколько профилей серверов с изоляцией кэша Trakt/медиатеки
- Интеграция с Trakt, личная медиатека, обновления в реальном времени (WebSockets)
- SDK для плагинов (`PotokSDK`) — см. [вики](https://potok.rip/wiki)

## Локальный запуск

```bash
npm install
cp .env.example .env      # укажите адрес шлюза
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

## Переменные окружения

| Переменная | Описание | По умолчанию |
|---|---|---|
| `VITE_DEFAULT_BFF_URL` | Адрес шлюза Gateway (BFF) по умолчанию | `http://localhost:5000` |
| `VITE_BLOCK_SETTINGS_INPUT` | Блокировка настроек подключения (только чтение) | `false` |
| `WEB_PORT` | Порт хоста для Docker-контейнера | `3000` |

## Переводы

> [!NOTE]
> 🌐 **Помогите с переводом Potok!** Интерфейс локализуется через [**Crowdin**](https://crowdin.com/project/potok) — без программирования. Выберите свой язык (или предложите новый) и переводите строки прямо в браузере; одобренные переводы попадут в следующий релиз.
>
> 👉 **[Перевести на Crowdin →](https://crowdin.com/project/potok)**

## Часть Potok

Это один из клиентов экосистемы **Potok**:

- 🌐 **Web** — этот репозиторий
- ⚙️ **Backend** — Gateway · SearchEngine · TorrentGo
- 🧩 **Плагины и SDK** — расширение интерфейса через `PotokSDK`

🔗 [Сайт](https://potok.rip) · [Вики](https://potok.rip/wiki) · [GitHub](https://github.com/potok-media)
