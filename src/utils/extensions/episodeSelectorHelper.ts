export function handleShowEpisodeSelector(payload: any, source: any) {
  const detail: any = {};
  if (payload.title !== undefined) detail.title = payload.title;
  if (payload.episodes !== undefined) detail.episodes = payload.episodes;
  if (payload.seasons !== undefined) detail.seasons = payload.seasons;
  if (payload.seasonsLoading !== undefined) detail.seasonsLoading = payload.seasonsLoading;
  if (payload.isSaving !== undefined) detail.isSaving = payload.isSaving;
  if (payload.tmdbSeasonsCount !== undefined) detail.tmdbSeasonsCount = payload.tmdbSeasonsCount;

  if (payload.onPlayCallbackId) {
    detail.onPlay = (episode: any, audioId: string) => {
      source.postMessage({
        source: "potok-host",
        action: "TRIGGER_UI_EVENT",
        payload: {
          callbackId: payload.onPlayCallbackId,
          eventData: { episode, audioId }
        }
      }, "*");
    };
  }

  if (payload.onStartEditingCallbackId) {
    detail.onStartEditing = () => {
      source.postMessage({
        source: "potok-host",
        action: "TRIGGER_UI_EVENT",
        payload: {
          callbackId: payload.onStartEditingCallbackId,
          eventData: {}
        }
      }, "*");
    };
  }

  if (payload.onApplyOverrideCallbackId) {
    detail.onApplyOverride = (seasonNum: number, epNum: number) => {
      source.postMessage({
        source: "potok-host",
        action: "TRIGGER_UI_EVENT",
        payload: {
          callbackId: payload.onApplyOverrideCallbackId,
          eventData: { seasonNum, epNum }
        }
      }, "*");
    };
  }

  window.dispatchEvent(new CustomEvent("potok:show-episode-selector", { detail }));
}
