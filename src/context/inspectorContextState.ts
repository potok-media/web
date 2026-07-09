import { createContext } from "react";

export interface InspectorContextType {
  isInspectorActive: boolean;
  setIsInspectorActive: (active: boolean) => void;
  selectedSlot: string | null;
  setSelectedSlot: (slot: string | null) => void;
}

export const InspectorContext = createContext<InspectorContextType | undefined>(undefined);

export const inspectorNoop: InspectorContextType = {
  isInspectorActive: false,
  setIsInspectorActive: () => {},
  selectedSlot: null,
  setSelectedSlot: () => {},
};