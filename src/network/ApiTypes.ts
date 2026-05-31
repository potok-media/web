export interface ServiceInfo {
  configured: boolean;
  online: boolean;
  latencyMs?: number;
}

export interface ServiceStatus {
  bff: ServiceInfo;
  torrentGo: ServiceInfo;
  searchEngine: ServiceInfo;
}

export interface HandshakeResponse {
  multiUserMode?: boolean;
  authRequired?: boolean;
}

export interface MediaCard {
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
  progress?: WatchProgress;
  isInWatchlist?: boolean;
  isFavorite?: boolean;
  nextEpisodeNumber?: number;
  nextEpisodeSeason?: number;
  nextEpisodeTitle?: string;
  cast?: CastMember[];
  kpId?: string;
  imdbId?: string;
}

export interface WatchProgress {
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

export interface HeroItem {
  id: number;
  card: MediaCard;
  backdropSrc?: string;
}

export interface HomeResponse {
  hero: HeroItem[];
  rows: {
    id: string;
    title: string;
    items: MediaCard[];
  }[];
}

export interface TorrentSearchResult {
  id: string;
  title: string;
  tracker?: string;
  sizeBytes?: number;
  sizeLabel: string;
  seeders?: number;
  leechers?: number;
  publishDate?: string;
  magnetUri?: string;
  link?: string;
  tags?: { kind: string; value: string }[];
  viewed?: boolean;
  override?: TorrentOverride;
}

export interface TorrentOverride {
  hash: string;
  season?: number;
  episodeOffset?: number;
}

export interface TorrentFileItem {
  id: string;
  title?: string;
  sizeLabel?: string;
  sizeBytes?: number;
  path?: string;
  season?: number;
  episode?: number;
  isSerial: boolean;
  folderName: string;
  extension: string;
}

export interface PotokUser {
  id?: string;
  username: string;
  syncStrategy: string;
  traktAccessToken?: string | null;
}

export interface ConnectionProfile {
  id: string;
  name: string;
  gatewayURL: string;
  torrentGoURL: string;
  searchEngineURL: string;
  torrentGoAuthEnabled: boolean;
  torrentGoAuthLogin: string;
  torrentGoAuthPassword?: string;
}

export interface TraktProfile {
  avatarUrl?: string;
  name?: string;
  username: string;
  isVip?: boolean;
  moviesWatched: number;
  episodesWatched: number;
  totalWatchMinutes: number;
  ratingsCount: number;
}

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
}

export interface TvEpisode {
  id: number;
  name: string;
  overview?: string;
  episodeNumber: number;
  seasonNumber: number;
  airDate?: string;
  stillPath?: string;
  still_path?: string;
}

export interface TvSeason {
  id: number;
  name: string;
  seasonNumber: number;
  episodes: TvEpisode[];
}

export interface TorrentSearchRequest {
  query: string;
  mediaType: "movie" | "tv";
  id?: number;
  englishTitle?: string;
  originalTitle?: string;
  season?: number;
  episode?: number;
  forceSearch?: boolean;
}

export interface TorrentFilesRequest {
  title: string;
  link?: string;
  magnetUri?: string;
  mediaType: "movie" | "tv";
  originalTitle?: string;
  poster?: string;
  tmdbId?: number;
}

export interface StreamUrlRequest {
  hash: string;
  index?: number;
  id?: string;
  originalPath?: string;
}

export interface InfuseSaveRequest {
  hash: string;
  index?: string | number;
  originalPath?: string;
  title: string;
  mediaType: "movie" | "tv";
  tmdbId: number;
  season?: number;
  episode?: number;
  originalTitle?: string;
  poster?: string;
  link?: string;
  magnetUri?: string;
}


export interface TraktSyncRequest {
  movies: { ids: { tmdb: number } }[];
  shows: { ids: { tmdb: number } }[];
}

export interface CastMember {
  name?: string;
  Name?: string;
  character?: string;
  Character?: string;
  role?: string;
  profileSrc?: string;
  ProfileSrc?: string;
}

export interface AuthRequest {
  username: string;
  password?: string;
}

export interface AuthResponse {
  token: string;
  user: PotokUser;
}

export class ApiError extends Error {
  public status: number;
  public debugMessage?: string;

  constructor(message: string, status: number, debugMessage?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.debugMessage = debugMessage;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export interface ClientTrack {
  index: number;
  type: "audio" | "subtitle";
  codec: string;
  language: string;
  title: string;
  relIndex: number;
}

export interface ClientMetadata {
  success: boolean;
  duration: number;
  tracks: ClientTrack[];
}

export type PatchOp = "add" | "replace" | "remove";

export interface PatchOperation {
  op: PatchOp;
  path: string;
  value: string | number | boolean;
}

export interface SystemWakeLog {
  timestamp: number;
  driftMs: number;
  navigatorOnline: boolean;
}

export interface FullscreenTrackingState {
  isFullscreenActive: boolean;
  activeElementTag: string | null;
}


