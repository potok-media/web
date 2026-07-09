import { useContext } from "react";
import { InspectorContext, inspectorNoop } from "./inspectorContextState";

export function useInspector() {
  const context = useContext(InspectorContext);
  const isDesktop = typeof window !== "undefined" && window.innerWidth > 768;
  if (!isDesktop) {
    return inspectorNoop;
  }
  if (!context) {
    throw new Error("useInspector must be used within an InspectorProvider");
  }
  return context;
}