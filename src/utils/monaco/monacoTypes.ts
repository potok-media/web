export interface MonacoEditor {
  getValue: () => string;
  setValue: (value: string) => void;
  dispose: () => void;
  onDidChangeModelContent: (listener: () => void) => { dispose: () => void };
}

export interface MonacoTextModel {
  setValue: (value: string) => void;
  dispose: () => void;
}

export interface MonacoGlobal {
  editor: {
    create: (container: HTMLElement, options: Record<string, unknown>) => MonacoEditor;
    getModel: (uri: { path: string }) => MonacoTextModel | null;
    createModel: (value: string, language: string, uri: { path: string }) => unknown;
  };
  Uri: { parse: (path: string) => { path: string } };
  languages: {
    typescript: {
      javascriptDefaults: MonacoTsDefaults;
      typescriptDefaults: MonacoTsDefaults;
      ScriptTarget: { ESNext: number };
      ModuleResolutionKind: { NodeJs: number };
    };
  };
}

interface MonacoTsDefaults {
  setCompilerOptions: (opts: Record<string, unknown>) => void;
  setDiagnosticsOptions?: (opts: Record<string, unknown>) => void;
  addExtraLib: (content: string, path: string) => void;
}

export interface MonacoRequire {
  config: (options: { paths: Record<string, string> }) => void;
  (
    deps: string[],
    onLoad: () => void,
    onError: (err: unknown) => void,
  ): void;
}

export type MonacoTheme = "vs" | "vs-dark" | "light" | "dark";

export interface PotokMonacoWindow extends Window {
  monaco?: MonacoGlobal;
  require?: MonacoRequire;
  _monacoSdkLibAdded?: boolean;
}