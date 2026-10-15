import type { ArmClient } from "../../network/ArmApiClient";
import type { ArmEpisodeLayoutResponse } from "../../network/ArmTypes";
import { reconstructLayout } from "../../features/arm/layoutReconstruction";

interface BindingLayoutContext {
  tmdbId: number;
  type: "movie" | "tv";
  workId?: string | null;
}

type BindingLayoutClient = Pick<ArmClient, "resolveWork" | "getEpisodeLayout">
  & Partial<Pick<ArmClient, "getEntries" | "getEpisodes">>;

/** Correction targets must come from the real ARM graph, never a provider-parsed numeric list. */
export async function loadArmBindingLayout(
  context: BindingLayoutContext,
  client: BindingLayoutClient,
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

  if (client.getEntries && client.getEpisodes) {
    const [entriesResponse, episodesResponse] = await Promise.all([
      client.getEntries(workId, { locale, signal }),
      client.getEpisodes(workId, { locale, signal }),
    ]);
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    if (
      entriesResponse.status !== 200
      || episodesResponse.status !== 200
      || !entriesResponse.body
      || !episodesResponse.body
    ) {
      throw new Error("Canonical episode layout is unavailable");
    }
    const layout = reconstructLayout(
      entriesResponse.body.entries,
      episodesResponse.body.episodes,
      workId,
      locale,
    );
    if (!layout.groups.length) {
      throw new Error("Canonical episode layout is unavailable");
    }
    return layout;
  }

  const response = await client.getEpisodeLayout(workId, { locale, signal });
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  const layout = response.body;
  if (response.status !== 200 || layout?.work?.id !== workId || !layout.groups.length) {
    throw new Error("Canonical episode layout is unavailable");
  }
  return layout;
}
