export const domainTypesDts = `
  type SDKArmFillerStatus = 'canon' | 'filler' | 'mixed' | 'recap';

  /** Filler verdict attached to a layout episode; canon renders no badge. */
  interface SDKArmEpisodeFiller {
    status: SDKArmFillerStatus;
    confidence: number | null;
    disputed: boolean;
  }

  /** TMDB episode coordinate published by the graph's TMDB bridge. */
  interface SDKArmTmdbCoordinate {
    show: number;
    season: number;
    episode: number;
  }

  interface SDKArmTitles {
    official?: string | null;
    en?: string | null;
    ru?: string | null;
    original?: string | null;
  }

  interface SDKArmProviderReference {
    provider: string;
    entityKind: string;
    value: string;
  }

  interface SDKArmWork {
    id: string;
    title: string | null;
    titles: SDKArmTitles;
  }

  /** Null workId means the provider reference did not resolve to a Potok work. */
  interface SDKArmResolveResponse {
    workId: string | null;
    graphVersion?: string | null;
  }

  interface SDKArmEpisode {
    id: string;
    number: number;
    title?: string | null;
    overview?: string | null;
    stillPath?: string | null;
    airDate?: string | null;
    filler?: SDKArmEpisodeFiller | null;
    tmdb?: SDKArmTmdbCoordinate | null;
  }

  /** One graph entry (season/sides/movie/ova/specials block); \`id\` IS the binding \`entryId\`. */
  interface SDKArmEpisodeGroup {
    id: string;
    kind: 'season' | 'sides' | 'movie' | 'ova' | 'specials' | string;
    number: number;
    title?: string | null;
    aniListId?: number | null;
    malId?: number | null;
    episodes: SDKArmEpisode[];
  }

  interface SDKArmEpisodeLayoutResponse {
    work: SDKArmWork;
    graphVersion: string | null;
    groups: SDKArmEpisodeGroup[];
  }

  interface SDKArmMediaSummary {
    workId: string | null;
    graphVersion: string | null;
  }

  /** GET /api/arm/v1/version — the graph build stamp. */
  interface SDKArmGraphVersionResponse {
    builtAt: string;
  }

  /** GET /api/arm/v1/works/{id} — enriched work card from media table. */
  interface SDKArmWorkCardResponse {
    workId: string;
    type: string;
    year: number | null;
    originalTitle: string | null;
    originalLanguage: string | null;
    originCountry: string | null;
    adult: boolean;
    seasonsCount: number;
    episodesCount: number;
    entryCount: number | null;
    episodeCount: number | null;
  }

  /** One localized title from a source (media table titles array). */
  interface SDKArmLocalizedTitle {
    locale: string;
    value: string;
  }

  /** GET /api/arm/v1/works/{id}/localized-titles — all stored titles. */
  interface SDKArmLocalizedTitlesResponse {
    titles: SDKArmLocalizedTitle[];
  }

  /** One external id (provider/entityKind/value). */
  interface SDKArmExternalId {
    provider: string;
    entityKind: string;
    value: string;
  }

  /** GET /api/arm/v1/works/{id}/external-ids/simple — all work-level provider keys. */
  interface SDKArmExternalIdsResponse {
    externalIds: SDKArmExternalId[];
  }

  /** One AniList cover image variant. */
  interface SDKArmCoverImage {
    large: string | null;
    medium: string | null;
  }

  /** One AniList studio. */
  interface SDKArmStudio {
    name: string | null;
    url: string | null;
  }

  /** Full AniList display metadata for an entry. */
  interface SDKArmEntryDisplayMetadata {
    cover: SDKArmCoverImage | null;
    genres: string[];
    tags: string[];
    score: number | null;
    studios: SDKArmStudio[];
    description: string | null;
    synonyms: string[];
    format: string | null;
    status: string | null;
    episodeCount: number | null;
    durationMinutes: number | null;
    season: string | null;
    seasonYear: number | null;
    startDate: string | null;
    endDate: string | null;
    source: string | null;
    isAdult: boolean | null;
    popularity: number | null;
    siteUrl: string | null;
  }

  /** Entry-level TMDB bridge coordinate. */
  interface SDKArmEntryTmdbCoordinate {
    showId: number;
    season: number;
  }

  /** One localized release title from release_titles table. */
  interface SDKArmLocalizedReleaseTitle {
    language: string;
    value: string;
    source: string;
  }

  /** One entry (season/side/movie/OVA/specials) with full display metadata. */
  interface SDKArmEntryDetail {
    entryId: string;
    kind: string;
    number: number;
    sortPosition: number;
    structureSource: string;
    externalIds: SDKArmExternalId[];
    localizedTitles: SDKArmLocalizedReleaseTitle[];
    tmdb: SDKArmEntryTmdbCoordinate | null;
    displayMetadata: SDKArmEntryDisplayMetadata | null;
  }

  /** GET /api/arm/v1/works/{id}/entries — full entry list (no pagination). */
  interface SDKArmEntriesResponse {
    entries: SDKArmEntryDetail[];
  }

  /** Episode-level TMDB coordinate (show/season/episode). */
  interface SDKArmEpisodeTmdbCoordinate {
    showId: number;
    season: number;
    episode: number;
  }

  /** One episode with full display metadata. */
  interface SDKArmEpisodeDetail {
    episodeId: string;
    groupId: string;
    number: number;
    tmdb: SDKArmEpisodeTmdbCoordinate | null;
    localizedTitles: SDKArmLocalizedTitle[];
    overview: string | null;
    stillPath: string | null;
    airDate: string | null;
    filler: SDKArmEpisodeFiller | null;
  }

  /** GET /api/arm/v1/works/{id}/episodes — full episode list (no pagination). */
  interface SDKArmEpisodesResponse {
    episodes: SDKArmEpisodeDetail[];
  }

  interface SDKArmRequestOptions {
    locale?: string;
    timeoutMs?: number;
    signal?: AbortSignal;
  }

  interface SDKArmLayoutRequestOptions extends SDKArmRequestOptions {
    /** Optional single-entry slice: the layout then carries only the group with this entryId. */
    groupId?: string;
  }

  /** One canonical episode covered by a release file; joined files publish several targets. */
  interface SDKReleaseBindingTarget {
    episodeId: string;
    entryId: string;
  }

  interface SDKArmBindingTarget {
    workId: string;
    entryId: string;
    episodeId: string;
  }

  interface SDKEpisodeBindingOverride {
    fileId: string;
    mode: 'pin' | 'anchor';
    armTarget: SDKArmBindingTarget;
    scopeFileIds?: string[];
  }

  interface SDKFileOverrideEntry {
    season?: number | null;
    episode?: number | null;
    mode: string;
    armTarget?: SDKArmBindingTarget | null;
    scopeFileIds?: string[] | null;
  }

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
    filler?: SDKArmEpisodeFiller | null;
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
    season?: number;
    episode?: number;
    rawSeason?: number;
    rawEpisode?: number;
    workId?: string | null;
    episodeId?: string | null;
    entryId?: string | null;
    groupTitle?: string;
    groupDisplayNumber?: number;
    groupKind?: string;
    displayOrdinal?: string;
    /** All canonical episodes covered by this file. For joined files, episodeId should be null. */
    episodeIds?: string[];
    targets?: SDKReleaseBindingTarget[];
    resolutionState?: 'resolved' | 'ambiguous' | 'unresolved';
    confidence?: number;
    bindingMethod?: string | null;
    rawEvidence?: {
      kind?: string | null;
      season?: number | null;
      seasons?: number[];
      episode?: number | null;
      ovaNumber?: number | null;
    } | null;
    alternatives?: Array<{
      episodeId: string;
      entryId: string;
      confidence: number;
    }>;
    filler?: SDKArmEpisodeFiller | null;
    title: string;
    stillPath?: string;
    airDate?: string;
    /** Opaque plugin-owned progress identity — the host uses it verbatim as the local progress/resume key. */
    progressId?: string;
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
    search(query: { title: string; searchAliases?: string[]; originalTitle?: string; englishTitle?: string; year?: number; imdbId?: string; tmdbId?: number; workId?: string; entryId?: string; episodeId?: string; type: 'movie' | 'tv'; season?: number; episode?: number; forceSearch?: boolean }, onProgress?: (streams: SDKRawStreamPayload[]) => void): Promise<SDKRawStreamPayload[]>;
    getEpisodes?(stream: SDKRawStreamPayload, context: { type: 'movie' | 'tv'; tmdbId: number; workId?: string; entryId?: string; episodeId?: string; season?: number; episode?: number }): Promise<{ episodes: SDKStreamEpisode[]; tmdbSeasonsCount?: number; parsingSuspect?: boolean; seasonMap?: Record<string, { season: number; offset: number }>; fileMap?: Record<string, SDKFileOverrideEntry>; arm?: { state: string; workId?: string | null; graphVersion?: string | null } | null }>;
    // Optional per-FILE overrides. Implement BOTH to opt into the host's per-file anchor/pin editing UI.
    // mode: 'anchor' (renumber the run from this file) | 'pin' (fix just this file, e.g. a special).
    saveFileOverride?(stream: SDKRawStreamPayload, context: { type: 'movie' | 'tv'; tmdbId: number }, fileId: string, season: number, episode: number, mode: 'anchor' | 'pin'): Promise<void>;
    clearFileOverride?(stream: SDKRawStreamPayload, context: { type: 'movie' | 'tv'; tmdbId: number }, fileId: string): Promise<void>;
    saveEpisodeBinding?(stream: SDKRawStreamPayload, context: { type: 'movie' | 'tv'; tmdbId: number; workId?: string; entryId?: string; episodeId?: string }, override: SDKEpisodeBindingOverride): Promise<void>;
    getPlaybackInfo(stream: SDKRawStreamPayload, episode?: SDKStreamEpisode, context?: { type: 'movie' | 'tv'; tmdbId: number; workId?: string; entryId?: string; episodeId?: string; season?: number; episode?: number }): Promise<SDKPlaybackInfo>;
  }
`;
