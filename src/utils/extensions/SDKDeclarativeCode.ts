/**
 * Declarative streams API implementation for the sandboxed Potok SDK.
 * Strict compliance with WEB_ARCHITECTURAL_STANDARDS.md.
 */

export const SDK_DECLARATIVE_CODE = `
  const registeredStreamSources = new Map();

  const streamsSpace = {
    registerStreamSource(source) {
      registeredStreamSources.set(source.id, source);
      window.parent.postMessage({
        source: 'potok-plugin-sdk',
        action: 'REGISTER_STREAM_SOURCE',
        payload: {
          id: source.id,
          name: source.name,
          supportedTypes: source.supportedTypes
        }
      }, hostOrigin);
    }
  };

  window.addEventListener('message', async (e) => {
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
        } catch (err) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_SEARCH_RESPONSE',
            payload: { requestId, data: [], error: err.message || 'Search failed' }
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
        } catch (err) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_GET_EPISODES_RESPONSE',
            payload: { requestId, data: null, error: err.message || 'Failed to get episodes' }
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
        } catch (err) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_GET_SEASONS_RESPONSE',
            payload: { requestId, data: null, error: err.message || 'Failed to get seasons metadata' }
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
      const { requestId, stream, context, seasonNum, episodeOffset, sourceId } = msg.payload;
      const source = (sourceId && registeredStreamSources.get(sourceId)) || Array.from(registeredStreamSources.values())[0];
      if (source && source.saveMetadataOverride) {
        try {
          await source.saveMetadataOverride(stream, context, seasonNum, episodeOffset);
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_SAVE_OVERRIDE_RESPONSE',
            payload: { requestId, data: null, error: null }
          }, hostOrigin);
        } catch (err) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_SAVE_OVERRIDE_RESPONSE',
            payload: { requestId, data: null, error: err.message || 'Failed to save metadata override' }
          }, hostOrigin);
        }
      } else {
        window.parent.postMessage({
          source: 'potok-plugin-sdk',
          action: 'STREAM_SOURCE_SAVE_OVERRIDE_RESPONSE',
          payload: { requestId, data: null, error: 'Method saveMetadataOverride not implemented' }
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
        } catch (err) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_GET_PLAYBACK_INFO_RESPONSE',
            payload: { requestId, data: null, error: err.message || 'Failed to get playback info' }
          }, hostOrigin);
        }
      } else {
        window.parent.postMessage({
          source: 'potok-plugin-sdk',
          action: 'STREAM_SOURCE_GET_PLAYBACK_INFO_RESPONSE',
          payload: { requestId, data: null, error: 'Method getPlaybackInfo not implemented' }
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
        } catch (err) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'REFRESH_STREAM_URL_RESPONSE',
            payload: { success: false, error: err.message || 'Failed to refresh stream URL' }
          }, hostOrigin);
        }
      }
    }
  });
`;
