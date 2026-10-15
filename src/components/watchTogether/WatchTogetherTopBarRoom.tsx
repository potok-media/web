import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Settings2, Users, X } from "lucide-react";
import { usePlayback } from "../../context/PlaybackContext";
import type { ActivePlayback } from "../../context/playbackTypes";
import { useHUD } from "../../context/useHUD";
import { useWatchTogether } from "../../context/watchTogetherState";
import { Button, IconButton, Switch } from "../ui";

interface WatchTogetherTopBarRoomProps {
  playback: ActivePlayback;
}

export const WatchTogetherTopBarRoom: React.FC<WatchTogetherTopBarRoomProps> = ({ playback }) => {
  const { t } = useTranslation("watchTogether");
  const navigate = useNavigate();
  const { show: showHUD } = useHUD();
  const { stopVideo } = usePlayback();
  const wt = useWatchTogether();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const hostName = wt.participants.find((participant) => participant.role === "host")?.name
    || t("roleHost");
  const shareLink = wt.getShareLink();

  useEffect(() => {
    if (!settingsOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) setSettingsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [settingsOpen]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      showHUD("success", t("copied"));
    } catch {
      showHUD("error", t("copyFailed"));
    }
  };

  const handleLeaveRoom = (navigateBack: boolean) => {
    wt.leave();
    stopVideo();
    if (navigateBack) navigate(-1);
  };

  return (
    <div className="wt-topbar-room">
      <div className="wt-topbar-room__media">
        <IconButton
          size="sm"
          className="wt-topbar-room__back"
          aria-label={t("back")}
          title={t("back")}
          onClick={() => handleLeaveRoom(true)}
        >
          <ArrowLeft size="1rem" />
        </IconButton>
        <NavLink to="/" className="app-topbar__brand" aria-label={t("goHome")}>
          Potok
        </NavLink>
        <span className="wt-topbar-room__divider" aria-hidden="true" />
        <div className="wt-topbar-room__media-copy">
          <strong>{playback.title}</strong>
          <span>
            {playback.mediaType === "tv"
              ? t("playbackMeta", {
                season: playback.season ?? 0,
                episode: playback.episode ?? 1,
                host: hostName,
              })
              : t("hostedBy", { host: hostName })}
          </span>
        </div>
      </div>

      <div className="wt-topbar-room__actions">
        <div
          className="wt-topbar-room__online"
          title={t("onlineCount", { count: wt.participants.length })}
        >
          <Users size="0.9375rem" />
          <span>{wt.participants.length}</span>
          <span className="wt-topbar-room__online-dot" aria-hidden="true" />
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="wt-topbar-room__link"
          title={shareLink}
          onClick={copyLink}
        >
          <Copy size="0.9375rem" />
          <span>{shareLink.replace(/^https?:\/\//, "")}</span>
        </Button>

        <div className="wt-topbar-room__settings" ref={settingsRef}>
          <IconButton
            size="sm"
            aria-label={t("roomSettings")}
            title={t("roomSettings")}
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <Settings2 size="1rem" />
          </IconButton>
          {settingsOpen ? (
            <div
              className="wt-topbar-room__settings-menu"
              role="dialog"
              aria-label={t("roomSettings")}
            >
              <div className="wt-topbar-room__settings-title">{t("roomSettings")}</div>
              <div className="wt-topbar-room__setting-row">
                <div className="wt-topbar-room__setting-copy">
                  <strong>{t("permissions.canControl")}</strong>
                  <span>{t("permissions.canControlHint")}</span>
                </div>
                <Switch
                  className="wt-topbar-room__switch"
                  checked={wt.role === "host"
                    ? wt.guestPermissions.canControl
                    : wt.myPermissions.canControl}
                  disabled={wt.role !== "host"}
                  aria-label={t("permissions.canControl")}
                  onCheckedChange={(canControl) => {
                    if (wt.role === "host") wt.setGuestPermissions({ canControl });
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="wt-topbar-room__close-room"
                onClick={() => handleLeaveRoom(false)}
              >
                <X size="1rem" />
                <span>{t(wt.role === "host" ? "closeRoom" : "leave")}</span>
              </Button>
            </div>
          ) : null}
        </div>

        <IconButton
          size="sm"
          className="wt-topbar-room__leave"
          aria-label={t("leave")}
          title={t("leave")}
          onClick={() => handleLeaveRoom(false)}
        >
          <X size="1rem" />
        </IconButton>
      </div>
    </div>
  );
};

export default WatchTogetherTopBarRoom;
