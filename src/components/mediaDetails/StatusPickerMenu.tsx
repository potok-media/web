import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bookmark, Check, ChevronDown, Eye, Pause, Play, X, type LucideIcon } from "lucide-react";
import { IconButton, PopoverItem } from "../ui";
import { DetailsPickerPopover } from "./DetailsPickerPopover";
import type { TitleStatus } from "../../utils/userData";

interface StatusPickerMenuProps {
  status: TitleStatus | null;
  isWatched: boolean;
  onSelectStatus: (status: TitleStatus | null) => void;
  /** "Просмотрено" intentionally wires the manual mark-watched call, not a layer status. */
  onMarkWatched: () => void;
}

const STATUS_ORDER: { value: TitleStatus; icon: LucideIcon }[] = [
  { value: "watching", icon: Play },
  { value: "planned", icon: Bookmark },
  { value: "completed", icon: Eye },
  { value: "on_hold", icon: Pause },
  { value: "dropped", icon: X },
];

export const StatusPickerMenu: React.FC<StatusPickerMenuProps> = ({
  status,
  isWatched,
  onSelectStatus,
  onMarkWatched,
}) => {
  const { t } = useTranslation("media");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const ActiveIcon =
    (status && STATUS_ORDER.find((entry) => entry.value === status)?.icon) || Bookmark;
  const triggerLabel = status ? t(`status.${status}`) : t("status.planned");

  const handleSelect = (value: TitleStatus) => {
    setOpen(false);
    if (value === "completed") {
      onMarkWatched();
      return;
    }
    if (status !== value) onSelectStatus(value);
  };

  return (
    <div className="details-picker-wrapper">
      <IconButton
        ref={triggerRef}
        className={`action-btn-circle details-picker-trigger ${status ? "active" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        title={triggerLabel}
        aria-label={triggerLabel}
      >
        <ActiveIcon size="1.125rem" />
        <ChevronDown size="0.75rem" />
      </IconButton>

      <DetailsPickerPopover open={open} onClose={() => setOpen(false)} triggerRef={triggerRef}>
        {STATUS_ORDER.map(({ value, icon: StatusIcon }) => {
          const active = value === "completed" ? isWatched : status === value;
          return (
            <PopoverItem
              key={value}
              active={active}
              className="details-picker-item"
              onClick={() => handleSelect(value)}
            >
              <StatusIcon size="1rem" className="details-picker-item-icon" />
              <span>{t(`status.${value}`)}</span>
              {active && <Check size="1rem" className="details-picker-check" />}
            </PopoverItem>
          );
        })}
        <PopoverItem
          className="details-picker-item"
          disabled={!status}
          onClick={() => {
            setOpen(false);
            onSelectStatus(null);
          }}
        >
          <span>{t("status.clear")}</span>
        </PopoverItem>
      </DetailsPickerPopover>
    </div>
  );
};

export default StatusPickerMenu;
