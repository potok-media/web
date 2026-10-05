---
title: "SearchEngine & TorrentGo"
description: "Optional backend services for torrents. Used with the <repo>potok-torrents</repo> plugin from <repo>web-plugins</repo>. Gateway does not proxy them — the plugin talks to them directly from the browser."
---

<a id="overview"></a>

Optional backend services for torrents. Used with the [potok-torrents](https://github.com/potok-media/web-plugins) plugin from [web-plugins](https://github.com/potok-media/web-plugins). Gateway does not proxy them — the plugin talks to them directly from the browser.

<a id="architecture"></a>

## Architecture

Same compose as web/gateway.

<a id="searchengine"></a>

## SearchEngine

Tracker search, results cached in `PostgreSQL`. Default port 6000 (`SEARCH_ENGINE_PORT`).

-   `config.yml` next to `docker-compose.yml` — mounted as `config.local.yml`
-   Tracker credentials and `sources` — only in `config.yml`
-   proxy.list — array of URLs (socks5://user:pass@host:port or http://host:port); several rotate per request, Cloudflare pins one IP per browser session; \[\] — home IP
-   flaresolverr — Cloudflare bypass sidecar; compose URL http://flaresolverr:8191/v1, do not publish 8191; budget extra ~1 GiB RAM
-   Enabled tracker hosts are probed on start; the browser is used only when Cloudflare challenges
-   Port is `PORT` / `SEARCH_ENGINE_PORT`, not in `yaml`

<a id="torrentgo"></a>

## TorrentGo

BitTorrent streaming: download, HLS, file metadata. Stateless, no `PostgreSQL`. Default port 5282 (`TORRENTGO_PORT`).

-   GPU: `GPU_DEVICE`\=/dev/dri:/dev/dri in compose for HW transcoding
-   `POTOK_DISABLE_HWACCEL`\=1 forces software transcoding
-   UDP 55123 can stay unpublished behind NAT — outbound is enough for streaming

<a id="plugin"></a>

## Plugin

In [potok-torrents](https://github.com/potok-media/web-plugins): searchEngineURL and torrentGoURL — `http://<ip>:6000`, `http://<ip>:5282`.

<a id="config"></a>

## config.yml

Reference: `src/Potok.Backend.SearchEngine/config.yml`

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
