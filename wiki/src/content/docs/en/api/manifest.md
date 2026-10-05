---
title: "Manifest specification"
description: "manifest.json in the plugin root — id, slots, permissions, config for the host."
---

<a id="fields"></a>

`manifest.json` in the plugin root — id, slots, permissions, config for the host.

## Manifest fields

| Field | Type | Description |
| --- | --- | --- |
| `id` | string (required) | Unique plugin identifier (e.g. [potok-torrents](https://github.com/potok-media/web-plugins) from [web-plugins](https://github.com/potok-media/web-plugins)). |
| `name` | string (required) | Plugin name shown in the UI. |
| `version` | string (optional) | Plugin version in `SemVer` format (e.g. 1.0.0). |
| `description` | string (optional) | Short description of the extension purpose and features. |
| `author` | string (optional) | Author or development team. |
| `entrypoint` | string (required) | Path to compiled JS relative to the plugin folder (usually `index.js`). |
| `category` | string (optional) | Extension category: `sources` for media `sources`, `visual` for themes, other for misc. |
| `permissions` | string\[\] (optional) | Requested security permissions (storage, `http-proxy`, `ui-notifications`). |
| `slots` | object\[\] (optional) | UI slot contributions; each entry has id, `slotName`, and title. |
| `config` | object (optional) | Configurable plugin settings rendered in the host settings panel. |

<a id="permissions"></a>

## Permissions

API without a manifest permission — blocked by the runtime:

-   storage — `storage.local` (keys, cache).
-   `http-proxy` — `http.get`/post via host proxy (`CORS`).
-   `ui-notifications` — `ui.showHUD()` and system notifications.
-   `custom-css` — `ui.injectHostCss()` (inject/replace global CSS).

<a id="slots-section"></a>

## Slots (slotName)

`slotName` values in the slots array:

| Slot (slotName) | Description |
| --- | --- |
| `sidebar-menu` | Top section of the sidebar menu (top-level navigation). |
| `sidebar-menu-home` | Extra menu items near Home. |
| `sidebar-menu-library` | Extra menu items in Library. |
| `sidebar-status` | Bottom of the sidebar (status/service buttons). |
| `media-actions` | Action block on movie/series details (e.g. play buttons). |
| `details-bottom` | Panel below main media details. |
| `settings-color-accent` | Settings slot for color palette and themes. |
| `settings-tabs` | Custom tabs in host settings. |
| `extension-page` | Full-screen extension page. |

<a id="config-section"></a>

## Plugin config

config — plugin settings in the host UI. Each key is an object with:

| Property field | Type | Description |
| --- | --- | --- |
| `type` | string (required) | Setting value type: "string", "boolean" (toggle), "number", "select" (dropdown), or "notice" (orange warning banner). |
| `default` | any (required) | Default value; type must match the type field. |
| `label` | string (required) | Label shown to the user in settings. |
| `dependsOn` | string (optional) | Another config key controlling visibility of this setting. |

<a id="manifest-example"></a>

## manifest.json

[potok-torrents](https://github.com/potok-media/web-plugins) from [web-plugins](https://github.com/potok-media/web-plugins):

```json
{
  "id": "potok-torrents",
  "name": "Torrent search",
  "version": "1.0.0",
  "description": "Search and stream torrents from tracker databases",
  "author": "Potok Team",
  "category": "sources",
  "entrypoint": "index.js",
  "permissions": [
    "storage",
    "http-proxy",
    "ui-notifications"
  ],
  "slots": [
    {
      "id": "torrents-media-actions",
      "slotName": "media-actions",
      "title": "Watch"
    },
    {
      "id": "torrents-sidebar-status",
      "slotName": "sidebar-status",
      "title": "Torrent status"
    }
  ],
  "config": {
    "torrentGoURL": {
      "type": "string",
      "default": "https://torrent.potok.rip",
      "label": "TorrentGo URL"
    },
    "searchEngineURL": {
      "type": "string",
      "default": "https://search.potok.rip",
      "label": "SearchEngine URL"
    }
  }
}
```
