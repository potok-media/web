import { useEffect, useRef, useState } from "react";
import { SDK_TYPINGS } from "../sdk/src/sdkTypings";
import { createState } from "../sdk/src/core/state";
import { CallbackRegistry } from "../sdk/src/core/registry";
import { INITIAL_SANDBOX_CODE } from "../pages/wiki/wikiData";
import { getSandboxComponents } from "./sandboxComponents";
import { logger } from "../utils/logger";

export interface LogEntry {
  id: string;
  timestamp: string;
  type: string;
  message: string;
}

export function useMonacoSandbox(activePage: string, theme: "light" | "dark") {
  const [sandboxTab, setSandboxTab] = useState<"editor" | "result">("editor");
  const [editorLoaded, setEditorLoaded] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [compiledLayout, setCompiledLayout] = useState<any>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sandboxCode, setSandboxCode] = useState<string>(INITIAL_SANDBOX_CODE);

  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const mockStorageRef = useRef<Record<string, string>>({});
  const onSandboxEventRef = useRef<((callbackId: string, eventData: any) => void) | null>(null);

  useEffect(() => {
    (window as any).PotokSandboxTriggerUIEvent = (callbackId: string, eventData: any) => {
      if (onSandboxEventRef.current) {
        onSandboxEventRef.current(callbackId, eventData);
      }
    };
    return () => {
      delete (window as any).PotokSandboxTriggerUIEvent;
    };
  }, []);

  const addLog = (type: string, message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [
      { id: Math.random().toString(36).substring(7), timestamp: time, type, message },
      ...prev.slice(0, 49)
    ]);
  };

  const runSandboxCode = (code: string) => {
    try {
      CallbackRegistry.startRenderScope("sandbox-root");
      CallbackRegistry.commitRenderScope("sandbox-root");

      onSandboxEventRef.current = (callbackId: string, eventData: any) => {
        addLog("EVENT", `UI Event -> callbackId: ${callbackId} (payload: ${JSON.stringify(eventData)})`);
        try {
          CallbackRegistry.trigger(callbackId, eventData);
        } catch (err: any) {
          addLog("RUNTIME_ERROR", `Callback failed: ${err.message}`);
        }
      };

      const mockPotokSDK = {
        pluginId: "potok-sandbox-plugin",
        permissions: ["http", "storage"],
        config: { theme },
        createState,
        ui: {
          render: (layout: any) => {
            const payload = layout && typeof layout.compile === "function" ? layout.compile("sandbox-root") : layout;
            setCompiledLayout(payload);
            addLog("RENDER", `RENDER_UI -> ${payload?.children?.length || 0} top-level nodes.`);
          },
          showHUD: (type: string, message: string) => {
            addLog("HUD", `[${type.toUpperCase()}] ${message}`);
          },
          navigateTo: (to: string, state?: any) => {
            addLog("NAVIGATE", `NAVIGATE to "${to}" ${state ? `with state: ${JSON.stringify(state)}` : ""}`);
          },
          playVideo: (playback: any) => {
            addLog("PLAY_VIDEO", `PLAY_VIDEO: "${playback.title}" (${playback.streamUrl})`);
          },
          setAccentTheme: (themeId: string) => {
            addLog("THEME", `setAccentTheme: "${themeId}"`);
          },
          registerThemes: (themes: any[]) => {
            addLog("THEME", `registerThemes: ${themes.length} themes`);
          },
          onBlockContextUpdate: (_cb: Function) => {
            addLog("CONTEXT", "Subscribed to context updates");
            return () => {};
          },
          components: getSandboxComponents()
        },
        storage: {
          local: {
            getItem: async (key: string) => {
              const val = mockStorageRef.current[key] || null;
              addLog("STORAGE", `getItem('${key}') -> '${val}'`);
              return val;
            },
            setItem: async (key: string, value: any) => {
              mockStorageRef.current[key] = String(value);
              addLog("STORAGE", `setItem('${key}', '${value}')`);
            }
          }
        },
        http: {
          get: async (url: string, headers?: any) => {
            addLog("HTTP", `GET ${url}`);
            try {
              const res = await fetch(url, { headers });
              const text = await res.text();
              let data;
              try { data = JSON.parse(text); } catch { data = text; }
              return { status: res.status, data };
            } catch (err: any) {
              addLog("HTTP_ERROR", `GET ${url} failed: ${err.message}`);
              throw err;
            }
          },
          post: async (url: string, body?: any, headers?: any) => {
            addLog("HTTP", `POST ${url}`);
            try {
              const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...headers },
                body: typeof body === "string" ? body : JSON.stringify(body)
              });
              const text = await res.text();
              let data;
              try { data = JSON.parse(text); } catch { data = text; }
              return { status: res.status, data };
            } catch (err: any) {
              addLog("HTTP_ERROR", `POST ${url} failed: ${err.message}`);
              throw err;
            }
          }
        }
      };

      const builders = mockPotokSDK.ui.components;

      const sandboxRunner = new Function(
        "window", "document", "localStorage", "sessionStorage", "PotokSDK", "context",
        `
          const {
            VStack, HStack, Grid, Card, Heading, Text, Markdown, Badge, StatusRow, Divider, Spacer, Button, Input, Toggle, Select, CodeEditor,
            StreamSkeletonList, StreamRow, StreamList, MediaCard, HeroSpotlight, LoadingSpinner, EpisodesSection, MediaCast, MediaOverview, MediaRow, MediaPlayer, ProfileSelector, SearchBar, StreamFilterBar, EpisodeSelector, EpisodeCard
          } = context;
          ${code}
        `
      );

      sandboxRunner(
        undefined, undefined, undefined, undefined, mockPotokSDK, builders
      );

      addLog("SYSTEM", "Код плагина успешно выполнен!");

    } catch (err: any) {
      addLog("COMPILE_ERROR", err.message || "Ошибка компиляции.");
    }
  };

  useEffect(() => {
    if (activePage !== "sandbox") return;

    if ((window as any).monaco) {
      setEditorLoaded(true);
      return;
    }

    let loaderScript = document.querySelector('script[src*="monaco-editor/0.45.0/min/vs/loader.js"]') as HTMLScriptElement;
    
    const handleMonacoLoad = () => {
      const require = (window as any).require;
      if (require) {
        require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs" } });
        require(["vs/editor/editor.main"], () => {
          setEditorLoaded(true);
        }, (err: any) => {
          setEditorError("Не удалось инициализировать Monaco.");
          logger.error(err);
        });
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
        setEditorError("Не удалось скачать Monaco.");
      };
      document.head.appendChild(loaderScript);
    }
  }, [activePage]);

  useEffect(() => {
    if (!editorLoaded || !containerRef.current || activePage !== "sandbox" || sandboxTab !== "editor") return;

    const monaco = (window as any).monaco;

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowJs: true,
      checkJs: true,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      typeRoots: ["file:///node_modules/@types"]
    });

    if (!(window as any)._monacoSandboxSdkLibAdded) {
      try {
        monaco.languages.typescript.javascriptDefaults.addExtraLib(SDK_TYPINGS, "file:///node_modules/@types/potok-sdk/index.d.ts");
        (window as any)._monacoSandboxSdkLibAdded = true;
      } catch (err) {
        logger.warn("Failed to inject types:", err);
      }
    }

    editorRef.current = monaco.editor.create(containerRef.current, {
      value: sandboxCode,
      language: "javascript",
      theme: theme === "light" ? "vs" : "vs-dark",
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
      fontFamily: "Fira Code, Menlo, Monaco, monospace",
      lineHeight: 18,
      scrollbar: {
        verticalScrollbarSize: 6,
        horizontalScrollbarSize: 6
      }
    });

    runSandboxCode(sandboxCode);

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
      }
    };
  }, [editorLoaded, activePage, sandboxTab, theme]);

  const handleRun = () => {
    if (editorRef.current) {
      const val = editorRef.current.getValue();
      setSandboxCode(val);
      runSandboxCode(val);
    }
  };

  const handleReset = () => {
    setSandboxCode(INITIAL_SANDBOX_CODE);
    mockStorageRef.current = {};
    if (editorRef.current) {
      editorRef.current.setValue(INITIAL_SANDBOX_CODE);
    }
    runSandboxCode(INITIAL_SANDBOX_CODE);
  };

  const updateSandboxCode = (code: string) => {
    setSandboxCode(code);
    if (editorRef.current) {
      editorRef.current.setValue(code);
    }
    runSandboxCode(code);
  };

  return {
    sandboxTab,
    setSandboxTab,
    editorLoaded,
    editorError,
    compiledLayout,
    logs,
    clearLogs: () => setLogs([]),
    containerRef,
    handleRun,
    handleReset,
    updateSandboxCode,
  };
}
