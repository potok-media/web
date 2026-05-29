import React, { useState, useCallback } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useHUD } from "../context/HUDContext";
import { useTorrentsPage } from "../hooks/useTorrentsPage";
import TorrentSkeletonList from "../components/TorrentSkeletonList";
import TorrentRowComponent from "../components/TorrentRowComponent";
import { TorrentFilesPopup } from "../components/TorrentFilesPopup";
import { TorrentsSidebar } from "../components/TorrentsSidebar";
import { TorrentsFilterBar } from "../components/TorrentsFilterBar";
import "../styles/media.css";

export const TorrentsPage: React.FC = () => {
  const { mediaType, id } = useParams<{ mediaType: string; id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { show: showHUD } = useHUD();

  const mediaId = Number(id);
  const state = location.state as { season?: number; episode?: number; media?: any } | null;
  const season = state?.season ?? (searchParams.get("season") ? Number(searchParams.get("season")) : undefined);
  const episode = state?.episode ?? (searchParams.get("episode") ? Number(searchParams.get("episode")) : undefined);
  const initialMedia = state?.media;

  const [selectedTorrent, setSelectedTorrent] = useState<any | null>(null);

  const handleOnError = useCallback((msg: string) => {
    showHUD("error", msg);
  }, [showHUD]);

  const {
    media,
    torrents,
    loadingMedia,
    loadingTorrents,
    trackers,
    qualityFilter,
    setQualityFilter,
    activeTracker,
    setActiveTracker,
    sortOption,
    setSortOption,
    refetch,
  } = useTorrentsPage({
    mediaType,
    mediaId,
    season,
    episode,
    initialMedia,
    onError: handleOnError,
  });

  if (!loadingMedia && !media) {
    return (
      <div className="media-not-found-container">
        <ShieldAlert size={48} className="media-not-found-icon" />
        <h2 className="media-not-found-title">Медиа не найдено</h2>
        <button className="btn-glass" onClick={() => navigate(-1)}>Назад</button>
      </div>
    );
  }

  return (
    <div className="torrents-page-layout">
      {/* Blurred backdrop */}
      <div
        className="torrents-page-backdrop"
        style={{ backgroundImage: `url(${media?.backdropSrc || ""})` }}
      />

      {media ? (
        <TorrentsSidebar 
          media={media}
          season={season}
          episode={episode}
          onBack={() => navigate(-1)}
        />
      ) : (
        <aside className="torrents-page-sidebar skeleton-loading">
          <button className="torrents-sidebar-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </button>
          <div className="torrents-sidebar-poster skeleton" style={{ height: "360px", borderRadius: "12px", background: "rgba(255,255,255,0.05)" }} />
          <div className="skeleton" style={{ height: "28px", width: "80%", marginTop: "16px", borderRadius: "6px", background: "rgba(255,255,255,0.05)" }} />
          <div className="skeleton" style={{ height: "16px", width: "50%", marginTop: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.05)" }} />
          <div className="skeleton" style={{ height: "60px", width: "100%", marginTop: "24px", borderRadius: "8px", background: "rgba(255,255,255,0.05)" }} />
        </aside>
      )}

      {/* Right Column: Search Results list */}
      <section className="torrents-page-content">
        <TorrentsFilterBar 
          sortedCount={torrents.length}
          sortOption={sortOption}
          setSortOption={setSortOption}
          qualityFilter={qualityFilter}
          setQualityFilter={setQualityFilter}
          activeTracker={activeTracker}
          setActiveTracker={setActiveTracker}
          trackers={trackers}
          onRefresh={refetch}
        />

        {/* Results list scrolls independently */}
        <div className="torrents-results-list">
          {loadingTorrents ? (
            <TorrentSkeletonList />
          ) : torrents.length > 0 ? (
            torrents.map((t, index) => (
              <TorrentRowComponent
                key={t.id || index}
                torrent={t}
                onClick={setSelectedTorrent}
              />
            ))
          ) : (
            <div className="torrent-empty-state">
              <ShieldAlert size={40} opacity={0.5} />
              <span className="torrent-empty-state-text">Раздач не найдено. Попробуйте сменить фильтры.</span>
            </div>
          )}
        </div>
      </section>

      {/* Selected torrent files dynamic popup sheet */}
      {selectedTorrent && media && (
        <TorrentFilesPopup
          isOpen={!!selectedTorrent}
          onClose={() => setSelectedTorrent(null)}
          torrent={selectedTorrent}
          mediaItem={media}
          seasonNumber={season}
          episodeNumber={episode}
        />
      )}
    </div>
  );
};

export default TorrentsPage;
