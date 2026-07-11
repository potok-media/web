export const mediaBuildersDts = `
  /** Stream filtering bar (StreamFilterBar). */
  interface StreamFilterBarBuilder extends UIComponent {
    /** Text showing the number of streams found. */
    countLabel(v: string): this;
    /** Array of available torrent tracker names. */
    trackers(v: string[]): this;
    /** The active selected tracker. */
    activeTracker(v: string): this;
    /** Callback fired to refresh the data. */
    onRefresh(cb: () => void): this;
    /** Callback fired when the quality changes. */
    onQualityChange(cb: (val: string) => void): this;
    /** Callback fired when the tracker changes. */
    onTrackerChange(cb: (val: string) => void): this;
  }

  /** Video player (MediaPlayer) for streaming video playback. */
  interface MediaPlayerBuilder extends UIComponent {
    /** Playback settings (streamUrl, title, etc.). */
    playback(v: SDKPlaybackInfo): this;
  }

  /** Season and episode picker grid (EpisodesSection). */
  interface EpisodesSectionBuilder extends UIComponent {
    /** TMDB ID of the movie/show. */
    mediaId(v: number): this;
    /** Number of seasons. */
    numberOfSeasons(v: number): this;
    /** Callback fired when an episode is clicked. */
    onEpisodeClick(cb: (ep: SDKTvEpisode) => void): this;
  }

  /** Modal episode picker dialog (EpisodeSelector). */
  interface EpisodeSelectorBuilder extends UIComponent {
    /** Open state of the dialog. */
    isOpen(v: boolean): this;
    /** Media title. */
    title(v: string): this;
    /** Subtitle (original title / year). */
    subtitle(v: string): this;
    /** Background image. */
    backdropSrc(v: string): this;
    /** Loading state of the season list. */
    seasonsLoading(v: boolean): this;
    /** List of seasons. */
    seasons(v: SDKTvSeason[]): this;
    /** List of episodes for the current season. */
    episodes(v: SDKStreamEpisode[]): this;
    /** Callback fired when the dialog is closed. */
    onClose(cb: () => void): this;
    /** Callback fired when playback of an episode starts. */
    onPlay(cb: (payload: SDKStreamEpisode) => void): this;
  }

  /** Stream list row (StreamRow). */
  interface StreamRowBuilder extends UIComponent {
    /** Stream object (title, sizeLabel, seeders, leechers, tags). */
    stream(v: SDKStreamUIItem): this;
    /** Callback fired when the stream is clicked. */
    onClick(cb: (stream: SDKStreamUIItem) => void): this;
  }

  /** Cast carousel (MediaCast). */
  interface MediaCastBuilder extends UIComponent {
    /** Array of cast members (name, role, profileSrc). */
    cast(v: SDKCastMember[]): this;
  }

  /** Media description and metadata (MediaOverview). */
  interface MediaOverviewBuilder extends UIComponent {
    /** Media metadata object. */
    media(v: SDKMediaCard): this;
  }

  /** Horizontal carousel of media cards (MediaRow). */
  interface MediaRowBuilder extends UIComponent {
    /** Carousel title. */
    title(v: string): this;
    /** Media items. */
    items(v: SDKMediaCard[]): this;
    /** Callback fired when a card is clicked. */
    onCardClick(cb: (item: SDKMediaCard) => void): this;
  }

  /** Loading indicator (LoadingSpinner). */
  interface LoadingSpinnerBuilder extends UIComponent {
    /** Message text shown while loading. */
    message(v: string): this;
  }

  /** Single episode card (EpisodeCard). */
  interface EpisodeCardBuilder extends UIComponent {
    /** Episode data (stillPath, name, episodeNumber, airDate). */
    episode(v: SDKTvEpisode): this;
    /** Callback fired when the card is clicked. */
    onClick(cb: (ep: SDKTvEpisode) => void): this;
  }
`;
