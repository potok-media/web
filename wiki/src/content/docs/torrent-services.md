---
title: "SearchEngine и TorrentGo"
description: "Опциональные backend-сервисы для торрентов. Работают с плагином <repo>potok-torrents</repo> из <repo>web-plugins</repo>. Gateway их не проксирует — плагин ходит напрямую из браузера."
---

<a id="overview"></a>

Опциональные backend-сервисы для торрентов. Работают с плагином [potok-torrents](https://github.com/potok-media/web-plugins) из [web-plugins](https://github.com/potok-media/web-plugins). Gateway их не проксирует — плагин ходит напрямую из браузера.

<a id="architecture"></a>

## Схема

Тот же compose, что web/gateway.

<a id="searchengine"></a>

## SearchEngine

Поиск по трекерам, кеш результатов в `PostgreSQL`. Порт по умолчанию 6000 (`SEARCH_ENGINE_PORT`).

-   `config.yml` рядом с `docker-compose.yml` — монтируется как `config.local.yml`
-   Креды трекеров и источники — только в `config.yml`
-   proxy.list — массив URL (socks5://user:pass@host:port или http://host:port); несколько — по кругу на запрос, Cloudflare держит один IP на сессию браузера; \[\] — домашний IP
-   flaresolverr — sidecar обхода Cloudflare; в compose URL http://flaresolverr:8191/v1, порт 8191 не публиковать; заложите ~1 ГБ RAM
-   При старте опрашиваются хосты включённых трекеров — браузер только если Cloudflare отвечает challenge
-   Порт — `PORT` / `SEARCH_ENGINE_PORT`, не в `yaml`

<a id="torrentgo"></a>

## TorrentGo

BitTorrent-стриминг: скачивание, HLS, метаданные файлов. Stateless, `PostgreSQL` не нужен. Порт по умолчанию 5282 (`TORRENTGO_PORT`).

-   GPU: `GPU_DEVICE`\=/dev/dri:/dev/dri в compose для HW-транскода
-   `POTOK_DISABLE_HWACCEL`\=1 — софтверный транскод
-   UDP 55123 за NAT без проброса можно не публиковать — outbound хватит для стриминга

<a id="plugin"></a>

## Плагин

В [potok-torrents](https://github.com/potok-media/web-plugins): searchEngineURL и torrentGoURL — `http://<ip>:6000`, `http://<ip>:5282`.

<a id="config"></a>

## config.yml

Референс: `src/Potok.Backend.SearchEngine/config.yml`

```yaml
# ./config.yml next to docker-compose.yml → mounted as config.local.yml

cache:
  enable: true
  expiry: 15
  auth-expiry: 1

refresh:
  enable: false
  timeout: 1440
  older-than-min: 180
  limit: 50

ffprobe:
  enable: false
  timeout: 60
  tsuri: ''
  batch-size: 20
  attempts: 3
  authorization:
    login: ''
    password: ''

# Прокси для HTTP-запросов SearchEngine к трекерам. list: [] — без прокси.
# Элемент: url (обязательно), username/password — если прокси с авторизацией.
proxy:
  bypass-on-local: false
  list:
    - url: 'http://proxy.example.com:8080'
      username: ''
      password: ''

# Cloudflare bypass via FlareSolverr (headless Chrome next to SearchEngine).
# Local debug: http://127.0.0.1:8191/v1  |  compose: http://flaresolverr:8191/v1
flaresolverr:
  enable: true
  url: http://flaresolverr:8191/v1
  max-timeout-ms: 180000
  session-idle-minutes: 30
  guarded-hours: 6
  recheck-minutes: 30

rutracker:
  enable-search: true
  authorization:
    login: ''
    password: ''
  popular:
    enable: false
    timeout: 600
    max-pages: 3
    categories: [1106, 1105, 2491, 1389]

animelayer:
  enable-search: true
  authorization:
    login: ''
    password: ''

nnmclub:
  enable-search: true

rutor:
  enable-search: true

aniliberty:
  enable-search: true

kinozal:
  enable-search: true
  authorization:
    login: ''
    password: ''

megapeer:
  enable-search: true
```
