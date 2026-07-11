import { registeredStreamSources } from "./declarative-registry";

const errorMessage = (err: unknown): string | undefined =>
  err instanceof Error ? err.message : undefined;

export function initDeclarativeStreamListeners(): void {
  window.addEventListener('message', async (e) => {
    const hostOrigin = window.PotokInitialState?.hostOrigin || "*";
    if (hostOrigin !== "*" && e.origin !== hostOrigin) return;
    const msg = e.data;
    if (!msg || msg.source !== 'potok-host') return;

    if (msg.action === 'STREAM_SOURCE_SEARCH') {
      const { requestId, query, sourceId } = msg.payload;
      const source = (sourceId && registeredStreamSources.get(sourceId)) || Array.from(registeredStreamSources.values())[0];
      if (source) {
        try {
          const data = await source.search(query);
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_SEARCH_RESPONSE',
            payload: { requestId, data, error: null }
          }, hostOrigin);
        } catch (err: unknown) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_SEARCH_RESPONSE',
            payload: { requestId, data: [], error: errorMessage(err) || 'Search failed' }
          }, hostOrigin);
        }
      } else {
        window.parent.postMessage({
          source: 'potok-plugin-sdk',
          action: 'STREAM_SOURCE_SEARCH_RESPONSE',
          payload: { requestId, data: [], error: 'No stream source registered' }
        }, hostOrigin);
      }
    } else if (msg.action === 'STREAM_SOURCE_GET_EPISODES') {
      const { requestId, stream, context, sourceId } = msg.payload;
      const source = (sourceId && registeredStreamSources.get(sourceId)) || Array.from(registeredStreamSources.values())[0];
      if (source && source.getEpisodes) {
        try {
          const data = await source.getEpisodes(stream, context);
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_GET_EPISODES_RESPONSE',
            payload: { requestId, data, error: null }
          }, hostOrigin);
        } catch (err: unknown) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_GET_EPISODES_RESPONSE',
            payload: { requestId, data: null, error: errorMessage(err) || 'Failed to get episodes' }
          }, hostOrigin);
        }
      } else {
        window.parent.postMessage({
          source: 'potok-plugin-sdk',
          action: 'STREAM_SOURCE_GET_EPISODES_RESPONSE',
          payload: { requestId, data: null, error: 'Method getEpisodes not implemented' }
        }, hostOrigin);
      }
    } else if (msg.action === 'STREAM_SOURCE_GET_SEASONS') {
      const { requestId, stream, context, sourceId } = msg.payload;
      const source = (sourceId && registeredStreamSources.get(sourceId)) || Array.from(registeredStreamSources.values())[0];
      if (source && source.getSeasonsMetadata) {
        try {
          const data = await source.getSeasonsMetadata(stream, context);
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_GET_SEASONS_RESPONSE',
            payload: { requestId, data, error: null }
          }, hostOrigin);
        } catch (err: unknown) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_GET_SEASONS_RESPONSE',
            payload: { requestId, data: null, error: errorMessage(err) || 'Failed to get seasons metadata' }
          }, hostOrigin);
        }
      } else {
        window.parent.postMessage({
          source: 'potok-plugin-sdk',
          action: 'STREAM_SOURCE_GET_SEASONS_RESPONSE',
          payload: { requestId, data: [], error: null }
        }, hostOrigin);
      }
    } else if (msg.action === 'STREAM_SOURCE_SAVE_OVERRIDE') {
      // Per-season override: map ONE source season → a TMDB (targetSeason, offset). sourceSeason may be null
      // (the sentinel bucket for files with no parseable season). offset was computed on RAW parsed episodes.
      const { requestId, stream, context, sourceSeason, targetSeason, offset, sourceId } = msg.payload;
      const source = (sourceId && registeredStreamSources.get(sourceId)) || Array.from(registeredStreamSources.values())[0];
      if (source && source.saveSeasonOverride) {
        try {
          await source.saveSeasonOverride(stream, context, sourceSeason, targetSeason, offset);
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_SAVE_OVERRIDE_RESPONSE',
            payload: { requestId, data: null, error: null }
          }, hostOrigin);
        } catch (err: unknown) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_SAVE_OVERRIDE_RESPONSE',
            payload: { requestId, data: null, error: errorMessage(err) || 'Failed to save season override' }
          }, hostOrigin);
        }
      } else {
        window.parent.postMessage({
          source: 'potok-plugin-sdk',
          action: 'STREAM_SOURCE_SAVE_OVERRIDE_RESPONSE',
          payload: { requestId, data: null, error: 'Method saveSeasonOverride not implemented' }
        }, hostOrigin);
      }
    } else if (msg.action === 'STREAM_SOURCE_CLEAR_OVERRIDE') {
      // Reset ONE source season's override (delete the entry). sourceSeason may be null (sentinel bucket).
      const { requestId, stream, context, sourceSeason, sourceId } = msg.payload;
      const source = (sourceId && registeredStreamSources.get(sourceId)) || Array.from(registeredStreamSources.values())[0];
      if (source && source.clearSeasonOverride) {
        try {
          await source.clearSeasonOverride(stream, context, sourceSeason);
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_CLEAR_OVERRIDE_RESPONSE',
            payload: { requestId, data: null, error: null }
          }, hostOrigin);
        } catch (err: unknown) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_CLEAR_OVERRIDE_RESPONSE',
            payload: { requestId, data: null, error: errorMessage(err) || 'Failed to clear season override' }
          }, hostOrigin);
        }
      } else {
        window.parent.postMessage({
          source: 'potok-plugin-sdk',
          action: 'STREAM_SOURCE_CLEAR_OVERRIDE_RESPONSE',
          payload: { requestId, data: null, error: 'Method clearSeasonOverride not implemented' }
        }, hostOrigin);
      }
    } else if (msg.action === 'STREAM_SOURCE_GET_PLAYBACK_INFO') {
      const { requestId, stream, episode, context, sourceId } = msg.payload;
      const source = (sourceId && registeredStreamSources.get(sourceId)) || Array.from(registeredStreamSources.values())[0];
      if (source && source.getPlaybackInfo) {
        try {
          const data = await source.getPlaybackInfo(stream, episode, context);
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_GET_PLAYBACK_INFO_RESPONSE',
            payload: { requestId, data, error: null }
          }, hostOrigin);
        } catch (err: unknown) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_GET_PLAYBACK_INFO_RESPONSE',
            payload: { requestId, data: null, error: errorMessage(err) || 'Failed to get playback info' }
          }, hostOrigin);
        }
      } else {
        window.parent.postMessage({
          source: 'potok-plugin-sdk',
          action: 'STREAM_SOURCE_GET_PLAYBACK_INFO_RESPONSE',
          payload: { requestId, data: null, error: 'Method getPlaybackInfo not implemented' }
        }, hostOrigin);
      }
    } else if (msg.action === 'STREAM_SOURCE_GET_PLAYBACK_METADATA') {
      // Deferred slow half of the descriptor (subtitles + duration). The host fires this AFTER the player is
      // already open, so a slow probe never blocks player-open. Optional method → empty result if absent.
      const { requestId, stream, episode, context, sourceId } = msg.payload;
      const source = (sourceId && registeredStreamSources.get(sourceId)) || Array.from(registeredStreamSources.values())[0];
      if (source && source.getPlaybackMetadata) {
        try {
          const data = await source.getPlaybackMetadata(stream, episode, context);
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_GET_PLAYBACK_METADATA_RESPONSE',
            payload: { requestId, data, error: null }
          }, hostOrigin);
        } catch (err: unknown) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_GET_PLAYBACK_METADATA_RESPONSE',
            payload: { requestId, data: null, error: errorMessage(err) || 'Failed to get playback metadata' }
          }, hostOrigin);
        }
      } else {
        // Not implemented → empty (no enrichment). Not an error: getPlaybackInfo already fully described it.
        window.parent.postMessage({
          source: 'potok-plugin-sdk',
          action: 'STREAM_SOURCE_GET_PLAYBACK_METADATA_RESPONSE',
          payload: { requestId, data: {}, error: null }
        }, hostOrigin);
      }
    } else if (msg.action === 'REFRESH_STREAM_URL') {
      const source = Array.from(registeredStreamSources.values())[0];
      if (source && source.refreshStreamUrl) {
        try {
          const data = await source.refreshStreamUrl(msg.payload);
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'REFRESH_STREAM_URL_RESPONSE',
            payload: { success: true, ...data }
          }, hostOrigin);
        } catch (err: unknown) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'REFRESH_STREAM_URL_RESPONSE',
            payload: { success: false, error: errorMessage(err) || 'Failed to refresh stream URL' }
          }, hostOrigin);
        }
      }
    }
  });
}
