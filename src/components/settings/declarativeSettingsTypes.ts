import type { RegisteredExtension } from "@potok/sdk-types";

export type DeclarativeSettingValue = string | number | boolean;

export interface DeclarativeConfigOption {
  value: string;
  label?: string;
}

export interface DeclarativeConfigItem {
  type: string;
  default?: DeclarativeSettingValue;
  label?: string;
  descriptionHtml?: string;
  dependsOn?: string;
  layoutRow?: string;
  options?: DeclarativeConfigOption[];
}

export type DeclarativeConfig = Record<string, DeclarativeConfigItem>;

export type DeclarativeLayoutRow =
  | { type: "single"; key: string }
  | { type: "row"; keys: string[]; layoutRowName: string };

export function getDeclarativeConfig(ext: RegisteredExtension): DeclarativeConfig {
  return (ext.manifest.config ?? {}) as DeclarativeConfig;
}

export function isPasswordConfigKey(key: string, label: string): boolean {
  const k = key.toLowerCase();
  const l = label.toLowerCase();
  return (
    k.includes("key") ||
    k.includes("password") ||
    k.includes("token") ||
    l.includes("key") ||
    l.includes("password") ||
    l.includes("token")
  );
}

export function buildDeclarativeLayoutRows(config: DeclarativeConfig): DeclarativeLayoutRow[] {
  const rows: DeclarativeLayoutRow[] = [];
  const processedKeys = new Set<string>();

  Object.keys(config).forEach((key) => {
    if (processedKeys.has(key)) return;

    const item = config[key];
    if (item.layoutRow) {
      const rowName = item.layoutRow;
      const rowKeys = Object.keys(config).filter((k) => config[k].layoutRow === rowName);
      rowKeys.forEach((k) => processedKeys.add(k));
      rows.push({ type: "row", keys: rowKeys, layoutRowName: rowName });
    } else {
      processedKeys.add(key);
      rows.push({ type: "single", key });
    }
  });

  return rows;
}