import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useHUD } from "../context/useHUD";
import { useHomeFeed } from "../hooks/useHomeFeed";
import { DYNAMIC_CATEGORY_TITLES } from "./LibraryConfig";
import HeroSpotlight from "../components/HeroSpotlight";
import MediaRow from "../components/MediaRow";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { Slot } from "../components/common/extension/Slot";
import type { HeroItem, MediaCard } from "../network/ApiTypes";

import { Button } from "../components/ui";

const ErrorView: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => {
  const { t } = useTranslation("media");
  return (
    <div className="media-not-found-container">
      <h2 className="media-not-found-title">{error}</h2>
      <Button variant="primary" className="overlay-btn" onClick={onRetry}>{t("common.retry")}</Button>
    </div>
  );
};

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("media");
  const { show: showHUD } = useHUD();

  const { feed, loading, refetch } = useHomeFeed((msg) => showHUD("error", msg));

  const handleCardClick = useCallback((item: MediaCard) => {
    navigate(`/media/${item.mediaType}/${item.id}`);
  }, [navigate]);

  const handleSeeAllClick = useCallback((rowId: string) => {
    navigate(`/library/${rowId}`);
  }, [navigate]);

  const handleHeroPlay = useCallback((heroItem: HeroItem) => {
    if (!heroItem) return;
    navigate(`/media/${heroItem.card.mediaType}/${heroItem.card.id}?play=true`);
  }, [navigate]);

  const handleHeroDetails = useCallback((heroItem: HeroItem) => {
    if (!heroItem) return;
    navigate(`/media/${heroItem.card.mediaType}/${heroItem.card.id}`);
  }, [navigate]);

  if (loading) return <LoadingSpinner />;
  if (!feed) return <ErrorView error={t("home.loadError")} onRetry={refetch} />;

  return (
    <div className="home-page-container">
      {/* Plugin-contributed featured banner above the native hero (renders nothing if no contributions). */}
      <Slot name="home-hero" />

      {feed.hero && feed.hero.length > 0 && (
        <HeroSpotlight
          items={feed.hero}
          onPlay={handleHeroPlay}
          onDetails={handleHeroDetails}
        />
      )}

      {/* Plugin-contributed rows shown ABOVE the native feed rows. */}
      <Slot name="home-rows-top" />

      {feed.rows.map((row, index) => {
        const titleKey = DYNAMIC_CATEGORY_TITLES[row.id];
        const rowTitle = titleKey ? t(titleKey) : row.title;
        return (
          <MediaRow
            key={row.id || index}
            id={row.id}
            title={rowTitle}
            items={row.items}
            onCardClick={handleCardClick}
            onSeeAllClick={handleSeeAllClick}
          />
        );
      })}

      {/* Plugin-contributed rows shown BELOW the native feed rows. */}
      <Slot name="home-rows-bottom" />
    </div>
  );
};

export default HomePage;
