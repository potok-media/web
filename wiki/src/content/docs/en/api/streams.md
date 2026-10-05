---
title: "Streams & media providers"
description: "Register stream sources and search providers for the host."
---

<a id="registerStreamSource"></a>

Register stream `sources` and search providers for the host.



## streams.registerStreamSource

Registers a stream source with id, name, supportedTypes (movie | tv), and async handlers: search(query), getEpisodes(stream, context), getPlaybackInfo(stream, context). The host calls these when the user opens the streams page.

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

Builder for registering a library search provider: `media.searchProvider`(id, name).icon(url).onSearch(callback). The callback receives the query and returns search results to the host.

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

## Explicit episode binding (canonical overrides)

When the user explicitly pins "the list starts from THIS episode" via the pencil, the host calls your plugin's \`saveEpisodeBinding(stream, context, override)\`. \`override.armTarget\` is the exact graph episode \`{workId, entryId, episodeId}\`; \`mode: "pin"\` fixes a single file, \`mode: "anchor"\` the file plus the run after it (\`scopeFileIds\`). Override storage and contract are the `SearchEngine`'s domain (\`GET/POST /api/v1/torrents/overrides/{hash}\`) — the gateway never sees or stores overrides. Your plugin must apply the binding on every \`getEpisodes\` over a fresh layout (\`GET /api/arm/v1/works/{workId}/layout\`): a stale or foreign target is skipped, never fabricated into numbers.

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

## Filler annotations

Episodes carry \`filler\` (\`SDKArmEpisodeFiller\`: \`status\` = \`canon | filler | mixed | recap\`, plus \`confidence\` and \`disputed\`) — sourced from AniFillerPedia and delivered inside the graph layout. Use it to mark fillers in your UI (the built-in selector renders \`EpisodeAnnotationBadge\`). The host player can skip fillers: the playlist's "Skip fillers" toggle drives auto-advance and the prev/next buttons for any playlist built from your episodes carrying this field; manual episode selection is never filtered.
