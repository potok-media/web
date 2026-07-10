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

// -------------------------------------------------------------
// Generic content model — decoupled from the TMDB-shaped SDKMediaCard so plugins can render
// cards/rows/heroes from ANY data source (custom catalogs, music, live TV, books, …).
// -------------------------------------------------------------

export interface SDKContentBadge {
  text: string;
  color?: "info" | "success" | "warning" | "error" | "accent";
}

export interface SDKContentItem {
  /** Stable id used as focus/React key and passed back to click handlers. */
  id: string | number;
  title: string;
  subtitle?: string;
  /** Vertical poster (portrait cards). */
  image?: string;
  /** Wide/backdrop image (landscape cards & heroes). */
  wideImage?: string;
  /** Optional transparent title logo (heroes). */
  logo?: string;
  badges?: SDKContentBadge[];
  /** Free-form metadata lines (year, genre, duration…). */
  meta?: string[];
  /** Watch/read progress 0..1 → renders a progress overlay bar. */
  progress?: number;
  /** Optional rank for numbered/top-N rows. */
  rank?: number;
  /** Numeric rating (0..10) → shown as the native card's rating pill. */
  rating?: number;
  /** Media kind — drives the native card icon and the default /media/<type>/<id> navigation. */
  mediaType?: "movie" | "tv";
  /** Navigation target used when the host performs default navigation. */
  href?: string;
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

export interface SDKSubtitleInfo {
  id?: string;
  src: string;
  label: string;
  language?: string;
  isDefault?: boolean;
  format?: 'vtt' | 'ass' | string;
  name?: string;
  srclang?: string;
  url?: string;
}

// A backend "presence session" the player drives as a plain heartbeat, without knowing which backend
// it is. The plugin (coupled to its backend) supplies the URLs + the identity to echo; the player POSTs
// keepalive on a timer while open and stop (sendBeacon) on close. Keeps the player provider-agnostic.
export interface SDKPlaybackSession {
  keepaliveUrl: string;
  stopUrl: string;
  intervalSec?: number;
  hash?: string;
  file?: string;
  // Generic status endpoint the player MAY poll for warm-up/buffering progress. Provider-agnostic: the
  // player reads the SDKPlaybackStatus shape (with legacy peers/downloadSpeed fallbacks) and never learns
  // the backend kind. The plugin supplies the URL; omit for instant/CDN sources.
  statusUrl?: string;
  statusIntervalSec?: number;
}

// Generic warm-up/buffering status the player polls `SDKPlaybackSession.statusUrl` for. All fields are
// optional so any provider fills what it has; the player renders progress without backend specifics.
export interface SDKPlaybackStatus {
  ready?: boolean;        // backend considers the stream serviceable
  connected?: number;     // generic "sources connected" (e.g. torrent peers)
  bytesPerSec?: number;   // generic download throughput
}

// Generic scrub-preview thumbnails. `urlTemplate` carries a `{time}` placeholder the player substitutes
// with the (rounded) position in seconds. Any provider that can render a frame at a time offset fills it.
export interface SDKThumbnails {
  urlTemplate: string;
  intervalSec?: number;   // rounding bucket in seconds (cache-friendly); default 5
}

export interface SDKPlaybackInfo {
  streamUrl: string;
  streamType?: 'mp4' | 'm3u8' | 'hls' | 'dash' | string;
  title: string;
  season?: number;
  episode?: number;
  torrentHash?: string;
  fileIndex?: string;
  audios?: { id: string; name: string; url: string }[];
  headers?: Record<string, string>;
  providerId?: string;
  voice?: string;
  subtitles?: SDKSubtitleInfo[];
  session?: SDKPlaybackSession;
  duration?: number;
  /** @deprecated intro/outro now come from the player's own timecode source (introdb); providers may omit. */
  introStart?: number;
  introEnd?: number;
  outroStart?: number;
  outroEnd?: number;
  thumbnails?: SDKThumbnails;
  requiresBuffering?: boolean; // stream warms up → player shows the loading/progress overlay until first frame
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
  // Curated style tokens (sanitized host-side; applied inline over any component).
  background?: string;
  textColor?: string;
  borderColor?: string;
  borderRadius?: string;
  shadow?: string;
  opacity?: number;
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
    selected?: string | string[];
    options?: { label?: string; value?: string; type?: "item" | "header" | "divider" }[];
    variant?: "default" | "glass";
    icon?: string;
    closeOnSelect?: boolean;
    multiple?: boolean;
    resetLabel?: string;
    resetValue?: string | string[];
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

// -------------------------------------------------------------
// Generic content components (SDKContentItem-based)
// -------------------------------------------------------------

export interface ContentCardSchema extends BaseSchema {
  type: "ContentCard";
  props: SDKBaseComponentProps & {
    item: SDKContentItem;
    orientation?: "portrait" | "landscape";
  };
  events?: BaseSchema["events"] & { onClick?: string };
}

export interface ContentRowSchema extends BaseSchema {
  type: "ContentRow";
  props: SDKBaseComponentProps & {
    title?: string;
    items?: SDKContentItem[];
    orientation?: "portrait" | "landscape";
    seeAllLabel?: string;
  };
  events?: BaseSchema["events"] & { onCardClick?: string; onSeeAllClick?: string };
}

export interface HeroSchema extends BaseSchema {
  type: "Hero";
  props: SDKBaseComponentProps & {
    items?: SDKContentItem[];
    playLabel?: string;
    detailsLabel?: string;
  };
  events?: BaseSchema["events"] & { onPlay?: string; onDetails?: string };
}

// -------------------------------------------------------------
// Generic primitives
// -------------------------------------------------------------

export interface ImageSchema extends BaseSchema {
  type: "Image";
  props: SDKBaseComponentProps & {
    src?: string;
    alt?: string;
    aspectRatio?: string;
    fallback?: string;
    rounded?: boolean | string;
    fit?: "cover" | "contain";
  };
  events?: BaseSchema["events"] & { onClick?: string };
}

export interface IconSchema extends BaseSchema {
  type: "Icon";
  props: SDKBaseComponentProps & {
    name: string;
    size?: string | number;
    color?: string;
  };
}

export interface TabsSchema extends BaseSchema {
  type: "Tabs";
  props: SDKBaseComponentProps & {
    items?: { id: string; label: string; icon?: string }[];
    value?: string;
  };
  events?: BaseSchema["events"] & { onChange?: string };
}

export interface ListSchema extends BaseSchema {
  type: "List";
  props: SDKBaseComponentProps & {
    items?: {
      id: string;
      title: string;
      subtitle?: string;
      icon?: string;
      badge?: string;
      trailingIcon?: string;
      disabled?: boolean;
    }[];
  };
  events?: BaseSchema["events"] & { onItemClick?: string };
}

export interface TooltipSchema extends BaseSchema {
  type: "Tooltip";
  props: SDKBaseComponentProps & {
    text?: string;
    placement?: "top" | "bottom" | "left" | "right";
  };
}

export interface ProgressBarSchema extends BaseSchema {
  type: "ProgressBar";
  props: SDKBaseComponentProps & {
    value?: number;
    variant?: "accent" | "success" | "warning" | "error";
    label?: string;
    showValue?: boolean;
  };
}

export interface SkeletonSchema extends BaseSchema {
  type: "Skeleton";
  props: SDKBaseComponentProps & {
    rounded?: boolean | string;
    count?: number;
  };
}

export interface EmptyStateSchema extends BaseSchema {
  type: "EmptyState";
  props: SDKBaseComponentProps & {
    icon?: string;
    title?: string;
    description?: string;
    actionLabel?: string;
  };
  events?: BaseSchema["events"] & { onAction?: string };
}

export interface AlertSchema extends BaseSchema {
  type: "Alert";
  props: SDKBaseComponentProps & {
    text?: string;
    title?: string;
    variant?: "info" | "success" | "warning" | "error";
    icon?: string;
  };
}

export interface ChipSchema extends BaseSchema {
  type: "Chip";
  props: SDKBaseComponentProps & {
    text: string;
    active?: boolean;
    icon?: string;
  };
  events?: BaseSchema["events"] & { onClick?: string };
}

export interface IconButtonSchema extends BaseSchema {
  type: "IconButton";
  props: SDKBaseComponentProps & {
    icon: string;
    label?: string;
    accent?: boolean;
    size?: "sm" | "md" | "lg";
  };
  events?: BaseSchema["events"] & { onClick?: string };
}

// -------------------------------------------------------------
// Phase 2 components
// -------------------------------------------------------------

export interface ModalSchema extends BaseSchema {
  type: "Modal";
  props: SDKBaseComponentProps & {
    open?: boolean;
    title?: string;
    variant?: "modal" | "sheet" | "popover";
    closeOnBackdrop?: boolean;
  };
  events?: BaseSchema["events"] & { onClose?: string };
}

export interface CollapsibleSchema extends BaseSchema {
  type: "Collapsible";
  props: SDKBaseComponentProps & {
    title?: string;
    open?: boolean;
  };
  events?: BaseSchema["events"] & { onToggle?: string };
}

export interface AvatarSchema extends BaseSchema {
  type: "Avatar";
  props: SDKBaseComponentProps & {
    src?: string;
    name?: string;
    size?: "sm" | "md" | "lg";
    fallback?: string;
    shape?: "circle" | "square";
  };
}

export interface RatingSchema extends BaseSchema {
  type: "Rating";
  props: SDKBaseComponentProps & {
    value?: number;
    max?: number;
    showValue?: boolean;
    size?: "sm" | "md" | "lg";
  };
}

export interface TagListSchema extends BaseSchema {
  type: "TagList";
  props: SDKBaseComponentProps & {
    tags?: (string | { id?: string; label: string })[];
  };
  events?: BaseSchema["events"] & { onTagClick?: string };
}

export interface SectionHeaderSchema extends BaseSchema {
  type: "SectionHeader";
  props: SDKBaseComponentProps & {
    title: string;
    subtitle?: string;
    actionLabel?: string;
  };
  events?: BaseSchema["events"] & { onAction?: string };
}

// -------------------------------------------------------------
// Phase 2 batch 2
// -------------------------------------------------------------

export interface ContinueWatchingRowSchema extends BaseSchema {
  type: "ContinueWatchingRow";
  props: SDKBaseComponentProps & { title?: string; items?: SDKContentItem[] };
  events?: BaseSchema["events"] & { onCardClick?: string };
}

export interface TopTenRowSchema extends BaseSchema {
  type: "TopTenRow";
  props: SDKBaseComponentProps & { title?: string; items?: SDKContentItem[]; seeAllLabel?: string };
  events?: BaseSchema["events"] & { onCardClick?: string; onSeeAllClick?: string };
}

export interface PosterGridSchema extends BaseSchema {
  type: "PosterGrid";
  props: SDKBaseComponentProps & {
    items?: SDKContentItem[];
    minWidth?: string;
    loadMoreLabel?: string;
  };
  events?: BaseSchema["events"] & { onCardClick?: string; onLoadMore?: string };
}

export interface DetailHeroSchema extends BaseSchema {
  type: "DetailHero";
  props: SDKBaseComponentProps & {
    item: SDKContentItem;
    actions?: { id: string; label: string; icon?: string; variant?: string }[];
  };
  events?: BaseSchema["events"] & { onAction?: string };
}

export interface RangeSchema extends BaseSchema {
  type: "Range";
  props: SDKBaseComponentProps & {
    name?: string;
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    showValue?: boolean;
  };
  events?: BaseSchema["events"] & { onChange?: string };
}

export interface SegmentedSchema extends BaseSchema {
  type: "Segmented";
  props: SDKBaseComponentProps & {
    items?: { id: string; label: string }[];
    value?: string;
  };
  events?: BaseSchema["events"] & { onChange?: string };
}

// -------------------------------------------------------------
// Phase 2 batch 3
// -------------------------------------------------------------

export interface DropdownSchema extends BaseSchema {
  type: "Dropdown";
  props: SDKBaseComponentProps & {
    label?: string;
    icon?: string;
    items?: { id: string; label: string; icon?: string }[];
    value?: string;
  };
  events?: BaseSchema["events"] & { onSelect?: string };
}

export interface FileInputSchema extends BaseSchema {
  type: "FileInput";
  props: SDKBaseComponentProps & {
    name?: string;
    label?: string;
    accept?: string;
    multiple?: boolean;
  };
  events?: BaseSchema["events"] & { onChange?: string };
}

export interface FieldSchema extends BaseSchema {
  type: "Field";
  props: SDKBaseComponentProps & {
    label?: string;
    hint?: string;
  };
}

export interface CarouselSchema extends BaseSchema {
  type: "Carousel";
  props: SDKBaseComponentProps & {
    spacing?: number;
  };
}

export interface ScrollerSchema extends BaseSchema {
  type: "Scroller";
  props: SDKBaseComponentProps & {
    orientation?: "horizontal" | "vertical";
    spacing?: number;
  };
}

export interface PageSchema extends BaseSchema {
  type: "Page";
  props: SDKBaseComponentProps & {
    title?: string;
    spacing?: number;
  };
}

export interface SidebarGroupSchema extends BaseSchema {
  type: "SidebarGroup";
  props: SDKBaseComponentProps & { title?: string };
}

export type UIComponentSchema =
  | SidebarGroupSchema
  | DropdownSchema
  | FileInputSchema
  | FieldSchema
  | CarouselSchema
  | ScrollerSchema
  | PageSchema
  | ContinueWatchingRowSchema
  | TopTenRowSchema
  | PosterGridSchema
  | DetailHeroSchema
  | RangeSchema
  | SegmentedSchema
  | ModalSchema
  | CollapsibleSchema
  | AvatarSchema
  | RatingSchema
  | TagListSchema
  | SectionHeaderSchema
  | ContentCardSchema
  | ContentRowSchema
  | HeroSchema
  | ImageSchema
  | IconSchema
  | TabsSchema
  | ListSchema
  | TooltipSchema
  | ProgressBarSchema
  | SkeletonSchema
  | EmptyStateSchema
  | AlertSchema
  | ChipSchema
  | IconButtonSchema
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
  /** RAW parsed season/episode BEFORE any override remap — lets the per-season override editor compute an offset
   * against the raw baseline (offset = targetEpisode − rawSectionFirstEpisode) so it never compounds. */
  rawSeason?: number;
  rawEpisode?: number;
  title: string;
  /** Original torrent file name (title is overwritten with the TMDB episode name when matched). */
  fileName?: string;
  stillPath?: string;
  airDate?: string;
  url: string;
  audios?: { id: string; name: string; url: string }[];
  headers?: Record<string, string>;
}

export interface PlaybackInfo {
  streamUrl: string;
  streamType?: 'mp4' | 'm3u8' | 'hls' | 'dash' | string;
  title: string;
  season?: number;
  episode?: number;
  torrentHash?: string;
  fileIndex?: string;
  audios?: { id: string; name: string; url: string }[];
  headers?: Record<string, string>;
  providerId?: string;
  voice?: string;
  subtitles?: SDKSubtitleInfo[];
  session?: SDKPlaybackSession;
  duration?: number;
  /** @deprecated intro/outro now come from the player's own timecode source (introdb); providers may omit. */
  introStart?: number;
  introEnd?: number;
  outroStart?: number;
  outroEnd?: number;
  thumbnails?: SDKThumbnails;
  requiresBuffering?: boolean; // stream warms up → player shows the loading/progress overlay until first frame
}

export interface SeasonOverrideEntry { season: number; offset: number; }

export interface StreamSourceEpisodesResult {
  episodes: StreamEpisode[];
  tmdbSeasonsCount: number;
  /** Current per-season overrides for this release: source-season key (or "_" sentinel) → {targetSeason, offset}. */
  seasonMap?: Record<string, SeasonOverrideEntry>;
}

/** Deferred slow half of a playback descriptor. getPlaybackInfo returns instantly (so the player opens with
 *  a waiting overlay); this fills in the fields that need a slow probe. The host merges it into the live
 *  playback and the player reacts to the late subtitles/duration. */
export interface PlaybackMetadata {
  subtitles?: PlaybackInfo['subtitles'];
  duration?: number;
}

export interface DeclarativeStreamSource {
  id: string;
  name: string;
  supportedTypes: ('movie' | 'tv')[];
  search(query: StreamSearchQuery): Promise<RawStreamPayload[]>;
  getEpisodes?(stream: RawStreamPayload, context: LookupQuery): Promise<StreamSourceEpisodesResult>;
  getSeasonsMetadata?(stream: RawStreamPayload, context: LookupQuery): Promise<Record<string, unknown>[]>;
  saveSeasonOverride?(stream: RawStreamPayload, context: LookupQuery, sourceSeason: number | null, targetSeason: number, offset: number): Promise<void>;
  clearSeasonOverride?(stream: RawStreamPayload, context: LookupQuery, sourceSeason: number | null): Promise<void>;
  getPlaybackInfo(stream: RawStreamPayload, episode?: StreamEpisode, context?: LookupQuery): Promise<PlaybackInfo>;
  /** Deferred enrichment (subtitles + duration) fetched AFTER getPlaybackInfo so a slow probe never blocks
   *  player-open. Optional: if absent, the descriptor from getPlaybackInfo is treated as complete. */
  getPlaybackMetadata?(stream: RawStreamPayload, episode?: StreamEpisode, context?: LookupQuery): Promise<PlaybackMetadata>;
  refreshStreamUrl?(payload: {
    providerId: string;
    mediaId: number;
    mediaType: 'movie' | 'tv';
    season?: number;
    episode?: number;
    voice?: string;
  }): Promise<{ streamUrl: string; audios?: { id: string; name: string; url: string }[]; headers?: Record<string, string> }>;
}

