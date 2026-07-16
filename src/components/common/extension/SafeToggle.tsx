import React, { useEffect, useState } from "react";
import type { ToggleSchema } from "@potok/sdk-types";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";
import { Switch } from "../../ui";
import { sdkClass, sdkStyleVars } from "./componentRendererUtils";

interface SafeToggleProps {
  schema: ToggleSchema;
  pluginId: string;
  baseStyle: React.CSSProperties;
}

export const SafeToggle: React.FC<SafeToggleProps> = ({ schema, pluginId, baseStyle }) => {
  const { id, props: componentProps, events } = schema;
  const [localChecked, setLocalChecked] = useState(!!componentProps.checked);

  useEffect(() => {
    setLocalChecked(!!componentProps.checked);
  }, [componentProps.checked]);

  const handleToggleChange = () => {
    if (componentProps.disabled) return;
    const checked = !localChecked;
    setLocalChecked(checked);
    if (events?.onChange) {
      ExtensionRegistry.triggerUIEvent(pluginId, events.onChange, checked);
    }
  };

  return (
    <div
      key={id}
      className={sdkClass(schema, "potok-toggle-group")}
      style={sdkStyleVars(baseStyle)}
      onClick={handleToggleChange}
      role="button"
      tabIndex={componentProps.disabled ? undefined : 0}
      onKeyDown={(e) => {
        if (componentProps.disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleToggleChange();
        }
      }}
    >
      <div className="potok-toggle-label-wrap">
        <span className="potok-label">{componentProps.label}</span>
        {componentProps.description && <span className="potok-toggle-desc">{componentProps.description}</span>}
      </div>
      <Switch
        checked={localChecked}
        disabled={componentProps.disabled}
        readOnly
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};
export default SafeToggle;