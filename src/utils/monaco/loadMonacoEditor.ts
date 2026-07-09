import type { MonacoGlobal, PotokMonacoWindow } from "./monacoTypes";

export const MONACO_CDN_BASE =
  "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs";

export const MONACO_LOADER_SRC = `${MONACO_CDN_BASE}/loader.js`;

function getWindow(): PotokMonacoWindow {
  return window as unknown as PotokMonacoWindow;
}

export function getMonaco(): MonacoGlobal | undefined {
  return getWindow().monaco;
}

export function loadMonacoEditor(
  onReady: () => void,
  onError: (err: unknown) => void,
): void {
  if (getMonaco()) {
    onReady();
    return;
  }

  const existing = document.querySelector(
    `script[src*="monaco-editor/0.45.0/min/vs/loader.js"]`,
  ) as HTMLScriptElement | null;

  const handleLoad = () => {
    const req = getWindow().require;
    if (!req) {
      onError(new Error("Monaco loader script loaded but require is unavailable."));
      return;
    }
    req.config({ paths: { vs: MONACO_CDN_BASE } });
    req(["vs/editor/editor.main"], onReady, onError);
  };

  if (existing) {
    if (getWindow().require?.config) {
      handleLoad();
    } else {
      existing.addEventListener("load", handleLoad);
    }
    return;
  }

  const script = document.createElement("script");
  script.src = MONACO_LOADER_SRC;
  script.async = true;
  script.onload = handleLoad;
  script.onerror = () => onError(new Error("Failed to download Monaco loader script."));
  document.head.appendChild(script);
}