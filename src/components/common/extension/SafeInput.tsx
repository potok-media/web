import React, { useEffect, useState } from "react";
import type { InputSchema } from "@potok/sdk-types";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";
import { Field, Input } from "../../ui";
import { sdkClass, sdkStyleVars } from "./componentRendererUtils";

interface SafeInputProps {
  schema: InputSchema;
  pluginId: string;
  baseStyle: React.CSSProperties;
}

export const SafeInput: React.FC<SafeInputProps> = ({ schema, pluginId, baseStyle }) => {
  const { id, props: componentProps, events } = schema;
  const [localValue, setLocalValue] = useState(componentProps.value || "");

  useEffect(() => {
    setLocalValue(componentProps.value || "");
  }, [componentProps.value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    if (events?.onChange) {
      ExtensionRegistry.triggerUIEvent(pluginId, events.onChange, val);
    }
  };

  const isTextArea = componentProps.inputType === "textarea";

  return (
    <div key={id} className={sdkClass(schema, "potok-input-group")} style={sdkStyleVars(baseStyle)}>
      <Field label={componentProps.label || undefined} htmlFor={`input-${id}`}>
        <Input
          id={`input-${id}`}
          multiline={isTextArea}
          placeholder={componentProps.placeholder}
          value={localValue}
          disabled={componentProps.disabled}
          type={isTextArea ? undefined : (componentProps.inputType || "text")}
          onChange={handleInputChange}
        />
      </Field>
    </div>
  );
};
export default SafeInput;