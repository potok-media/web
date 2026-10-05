---
title: "Global UI methods"
description: "PotokSDK.ui — render, HUD, player, navigation, registration."
---

<a id="render"></a>

`PotokSDK.ui` — render, HUD, player, navigation, registration.

<a id="render-method"></a>

## ui.render()

`ui.render(component`, `slotId`?) compiles declarative markup and sends it to the host. With `slotId` it mounts into that slot; otherwise it renders on the sandbox main screen.

<a id="hud"></a>

## HUD notifications

`ui.showHUD(type`, message) shows a short system banner. Supported types: "success", "error", "info", "warning".

<a id="player"></a>

## Video player

`ui.playVideo(playbackInfo)` — fullscreen player. `playbackInfo` fields:

```javascript
ui.playVideo({
  streamUrl: "http://example.com/video.m3u8",
  streamType: "m3u8",
  title: "Movie title",
  season: 1,
  episode: 3,
  torrentHash: "abc123def456",
  fileIndex: "0",
  audios: [
    { id: "ru", name: "Russian dub", url: "http://example.com/video_ru.m3u8" },
    { id: "en", name: "English original", url: "http://example.com/video_en.m3u8" }
  ],
  headers: { "User-Agent": "PotokPlayer" },
  providerId: "my-torrents",
  voice: "dub",
  subtitles: [
    {
      id: "ru-vtt",
      src: "http://example.com/subs_ru.vtt",
      label: "Russian",
      language: "ru",
      isDefault: true,
      format: "vtt",
      name: "Russian",
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

## Episode selector

`ui.showEpisodeSelector(config)` opens the system modal for picking seasons and episodes in TV shows.

```javascript
ui.showEpisodeSelector({
  title: "Series name",
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
          name: "Episode 1",
          stillPath: "https://image.tmdb.org/t/p/w500/example.jpg",
          still_path: "https://image.tmdb.org/t/p/w500/example.jpg",
          airDate: "2011-04-17",
          air_date: "2011-04-17",
          overview: "Episode overview"
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
      title: "Episode 1",
      fileName: "Show.S01E01.mkv",
      stillPath: "https://image.tmdb.org/t/p/w500/example.jpg",
      airDate: "2011-04-17",
      isWatched: false,
      sizeLabel: "1.2 GB",
      audios: [
        { id: "ru", name: "Russian dub", url: "http://example.com/s01e01_ru.m3u8" },
        { id: "en", name: "English original", url: "http://example.com/s01e01_en.m3u8" }
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

## Navigation

`ui.navigateTo(to`, state?) — navigate to a host section (/settings, /library, …):

```javascript
ui.navigateTo("/settings");
ui.navigateTo("/library", { filter: "watchlist" });
```

<a id="themes"></a>

## Themes

Custom themes and accent:

-   `ui.registerThemes(themes)` — register Theme\[\] on the host.
-   `ui.setAccentTheme(themeId)` — switch accent.

<a id="inject-css"></a>

## Custom CSS (injectHostCss)

Inject or replace a global stylesheet in the host to restyle any built-in component. Requires the `custom-css` permission.

-   `ui.injectHostCss(id`, css) — add or replace a global CSS layer, appended after app styles so it wins at equal specificity.
-   Same id replaces the layer; an empty string removes it.
-   Pair with a component's .style('my-class') to target it precisely.
-   The settings entry and extensions manager stay visible — the plugin can't lock itself in.

```javascript
// Custom class on a component
const card = Card().style("my-hero-card").child(Text("Featured"));
ui.render(card);

// Style it globally + restyle a built-in class
ui.injectHostCss("cards", `
  .my-hero-card { border-radius: 1.5rem; box-shadow: 0 8px 24px rgba(0,0,0,.4); }
  .media-card-overlay {
    background: linear-gradient(to top, #000, transparent) !important;
  }
`);

// Same id replaces the layer; empty string removes it
ui.injectHostCss("cards", "");
```

<a id="block"></a>

## Block mutations ui.block()

`ui.block(blockName)` returns a builder to mutate host UI blocks. Use element(id) to hide, edit, insert before/after, or replace; append/prepend add layout; apply() sends mutations to the host.

-   element(id).hide() — hides a block element.
-   element(id).edit(props) — edits element props.
-   element(id).before(ui) / after(ui) / replace(ui) — insert or replace layout.
-   append(ui) / prepend(ui) — add layout at block end or start.
-   apply() — registers accumulated mutations with the host.

<a id="block-context"></a>

## ui.onBlockContextUpdate()

`ui.onBlockContextUpdate(callback)` subscribes to active block context updates. The callback receives (`blockName`, context) when screen data changes (e.g. another movie). Returns an unsubscribe function.

<a id="registration"></a>

## System registration

Host registration:

| API function | Description |
| --- | --- |
| `registerPlugin(meta)` | Registers plugin metadata (id, name, version). Call first on script load. |
| `registerSource(config)` | Registers a media stream lookup source for host video search. |
| `registerSlotContribution(config)` | Registers UI in a named slot (e.g. `media-actions`, `details-bottom`). |
| `onSettingsChanged(callback)` | Subscribes to live settings form changes; callback gets (key, value, currentSettings). |
| `updateSettingsForm(updates)` | Tells the host to update settings form fields in real time; accepts { updates }. |

<a id="register-slot-docs"></a>

### registerSlotContribution details

UI contribution in a slot. Host calls render when the screen mounts.

config fields:

-   id (string) — contribution id, same as in manifest slots.
-   `slotName` (string) — `media-actions`, `details-bottom`, `extension-page`, …
-   render(props) (function) — returns { label, icon?, layout }.

-   label (string) — Contribution label.
-   icon (string, optional) — Lucide icon name.
-   layout (`UIComponent`) — UI tree built with `Card`(), `VStack`(), `Button`(), etc.

### Easy Plugin

Trailer button in `media-actions`, info block in `details-bottom`:

#### Structure

```text
my-easy-plugin/
├── manifest.json   # Metadata and slot declarations
└── index.js        # Plugin executable JS
```

#### manifest.json

```json
{
  "id": "my-easy-plugin",
  "name": "Simple Viewer",
  "version": "1.0.0",
  "description": "Adds a trailer button and info block on the details page",
  "permissions": ["ui-notifications"],
  "slots": [
    {
      "id": "trailer-action-button",
      "slotName": "media-actions",
      "title": "Trailer button"
    },
    {
      "id": "extra-details-info",
      "slotName": "details-bottom",
      "title": "Info block"
    }
  ]
}
```

#### index.js

```javascript
import { PotokSDK } from 'potok-sdk';

PotokSDK.registerPlugin({
  id: "my-easy-plugin",
  name: "Simple Viewer"
});

PotokSDK.registerSlotContribution({
  id: "trailer-action-button",
  slotName: "media-actions",
  render(props) {
    const { Button } = PotokSDK.ui.components;
    return {
      label: "Watch trailer",
      icon: "play",
      layout: Button("Watch trailer")
        .variant("primary")
        .onClick(() => {
          PotokSDK.ui.playVideo({
            streamUrl: "http://example.com/video.m3u8",
            streamType: "m3u8",
            title: "Movie title",
            season: 1,
            episode: 3,
            torrentHash: "abc123def456",
            fileIndex: "0",
            audios: [
              { id: "ru", name: "Russian dub", url: "http://example.com/video_ru.m3u8" },
              { id: "en", name: "English original", url: "http://example.com/video_en.m3u8" }
            ],
            headers: { "User-Agent": "PotokPlayer" },
            providerId: "my-torrents",
            voice: "dub",
            subtitles: [
              {
                id: "ru-vtt",
                src: "http://example.com/subs_ru.vtt",
                label: "Russian",
                language: "ru",
                isDefault: true,
                format: "vtt",
                name: "Russian",
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
      label: "More",
      icon: "info",
      layout: Card()
        .title("Recommended by plugin")
        .subtitle(`Kinopoisk ID: ${props.mediaId}`)
        .child(
          VStack()
            .spacing(8)
            .child(Text(`You are viewing "${props.title}". This block was added by a custom plugin.`).variant("secondary"))
            .child(
              HStack()
                .spacing(6)
                .child(Badge("1080p quality").color("success"))
                .child(Badge("License").color("info"))
            )
        )
    };
  }
});
```

[Test overlays in Sandbox](/wiki/en/sandbox/#code=%2F%2F%20System%20player%20and%20selector%20example%0Aconst%20%7B%20ui%20%7D%20%3D%20PotokSDK%3B%0A%0Aui.render\(%0A%20%20Card\(\)%0A%20%20%20%20.title\(%22System%20overlays%22\)%0A%20%20%20%20.child\(%0A%20%20%20%20%20%20VStack\(\)%0A%20%20%20%20%20%20%20%20.spacing\(12\)%0A%20%20%20%20%20%20%20%20.child\(%0A%20%20%20%20%20%20%20%20%20%20Button\(%22Play%20video%22\)%0A%20%20%20%20%20%20%20%20%20%20%20%20.variant\(%22primary%22\)%0A%20%20%20%20%20%20%20%20%20%20%20%20.onClick\(\(\)%20%3D%3E%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20ui.playVideo\(%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20streamUrl%3A%20%22https%3A%2F%2Fcommondatastorage.googleapis.com%2Fgtv-videos-bucket%2Fsample%2FBigBuckBunny.mp4%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20streamType%3A%20%22mp4%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20title%3A%20%22Big%20Buck%20Bunny%20trailer%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20season%3A%200%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20episode%3A%200%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20torrentHash%3A%20%22%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20fileIndex%3A%20%220%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20audios%3A%20%5B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7B%20id%3A%20%22default%22%2C%20name%3A%20%22Default%22%2C%20url%3A%20%22https%3A%2F%2Fcommondatastorage.googleapis.com%2Fgtv-videos-bucket%2Fsample%2FBigBuckBunny.mp4%22%20%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%5D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20headers%3A%20%7B%20%22User-Agent%22%3A%20%22PotokPlayer%22%20%7D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20providerId%3A%20%22sandbox%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20voice%3A%20%22original%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20subtitles%3A%20%5B%5D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20session%3A%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20keepaliveUrl%3A%20%22http%3A%2F%2Fexample.com%2Fsession%2Fkeepalive%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20stopUrl%3A%20%22http%3A%2F%2Fexample.com%2Fsession%2Fstop%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20intervalSec%3A%2030%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20hash%3A%20%22%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20file%3A%20%220%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20statusUrl%3A%20%22http%3A%2F%2Fexample.com%2Fsession%2Fstatus%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20statusIntervalSec%3A%205%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20duration%3A%20596%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20introStart%3A%200%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20introEnd%3A%200%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20outroStart%3A%200%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20outroEnd%3A%200%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20thumbnails%3A%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20urlTemplate%3A%20%22http%3A%2F%2Fexample.com%2Fthumbs%2F%7Btime%7D.jpg%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20intervalSec%3A%205%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20requiresBuffering%3A%20false%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D\)%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20%7D\)%0A%20%20%20%20%20%20%20%20\)%0A%20%20%20%20%20%20%20%20.child\(%0A%20%20%20%20%20%20%20%20%20%20Button\(%22Show%20episode%20selector%22\)%0A%20%20%20%20%20%20%20%20%20%20%20%20.onClick\(\(\)%20%3D%3E%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20ui.showEpisodeSelector\(%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20title%3A%20%22Game%20of%20Thrones%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20seasons%3A%20%5B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20id%3A%201%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20seasonNumber%3A%201%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20season_number%3A%201%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20episodes%3A%20%5B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20id%3A%20101%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20episodeNumber%3A%201%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20episode_number%3A%201%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20name%3A%20%22Winter%20is%20Coming%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20stillPath%3A%20%22https%3A%2F%2Fimage.tmdb.org%2Ft%2Fp%2Fw500%2Fexample.jpg%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20still_path%3A%20%22https%3A%2F%2Fimage.tmdb.org%2Ft%2Fp%2Fw500%2Fexample.jpg%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20airDate%3A%20%222011-04-17%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20air_date%3A%20%222011-04-17%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20overview%3A%20%22Episode%20overview%22%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%5D%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20id%3A%202%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20seasonNumber%3A%202%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20season_number%3A%202%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20episodes%3A%20%5B%5D%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%5D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20episodes%3A%20%5B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20id%3A%20%22s01e01%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20season%3A%201%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20episode%3A%201%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20rawSeason%3A%201%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20rawEpisode%3A%201%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20title%3A%20%22Winter%20is%20Coming%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20fileName%3A%20%22Show.S01E01.mkv%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20stillPath%3A%20%22https%3A%2F%2Fimage.tmdb.org%2Ft%2Fp%2Fw500%2Fexample.jpg%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20airDate%3A%20%222011-04-17%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20isWatched%3A%20false%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20sizeLabel%3A%20%221.2%20GB%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20audios%3A%20%5B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7B%20id%3A%20%22ru%22%2C%20name%3A%20%22Russian%20dub%22%2C%20url%3A%20%22http%3A%2F%2Fexample.com%2Fs01e01_ru.m3u8%22%20%7D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7B%20id%3A%20%22en%22%2C%20name%3A%20%22English%20original%22%2C%20url%3A%20%22http%3A%2F%2Fexample.com%2Fs01e01_en.m3u8%22%20%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%5D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20url%3A%20%22http%3A%2F%2Fexample.com%2Fs01e01.m3u8%22%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20id%3A%20%22s01e02%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20season%3A%201%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20episode%3A%202%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20rawSeason%3A%201%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20rawEpisode%3A%202%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20title%3A%20%22The%20Kingsroad%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20fileName%3A%20%22Show.S01E02.mkv%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20stillPath%3A%20%22https%3A%2F%2Fimage.tmdb.org%2Ft%2Fp%2Fw500%2Fexample2.jpg%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20airDate%3A%20%222011-04-24%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20isWatched%3A%20false%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20sizeLabel%3A%20%221.1%20GB%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20audios%3A%20%5B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7B%20id%3A%20%22ru%22%2C%20name%3A%20%22Russian%20dub%22%2C%20url%3A%20%22http%3A%2F%2Fexample.com%2Fs01e02_ru.m3u8%22%20%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%5D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20url%3A%20%22http%3A%2F%2Fexample.com%2Fs01e02.m3u8%22%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%5D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20seasonsLoading%3A%20false%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20isSaving%3A%20false%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20tmdbSeasonsCount%3A%208%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20onPlay%3A%20\(ep%2C%20audioId\)%20%3D%3E%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20ui.showHUD\(%22success%22%2C%20%22Playing%20episode%20%22%20%2B%20ep.episode\)%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20onStartEditing%3A%20\(\)%20%3D%3E%20%7B%7D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20onApplyOverride%3A%20\(seasonNum%2C%20epNum\)%20%3D%3E%20%7B%7D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20onClose%3A%20\(\)%20%3D%3E%20%7B%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D\)%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20%7D\)%0A%20%20%20%20%20%20%20%20\)%0A%20%20%20%20\)%0A\)%3B)
