import React, { useEffect, useRef, useState } from "react";
import type { CodeEditorSchema } from "@potok/sdk-types";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";
import { SDK_TYPINGS } from "../../../sdk/src/sdkTypings";

interface SafeCodeEditorProps {
  schema: CodeEditorSchema;
  pluginId: string;
  baseStyle: React.CSSProperties;
}

export const SafeCodeEditor: React.FC<SafeCodeEditorProps> = ({ schema, pluginId, baseStyle }) => {
  const { id, props: componentProps, events } = schema;
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load Monaco Editor dynamically from CDN
  useEffect(() => {
    if ((window as any).monaco) {
      setIsLoaded(true);
      return;
    }

    // Check if the loader script is already injected
    let loaderScript = document.querySelector('script[src*="monaco-editor/0.45.0/min/vs/loader.js"]') as HTMLScriptElement;
    
    const handleMonacoLoad = () => {
      const require = (window as any).require;
      if (require) {
        require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs" } });
        require(["vs/editor/editor.main"], () => {
          setIsLoaded(true);
        }, (err: any) => {
          setLoadError("Failed to initialize Monaco Editor modules.");
          console.error("[Monaco Load Error]", err);
        });
      } else {
        setLoadError("Loader script loaded but 'require' is not available.");
      }
    };

    if (loaderScript) {
      if ((window as any).require && (window as any).require.config) {
        handleMonacoLoad();
      } else {
        loaderScript.addEventListener("load", handleMonacoLoad);
      }
    } else {
      loaderScript = document.createElement("script");
      loaderScript.src = "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.js";
      loaderScript.async = true;
      loaderScript.onload = handleMonacoLoad;
      loaderScript.onerror = () => {
        setLoadError("Failed to download Monaco Editor loader script.");
      };
      document.head.appendChild(loaderScript);
    }
  }, []);

  // Configure autocompletion typings
  useEffect(() => {
    if (!isLoaded || !(window as any).monaco) return;

    const monaco = (window as any).monaco;

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowJs: true,
      checkJs: true, // Crucial for JS files type checking and autocomplete!
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      typeRoots: ["file:///node_modules/@types"]
    });

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      typeRoots: ["file:///node_modules/@types"]
    });

    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true, // Crucial to prevent worker crashes on JS!
      noSyntaxValidation: false,
    });

    if (!(window as any)._monacoHostSdkLibAdded) {
      try {
        monaco.languages.typescript.javascriptDefaults.addExtraLib(SDK_TYPINGS, "file:///node_modules/@types/potok-sdk/index.d.ts");
        monaco.languages.typescript.typescriptDefaults.addExtraLib(SDK_TYPINGS, "file:///node_modules/@types/potok-sdk/index.d.ts");
        (window as any)._monacoHostSdkLibAdded = true;
      } catch (err) {
        console.warn("Failed to add Potok typings library to Monaco:", err);
      }
    }
  }, [isLoaded]);

  // Create Editor instance
  useEffect(() => {
    if (!isLoaded || !containerRef.current || !(window as any).monaco) return;

    const monaco = (window as any).monaco;
    
    const modelUri = monaco.Uri.parse("file:///src/sandbox.js");
    let model = monaco.editor.getModel(modelUri);
    if (model) {
      model.setValue(componentProps.value || "");
    } else {
      model = monaco.editor.createModel(componentProps.value || "", "javascript", modelUri);
    }

    // Create editor passing the model explicitly
    const editor = monaco.editor.create(containerRef.current, {
      model: model,
      theme: "vs-dark",
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
      lineNumbers: "on",
      scrollbar: {
        vertical: "visible",
        horizontal: "visible",
      },
    });

    editorRef.current = editor;

    // Set change listener with a slight debounce
    let debounceTimer: any;
    const subscription = editor.onDidChangeModelContent(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const val = editor.getValue();
        if (events?.onChange) {
          ExtensionRegistry.triggerUIEvent(pluginId, events.onChange, val);
        }
      }, 200);
    });

    return () => {
      clearTimeout(debounceTimer);
      subscription.dispose();
      editor.dispose();
      // Note: Do not dispose the model immediately if it needs to persist, but clean up listeners or dispose if appropriate.
      const currentModel = monaco.editor.getModel(modelUri);
      if (currentModel) {
        currentModel.dispose();
      }
      editorRef.current = null;
    };
  }, [isLoaded, pluginId, events?.onChange]);

  // Sync external value updates
  useEffect(() => {
    if (editorRef.current && componentProps.value !== undefined) {
      if (editorRef.current.getValue() !== componentProps.value) {
        editorRef.current.setValue(componentProps.value);
      }
    }
  }, [componentProps.value]);

  return (
    <div key={id} className="potok-input-group" style={{ ...baseStyle, width: "100%", display: "flex", flexDirection: "column" }}>
      {componentProps.label && <label className="potok-label">{componentProps.label}</label>}
      <div 
        style={{ 
          position: "relative",
          flex: 1, 
          minHeight: baseStyle.height || "200px", 
          borderRadius: "8px", 
          overflow: "hidden", 
          border: "1px solid rgba(255, 255, 255, 0.12)",
          backgroundColor: "#1e1e1e"
        }}
      >
        {!isLoaded && !loadError && (
          <div 
            style={{ 
              position: "absolute", 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              color: "rgba(255, 255, 255, 0.6)",
              fontSize: "14px",
              fontFamily: "var(--font-family, sans-serif)",
              backgroundColor: "rgba(30, 30, 30, 0.8)",
              zIndex: 10
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <div 
                style={{
                  width: "24px",
                  height: "24px",
                  border: "2px solid rgba(255,255,255,0.1)",
                  borderTopColor: "var(--color-primary, #6366f1)",
                  borderRadius: "50%",
                  animation: "potok-spin 1s linear infinite"
                }}
              />
              <span>Loading Code Editor...</span>
            </div>
            <style>{`
              @keyframes potok-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}
        {loadError && (
          <div 
            style={{ 
              position: "absolute", 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              color: "#ef4444",
              fontSize: "14px",
              fontFamily: "var(--font-family, sans-serif)",
              padding: "16px",
              textAlign: "center",
              zIndex: 10
            }}
          >
            {loadError}
          </div>
        )}
        <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: baseStyle.height || "200px" }} />
      </div>
    </div>
  );
};

export default SafeCodeEditor;
