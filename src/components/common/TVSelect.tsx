import React from "react";
import { FocusableButton } from "./TVNavigation";
import "../../styles/tv-select.css";

export interface TVSelectOption<T> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface TVSelectProps<T> {
  value: T;
  options: TVSelectOption<T>[];
  onChange: (value: T) => void;
  /** Unique prefix for child focus keys, e.g. "SETTINGS_FONTSCALE_". */
  focusKeyPrefix: string;
  /** chips = horizontal pills (few options); list = vertical rows (many options). */
  variant?: "chips" | "list";
  label?: string;
  className?: string;
}

/**
 * D-pad-friendly replacement for a native <select>: each option is a FocusableButton,
 * reachable by remote and using the shared `.focused` ring. Use ONLY inside
 * isTV/isMobile branches — the desktop <select> stays untouched.
 */
export function TVSelect<T extends string | number>({
  value,
  options,
  onChange,
  focusKeyPrefix,
  variant = "chips",
  label,
  className = "",
}: TVSelectProps<T>) {
  return (
    <div className={`tv-select tv-select--${variant} ${className}`.trim()} aria-label={label}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <FocusableButton
            key={String(opt.value)}
            focusKey={`${focusKeyPrefix}${opt.value}`}
            className={`tv-select-option ${active ? "active" : ""}`.trim()}
            onClick={() => onChange(opt.value)}
          >
            {opt.icon && <span className="tv-select-option-icon">{opt.icon}</span>}
            <span className="tv-select-option-label">{opt.label}</span>
          </FocusableButton>
        );
      })}
    </div>
  );
}

export default TVSelect;
