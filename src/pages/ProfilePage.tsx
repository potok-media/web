import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { History } from "lucide-react";
import { useAuth } from "../context/AppSettingsContext";
import { useHUD } from "../context/useHUD";
import { useContinueWatchingCards } from "../hooks/useContinueWatchingCards";
import { useContinueWatchingEpisodes } from "../hooks/profile/useContinueWatchingEpisodes";
import { useResumeContinueCard } from "../hooks/useResumeContinueCard";
import { useResumeContinueEpisode } from "../hooks/profile/useResumeContinueEpisode";
import { isResumeEffectivelyComplete } from "../utils/continueWatchingResume";
import { useProfileSummary } from "../hooks/useProfileSummary";
import { useUserDataCollection } from "../hooks/useUserDataCollection";
import { PotokAuthView } from "../components/profile/PotokAuthView";
import { ProfileHero } from "../components/profile/ProfileHero";
import { ProfileStatisticsSection } from "../components/profile/ProfileStatisticsSection";
import { ProfileActivitySection } from "../components/profile/ProfileActivitySection";
import { ProfileStatusGrid } from "../components/profile/ProfileStatusGrid";
import { ProfileTabs, type ProfileTabDef, type ProfileTabId } from "../components/profile/ProfileTabs";
import { ContinueEpisodeCard } from "../components/profile/ContinueEpisodeCard";
import type { TitleStatus } from "../utils/userData";
import "../styles/profile.css";

const PROFILE_STATUSES: TitleStatus[] = ["watching", "planned", "completed", "on_hold", "dropped"];

/**
 * The approved profile layout (mockup profile-v2): a full-bleed hero (identity + «Сейчас
 * смотрите» with the resume/details actions), a text tab bar directly under it
 * («Продолжить · N», the five watch statuses with count badges), then a two-column body —
 * the active tab's content on the left (16:9 episode continue-cards in a 2-col grid for
 * «Продолжить», a 4-col poster grid with micro progress for the statuses) and a 320px
 * sidebar on the right («Статистика · 30 дней» + compact «Активность» preview linking to the
 * full history page). Mobile gets the plain «Выйти»
 * button at the bottom, guests get the login form. Tab state is local — no URL param.
 */
const ProfileScrollPage: React.FC = () => {
  const { t } = useTranslation("profile");
  const { potokToken, potokUser, login, logout } = useAuth();
  const { show: showHUD } = useHUD();
  const isAuth = Boolean(potokToken);
  const { cards: continueCards } = useContinueWatchingCards(isAuth);
  const { items: continueEpisodes } = useContinueWatchingEpisodes(isAuth);
  const resumeCard = useResumeContinueCard();
  const resumeEpisode = useResumeContinueEpisode();
  const summaryState = useProfileSummary(isAuth);
  const [activeTab, setActiveTab] = useState<ProfileTabId>("continue");

  // One collection per status feeds both the tab count badges and the active tab's grid —
  // the unified user-data layer (server list / guest store) does the auth branching.
  const statusCollections: Record<TitleStatus, ReturnType<typeof useUserDataCollection>> = {
    watching: useUserDataCollection("status", "watching"),
    planned: useUserDataCollection("status", "planned"),
    completed: useUserDataCollection("status", "completed"),
    on_hold: useUserDataCollection("status", "on_hold"),
    dropped: useUserDataCollection("status", "dropped"),
  };

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
  // resume coordinates. Rows at/past 90% watched are completion leftovers, not "Сейчас
  // смотрите" material: skipped like the episode-level endpoint skips them. Resumability
  // through a saved lastSource only gates the resume action, never the now-block itself.
  const nowWatching = continueCards.find(
    (card) => card.resume != null && !isResumeEffectivelyComplete(card.resume),
  ) ?? null;

  const handleLogout = () => {
    logout();
    showHUD("info", t("hud.loggedOut"));
  };

  const tabs: ProfileTabDef[] = [
    { id: "continue", label: t("page.tabs.continue"), count: continueEpisodes.length },
    ...PROFILE_STATUSES.map((status) => ({
      id: status as ProfileTabId,
      label: t(`page.tabs.${status}`),
      count: statusCollections[status].total,
    })),
  ];

  const activeCollection = activeTab === "continue" ? null : statusCollections[activeTab];

  return (
    <div className="profile-container profile-container--scroll">
      <ProfileHero
        username={potokUser?.username ?? t("page.defaultUser")}
        isAuth={isAuth}
        createdAt={potokUser?.createdAt}
        nowWatching={nowWatching}
        onResume={resumeCard}
      />

      <ProfileTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      <div className="profile-body-split">
        <div className="profile-body-main">
          {activeTab === "continue" ? (
            continueEpisodes.length > 0 ? (
              <div className="profile-continue-grid">
                {continueEpisodes.map((item) => (
                  <ContinueEpisodeCard
                    key={`${item.id}:${item.seasonNumber ?? "movie"}:${item.episodeNumber ?? 0}`}
                    item={item}
                    onClick={resumeEpisode}
                  />
                ))}
              </div>
            ) : (
              <div className="library-empty-view collection-mode">
                <History size="3rem" className="library-empty-icon muted" />
                <h2 className="library-empty-title">{t("continueSection.empty")}</h2>
                <p className="library-empty-subtitle">{t("continueSection.emptySub")}</p>
              </div>
            )
          ) : activeCollection ? (
            <ProfileStatusGrid
              status={activeTab}
              items={activeCollection.items}
              loading={activeCollection.loading}
              continueEpisodes={continueEpisodes}
            />
          ) : null}
        </div>

        <aside className="profile-sidebar">
          <ProfileStatisticsSection state={summaryState} />
          <ProfileActivitySection />
        </aside>
      </div>

      <button type="button" className="profile-page-logout mobile-only" onClick={handleLogout}>
        {t("page.logout")}
      </button>
    </div>
  );
};

export const ProfilePage: React.FC = () => {
  const { section } = useParams<{ section: string }>();

  // The phase-2 status tabs are gone — their deep links land on the single-scroll page.
  // «Аккаунт» went the same way: no in-page account section to scroll to anymore.
  if (section) {
    return <Navigate to="/profile" replace />;
  }

  return <ProfileScrollPage />;
};

export default ProfilePage;
