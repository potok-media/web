import { useEffect, useRef, useState } from "react";
import { createState } from "../sdk/src/core/state";
import { CallbackRegistry } from "../sdk/src/core/registry";
import { INITIAL_SANDBOX_CODE } from "../pages/wiki/wikiData";
import { getSandboxComponents } from "./sandboxComponents";
import { logger } from "../utils/logger";
import type { UIComponentSchema } from "@potok/sdk-types";
import { useMonacoEditor } from "./useMonacoEditor";
import { useHUD } from "../context/useHUD";
import type { HUDType } from "../context/hudContextState";
import type { EpisodeSelectorPopupProps, GenericEpisodeItem } from "../components/common/episodeSelector/types";
import type { SDKStreamEpisode } from "@potok/sdk-types";
import { mapSdkStreamEpisodes } from "../components/common/extension/hostMedia/hostMediaMappers";

type SandboxEpisodeSelectorConfig = Partial<Omit<EpisodeSelectorPopupProps, "isOpen" | "episodes" | "onPlay" | "onApplyOverride">> & {
  episodes?: SDKStreamEpisode[];
  onPlay?: (payload: { episode: GenericEpisodeItem; audioId: string }) => void;
  onApplyOverride?: (payload: { seasonNum: number | null; epNum: number }) => void;
};

export interface LogEntry {
  id: string;
  timestamp: string;
  type: string;
  message: string;
}

export function useMonacoSandbox(activePage: string, theme: "light" | "dark", initialCode = INITIAL_SANDBOX_CODE, onAccentThemeChange?: (theme: string) => void) {
  const hud = useHUD();
  const [sandboxTab, setSandboxTab] = useState<"editor" | "result">("editor");
  const [compiledLayout, setCompiledLayout] = useState<UIComponentSchema | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sandboxCode, setSandboxCode] = useState<string>(initialCode);
  const [episodeSelector, setEpisodeSelector] = useState<Omit<EpisodeSelectorPopupProps, "isOpen"> | null>(null);

  const mockStorageRef = useRef<Record<string, string>>({});
  const onSandboxEventRef = useRef<((callbackId: string, eventData: unknown) => void) | null>(null);

  const editorEnabled = activePage === "sandbox";

  const { loaded: editorLoaded, error: editorError, containerRef, getValue, setValue } = useMonacoEditor({
    enabled: editorEnabled,
    theme: theme === "light" ? "vs" : "vs-dark",
    value: sandboxCode,
    configureSdk: true,
    includeTypeScriptDefaults: false,
  });

  useEffect(() => {
    const win = window as Window & {
      PotokSandboxTriggerUIEvent?: (callbackId: string, eventData: unknown) => void;
    };
    win.PotokSandboxTriggerUIEvent = (callbackId: string, eventData: unknown) => {
      onSandboxEventRef.current?.(callbackId, eventData);
    };
    return () => {
      delete win.PotokSandboxTriggerUIEvent;
    };
  }, []);

  const addLog = (type: string, message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [
      { id: Math.random().toString(36).substring(7), timestamp: time, type, message },
      ...prev.slice(0, 49),
    ]);
  };

  const runSandboxCode = (code: string) => {
    try {
      setCompiledLayout(null);
      setEpisodeSelector(null);
      CallbackRegistry.startRenderScope("sandbox-root");
      CallbackRegistry.commitRenderScope("sandbox-root");

      onSandboxEventRef.current = (callbackId: string, eventData: unknown) => {
        addLog("EVENT", `UI Event -> callbackId: ${callbackId} (payload: ${JSON.stringify(eventData)})`);
        try {
          CallbackRegistry.trigger(callbackId, eventData);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          addLog("RUNTIME_ERROR", `Callback failed: ${message}`);
        }
      };

      const mockPotokSDK = {
        pluginId: "potok-sandbox-plugin",
        permissions: ["http", "storage"],
        config: { theme },
        createState,
        ui: {
          render: (layout: { compile?: (id: string) => UIComponentSchema } | UIComponentSchema | null) => {
            const payload =
              layout && typeof layout === "object" && "compile" in layout && typeof layout.compile === "function"
                ? layout.compile("sandbox-root")
                : (layout as UIComponentSchema | null);
            setCompiledLayout(payload);
            const childCount =
              payload && "children" in payload && Array.isArray(payload.children)
                ? payload.children.length
                : 0;
            addLog("RENDER", `RENDER_UI -> ${childCount} top-level nodes.`);
          },
          showHUD: (type: string, message: string, opts?: { durationMs?: number }) => {
            addLog("HUD", `[${type.toUpperCase()}] ${message}`);
            const validType: HUDType = type === "success" || type === "error" || type === "warning" ? type : "info";
            hud.show(validType, message, opts?.durationMs);
          },
          showEpisodeSelector: (config: SandboxEpisodeSelectorConfig) => {
            addLog("EPISODES", `showEpisodeSelector: ${config.title ?? ""}`);
            const invoke = (callback: () => void) => {
              try { callback(); }
              catch (err) { addLog("RUNTIME_ERROR", `Callback failed: ${err instanceof Error ? err.message : String(err)}`); }
            };
            setEpisodeSelector({
              ...config,
              title: config.title ?? "",
              episodes: mapSdkStreamEpisodes(config.episodes),
              // Match the callback payload sent by the real SDK host bridge.
              onPlay: (episode, audioId) => invoke(() => config.onPlay?.({ episode, audioId })),
              onApplyOverride: config.onApplyOverride ? (seasonNum, epNum) => invoke(() => config.onApplyOverride?.({ seasonNum, epNum })) : undefined,
              onStartEditing: config.onStartEditing ? () => invoke(() => config.onStartEditing?.()) : undefined,
              onClose: () => { setEpisodeSelector(null); invoke(() => config.onClose?.()); },
            });
          },
          navigateTo: (to: string, state?: unknown) => {
            addLog("NAVIGATE", `NAVIGATE to "${to}" ${state ? `with state: ${JSON.stringify(state)}` : ""}`);
          },
          playVideo: (playback: { title?: string; streamUrl?: string }) => {
            addLog("PLAY_VIDEO", `PLAY_VIDEO: "${playback.title}" (${playback.streamUrl})`);
          },
          setAccentTheme: (themeId: string) => {
            addLog("THEME", `setAccentTheme: "${themeId}"`);
            onAccentThemeChange?.(themeId);
          },
          registerThemes: (themes: unknown[]) => {
            addLog("THEME", `registerThemes: ${themes.length} themes`);
          },
          onBlockContextUpdate: () => {
            addLog("CONTEXT", "Subscribed to context updates");
            return () => {};
          },
          components: getSandboxComponents(),
        },
        storage: {
          local: {
            getItem: async (key: string) => {
              const val = mockStorageRef.current[key] || null;
              addLog("STORAGE", `getItem('${key}') -> '${val}'`);
              return val;
            },
            setItem: async (key: string, value: unknown) => {
              mockStorageRef.current[key] = String(value);
              addLog("STORAGE", `setItem('${key}', '${value}')`);
            },
          },
        },
        http: {
          get: async (url: string, headers?: Record<string, string>) => {
            addLog("HTTP", `GET ${url}`);
            try {
              const res = await fetch(url, { headers });
              const text = await res.text();
              let data: unknown;
              try {
                data = JSON.parse(text);
              } catch {
                data = text;
              }
              return { status: res.status, data };
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              addLog("HTTP_ERROR", `GET ${url} failed: ${message}`);
              throw err;
            }
          },
          post: async (url: string, body?: unknown, headers?: Record<string, string>) => {
            addLog("HTTP", `POST ${url}`);
            try {
              const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...headers },
                body: typeof body === "string" ? body : JSON.stringify(body),
              });
              const text = await res.text();
              let data: unknown;
              try {
                data = JSON.parse(text);
              } catch {
                data = text;
              }
              return { status: res.status, data };
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              addLog("HTTP_ERROR", `POST ${url} failed: ${message}`);
              throw err;
            }
          },
        },
      };

      const builders = mockPotokSDK.ui.components;

      const sandboxRunner = new Function(
        "window",
        "document",
        "localStorage",
        "sessionStorage",
        "PotokSDK",
        "context",
        `
          const {
            VStack, HStack, Grid, Card, Heading, Text, Markdown, Badge, StatusRow, Divider, Spacer, Button, Input, Toggle, Select, CodeEditor,
            StreamSkeletonList, StreamRow, StreamList, MediaCard, HeroSpotlight, LoadingSpinner, EpisodesSection, MediaCast, MediaOverview, MediaRow, MediaPlayer, ProfileSelector, SearchBar, StreamFilterBar, EpisodeSelector, EpisodeCard,
            ContentCard, ContentRow, Hero, Image, Icon, Tabs, List, Tooltip, ProgressBar, Skeleton, EmptyState, Alert, Chip, IconButton,
            Modal, Collapsible, Avatar, Rating, TagList, SectionHeader,
            Range, Segmented, ContinueWatchingRow, TopTenRow, PosterGrid, DetailHero,
            Dropdown, FileInput, Field, Carousel, Scroller, Page, SidebarGroup
          } = context;
          ${code}
        `,
      );

      sandboxRunner(undefined, undefined, undefined, undefined, mockPotokSDK, builders);

      addLog("SYSTEM", "Код плагина успешно выполнен!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка компиляции.";
      addLog("COMPILE_ERROR", message);
      logger.error("[MonacoSandbox] Compile error:", err);
    }
  };

  const handleRun = () => {
    const val = getValue();
    setSandboxCode(val);
    runSandboxCode(val);
    setSandboxTab("result");
  };

  const handleReset = () => {
    setSandboxCode(INITIAL_SANDBOX_CODE);
    mockStorageRef.current = {};
    setValue(INITIAL_SANDBOX_CODE);
    runSandboxCode(INITIAL_SANDBOX_CODE);
  };

  const updateSandboxCode = (code: string) => {
    setSandboxCode(code);
    setValue(code);
  };

  return {
    sandboxTab,
    setSandboxTab,
    editorLoaded,
    editorError,
    compiledLayout,
    episodeSelector,
    logs,
    clearLogs: () => setLogs([]),
    containerRef,
    handleRun,
    handleReset,
    updateSandboxCode,
    getCode: getValue,
  };
}
