import React from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle } from "lucide-react";
import { SpinnerIcon } from "./SubtitleLoadingIcons";
import { Button, FileInput, IconButton, Input, cx } from "../ui";

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
      <IconButton
        className={cx("control-icon-btn", isOpen && "active-accent")}
        disabled={disabled}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onToggle();
        }}
        title={t("trackSelector.chooseTitle", { title })}
        aria-label={t("trackSelector.chooseTitle", { title })}
      >
        {icon}
      </IconButton>
      {isOpen && (
        <div className="selector-dropdown-menu" onClick={(e) => e.stopPropagation()}>
          <div className="dropdown-menu-header">{title}</div>
          {showDisableOption && (
            <div 
              className={`dropdown-menu-item ${currentItemId === -1 ? "selected" : ""}`}
              onClick={() => onSelect(-1)}
            >
              {disableOptionLabel ?? t("trackSelector.disable")}
            </div>
          )}

          <div className={`dropdown-list-container${isScrollable ? " is-scrollable" : ""}`}>
            {items.map((track) => {
              const busy = !!(track.loading || track.error);
              return (
                <div
                  key={track.id}
                  className={`dropdown-menu-item ${currentItemId === track.id ? "selected" : ""}${busy ? " is-busy" : ""}`}
                  onClick={() => { if (!busy) onSelect(track.id); }}
                  aria-busy={track.loading || undefined}
                  aria-disabled={busy || undefined}
                  title={track.error ? t("trackSelector.loadError") : undefined}
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
              >
                <FileInput
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
            <div className="track-selector-url-row" onClick={(e) => e.stopPropagation()}>
              <Input
                type="url"
                inputMode="url"
                value={subUrl}
                placeholder={t("trackSelector.urlPlaceholder")}
                onChange={(e) => { setSubUrl(e.target.value); setUrlError(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") submitUrl(); }}
                aria-label={t("trackSelector.urlPlaceholder")}
                className={cx("track-selector-url-input", urlError && "track-selector-url-input--error")}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={submitUrl}
                disabled={urlBusy || !subUrl.trim()}
                className="track-selector-url-submit"
              >
                {urlBusy ? "…" : t("trackSelector.urlAdd")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
