import React, { useState } from "react";
import { X } from "lucide-react";
import { useInspector } from "../../../context/useInspector";
import { useInspectorMonaco } from "../../../hooks/useInspectorMonaco";
import { Button, IconButton, Select } from "../../ui";
import {
  INSPECTOR_TEMPLATE_CODE,
  INSPECTOR_TEMPLATE_OPTIONS,
  isInspectorTemplateId,
} from "./inspectorTemplates";
import { runInspectorInjection } from "./inspectorInjection";
import "../../../styles/inspector.css";

export const DeveloperInspector: React.FC = () => {
  const { selectedSlot, setSelectedSlot } = useInspector();
  const [inspectorError, setInspectorError] = useState<string | null>(null);
  const { monacoLoaded, containerRef, setEditorCode, getEditorCode } = useInspectorMonaco(selectedSlot);

  if (!selectedSlot) return null;

  const applyTemplate = (templateId: string) => {
    if (templateId === "recommended") {
      const original = selectedSlot;
      setSelectedSlot(null);
      setTimeout(() => setSelectedSlot(original), 10);
      return;
    }
    if (!isInspectorTemplateId(templateId)) return;
    setEditorCode(INSPECTOR_TEMPLATE_CODE[templateId]);
  };

  const handleInject = () => {
    setInspectorError(null);
    const result = runInspectorInjection(getEditorCode(), selectedSlot);
    if (result.ok) {
      setSelectedSlot(null);
    } else {
      setInspectorError(result.error);
    }
  };

  return (
    <div className="inspector-drawer">
      <div className="inspector-drawer__header">
        <div>
          <h3 className="inspector-drawer__title">Инспектор слота</h3>
          <code className="inspector-drawer__slot">{selectedSlot}</code>
        </div>
        <IconButton
          onClick={() => setSelectedSlot(null)}
          className="inspector-drawer-close"
          aria-label="Close inspector"
        >
          <X size="1.25rem" />
        </IconButton>
      </div>

      <div className="inspector-drawer__body">
        <div>
          <label className="inspector-drawer__label">Готовые шаблоны кода:</label>
          <Select
            value=""
            className="inspector-template-select"
            onChange={applyTemplate}
            options={[...INSPECTOR_TEMPLATE_OPTIONS]}
            block
          />
        </div>

        <div className="inspector-editor-section">
          <label className="inspector-drawer__label">Код виджета (JavaScript):</label>
          <div className="inspector-editor-wrap">
            {!monacoLoaded && (
              <div className="inspector-editor-loading">
                <div className="inspector-editor-loading__stack">
                  <div className="inspector-editor-spinner" />
                  <span>Loading Code Editor...</span>
                </div>
              </div>
            )}
            <div ref={containerRef} className="inspector-editor-mount" />
          </div>
        </div>

        {inspectorError && <div className="inspector-error-banner">{inspectorError}</div>}

        <Button variant="primary" fullWidth className="inspector-inject-btn" onClick={handleInject}>
          Внедрить в макет
        </Button>
      </div>
    </div>
  );
};

export default DeveloperInspector;