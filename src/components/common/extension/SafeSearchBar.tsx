import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import type { SearchBarSchema } from "@potok/sdk-types";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";
import { FocusableButton, FocusableInput } from "../TVNavigation";

interface SafeSearchBarProps {
  schema: SearchBarSchema;
  pluginId: string;
  baseStyle: React.CSSProperties;
}

export const SafeSearchBar: React.FC<SafeSearchBarProps> = ({ schema, pluginId, baseStyle }) => {
  const { t } = useTranslation("extensions");
  const { id, props: componentProps, events } = schema;
  const [localVal, setLocalVal] = useState((componentProps.value as string) || "");

  useEffect(() => {
    setLocalVal((componentProps.value as string) || "");
  }, [componentProps.value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalVal(val);
    if (events?.onChange) {
      ExtensionRegistry.triggerUIEvent(pluginId, events.onChange, val);
    }
  };

  const handleClear = () => {
    setLocalVal("");
    if (events?.onClear) {
      ExtensionRegistry.triggerUIEvent(pluginId, events.onClear, {});
    }
  };

  return (
    <div key={id} className="sidebar-search-form" style={{ ...baseStyle, width: "100%", margin: 0 }}>
      <div className="sidebar-search-wrap" style={{ margin: 0 }}>
        <Search size="1rem" className="sidebar-search-icon" />
        <FocusableInput
          type="text"
          placeholder={(componentProps.placeholder as string) || t("safe.searchPlaceholder")}
          value={localVal}
          onChange={handleChange}
          disabled={componentProps.disabled}
          className="sidebar-search-input"
        />
        {localVal && (
          <FocusableButton 
            type="button" 
            onClick={handleClear} 
            disabled={componentProps.disabled}
            className="sidebar-search-clear"
            title={t("safe.clear")}
          >
            <X size="0.875rem" />
          </FocusableButton>
        )}
      </div>
    </div>
  );
};
export default SafeSearchBar;
