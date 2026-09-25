export const domainTypesDts = `
  type SDKArmResolutionState = 'resolved' | 'partial' | 'ambiguous' | 'disputed' | 'unresolved' | 'providerError' | 'withheld' | 'confirmedNone' | 'notApplicable';
  type SDKArmCoverageState = 'complete' | 'partial' | 'ambiguous' | 'unresolved' | 'withheld' | 'stale' | 'providerFallback';
  type SDKArmNameRole = 'original' | 'official' | 'common' | 'alias' | 'romanized' | 'short' | 'working';
  type SDKArmEpisodeRelation = 'canon' | 'mixed' | 'filler' | 'recap' | 'unknown';
  type SDKArmWatchRecommendation = 'essential' | 'recommended' | 'optional' | 'skip' | 'unknown';
  type SDKArmAdaptationBasis = 'manga' | 'lightNovel' | 'novel' | 'comic' | 'game' | 'other';
  type SDKArmPublicationPolicy = 'public' | 'potok-owned' | 'redistributable' | 'derived' | 'local-only' | 'query-only' | 'non-redistributable' | 'withheld';

  interface SDKArmProviderReference {
    provider: string;
    entityKind: string;
    value: string;
  }

  interface SDKArmWarning {
    code: string;
    message: string;
  }

  interface SDKArmLocalizedText {
    value: string;
    requestedLocale?: string | null;
    resolvedLocale?: string | null;
    role: SDKArmNameRole;
    usedFallback: boolean;
  }

  interface SDKArmName {
    value: string;
    locale?: string | null;
    script?: string | null;
    role: SDKArmNameRole;
    sourceId?: string | null;
  }

  interface SDKArmEnvelope {
    graphVersion: string | null;
    resolutionState: SDKArmResolutionState;
    coverageState: SDKArmCoverageState;
    warnings: SDKArmWarning[];
  }

  interface SDKArmWork {
    id: string;
    kind: string;
    defaultOrderingId: string | null;
    displayTitle: SDKArmLocalizedText | null;
    names?: SDKArmName[];
    providerReferences: SDKArmProviderReference[];
  }

  interface SDKArmResolveResponse extends SDKArmEnvelope {
    query: SDKArmProviderReference;
    work: SDKArmWork | null;
    alternatives: SDKArmWork[];
  }

  interface SDKArmWorkResponse extends SDKArmEnvelope {
    work: SDKArmWork | null;
  }

  interface SDKArmEpisode {
    id: string;
    groupId: string;
    ordinal: string;
    sortPosition: number;
    displaySeasonNumber?: number | null;
    displayEpisodeNumber?: number | null;
    displayTitle: SDKArmLocalizedText | null;
    names?: SDKArmName[];
    overview?: string | null;
    stillPath?: string | null;
    airDate?: string | null;
    providerReferences: SDKArmProviderReference[];
    annotation?: SDKArmEpisodeAnnotationSummary | null;
  }

  interface SDKArmEpisodeAnnotationEvidence {
    id: string;
    episodeId: string;
    relation: SDKArmEpisodeRelation;
    recommendation: SDKArmWatchRecommendation;
    confidence: number;
    sourceId: string;
    provenance?: string | null;
    publicationPolicy: SDKArmPublicationPolicy;
    adaptationBasis?: SDKArmAdaptationBasis | null;
  }

  interface SDKArmEpisodeAnnotationSummary {
    episodeId: string;
    resolutionState: SDKArmResolutionState;
    relation: SDKArmEpisodeRelation;
    recommendation: SDKArmWatchRecommendation;
    confidence: number;
    evidence: SDKArmEpisodeAnnotationEvidence[];
  }

  interface SDKArmEpisodeAnnotationsResponse extends SDKArmEnvelope {
    episodes: SDKArmEpisodeAnnotationSummary[];
  }

  interface SDKArmEpisodeGroup {
    id: string;
    kind: string;
    displayNumber?: number | null;
    sortPosition: number;
    displayTitle: SDKArmLocalizedText | null;
    names?: SDKArmName[];
    episodes: SDKArmEpisode[];
  }

  interface SDKArmEpisodeOrdering {
    id: string;
    kind: string;
    isDefault: boolean;
  }

  interface SDKArmEpisodeLayoutResponse extends SDKArmEnvelope {
    workId: string;
    ordering: SDKArmEpisodeOrdering | null;
    groups: SDKArmEpisodeGroup[];
  }

  interface SDKArmMediaSummary {
    workId: string | null;
    defaultOrderingId: string | null;
    graphVersion: string | null;
    resolutionState: SDKArmResolutionState;
    coverageState: SDKArmCoverageState;
    warnings?: SDKArmWarning[];
  }

  interface SDKArmRequestOptions {
    locale?: string;
    timeoutMs?: number;
    signal?: AbortSignal;
  }

  interface SDKArmLayoutRequestOptions extends SDKArmRequestOptions {
    ordering?: 'default' | string;
  }

  /** One canonical episode covered by a release file; joined files publish several targets. */
  interface SDKReleaseBindingTarget {
    episodeId: string;
    orderingId: string;
    groupId: string;
    compatibility?: { season?: number | null; episode?: number | null } | null;
  }

  interface SDKArmBindingTarget {
    workId: string;
    orderingId: string;
    groupId: string;
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
    armAnnotation?: SDKArmEpisodeAnnotationSummary | null;
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
    orderingId?: string | null;
    groupId?: string | null;
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
      orderingId: string;
      groupId: string;
      confidence: number;
      compatibility?: { season?: number | null; episode?: number | null } | null;
    }>;
    armAnnotation?: SDKArmEpisodeAnnotationSummary | null;
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
    search(query: { title: string; originalTitle?: string; englishTitle?: string; year?: number; imdbId?: string; tmdbId?: number; workId?: string; orderingId?: string; groupId?: string; episodeId?: string; type: 'movie' | 'tv'; season?: number; episode?: number; forceSearch?: boolean }, onProgress?: (streams: SDKRawStreamPayload[]) => void): Promise<SDKRawStreamPayload[]>;
    getEpisodes?(stream: SDKRawStreamPayload, context: { type: 'movie' | 'tv'; tmdbId: number; workId?: string; orderingId?: string; groupId?: string; episodeId?: string; season?: number; episode?: number }): Promise<{ episodes: SDKStreamEpisode[]; tmdbSeasonsCount?: number; parsingSuspect?: boolean; seasonMap?: Record<string, { season: number; offset: number }>; fileMap?: Record<string, SDKFileOverrideEntry>; arm?: { state: string; workId?: string | null; orderingId?: string | null; graphVersion?: string | null } | null }>;
    // Optional per-FILE overrides. Implement BOTH to opt into the host's per-file anchor/pin editing UI.
    // mode: 'anchor' (renumber the run from this file) | 'pin' (fix just this file, e.g. a special).
    saveFileOverride?(stream: SDKRawStreamPayload, context: { type: 'movie' | 'tv'; tmdbId: number }, fileId: string, season: number, episode: number, mode: 'anchor' | 'pin'): Promise<void>;
    clearFileOverride?(stream: SDKRawStreamPayload, context: { type: 'movie' | 'tv'; tmdbId: number }, fileId: string): Promise<void>;
    saveEpisodeBinding?(stream: SDKRawStreamPayload, context: { type: 'movie' | 'tv'; tmdbId: number; workId?: string; orderingId?: string; groupId?: string; episodeId?: string }, override: SDKEpisodeBindingOverride): Promise<void>;
    getPlaybackInfo(stream: SDKRawStreamPayload, episode?: SDKStreamEpisode, context?: { type: 'movie' | 'tv'; tmdbId: number; workId?: string; orderingId?: string; groupId?: string; episodeId?: string; season?: number; episode?: number }): Promise<SDKPlaybackInfo>;
  }
`;
