import type { SelectSchema } from "@potok/sdk-types";

export type SelectValue = string | string[];

export function parseSelectValue(
  selected: SelectSchema["props"]["selected"],
  multiple: boolean | undefined,
): SelectValue {
  if (multiple) {
    if (Array.isArray(selected)) return selected;
    if (typeof selected === "string") {
      if (!selected) return [];
      try {
        const parsed: unknown = JSON.parse(selected);
        if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string");
      } catch {
        return selected.split(",").map((s) => s.trim()).filter(Boolean);
      }
      return [selected];
    }
    return [];
  }

  if (Array.isArray(selected)) return selected[0] || "";
  return selected || "";
}

export function parseResetValue(
  resetValue: SelectSchema["props"]["resetValue"],
  multiple: boolean | undefined,
): SelectValue {
  if (multiple) {
    if (Array.isArray(resetValue)) return resetValue;
    if (typeof resetValue === "string") {
      try {
        const parsed: unknown = JSON.parse(resetValue);
        if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string");
      } catch {
        return resetValue ? resetValue.split(",").map((s) => s.trim()).filter(Boolean) : [];
      }
      return resetValue ? [resetValue] : [];
    }
    return [];
  }
  return resetValue || "";
}

export function isOptionSelected(value: SelectValue, optionValue: string): boolean {
  if (Array.isArray(value)) return value.includes(optionValue);
  return value === optionValue;
}

export function toggleMultiSelection(current: SelectValue, optionValue: string): string[] {
  const list = Array.isArray(current) ? current : [];
  return list.includes(optionValue)
    ? list.filter((v) => v !== optionValue)
    : [...list, optionValue];
}

export function isResetActive(
  selected: SelectValue,
  resetValue: SelectValue,
  multiple: boolean | undefined,
): boolean {
  if (multiple) {
    return Array.isArray(selected) && selected.length > 0;
  }
  return selected !== resetValue;
}

const THEME_COLORS: Record<string, { bg: string; accent: string }> = {
  nordicFrost: { bg: "#0f1218", accent: "#add8e6" },
  amberGold: { bg: "#120e0a", accent: "#e5a00d" },
  sageMuted: { bg: "#0f110f", accent: "#b4c8b4" },
  graphite: { bg: "#0f0f10", accent: "#ffffff" },
  system: { bg: "#0f0f12", accent: "#007aff" },
  lightClassic: { bg: "#f4f4f6", accent: "#007aff" },
  pastelPeach: { bg: "#fdf5ef", accent: "#ee7755" },
  softMint: { bg: "#f4faf7", accent: "#2dbd82" },
};

export function getThemeColorStyle(value: string): { bg: string; accent: string } | null {
  return THEME_COLORS[value] ?? null;
}