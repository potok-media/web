---
title: "Потоки и медиа-провайдеры"
description: "Регистрация источников потоков и search provider для хоста."
---

<a id="registerStreamSource"></a>

Регистрация источников потоков и search provider для хоста.



## streams.registerStreamSource

Регистрирует источник потоков с id, name, supportedTypes (movie | tv) и async-обработчиками: search(query), getEpisodes(stream, context), getPlaybackInfo(stream, context). Хост вызывает их при открытии страницы раздач.

```javascript
const { streams } = PotokSDK;

streams.registerStreamSource({
  id: "my-torrents",
  name: "My Torrent Source",
  supportedTypes: ["movie", "tv"],
  async search(query) {
    return [{
      title: "Example release",
      url: "magnet:?xt=urn:btih:abc123",
      magnet: "magnet:?xt=urn:btih:abc123",
      quality: "1080p",
      size: "14.5 GB",
      seeds: 42,
      peers: 5,
      provider: "my-torrents",
      hash: "abc123def456",
      voice: "dub",
      kind: "hls",
      headers: { "User-Agent": "PotokPlayer" }
    }];
  },
  async getEpisodes(stream, context) {
    return {
      episodes: [{
        id: "s01e01",
        season: 1,
        episode: 1,
        rawSeason: 1,
        rawEpisode: 1,
        title: "Episode 1",
        fileName: "Show.S01E01.mkv",
        stillPath: "https://image.tmdb.org/t/p/w500/example.jpg",
        airDate: "2011-04-17",
        url: "http://example.com/s01e01.m3u8",
        audios: [{ id: "ru", name: "Russian dub", url: "http://example.com/s01e01_ru.m3u8" }],
        headers: { "User-Agent": "PotokPlayer" }
      }],
      tmdbSeasonsCount: 8,
      seasonMap: { "1": { season: 1, offset: 0 } }
    };
  },
  async getSeasonsMetadata(stream, context) {
    return [{ seasonNumber: 1, name: "Season 1" }];
  },
  async saveSeasonOverride(stream, context, sourceSeason, targetSeason, offset) {},
  async clearSeasonOverride(stream, context, sourceSeason) {},
  async getPlaybackInfo(stream, episode, context) {
    return {
      streamUrl: "https://example.com/video.m3u8",
      streamType: "m3u8",
      title: stream.title,
      season: episode?.season,
      episode: episode?.episode,
      torrentHash: stream.hash,
      fileIndex: "0",
      audios: [{ id: "ru", name: "Russian dub", url: "https://example.com/video_ru.m3u8" }],
      headers: { "User-Agent": "PotokPlayer" },
      providerId: "my-torrents",
      voice: "dub",
      subtitles: [{
        id: "ru",
        src: "https://example.com/subs.vtt",
        label: "Russian",
        language: "ru",
        isDefault: true,
        format: "vtt",
        name: "Russian",
        srclang: "ru",
        url: "https://example.com/subs.vtt"
      }],
      session: {
        keepaliveUrl: "https://example.com/keepalive",
        stopUrl: "https://example.com/stop",
        intervalSec: 30,
        hash: stream.hash,
        file: "0",
        statusUrl: "https://example.com/status",
        statusIntervalSec: 5
      },
      duration: 7200,
      introStart: 0,
      introEnd: 90,
      outroStart: 7080,
      outroEnd: 7200,
      thumbnails: { urlTemplate: "https://example.com/thumbs/{time}.jpg", intervalSec: 5 },
      requiresBuffering: true
    };
  },
  async getPlaybackMetadata(stream, episode, context) {
    return {
      subtitles: [{ id: "ru", src: "https://example.com/subs.vtt", label: "Russian" }],
      duration: 7200
    };
  },
  async refreshStreamUrl(payload) {
    return {
      streamUrl: "https://example.com/video_refreshed.m3u8",
      audios: [{ id: "ru", name: "Russian dub", url: "https://example.com/video_ru.m3u8" }],
      headers: { "User-Agent": "PotokPlayer" }
    };
  }
});
```

<a id="searchProvider"></a>

## media.searchProvider

Билдер для регистрации провайдера поиска в библиотеке: `media.searchProvider`(id, name).icon(url).onSearch(callback). Коллбек получает запрос и возвращает результаты хосту.

```javascript
const { media } = PotokSDK;

media
  .searchProvider("my-search", "Custom Search")
  .icon("https://example.com/icon.png")
  .onSearch(async (query) => {
    return [{ id: "1", title: "Result for " + query }];
  });
```

<a id="episodeBinding"></a>

## Явная привязка серий (canonical overrides)

Когда пользователь через карандаш явно указывает, с какой серии начинается список, хост вызывает \`saveEpisodeBinding(stream, context, override)\` вашего плагина. \`override.armTarget\` — точная серия графа \`{workId, entryId, episodeId}\`; \`mode: "pin"\` фиксирует один файл, \`mode: "anchor"\` — файл и продолжение ряда (\`scopeFileIds\`). Хранение и контракт overrides — зона `SearchEngine` (\`GET/POST /api/v1/torrents/overrides/{hash}\`); gateway overrides не видит и не хранит. Плагин обязан применять привязку при каждом \`getEpisodes\` по свежему layout (\`GET /api/arm/v1/works/{workId}/layout\`): устаревший или чужой target пропускается — числа из него не фабрикуются.

```javascript
const { streams } = PotokSDK;

streams.registerStreamSource({
  id: "my-torrents",
  name: "My Torrent Source",
  supportedTypes: ["tv"],
  async search(query) {
    return [/* raw releases for the query */];
  },

  // The user pinned "the list starts from THIS episode" in the override picker —
  // the host hands the binding to the plugin. Persistence is the plugin's job.
  async saveEpisodeBinding(stream, context, override) {
    // override.armTarget = { workId, entryId, episodeId } — the exact graph episode
    // override.mode = "pin" | "anchor" (anchor also carries scopeFileIds)
    await myStore.set(stream.hash, override);
  },

  async getEpisodes(stream, context) {
    const files = await myStore.files(stream);
    const saved = await myStore.get(stream.hash);
    return {
      episodes: files.map((file) => ({
        ...file,
        // The canonical binding wins over any filename evidence; a stale or
        // foreign target must be dropped, never fabricated into numbers.
        targets: saved?.armTarget ? [saved.armTarget] : file.targets,
        // Filler annotation from AniFillerPedia — the player's skip-fillers
        // toggle and the colored playlist markers read exactly this field.
        filler: myFillerLookup(file),
      })),
    };
  },
});
```

<a id="fillers"></a>

## Аннотации филлеров

Серии несут \`filler\` (\`SDKArmEpisodeFiller\`: \`status\` = \`canon | filler | mixed | recap\`, плюс \`confidence\` и \`disputed\`) — источник AniFillerPedia, приезжает в layout графа. Маркируйте их в UI (у встроенного селектора это \`EpisodeAnnotationBadge\`). Плеер хоста умеет пропускать филлеры: свитч «Пропускать филлеры» в плейлисте влияет на авто-переход и кнопки дальше/назад для любых плейлистов, собранных из ваших серий с этим полем; ручной выбор серии не фильтруется.
