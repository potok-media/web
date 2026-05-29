import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useHUD } from "../context/HUDContext";
import { useHomeFeed } from "../hooks/useHomeFeed";
import HeroSpotlight from "../components/HeroSpotlight";
import MediaRow from "../components/MediaRow";
import { LoadingSpinner } from "../components/LoadingSpinner";
import type { MediaCard } from "../network/ApiTypes";
import "../styles/media.css";

const ErrorView: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
  <div className="media-not-found-container">
    <h2 className="media-not-found-title">{error}</h2>
    <button className="overlay-btn" onClick={onRetry}>Повторить загрузку</button>
  </div>
);

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { show: showHUD } = useHUD();

  const { feed, loading, refetch } = useHomeFeed((msg) => showHUD("error", msg));

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
  if (!feed) return <ErrorView error="Не удалось загрузить медиатеку" onRetry={refetch} />;

  return (
    <div className="home-page-container">
      {feed.hero && feed.hero.length > 0 && (
        <HeroSpotlight
          items={feed.hero}
          onPlay={handleHeroPlay}
          onDetails={handleHeroDetails}
        />
      )}

      {feed.rows.map((row, index) => (
        <MediaRow
          key={index}
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
