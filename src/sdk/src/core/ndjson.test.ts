import { describe, expect, it } from "vitest";
import { consumeNdjsonChunk, parseBufferedNdjson, parseJsonLine } from "./ndjson";

describe("consumeNdjsonChunk", () => {
  it("holds a partial line and emits it when the newline arrives", () => {
    const lines: string[] = [];
    const mid = consumeNdjsonChunk("", '{"type":"batch"', (line) => lines.push(line));
    expect(lines).toEqual([]);
    const rest = consumeNdjsonChunk(mid, ',"source":"RuTracker"}\n{"type":"done"}\n', (line) =>
      lines.push(line),
    );
    expect(rest).toBe("");
    expect(lines).toEqual(['{"type":"batch","source":"RuTracker"}', '{"type":"done"}']);
  });
});

describe("parseBufferedNdjson", () => {
  it("parses NDJSON batches", () => {
    const events: unknown[] = [];
    parseBufferedNdjson(
      '{"type":"batch","source":"a","results":[1]}\n{"type":"done"}\n',
      (e) => events.push(e),
    );
    expect(events).toEqual([
      { type: "batch", source: "a", results: [1] },
      { type: "done" },
    ]);
  });

  it("parses a single JSON object (buffered fallback)", () => {
    const events: unknown[] = [];
    parseBufferedNdjson('{"results":[{"id":"x"}]}', (e) => events.push(e));
    expect(events).toEqual([{ results: [{ id: "x" }] }]);
  });

  it("skips broken lines", () => {
    expect(parseJsonLine("{nope")).toBeUndefined();
  });
});
