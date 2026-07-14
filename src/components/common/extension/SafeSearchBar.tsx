import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import type { SearchBarSchema } from "@potok/sdk-types";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";
import { sdkStyleVars } from "./componentRendererUtils";
import { Input, IconButton } from "../../ui";

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
    <div
      key={id}
      className="extensions-search-bar extensions-search-bar--sdk potok-sdk-props"
      style={sdkStyleVars(baseStyle)}
    >
      <Search size="1rem" className="search-icon" aria-hidden />
      <Input
        type="text"
        className="search-input"
        placeholder={(componentProps.placeholder as string) || t("safe.searchPlaceholder")}
        value={localVal}
        onChange={handleChange}
        disabled={componentProps.disabled}
      />
      {localVal ? (
        <IconButton
          size="sm"
          onClick={handleClear}
          disabled={componentProps.disabled}
          className="search-clear-btn"
          title={t("safe.clear")}
          aria-label={t("safe.clear")}
        >
          <X size="0.875rem" aria-hidden />
        </IconButton>
      ) : null}
    </div>
  );
};
export default SafeSearchBar;