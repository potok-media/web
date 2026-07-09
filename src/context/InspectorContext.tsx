import React, { useState, useEffect } from "react";
import { useSettings } from "./AppSettingsContext";
import { InspectorContext } from "./inspectorContextState";

export const InspectorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { developerMode } = useSettings();
  const [isInspectorActive, setIsInspectorActive] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

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