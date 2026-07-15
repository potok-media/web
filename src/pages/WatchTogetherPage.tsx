import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PlayCircle, Loader2, LogOut, LogIn } from "lucide-react";
import { useWatchTogether } from "../context/watchTogetherState";
import { useHUD } from "../context/useHUD";
import { Button } from "../components/ui";
import { ShareLinkPanel } from "../components/watchTogether/ShareLinkPanel";
import { ParticipantList } from "../components/watchTogether/ParticipantList";
import { GuestPermissionsPanel } from "../components/watchTogether/GuestPermissionsPanel";
import { NicknameField } from "../components/watchTogether/NicknameField";
import { SessionInfoBanner } from "../components/watchTogether/SessionInfoBanner";
import "../styles/watch-together.css";

export const WatchTogetherPage: React.FC = () => {
  const { t } = useTranslation("watchTogether");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { show: showHUD } = useHUD();
  const wt = useWatchTogether();
  const { role, participants, sessionActive, connectionState, hostEnded, clientId, sessionInfo } = wt;

  const token = params.get("room");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(wt.getShareLink());
      showHUD("success", t("copied"));
    } catch {
      showHUD("error", t("copyFailed"));
    }
  };

  const handleLeave = () => {
    const wasHost = wt.role === "host";
    wt.leave();
    if (wasHost) navigate(-1); // back to where the host started the session
    else navigate("/");
  };

  // Neither host nor guest context — landed here directly with no room.
  if (!role && !token) {
    return (
      <main className="wt-page">
        <div className="wt-card">
          <h1 className="wt-card__title">{t("title")}</h1>
          <p className="wt-card__subtitle">{t("noRoom")}</p>
          <Button variant="secondary" size="md" onClick={() => navigate("/")}>{t("goHome")}</Button>
        </div>
      </main>
    );
  }

  // Guest invited via a link but not connected yet — join only on an explicit click (then the hub connection
  // opens and the guest starts receiving the host's events / playback).
  if (!role && token) {
    return (
      <main className="wt-page">
        <div className="wt-card">
          <h1 className="wt-card__title">{t("title")}</h1>
          <p className="wt-card__subtitle">{t("joinInvite")}</p>
          <NicknameField value={wt.myName} onChange={wt.setMyName} />
          <Button variant="accent" size="md" onClick={() => wt.joinAsGuest(token)}>
            <LogIn size="1.125rem" />
            <span>{t("join")}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>{t("goHome")}</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="wt-page">
      <div className="wt-card">
        <header className="wt-card__header">
          <h1 className="wt-card__title">{t("title")}</h1>
          <span className={`wt-status wt-status--${connectionState}`}>{t(`connection.${connectionState}`)}</span>
        </header>

        {sessionInfo && <SessionInfoBanner info={sessionInfo} />}

        <NicknameField value={wt.myName} onChange={wt.setMyName} />

        {role === "host" && <ShareLinkPanel link={wt.getShareLink()} onCopy={handleCopy} />}

        {role === "host" && (
          <GuestPermissionsPanel permissions={wt.guestPermissions} onChange={wt.setGuestPermissions} />
        )}

        <ParticipantList participants={participants} selfId={clientId} />

        {role === "host" ? (
          <Button variant="accent" size="md" onClick={wt.startWatch} disabled={sessionActive}>
            <PlayCircle size="1.125rem" />
            <span>{sessionActive ? t("watching") : t("startWatch")}</span>
          </Button>
        ) : hostEnded ? (
          <p className="wt-card__subtitle">{t("hostLeft")}</p>
        ) : sessionActive ? (
          <p className="wt-card__subtitle">{t("watching")}</p>
        ) : (
          <p className="wt-card__waiting">
            <Loader2 size="1.125rem" className="wt-spin" />
            <span>{t("waitingHost")}</span>
          </p>
        )}

        <Button variant="ghost" size="sm" onClick={handleLeave}>
          <LogOut size="1rem" />
          <span>{t("leave")}</span>
        </Button>
      </div>
    </main>
  );
};

export default WatchTogetherPage;
