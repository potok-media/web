import React from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle } from "lucide-react";
import { SpinnerIcon } from "./SubtitleLoadingIcons";

interface TrackItem {
  id: number;
  name: string;
  loading?: boolean;
  error?: boolean;
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
  onAddSubtitleUrl?: (url: string) => Promise<void>;
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
  disableOptionLabel,
  onUploadSubtitle,
  onAddSubtitleUrl,
  disabled,
}) => {
  const { t } = useTranslation("player");
  const ITEM_HEIGHT = 36;
  const MAX_VISIBLE_HEIGHT = 282;

  const [subUrl, setSubUrl] = React.useState("");
  const [urlBusy, setUrlBusy] = React.useState(false);
  const [urlError, setUrlError] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadSubtitle) {
      onUploadSubtitle(file);
    }
  };

  const submitUrl = async () => {
    const u = subUrl.trim();
    if (!u || !onAddSubtitleUrl) return;
    setUrlBusy(true);
    setUrlError(false);
    try {
      await onAddSubtitleUrl(u);
      setSubUrl("");
    } catch {
      setUrlError(true);
    } finally {
      setUrlBusy(false);
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
        title={t("trackSelector.chooseTitle", { title })}
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
              {disableOptionLabel ?? t("trackSelector.disable")}
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
            {items.map((track) => {
              const busy = !!(track.loading || track.error);
              return (
                <div
                  key={track.id}
                  className={`dropdown-menu-item ${currentItemId === track.id ? "selected" : ""}`}
                  onClick={() => { if (!busy) onSelect(track.id); }}
                  aria-busy={track.loading || undefined}
                  aria-disabled={busy || undefined}
                  title={track.error ? t("trackSelector.loadError") : undefined}
                  style={{
                    minHeight: `${ITEM_HEIGHT}px`,
                    height: "auto",
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: busy ? "default" : "pointer",
                    opacity: busy ? 0.55 : 1,
                  }}
                >
                  {track.loading && <SpinnerIcon size={14} />}
                  {track.error && <AlertCircle size={14} />}
                  <span>{track.name}</span>
                </div>
              );
            })}
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
                  accept=".srt,.vtt,.ass,.ssa"
                  onChange={handleFileChange}
                  className="dropdown-upload-input"
                  aria-label={t("trackSelector.uploadSubtitlesAria")}
                />
                <span className="upload-btn-text">{t("trackSelector.uploadFile")}</span>
              </label>
            </>
          )}

          {onAddSubtitleUrl && (
            <div style={{ display: "flex", gap: "0.375rem", padding: "0.5rem 0.75rem", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
              <input
                type="url"
                inputMode="url"
                value={subUrl}
                placeholder={t("trackSelector.urlPlaceholder")}
                onChange={(e) => { setSubUrl(e.target.value); setUrlError(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") submitUrl(); }}
                aria-label={t("trackSelector.urlPlaceholder")}
                style={{
                  flex: 1, minWidth: 0, fontSize: "0.8rem", padding: "0.4rem 0.55rem",
                  borderRadius: "var(--radius-m, 0.4rem)", color: "var(--text-primary, #fff)",
                  background: "rgba(255,255,255,0.06)",
                  border: `1px solid ${urlError ? "var(--error)" : "rgba(255,255,255,0.15)"}`,
                  outline: "none",
                }}
              />
              <button
                onClick={submitUrl}
                disabled={urlBusy || !subUrl.trim()}
                style={{
                  padding: "0.4rem 0.7rem", fontSize: "0.8rem", whiteSpace: "nowrap",
                  borderRadius: "var(--radius-m, 0.4rem)", border: "none", cursor: "pointer",
                  color: "var(--accent-contrast, #000)", background: "var(--accent, #6c9)",
                  opacity: urlBusy || !subUrl.trim() ? 0.5 : 1,
                }}
              >
                {urlBusy ? "…" : t("trackSelector.urlAdd")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
