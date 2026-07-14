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

export async function saveFileOverride(
  activeSource: StreamSource,
  clickedStream: RawStreamPayload,
  context: StreamContext,
  fileId: string,
  season: number,
  episode: number,
  mode: "anchor" | "pin",
): Promise<EpisodesResponse> {
  await ExtensionRegistry.sendSandboxRequest<void>(
    activeSource.pluginId,
    "STREAM_SOURCE_SAVE_FILE_OVERRIDE",
    { stream: clickedStream, context, fileId, season, episode, mode },
  );
  return ExtensionRegistry.sendSandboxRequest<EpisodesResponse>(
    activeSource.pluginId,
    "STREAM_SOURCE_GET_EPISODES",
    { stream: clickedStream, context },
  );
}

export async function clearFileOverride(
  activeSource: StreamSource,
  clickedStream: RawStreamPayload,
  context: StreamContext,
  fileId: string,
): Promise<EpisodesResponse> {
  await ExtensionRegistry.sendSandboxRequest<void>(
    activeSource.pluginId,
    "STREAM_SOURCE_CLEAR_FILE_OVERRIDE",
    { stream: clickedStream, context, fileId },
  );
  return ExtensionRegistry.sendSandboxRequest<EpisodesResponse>(
    activeSource.pluginId,
    "STREAM_SOURCE_GET_EPISODES",
    { stream: clickedStream, context },
  );
}