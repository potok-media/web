/** Split a streaming text chunk into complete NDJSON lines; return the leftover buffer. */
export function consumeNdjsonChunk(
  buffer: string,
  chunk: string,
  onLine: (line: string) => void,
): string {
  const combined = buffer + chunk;
  const parts = combined.split("\n");
  const rest = parts.pop() ?? "";
  for (const part of parts) {
    const line = part.trim();
    if (line) onLine(line);
  }
  return rest;
}

export function parseJsonLine(line: string): unknown | undefined {
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
}

/** Parse a fully-buffered body as NDJSON, or as a single JSON value. */
export function parseBufferedNdjson(data: string, onEvent: (event: unknown) => void): unknown[] {
  const events: unknown[] = [];
  const trimmed = data.trim();
  if (!trimmed) return events;

  const emit = (value: unknown) => {
    events.push(value);
    onEvent(value);
  };

  if (trimmed.includes("\n")) {
    consumeNdjsonChunk("", `${trimmed}\n`, (line) => {
      const parsed = parseJsonLine(line);
      if (parsed !== undefined) emit(parsed);
    });
    return events;
  }

  const parsed = parseJsonLine(trimmed);
  if (parsed !== undefined) emit(parsed);
  return events;
}
