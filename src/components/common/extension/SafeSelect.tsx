import React, { useEffect, useState, useRef } from "react";
import * as Lucide from "lucide-react";
import type { SelectSchema } from "@potok/sdk-types";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";
import { FocusableButton } from "../TVNavigation";
import { Overlay } from "../Overlay";

const { ChevronDown, Check } = Lucide;

interface SafeSelectProps {
  schema: SelectSchema;
  pluginId: string;
  baseStyle: React.CSSProperties;
}

export const SafeSelect: React.FC<SafeSelectProps> = ({ schema, pluginId, baseStyle }) => {
  const { id, props: componentProps, events } = schema;
  
  const getInitialSelected = () => {
    const propSel = componentProps.selected;
    if (componentProps.multiple) {
      if (Array.isArray(propSel)) return propSel;
      if (typeof propSel === "string") {
        if (!propSel) return [];
        try {
          const parsed = JSON.parse(propSel);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          return propSel.split(",").map(s => s.trim()).filter(Boolean);
        }
        return [propSel];
      }
      return [];
    } else {
      if (Array.isArray(propSel)) return propSel[0] || "";
      return propSel || "";
    }
  };

  const [localSelected, setLocalSelected] = useState<string | string[]>(getInitialSelected);
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openUpward?: boolean;
  }>({ top: 0, left: 0, width: 0, openUpward: false });

  useEffect(() => {
    setLocalSelected(getInitialSelected());
  }, [componentProps.selected, componentProps.multiple]);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // Если снизу меньше 300px и сверху места больше, открываем наверх
      const openUpward = spaceBelow < 300 && spaceAbove > spaceBelow;

      setCoords({
        top: openUpward ? rect.top : rect.bottom,
        left: rect.left,
        width: rect.width,
        openUpward
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, true);
    }
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [isOpen]);

  const isSelected = (val: string) => {
    if (Array.isArray(localSelected)) {
      return localSelected.includes(val);
    }
    return localSelected === val;
  };

  const handleSelectOption = (val: string) => {
    if (componentProps.multiple) {
      let newSelection: string[];
      const currentList = Array.isArray(localSelected) ? localSelected : [];
      if (currentList.includes(val)) {
        newSelection = currentList.filter(v => v !== val);
      } else {
        newSelection = [...currentList, val];
      }
      setLocalSelected(newSelection);
      
      const defaultClose = false;
      const shouldClose = componentProps.closeOnSelect !== undefined ? componentProps.closeOnSelect : defaultClose;
      if (shouldClose) {
        setIsOpen(false);
      }
      if (events?.onChange) {
        ExtensionRegistry.triggerUIEvent(pluginId, events.onChange, newSelection);
      }
    } else {
      setLocalSelected(val);
      const defaultClose = true;
      const shouldClose = componentProps.closeOnSelect !== undefined ? componentProps.closeOnSelect : defaultClose;
      if (shouldClose) {
        setIsOpen(false);
      }
      if (events?.onChange) {
        ExtensionRegistry.triggerUIEvent(pluginId, events.onChange, val);
      }
    }
  };

  const isResetActive = () => {
    if (componentProps.multiple) {
      const currentList = Array.isArray(localSelected) ? localSelected : [];
      return currentList.length > 0;
    } else {
      return localSelected !== (componentProps.resetValue || "");
    }
  };

  const handleReset = () => {
    let rVal: any = "";
    if (componentProps.multiple) {
      if (Array.isArray(componentProps.resetValue)) {
        rVal = componentProps.resetValue;
      } else if (typeof componentProps.resetValue === "string") {
        try {
          const parsed = JSON.parse(componentProps.resetValue);
          if (Array.isArray(parsed)) rVal = parsed;
          else rVal = componentProps.resetValue ? [componentProps.resetValue] : [];
        } catch {
          rVal = componentProps.resetValue ? componentProps.resetValue.split(",").map(s => s.trim()).filter(Boolean) : [];
        }
      } else {
        rVal = [];
      }
    } else {
      rVal = componentProps.resetValue || "";
    }
    setLocalSelected(rVal);
    setIsOpen(false);
    if (events?.onChange) {
      ExtensionRegistry.triggerUIEvent(pluginId, events.onChange, rVal);
    }
  };

  const getTriggerLabel = () => {
    if (componentProps.multiple) {
      const currentList = Array.isArray(localSelected) ? localSelected : [];
      const selectedOptions = componentProps.options?.filter((opt) => opt.value && currentList.includes(opt.value)) || [];
      if (selectedOptions.length > 0) {
        if (selectedOptions.length > 2) {
          return `Выбрано: ${selectedOptions.length}`;
        }
        return selectedOptions.map(o => o.label).join(", ");
      }
      return componentProps.label || "Выбрать...";
    } else {
      const selectedOption = componentProps.options?.find((opt) => opt.value === localSelected) 
        || componentProps.options?.[0];
      return selectedOption ? selectedOption.label || "" : "Выбрать...";
    }
  };

  const getThemeColorPreview = (value: string) => {
    const themeColors: Record<string, { bg: string; accent: string }> = {
      nordicFrost: { bg: "#0f1218", accent: "#add8e6" },
      amberGold: { bg: "#120e0a", accent: "#e5a00d" },
      sageMuted: { bg: "#0f110f", accent: "#b4c8b4" },
      graphite: { bg: "#0f0f10", accent: "#ffffff" },
      system: { bg: "#0f0f12", accent: "#007aff" },
      lightClassic: { bg: "#f4f4f6", accent: "#007aff" },
      pastelPeach: { bg: "#fdf5ef", accent: "#ee7755" },
      softMint: { bg: "#f4faf7", accent: "#2dbd82" },
    };

    const colors = themeColors[value];
    if (!colors) return null;

    return (
      <span 
        style={{
          display: "inline-block",
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${colors.accent} 50%, ${colors.bg} 50%)`,
          border: "1px solid var(--text-tertiary)",
          marginRight: "8px",
          flexShrink: 0
        }}
      />
    );
  };

  const firstOptionIndex = componentProps.options?.findIndex(
    (o) => o.type !== "header" && o.type !== "divider"
  ) ?? -1;
  const firstItemKey = firstOptionIndex >= 0 ? `SAFE_SELECT_ITEM_${firstOptionIndex}` : undefined;

  const isGlass = componentProps.variant === "glass";
  const IconComponent = componentProps.icon ? (Lucide as any)[componentProps.icon] : null;

  const isPopoverAlignRight = isGlass && (coords.left + 200 > window.innerWidth);

  return (
    <div key={id} className="potok-input-group filter-popover-wrapper" style={{ ...baseStyle, position: "relative" }}>
      {!isGlass && componentProps.label && <label className="potok-label" style={{ marginBottom: "6px" }}>{componentProps.label}</label>}
      <FocusableButton
        ref={triggerRef}
        type="button"
        className={isGlass ? "btn-glass filter-btn-trigger-relative" : "potok-select"}
        style={isGlass ? {
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 16px",
          borderRadius: "10px",
          cursor: "pointer",
        } : { 
          width: "100%", 
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between", 
        }}
        disabled={componentProps.disabled}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {IconComponent && <IconComponent size={14} />}
          {componentProps.multiple && Array.isArray(localSelected) && localSelected.length === 1 && getThemeColorPreview(localSelected[0])}
          {!componentProps.multiple && typeof localSelected === "string" && getThemeColorPreview(localSelected)}
          <span className={isGlass ? "filter-btn-text" : ""}>
            {getTriggerLabel()}
          </span>
        </span>
        <ChevronDown size={14} style={isGlass ? undefined : { opacity: 0.7 }} />
        {isGlass && isResetActive() && (
          <span className="filter-badge-dot" />
        )}
      </FocusableButton>
 
      <Overlay
        open={isOpen}
        onClose={() => setIsOpen(false)}
        focusKey="SAFE_SELECT_POPOVER"
        initialFocusKey={firstItemKey}
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
          minWidth: isGlass ? "200px" : undefined,
          zIndex: 999999,
          marginTop: coords.openUpward ? "-6px" : "6px",
          transform: coords.openUpward ? "translateY(-100%)" : "none",
          maxHeight: "280px",
          overflowY: "auto",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          animation: "fadeIn 0.15s ease-out"
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
                return (
                  <div key={`divider-${index}`} className="filter-popover-divider" />
                );
              }
              const active = isSelected(opt.value || "");
              return (
                <FocusableButton
                  key={opt.value || `item-${index}`}
                  focusKey={`SAFE_SELECT_ITEM_${index}`}
                  className={`popover-item ${active ? "active" : ""}`}
                  onClick={() => handleSelectOption(opt.value || "")}
                  style={{ width: "100%", background: "none", border: "none", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <span style={{ display: "flex", alignItems: "center" }}>
                    {opt.value && getThemeColorPreview(opt.value)}
                    <span>{opt.label}</span>
                  </span>
                  {active && <Check size={14} className="filter-popover-check" />}
                </FocusableButton>
              );
            })}
        {componentProps.resetLabel && isResetActive() && (
          <>
            <div className="filter-popover-divider" />
            <FocusableButton
              className="popover-reset-btn"
              onClick={handleReset}
              style={{ width: "100%" }}
            >
              {componentProps.resetLabel}
            </FocusableButton>
          </>
        )}
      </Overlay>
    </div>
  );
};
export default SafeSelect;
