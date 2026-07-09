import { useCallback, useEffect, useState } from "react";

export function usePlayerMenus(controlsVisible: boolean) {
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);

  useEffect(() => {
    if (!controlsVisible) {
      setShowAudioMenu(false);
      setShowSubtitleMenu(false);
      setShowQualityMenu(false);
      setShowPlaylistMenu(false);
    }
  }, [controlsVisible]);

  const closeAllMenus = useCallback(() => {
    setShowAudioMenu(false);
    setShowSubtitleMenu(false);
    setShowQualityMenu(false);
    setShowPlaylistMenu(false);
  }, []);

  const resetMenus = useCallback(() => {
    setShowAudioMenu(false);
    setShowSubtitleMenu(false);
    setShowQualityMenu(false);
    setShowPlaylistMenu(false);
  }, []);

  return {
    showAudioMenu,
    setShowAudioMenu,
    showSubtitleMenu,
    setShowSubtitleMenu,
    showQualityMenu,
    setShowQualityMenu,
    showPlaylistMenu,
    setShowPlaylistMenu,
    closeAllMenus,
    resetMenus,
  };
}