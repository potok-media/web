import { ExtensionRegistry } from "../../utils/extensions/ExtensionRegistry";
import type { EpisodesResponse, StreamContext } from "./mediaStreamsTypes";
import type { RawStreamPayload } from "@potok/sdk-types";
import type { StreamSource } from "./mediaStreamsTypes";

export async function saveSeasonOverride(
  activeSource: StreamSource,
  clickedStream: RawStreamPayload,
  context: StreamContext,
  sourceSeason: number | null,
  targetSeason: number,
  offset: number,
): Promise<EpisodesResponse> {
  await ExtensionRegistry.sendSandboxRequest<void>(
    activeSource.pluginId,
    "STREAM_SOURCE_SAVE_OVERRIDE",
    { stream: clickedStream, context, sourceSeason, targetSeason, offset },
  );
  return ExtensionRegistry.sendSandboxRequest<EpisodesResponse>(
    activeSource.pluginId,
    "STREAM_SOURCE_GET_EPISODES",
    { stream: clickedStream, context },
  );
}

export async function clearSeasonOverride(
  activeSource: StreamSource,
  clickedStream: RawStreamPayload,
  context: StreamContext,
  sourceSeason: number | null,
): Promise<EpisodesResponse> {
  await ExtensionRegistry.sendSandboxRequest<void>(
    activeSource.pluginId,
    "STREAM_SOURCE_CLEAR_OVERRIDE",
    { stream: clickedStream, context, sourceSeason },
  );
  return ExtensionRegistry.sendSandboxRequest<EpisodesResponse>(
    activeSource.pluginId,
    "STREAM_SOURCE_GET_EPISODES",
    { stream: clickedStream, context },
  );
}