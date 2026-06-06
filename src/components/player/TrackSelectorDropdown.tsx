import React from "react";

interface TrackItem {
  id: number;
  name: string;
}

interface TrackSelectorDropdownProps {
  icon: React.ReactNode;
  title: string;
  items: TrackItem[];
  currentItemId: number;
  onSelect: (id: number) => void;
  isOpen: boolean;
  onToggle: () => void;
  showDisableOption?: boolean;
  disableOptionLabel?: string;
  onUploadSubtitle?: (file: File) => void;
  disabled?: boolean;
}

export const TrackSelectorDropdown: React.FC<TrackSelectorDropdownProps> = ({
  icon,
  title,
  items,
  currentItemId,
  onSelect,
  isOpen,
  onToggle,
  showDisableOption = false,
  disableOptionLabel = "Отключить",
  onUploadSubtitle,
  disabled,
}) => {
  const ITEM_HEIGHT = 36;
  const MAX_VISIBLE_HEIGHT = 282;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadSubtitle) {
      onUploadSubtitle(file);
    }
  };

  // Dynamic bounds calculation prevents visual collapsed bugs
  const computedHeight = items.length * ITEM_HEIGHT;
  const isScrollable = computedHeight > MAX_VISIBLE_HEIGHT;

  return (
    <div className="selector-menu-container">
      <button 
        className={`control-icon-btn ${isOpen ? "active-accent" : ""}`}
        disabled={disabled}
        style={disabled ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onToggle();
        }}
        title={`Выбор: ${title}`}
      >
        {icon}
      </button>
      {isOpen && (
        <div className="selector-dropdown-menu" onClick={(e) => e.stopPropagation()}>
          <div className="dropdown-menu-header">{title}</div>
          {showDisableOption && (
            <div 
              className={`dropdown-menu-item ${currentItemId === -1 ? "selected" : ""}`}
              onClick={() => onSelect(-1)}
              style={{ minHeight: `${ITEM_HEIGHT}px`, height: "auto", boxSizing: "border-box" }}
            >
              {disableOptionLabel}
            </div>
          )}

          <div 
            className="dropdown-list-container"
            style={{
              maxHeight: `${MAX_VISIBLE_HEIGHT}px`,
              overflowY: isScrollable ? "scroll" : "auto",
              willChange: "transform",
              backfaceVisibility: "hidden"
            }}
          >
            {items.map((track) => (
              <div 
                key={track.id}
                className={`dropdown-menu-item ${currentItemId === track.id ? "selected" : ""}`}
                onClick={() => onSelect(track.id)}
                style={{ minHeight: `${ITEM_HEIGHT}px`, height: "auto", boxSizing: "border-box" }}
              >
                {track.name}
              </div>
            ))}
          </div>

          {onUploadSubtitle && (
            <>
              <div className="dropdown-divider" />
              <label 
                className="dropdown-menu-item upload-btn-wrapper"
                style={{ minHeight: `${ITEM_HEIGHT}px`, height: "auto", boxSizing: "border-box" }}
              >
                <input 
                  type="file" 
                  accept=".srt,.vtt" 
                  onChange={handleFileChange}
                  className="dropdown-upload-input"
                  aria-label="Загрузить субтитры"
                />
                <span className="upload-btn-text">Загрузить SRT/VTT...</span>
              </label>
            </>
          )}
        </div>
      )}
    </div>
  );
};
