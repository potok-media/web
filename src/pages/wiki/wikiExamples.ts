export type WikiLang = "en" | "ru";

function wikiLang(lang?: string): WikiLang {
  return lang?.startsWith("ru") ? "ru" : "en";
}

function playbackLabels(lang: WikiLang) {
  return lang === "ru"
    ? {
        title: "Название фильма",
        ruAudio: "Русский дубляж",
        enAudio: "Английский оригинал",
        subLabel: "Русские",
        subName: "Русские",
        voice: "dub",
        providerId: "my-torrents",
      }
    : {
        title: "Movie title",
        ruAudio: "Russian dub",
        enAudio: "English original",
        subLabel: "Russian",
        subName: "Russian",
        voice: "dub",
        providerId: "my-torrents",
      };
}

/** Full SDKPlaybackInfo literal — every field from types.ts */
export function buildPlaybackInfoBlock(lang: WikiLang, indent = "  "): string {
  const L = playbackLabels(lang);
  const i = indent;
  return `${i}streamUrl: "http://example.com/video.m3u8",
${i}streamType: "m3u8",
${i}title: "${L.title}",
${i}season: 1,
${i}episode: 3,
${i}torrentHash: "abc123def456",
${i}fileIndex: "0",
${i}audios: [
${i}  { id: "ru", name: "${L.ruAudio}", url: "http://example.com/video_ru.m3u8" },
${i}  { id: "en", name: "${L.enAudio}", url: "http://example.com/video_en.m3u8" }
${i}],
${i}headers: { "User-Agent": "PotokPlayer" },
${i}providerId: "${L.providerId}",
${i}voice: "${L.voice}",
${i}subtitles: [
${i}  {
${i}    id: "ru-vtt",
${i}    src: "http://example.com/subs_ru.vtt",
${i}    label: "${L.subLabel}",
${i}    language: "ru",
${i}    isDefault: true,
${i}    format: "vtt",
${i}    name: "${L.subName}",
${i}    srclang: "ru",
${i}    url: "http://example.com/subs_ru.vtt"
${i}  }
${i}],
${i}session: {
${i}  keepaliveUrl: "http://example.com/session/keepalive",
${i}  stopUrl: "http://example.com/session/stop",
${i}  intervalSec: 30,
${i}  hash: "abc123def456",
${i}  file: "0",
${i}  statusUrl: "http://example.com/session/status",
${i}  statusIntervalSec: 5
${i}},
${i}duration: 7200,
${i}introStart: 0,
${i}introEnd: 90,
${i}outroStart: 7080,
${i}outroEnd: 7200,
${i}thumbnails: {
${i}  urlTemplate: "http://example.com/thumbs/{time}.jpg",
${i}  intervalSec: 5
${i}},
${i}requiresBuffering: false`;
}

export function playVideoExample(lang?: string): string {
  const L = wikiLang(lang);
  return `ui.playVideo({
${buildPlaybackInfoBlock(L)}
});`;
}

/** Full ShowEpisodeSelectorPayload + GenericEpisodeItem + SDKTvSeason fields */
export function showEpisodeSelectorExample(lang?: string): string {
  const ru = wikiLang(lang) === "ru";
  const seriesTitle = ru ? "Имя сериала" : "Series name";
  const epTitle = ru ? "Серия 1" : "Episode 1";
  const epOverview = ru ? "Описание серии" : "Episode overview";
  const ruAudio = ru ? "Русский дубляж" : "Russian dub";
  const enAudio = ru ? "Английский оригинал" : "English original";

  return `ui.showEpisodeSelector({
  title: "${seriesTitle}",
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
          name: "${epTitle}",
          stillPath: "https://image.tmdb.org/t/p/w500/example.jpg",
          still_path: "https://image.tmdb.org/t/p/w500/example.jpg",
          airDate: "2011-04-17",
          air_date: "2011-04-17",
          overview: "${epOverview}"
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
      title: "${epTitle}",
      fileName: "Show.S01E01.mkv",
      stillPath: "https://image.tmdb.org/t/p/w500/example.jpg",
      airDate: "2011-04-17",
      isWatched: false,
      sizeLabel: "1.2 GB",
      audios: [
        { id: "ru", name: "${ruAudio}", url: "http://example.com/s01e01_ru.m3u8" },
        { id: "en", name: "${enAudio}", url: "http://example.com/s01e01_en.m3u8" }
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
});`;
}

export function uiMethodsSandboxExample(lang?: string): string {
  const ru = wikiLang(lang) === "ru";
  const cardTitle = ru ? "Системные оверлеи" : "System overlays";
  const playBtn = ru ? "Воспроизвести видео" : "Play video";
  const epBtn = ru ? "Показать селектор серий" : "Show episode selector";
  const trailerTitle = ru ? "Трейлер Большого Стэна" : "Big Buck Bunny trailer";

  return `// ${ru ? "Пример вызова системного плеера и селекторов" : "System player and selector example"}
const { ui } = PotokSDK;

ui.render(
  Card()
    .title("${cardTitle}")
    .child(
      VStack()
        .spacing(12)
        .child(
          Button("${playBtn}")
            .variant("primary")
            .onClick(() => {
              ui.playVideo({
                streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                streamType: "mp4",
                title: "${trailerTitle}",
                season: 0,
                episode: 0,
                torrentHash: "",
                fileIndex: "0",
                audios: [
                  { id: "default", name: "Default", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" }
                ],
                headers: { "User-Agent": "PotokPlayer" },
                providerId: "sandbox",
                voice: "original",
                subtitles: [],
                session: {
                  keepaliveUrl: "http://example.com/session/keepalive",
                  stopUrl: "http://example.com/session/stop",
                  intervalSec: 30,
                  hash: "",
                  file: "0",
                  statusUrl: "http://example.com/session/status",
                  statusIntervalSec: 5
                },
                duration: 596,
                introStart: 0,
                introEnd: 0,
                outroStart: 0,
                outroEnd: 0,
                thumbnails: {
                  urlTemplate: "http://example.com/thumbs/{time}.jpg",
                  intervalSec: 5
                },
                requiresBuffering: false
              });
            })
        )
        .child(
          Button("${epBtn}")
            .onClick(() => {
              ui.showEpisodeSelector({
                title: "${ru ? "Игра Престолов" : "Game of Thrones"}",
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
                        name: "${ru ? "Зима близко" : "Winter is Coming"}",
                        stillPath: "https://image.tmdb.org/t/p/w500/example.jpg",
                        still_path: "https://image.tmdb.org/t/p/w500/example.jpg",
                        airDate: "2011-04-17",
                        air_date: "2011-04-17",
                        overview: "${ru ? "Описание серии" : "Episode overview"}"
                      }
                    ]
                  },
                  {
                    id: 2,
                    seasonNumber: 2,
                    season_number: 2,
                    episodes: []
                  }
                ],
                episodes: [
                  {
                    id: "s01e01",
                    season: 1,
                    episode: 1,
                    rawSeason: 1,
                    rawEpisode: 1,
                    title: "${ru ? "Зима близко" : "Winter is Coming"}",
                    fileName: "Show.S01E01.mkv",
                    stillPath: "https://image.tmdb.org/t/p/w500/example.jpg",
                    airDate: "2011-04-17",
                    isWatched: false,
                    sizeLabel: "1.2 GB",
                    audios: [
                      { id: "ru", name: "${ru ? "Русский дубляж" : "Russian dub"}", url: "http://example.com/s01e01_ru.m3u8" },
                      { id: "en", name: "${ru ? "Английский оригинал" : "English original"}", url: "http://example.com/s01e01_en.m3u8" }
                    ],
                    url: "http://example.com/s01e01.m3u8"
                  },
                  {
                    id: "s01e02",
                    season: 1,
                    episode: 2,
                    rawSeason: 1,
                    rawEpisode: 2,
                    title: "${ru ? "Королевский тракт" : "The Kingsroad"}",
                    fileName: "Show.S01E02.mkv",
                    stillPath: "https://image.tmdb.org/t/p/w500/example2.jpg",
                    airDate: "2011-04-24",
                    isWatched: false,
                    sizeLabel: "1.1 GB",
                    audios: [
                      { id: "ru", name: "${ru ? "Русский дубляж" : "Russian dub"}", url: "http://example.com/s01e02_ru.m3u8" }
                    ],
                    url: "http://example.com/s01e02.m3u8"
                  }
                ],
                seasonsLoading: false,
                isSaving: false,
                tmdbSeasonsCount: 8,
                onPlay: (ep, audioId) => {
                  ui.showHUD("success", "${ru ? "Играем эпизод " : "Playing episode "}" + ep.episode);
                },
                onStartEditing: () => {},
                onApplyOverride: (seasonNum, epNum) => {},
                onClose: () => {}
              });
            })
        )
    )
);`;
}

export function easyPluginIndexJsExample(lang?: string): string {
  const ru = wikiLang(lang) === "ru";
  const L = wikiLang(lang);

  if (ru) {
    return `import { PotokSDK } from 'potok-sdk';

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
${buildPlaybackInfoBlock(L, "            ")}
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
        .subtitle(\`Кинопоиск ID: \${props.mediaId}\`)
        .child(
          VStack()
            .spacing(8)
            .child(Text(\`Вы просматриваете страницу "\${props.title}". Этот блок встроил кастомный плагин.\`).variant("secondary"))
            .child(
              HStack()
                .spacing(6)
                .child(Badge("Качество 1080p").color("success"))
                .child(Badge("Лицензия").color("info"))
            )
        )
    };
  }
});`;
  }

  return `import { PotokSDK } from 'potok-sdk';

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
${buildPlaybackInfoBlock(L, "            ")}
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
        .subtitle(\`Kinopoisk ID: \${props.mediaId}\`)
        .child(
          VStack()
            .spacing(8)
            .child(Text(\`You are viewing "\${props.title}". This block was added by a custom plugin.\`).variant("secondary"))
            .child(
              HStack()
                .spacing(6)
                .child(Badge("1080p quality").color("success"))
                .child(Badge("License").color("info"))
            )
        )
    };
  }
});`;
}

/** Full DeclarativeStreamSource — every handler and field from types.ts */
export function registerStreamSourceExample(): string {
  return `const { streams } = PotokSDK;

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
});`;
}

/** MediaSearchProviderBuilder — icon + onSearch (register is a synonym of onSearch) */
export function searchProviderExample(): string {
  return `const { media } = PotokSDK;

media
  .searchProvider("my-search", "Custom Search")
  .icon("https://example.com/icon.png")
  .onSearch(async (query) => {
    return [{ id: "1", title: "Result for " + query }];
  });`;
}

/** MediaPlayer component — full playback + isNetworkOffline */
export function mediaPlayerComponentExample(lang?: string): string {
  const L = wikiLang(lang);
  return `const { ui } = PotokSDK;

ui.render(
  MediaPlayer()
    .playback({
${buildPlaybackInfoBlock(L, "      ")}
    })
    .isNetworkOffline(false)
    .height(400)
);`;
}