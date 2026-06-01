import type { StreamUIItem, MediaCard, TvEpisode, CastMember, ConnectionProfile } from "./ApiTypes";

export interface SelectedEpisodeType {
  episode: TvEpisode;
  seasonNumber: number;
}

export interface SDKTvEpisode {
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

export interface SDKTvSeason {
  id?: number | string;
  seasonNumber?: number;
  season_number?: number;
  episodes?: SDKTvEpisode[];
}

export interface UIComponentSchema {
  type: string;
  id: string;
  props: {
    padding?: number | [number, number] | [number, number, number, number];
    margin?: number | [number, number] | [number, number, number, number];
    width?: string | number;
    height?: string | number;
    visible?: boolean;
    disabled?: boolean;
    flex?: number;
    text?: string;
    level?: 1 | 2 | 3 | 4;
    variant?: 'primary' | 'secondary' | 'hint' | 'error' | 'success' | 'danger' | 'ghost' | 'sidebar-item';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    color?: 'info' | 'success' | 'warning' | 'error';
    name?: string;
    label?: string;
    placeholder?: string;
    inputType?: 'text' | 'password' | 'number';
    value?: string | number;
    checked?: boolean;
    bold?: boolean;
    description?: string;
    options?: { label: string; value: string }[];
    selected?: string;
    title?: string;
    subtitle?: string;
    spacing?: number;
    alignItems?: 'start' | 'center' | 'end' | 'stretch';
    justifyContent?: 'start' | 'center' | 'end' | 'between' | 'around';
    stream?: StreamUIItem;
    streams?: RawStreamPayload[];
    loading?: boolean;
    showFilters?: boolean;
    emptyText?: string;
    nounPlurals?: string[];
    item?: MediaCard;
    items?: MediaCard[];
    icon?: string;

    // Strict types for host components
    message?: string;
    fullscreen?: boolean;
    mediaId?: number;
    numberOfSeasons?: number;
    cast?: CastMember[];
    media?: MediaCard;
    selectedEpisode?: SelectedEpisodeType | null;
    playback?: PlaybackInfo;
    isNetworkOffline?: boolean;
    connectionProfiles?: ConnectionProfile[];
    activeProfileID?: string | null;
    isSettingsLocked?: boolean;
    countLabel?: string;
    trackers?: string[];
    sortOption?: string;
    showSort?: boolean;
    isOpen?: boolean;
    seasonsLoading?: boolean;
    backdropSrc?: string;
    seasons?: SDKTvSeason[];
    qualityFilter?: string;
    activeTracker?: string;
    episodes?: StreamEpisode[];
    isSaving?: boolean;
    tmdbSeasonsCount?: number;
    posterSrc?: string;
    mediaType?: string;
    content?: string;
  };
  children?: UIComponentSchema[];
  events?: {
    onClick?: string;
    onChange?: string;
    onSelectStream?: string;
    onPlay?: string;
    onDetails?: string;

    // Events for host components
    onEpisodeClick?: string;
    onResetEpisode?: string;
    onCardClick?: string;
    onSeeAllClick?: string;
    onClose?: string;
    onSelectProfile?: string;
    onStartEdit?: string;
    onDeleteProfile?: string;
    onStartAdd?: string;
    onClear?: string;
    onRefresh?: string;
    onQualityChange?: string;
    onTrackerChange?: string;
    onSortChange?: string;
    onApplyOverride?: string;
    onStartEditing?: string;
  };
}

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  entrypoint: string;
  permissions?: string[];
  slots?: {
    slotName: string;
    id: string;
    title: string;
  }[];
  config?: Record<
    string,
    {
      type: 'string' | 'boolean' | 'number';
      default: string | boolean | number;
      label: string;
      dependsOn?: string;
    }
  >;
}

export interface ExtensionPluginMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
}

export interface LookupQuery {
  type: 'movie' | 'tv';
  tmdbId: number;
  season?: number;
  episode?: number;
}

export interface StreamResult {
  provider: string;
  quality: string;
  voice: string;
  label: string;
  url: string;
  kind: 'hls' | 'mp4';
  headers?: Record<string, string>;
  audios?: { name: string; url: string }[];
}

export interface LookupSource {
  id: string;
  name: string;
  supportedTypes: string[];
}

export interface SlotContribution {
  slotName: string;
  id: string;
  title?: string;
}

export interface SlotRenderResponse {
  slotId: string;
  label: string;
  icon?: string;
  layout: UIComponentSchema;
}

export interface RegisteredExtension {
  id: string;
  url: string; // The base directory URL of the extension
  manifest: ExtensionManifest;
  enabled: boolean;
}

export interface ElementMutation {
  elementId: string;
  action: 'hide' | 'edit' | 'before' | 'after' | 'replace';
  props?: Record<string, unknown>;
  layout?: UIComponentSchema;
}

export interface BlockMutationContribution {
  blockName: string;
  mutations: ElementMutation[];
  appends: UIComponentSchema[];
  prepends: UIComponentSchema[];
}

export interface RawStreamPayload {
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

export interface StreamSearchQuery {
  title: string;
  year?: number;
  imdbId?: string;
  tmdbId?: number;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
}

export interface StreamProviderRegistration {
  id: string;
  name: string;
  icon?: string;
}

export interface StreamEpisode {
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

export interface PlaybackInfo {
  streamUrl: string;
  streamType?: 'mp4' | 'm3u8' | 'dash' | string;
  title: string;
  season?: number;
  episode?: number;
  torrentHash?: string;
  audios?: { id: string; name: string; url: string }[];
  headers?: Record<string, string>;
  providerId?: string;
  voice?: string;
}

export interface StreamSourceEpisodesResult {
  episodes: StreamEpisode[];
  tmdbSeasonsCount: number;
}

export interface DeclarativeStreamSource {
  id: string;
  name: string;
  supportedTypes: ('movie' | 'tv')[];
  search(query: StreamSearchQuery): Promise<RawStreamPayload[]>;
  getEpisodes?(stream: RawStreamPayload, context: LookupQuery): Promise<StreamSourceEpisodesResult>;
  getSeasonsMetadata?(stream: RawStreamPayload, context: LookupQuery): Promise<Record<string, unknown>[]>;
  saveMetadataOverride?(stream: RawStreamPayload, context: LookupQuery, seasonNum: number, episodeOffset: number): Promise<void>;
  getPlaybackInfo(stream: RawStreamPayload, episode?: StreamEpisode, context?: LookupQuery): Promise<PlaybackInfo>;
  refreshStreamUrl?(payload: {
    providerId: string;
    mediaId: number;
    mediaType: 'movie' | 'tv';
    season?: number;
    episode?: number;
    voice?: string;
  }): Promise<{ streamUrl: string; audios?: { id: string; name: string; url: string }[]; headers?: Record<string, string> }>;
}
