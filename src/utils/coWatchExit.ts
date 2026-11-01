export type CoWatchRole = "host" | "guest" | null;

interface LeaveCoWatchSessionOptions {
  role: CoWatchRole;
  shouldNavigateBack: boolean;
  leaveRoom: () => void;
  stopVideo: () => void;
  navigateBack: () => void;
}

/** Leave the room without destroying the host's pre-existing solo playback. */
export function leaveCoWatchSession({
  role,
  shouldNavigateBack,
  leaveRoom,
  stopVideo,
  navigateBack,
}: LeaveCoWatchSessionOptions): void {
  leaveRoom();
  if (role !== "host") stopVideo();
  if (shouldNavigateBack) navigateBack();
}
