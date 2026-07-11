export const streamBuildersDts = `
  /** Stream loading skeleton (StreamSkeletonList) that renders placeholders. */
  interface StreamSkeletonListBuilder extends UIComponent {}

  /** Torrent stream list (StreamList) with built-in filtering and sorting. */
  interface StreamListBuilder extends UIComponent {
    /** List of stream items. */
    streams(v: SDKRawStreamPayload[]): this;
    /** Loading state. */
    loading(v: boolean): this;
    /** Whether to show the filter bar. */
    showFilters(v: boolean): this;
    /** Text shown when there are no streams. */
    emptyText(v: string): this;
    /** Plural forms of the noun for the stream count (e.g. ['stream', 'streams']). */
    nounPlurals(v: string[]): this;
    /** Callback fired when a stream is selected for playback. */
    onSelectStream(cb: (stream: SDKRawStreamPayload) => void): this;
  }

  /** Connection profile selector and manager (ProfileSelector). */
  interface ProfileSelectorBuilder extends UIComponent {
    /** List of available profiles. */
    connectionProfiles(v: SDKConnectionProfile[]): this;
    /** ID of the active profile. */
    activeProfileID(v: string | null): this;
    /** Whether editing of the settings is locked. */
    isSettingsLocked(v: boolean): this;
    /** Callback fired when a profile is selected. */
    onSelectProfile(cb: (profileId: string) => void): this;
    /** Callback fired when profile editing starts. */
    onStartEdit(cb: (profile: SDKConnectionProfile) => void): this;
    /** Callback fired when a profile is deleted. */
    onDeleteProfile(cb: (profileId: string) => void): this;
    /** Callback fired when creating a new profile. */
    onStartAdd(cb: () => void): this;
  }

  /** Builder for a media search provider. */
  interface MediaSearchProviderBuilder {
    /** Icon of the search provider. */
    icon(url: string): this;
    /** Callback fired when a search is performed. */
    onSearch(cb: (query: string) => Promise<SDKMediaCard[]>): this;
    /** Registers the search callback (alias of onSearch). */
    register(cb: (query: string) => Promise<SDKMediaCard[]>): this;
  }
`;
