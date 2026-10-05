---
title: "Глобальные методы UI"
description: "PotokSDK.ui — рендер, HUD, плеер, навигация, регистрация."
---

<a id="render"></a>

`PotokSDK.ui` — рендер, HUD, плеер, навигация, регистрация.

<a id="render-method"></a>

## ui.render()

`ui.render(component`, `slotId`?) — компиляция разметки и отправка хосту. `slotId` — проекция в слот; без него — экран песочницы.

<a id="hud"></a>

## Уведомления HUD

Метод `ui.showHUD(type`: string, message: string) вызывает кратковременный системный баннер в углу экрана. Поддерживаемые типы: "success", "error", "info", "warning".

<a id="player"></a>

## Запуск Видеоплеера

`ui.playVideo(playbackInfo)` — полноэкранный плеер. Поля `playbackInfo`:

```javascript
ui.playVideo({
  streamUrl: "http://example.com/video.m3u8",
  streamType: "m3u8",
  title: "Название фильма",
  season: 1,
  episode: 3,
  torrentHash: "abc123def456",
  fileIndex: "0",
  audios: [
    { id: "ru", name: "Русский дубляж", url: "http://example.com/video_ru.m3u8" },
    { id: "en", name: "Английский оригинал", url: "http://example.com/video_en.m3u8" }
  ],
  headers: { "User-Agent": "PotokPlayer" },
  providerId: "my-torrents",
  voice: "dub",
  subtitles: [
    {
      id: "ru-vtt",
      src: "http://example.com/subs_ru.vtt",
      label: "Русские",
      language: "ru",
      isDefault: true,
      format: "vtt",
      name: "Русские",
      srclang: "ru",
      url: "http://example.com/subs_ru.vtt"
    }
  ],
  session: {
    keepaliveUrl: "http://example.com/session/keepalive",
    stopUrl: "http://example.com/session/stop",
    intervalSec: 30,
    hash: "abc123def456",
    file: "0",
    statusUrl: "http://example.com/session/status",
    statusIntervalSec: 5
  },
  duration: 7200,
  introStart: 0,
  introEnd: 90,
  outroStart: 7080,
  outroEnd: 7200,
  thumbnails: {
    urlTemplate: "http://example.com/thumbs/{time}.jpg",
    intervalSec: 5
  },
  requiresBuffering: false
});
```

<a id="ep-selector"></a>

## Селектор Серий

Метод `ui.showEpisodeSelector(config)` вызывает системное всплывающее окно для выбора сезонов и серий, разработанное специально для сериалов.

```javascript
ui.showEpisodeSelector({
  title: "Имя сериала",
  seasons: [
    {
      id: 1,
      seasonNumber: 1,
      season_number: 1,
      episodes: [
        {
          id: 101,
          episodeNumber: 1,
          episode_number: 1,
          name: "Серия 1",
          stillPath: "https://image.tmdb.org/t/p/w500/example.jpg",
          still_path: "https://image.tmdb.org/t/p/w500/example.jpg",
          airDate: "2011-04-17",
          air_date: "2011-04-17",
          overview: "Описание серии"
        }
      ]
    }
  ],
  episodes: [
    {
      id: "s01e01",
      season: 1,
      episode: 1,
      rawSeason: 1,
      rawEpisode: 1,
      title: "Серия 1",
      fileName: "Show.S01E01.mkv",
      stillPath: "https://image.tmdb.org/t/p/w500/example.jpg",
      airDate: "2011-04-17",
      isWatched: false,
      sizeLabel: "1.2 GB",
      audios: [
        { id: "ru", name: "Русский дубляж", url: "http://example.com/s01e01_ru.m3u8" },
        { id: "en", name: "Английский оригинал", url: "http://example.com/s01e01_en.m3u8" }
      ],
      url: "http://example.com/s01e01.m3u8"
    }
  ],
  seasonsLoading: false,
  isSaving: false,
  tmdbSeasonsCount: 8,
  onPlay: (ep, audioId) => {
    console.log("Playing:", ep.season, ep.episode, audioId);
  },
  onStartEditing: () => {
    console.log("Editing started");
  },
  onApplyOverride: (seasonNum, epNum) => {
    console.log("Override applied:", seasonNum, epNum);
  },
  onClose: () => {
    console.log("Selector closed");
  }
});
```

<a id="navigation"></a>

## Навигация

`ui.navigateTo(to`, state?) — переход в раздел хоста (/settings, /library, …):

```javascript
ui.navigateTo("/settings");
ui.navigateTo("/library", { filter: "watchlist" });
```

<a id="themes"></a>

## Темы оформления

Кастомные темы и акцент:

-   `ui.registerThemes(themes)` — регистрация Theme\[\] на хосте.
-   `ui.setAccentTheme(themeId)` — переключение акцента.

<a id="inject-css"></a>

## Свой CSS (injectHostCss)

Внедрение или замена глобального стиля в хосте для переоформления любого встроенного компонента. Требует разрешение `custom-css`.

-   `ui.injectHostCss(id`, css) — добавить или заменить глобальный CSS-слой; он идёт после стилей приложения и выигрывает при равной специфичности.
-   Тот же id заменяет слой; пустая строка удаляет его.
-   Сочетается с .style('my-class') у компонента для точного таргетинга.
-   Кнопка настроек и менеджер расширений остаются видимыми — плагин не заблокирует сам себя.

```javascript
// Свой класс на компоненте
const card = Card().style("my-hero-card").child(Text("Featured"));
ui.render(card);

// Стилизуем его глобально + перекрашиваем встроенный класс
ui.injectHostCss("cards", `
  .my-hero-card { border-radius: 1.5rem; box-shadow: 0 8px 24px rgba(0,0,0,.4); }
  .media-card-overlay {
    background: linear-gradient(to top, #000, transparent) !important;
  }
`);

// Тот же id заменяет слой; пустая строка — удаляет
ui.injectHostCss("cards", "");
```

<a id="block"></a>

## Мутации блоков ui.block()

Метод `ui.block(blockName)` возвращает билдер для декларативного изменения существующих блоков интерфейса хоста. Через element(id) можно скрыть, отредактировать, вставить до/после или заменить элемент; append/prepend добавляют разметку; apply() отправляет мутации хосту.

-   element(id).hide() — скрывает элемент блока.
-   element(id).edit(props) — изменяет свойства элемента.
-   element(id).before(ui) / after(ui) / replace(ui) — вставка или замена разметки.
-   append(ui) / prepend(ui) — добавляет разметку в начало или конец блока.
-   apply() — регистрирует накопленные мутации на хосте.

<a id="block-context"></a>

## ui.onBlockContextUpdate()

Метод `ui.onBlockContextUpdate(callback)` подписывает плагин на обновления контекста активного блока интерфейса. Коллбек получает (`blockName`, context) при смене данных экрана (например, при переходе к другому фильму). Возвращает функцию отписки.

<a id="registration"></a>

## Регистрация в системе

Регистрация в хосте:

| Функция API | Описание |
| --- | --- |
| `registerPlugin(meta)` | Метаданные плагина (id, name, version). Вызывать первой при загрузке. |
| `registerSource(config)` | Регистрирует плагин как поисковый провайдер (источник медиа-потоков). Хост обращается к зарегистрированному источнику при поиске видеофайлов. |
| `registerSlotContribution(config)` | Регистрирует графический вклад в указанный интерфейсный слот (например, в кнопки действий или под описание медиафайла). |
| `onSettingsChanged(callback)` | Подписывает плагин на интерактивное изменение полей формы его настроек на хосте в реальном времени. В коллбек передаются (key, value, currentSettings). |
| `updateSettingsForm(updates)` | Отправляет команду хосту обновить значения полей формы настроек в реальном времени (например, для автозаполнения пресетов, сброса или валидации). Принимает объект обновлений { updates }. |

<a id="register-slot-docs"></a>

### Детальное описание registerSlotContribution

Вклад UI в слот. Хост вызывает render при монтировании экрана.

Поля config:

-   id (string) — id вклада, как в slots манифеста.
-   `slotName` (string) — `media-actions`, `details-bottom`, `extension-page`, …
-   render(props) (function) — возвращает { label, icon?, layout }.

-   label (string) — Название/подпись для вклада.
-   icon (string, опционально) — Имя иконки Lucide.
-   layout (`UIComponent`) — Дерево UI компонентов (создается с помощью билдеров `Card`(), `VStack`(), `Button`() и т.д.).

### Easy Plugin

Кнопка трейлера в `media-actions`, блок в `details-bottom`:

#### Структура

```text
my-easy-plugin/
├── manifest.json   # Метаданные и объявление слотов
└── index.js        # Исполняемый JS код плагина
```

#### manifest.json

```json
{
  "id": "my-easy-plugin",
  "name": "Простой Просмотрщик",
  "version": "1.0.0",
  "description": "Добавляет кнопку просмотра трейлера и блок в деталях",
  "permissions": ["ui-notifications"],
  "slots": [
    {
      "id": "trailer-action-button",
      "slotName": "media-actions",
      "title": "Кнопка Трейлера"
    },
    {
      "id": "extra-details-info",
      "slotName": "details-bottom",
      "title": "Блок Информации"
    }
  ]
}
```

#### index.js

```javascript
import { PotokSDK } from 'potok-sdk';

PotokSDK.registerPlugin({
  id: "my-easy-plugin",
  name: "Простой Просмотрщик"
});

PotokSDK.registerSlotContribution({
  id: "trailer-action-button",
  slotName: "media-actions",
  render(props) {
    const { Button } = PotokSDK.ui.components;
    return {
      label: "Смотреть Трейлер",
      icon: "play",
      layout: Button("Смотреть Трейлер")
        .variant("primary")
        .onClick(() => {
          PotokSDK.ui.playVideo({
            streamUrl: "http://example.com/video.m3u8",
            streamType: "m3u8",
            title: "Название фильма",
            season: 1,
            episode: 3,
            torrentHash: "abc123def456",
            fileIndex: "0",
            audios: [
              { id: "ru", name: "Русский дубляж", url: "http://example.com/video_ru.m3u8" },
              { id: "en", name: "Английский оригинал", url: "http://example.com/video_en.m3u8" }
            ],
            headers: { "User-Agent": "PotokPlayer" },
            providerId: "my-torrents",
            voice: "dub",
            subtitles: [
              {
                id: "ru-vtt",
                src: "http://example.com/subs_ru.vtt",
                label: "Русские",
                language: "ru",
                isDefault: true,
                format: "vtt",
                name: "Русские",
                srclang: "ru",
                url: "http://example.com/subs_ru.vtt"
              }
            ],
            session: {
              keepaliveUrl: "http://example.com/session/keepalive",
              stopUrl: "http://example.com/session/stop",
              intervalSec: 30,
              hash: "abc123def456",
              file: "0",
              statusUrl: "http://example.com/session/status",
              statusIntervalSec: 5
            },
            duration: 7200,
            introStart: 0,
            introEnd: 90,
            outroStart: 7080,
            outroEnd: 7200,
            thumbnails: {
              urlTemplate: "http://example.com/thumbs/{time}.jpg",
              intervalSec: 5
            },
            requiresBuffering: false
          });
        })
    };
  }
});

PotokSDK.registerSlotContribution({
  id: "extra-details-info",
  slotName: "details-bottom",
  render(props) {
    const { Card, VStack, Text, Badge, HStack } = PotokSDK.ui.components;
    return {
      label: "Дополнительно",
      icon: "info",
      layout: Card()
        .title("Рекомендовано плагином")
        .subtitle(`Кинопоиск ID: ${props.mediaId}`)
        .child(
          VStack()
            .spacing(8)
            .child(Text(`Вы просматриваете страницу "${props.title}". Этот блок встроил кастомный плагин.`).variant("secondary"))
            .child(
              HStack()
                .spacing(6)
                .child(Badge("Качество 1080p").color("success"))
                .child(Badge("Лицензия").color("info"))
            )
        )
    };
  }
});
```

[Протестировать оверлеи в Sandbox](/wiki/sandbox/#code=%2F%2F%20%D0%9F%D1%80%D0%B8%D0%BC%D0%B5%D1%80%20%D0%B2%D1%8B%D0%B7%D0%BE%D0%B2%D0%B0%20%D1%81%D0%B8%D1%81%D1%82%D0%B5%D0%BC%D0%BD%D0%BE%D0%B3%D0%BE%20%D0%BF%D0%BB%D0%B5%D0%B5%D1%80%D0%B0%20%D0%B8%20%D1%81%D0%B5%D0%BB%D0%B5%D0%BA%D1%82%D0%BE%D1%80%D0%BE%D0%B2%0Aconst%20%7B%20ui%20%7D%20%3D%20PotokSDK%3B%0A%0Aui.render\(%0A%20%20Card\(\)%0A%20%20%20%20.title\(%22%D0%A1%D0%B8%D1%81%D1%82%D0%B5%D0%BC%D0%BD%D1%8B%D0%B5%20%D0%BE%D0%B2%D0%B5%D1%80%D0%BB%D0%B5%D0%B8%22\)%0A%20%20%20%20.child\(%0A%20%20%20%20%20%20VStack\(\)%0A%20%20%20%20%20%20%20%20.spacing\(12\)%0A%20%20%20%20%20%20%20%20.child\(%0A%20%20%20%20%20%20%20%20%20%20Button\(%22%D0%92%D0%BE%D1%81%D0%BF%D1%80%D0%BE%D0%B8%D0%B7%D0%B2%D0%B5%D1%81%D1%82%D0%B8%20%D0%B2%D0%B8%D0%B4%D0%B5%D0%BE%22\)%0A%20%20%20%20%20%20%20%20%20%20%20%20.variant\(%22primary%22\)%0A%20%20%20%20%20%20%20%20%20%20%20%20.onClick\(\(\)%20%3D%3E%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20ui.playVideo\(%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20streamUrl%3A%20%22https%3A%2F%2Fcommondatastorage.googleapis.com%2Fgtv-videos-bucket%2Fsample%2FBigBuckBunny.mp4%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20streamType%3A%20%22mp4%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20title%3A%20%22%D0%A2%D1%80%D0%B5%D0%B9%D0%BB%D0%B5%D1%80%20%D0%91%D0%BE%D0%BB%D1%8C%D1%88%D0%BE%D0%B3%D0%BE%20%D0%A1%D1%82%D1%8D%D0%BD%D0%B0%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20season%3A%200%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20episode%3A%200%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20torrentHash%3A%20%22%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20fileIndex%3A%20%220%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20audios%3A%20%5B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7B%20id%3A%20%22default%22%2C%20name%3A%20%22Default%22%2C%20url%3A%20%22https%3A%2F%2Fcommondatastorage.googleapis.com%2Fgtv-videos-bucket%2Fsample%2FBigBuckBunny.mp4%22%20%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%5D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20headers%3A%20%7B%20%22User-Agent%22%3A%20%22PotokPlayer%22%20%7D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20providerId%3A%20%22sandbox%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20voice%3A%20%22original%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20subtitles%3A%20%5B%5D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20session%3A%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20keepaliveUrl%3A%20%22http%3A%2F%2Fexample.com%2Fsession%2Fkeepalive%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20stopUrl%3A%20%22http%3A%2F%2Fexample.com%2Fsession%2Fstop%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20intervalSec%3A%2030%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20hash%3A%20%22%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20file%3A%20%220%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20statusUrl%3A%20%22http%3A%2F%2Fexample.com%2Fsession%2Fstatus%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20statusIntervalSec%3A%205%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20duration%3A%20596%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20introStart%3A%200%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20introEnd%3A%200%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20outroStart%3A%200%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20outroEnd%3A%200%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20thumbnails%3A%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20urlTemplate%3A%20%22http%3A%2F%2Fexample.com%2Fthumbs%2F%7Btime%7D.jpg%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20intervalSec%3A%205%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20requiresBuffering%3A%20false%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D\)%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20%7D\)%0A%20%20%20%20%20%20%20%20\)%0A%20%20%20%20%20%20%20%20.child\(%0A%20%20%20%20%20%20%20%20%20%20Button\(%22%D0%9F%D0%BE%D0%BA%D0%B0%D0%B7%D0%B0%D1%82%D1%8C%20%D1%81%D0%B5%D0%BB%D0%B5%D0%BA%D1%82%D0%BE%D1%80%20%D1%81%D0%B5%D1%80%D0%B8%D0%B9%22\)%0A%20%20%20%20%20%20%20%20%20%20%20%20.onClick\(\(\)%20%3D%3E%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20ui.showEpisodeSelector\(%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20title%3A%20%22%D0%98%D0%B3%D1%80%D0%B0%20%D0%9F%D1%80%D0%B5%D1%81%D1%82%D0%BE%D0%BB%D0%BE%D0%B2%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20seasons%3A%20%5B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20id%3A%201%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20seasonNumber%3A%201%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20season_number%3A%201%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20episodes%3A%20%5B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20id%3A%20101%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20episodeNumber%3A%201%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20episode_number%3A%201%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20name%3A%20%22%D0%97%D0%B8%D0%BC%D0%B0%20%D0%B1%D0%BB%D0%B8%D0%B7%D0%BA%D0%BE%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20stillPath%3A%20%22https%3A%2F%2Fimage.tmdb.org%2Ft%2Fp%2Fw500%2Fexample.jpg%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20still_path%3A%20%22https%3A%2F%2Fimage.tmdb.org%2Ft%2Fp%2Fw500%2Fexample.jpg%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20airDate%3A%20%222011-04-17%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20air_date%3A%20%222011-04-17%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20overview%3A%20%22%D0%9E%D0%BF%D0%B8%D1%81%D0%B0%D0%BD%D0%B8%D0%B5%20%D1%81%D0%B5%D1%80%D0%B8%D0%B8%22%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%5D%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20id%3A%202%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20seasonNumber%3A%202%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20season_number%3A%202%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20episodes%3A%20%5B%5D%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%5D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20episodes%3A%20%5B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20id%3A%20%22s01e01%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20season%3A%201%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20episode%3A%201%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20rawSeason%3A%201%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20rawEpisode%3A%201%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20title%3A%20%22%D0%97%D0%B8%D0%BC%D0%B0%20%D0%B1%D0%BB%D0%B8%D0%B7%D0%BA%D0%BE%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20fileName%3A%20%22Show.S01E01.mkv%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20stillPath%3A%20%22https%3A%2F%2Fimage.tmdb.org%2Ft%2Fp%2Fw500%2Fexample.jpg%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20airDate%3A%20%222011-04-17%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20isWatched%3A%20false%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20sizeLabel%3A%20%221.2%20GB%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20audios%3A%20%5B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7B%20id%3A%20%22ru%22%2C%20name%3A%20%22%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9%20%D0%B4%D1%83%D0%B1%D0%BB%D1%8F%D0%B6%22%2C%20url%3A%20%22http%3A%2F%2Fexample.com%2Fs01e01_ru.m3u8%22%20%7D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7B%20id%3A%20%22en%22%2C%20name%3A%20%22%D0%90%D0%BD%D0%B3%D0%BB%D0%B8%D0%B9%D1%81%D0%BA%D0%B8%D0%B9%20%D0%BE%D1%80%D0%B8%D0%B3%D0%B8%D0%BD%D0%B0%D0%BB%22%2C%20url%3A%20%22http%3A%2F%2Fexample.com%2Fs01e01_en.m3u8%22%20%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%5D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20url%3A%20%22http%3A%2F%2Fexample.com%2Fs01e01.m3u8%22%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20id%3A%20%22s01e02%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20season%3A%201%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20episode%3A%202%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20rawSeason%3A%201%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20rawEpisode%3A%202%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20title%3A%20%22%D0%9A%D0%BE%D1%80%D0%BE%D0%BB%D0%B5%D0%B2%D1%81%D0%BA%D0%B8%D0%B9%20%D1%82%D1%80%D0%B0%D0%BA%D1%82%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20fileName%3A%20%22Show.S01E02.mkv%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20stillPath%3A%20%22https%3A%2F%2Fimage.tmdb.org%2Ft%2Fp%2Fw500%2Fexample2.jpg%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20airDate%3A%20%222011-04-24%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20isWatched%3A%20false%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20sizeLabel%3A%20%221.1%20GB%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20audios%3A%20%5B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7B%20id%3A%20%22ru%22%2C%20name%3A%20%22%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9%20%D0%B4%D1%83%D0%B1%D0%BB%D1%8F%D0%B6%22%2C%20url%3A%20%22http%3A%2F%2Fexample.com%2Fs01e02_ru.m3u8%22%20%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%5D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20url%3A%20%22http%3A%2F%2Fexample.com%2Fs01e02.m3u8%22%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%5D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20seasonsLoading%3A%20false%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20isSaving%3A%20false%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20tmdbSeasonsCount%3A%208%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20onPlay%3A%20\(ep%2C%20audioId\)%20%3D%3E%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20ui.showHUD\(%22success%22%2C%20%22%D0%98%D0%B3%D1%80%D0%B0%D0%B5%D0%BC%20%D1%8D%D0%BF%D0%B8%D0%B7%D0%BE%D0%B4%20%22%20%2B%20ep.episode\)%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20onStartEditing%3A%20\(\)%20%3D%3E%20%7B%7D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20onApplyOverride%3A%20\(seasonNum%2C%20epNum\)%20%3D%3E%20%7B%7D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20onClose%3A%20\(\)%20%3D%3E%20%7B%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D\)%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20%7D\)%0A%20%20%20%20%20%20%20%20\)%0A%20%20%20%20\)%0A\)%3B)
