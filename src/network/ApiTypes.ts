export interface ServiceInfo {
  configured: boolean;
  online: boolean;
  latencyMs?: number;
}

export interface ServiceStatus {
  bff: ServiceInfo;
  playerServer: ServiceInfo;
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
  airDateTime?: string;
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
  nextCursor?: string | null;
}


export interface PotokUser {
  id?: string;
  username: string;
  syncStrategy: string;
  traktConnected?: boolean;
}

export interface ConnectionProfile {
  id: string;
  name: string;
  gatewayURL: string;
  playerServerURL: string;
  searchEngineURL: string;
  playerServerAuthEnabled: boolean;
  playerServerAuthLogin: string;
  playerServerAuthPassword?: string;
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




export interface TraktSyncRequest {
  movies: { ids: { tmdb: number } }[];
  shows: {
    ids: { tmdb: number };
    seasons?: {
      number: number;
      episodes: { number: number }[];
    }[];
  }[];
  episodes?: { ids: { tmdb: number } }[];
}

export interface CastMember {
  id?: number;
  name?: string;
  Name?: string;
  character?: string;
  Character?: string;
  role?: string;
  profileSrc?: string;
  ProfileSrc?: string;
  imageSrc?: string;
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
  introStart?: number;
  introEnd?: number;
  outroStart?: number;
  outroEnd?: number;
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

/** TMDB combined-credits entry (movie or TV). */
export interface TmdbCreditItem {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  poster_path?: string | null;
  media_type?: "movie" | "tv";
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  popularity?: number;
  genre_ids?: number[];
  job?: string;
}

export interface PersonCombinedCredits {
  cast: TmdbCreditItem[];
  crew: TmdbCreditItem[];
}

export interface PersonDetails {
  id: number;
  name: string;
  profile_path?: string | null;
  birthday?: string;
  deathday?: string;
  place_of_birth?: string;
  biography?: string;
  known_for_department?: string;
  combined_credits?: PersonCombinedCredits;
}

export interface StreamUIItem {
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
