import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { RotateCw, Flame, Calendar, ArrowUpCircle, ArrowDownCircle, ChevronDown, Check, Filter } from "lucide-react";

interface StreamFilterBarProps {
  id?: string;
  countLabel: string;
  qualityFilter: string;
  setQualityFilter: (quality: string) => void;
  activeTracker: string;
  setActiveTracker: (tracker: string) => void;
  trackers: string[];
  onRefresh: () => void;
  showSort?: boolean;
  sortOption?: string;
  setSortOption?: (opt: string) => void;
  trackerLabel?: string;
  allTrackersLabel?: string;
}

const SORT_OPTIONS: Record<string, string> = {
  seedersDesc: "По популярности",
  publishDateDesc: "Сначала новые",
  sizeDesc: "Сначала большие",
  sizeAsc: "Сначала маленькие",
};

export const StreamFilterBar: React.FC<StreamFilterBarProps> = React.memo(({
  id,
  countLabel,
  sortOption = "seedersDesc",
  setSortOption,
  qualityFilter,
  setQualityFilter,
  activeTracker,
  setActiveTracker,
  trackers,
  onRefresh,
  showSort = true,
  trackerLabel = "Источник",
  allTrackersLabel = "Все трекеры",
}) => {
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const sortTriggerRef = useRef<HTMLButtonElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);

  const [sortCoords, setSortCoords] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const [filterCoords, setFilterCoords] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  const updateSortCoords = () => {
    if (sortTriggerRef.current) {
      const rect = sortTriggerRef.current.getBoundingClientRect();
      setSortCoords({
        top: rect.bottom,
        right: window.innerWidth - rect.right,
      });
    }
  };

  const updateFilterCoords = () => {
    if (filterTriggerRef.current) {
      const rect = filterTriggerRef.current.getBoundingClientRect();
      setFilterCoords({
        top: rect.bottom,
        right: window.innerWidth - rect.right,
      });
    }
  };

  useEffect(() => {
    if (sortOpen) {
      updateSortCoords();
      window.addEventListener("resize", updateSortCoords);
      window.addEventListener("scroll", updateSortCoords, true);
    }
    return () => {
      window.removeEventListener("resize", updateSortCoords);
      window.removeEventListener("scroll", updateSortCoords, true);
    };
  }, [sortOpen]);

  useEffect(() => {
    if (filterOpen) {
      updateFilterCoords();
      window.addEventListener("resize", updateFilterCoords);
      window.addEventListener("scroll", updateFilterCoords, true);
    }
    return () => {
      window.removeEventListener("resize", updateFilterCoords);
      window.removeEventListener("scroll", updateFilterCoords, true);
    };
  }, [filterOpen]);

  return (
    <header className="streams-results-header" id={id}>
      <div className="streams-results-count">
        {countLabel}
      </div>
      
      <div className="streams-header-actions">
        {/* Refresh Button */}
        <button 
          className="btn-glass filter-btn-trigger" 
          onClick={onRefresh}
        >
          <RotateCw size={14} />
          <span className="filter-btn-text">Обновить</span>
        </button>

        {/* Sorting Dropdown */}
        {showSort && setSortOption && (
          <div className="filter-popover-wrapper">
            <button
              ref={sortTriggerRef}
              className="btn-glass filter-btn-trigger"
              onClick={() => {
                setSortOpen(!sortOpen);
                setFilterOpen(false);
              }}
            >
              {sortOption === "seedersDesc" && <Flame size={14} />}
              {sortOption === "publishDateDesc" && <Calendar size={14} />}
              {sortOption === "sizeDesc" && <ArrowUpCircle size={14} />}
              {sortOption === "sizeAsc" && <ArrowDownCircle size={14} />}
              <span className="filter-btn-text">{SORT_OPTIONS[sortOption]}</span>
              <ChevronDown size={14} />
            </button>

            {sortOpen && createPortal(
              <>
                <div 
                  className="filter-popover-overlay" 
                  style={{ position: "fixed", inset: 0, zIndex: 999998 }}
                  onClick={() => setSortOpen(false)} 
                />
                <div 
                  className="filter-popover filter-popover-menu-sort"
                  style={{
                    position: "fixed",
                    top: `${sortCoords.top}px`,
                    right: `${sortCoords.right}px`,
                    zIndex: 999999,
                    marginTop: "6px",
                  }}
                >
                  {Object.entries(SORT_OPTIONS).map(([key, label]) => (
                    <div
                      key={key}
                      className={`popover-item ${sortOption === key ? "active" : ""}`}
                      onClick={() => {
                        setSortOption(key);
                        setSortOpen(false);
                      }}
                    >
                      <div className="filter-popover-item-content">
                        {key === "seedersDesc" && <Flame size={14} />}
                        {key === "publishDateDesc" && <Calendar size={14} />}
                        {key === "sizeDesc" && <ArrowUpCircle size={14} />}
                        {key === "sizeAsc" && <ArrowDownCircle size={14} />}
                        <span>{label}</span>
                      </div>
                      {sortOption === key && <Check size={14} className="filter-popover-check" />}
                    </div>
                  ))}
                </div>
              </>,
              document.body
            )}
          </div>
        )}

        {/* Filters Dropdown */}
        <div className="filter-popover-wrapper">
          <button
            ref={filterTriggerRef}
            className="btn-glass filter-btn-trigger-relative"
            onClick={() => {
              setFilterOpen(!filterOpen);
              setSortOpen(false);
            }}
          >
            <Filter size={14} />
            <span className="filter-btn-text">Фильтры</span>
            <ChevronDown size={14} />
            {(qualityFilter !== "all" || activeTracker !== "all") && (
              <span className="filter-badge-dot" />
            )}
          </button>

          {filterOpen && createPortal(
            <>
              <div 
                className="filter-popover-overlay" 
                style={{ position: "fixed", inset: 0, zIndex: 999998 }}
                onClick={() => setFilterOpen(false)} 
              />
              <div 
                className="filter-popover filter-popover-menu-filter"
                style={{
                  position: "fixed",
                  top: `${filterCoords.top}px`,
                  right: `${filterCoords.right}px`,
                  zIndex: 999999,
                  marginTop: "6px",
                }}
              >
                <div className="filter-section-title">Качество</div>
                <div className="filter-popover-column">
                  {["all", "2160p", "1080p", "720p", "480p"].map((q) => (
                    <div
                      key={q}
                      className={`popover-item ${qualityFilter === q ? "active" : ""}`}
                      onClick={() => setQualityFilter(q)}
                    >
                      <span>{q === "all" ? "Все качества" : q}</span>
                      {qualityFilter === q && <Check size={14} className="filter-popover-check" />}
                    </div>
                  ))}
                </div>

                <div className="filter-popover-divider" />

                <div className="filter-section-title">
                  {trackerLabel}
                </div>
                <div className="filter-popover-scroll-area">
                  <div
                    className={`popover-item ${activeTracker === "all" ? "active" : ""}`}
                    onClick={() => setActiveTracker("all")}
                  >
                    <span>
                      {allTrackersLabel}
                    </span>
                    {activeTracker === "all" && <Check size={14} className="filter-popover-check" />}
                  </div>
                  {trackers.map((tr) => (
                    <div
                      key={tr}
                      className={`popover-item ${activeTracker === tr ? "active" : ""}`}
                      onClick={() => setActiveTracker(tr)}
                    >
                      <span>{tr}</span>
                      {activeTracker === tr && <Check size={14} className="filter-popover-check" />}
                    </div>
                  ))}
                </div>

                {(qualityFilter !== "all" || activeTracker !== "all") && (
                  <>
                    <div className="filter-popover-divider" />
                    <button
                      className="popover-reset-btn"
                      onClick={() => {
                        setQualityFilter("all");
                        setActiveTracker("all");
                        setFilterOpen(false);
                      }}
                    >
                      Сбросить всё
                    </button>
                  </>
                )}
              </div>
            </>,
            document.body
          )}
        </div>
      </div>
    </header>
  );
});

StreamFilterBar.displayName = "StreamFilterBar";
