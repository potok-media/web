import { useCallback, useEffect, useState } from "react";
import { getInspectorSlotTemplate } from "../components/common/extension/inspectorSlotTemplates";
import { useMonacoEditor } from "./useMonacoEditor";

export function useInspectorMonaco(selectedSlot: string | null) {
  const [code, setCode] = useState("// Выберите шаблон...");
  const initialCode = selectedSlot ? getInspectorSlotTemplate(selectedSlot) : code;

  useEffect(() => {
    if (selectedSlot) {
      setCode(getInspectorSlotTemplate(selectedSlot));
    }
  }, [selectedSlot]);

  const { loaded, containerRef, getValue, setValue } = useMonacoEditor({
    enabled: !!selectedSlot,
    modelPath: selectedSlot ? `file:///src/inspector-${selectedSlot}.js` : undefined,
    value: initialCode,
    onChange: setCode,
    configureSdk: true,
    noSemanticValidation: true,
  });

  const setEditorCode = useCallback(
    (next: string) => {
      setCode(next);
      setValue(next);
    },
    [setValue],
  );

  const getEditorCode = useCallback(() => getValue(), [getValue]);

  return {
    code,
    monacoLoaded: loaded,
    containerRef,
    setEditorCode,
    getEditorCode,
  };
}