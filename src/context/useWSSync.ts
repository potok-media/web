import { useContext } from "react";
import { WSSyncContext } from "./wsSyncContextState";

export function useWSSync() {
  const context = useContext(WSSyncContext);
  if (!context) {
    throw new Error("useWSSync must be used within a WSSyncProvider");
  }
  return context;
}