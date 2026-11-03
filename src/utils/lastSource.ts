import type { LastSourcePayload } from "../network/ApiTypes";

/** Server cap for the serialized lastSource object attached to progress saves. */
export const LAST_SOURCE_MAX_BYTES = 4096;

export interface LastSourceFields {
  providerId?: string;
  voice?: string;
  streamHash?: string;
  fileIndex?: string | number;
  sourceStream?: unknown;
}

/**
 * Builds the `lastSource` object the sync endpoint persists for server-side resume.
 * Undefined fields are omitted; an empty result collapses to undefined so the key is not
 * sent at all. The opaque sourceStream is dropped when its serialization exceeds the
 * server's 4KB cap — the identity fields (streamHash/fileIndex) still allow resume.
 */
export function buildLastSource(fields: LastSourceFields): LastSourcePayload | undefined {
  const payload: LastSourcePayload = {};
  if (fields.providerId) payload.providerId = fields.providerId;
  if (fields.voice) payload.voice = fields.voice;
  if (fields.streamHash) payload.streamHash = fields.streamHash;
  if (fields.fileIndex != null && fields.fileIndex !== "") {
    payload.fileIndex = String(fields.fileIndex);
  }
  if (fields.sourceStream !== undefined && fields.sourceStream !== null) {
    try {
      const serialized = JSON.stringify(fields.sourceStream);
      if (serialized && serialized.length <= LAST_SOURCE_MAX_BYTES) {
        payload.sourceStream = fields.sourceStream;
      }
    } catch {
      // Unserializable plugin payload — resume through identity fields only.
    }
  }
  return Object.keys(payload).length > 0 ? payload : undefined;
}
