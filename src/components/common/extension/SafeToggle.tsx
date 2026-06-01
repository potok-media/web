import React, { useEffect, useState } from "react";
import type { UIComponentSchema } from "../../../network/SDKTypes";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";

interface SafeToggleProps {
  schema: UIComponentSchema;
  pluginId: string;
  baseStyle: React.CSSProperties;
}

export const SafeToggle: React.FC<SafeToggleProps> = ({ schema, pluginId, baseStyle }) => {
  const { id, props: componentProps, events } = schema;
  const [localChecked, setLocalChecked] = useState(!!componentProps.checked);

  useEffect(() => {
    setLocalChecked(!!componentProps.checked);
  }, [componentProps.checked]);

  const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setLocalChecked(checked);
    if (events?.onChange) {
      ExtensionRegistry.triggerUIEvent(pluginId, events.onChange, checked);
    }
  };

  return (
    <label key={id} className="potok-toggle-group" style={baseStyle}>
      <div className="potok-toggle-label-wrap">
        <span className="potok-label">{componentProps.label}</span>
        {componentProps.description && <span className="potok-toggle-desc">{componentProps.description}</span>}
      </div>
      <div className="potok-switch">
        <input
          type="checkbox"
          checked={localChecked}
          disabled={componentProps.disabled}
          onChange={handleToggleChange}
        />
        <span className="potok-slider" />
      </div>
    </label>
  );
};
export default SafeToggle;
