import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import type { SelectSchema } from "@potok/sdk-types";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";

interface SafeSelectProps {
  schema: SelectSchema;
  pluginId: string;
  baseStyle: React.CSSProperties;
}

export const SafeSelect: React.FC<SafeSelectProps> = ({ schema, pluginId, baseStyle }) => {
  const { id, props: componentProps, events } = schema;
  const [localSelected, setLocalSelected] = useState(componentProps.selected || "");
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openUpward?: boolean;
  }>({ top: 0, left: 0, width: 0, openUpward: false });

  useEffect(() => {
    setLocalSelected(componentProps.selected || "");
  }, [componentProps.selected]);

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
      // Пересчитываем координаты при изменении размеров экрана или при скролле
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, true);
    }
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [isOpen]);

  const handleSelectOption = (val: string) => {
    setLocalSelected(val);
    setIsOpen(false);
    if (events?.onChange) {
      ExtensionRegistry.triggerUIEvent(pluginId, events.onChange, val);
    }
  };

  const selectedOption = componentProps.options?.find((opt) => opt.value === localSelected) 
    || componentProps.options?.[0];

  return (
    <div key={id} className="potok-input-group filter-popover-wrapper" style={{ ...baseStyle, position: "relative" }}>
      {componentProps.label && <label className="potok-label" style={{ marginBottom: "6px" }}>{componentProps.label}</label>}
      <button
        ref={triggerRef}
        type="button"
        className="btn-glass filter-btn-trigger"
        style={{ 
          width: "100%", 
          justifyContent: "space-between", 
          padding: "10px 18px", 
          borderRadius: "12px",
          font: "inherit",
          fontSize: "0.9rem",
          fontWeight: 600,
          border: "var(--glass-border)",
          background: "var(--bg-surface-high)"
        }}
        disabled={componentProps.disabled}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption ? selectedOption.label : "Выбрать..."}</span>
        <ChevronDown size={14} style={{ opacity: 0.7 }} />
      </button>

      {isOpen && createPortal(
        <>
          <div 
            className="filter-popover-overlay" 
            style={{ position: "fixed", inset: 0, zIndex: 999998 }} 
            onClick={() => setIsOpen(false)} 
          />
          <div 
            className="filter-popover" 
            style={{ 
              position: "fixed", 
              top: `${coords.top}px`, 
              left: `${coords.left}px`, 
              width: `${coords.width}px`,
              zIndex: 999999, 
              marginTop: coords.openUpward ? "-6px" : "6px",
              transform: coords.openUpward ? "translateY(-100%)" : "none",
              maxHeight: "280px",
              overflowY: "auto",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              animation: "fadeIn 0.15s ease-out"
            }}
          >
            {componentProps.options?.map((opt) => (
              <div
                key={opt.value}
                className={`popover-item ${localSelected === opt.value ? "active" : ""}`}
                style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  padding: "10px 16px", 
                  cursor: "pointer",
                  fontSize: "0.8125rem",
                  color: localSelected === opt.value ? "var(--text-primary)" : "var(--text-secondary)"
                }}
                onClick={() => handleSelectOption(opt.value)}
              >
                <span>{opt.label}</span>
                {localSelected === opt.value && <Check size={14} className="filter-popover-check" />}
              </div>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
export default SafeSelect;
