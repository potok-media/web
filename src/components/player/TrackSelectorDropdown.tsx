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
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadSubtitle) {
      onUploadSubtitle(file);
    }
  };

  return (
    <div className="selector-menu-container">
      <button 
        className={`control-icon-btn ${isOpen ? "active-accent" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
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
            >
              {disableOptionLabel}
            </div>
          )}
          {items.map((track) => (
            <div 
              key={track.id}
              className={`dropdown-menu-item ${currentItemId === track.id ? "selected" : ""}`}
              onClick={() => onSelect(track.id)}
            >
              {track.name}
            </div>
          ))}
          {onUploadSubtitle && (
            <>
              <div className="dropdown-divider" />
              <label className="dropdown-menu-item upload-btn-wrapper">
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
