import React, { useCallback, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useHUD } from "../context/HUDContext";
import { useHomeFeed } from "../hooks/useHomeFeed";
import HeroSpotlight from "../components/HeroSpotlight";
import MediaRow from "../components/MediaRow";
import { LoadingSpinner } from "../components/LoadingSpinner";
import type { MediaCard } from "../network/ApiTypes";
import { usePerformanceTrack } from "../utils/PerformanceMonitor";
import { PlatformManager } from "../utils/PlatformManager";
import { useScrollLock } from "../components/common/TVNavigation";
import "../styles/media.css";

const ErrorView: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
  <div className="media-not-found-container">
    <h2 className="media-not-found-title">{error}</h2>
    <button className="overlay-btn" onClick={onRetry}>Повторить загрузку</button>
  </div>
);

const VirtualRow: React.FC<{
  children: React.ReactNode;
  height?: string;
}> = ({ children, height = "16.25rem" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollLocked = useScrollLock();
  const pendingVisibilityRef = useRef<boolean | null>(null);

  useEffect(() => {
    // IntersectionObserver rootMargin only supports px or % units.
    // Convert rem/em to px (assuming standard 16px root font size) for the observer buffer.
    const parseMarginToPx = (val: string): string => {
      try {
        const clean = (val || "").trim().toLowerCase();
        if (clean.endsWith("px") || clean.endsWith("%")) {
          return clean;
        }
        if (clean.endsWith("rem") || clean.endsWith("em")) {
          const parsed = parseFloat(clean);
          return isNaN(parsed) ? "260px" : `${parsed * 16}px`;
        }
        const parsed = parseFloat(clean);
        return isNaN(parsed) ? "260px" : `${parsed}px`;
      } catch {
        return "260px";
      }
    };

    const margin = parseMarginToPx(height);

    const observer = new IntersectionObserver(
      ([entry]) => {
        const intersecting = entry.isIntersecting;
        if (scrollLocked) {
          pendingVisibilityRef.current = intersecting;
        } else {
          setIsVisible(intersecting);
          if (intersecting) {
            setHasBeenVisible(true);
          }
        }
      },
      {
        rootMargin: `${margin} 0px ${margin} 0px`, // Buffer of 1 row top/bottom
        threshold: 0,
      }
    );

    const currentRef = containerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
      observer.disconnect();
    };
  }, [height, scrollLocked]);

  useEffect(() => {
    if (!scrollLocked && pendingVisibilityRef.current !== null) {
      setIsVisible(pendingVisibilityRef.current);
      if (pendingVisibilityRef.current) {
        setHasBeenVisible(true);
      }
      pendingVisibilityRef.current = null;
    }
  }, [scrollLocked]);

  return (
    <div
      ref={containerRef}
      style={{ minHeight: isVisible ? undefined : height }}
      className="virtual-row-placeholder"
    >
      {hasBeenVisible ? children : null}
    </div>
  );
};

export const HomePage: React.FC = () => {
  usePerformanceTrack("HomePage");
  const navigate = useNavigate();
  const { show: showHUD } = useHUD();

  const { feed, loading, refetch } = useHomeFeed((msg) => showHUD("error", msg));

  const [visibleRowsCount, setVisibleRowsCount] = useState<number>(() => {
    return PlatformManager.isTV() ? 1 : (feed ? feed.rows.length : 0);
  });

  useEffect(() => {
    if (!feed) {
      if (PlatformManager.isTV()) {
        setVisibleRowsCount(1);
      }
      return;
    }

    if (!PlatformManager.isTV()) {
      setVisibleRowsCount(feed.rows.length);
      return;
    }

    if (visibleRowsCount < feed.rows.length) {
      const timer = setTimeout(() => {
        setVisibleRowsCount((prev) => Math.min(prev + 1, feed.rows.length));
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [feed, visibleRowsCount]);

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

      {feed.rows.slice(0, visibleRowsCount).map((row, index) => (
        <VirtualRow key={row.id || index}>
          <MediaRow
            id={row.id}
            title={row.title}
            items={row.items}
            onCardClick={handleCardClick}
            onSeeAllClick={handleSeeAllClick}
          />
        </VirtualRow>
      ))}
    </div>
  );
};

export default HomePage;
