import type { ArmClient } from "../../network/ArmApiClient";
import type { ArmEpisodeLayoutResponse } from "../../network/ArmTypes";

interface BindingLayoutContext {
  tmdbId: number;
  type: "movie" | "tv";
  workId?: string | null;
  orderingId?: string | null;
}

/** Correction targets must come from a real ARM ordering, never a provisional numeric list. */
export async function loadArmBindingLayout(
  context: BindingLayoutContext,
  client: Pick<ArmClient, "resolveWork" | "getEpisodeLayout">,
  locale: string,
  signal: AbortSignal,
): Promise<ArmEpisodeLayoutResponse> {
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  let workId = context.workId;
  if (!workId) {
    const resolved = await client.resolveWork(
      { provider: "tmdb", entityKind: context.type, value: String(context.tmdbId) },
      { locale, signal },
    );
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    if (resolved.status !== 200 || !resolved.body?.work
      || !["resolved", "partial"].includes(resolved.body.resolutionState)) {
      throw new Error("Canonical work identity is unavailable");
    }
    workId = resolved.body.work.id;
  }
  const response = await client.getEpisodeLayout(workId, {
    ordering: context.orderingId || "default", locale, signal,
  });
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  const layout = response.body;
  if (response.status !== 200 || !layout?.ordering || layout.workId !== workId
    || !["resolved", "partial"].includes(layout.resolutionState)
    || (context.orderingId && layout.ordering.id !== context.orderingId)) {
    throw new Error("Canonical episode ordering is unavailable");
  }
  return layout;
}
