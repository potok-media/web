import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useHUD } from "../context/useHUD";
import { usePlayback } from "../context/PlaybackContext";
import { useResumeContinueWatching } from "../hooks/useResumeContinueWatching";
import { getPluginAvailability } from "../utils/extensions/pluginAvailability";
import { PlaybackWorkspace } from "../components/playback/PlaybackWorkspace";
import { WatchTogetherQueuePanel } from "../components/watchTogether/WatchTogetherQueuePanel";
import {
  cursorFromVideoSettings,
  decodeVideoSettings,
  encodeVideoSettings,
  VIDEO_SETTINGS_QUERY_PARAM,
  type VideoSettingsSnapshot,
} from "../utils/videoSettings";

type RestorePhase = "resolving" | "opened" | "error";

/**
 * Dedicated continue-watch restore surface — a PURELY TECHNICAL page: it never renders bare
 * content states. Nothing to play (no/invalid snapshot), a failed restore, or the player being
 * closed all redirect back to where the user came from; the HUD carries any explanation.
 * While resolving, a minimal centered loader shows; once playback opens, the workspace layout
 * (player stage + episode rail) takes over the whole surface.
 */
export const ContinueWatchPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activePlayback } = usePlayback();
  const { resume } = useResumeContinueWatching();
  const { show: showHUD } = useHUD();
  const { t } = useTranslation("media");
  const { t: tProfile } = useTranslation("profile");
  const [phase, setPhase] = useState<RestorePhase>("resolving");
  const startedRef = useRef(false);
  const hadPlaybackRef = useRef(false);

  // Back to where the user came from; a fresh tab (no in-app history) lands on the profile.
  const goBack = () => {
    if (location.key === "default") navigate("/profile", { replace: true });
    else navigate(-1);
  };

  // Location state carries the live object; re-encode+decode to validate it against the same
  // contract as the query-param channel instead of trusting an arbitrary navigation payload.
  const snapshot = useMemo<VideoSettingsSnapshot | null>(() => {
    const fromState = (location.state as { snapshot?: unknown } | null)?.snapshot;
    if (fromState) {
      try {
        return decodeVideoSettings(encodeVideoSettings(fromState as VideoSettingsSnapshot));
      } catch {
        return null;
      }
    }
    return decodeVideoSettings(searchParams.get(VIDEO_SETTINGS_QUERY_PARAM));
  }, [location.state, searchParams]);

  useEffect(() => {
    if (!snapshot) {
      goBack();
      return;
    }
    if (startedRef.current) return;
    if (snapshot.kind === "plugin" && getPluginAvailability(snapshot.providerId) === false) {
      startedRef.current = true;
      showHUD("warning", tProfile("hud.sourceUnavailable", { name: snapshot.providerId }));
      goBack();
      return;
    }
    startedRef.current = true;
    setPhase("resolving");
    void resume(cursorFromVideoSettings(snapshot)).then((opened) => {
      if (!opened) {
        showHUD("error", t("continueWatch.error"));
        goBack();
        return;
      }
      setPhase("opened");
    });
  }, [snapshot, resume, showHUD, tProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  // The player was closed after the restore — the page has no reason to exist anymore.
  useEffect(() => {
    if (activePlayback) hadPlaybackRef.current = true;
    else if (hadPlaybackRef.current) goBack();
  }, [activePlayback]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!snapshot) return null;

  // Playback opened: host the player in the workspace layout with the episode rail.
  if (phase === "opened" && activePlayback) {
    const hasPlaylist = Boolean(activePlayback.playlist?.length);
    return (
      <PlaybackWorkspace
        backdropSrc={activePlayback.backdropSrc}
        rail={hasPlaylist ? <WatchTogetherQueuePanel playback={activePlayback} /> : undefined}
      />
    );
  }

  // Resolving — centered loader; everything else redirects away (see effects above).
  return (
    <div className="continue-watch-loading" role="status" aria-live="polite">
      <div className="loading-glass-card">
        <div className="premium-spinner premium-spinner--large">
          <div className="spinner-outer" />
          <div className="spinner-inner" />
        </div>
        <span className="loading-text">
          {t("continueWatch.resuming")}
          <span className="wt-pause__dots">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </span>
      </div>
    </div>
  );
};

export default ContinueWatchPage;
