import type {
  ArmEntryId,
  ArmEpisodeFiller,
  ArmEpisodeId,
  ArmMediaSummary,
} from "./ArmTypes";

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
  telegramAuthEnabled?: boolean;
  telegramBotUsername?: string;
}

/** Payload delivered by the Telegram Login Widget on successful authorization. */
export interface TelegramWidgetAuth {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/** Deep-link (bot) flow: one-time code + t.me link issued by the backend for HTTP deployments. */
export interface TelegramStartCodeResponse {
  code: string;
  botUsername?: string;
  deepLink: string;
}

export interface TelegramPollResponse {
  status: "pending" | "confirmed" | "expired";
  token?: string;
  user?: PotokUser;
}

export interface MediaCard {
  id: number;
  title: string;
  originalTitle?: string;
  englishTitle?: string;
  year?: number;
  titlesByLocale?: Record<string, MediaTitle[]>;
  metadataLocale?: string;
  metadataSources?: { title?: string; poster?: string; backdrop?: string; banner?: string };
  bannerSrc?: string;
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
  /** Potok identity of the catalog row; present on index-backed search results. */
  potokId?: string;
  /** Selected ARM entry; search can return several entries belonging to the same work. */
  entryId?: string;
  /** Main-title highlight snippet (<mark> around matched tokens); index-backed search only. */
  titleSnippet?: string;
  /** Alternative-title highlight snippet when the query hit an alias, not the main title. */
  matchedTitleSnippet?: string;
  /** Potok-owned identity; absent on older Gateways and explicit when ARM is unresolved. */
  arm?: ArmMediaSummary;
  /** Resume coordinates — present on /api/library/continue-watching items. */
  resume?: ContinueResumePayload;
  /**
   * Per-title meta for the now-watching hero chips — present on continue-watching items where
   * the gateway could compute them; null/absent fields mean "no data", the chip is hidden.
   */
  titleMeta?: TitleMetaPayload | null;
}

/** Per-title statistics attached to continue-watching items (gateway extension, tolerant read). */
export interface TitleMetaPayload {
  totalEpisodes?: number | null;
  watchedEpisodes?: number | null;
  genres?: string[] | null;
  streakDays?: number | null;
  runtimeMinutes?: number | null;
}

export interface MediaTitle {
  value: string;
  locale?: string;
  source: string;
  kind: string;
}

export interface MediaSearchFacet {
  value: string;
  count: number;
}

export interface MediaSearchResponse {
  results: MediaCard[];
  facets: MediaSearchFacet[];
  found: number;
  page?: number;
  hasMore?: boolean;
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
  /** Canonical ARM watched identity. Legacy coordinates are only a compatibility projection. */
  watchedEpisodeIds?: ArmEpisodeId[];
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
  traktConnected?: boolean;
  telegramLinked?: boolean;
  telegramUsername?: string;
  hasPassword?: boolean;
  /** Account creation time (ISO) — drives the "member since" line on the profile hero. */
  createdAt?: string;
}

/** Source descriptor persisted alongside progress so continue-watching can resume server-side. */
export interface LastSourcePayload {
  providerId?: string;
  voice?: string;
  streamHash?: string;
  fileIndex?: string;
  /**
   * Full voice-candidate list the player held at save time (cross-provider merge from the title
   * page). Entries are trimmed (no url) and self-capped — see buildLastSource. Absent on rows
   * saved before this existed; resume then resolves through the single saved sourceStream.
   */
  audios?: LastSourceAudioCandidate[];
  /** Opaque plugin-owned stream payload, passed back verbatim for sandbox resume. */
  sourceStream?: unknown;
}

/**
 * One persisted voice candidate. `url` is deliberately stripped (dead weight — switching always
 * re-resolves through the candidate's own provider). `query` is dropped first and `label` second
 * when the 4KB cap needs headroom.
 */
export interface LastSourceAudioCandidate {
  name: string;
  label?: string;
  voice?: string;
  providerId?: string;
  sourceId?: string;
  query?: unknown;
}

/** Resume coordinates attached to continue-watching cards by /api/library/continue-watching. */
export interface ContinueResumePayload {
  /** Movies have no episode coordinates — both are null there (resume still ships progress). */
  season?: number | null;
  episode?: number | null;
  progressSeconds?: number;
  durationSeconds?: number;
  lastSource?: LastSourcePayload;
}

/**
 * One episode-level continue-watching row from /api/library/continue-watching/episodes:
 * the hydrated title identity, the episode coordinates (null for movies), the watch progress
 * and the per-episode resume payload (that history row's own last_source — clicking the card
 * resumes THIS episode at its position).
 */
export interface ContinueWatchingEpisodeItem {
  id: number;
  title: string;
  overview?: string;
  mediaType: "movie" | "tv";
  backdropSrc?: string;
  posterSrc?: string;
  logoSrc?: string;
  year?: number;
  tmdbRating?: number;
  imdbId?: string;
  /** Episode coordinates — null for movies. */
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  progressSeconds: number;
  durationSeconds: number;
  progressPercent: number;
  lastWatchedAt?: string;
  resume?: ContinueResumePayload;
}

export interface ProfileSummary {
  totalWatchMinutes: number;
  episodesWatched: number;
  titlesCompleted: number;
  topGenre: { id: number | null; name: string } | null;
  streakDays: number;
  daily: { date: string; minutes: number }[];
}

/** One profile-activity feed row: a watch event plus its TMDB-hydrated title identity. */
export interface ProfileActivityItem {
  occurredAt: string;
  mediaType: "movie" | "tv";
  /** Episode coordinates — null for movies. */
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  isCompleted: boolean;
  title: { tmdbId: string; name?: string | null; posterPath?: string | null };
}

/**
 * One page of /api/profile/activity: at most `days` non-empty UTC calendar days of events
 * (newest first). `nextBefore` is the oldest returned day's date (yyyy-MM-dd) for the next
 * page, or null when the log is exhausted.
 */
export interface ProfileActivityResponse {
  items: ProfileActivityItem[];
  nextBefore: string | null;
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
  id: number | string;
  name: string;
  overview?: string;
  episodeNumber: number;
  seasonNumber: number;
  airDate?: string;
  stillPath?: string;
  still_path?: string;
  armEpisodeId?: ArmEpisodeId;
  /** Graph entry (group) the episode belongs to — the binding/playback `entryId`. */
  armEntryId?: ArmEntryId;
  armNumber?: number;
  /** Compatibility projection only. Never substitute the Potok display placement here. */
  tmdbSeasonNumber?: number;
  tmdbEpisodeNumber?: number;
  filler?: ArmEpisodeFiller | null;
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
  overrideBadge?: { label: string; title?: string };
  isLastSelected?: boolean;
  missingFromResults?: boolean;
}
