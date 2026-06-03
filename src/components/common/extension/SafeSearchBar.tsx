import React, { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import type { SearchBarSchema } from "@potok/sdk-types";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";

interface SafeSearchBarProps {
  schema: SearchBarSchema;
  pluginId: string;
  baseStyle: React.CSSProperties;
}

export const SafeSearchBar: React.FC<SafeSearchBarProps> = ({ schema, pluginId, baseStyle }) => {
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
        <Search size={16} className="sidebar-search-icon" />
        <input
          type="text"
          placeholder={componentProps.placeholder || "Поиск..."}
          value={localVal}
          onChange={handleChange}
          disabled={componentProps.disabled}
          className="sidebar-search-input"
        />
        {localVal && (
          <button 
            type="button" 
            onClick={handleClear} 
            disabled={componentProps.disabled}
            className="sidebar-search-clear"
            title="Очистить"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
export default SafeSearchBar;
