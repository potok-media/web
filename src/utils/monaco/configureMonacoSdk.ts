import { SDK_TYPINGS } from "../../sdk/src/sdkTypings";
import { logger } from "../logger";
import type { MonacoGlobal, PotokMonacoWindow } from "./monacoTypes";

const SDK_TYPINGS_PATH = "file:///node_modules/@types/potok-sdk/index.d.ts";

export interface ConfigureMonacoSdkOptions {
  /** When true, configures typescriptDefaults in addition to javascriptDefaults. */
  includeTypeScriptDefaults?: boolean;
  /** When set, applies javascript diagnostics options (inspector/host editors). */
  noSemanticValidation?: boolean;
}

export function configureMonacoSdk(
  monaco: MonacoGlobal,
  options: ConfigureMonacoSdkOptions = {},
): void {
  const { includeTypeScriptDefaults = true, noSemanticValidation } = options;

  const compilerOptions = {
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    allowJs: true,
    checkJs: true,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    typeRoots: ["file:///node_modules/@types"],
  };

  monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);

  if (includeTypeScriptDefaults) {
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      typeRoots: ["file:///node_modules/@types"],
    });
  }

  if (noSemanticValidation !== undefined) {
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions?.({
      noSemanticValidation,
      noSyntaxValidation: false,
    });
  }

  const win = window as unknown as PotokMonacoWindow;
  if (win._monacoSdkLibAdded) return;

  try {
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      SDK_TYPINGS,
      SDK_TYPINGS_PATH,
    );
    if (includeTypeScriptDefaults) {
      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        SDK_TYPINGS,
        SDK_TYPINGS_PATH,
      );
    }
    win._monacoSdkLibAdded = true;
  } catch (err) {
    logger.warn("[Monaco] Failed to inject Potok SDK typings:", err);
  }
}