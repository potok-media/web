import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import * as Lucide from "lucide-react";
import type { SelectSchema } from "@potok/sdk-types";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";
import { usePopoverCoords } from "../../../hooks/usePopoverCoords";
import { Overlay } from "../Overlay";
import { Button, PopoverItem } from "../../ui";
import { sdkStyleVars, toPascalCase } from "./componentRendererUtils";
import {
  isOptionSelected,
  isResetActive,
  parseResetValue,
  parseSelectValue,
  toggleMultiSelection,
  type SelectValue,
} from "./safeSelectUtils";
import { SafeSelectThemePreview } from "./SafeSelectThemePreview";

const { ChevronDown, Check } = Lucide;

interface SafeSelectProps {
  schema: SelectSchema;
  pluginId: string;
  baseStyle: React.CSSProperties;
}

export const SafeSelect: React.FC<SafeSelectProps> = ({ schema, pluginId, baseStyle }) => {
  const { t } = useTranslation("extensions");
  const { id, props: componentProps, events } = schema;
  const { multiple, selected: propSelected, resetValue } = componentProps;

  const [localSelected, setLocalSelected] = useState<SelectValue>(() =>
    parseSelectValue(propSelected, multiple),
  );
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const coords = usePopoverCoords(isOpen, triggerRef);

  useEffect(() => {
    setLocalSelected(parseSelectValue(propSelected, multiple));
  }, [propSelected, multiple]);

  const emitChange = (value: SelectValue) => {
    if (events?.onChange) {
      ExtensionRegistry.triggerUIEvent(pluginId, events.onChange, value);
    }
  };

  const handleSelectOption = (val: string) => {
    const shouldClose = componentProps.closeOnSelect ?? !multiple;

    if (multiple) {
      const next = toggleMultiSelection(localSelected, val);
      setLocalSelected(next);
      if (shouldClose) setIsOpen(false);
      emitChange(next);
      return;
    }

    setLocalSelected(val);
    if (shouldClose) setIsOpen(false);
    emitChange(val);
  };

  const parsedReset = parseResetValue(resetValue, multiple);

  const handleReset = () => {
    setLocalSelected(parsedReset);
    setIsOpen(false);
    emitChange(parsedReset);
  };

  const getTriggerLabel = () => {
    if (multiple) {
      const currentList = Array.isArray(localSelected) ? localSelected : [];
      const selectedOptions =
        componentProps.options?.filter((opt) => opt.value && currentList.includes(opt.value)) || [];
      if (selectedOptions.length > 0) {
        if (selectedOptions.length > 2) {
          return t("safe.selectedCount", { count: selectedOptions.length });
        }
        return selectedOptions.map((o) => o.label).join(", ");
      }
      return componentProps.label || t("safe.selectPlaceholder");
    }

    const selectedOption =
      componentProps.options?.find((opt) => opt.value === localSelected) ||
      componentProps.options?.[0];
    return selectedOption?.label || t("safe.selectPlaceholder");
  };

  const isGlass = componentProps.variant === "glass";
  let iconNode: React.ReactNode = null;
  const iconName = componentProps.icon;
  if (iconName) {
    const pascalName = toPascalCase(iconName);
    const lucideIcons = Lucide as unknown as Record<string, React.ComponentType<{ size?: number | string }>>;
    const DynamicIcon = lucideIcons[pascalName] || lucideIcons[iconName];
    if (DynamicIcon) {
      iconNode = <DynamicIcon size="0.875rem" />;
    }
  }
  const isPopoverAlignRight = isGlass && coords.left + 200 > window.innerWidth;
  const resetActive = isResetActive(localSelected, parsedReset, multiple);

  const singlePreview =
    !multiple && typeof localSelected === "string" ? localSelected : undefined;
  const multiPreview =
    multiple && Array.isArray(localSelected) && localSelected.length === 1
      ? localSelected[0]
      : undefined;

  return (
    <div id={id} className="potok-input-group filter-popover-wrapper potok-select-wrap--relative potok-sdk-props" style={sdkStyleVars(baseStyle)}>
      {!isGlass && componentProps.label && (
        <label className="potok-label potok-label--spaced">
          {componentProps.label}
        </label>
      )}
      <Button
        ref={triggerRef}
        variant={isGlass ? "glass" : "secondary"}
        fullWidth={!isGlass}
        className={isGlass ? "filter-btn-trigger-relative" : "ui-select potok-select"}
        disabled={componentProps.disabled}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="safe-select-trigger-content">
          {iconNode}
          {multiPreview && <SafeSelectThemePreview value={multiPreview} />}
          {singlePreview && <SafeSelectThemePreview value={singlePreview} />}
          <span className={isGlass ? "filter-btn-text" : ""}>{getTriggerLabel()}</span>
        </span>
        <ChevronDown size="0.875rem" className={isGlass ? undefined : "safe-select-chevron"} />
        {isGlass && resetActive && <span className="filter-badge-dot" />}
      </Button>

      <Overlay
        open={isOpen}
        onClose={() => setIsOpen(false)}
        styled={false}
        variant="popover"
        backdropClassName="filter-popover-overlay"
        className="filter-popover"
        popoverStyle={{
          position: "fixed",
          top: `${coords.top}px`,
          left: isPopoverAlignRight ? undefined : `${coords.left}px`,
          right: isPopoverAlignRight ? `${window.innerWidth - (coords.left + coords.width)}px` : undefined,
          width: isGlass ? "auto" : `${coords.width}px`,
          minWidth: isGlass ? "12.5rem" : undefined,
          zIndex: 999999,
          marginTop: coords.openUpward ? "-0.375rem" : "0.375rem",
          transform: coords.openUpward ? "translateY(-100%)" : "none",
          maxHeight: "17.5rem",
          overflowY: "auto",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          animation: "fadeIn 0.15s ease-out",
        }}
      >
        {componentProps.options?.map((opt, index) => {
          if (opt.type === "header") {
            return (
              <div key={`header-${index}`} className="filter-section-title">
                {opt.label}
              </div>
            );
          }
          if (opt.type === "divider") {
            return <div key={`divider-${index}`} className="filter-popover-divider" />;
          }
          const optionValue = opt.value || "";
          const active = isOptionSelected(localSelected, optionValue);
          return (
            <PopoverItem
              key={opt.value || `item-${index}`}
              active={active}
              onClick={() => handleSelectOption(optionValue)}
            >
              <span className="safe-select-option-label">
                {optionValue && <SafeSelectThemePreview value={optionValue} />}
                <span>{opt.label}</span>
              </span>
              {active && <Check size="0.875rem" className="filter-popover-check" />}
            </PopoverItem>
          );
        })}
        {componentProps.resetLabel && resetActive && (
          <>
            <div className="filter-popover-divider" />
            <Button variant="ghost" fullWidth className="popover-reset-btn" onClick={handleReset}>
              {componentProps.resetLabel}
            </Button>
          </>
        )}
      </Overlay>
    </div>
  );
};

export default SafeSelect;