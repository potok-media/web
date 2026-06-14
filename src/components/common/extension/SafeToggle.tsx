import React, { useEffect, useState } from "react";
import type { ToggleSchema } from "@potok/sdk-types";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";
import { Focusable } from "../TVNavigation";

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
    <Focusable
      disabled={componentProps.disabled}
      onEnterPress={handleToggleChange}
    >
      {({ ref, focused }) => (
        <label
          ref={ref}
          key={id}
          className={`potok-toggle-group ${focused ? "focused" : ""}`}
          style={baseStyle}
          onClick={handleToggleChange}
        >
          <div className="potok-toggle-label-wrap">
            <span className="potok-label">{componentProps.label}</span>
            {componentProps.description && <span className="potok-toggle-desc">{componentProps.description}</span>}
          </div>
          <div className="potok-switch">
            <input
              type="checkbox"
              checked={localChecked}
              disabled={componentProps.disabled}
              readOnly
            />
            <span className="potok-slider" />
          </div>
        </label>
      )}
    </Focusable>
  );
};
export default SafeToggle;
