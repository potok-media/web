import React, { createContext, useContext, useState, useRef } from "react";
import "../../src/styles/hud.css";

export type HUDType = "success" | "error" | "info" | "warning";

interface HUDContextType {
  show: (type: HUDType, message: string, durationMs?: number) => void;
}

const HUDContext = createContext<HUDContextType | undefined>(undefined);

export const HUDProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hud, setHud] = useState<{ type: HUDType; message: string } | null>(null);
  const timeoutRef = useRef<any>(null);

  const show = React.useCallback((type: HUDType, message: string, durationMs = 3000) => {
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

export const useHUD = () => {
  const context = useContext(HUDContext);
  if (!context) throw new Error("useHUD must be used within HUDProvider");
  return context;
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
