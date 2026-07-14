export const domainTypesDts = `
  /** A single TV episode used by EpisodeCard/EpisodesSection. */
  interface SDKTvEpisode {
    id?: number | string;
    episodeNumber?: number;
    episode_number?: number;
    name?: string;
    stillPath?: string;
    still_path?: string;
    airDate?: string;
    air_date?: string;
    overview?: string;
  }

  /** A TV season with its episodes. */
  interface SDKTvSeason {
    id?: number | string;
    seasonNumber?: number;
    season_number?: number;
    episodes?: SDKTvEpisode[];
  }

  /** A playable episode resolved by a stream source (carries the stream URL and audio tracks). */
  interface SDKStreamEpisode {
    id: string;
    season: number;
    episode: number;
    title: string;
    stillPath?: string;
    airDate?: string;
    url: string;
    audios?: { id: string; name: string; url: string }[];
    headers?: Record<string, string>;
  }

  /** A stream/torrent row as rendered by StreamRow. */
  interface SDKStreamUIItem {
    id: string;
    title: string;
    tracker?: string;
    sizeBytes?: number;
    sizeLabel?: string;
    seeders?: number;
    leechers?: number;
    publishDate?: string;
    tags?: { kind: string; value: string }[];
  }

  /** A raw stream payload returned by a stream source before it is resolved to playback. */
  interface SDKRawStreamPayload {
    title: string;
    url?: string;
    magnet?: string;
    quality?: string;
    size?: string | number;
    seeds?: number;
    peers?: number;
    provider?: string;
    hash?: string;
    voice?: string;
    kind?: 'hls' | 'mp4' | string;
    headers?: Record<string, string>;
  }

  /** A saved backend connection profile managed by ProfileSelector. */
  interface SDKConnectionProfile {
    id: string;
    name: string;
    gatewayURL: string;
    playerServerURL: string;
    searchEngineURL: string;
    playerServerAuthEnabled: boolean;
    playerServerAuthLogin: string;
    playerServerAuthPassword?: string;
  }

  /** A single row of the List component. */
  interface SDKListItem {
    id: string;
    title: string;
    subtitle?: string;
    icon?: string;
    badge?: string;
    trailingIcon?: string;
    disabled?: boolean;
  }

  /** Config passed to ui.showEpisodeSelector to open the episode picker dialog. */
  interface SDKEpisodeSelectorConfig {
    isOpen?: boolean;
    title?: string;
    subtitle?: string;
    backdropSrc?: string;
    seasons?: SDKTvSeason[];
    episodes?: SDKStreamEpisode[];
    seasonsLoading?: boolean;
    onPlay?: (payload: SDKStreamEpisode) => void;
    onClose?: () => void;
    onApplyOverride?: (payload: unknown) => void;
    onStartEditing?: (payload: unknown) => void;
  }

  /** A dynamic accent theme a plugin can register. */
  interface SDKAccentTheme {
    id: string;
    name: string;
    colors: Record<string, string>;
  }

  /** Plugin metadata passed to registerPlugin. */
  interface ExtensionPluginMetadata {
    id: string;
    name: string;
    version: string;
    description?: string;
  }

  /** A slot contribution registered with registerSlotContribution. */
  interface SlotContribution {
    id: string;
    slotName: string;
    render: (props?: unknown) => { label?: string; icon?: string; layout: UIComponent };
  }

  /** A declarative stream source a plugin registers to provide torrents/streams for media. */
  interface DeclarativeStreamSource {
    id: string;
    name: string;
    supportedTypes: ('movie' | 'tv')[];
    search(query: { title: string; year?: number; imdbId?: string; tmdbId?: number; type: 'movie' | 'tv'; season?: number; episode?: number }): Promise<SDKRawStreamPayload[]>;
    getEpisodes?(stream: SDKRawStreamPayload, context: { type: 'movie' | 'tv'; tmdbId: number; season?: number; episode?: number }): Promise<{ episodes: SDKStreamEpisode[]; tmdbSeasonsCount: number; parsingSuspect?: boolean }>;
    // Optional per-FILE overrides. Implement BOTH to opt into the host's per-file anchor/pin editing UI.
    // mode: 'anchor' (renumber the run from this file) | 'pin' (fix just this file, e.g. a special).
    saveFileOverride?(stream: SDKRawStreamPayload, context: { type: 'movie' | 'tv'; tmdbId: number }, fileId: string, season: number, episode: number, mode: 'anchor' | 'pin'): Promise<void>;
    clearFileOverride?(stream: SDKRawStreamPayload, context: { type: 'movie' | 'tv'; tmdbId: number }, fileId: string): Promise<void>;
    getPlaybackInfo(stream: SDKRawStreamPayload, episode?: SDKStreamEpisode, context?: { type: 'movie' | 'tv'; tmdbId: number; season?: number; episode?: number }): Promise<SDKPlaybackInfo>;
  }
`;
