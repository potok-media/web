import { useContext } from "react";
import { HUDContext } from "./hudContextState";

export function useHUD() {
  const context = useContext(HUDContext);
  if (!context) throw new Error("useHUD must be used within HUDProvider");
  return context;
}