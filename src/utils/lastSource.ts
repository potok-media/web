import type { LastSourceAudioCandidate, LastSourcePayload } from "../network/ApiTypes";

/** Server cap for the serialized lastSource object attached to progress saves (UTF-8 bytes). */
export const LAST_SOURCE_MAX_BYTES = 16384;

const utf8Bytes = (value: string): number =>
  typeof TextEncoder === "function" ? new TextEncoder().encode(value).length : value.length;

export interface LastSourceFields {
  providerId?: string;
  voice?: string;
  streamHash?: string;
  fileIndex?: string | number;
  /** Full voice-candidate list from the player (cross-provider merge); sanitized + self-capped. */
  audios?: unknown;
  sourceStream?: unknown;
}

/**
 * Normalizes raw player audio entries into persistable candidates: `url` is stripped (switching
 * always re-resolves through the candidate's own provider), non-string fields are dropped.
 * Returns null when nothing usable remains.
 */
export function sanitizeLastSourceAudios(raw: unknown): LastSourceAudioCandidate[] | null {
  if (!Array.isArray(raw)) return null;
  const entries: LastSourceAudioCandidate[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    if (typeof entry.name !== "string" || !entry.name) continue;
    const candidate: LastSourceAudioCandidate = { name: entry.name };
    if (typeof entry.label === "string" && entry.label) candidate.label = entry.label;
    if (typeof entry.voice === "string" && entry.voice) candidate.voice = entry.voice;
    if (typeof entry.providerId === "string" && entry.providerId) candidate.providerId = entry.providerId;
    if (typeof entry.sourceId === "string" && entry.sourceId) candidate.sourceId = entry.sourceId;
    if (entry.query !== undefined && entry.query !== null) {
      try {
        JSON.stringify(entry.query);
        candidate.query = entry.query;
      } catch {
        // Unserializable candidate payload — skip its query.
      }
    }
    entries.push(candidate);
  }
  return entries.length > 0 ? entries : null;
}

/**
 * Builds the `lastSource` object the sync endpoint persists for server-side resume.
 * Undefined fields are omitted; an empty result collapses to undefined so the key is not
 * sent at all. The opaque sourceStream is dropped when its serialization exceeds the
 * server's 4KB cap — the identity fields (streamHash/fileIndex) still allow resume.
 * When the WHOLE payload exceeds the cap, fields are trimmed in priority order: per-candidate
 * `query`, then per-candidate `label`, then the `audios` list entirely — resume identity
 * (providerId/sourceStream/streamHash) always survives.
 */
export function buildLastSource(fields: LastSourceFields): LastSourcePayload | undefined {
  const payload: LastSourcePayload = {};
  if (fields.providerId) payload.providerId = fields.providerId;
  if (fields.voice) payload.voice = fields.voice;
  if (fields.streamHash) payload.streamHash = fields.streamHash;
  if (fields.fileIndex != null && fields.fileIndex !== "") {
    payload.fileIndex = String(fields.fileIndex);
  }
  const audios = sanitizeLastSourceAudios(fields.audios);
  if (audios) payload.audios = audios;
  if (fields.sourceStream !== undefined && fields.sourceStream !== null) {
    try {
      const serialized = JSON.stringify(fields.sourceStream);
      if (serialized && utf8Bytes(serialized) <= LAST_SOURCE_MAX_BYTES) {
        payload.sourceStream = fields.sourceStream;
      }
    } catch {
      // Unserializable plugin payload — resume through identity fields only.
    }
  }
  fitLastSourceBudget(payload);
  return Object.keys(payload).length > 0 ? payload : undefined;
}

/** Trims the payload to the server cap (UTF-8 bytes): candidate query → candidate label → the audios list. */
function fitLastSourceBudget(payload: LastSourcePayload): void {
  for (;;) {
    // Server-side cap counts UTF-8 bytes (Cyrillic = 2 bytes/char) — measure identically.
    if (utf8Bytes(JSON.stringify(payload)) <= LAST_SOURCE_MAX_BYTES) return;
    if (dropField(payload.audios, "query")) continue;
    if (dropField(payload.audios, "label")) continue;
    if (payload.audios !== undefined) {
      delete payload.audios;
      continue;
    }
    // Nothing left to trim without breaking resume — an over-budget payload is dropped
    // server-side, so self-trimming stops here.
    break;
  }
}

function dropField(entries: LastSourceAudioCandidate[] | undefined, key: "query" | "label"): boolean {
  if (!entries) return false;
  let dropped = false;
  for (const entry of entries) {
    if (entry[key] !== undefined) {
      delete entry[key];
      dropped = true;
    }
  }
  return dropped;
}
