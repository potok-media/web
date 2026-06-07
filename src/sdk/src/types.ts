// SDK Isolated DTO and schema type definitions
import type { TvEpisode } from "../../network/ApiTypes";

export interface SDKWatchProgress {
  completed: number;
  aired: number;
  percentage: number;
  lastEpisodeTitle?: string;
  lastSeason?: number;
  lastEpisode?: number;
  nextEpisodeTitle?: string;
  nextSeason?: number;
  nextEpisode?: number;
  watchedEpisodes?: { season: number; number: number }[];
}

export interface SDKCastMember {
  name?: string;
  Name?: string;
  character?: string;
  Character?: string;
  role?: string;
  profileSrc?: string;
  ProfileSrc?: string;
}

export interface SDKMediaCard {
  id: number;
  title: string;
  originalTitle?: string;
  englishTitle?: string;
  subtitle?: string;
  badgeText?: string;
  posterSrc?: string;
  backdropSrc?: string;
  logoSrc?: string;
  studioLogoSrc?: string;
  mediaType: "movie" | "tv";
  overview?: string;
  genres?: string;
  ageRating?: string;
  tmdbRating?: number;
  imdbRating?: number;
  kpRating?: number;
  numberOfSeasons?: number;
  progress?: SDKWatchProgress;
  isInWatchlist?: boolean;
  isFavorite?: boolean;
  nextEpisodeNumber?: number;
  nextEpisodeSeason?: number;
  nextEpisodeTitle?: string;
  cast?: SDKCastMember[];
  kpId?: string;
  imdbId?: string;
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

export interface SDKSelectedEpisodeType {
  episode: SDKTvEpisode;
  seasonNumber: number;
}

export interface SDKConnectionProfile {
  id: string;
  name: string;
  gatewayURL: string;
  playerServerURL: string;
  searchEngineURL: string;
  playerServerAuthEnabled: boolean;
  playerServerAuthLogin: string;
  playerServerAuthPassword?: string;
}

export interface SDKStreamUIItem {
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

export interface SDKStreamEpisode {
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

export interface SDKPlaybackInfo {
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

export interface SDKRawStreamPayload {
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

// -------------------------------------------------------------
// UI Component Schema discriminated unions
// -------------------------------------------------------------

export interface SDKBaseComponentProps {
  padding?: number | [number, number] | [number, number, number, number];
  margin?: number | [number, number] | [number, number, number, number];
  width?: string | number;
  height?: string | number;
  visible?: boolean;
  flex?: number;
}

export interface BaseSchema {
  id: string;
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
    [key: string]: string | undefined;
  };
}

export interface VStackSchema extends BaseSchema {
  type: "VStack";
  props: SDKBaseComponentProps & {
    spacing?: number;
    alignItems?: 'start' | 'center' | 'end' | 'stretch';
    justifyContent?: 'start' | 'center' | 'end' | 'between' | 'around';
  };
}

export interface HStackSchema extends BaseSchema {
  type: "HStack";
  props: SDKBaseComponentProps & {
    spacing?: number;
    alignItems?: 'start' | 'center' | 'end' | 'stretch';
    justifyContent?: 'start' | 'center' | 'end' | 'between' | 'around';
  };
}

export interface GridSchema extends BaseSchema {
  type: "Grid";
  props: SDKBaseComponentProps & {
    minWidth?: string;
    gap?: string;
  };
}

export interface CardSchema extends BaseSchema {
  type: "Card";
  props: SDKBaseComponentProps & {
    title?: string;
    subtitle?: string;
  };
  events?: BaseSchema["events"] & {
    onClick?: string;
  };
}

export interface MarkdownSchema extends BaseSchema {
  type: "Markdown";
  props: SDKBaseComponentProps & {
    content: string;
  };
}

export interface HeadingSchema extends BaseSchema {
  type: "Heading";
  props: SDKBaseComponentProps & {
    level?: 1 | 2 | 3 | 4;
    text: string;
  };
}

export interface TextSchema extends BaseSchema {
  type: "Text";
  props: SDKBaseComponentProps & {
    variant?: 'primary' | 'secondary' | 'hint' | 'error' | 'success' | 'danger' | 'ghost' | 'sidebar-item';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    bold?: boolean;
    text: string;
  };
}

export interface BadgeSchema extends BaseSchema {
  type: "Badge";
  props: SDKBaseComponentProps & {
    color?: 'info' | 'success' | 'warning' | 'error';
    text: string;
  };
}

export interface StatusRowSchema extends BaseSchema {
  type: "StatusRow";
  props: SDKBaseComponentProps & {
    label: string;
    status?: 'info' | 'success' | 'warning' | 'error' | 'offline';
    value?: string;
  };
}

export interface DividerSchema extends BaseSchema {
  type: "Divider";
  props: SDKBaseComponentProps;
}

export interface SpacerSchema extends BaseSchema {
  type: "Spacer";
  props: SDKBaseComponentProps;
}

export interface ButtonSchema extends BaseSchema {
  type: "Button";
  props: SDKBaseComponentProps & {
    variant?: 'primary' | 'secondary' | 'hint' | 'error' | 'success' | 'danger' | 'ghost' | 'sidebar-item' | string;
    text: string;
    icon?: string;
    disabled?: boolean;
  };
  events?: BaseSchema["events"] & {
    onClick?: string;
  };
}

export interface InputSchema extends BaseSchema {
  type: "Input";
  props: SDKBaseComponentProps & {
    label?: string;
    placeholder?: string;
    inputType?: 'text' | 'password' | 'number' | 'textarea';
    value?: string | number;
    disabled?: boolean;
  };
  events?: BaseSchema["events"] & {
    onChange?: string;
  };
}

export interface ToggleSchema extends BaseSchema {
  type: "Toggle";
  props: SDKBaseComponentProps & {
    label?: string;
    description?: string;
    checked?: boolean;
    disabled?: boolean;
  };
  events?: BaseSchema["events"] & {
    onChange?: string;
  };
}

export interface SelectSchema extends BaseSchema {
  type: "Select";
  props: SDKBaseComponentProps & {
    label?: string;
    selected?: string;
    options?: { label: string; value: string }[];
    disabled?: boolean;
  };
  events?: BaseSchema["events"] & {
    onChange?: string;
  };
}

export interface SearchBarSchema extends BaseSchema {
  type: "SearchBar";
  props: SDKBaseComponentProps & {
    placeholder?: string;
    value?: string;
    disabled?: boolean;
  };
  events?: BaseSchema["events"] & {
    onChange?: string;
    onClear?: string;
  };
}

export interface CodeEditorSchema extends BaseSchema {
  type: "CodeEditor";
  props: SDKBaseComponentProps & {
    label?: string;
    value?: string;
    readOnly?: boolean;
  };
  events?: BaseSchema["events"] & {
    onChange?: string;
  };
}

export interface MediaCardSchema extends BaseSchema {
  type: "MediaCard";
  props: SDKBaseComponentProps & {
    item: SDKMediaCard;
  };
  events?: BaseSchema["events"] & {
    onClick?: string;
  };
}

export interface HeroSpotlightSchema extends BaseSchema {
  type: "HeroSpotlight";
  props: SDKBaseComponentProps & {
    items?: SDKMediaCard[];
  };
  events?: BaseSchema["events"] & {
    onPlay?: string;
    onDetails?: string;
  };
}

export interface EpisodesSectionSchema extends BaseSchema {
  type: "EpisodesSection";
  props: SDKBaseComponentProps & {
    mediaId?: number;
    numberOfSeasons?: number;
  };
  events?: BaseSchema["events"] & {
    onEpisodeClick?: string;
  };
}

export interface SeasonEpisodesSchema extends BaseSchema {
  type: "SeasonEpisodes";
  props: SDKBaseComponentProps & {
    mediaId?: number;
    numberOfSeasons?: number;
  };
  events?: BaseSchema["events"] & {
    onEpisodeClick?: string;
  };
}

export interface MediaCastSchema extends BaseSchema {
  type: "MediaCast";
  props: SDKBaseComponentProps & {
    cast?: SDKCastMember[];
  };
}

export interface MediaOverviewSchema extends BaseSchema {
  type: "MediaOverview";
  props: SDKBaseComponentProps & {
    media: SDKMediaCard;
    selectedEpisode?: SDKSelectedEpisodeType | null;
  };
  events?: BaseSchema["events"] & {
    onResetEpisode?: string;
  };
}

export interface MediaRowSchema extends BaseSchema {
  type: "MediaRow";
  props: SDKBaseComponentProps & {
    title?: string;
    items?: SDKMediaCard[];
    name?: string;
  };
  events?: BaseSchema["events"] & {
    onCardClick?: string;
    onSeeAllClick?: string;
  };
}

export interface MediaPlayerSchema extends BaseSchema {
  type: "MediaPlayer";
  props: SDKBaseComponentProps & {
    playback: SDKPlaybackInfo;
    isNetworkOffline?: boolean;
  };
}

export interface EpisodeSelectorSchema extends BaseSchema {
  type: "EpisodeSelector";
  props: SDKBaseComponentProps & {
    isOpen?: boolean;
    title?: string;
    subtitle?: string;
    episodes?: SDKStreamEpisode[];
    backdropSrc?: string;
    seasonsLoading?: boolean;
    seasons?: SDKTvSeason[];
  };
  events?: BaseSchema["events"] & {
    onClose?: string;
    onPlay?: string;
    onApplyOverride?: string;
    onStartEditing?: string;
  };
}

export interface EpisodeSelectorPopupSchema extends BaseSchema {
  type: "EpisodeSelectorPopup";
  props: SDKBaseComponentProps & {
    isOpen?: boolean;
    title?: string;
    subtitle?: string;
    episodes?: SDKStreamEpisode[];
    backdropSrc?: string;
    seasonsLoading?: boolean;
    seasons?: SDKTvSeason[];
  };
  events?: BaseSchema["events"] & {
    onClose?: string;
    onPlay?: string;
    onApplyOverride?: string;
    onStartEditing?: string;
  };
}

export interface EpisodeCardSchema extends BaseSchema {
  type: "EpisodeCard";
  props: SDKBaseComponentProps & {
    episode: SDKTvEpisode;
  };
  events?: BaseSchema["events"] & {
    onClick?: string;
  };
}

export interface StreamSkeletonListSchema extends BaseSchema {
  type: "StreamSkeletonList";
  props: SDKBaseComponentProps;
}

export interface StreamRowSchema extends BaseSchema {
  type: "StreamRow";
  props: SDKBaseComponentProps & {
    stream: SDKStreamUIItem;
  };
  events?: BaseSchema["events"] & {
    onClick?: string;
  };
}

export interface StreamRowComponentSchema extends BaseSchema {
  type: "StreamRowComponent";
  props: SDKBaseComponentProps & {
    stream: SDKStreamUIItem;
  };
  events?: BaseSchema["events"] & {
    onClick?: string;
  };
}

export interface StreamListSchema extends BaseSchema {
  type: "StreamList";
  props: SDKBaseComponentProps & {
    streams?: SDKRawStreamPayload[];
    loading?: boolean;
    showFilters?: boolean;
    emptyText?: string;
    nounPlurals?: string[];
  };
  events?: BaseSchema["events"] & {
    onSelectStream?: string;
  };
}

export interface LoadingSpinnerSchema extends BaseSchema {
  type: "LoadingSpinner";
  props: SDKBaseComponentProps & {
    message?: string;
    fullscreen?: boolean;
    height?: string | number;
  };
}

export interface ProfileSelectorSchema extends BaseSchema {
  type: "ProfileSelector";
  props: SDKBaseComponentProps & {
    connectionProfiles?: SDKConnectionProfile[];
    activeProfileID?: string | null;
    isSettingsLocked?: boolean;
  };
  events?: BaseSchema["events"] & {
    onSelectProfile?: string;
    onStartEdit?: string;
    onDeleteProfile?: string;
    onStartAdd?: string;
  };
}

export interface StreamFilterBarSchema extends BaseSchema {
  type: "StreamFilterBar";
  props: SDKBaseComponentProps & {
    countLabel?: string;
    qualityFilter?: string;
    activeTracker?: string;
    trackers?: string[];
    showSort?: boolean;
    sortOption?: string;
  };
  events?: BaseSchema["events"] & {
    onRefresh?: string;
    onQualityChange?: string;
    onTrackerChange?: string;
    onSortChange?: string;
  };
}

export type UIComponentSchema =
  | VStackSchema
  | HStackSchema
  | GridSchema
  | CardSchema
  | MarkdownSchema
  | HeadingSchema
  | TextSchema
  | BadgeSchema
  | StatusRowSchema
  | DividerSchema
  | SpacerSchema
  | ButtonSchema
  | InputSchema
  | ToggleSchema
  | SelectSchema
  | SearchBarSchema
  | CodeEditorSchema
  | MediaCardSchema
  | HeroSpotlightSchema
  | EpisodesSectionSchema
  | SeasonEpisodesSchema
  | MediaCastSchema
  | MediaOverviewSchema
  | MediaRowSchema
  | MediaPlayerSchema
  | EpisodeSelectorSchema
  | EpisodeSelectorPopupSchema
  | EpisodeCardSchema
  | StreamSkeletonListSchema
  | StreamRowSchema
  | StreamRowComponentSchema
  | StreamListSchema
  | LoadingSpinnerSchema
  | ProfileSelectorSchema
  | StreamFilterBarSchema;

export interface SelectedEpisodeType {
  episode: TvEpisode;
  seasonNumber: number;
}

export interface ExtensionManifest {
  id: string;
  name: string;
  version?: string;
  description?: string;
  author?: string;
  entrypoint: string;
  category?: string;
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
  hideHeader?: boolean;
}

export interface SlotRenderResponse {
  slotId: string;
  label: string;
  icon?: string;
  layout: UIComponentSchema;
}

export interface RegisteredExtension {
  id: string;
  url: string;
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

