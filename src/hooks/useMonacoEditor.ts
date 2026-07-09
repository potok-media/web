import { useCallback, useEffect, useRef, useState } from "react";
import { configureMonacoSdk } from "../utils/monaco/configureMonacoSdk";
import { getMonaco, loadMonacoEditor } from "../utils/monaco/loadMonacoEditor";
import type { MonacoEditor, MonacoTheme } from "../utils/monaco/monacoTypes";
import { logger } from "../utils/logger";

export interface UseMonacoEditorConfig {
  enabled: boolean;
  theme?: MonacoTheme;
  language?: string;
  value?: string;
  modelPath?: string;
  editorOptions?: Record<string, unknown>;
  onChange?: (value: string) => void;
  debounceMs?: number;
  configureSdk?: boolean;
  includeTypeScriptDefaults?: boolean;
  noSemanticValidation?: boolean;
}

function resolveTheme(theme?: MonacoTheme): "vs" | "vs-dark" {
  if (theme === "light" || theme === "vs") return "vs";
  return "vs-dark";
}

export function useMonacoEditor(config: UseMonacoEditorConfig) {
  const {
    enabled,
    theme = "vs-dark",
    language = "javascript",
    value = "",
    modelPath,
    editorOptions = {},
    onChange,
    debounceMs = 0,
    configureSdk = true,
    includeTypeScriptDefaults = true,
    noSemanticValidation = true,
  } = config;

  const [loaded, setLoaded] = useState(() => !!getMonaco());
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MonacoEditor | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const resolvedTheme = resolveTheme(theme);

  useEffect(() => {
    if (!enabled) return;
    if (getMonaco()) {
      setLoaded(true);
      return;
    }
    loadMonacoEditor(
      () => setLoaded(true),
      (err) => {
        setError("Failed to load Monaco Editor.");
        logger.error("[Monaco] Load failed:", err);
      },
    );
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !loaded || !containerRef.current) return;

    const monaco = getMonaco();
    if (!monaco) return;

    if (configureSdk) {
      configureMonacoSdk(monaco, { includeTypeScriptDefaults, noSemanticValidation });
    }

    let disposeModel: (() => void) | undefined;
    const createOpts: Record<string, unknown> = {
      theme: resolvedTheme,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
      fontFamily: "Fira Code, Menlo, Monaco, monospace",
      lineHeight: 18,
      scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
      ...editorOptions,
    };

    if (modelPath) {
      const modelUri = monaco.Uri.parse(modelPath);
      let model = monaco.editor.getModel(modelUri);
      if (model) {
        model.setValue(value);
      } else {
        monaco.editor.createModel(value, language, modelUri);
        model = monaco.editor.getModel(modelUri);
      }
      if (model) {
        createOpts.model = model;
        disposeModel = () => monaco.editor.getModel(modelUri)?.dispose();
      }
    } else {
      createOpts.value = value;
      createOpts.language = language;
    }

    editorRef.current = monaco.editor.create(containerRef.current, createOpts);

    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const sub = editorRef.current.onDidChangeModelContent(() => {
      if (!onChangeRef.current || !editorRef.current) return;
      const next = editorRef.current.getValue();
      if (debounceMs > 0) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => onChangeRef.current?.(next), debounceMs);
      } else {
        onChangeRef.current(next);
      }
    });

    return () => {
      clearTimeout(debounceTimer);
      sub.dispose();
      editorRef.current?.dispose();
      editorRef.current = null;
      disposeModel?.();
    };
  }, [enabled, loaded, resolvedTheme, modelPath, language, configureSdk, includeTypeScriptDefaults, noSemanticValidation, debounceMs, editorOptions, value]);

  useEffect(() => {
    if (!editorRef.current || value === undefined) return;
    if (editorRef.current.getValue() !== value) {
      editorRef.current.setValue(value);
    }
  }, [value]);

  const getValue = useCallback(() => editorRef.current?.getValue() ?? value, [value]);
  const setValue = useCallback((next: string) => {
    editorRef.current?.setValue(next);
  }, []);

  return { loaded, error, containerRef, editorRef, getValue, setValue };
}