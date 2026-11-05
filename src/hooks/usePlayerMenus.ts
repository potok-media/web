import { useCallback, useEffect, useState } from "react";

export type SettingsMenuSection = "quality" | "audio" | "subtitles" | null;

export function usePlayerMenus(controlsVisible: boolean) {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settingsMenuSection, setSettingsMenuSection] = useState<SettingsMenuSection>(null);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);

  useEffect(() => {
    if (!controlsVisible) {
      setShowSettingsMenu(false);
      setSettingsMenuSection(null);
      setShowPlaylistMenu(false);
    }
  }, [controlsVisible]);

  const openSettingsMenu = useCallback((section: SettingsMenuSection = null) => {
    setSettingsMenuSection(section);
    setShowSettingsMenu(true);
  }, []);

  const closeSettingsMenu = useCallback(() => {
    setShowSettingsMenu(false);
    setSettingsMenuSection(null);
  }, []);

  const closeAllMenus = useCallback(() => {
    setShowSettingsMenu(false);
    setSettingsMenuSection(null);
    setShowPlaylistMenu(false);
  }, []);

  const resetMenus = useCallback(() => {
    setShowSettingsMenu(false);
    setSettingsMenuSection(null);
    setShowPlaylistMenu(false);
  }, []);

  return {
    showSettingsMenu,
    setShowSettingsMenu,
    settingsMenuSection,
    setSettingsMenuSection,
    openSettingsMenu,
    closeSettingsMenu,
    showPlaylistMenu,
    setShowPlaylistMenu,
    closeAllMenus,
    resetMenus,
  };
}
