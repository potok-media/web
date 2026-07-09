import type { SDKTvSeason } from "../../sdk/src/types";
import type { GenericEpisodeItem } from "../../components/common/episodeSelector/types";
import { asPostMessageSource } from "./extensionHostTypes";

export interface ShowEpisodeSelectorPayload {
  title?: string;
  episodes?: GenericEpisodeItem[];
  seasons?: SDKTvSeason[];
  seasonsLoading?: boolean;
  isSaving?: boolean;
  tmdbSeasonsCount?: number;
  onPlayCallbackId?: string;
  onStartEditingCallbackId?: string;
  onApplyOverrideCallbackId?: string;
  onCloseCallbackId?: string;
}

interface EpisodeSelectorDetail {
  title?: string;
  episodes?: GenericEpisodeItem[];
  seasons?: SDKTvSeason[];
  seasonsLoading?: boolean;
  isSaving?: boolean;
  tmdbSeasonsCount?: number;
  onPlay?: (episode: GenericEpisodeItem, audioId: string) => void;
  onStartEditing?: () => void;
  onApplyOverride?: (seasonNum: number, epNum: number) => void;
  onClose?: () => void;
}

function postUiEvent(source: MessageEventSource, callbackId: string, eventData: unknown) {
  asPostMessageSource(source)?.postMessage(
    {
      source: "potok-host",
      action: "TRIGGER_UI_EVENT",
      payload: { callbackId, eventData },
    },
    "*",
  );
}

export function handleShowEpisodeSelector(payload: ShowEpisodeSelectorPayload, source: MessageEventSource) {
  const detail: EpisodeSelectorDetail = {};
  if (payload.title !== undefined) detail.title = payload.title;
  if (payload.episodes !== undefined) detail.episodes = payload.episodes;
  if (payload.seasons !== undefined) detail.seasons = payload.seasons;
  if (payload.seasonsLoading !== undefined) detail.seasonsLoading = payload.seasonsLoading;
  if (payload.isSaving !== undefined) detail.isSaving = payload.isSaving;
  if (payload.tmdbSeasonsCount !== undefined) detail.tmdbSeasonsCount = payload.tmdbSeasonsCount;

  if (payload.onPlayCallbackId) {
    detail.onPlay = (episode: GenericEpisodeItem, audioId: string) => {
      postUiEvent(source, payload.onPlayCallbackId!, { episode, audioId });
    };
  }

  if (payload.onStartEditingCallbackId) {
    detail.onStartEditing = () => {
      postUiEvent(source, payload.onStartEditingCallbackId!, {});
    };
  }

  if (payload.onApplyOverrideCallbackId) {
    detail.onApplyOverride = (seasonNum: number, epNum: number) => {
      postUiEvent(source, payload.onApplyOverrideCallbackId!, { seasonNum, epNum });
    };
  }

  if (payload.onCloseCallbackId) {
    detail.onClose = () => {
      postUiEvent(source, payload.onCloseCallbackId!, {});
    };
  }

  window.dispatchEvent(new CustomEvent("potok:show-episode-selector", { detail }));
}