import React, { useState, useRef, useCallback } from "react";
import "../../src/styles/hud.css";
import { HUDContext, type HUDType } from "./hudContextState";

export const HUDProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hud, setHud] = useState<{ type: HUDType; message: string } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((type: HUDType, message: string, durationMs = 3000) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setHud({ type, message });
    timeoutRef.current = setTimeout(() => {
      setHud(null);
    }, durationMs);
  }, []);

  return (
    <HUDContext.Provider value={{ show }}>
      {children}
      <HUDView hud={hud} />
    </HUDContext.Provider>
  );
};

const HUDView: React.FC<{ hud: { type: HUDType; message: string } | null }> = ({ hud }) => {
  if (!hud) return null;

  const iconMap: Record<HUDType, string> = {
    success: "✓",
    error: "✕",
    info: "ℹ",
    warning: "⚠",
  };

  return (
    <div className={`hud-container ${hud.type}`}>
      <span className="hud-icon">{iconMap[hud.type]}</span>
      <span className="hud-message">{hud.message}</span>
    </div>
  );
};