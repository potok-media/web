export const dataTypesDts = `
  /** Subtitle track info handed to the player. */
  interface SDKSubtitleInfo {
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

  /** Backend presence session the player drives as a plain heartbeat, without knowing the backend. */
  interface SDKPlaybackSession {
    keepaliveUrl: string;
    stopUrl: string;
    intervalSec?: number;
    hash?: string;
    file?: string;
    statusUrl?: string;
    statusIntervalSec?: number;
  }

  /** Scrub-preview thumbnails. urlTemplate carries a {time} placeholder substituted with the position in seconds. */
  interface SDKThumbnails {
    urlTemplate: string;
    intervalSec?: number;
  }

  /** Full playback descriptor handed to the built-in player. */
  interface SDKPlaybackInfo {
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
    introStart?: number;
    introEnd?: number;
    outroStart?: number;
    outroEnd?: number;
    thumbnails?: SDKThumbnails;
    requiresBuffering?: boolean;
  }

  /** Generic content item (not tied to TMDB): id, title, subtitle, image, wideImage, logo, badges, meta, progress (0..1), rank, href. */
  interface SDKContentItem {
    id: string | number;
    title: string;
    subtitle?: string;
    image?: string;
    wideImage?: string;
    logo?: string;
    badges?: { text: string; color?: 'info' | 'success' | 'warning' | 'error' | 'accent' }[];
    meta?: string[];
    progress?: number;
    rank?: number;
    rating?: number;
    mediaType?: 'movie' | 'tv';
    href?: string;
  }

  /** Aggregate watch progress for a media card. */
  interface SDKWatchProgress {
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

  /** A single cast/crew member shown by MediaCast. */
  interface SDKCastMember {
    name?: string;
    Name?: string;
    character?: string;
    Character?: string;
    role?: string;
    profileSrc?: string;
    ProfileSrc?: string;
  }

  /** TMDB-shaped media metadata used by MediaOverview and MediaRow. */
  interface SDKMediaCard {
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
`;
