import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AppSettingsContext";
import { useContinueWatchingCards } from "../hooks/useContinueWatchingCards";
import { useResumeContinueCard } from "../hooks/useResumeContinueCard";
import { useProfileSummary } from "../hooks/useProfileSummary";
import { PotokAuthView } from "../components/profile/PotokAuthView";
import { ProfileAccountSection } from "../components/profile/ProfileAccountSection";
import { ProfileHistorySection } from "../components/profile/ProfileHistorySection";
import { ProfileHero } from "../components/profile/ProfileHero";
import { ProfileStatisticsSection } from "../components/profile/ProfileStatisticsSection";
import { ProfileContinueRail } from "../components/profile/ProfileContinueRail";
import { ProfileStatusShelf } from "../components/profile/ProfileStatusShelf";
import "../styles/profile.css";

const PROFILE_SHELVES = ["watching", "planned", "completed"] as const;

/**
 * The approved profile layout: a single-scroll page — hero (identity + stats + "Сейчас
 * смотрите"), a 30-day statistics chart, the server-driven continue-watching rail, the three
 * status shelves, the phase-2 history placeholder, and the unchanged account section.
 * Guests get the same scroll minus server-backed blocks (stat chips, statistics, history,
 * account) plus a sign-in entry point; their shelves and continue rail come from the local
 * guest stores.
 */
const ProfileScrollPage: React.FC<{ scrollToAccount: boolean }> = ({ scrollToAccount }) => {
  const { t } = useTranslation("profile");
  const { potokToken, potokUser, login } = useAuth();
  const isAuth = Boolean(potokToken);
  const { cards: continueCards } = useContinueWatchingCards(isAuth);
  const resumeCard = useResumeContinueCard();
  const summaryState = useProfileSummary(isAuth);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollToAccount) {
      accountRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [scrollToAccount]);

  // Unauthenticated users get the full login form right away — no guest hero parody
  // (owner decision). Guest local data remains available after login.
  if (!isAuth) {
    return (
      <div className="profile-auth-screen-container">
        <PotokAuthView onSuccess={(data) => {
          login(data.token, data.user);
        }} />
      </div>
    );
  }

  // Any in-progress continue-watching item qualifies — server and ledger cards both carry
  // resume coordinates. Resumability through a saved lastSource only gates the resume action,
  // never the now-block itself.
  const nowWatching = isAuth
    ? continueCards.find((card) => card.resume != null) ?? null
    : null;

  return (
    <div className="profile-container profile-container--scroll">
      <ProfileHero
        username={potokUser?.username ?? t("page.defaultUser")}
        isAuth={isAuth}
        createdAt={potokUser?.createdAt}
        nowWatching={nowWatching}
        onResume={resumeCard}
      />

      {isAuth && <ProfileStatisticsSection state={summaryState} />}

      <ProfileContinueRail cards={continueCards} onResume={resumeCard} />

      {PROFILE_SHELVES.map((status) => (
        <ProfileStatusShelf key={status} status={status} />
      ))}

      {isAuth && (
        <section className="profile-history-section">
          <div className="profile-section-header">
            <h2 className="profile-section-title">{t("page.tabs.history")}</h2>
            <span className="profile-section-subtitle">{t("history.subtitle")}</span>
          </div>
          <ProfileHistorySection />
        </section>
      )}

      {isAuth && (
        <section className="profile-account-section" ref={accountRef}>
          <div className="profile-section-header">
            <h2 className="profile-section-title">{t("page.tabs.account")}</h2>
          </div>
          <ProfileAccountSection />
        </section>
      )}
    </div>
  );
};

export const ProfilePage: React.FC = () => {
  const { section } = useParams<{ section: string }>();

  // The phase-2 status tabs are gone — their deep links land on the single-scroll page.
  if (section && section !== "account") {
    return <Navigate to="/profile" replace />;
  }

  return <ProfileScrollPage scrollToAccount={section === "account"} />;
};

export default ProfilePage;
