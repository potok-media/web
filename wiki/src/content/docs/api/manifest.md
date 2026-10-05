---
title: "Спецификация Манифеста"
description: "manifest.json в корне плагина — id, слоты, permissions, config для хоста."
---

<a id="fields"></a>

`manifest.json` в корне плагина — id, слоты, permissions, config для хоста.

## Поля манифеста

| Поле | Тип | Описание |
| --- | --- | --- |
| `id` | string (required) | Уникальный строковый идентификатор плагина (например, [potok-torrents](https://github.com/potok-media/web-plugins) из [web-plugins](https://github.com/potok-media/web-plugins)). |
| `name` | string (required) | Название плагина для показа пользователю в интерфейсе. |
| `version` | string (optional) | Версия плагина в формате `SemVer` (например, 1.0.0). |
| `description` | string (optional) | Краткое описание назначения и возможностей расширения. |
| `author` | string (optional) | Автор или команда разработчиков расширения. |
| `entrypoint` | string (required) | Путь к скомпилированному JS-файлу относительно папки плагина (обычно `index.js`). |
| `category` | string (optional) | Категория расширения: `sources` для источников медиа, `visual` для тем оформления, other для прочего. |
| `permissions` | string\[\] (optional) | Список запрашиваемых разрешений безопасности (storage, `http-proxy`, `ui-notifications`). |
| `slots` | object\[\] (optional) | Список точек встраивания UI плагина. Каждый объект описывает id вклада, `slotName` целевого слота и title. |
| `config` | object (optional) | Набор настраиваемых параметров расширения, доступных для редактирования в панели настроек. |

<a id="permissions"></a>

## Разрешения (Permissions)

API без permission из манифеста — блокируется рантаймом:

-   storage — `storage.local` (ключи, кэш).
-   `http-proxy` — `http.get`/post через прокси хоста (`CORS`).
-   `ui-notifications` — `ui.showHUD()` и системные уведомления.
-   `custom-css` — `ui.injectHostCss()` (внедрение/замена глобального CSS).

<a id="slots-section"></a>

## Слоты (slotName)

Значения `slotName` в массиве slots:

| Слот (slotName) | Описание |
| --- | --- |
| `sidebar-menu` | Верхняя секция меню боковой панели (самый верхний уровень навигации). |
| `sidebar-menu-home` | Дополнительные пункты меню рядом с разделом «Главная». |
| `sidebar-menu-library` | Дополнительные пункты меню в разделе «Медиатека». |
| `sidebar-status` | Нижняя часть боковой панели (для отображения статуса/сервисных кнопок). |
| `media-actions` | Блок действий на странице фильма или сериала (например, кнопки запуска просмотра). |
| `details-bottom` | Панель под основной информацией о медиафайле в деталях. |
| `settings-color-accent` | Слот настроек для управления цветовой палитрой и оформлениями. |
| `settings-tabs` | Добавление кастомных вкладок в панель настроек хост-приложения. |
| `extension-page` | Страница расширения, открывающаяся во весь экран. |

<a id="config-section"></a>

## Config

config — настройки плагина в UI хоста. Каждый ключ — объект с полями:

| Поле свойства | Тип | Описание |
| --- | --- | --- |
| `type` | string (required) | Тип значения настройки. Поддерживаемые типы: "string", "boolean" (рендерится как тумблер), "number", "select" (выпадающий список опций) и "notice" (подсвечиваемая оранжевая инфо-плашка для вывода предупреждений). |
| `default` | any (required) | Значение по умолчанию. Тип совпадает с type. |
| `label` | string (required) | Текстовая метка (заголовок), которая будет отображаться пользователю в панели настроек. |
| `dependsOn` | string (optional) | Имя другого параметра из config, от включения или значения которого зависит видимость текущей настройки. |

<a id="manifest-example"></a>

## manifest.json

[potok-torrents](https://github.com/potok-media/web-plugins) из [web-plugins](https://github.com/potok-media/web-plugins):

```json
{
  "id": "potok-torrents",
  "name": "Поиск торрентов",
  "version": "1.0.0",
  "description": "Поиск и стриминг раздач из базы торрент-трекеров",
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
      "title": "Смотреть"
    },
    {
      "id": "torrents-sidebar-status",
      "slotName": "sidebar-status",
      "title": "Статус Торрентов"
    }
  ],
  "config": {
    "torrentGoURL": {
      "type": "string",
      "default": "https://torrent.potok.rip",
      "label": "Адрес TorrentGo"
    },
    "searchEngineURL": {
      "type": "string",
      "default": "https://search.potok.rip",
      "label": "Адрес SearchEngine"
    }
  }
}
```
