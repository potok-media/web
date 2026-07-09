import { i18n } from "../../../i18n";

const HOST_SHARED_NS = ["common", "streams", "media", "player"];

/** Build the host-strings subset (current language) injected into each plugin iframe. */
export function computeHostStrings(lng: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const ns of HOST_SHARED_NS) {
    const bundle = i18n.getResourceBundle(lng, ns) || i18n.getResourceBundle("en", ns);
    if (bundle) out[ns] = bundle;
  }
  return out;
}