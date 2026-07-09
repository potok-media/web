import React from "react";
import { getThemeColorStyle } from "./safeSelectUtils";

export const SafeSelectThemePreview: React.FC<{ value: string }> = ({ value }) => {
  const colors = getThemeColorStyle(value);
  if (!colors) return null;

  return (
    <span
      className="safe-select-theme-dot"
      style={{
        "--theme-accent": colors.accent,
        "--theme-bg": colors.bg,
      } as React.CSSProperties}
    />
  );
};

export default SafeSelectThemePreview;