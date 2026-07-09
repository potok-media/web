import { useWebMediaPlayerCore } from "./useWebMediaPlayerCore";
import { useWebMediaPlayerInteraction } from "./useWebMediaPlayerInteraction";
import type { UseWebMediaPlayerBindingsParams } from "./webMediaPlayerBindingTypes";

export function useWebMediaPlayerBindings(params: UseWebMediaPlayerBindingsParams) {
  const core = useWebMediaPlayerCore(params);
  const interaction = useWebMediaPlayerInteraction({ ...params, core });

  return {
    handleClose: core.handleClose,
    controlsVisible: core.controlsVisible,
    handleUserActivity: core.handleUserActivity,
    menus: core.menus,
    handleRefreshStream: core.handleRefreshStream,
    metadata: core.metadata,
    hls: core.hls,
    isFullscreen: core.isFullscreen,
    toggleFullscreen: core.toggleFullscreen,
    displayDuration: core.displayDuration,
    volume: core.volume,
    setVolume: core.setVolume,
    isMuted: core.isMuted,
    setIsMuted: core.setIsMuted,
    ...interaction,
  };
}