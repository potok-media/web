import React from "react";
import ReactDOM from "react-dom";
import { Outlet, useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { useSettings, useConnectionHealth, usePlayback } from "../context/AppSettingsContext";
import { useInspector } from "../context/InspectorContext";
import { ExtensionRegistry } from "../utils/extensions/ExtensionRegistry";
import { AppSidebar } from "./AppSidebar";
import { MobileBottomNavigation } from "./MobileBottomNavigation";
import { getEnv } from "../utils/EnvService";
import { WebMediaPlayer } from "./WebMediaPlayer";
import { ErrorBoundary } from "./ErrorBoundary";
import { OfflineOverlay } from "./OfflineOverlay";
import { FocusTrap } from "./FocusTrap";
import { PluginSandbox } from "./common/PluginSandbox";
import * as uiComponents from "../sdk/src/components/common";
import * as mediaComponents from "../sdk/src/components/media";
import { SDK_TYPINGS } from "../sdk/src/sdkTypings";
import { PlatformManager } from "../utils/PlatformManager";
import { DiagnosticsOverlay } from "./common/DiagnosticsOverlay";
import "../styles/layout.css";

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const mainContentRef = React.useRef<HTMLDivElement>(null);
  const scrollPositions = React.useRef<Record<string, number>>({});

  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth <= 768);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const handleTabletChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleTabletChange);
    } else {
      mediaQuery.addListener(handleTabletChange);
    }
    
    setIsMobile(mediaQuery.matches);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleTabletChange);
      } else {
        mediaQuery.removeListener(handleTabletChange);
      }
    };
  }, []);

  const handleScroll = React.useCallback(() => {
    if (mainContentRef.current) {
      scrollPositions.current[location.key || location.pathname] = mainContentRef.current.scrollTop;
    }
  }, [location.pathname, location.key]);

  React.useEffect(() => {
    const container = mainContentRef.current;
    if (!container) return;

    const savedPos = scrollPositions.current[location.key || location.pathname] || 0;
    
    // We use a small timeout to let the DOM render before restoring scroll position
    const timer = setTimeout(() => {
      container.scrollTo(0, savedPos);
    }, 50);

    return () => clearTimeout(timer);
  }, [location.pathname, location.key]);

  const {
    connectionState,
    checkConnection,
  } = useConnectionHealth();

  const {
    connectionProfiles,
    activeProfileID,
    updateProfile,
    addProfile,
    developerMode,
  } = useSettings();

  const {
    isInspectorActive,
    setIsInspectorActive,
    selectedSlot,
    setSelectedSlot
  } = useInspector();

  const [inspectorCode, setInspectorCode] = React.useState<string>(`// Выберите шаблон...`);
  const [inspectorError, setInspectorError] = React.useState<string | null>(null);

  const [monacoLoaded, setMonacoLoaded] = React.useState(false);
  const editorContainerRef = React.useRef<HTMLDivElement>(null);
  const monacoRef = React.useRef<any>(null);

  // Load Monaco loader script
  React.useEffect(() => {
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
          console.error("Failed to load Monaco editor.main:", err);
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
  React.useEffect(() => {
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
      initialCode = `// Универсальный шаблон UI компонента для слота \${selectedSlot}
const { ui } = PotokSDK;

return Card()
  .title("Компонент инспектора")
  .subtitle("Слот: \${selectedSlot}")
  .child(
    VStack()
      .spacing(12)
      .child(Text("Этот блок собран с использованием Potok SDK UI."))
      .child(
        Button("Вызвать HUD уведомление")
          .variant("primary")
          .onClick(() => {
            ui.showHUD("info", "Уведомление от слота \${selectedSlot}");
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
        console.warn("Inspector Monaco extra lib inject failed:", e);
      }
    }

    const modelUri = monaco.Uri.parse(`file:///src/inspector-\${selectedSlot}.js`);
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

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleBackPressed = (e: Event) => {
      if (e.defaultPrevented) return;

      const isHome = location.pathname === "/";
      if (isHome) {
        PlatformManager.exitApp();
      } else {
        navigate(-1);
      }
    };

    window.addEventListener("potok-back-pressed", handleBackPressed);
    return () => {
      window.removeEventListener("potok-back-pressed", handleBackPressed);
    };
  }, [location.pathname, navigate]);

  React.useEffect(() => {
    if (!PlatformManager.isTV()) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.closest(".sidebar")) {
        setIsSidebarCollapsed(false);
      } else {
        setIsSidebarCollapsed(true);
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, []);

  const {
    activePlayback,
    playVideo,
    stopVideo,
  } = usePlayback();

  const hasPlayingParam = searchParams.get("playing") === "true";

  // Use refs to avoid dependencies in effects causing loops/races
  const activePlaybackRef = React.useRef(activePlayback);
  const playVideoRef = React.useRef(playVideo);
  const stopVideoRef = React.useRef(stopVideo);
  const setSearchParamsRef = React.useRef(setSearchParams);
  const hasPlayingParamRef = React.useRef(hasPlayingParam);

  React.useEffect(() => {
    activePlaybackRef.current = activePlayback;
    playVideoRef.current = playVideo;
    stopVideoRef.current = stopVideo;
    setSearchParamsRef.current = setSearchParams;
    hasPlayingParamRef.current = hasPlayingParam;
  });

  // URL -> State Synchronization
  React.useEffect(() => {
    if (hasPlayingParam) {
      if (!activePlaybackRef.current) {
        try {
          const saved = sessionStorage.getItem("potok_last_playback");
          if (saved) {
            playVideoRef.current(JSON.parse(saved));
          } else {
            setSearchParamsRef.current(prev => {
              const next = new URLSearchParams(prev);
              next.delete("playing");
              return next;
            }, { replace: true });
          }
        } catch (e) {
          console.error("Failed to restore playback state from sessionStorage", e);
        }
      }
    } else {
      if (activePlaybackRef.current) {
        stopVideoRef.current();
      }
    }
  }, [hasPlayingParam]);

  // State -> URL Synchronization
  React.useEffect(() => {
    if (activePlayback) {
      sessionStorage.setItem("potok_last_playback", JSON.stringify(activePlayback));
      if (!hasPlayingParamRef.current) {
        setSearchParamsRef.current(prev => {
          const next = new URLSearchParams(prev);
          next.set("playing", "true");
          return next;
        });
      }
    } else {
      sessionStorage.removeItem("potok_last_playback");
      if (hasPlayingParamRef.current) {
        setSearchParamsRef.current(prev => {
          const next = new URLSearchParams(prev);
          next.delete("playing");
          return next;
        });
      }
    }
  }, [activePlayback]);

  const handleClosePlayer = React.useCallback(() => {
    if (searchParams.get("playing") === "true") {
      navigate(-1);
    } else {
      stopVideo();
    }
  }, [searchParams, navigate, stopVideo]);

  const activeProfile = connectionProfiles.find((p) => p.id === activeProfileID) || null;
  const [inputUrl, setInputUrl] = React.useState(
    activeProfile?.gatewayURL || getEnv("VITE_DEFAULT_BFF_URL") || ""
  );

  const [prevActiveProfileID, setPrevActiveProfileID] = React.useState<string | null>(activeProfileID);

  if (activeProfileID !== prevActiveProfileID) {
    setPrevActiveProfileID(activeProfileID);
    setInputUrl(activeProfile?.gatewayURL || getEnv("VITE_DEFAULT_BFF_URL") || "");
  }

  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(() => {
    if (PlatformManager.isTV()) {
      return true;
    }
    const saved = localStorage.getItem("isSidebarCollapsed");
    return saved === null ? false : saved === "true";
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("isSidebarCollapsed", String(next));
      return next;
      });
  };

  const handleSaveAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    const targetUrl = inputUrl.trim().replace(/\/$/, "");

    if (activeProfile) {
      updateProfile({
        ...activeProfile,
        gatewayURL: targetUrl,
        playerServerURL: activeProfile.playerServerURL,
        searchEngineURL: activeProfile.searchEngineURL,
      });
    } else {
      addProfile({
        name: "Локальный BFF",
        gatewayURL: targetUrl,
        playerServerURL: "",
        searchEngineURL: "",
        playerServerAuthEnabled: false,
        playerServerAuthLogin: "",
      });
    }

    setTimeout(() => {
      checkConnection();
    }, 150);
  };

  return (
    <div className={`app-container ${isSidebarCollapsed ? "sidebar-collapsed" : ""} ${isMobile ? "mobile-layout" : ""}`}>
      {!isMobile && <AppSidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />}
      <main
        ref={mainContentRef}
        onScroll={handleScroll}
        className="main-content"
        aria-hidden={connectionState !== "connected"}
      >
        <Outlet />
      </main>

      <PluginSandbox />
      <DiagnosticsOverlay />

      {isMobile && <MobileBottomNavigation />}

      {activePlayback && (
        <ErrorBoundary fallback={(error, resetError) => (
          <div style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: 9999,
            width: "350px",
            padding: "1rem",
            background: "rgba(20, 20, 20, 0.95)",
            backdropFilter: "blur(25px)",
            borderRadius: "12px",
            border: "1px solid var(--error, #ef4444)",
            color: "#fff",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
          }}>
            <h4 style={{ color: "var(--error, #ef4444)", margin: "0 0 0.5rem 0" }}>Ошибка плеера</h4>
            <p style={{ fontSize: "0.85rem", opacity: 0.8, margin: "0 0 1rem 0" }}>
              {error.message || "Не удалось воспроизвести видео."}
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={resetError}
                style={{
                  flex: 1,
                  padding: "0.4rem",
                  background: "var(--error, #ef4444)",
                  border: "none",
                  borderRadius: "4px",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600
                }}
              >
                Повторить
              </button>
              <button
                onClick={handleClosePlayer}
                style={{
                  flex: 1,
                  padding: "0.4rem",
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: "4px",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "0.85rem"
                }}
              >
                Закрыть
              </button>
            </div>
          </div>
        )}>
          <WebMediaPlayer
            key={`${activePlayback.id}-${activePlayback.season || 0}-${activePlayback.episode || 0}-${activePlayback.streamUrl}`}
            playback={activePlayback}
            onClose={handleClosePlayer}
            isNetworkOffline={connectionState === "offline"}
          />
        </ErrorBoundary>
      )}

      {connectionState !== "connected" && ReactDOM.createPortal(
        <FocusTrap>
          <OfflineOverlay
            connectionState={connectionState}
            inputUrl={inputUrl}
            setInputUrl={setInputUrl}
            handleSaveAndConnect={handleSaveAndConnect}
            activeProfile={activeProfile}
            checkConnection={checkConnection}
          />
        </FocusTrap>,
        document.body
      )}

      {/* Inspector Floating Toggle Button */}
      {developerMode && (
        <button
          onClick={() => setIsInspectorActive(!isInspectorActive)}
          style={{
            position: "fixed",
            bottom: "var(--space-l, 20px)",
            right: "var(--space-l, 20px)",
            zIndex: 99999,
            padding: "0.75rem 1.25rem",
            background: isInspectorActive ? "#ef4444" : "var(--accent, #3b82f6)",
            color: "#fff",
            border: "none",
            borderRadius: "50px",
            fontWeight: "bold",
            fontSize: "0.85rem",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.2s"
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span>{isInspectorActive ? "Выключить Изучение" : "Изучить разметку"}</span>
        </button>
      )}

      {/* Inspector Drawer Panel */}
      {developerMode && selectedSlot && (
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
                padding: "4px"
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Drawer Body */}
          <div style={{ padding: "var(--space-m)", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--space-m)" }}>
            {/* Presets */}
            {/* Presets */}
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Готовые шаблоны кода:</label>
              <select
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "recommended") {
                    // Trigger the default recommended preset hook again by forcing value change
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
                  padding: "8px",
                  background: "#1e293b",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "6px",
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
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px", minHeight: "350px" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#94a3b8" }}>Код виджета (JavaScript):</label>
              <div 
                style={{ 
                  position: "relative",
                  flex: 1, 
                  minHeight: "300px", 
                  borderRadius: "8px", 
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
                <div ref={editorContainerRef} style={{ width: "100%", height: "100%", minHeight: "300px" }} />
              </div>
            </div>
            
            {inspectorError && (
              <div style={{ color: "#ef4444", fontSize: "0.8rem", background: "rgba(239,68,68,0.1)", padding: "8px", borderRadius: "4px" }}>
                {inspectorError}
              </div>
            )}

            <button
              onClick={() => {
                try {
                  setInspectorError(null);
                  
                  // Setup mock PotokSDK context with HUD capabilities
                  const mockPotokSDK = {
                    ui: {
                      showHUD: (type: string, msg: string) => {
                        console.log(`[HUD ${type}] ${msg}`);
                        alert(`[Potok SDK HUD - ${type.toUpperCase()}]: ${msg}`);
                      },
                      navigateTo: (to: string) => {
                        console.log(`[NAVIGATE] to: ${to}`);
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
                      
                      // Register dynamic plugin details
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
                padding: "10px",
                background: "#10b981",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontWeight: "bold",
                cursor: "pointer",
                textAlign: "center"
              }}
            >
              Внедрить в макет
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLayout;
