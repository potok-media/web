import type { SDKTvSeason } from "../../sdk/src/types";
import type { GenericEpisodeItem } from "../../components/common/episodeSelector/types";
import { asPostMessageSource } from "./extensionHostTypes";
import { ExtensionRegistry, type PresentedEpisodesPanel } from "./ExtensionRegistry";

export interface ShowEpisodeSelectorPayload {
  title?: string;
  subtitle?: string;
  episodes?: GenericEpisodeItem[];
  seasons?: SDKTvSeason[];
  seasonsLoading?: boolean;
  isSaving?: boolean;
  tmdbSeasonsCount?: number;
  /** 'panel' hands episodes to the host as data (workspace rail); absent/'modal' keeps the dialog path. */
  presentation?: "modal" | "panel";
  canReorder?: boolean;
  onPlayCallbackId?: string;
  onStartEditingCallbackId?: string;
  onApplyOverrideCallbackId?: string;
  onCloseCallbackId?: string;
  onReorderCallbackId?: string;
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

// Panel presentation: episodes travel as plain data — the host stores them and renders its own episode
// panel in the workspace rail (see HostPlaybackWorkspaceCase). Callbacks route back to the presenting
// plugin through the shared TRIGGER_UI_EVENT channel. A panel payload without episodes dismisses.
function handlePresentEpisodePanel(payload: ShowEpisodeSelectorPayload, source: MessageEventSource) {
  const episodes = payload.episodes;
  if (!episodes || episodes.length === 0) {
    ExtensionRegistry.clearPresentedEpisodes(source);
    return;
  }

  const panel: PresentedEpisodesPanel = {
    title: payload.title,
    subtitle: payload.subtitle,
    episodes,
    canReorder: payload.canReorder === true,
  };
  if (payload.onPlayCallbackId) {
    panel.onPlay = (episode: GenericEpisodeItem, audioId: string) => {
      postUiEvent(source, payload.onPlayCallbackId!, { episode, audioId });
    };
  }
  if (payload.onCloseCallbackId) {
    panel.onClose = () => {
      postUiEvent(source, payload.onCloseCallbackId!, {});
    };
  }
  if (payload.onReorderCallbackId) {
    panel.onReorderEpisodes = (reordered: GenericEpisodeItem[]) => {
      postUiEvent(source, payload.onReorderCallbackId!, reordered);
    };
  }
  ExtensionRegistry.registerPresentedEpisodes(source, panel);
}

export function handleShowEpisodeSelector(payload: ShowEpisodeSelectorPayload, source: MessageEventSource) {
  if (payload.presentation === "panel") {
    handlePresentEpisodePanel(payload, source);
    return;
  }

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