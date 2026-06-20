import React, { useState, useEffect, useRef } from "react";
import { useInspector } from "../../../context/InspectorContext";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";
import * as uiComponents from "../../../sdk/src/components/common";
import * as mediaComponents from "../../../sdk/src/components/media";
import { SDK_TYPINGS } from "../../../sdk/src/sdkTypings";
import { logger } from "../../../utils/logger";

export const DeveloperInspector: React.FC = () => {
  const { selectedSlot, setSelectedSlot } = useInspector();
  const [inspectorCode, setInspectorCode] = useState<string>(`// Выберите шаблон...`);
  const [inspectorError, setInspectorError] = useState<string | null>(null);

  const [monacoLoaded, setMonacoLoaded] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<any>(null);

  // Load Monaco loader script
  useEffect(() => {
    if (!selectedSlot) return;

    if ((window as any).monaco) {
      setMonacoLoaded(true);
      return;
    }

    let loaderScript = document.querySelector('script[src*="monaco-editor/0.45.0/min/vs/loader.js"]') as HTMLScriptElement;
    
    const handleMonacoLoad = () => {
      const require = (window as any).require;
      if (require) {
        require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs" } });
        require(["vs/editor/editor.main"], () => {
          setMonacoLoaded(true);
        }, (err: any) => {
          logger.error("Failed to load Monaco editor.main:", err);
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
      document.head.appendChild(loaderScript);
    }
  }, [selectedSlot]);

  // Create and sync Monaco Editor instance
  useEffect(() => {
    if (!selectedSlot) return;
    setInspectorError(null);

    // Compute template code
    let initialCode = "";
    if (selectedSlot === "media-actions") {
      initialCode = `// Шаблон для media-actions: Кнопки быстрого запуска стриминга
const { ui } = PotokSDK;

return HStack()
  .spacing(8)
  .child(
    Button("Смотреть в 4K")
      .variant("primary")
      .onClick(() => {
        ui.showHUD("success", "Запуск парсинга источников в качестве 4K...");
      })
  )
  .child(
    Button("Копировать Magnet")
      .variant("secondary")
      .onClick(() => {
        ui.showHUD("info", "Magnet-ссылка скопирована в буфер обмена!");
      })
  );`;
    } else if (selectedSlot === "sidebar-status") {
      initialCode = `// Шаблон для sidebar-status: Информационная панель TorrServer
const { ui } = PotokSDK;

return Card()
  .child(
    VStack()
      .spacing(6)
      .child(
        HStack()
          .spacing(6)
          .child(Badge("TorrServer").color("success"))
          .child(Text("Работает").variant("success").bold(true))
      )
      .child(Text("Входящая скорость: 4.8 МБ/с").size("sm").variant("secondary"))
      .child(Text("Версия: 1.2.86").size("sm").variant("secondary"))
  );`;
    } else if (selectedSlot === "sidebar-menu" || selectedSlot === "sidebar-menu-home" || selectedSlot === "sidebar-menu-library") {
      initialCode = `// Шаблон для ${selectedSlot}: Дополнительные разделы навигации
const { ui } = PotokSDK;

return VStack()
  .spacing(4)
  .child(
    Button("Случайный фильм")
      .variant("sidebar-item")
      .icon("play")
      .onClick(() => {
        ui.navigateTo("/media/movie/random");
      })
  )
  .child(
    Button("Документация")
      .variant("sidebar-item")
      .icon("sliders")
      .onClick(() => {
        ui.navigateTo("/wiki");
      })
  );`;
    } else if (selectedSlot === "settings-tabs") {
      initialCode = `// Шаблон для settings-tabs: Настройки кеширования плагина
const { ui } = PotokSDK;

return Card()
  .title("Настройки TorrServer")
  .subtitle("Параметры буферизации")
  .child(
    VStack()
      .spacing(10)
      .child(Input("cache-size").label("Размер кэша (МБ)").value("1024"))
      .child(Toggle("preload").label("Предзагрузка серий").value(true))
      .child(
        Button("Сохранить параметры")
          .variant("primary")
          .onClick(() => ui.showHUD("success", "Настройки сохранены!"))
      )
  );`;
    } else {
      initialCode = `// Универсальный шаблон UI компонента для слота ${selectedSlot}
const { ui } = PotokSDK;

return Card()
  .title("Компонент инспектора")
  .subtitle("Слот: ${selectedSlot}")
  .child(
    VStack()
      .spacing(12)
      .child(Text("Этот блок собран с использованием Potok SDK UI."))
      .child(
        Button("Вызвать HUD уведомление")
          .variant("primary")
          .onClick(() => {
            ui.showHUD("info", "Уведомление от слота ${selectedSlot}");
          })
      )
  );`;
    }

    setInspectorCode(initialCode);

    if (!monacoLoaded || !editorContainerRef.current) return;

    const monaco = (window as any).monaco;

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowJs: true,
      checkJs: true,
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
      noSemanticValidation: true,
      noSyntaxValidation: false,
    });

    if (!(window as any)._monacoInspectorSdkLibAdded) {
      try {
        monaco.languages.typescript.javascriptDefaults.addExtraLib(SDK_TYPINGS, "file:///node_modules/@types/potok-sdk/index.d.ts");
        monaco.languages.typescript.typescriptDefaults.addExtraLib(SDK_TYPINGS, "file:///node_modules/@types/potok-sdk/index.d.ts");
        (window as any)._monacoInspectorSdkLibAdded = true;
      } catch (e) {
        logger.warn("Inspector Monaco extra lib inject failed:", e);
      }
    }

    const modelUri = monaco.Uri.parse(`file:///src/inspector-${selectedSlot}.js`);
    let model = monaco.editor.getModel(modelUri);
    if (model) {
      model.setValue(initialCode);
    } else {
      model = monaco.editor.createModel(initialCode, "javascript", modelUri);
    }

    monacoRef.current = monaco.editor.create(editorContainerRef.current, {
      model: model,
      theme: "vs-dark",
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

    const changeSubscription = monacoRef.current.onDidChangeModelContent(() => {
      setInspectorCode(monacoRef.current.getValue());
    });

    return () => {
      changeSubscription.dispose();
      if (monacoRef.current) {
        monacoRef.current.dispose();
        monacoRef.current = null;
      }
      const currentModel = monaco.editor.getModel(modelUri);
      if (currentModel) {
        currentModel.dispose();
      }
    };
  }, [monacoLoaded, selectedSlot]);

  if (!selectedSlot) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      right: 0,
      width: "45rem",
      maxWidth: "90vw",
      height: "100vh",
      background: "rgba(15, 23, 42, 0.96)",
      backdropFilter: "blur(20px)",
      borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
      boxShadow: "-10px 0 30px rgba(0,0,0,0.5)",
      zIndex: 999999,
      display: "flex",
      flexDirection: "column",
      color: "#f8fafc",
      fontFamily: "system-ui, sans-serif"
    }}>
      {/* Drawer Header */}
      <div style={{
        padding: "var(--space-m)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#38bdf8" }}>Инспектор слота</h3>
          <code style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{selectedSlot}</code>
        </div>
        <button
          onClick={() => setSelectedSlot(null)}
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            padding: "0.25rem"
          }}
        >
          <svg width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Drawer Body */}
      <div style={{ padding: "var(--space-m)", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--space-m)" }}>
        {/* Presets */}
        <div>
          <label style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#94a3b8", display: "block", marginBottom: "0.375rem" }}>Готовые шаблоны кода:</label>
          <select
            onChange={(e) => {
              const val = e.target.value;
              if (val === "recommended") {
                const original = selectedSlot;
                setSelectedSlot(null);
                setTimeout(() => setSelectedSlot(original), 10);
              } else if (val === "button") {
                const code = `// Шаблон: HStack с кнопками действий
const { ui } = PotokSDK;

return HStack()
  .spacing(10)
  .child(
    Button("Открыть плеер")
      .variant("primary")
      .onClick(() => ui.showHUD("success", "Запуск воспроизведения..."))
  )
  .child(
    Button("В закладки")
      .variant("ghost")
      .onClick(() => ui.showHUD("info", "Добавлено в закладки!"))
  );`;
                setInspectorCode(code);
                if (monacoRef.current) {
                  monacoRef.current.setValue(code);
                }
              } else if (val === "status") {
                const code = `// Шаблон: Card со статусом TorrServer
const { ui } = PotokSDK;

return Card()
  .title("Состояние TorrServer")
  .subtitle("Мониторинг сети")
  .child(
    VStack()
      .spacing(6)
      .child(Text("Входящая скорость: 4.8 МБ/с").variant("success"))
      .child(Text("Активных пиров: 34").variant("secondary"))
  );`;
                setInspectorCode(code);
                if (monacoRef.current) {
                  monacoRef.current.setValue(code);
                }
              } else if (val === "settings") {
                const code = `// Шаблон: VStack с формой параметров
const { ui } = PotokSDK;

return Card()
  .title("Настройки TorrServer")
  .child(
    VStack()
      .spacing(12)
      .child(Input("port").label("Порт TorrServer").value("8090"))
      .child(Toggle("ssl").label("Использовать SSL").value(false))
      .child(
        Button("Сохранить параметры")
          .variant("primary")
          .onClick(() => ui.showHUD("success", "Настройки сохранены!"))
      )
  );`;
                setInspectorCode(code);
                if (monacoRef.current) {
                  monacoRef.current.setValue(code);
                }
              }
            }}
            style={{
              width: "100%",
              padding: "0.5rem",
              background: "#1e293b",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "0.375rem",
              color: "#fff",
              outline: "none"
            }}
          >
            <option value="">Выберите шаблон...</option>
            <option value="recommended">Рекомендуемый шаблон для слота</option>
            <option value="button">Кнопки действия (HStack)</option>
            <option value="status">Информационный статус (Card)</option>
            <option value="settings">Форма настроек (VStack)</option>
          </select>
        </div>

        {/* Monaco Editor Container */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.375rem", minHeight: "21.875rem" }}>
          <label style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#94a3b8" }}>Код виджета (JavaScript):</label>
          <div 
            style={{ 
              position: "relative",
              flex: 1,
              minHeight: "18.75rem",
              borderRadius: "0.5rem",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              backgroundColor: "#1e1e1e"
            }}
          >
            {!monacoLoaded && (
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
                  fontSize: "0.875rem",
                  fontFamily: "var(--font-family, sans-serif)",
                  backgroundColor: "rgba(30, 30, 30, 0.8)",
                  zIndex: 10
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                  <div
                    style={{
                      width: "1.5rem",
                      height: "1.5rem",
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
            <div ref={editorContainerRef} style={{ width: "100%", height: "100%", minHeight: "18.75rem" }} />
          </div>
        </div>
        
        {inspectorError && (
          <div style={{ color: "#ef4444", fontSize: "0.8rem", background: "rgba(239,68,68,0.1)", padding: "0.5rem", borderRadius: "0.25rem" }}>
            {inspectorError}
          </div>
        )}

        <button
          onClick={() => {
            try {
              setInspectorError(null);
              
              const mockPotokSDK = {
                ui: {
                  showHUD: (type: string, msg: string) => {
                    logger.log(`[HUD ${type}] ${msg}`);
                    alert(`[Potok SDK HUD - ${type.toUpperCase()}]: ${msg}`);
                  },
                  navigateTo: (to: string) => {
                    logger.log(`[NAVIGATE] to: ${to}`);
                    alert(`[Potok SDK NAVIGATE]: ${to}`);
                  }
                }
              };

              const codeToRun = monacoRef.current ? monacoRef.current.getValue() : inspectorCode;

              const runner = new Function(
                "window", "document", "PotokSDK",
                "VStack", "HStack", "Grid", "Card", "Heading", "Text", "Markdown", "Badge", "StatusRow", "Divider", "Spacer", "Button", "Input", "Toggle", "Select", "CodeEditor",
                "StreamSkeletonList", "StreamRow", "StreamList", "MediaCard", "HeroSpotlight", "LoadingSpinner", "EpisodesSection", "MediaCast", "MediaOverview", "MediaRow", "MediaPlayer", "ProfileSelector", "SearchBar", "StreamFilterBar", "EpisodeSelector", "EpisodeCard",
                `
                const exports = {};
                ${codeToRun}
                return exports.default || exports.layout || exports;
                `
              );

              const result = runner(
                undefined, undefined, mockPotokSDK,
                () => new uiComponents.VStackBuilder(),
                () => new uiComponents.HStackBuilder(),
                () => new uiComponents.GridBuilder(),
                () => new uiComponents.CardBuilder(),
                (t: string) => new uiComponents.HeadingBuilder(t),
                (t: string) => new uiComponents.TextBuilder(t),
                (c: string) => new uiComponents.MarkdownBuilder(c),
                (t: string) => new uiComponents.BadgeBuilder(t),
                (l: string) => new uiComponents.StatusRowBuilder(l),
                () => new uiComponents.DividerBuilder(),
                () => new uiComponents.SpacerBuilder(),
                (t: string) => new uiComponents.ButtonBuilder(t),
                (n: string) => new uiComponents.InputBuilder(n),
                (n: string) => new uiComponents.ToggleBuilder(n),
                (n: string) => new uiComponents.SelectBuilder(n),
                (n: string) => new uiComponents.CodeEditorBuilder(n),
                () => new mediaComponents.StreamSkeletonListBuilder(),
                () => new mediaComponents.StreamRowBuilder(),
                () => new mediaComponents.StreamListBuilder(),
                () => new mediaComponents.MediaCardBuilder(),
                () => new mediaComponents.HeroSpotlightBuilder(),
                () => new mediaComponents.LoadingSpinnerBuilder(),
                () => new mediaComponents.EpisodesSectionBuilder(),
                () => new mediaComponents.MediaCastBuilder(),
                () => new mediaComponents.MediaOverviewBuilder(),
                () => new mediaComponents.MediaRowBuilder(),
                () => new mediaComponents.MediaPlayerBuilder(),
                () => new mediaComponents.ProfileSelectorBuilder(),
                () => new mediaComponents.SearchBarBuilder(),
                () => new mediaComponents.StreamFilterBarBuilder(),
                () => new mediaComponents.EpisodeSelectorBuilder(),
                () => new mediaComponents.EpisodeCardBuilder()
              );
              
              if (result) {
                const schema = typeof result.compile === "function" ? result.compile("injected-root") : (result.layout || result);
                
                if (schema && (schema.type || schema.children || schema.layout)) {
                  const finalSchema = schema.layout || schema;
                  
                  ExtensionRegistry.registerSlotContribution("hot-injected-plugin", {
                    id: `contribution-${selectedSlot}`,
                    slotName: selectedSlot,
                    title: "Hot Injected Component",
                  });
                  
                  ExtensionRegistry.registerSlotRender(`contribution-${selectedSlot}`, {
                    label: "Hot Injected",
                    layout: finalSchema
                  });
                  
                  ExtensionRegistry.triggerListeners();
                  setSelectedSlot(null);
                } else {
                  setInspectorError("Код должен возвращать валидный UI Component (экземпляр билдера или объект с полем type).");
                }
              } else {
                setInspectorError("Код должен возвращать инстанс UI компонента.");
              }
            } catch (err: any) {
              setInspectorError(err.message || "Ошибка выполнения кода.");
            }
          }}
          style={{
            width: "100%",
            padding: "0.625rem",
            background: "#10b981",
            color: "#fff",
            border: "none",
            borderRadius: "0.375rem",
            fontWeight: "bold",
            cursor: "pointer",
            textAlign: "center"
          }}
        >
          Внедрить в макет
        </button>
      </div>
    </div>
  );
};

export default DeveloperInspector;
