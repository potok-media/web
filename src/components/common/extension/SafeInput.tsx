import React, { useEffect, useState } from "react";
import type { UIComponentSchema } from "../../../network/SDKTypes";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";

interface SafeInputProps {
  schema: UIComponentSchema;
  pluginId: string;
  baseStyle: React.CSSProperties;
}

export const SafeInput: React.FC<SafeInputProps> = ({ schema, pluginId, baseStyle }) => {
  const { id, props: componentProps, events } = schema;
  const [localValue, setLocalValue] = useState(componentProps.value || "");

  useEffect(() => {
    setLocalValue(componentProps.value || "");
  }, [componentProps.value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val); // Update local state synchronously for smooth 120fps typing
    if (events?.onChange) {
      ExtensionRegistry.triggerUIEvent(pluginId, events.onChange, val);
    }
  };

  return (
    <div key={id} className="potok-input-group" style={baseStyle}>
      {componentProps.label && <label className="potok-label">{componentProps.label}</label>}
      <input
        className="potok-input"
        type={componentProps.inputType || "text"}
        placeholder={componentProps.placeholder}
        value={localValue}
        disabled={componentProps.disabled}
        onChange={handleInputChange}
      />
    </div>
  );
};
export default SafeInput;
