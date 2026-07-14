/** A stream source registered by a declarative plugin. All payloads are opaque host↔plugin JSON. */
export interface RegisteredStreamSource {
  id: string;
  name?: string;
  supportedTypes?: unknown;
  search(query: unknown): unknown;
  getEpisodes?(stream: unknown, context: unknown): unknown;
  getSeasonsMetadata?(stream: unknown, context: unknown): unknown;
  saveSeasonOverride?(
    stream: unknown,
    context: unknown,
    sourceSeason: unknown,
    targetSeason: unknown,
    offset: unknown
  ): unknown;
  clearSeasonOverride?(stream: unknown, context: unknown, sourceSeason: unknown): unknown;
  // Per-FILE overrides (opt-in). When BOTH are implemented the host enables its per-file anchor/pin UI in the
  // episode selector — it stays hidden for sources that don't provide them (this is a torrents-specific feature).
  saveFileOverride?(
    stream: unknown,
    context: unknown,
    fileId: unknown,
    season: unknown,
    episode: unknown,
    mode: unknown
  ): unknown;
  clearFileOverride?(stream: unknown, context: unknown, fileId: unknown): unknown;
  getPlaybackInfo?(stream: unknown, episode: unknown, context: unknown): unknown;
  getPlaybackMetadata?(stream: unknown, episode: unknown, context: unknown): unknown;
  refreshStreamUrl?(payload: unknown): Record<string, unknown> | Promise<Record<string, unknown>>;
}

// Declarative streams support (from SDKDeclarativeCode.ts)
export const registeredStreamSources = new Map<string, RegisteredStreamSource>();

export const streamsSpace = {
  registerStreamSource(source: RegisteredStreamSource): void {
    registeredStreamSources.set(source.id, source);
    const hostOrigin = window.PotokInitialState?.hostOrigin || "*";
    window.parent.postMessage({
      source: 'potok-plugin-sdk',
      action: 'REGISTER_STREAM_SOURCE',
      payload: {
        id: source.id,
        name: source.name,
        supportedTypes: source.supportedTypes,
        // Capability flags the host uses to gate optional UI. fileOverride = per-file anchor/pin editing.
        capabilities: {
          fileOverride:
            typeof source.saveFileOverride === 'function' &&
            typeof source.clearFileOverride === 'function'
        }
      }
    }, hostOrigin);
  }
};
