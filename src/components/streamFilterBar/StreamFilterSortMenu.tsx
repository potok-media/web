import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Flame, Calendar, ArrowUpCircle, ArrowDownCircle, ChevronDown, Check } from "lucide-react";
import { Overlay } from "../common/Overlay";
import { Button, PopoverItem } from "../ui";
import { SORT_KEYS } from "./streamFilterBarTypes";
import { useStreamFilterPopoverCoords } from "./useStreamFilterPopoverCoords";

interface StreamFilterSortMenuProps {
  sortOption: string;
  setSortOption: (opt: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export const StreamFilterSortMenu: React.FC<StreamFilterSortMenuProps> = ({
  sortOption,
  setSortOption,
  isOpen,
  onToggle,
  onClose,
}) => {
  const { t } = useTranslation("streams");
  const sortLabels: Record<string, string> = {
    seedersDesc: t("sort.seedersDesc"),
    publishDateDesc: t("sort.publishDateDesc"),
    sizeDesc: t("sort.sizeDesc"),
    sizeAsc: t("sort.sizeAsc"),
  };

  const sortTriggerRef = useRef<HTMLButtonElement>(null);
  const sortCoords = useStreamFilterPopoverCoords(isOpen, sortTriggerRef);

  return (
    <div className="filter-popover-wrapper">
      <Button
        ref={sortTriggerRef}
        variant="glass"
        className="filter-btn-trigger"
        onClick={onToggle}
      >
        {sortOption === "seedersDesc" && <Flame size="0.875rem" />}
        {sortOption === "publishDateDesc" && <Calendar size="0.875rem" />}
        {sortOption === "sizeDesc" && <ArrowUpCircle size="0.875rem" />}
        {sortOption === "sizeAsc" && <ArrowDownCircle size="0.875rem" />}
        <span className="filter-btn-text">{sortLabels[sortOption]}</span>
        <ChevronDown size="0.875rem" />
      </Button>

      <Overlay
        open={isOpen}
        onClose={onClose}
        styled={false}
        variant="popover"
        backdropClassName="filter-popover-overlay"
        className="filter-popover filter-popover-menu-sort"
        popoverStyle={{
          position: "fixed",
          top: `${sortCoords.top}px`,
          right: `${sortCoords.right}px`,
          zIndex: 999999,
          marginTop: "0.375rem",
        }}
      >
        {SORT_KEYS.map((key) => (
          <PopoverItem
            key={key}
            active={sortOption === key}
            onClick={() => {
              setSortOption(key);
              onClose();
            }}
          >
            <div className="filter-popover-item-content">
              {key === "seedersDesc" && <Flame size="0.875rem" />}
              {key === "publishDateDesc" && <Calendar size="0.875rem" />}
              {key === "sizeDesc" && <ArrowUpCircle size="0.875rem" />}
              {key === "sizeAsc" && <ArrowDownCircle size="0.875rem" />}
              <span>{sortLabels[key]}</span>
            </div>
            {sortOption === key && <Check size="0.875rem" className="filter-popover-check" />}
          </PopoverItem>
        ))}
      </Overlay>
    </div>
  );
};