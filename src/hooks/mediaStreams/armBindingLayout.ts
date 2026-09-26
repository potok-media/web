import type { ArmClient } from "../../network/ArmApiClient";
import type { ArmEpisodeLayoutResponse } from "../../network/ArmTypes";

interface BindingLayoutContext {
  tmdbId: number;
  type: "movie" | "tv";
  workId?: string | null;
}

/** Correction targets must come from the real ARM graph, never a provider-parsed numeric list. */
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
    if (resolved.status !== 200 || !resolved.body?.workId) {
      throw new Error("Canonical work identity is unavailable");
    }
    workId = resolved.body.workId;
  }
  const response = await client.getEpisodeLayout(workId, { locale, signal });
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  const layout = response.body;
  if (response.status !== 200 || layout?.work?.id !== workId || !layout.groups.length) {
    throw new Error("Canonical episode layout is unavailable");
  }
  return layout;
}
