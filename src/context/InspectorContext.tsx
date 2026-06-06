import React, { createContext, useContext, useState, useEffect } from "react";
import { useSettings } from "./AppSettingsContext";

interface InspectorContextType {
  isInspectorActive: boolean;
  setIsInspectorActive: (active: boolean) => void;
  selectedSlot: string | null;
  setSelectedSlot: (slot: string | null) => void;
}

const InspectorContext = createContext<InspectorContextType | undefined>(undefined);

export const InspectorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { developerMode } = useSettings();
  const [isInspectorActive, setIsInspectorActive] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Force inspector off if developer mode is disabled
  useEffect(() => {
    if (!developerMode) {
      setIsInspectorActive(false);
      setSelectedSlot(null);
    }
  }, [developerMode]);

  return (
    <InspectorContext.Provider
      value={{
        isInspectorActive,
        setIsInspectorActive,
        selectedSlot,
        setSelectedSlot,
      }}
    >
      {children}
    </InspectorContext.Provider>
  );
};

export const useInspector = () => {
  const context = useContext(InspectorContext);
  if (!context) {
    throw new Error("useInspector must be used within an InspectorProvider");
  }
  return context;
};
