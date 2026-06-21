import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { restoreFocusOrDefault } from "../utils/focusMemory";
import { PlatformManager } from "../utils/PlatformManager";
import { useHUD } from "../context/HUDContext";
import { useHomeFeed } from "../hooks/useHomeFeed";
import HeroSpotlight from "../components/HeroSpotlight";
import MediaRow from "../components/MediaRow";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { FocusableButton } from "../components/common/TVNavigation";
import type { MediaCard } from "../network/ApiTypes";
import "../styles/media.css";

const ErrorView: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => {
  const { t } = useTranslation("media");
  React.useEffect(() => {
    setFocus("HOME_ERROR_RETRY");
  }, []);
  return (
    <div className="media-not-found-container">
      <h2 className="media-not-found-title">{error}</h2>
      <FocusableButton focusKey="HOME_ERROR_RETRY" className="overlay-btn" onClick={onRetry}>{t("common.retry")}</FocusableButton>
    </div>
  );
};

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation("media");
  const { show: showHUD } = useHUD();

  const { feed, loading, refetch } = useHomeFeed((msg) => showHUD("error", msg));

  // Initial focus: on Back, restore the card the user was on; otherwise the hero button (if any)
  // or the first row's first card. HomePage owns this (HeroSpotlight gets autoFocus={false}) so the
  // restore isn't overridden. Runs after HeroSpotlight's effects (child-before-parent).
  // TV only — on desktop there's a mouse, so forcing focus just paints a stray ring on a card.
  React.useEffect(() => {
    if (!PlatformManager.isTV()) return;
    if (!feed) return;
    let defaultKey: string | undefined;
    if (feed.hero && feed.hero.length > 0) {
      defaultKey = "HERO_DETAILS_BUTTON";
    } else if (feed.rows?.length && feed.rows[0].items?.length) {
      const firstRow = feed.rows[0];
      const rowCleanId = (firstRow.id || firstRow.title).replace(/\s+/g, "-").toLowerCase();
      defaultKey = `row-${rowCleanId}-first-card-${firstRow.items[0].id}-${firstRow.items[0].mediaType}`;
    }
    restoreFocusOrDefault(location.key || location.pathname, defaultKey);
  }, [feed, location.key, location.pathname]);

  const handleCardClick = useCallback((item: MediaCard) => {
    navigate(`/media/${item.mediaType}/${item.id}`);
  }, [navigate]);

  const handleSeeAllClick = useCallback((rowId: string) => {
    navigate(`/library/${rowId}`);
  }, [navigate]);

  const handleHeroPlay = useCallback((heroItem: any) => {
    if (!heroItem) return;
    navigate(`/media/${heroItem.card.mediaType}/${heroItem.card.id}?play=true`);
  }, [navigate]);

  const handleHeroDetails = useCallback((heroItem: any) => {
    if (!heroItem) return;
    navigate(`/media/${heroItem.card.mediaType}/${heroItem.card.id}`);
  }, [navigate]);

  if (loading) return <LoadingSpinner />;
  if (!feed) return <ErrorView error={t("home.loadError")} onRetry={refetch} />;

  return (
    <div className="home-page-container">
      {feed.hero && feed.hero.length > 0 && (
        <HeroSpotlight
          items={feed.hero}
          onPlay={handleHeroPlay}
          onDetails={handleHeroDetails}
          autoFocus={false}
        />
      )}

      {feed.rows.map((row, index) => (
        <MediaRow
          key={row.id || index}
          id={row.id}
          title={row.title}
          items={row.items}
          onCardClick={handleCardClick}
          onSeeAllClick={handleSeeAllClick}
        />
      ))}
    </div>
  );
};

export default HomePage;
