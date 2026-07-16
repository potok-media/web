import React from "react";
import type { CodeEditorSchema } from "@potok/sdk-types";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";
import { useMonacoEditor } from "../../../hooks/useMonacoEditor";
import { sdkClass, sdkStyleVars } from "./componentRendererUtils";

interface SafeCodeEditorProps {
  schema: CodeEditorSchema;
  pluginId: string;
  baseStyle: React.CSSProperties;
}

export const SafeCodeEditor: React.FC<SafeCodeEditorProps> = ({ schema, pluginId, baseStyle }) => {
  const { id, props: componentProps, events } = schema;

  const editorValue = componentProps.value ?? "";

  const { loaded, error, containerRef } = useMonacoEditor({
    enabled: true,
    modelPath: `file:///src/sandbox-${pluginId}-${id}.js`,
    value: editorValue,
    configureSdk: true,
    noSemanticValidation: true,
    debounceMs: 200,
    onChange: (val) => {
      if (events?.onChange) {
        ExtensionRegistry.triggerUIEvent(pluginId, events.onChange, val);
      }
    },
    editorOptions: {
      lineNumbers: "on",
      scrollbar: { vertical: "visible", horizontal: "visible" },
    },
  });

  return (
    <div
      key={id}
      className={sdkClass(schema, "potok-input-group", "potok-input-group--full")}
      style={sdkStyleVars(baseStyle)}
    >
      {componentProps.label && <label className="potok-label">{componentProps.label}</label>}
      <div className="safe-code-editor-shell" style={sdkStyleVars({ height: baseStyle.height || "12.5rem" })}>
        {!loaded && !error && (
          <div className="safe-code-editor-loading">
            <div className="safe-code-editor-loading-inner">
              <div className="safe-code-editor-spinner" />
              <span>Loading Code Editor...</span>
            </div>
          </div>
        )}
        {error && (
          <div className="safe-code-editor-error">
            {error}
          </div>
        )}
        <div ref={containerRef} className="safe-code-editor-mount" />
      </div>
    </div>
  );
};

export default SafeCodeEditor;