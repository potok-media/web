/**
 * Lightweight i18n for plugins (runs inside the plugin iframe). Kept dependency-free and
 * tiny so the raw SDK injected into every iframe stays small — it is NOT full i18next.
 *
 * Plugins can:
 *   - read HOST strings:        i18n.t("common:actions.close")
 *   - register OWN namespaces:  i18n.addResourceBundle("en", "myplugin", { hello: "Hi" })
 *                               i18n.t("myplugin:hello")
 *   - react to language change: i18n.onLanguageChange((lng) => redraw())
 *
 * The host injects the current language + a subset of host strings via window.PotokInitialState,
 * and pushes a LANGUAGE_CHANGED message when the user switches language.
 */

const FALLBACK_LANGUAGE = "en";

type Bundle = Record<string, unknown>;
type LangBundles = Record<string, Record<string, Bundle>>; // { [lng]: { [ns]: nested } }

const state = {
  language: FALLBACK_LANGUAGE,
  // { [lng]: { [ns]: {nested strings} } }
  bundles: {} as LangBundles,
  listeners: new Set<(lng: string) => void>(),
};

function deepMerge(target: Bundle, src: Bundle): Bundle {
  for (const k of Object.keys(src)) {
    const v = src[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      target[k] = deepMerge((target[k] as Bundle) || {}, v as Bundle);
    } else {
      target[k] = v;
    }
  }
  return target;
}

function putBundle(lng: string, ns: string, resources: Bundle): void {
  state.bundles[lng] = state.bundles[lng] || {};
  state.bundles[lng][ns] = deepMerge(state.bundles[lng][ns] || {}, resources || {});
}

/** Merge a host-strings map ({ [ns]: nested }) for a given language. */
function putHostStrings(lng: string, hostStrings: Record<string, Bundle> | undefined): void {
  if (!hostStrings) return;
  for (const ns of Object.keys(hostStrings)) putBundle(lng, ns, hostStrings[ns]);
}

function lookup(bundle: Bundle | undefined, path: string): string | undefined {
  if (!bundle) return undefined;
  let cur: unknown = bundle;
  for (const seg of path.split(".")) {
    if (cur && typeof cur === "object" && seg in (cur as Bundle)) {
      cur = (cur as Bundle)[seg];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

function pluralPath(path: string, count: number, lng: string): string[] {
  let category = "other";
  try {
    category = new Intl.PluralRules(lng).select(count);
  } catch {
    /* keep "other" */
  }
  return [`${path}_${category}`, `${path}_other`, path];
}

function interpolate(str: string, opts?: Record<string, unknown>): string {
  if (!opts) return str;
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) =>
    opts[key] !== undefined ? String(opts[key]) : `{{${key}}}`
  );
}

function translate(key: string, opts?: Record<string, unknown>): string {
  const sep = key.indexOf(":");
  const ns = sep >= 0 ? key.slice(0, sep) : "common";
  const path = sep >= 0 ? key.slice(sep + 1) : key;

  const candidates =
    opts && typeof opts.count === "number"
      ? pluralPath(path, opts.count as number, state.language)
      : [path];

  for (const lng of [state.language, FALLBACK_LANGUAGE]) {
    const nsBundle = state.bundles[lng]?.[ns];
    for (const p of candidates) {
      const hit = lookup(nsBundle, p);
      if (hit !== undefined) return interpolate(hit, opts);
    }
  }
  return key; // never blank
}

export const i18n = {
  t(key: string, opts?: Record<string, unknown>): string {
    return translate(key, opts);
  },
  get language(): string {
    return state.language;
  },
  addResourceBundle(lng: string, ns: string, resources: Bundle): void {
    putBundle(lng, ns, resources);
  },
  /** Bulk register: { en: { myplugin: {...} }, ru: { myplugin: {...} } }. */
  registerTranslations(bundlesByLng: Record<string, Record<string, Bundle>>): void {
    for (const lng of Object.keys(bundlesByLng || {})) {
      for (const ns of Object.keys(bundlesByLng[lng])) {
        putBundle(lng, ns, bundlesByLng[lng][ns]);
      }
    }
  },
  onLanguageChange(cb: (lng: string) => void): () => void {
    state.listeners.add(cb);
    return () => state.listeners.delete(cb);
  },
};

/** Called once from initPotokSDK with window.PotokInitialState. */
export function initSdkI18n(initialState: {
  language?: string;
  hostStrings?: Record<string, Bundle>;
}): void {
  if (initialState.language) state.language = initialState.language;
  putHostStrings(state.language, initialState.hostStrings);
}

/** Called from the message handler on a host LANGUAGE_CHANGED message. */
export function handleLanguageChanged(payload: {
  language?: string;
  hostStrings?: Record<string, Bundle>;
}): void {
  if (payload.language) state.language = payload.language;
  putHostStrings(state.language, payload.hostStrings);
  state.listeners.forEach((cb) => {
    try {
      cb(state.language);
    } catch {
      /* never let a listener break the loop */
    }
  });
}
