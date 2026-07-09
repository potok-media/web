import { createContext } from "react";

export type HUDType = "success" | "error" | "info" | "warning";

export interface HUDContextType {
  show: (type: HUDType, message: string, durationMs?: number) => void;
}

export const HUDContext = createContext<HUDContextType | undefined>(undefined);